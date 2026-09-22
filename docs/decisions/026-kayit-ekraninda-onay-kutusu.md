# 026 — Kayıt Ekranında Yasal Onay Kutusu

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Kod yazıldı ve denendi. **Canlıya çıkışta sıra önemlidir** (dağıtım listesi · 6.24).
> Kaynak: Genel Müdür talimatı (2026-09-22) · `docs/decisions/025` · soru 2
> Kod: `app/src/ekranlar/KayitEkrani.tsx`, `app/src/kayit.ts`, `app/src/stil.css`,
> `supabase/functions/otel-ac/kapi.ts` ve `index.ts`,
> `supabase/migrations/20260922120000_kayit_sartlar_onayi.sql` ve `…130000_kayit_sartlar_zorunlu.sql`

---

## Durum

Vitrindeki iletişim formunda KVKK onayı **açık eylemle** alınıyordu (karar 021). Ama asıl kritik an
orası değildi: `app.oteldijital.com/kayit` ekranında bir otel hesap açıyor, sisteme giriyor ve ücretli
bir hizmetin denemesini başlatıyordu — ve o ekranda ne Kullanım Şartları'na ne KVKK metnine **tek bir
bağlantı** vardı. Karar 025 bunu Genel Müdür'e soru olarak taşıdı.

## Karar (Genel Müdür, 2026-09-22)

> "Kesinlikle eklenmeli. Yasal onayın en kritik olduğu yer kullanıcının sisteme dahil olduğu hesap
> açılış anıdır. İletişim formundaki titizlikle ekleyelim."

"İletişim formundaki titizlik" şu demektir ve harfiyen uygulandı:

| Kural | Nasıl uygulandı |
|---|---|
| Onay **açık eylemle** alınır | Kutu işaretlenir. "Kaydolarak kabul etmiş olursunuz" gibi zımni cümle yoktur |
| Kural yalnızca ekranda durmaz | Ekran · kapı · veritabanı — üç katman |
| Onay **saklanır** | `hotels.sartlar_onayi`; onayın zamanı satırın `created_at` değeridir |
| Geçmişe onay uydurulmaz | Eski otellerde alan `null` kalır ("bilinmiyor") |

## Üç katman

```
Ekran (KayitEkrani.tsx)     kutu işaretlenmeden düğme çalışmaz
        │                    + kayitDenetle: "Devam etmek için … onaylayın."
        ▼
Kapı (otel-ac · kapi.ts)     sartlar_onayi !== true  →  400, hiçbir şey yazılmaz
        │                    ("true" metni, 1, eksik alan da geçmez: onay tahmin değildir)
        ▼
Veritabanı (tetikleyici)     onaysız satır insert edilemez — kapıyı atlayan da geçemez
```

Ekranı atlayıp kapıyı doğrudan çağıran biri ikinci katmana, kapıyı da atlayıp veritabanına yazmaya
çalışan biri üçüncü katmana çarpar. İletişim formundaki mantığın aynısıdır.

## İki ince karar

### 1. Neden "check" kuralı değil, tetikleyici (trigger)?

İletişim formunda zorunluluk bir `check` kuralıydı; orada satırlar bir daha **hiç güncellenmez**.
Oteller ise güncellenir: ödeme yapan otelin demo süresini biz uzatıyoruz, otel sahibi otel adını
değiştirebiliyor. `check` kuralı **güncellemeye de** bakar; eski otellerin onayı `null` olduğu için
o güncellemelerin hepsi reddedilirdi — yani bugünkü müşterilerin süresi uzatılamazdı.

Tetikleyici yalnızca **yeni kayıtta** (before insert) çalışır: eski oteller olduğu gibi durur ve
güncellenmeye devam eder. Geçmişe onay uydurmadan, bundan sonrası için kural konur.

### 2. Metinler neden yeni sekmede açılıyor?

Kişi formu doldurmuş, şifresini yazmıştır. Bağlantı aynı sekmede açılsaydı, metni okuyup geri
döndüğünde form boş olurdu ve büyük ihtimalle vazgeçerdi. `target="_blank"` + `rel="noopener noreferrer"`
ile metin yanda açılır, form olduğu gibi durur.

## Yayın sırası — bozulursa kayıt kapanır

Göçler iki dosyadır ve **araya yayın girer**. Sebebi sıra sorunudur, tıpkı iletişim formunda olduğu gibi:

1. `…_kayit_sartlar_onayi.sql` — sütunu ekler, hiçbir şeyi zorunlu kılmaz.
2. Kapı ve uygulama yayınlanır. (Kapı sütun yokken yayınlanırsa otel açılamaz: "column does not exist".)
3. `…_kayit_sartlar_zorunlu.sql` — onaysız kaydı veritabanı da reddeder.

Adımlar dağıtım listesinde madde **6.24** olarak yazılıdır.

## Denendi ve doğrulandı

| Ne denendi | Sonuç |
|---|---|
| Uygulamanın otomatik testleri | **141 test geçti** (139 → 141: onaysız kayıt ve hata sırası) |
| TypeScript denetimi (`tsc --noEmit`) | Temiz |
| Kapının saf mantığı (Deno bu bilgisayarda kurulu değil, Node ile koşuldu) | Onaysız istek 400, hiçbir iz yazılmıyor; onaylı istekte `sartlar_onayi=true` otele geçiyor |
| Kayıt ekranı, telefon genişliği | Kutu ve iki bağlantı tek blokta, taşma yok; düğme ve alanlar aynı yerde |
| Kapı testleri (`kapi_test.ts`) | Yazıldı; **Deno kurulu olmadığı için bu bilgisayarda koşulmadı** — canlıya çıkmadan `deno test supabase/functions/otel-ac/` çalıştırılmalı |

## Bilinçli olarak yapılmayanlar

- **İkinci bir kutu (ticari ileti izni) eklenmedi.** Sistem hiç e-posta göndermiyor; gerekirse ayrı ve
  isteğe bağlı bir kutu olur, bu kutuyla birleştirilmez.
- **Onay metninin sürümü saklanmıyor.** Bugün tek sürüm var; şartlar önemli ölçüde değişirse
  "hangi sürümü onayladı" sorusu doğar. O zaman `sartlar_onayi` sütununun yanına bir sürüm alanı
  eklenir — bugün gereksiz karmaşa olurdu.
- **Giriş ekranına bağlantı konmadı.** Onay bir kez, hesap açılırken alınır.
