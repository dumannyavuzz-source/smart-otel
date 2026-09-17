# 005 — Güvenlik: Kayıt Kapısı (Aşama 20)

> **Hazırlayan:** Security + Orkestratör · **Tarih:** 2026-09-16 · **Durum:** 2 madde V1.1'e bırakıldı · deneme süresi takibi bir sonraki aşamaya alındı (2026-09-17)
> Kod: `supabase/functions/otel-ac/`, `supabase/migrations/…_kayit_kapisi.sql`, `app/src/kayit.ts`.

---

## Neden bu belge var?

Kayıt kapısı, sistemin **ilk kimlik doğrulaması olmayan yazma yoludur**. Bugüne kadar yeni otel açmak
OtelDijital ekibinin işiydi; artık vitrindeki bir düğme bunu yapıyor. Üstelik kapı üç şeyi birden ana
anahtarla yazıyor — çünkü ortada henüz giriş yapmış kimse yok:

1. yeni hesap, 2. yeni otel, 3. o otelin **ilk sahibi**.

Bu üçü tek bir yerde toplandığı için kapının kuralları açıkça yazılmalıdır.

## Kapının kilitleri

| Kilit | Nasıl çalışıyor |
|---|---|
| **Hız sınırı** | Aynı internet adresinden **saatte en fazla 3 deneme**. Sayaç veritabanındadır (`kayit_denemesi_say_ve_yaz`), kapıda değil. Dördüncü deneme 429 ile döner. |
| **Adres gizliliği** | İnternet adresi açık saklanmaz; **özeti (SHA-256)** saklanır. Amaç kimliği bilmek değil, "aynı yer mi?" sorusudur. |
| **Sayaç bozuksa** | Kapı açılmaz. Bilinmezlik "sorun yok" sayılmaz (fail-closed). |
| **Biçim denetimi** | Otel adı 2–80, ad 1–60, e-posta biçimi ve ≤120, şifre 8–128. Ekran da aynı soruları sorar ama asıl denetim kapıdadır. |
| **Yarım iş yok** | Otel açılamazsa hesap silinir; ilk sahiplik yazılamazsa otel de hesap da silinir. |
| **E-posta zaten kayıtlıysa** | Otel hiç açılmaz; 409 ve "Giriş yapmayı deneyin." |
| **`hotels` tablosu** | Ekleme kuralı hiç kimseye açılmadı. Yeni bir otel yalnızca bu kapıdan doğar. |
| **Sayaç tablosu** | `kayit_denemeleri` üzerinde RLS açık, **hiç kural yok**: kimse okuyamaz, kimse yazamaz. Yalnızca kapı (ana anahtar) dokunur. Bir günden eski satırlar her denemede silinir — bu bir defter değil, sayaçtır. |
| **Kapı anahtarsızdır** | `verify_jwt = false` (kayıt olan kişinin kartı yoktur). Bu yüzden yukarıdaki sayaç zorunludur. |

## Kabul edilen riskler (V1.1'e bırakıldı — Genel Müdür kararı)

### 1. E-posta doğrulanmıyor
Sistem hiç e-posta göndermiyor (SMTP bağlı değil), bu yüzden hesap doğrudan açılıyor (`email_confirm: true`).
Sonuç: biri **başkasının e-posta adresiyle** otel açabilir. Zararı sınırlıdır — açtığı otel boştur, kimsenin
verisine erişmez — ama o adresin gerçek sahibi ileride kaydolmak isterse "bu e-posta zaten kayıtlı" duvarına çarpar.
`docs/v1-1-notlari.md` · B1.

### 2. Deneme süresi takip edilmiyor — bir sonraki aşamada kapanacak
Bugün sistemde deneme bitiş tarihi, uyarı veya kapanma yoktur: açılan otel süresizdir.
Bu bir güvenlik açığı değil, **kaynak tüketimi** ve ticari bir açıktır.
**Genel Müdür kararı (2026-09-17):** Deneme süresi **30 gündür** ve "süre takibini V1.1'e bırakalım"
kararı **iptal edilmiştir**. Bir sonraki aşamada `hotels` tablosuna `demo_bitis_tarihi` sütunu eklenecek,
aktif demo takibi ve ödeme duvarı (paywall) kurulacaktır — ayrıntı: `docs/decisions/005-demo-suresi-ve-odeme-duvari.md`.
O aşama tamamlanana kadar kapının tek koruması saatlik sayaçtır.

### 3. Sınır IP başınadır
Farklı adreslerden gelen toplu kayıt (bot ağı) engellenmez. Saatte 3 sınırı sıradan kötüye kullanımı keser;
kararlı bir saldırganı kesmez. Gerekirse captcha (`auth.captcha`) açılabilir — bugün gerekmiyor.

## Canlıya çıkmadan

- `KAYIT_SAYFASI_ORIGIN` ayarlanmalı; boşken kapı her adrese cevap veriyor (`*`).
- Kapı **anahtarsız** yayınlanmalı: `supabase functions deploy otel-ac --no-verify-jwt`.
- İlk kayıt denemesi Staging'de elle yapılmalı: otel açılıyor mu, kişi sahip olarak yazılıyor mu,
  panele düşüyor mu, ikinci kez aynı e-postayla denenince ne oluyor?

---

## Staging koşusunda bulunup kapatılan açık (2026-09-16)

### 🔴 `revoke all … from public` tek başına yetmiyordu

Sayaç fonksiyonunu (`kayit_denemesi_say_ve_yaz`) **giriş yapmış herhangi bir personel doğrudan
çağırabiliyordu.** Sebep: Supabase, `public` şemasında açılan her yeni fonksiyona `anon` ve
`authenticated` rollerine **ayrı ayrı** çalıştırma yetkisi veriyor (varsayılan yetkiler).
`public` rolünden yetki almak, bu iki role verilmiş açık yetkiyi geri almıyor.

Etkisi: kayıt kapısının önündeki tek koruma olan sayaç, içeriden çöple doldurulabilir ya da
yıpratılabilirdi. Doğru desen projede zaten vardı (misafir kapısı):

```sql
revoke all on function … from public, anon, authenticated;
grant execute on function … to service_role;
```

`…_sayac_kilidi.sql` göçüyle hem sayaç hem de `baska_otelde_calisiyor_mu` bu desene çevrildi.
Bulguyu **canlı veritabanında koşulan 24d numaralı deneme** yakaladı; yerel çalıştırmada görünmezdi.

**Ders:** yeni bir SQL fonksiyonu eklenirken yetkiler `anon` ve `authenticated` için açıkça geri alınmalı,
ve bunun bir denemesi yazılmalıdır. Bu kural `docs/security/001` kontrol listesine eklenmelidir.
