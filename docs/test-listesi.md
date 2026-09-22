# El ile Test Listesi — Personel Uygulaması

> **Hazırlayan:** Orkestratör · **Tarih:** 2026-09-21 · **Kimin için:** Genel Müdür
> Canlıya çıkış adımları ayrı bir belgededir: `docs/deployment-checklist.md`.
> Buradaki liste "sistem gerçekten çalışıyor mu?" sorusunu **elle** yanıtlamak içindir.
> Uygulamanın kendi otomatik testleri ayrıca vardır: `cd app && npm test` (141 test).

---

## 0. Başlamadan önce

| Ne | Nasıl |
|---|---|
| Uygulamayı çalıştır | `cd app && npm run dev` → `http://localhost:5173` |
| Otomatik testler | `cd app && npm test` |
| Hesap | `/kayit` sayfasından kaydol; oluşan hesabın rolü `owner`'dır (en üst yetki) |
| Odalar | Uygulamada oda ekleme ekranı **yoktur**; odalar Supabase Studio'dan girilir (aşağıda) |

**Neden iki tarayıcı gerekir?** Depo zinciri kuralı gereği (Maker–Checker) **talep eden kişi teslim
alamaz**. Tek hesapla zincirin tamamı denenemez; en az iki hesap ve iki ayrı tarayıcı penceresi gerekir.

---

## 1. Kapı ve hesap

- [ ] `/kayit` — otel adı, ad, e-posta, şifre (**en az 8 karakter**) ve **yasal onay kutusu** ile kaydol. Ana Kumanda açılmalı.
- [ ] `/kayit` — **onay kutusunu işaretlemeden** gönder: form gitmemeli (karar 026).
- [ ] `/kayit` — "Kullanım Şartları" ve "KVKK Aydınlatma Metni" bağlantıları **yeni sekmede** açılmalı; dönünce form dolu durmalı.
- [ ] Eksik/hatalı alanla dene: her hata **tek cümleyle** söylenmeli, form kaybolmamalı.
- [ ] Çıkış yap, `/giris` ile tekrar gir.
- [ ] Giriş yapmadan `/panel` adresini aç: kapıya (`/giris`) gönderilmeli. Giriş yapınca **panele** dönmeli.
- [ ] Giriş yapmışken `/giris` adresini aç: ana ekrana geçmeli.

## 2. Müdür paneli (Ana Kumanda)

- [ ] Kırmızı bir şey yoksa ekran yeşil: "Her şey yolunda" demeli.
- [ ] **Personel** → yeni personel ekle. Şifresi ekranda görünmeli (mail gitmez).
- [ ] **Personel** → 🔑 Şifre → yeni şifre ver, o personelle giriş yapabildiğini doğrula (**5 saniye vaadi**).
- [ ] **Ürünler** → ürün ekle (en fazla 8 açık ürün). Listeden çıkarmayı da dene.

## 3. Kat görevlisi akışı (oda operasyonu)

> Oda kapısındaki kare kodun içinde `rooms.staff_code` vardır. Kamera yalnızca **https** üzerinde
> açılır; bilgisayarda `http://localhost` ile test ederken adresi elle yazın: `/oda/<staff_code>`.

- [ ] Odayı aç, temizlik listesini tikle.
- [ ] **Oda Hazır** → "✓" görünmeli, ana ekrana dönmeli.
- [ ] **Eksik Var** → ürün seç → miktar (Kg ise yarımşar gitmeli, sayının üstüne dokununca yazılabilmeli) → gönder.
- [ ] **Bir Şey Bozuk** → fotoğraf çek → tür seç → gönder.
- [ ] Bozuk bildirimi sonrası oda **satışa hazır olmamalı**; müdür panelinde iş emri görünmeli.

## 4. Arıza → iş emri → süre (SLA)

- [ ] Teknisyen hesabıyla gir → **Açık İşler**: en az süresi kalan en üstte olmalı, renk yeşil→sarı→kırmızı.
- [ ] **Aldım** → **Çözdüm** (isteğe bağlı fotoğraf). İş kapanmalı.
- [ ] Süre aşılınca müdür panelinde **kırmızı alarm** ve **zarif bir çan** sesi (siren değil).
- [ ] İş çözülünce oda (temizlik de tamamsa) **satışa hazır** olmalı.

## 5. Depo zinciri (üç imza — en kritik kural)

> Kural: **talep eden ≠ onaylayan ≠ teslim alan.** Kural ekranda değil, veritabanındadır.

- [ ] Personel hesabıyla **talep** oluştur.
- [ ] Müdür hesabıyla **Bekleyen Onaylar** → onayla.
- [ ] Depo hesabıyla **Teslim Al** → gelen miktarı gir → fatura fotoğrafı ekle → Teslim Aldım.
- [ ] **Eksik teslim dene** (örn. 10 Kg onaylandı, 7,5 Kg geldi): kanıt fotoğrafı **zorunlu** olmalı.
- [ ] Müdür panelinde **Teslimat Uyuşmazlıkları** alarmı düşmeli; istenen · onaylanan · gelen yan yana görünmeli.
- [ ] **Kuralı kırmayı dene:** talep eden kişiyle teslim almayı dene — sunucu reddetmeli.

## 6. Misafir yorum kalkanı

- [ ] `/yorum/<guest_code>` adresini aç (giriş istememeli, kurulum istememeli).
- [ ] Düşük puan (1–3) gönder → müdür panelinde **Mutsuz Misafirler** alarmı düşmeli.
- [ ] Yüksek puan (4–5) gönder → yalnızca teşekkür; alarm düşmemeli.

## 7. İnternetsiz çalışma (offline)

- [ ] Tarayıcı geliştirici araçlarından ağı kapat (Network → Offline).
- [ ] Oda Hazır bildir: ekran anında "✓" demeli, ana ekranda "… bildirim internet gelince gönderilecek" yazmalı.
- [ ] Ağı aç: kayıt kendiliğinden gitmeli, sayaç sıfırlanmalı.
- [ ] Fotoğraflı bir bildirimi de aynı şekilde dene (önce fotoğraf, sonra kayıt gider).

## 8. Yetki sınırları (en az yetki ilkesi)

- [ ] Personel hesabıyla `/panel` adresini aç: **girememeli**.
- [ ] Bir otelin personeliyle başka otelin oda kodunu aç: **açılmamalı**.
- [ ] Teslim ekranında başkasının talebini onaylamayı dene: **reddedilmeli**.

## 9. Demo kilidi (isteğe bağlı, dikkatli)

> `hotels.demo_bitis_tarihi` yalnızca **ana anahtarla** değiştirilebilir. Test için geçmişe çekilirse
> uygulama yazmayı durdurur; okuma sürer ve **hiçbir veri silinmez**. Test bitince tarihi geri alın.

- [ ] Tarih geçmişe çekilince ödeme duvarı görünmeli, yeni kayıt kabul edilmemeli.
- [ ] Geçmiş kayıtlar hâlâ görünmeli.

---

## Testten önce Supabase'de yapılacak iki hazırlık

Uygulamada oda ekleme ve kontrol listesi ekranı **yoktur** (bilinçli: `docs/deployment-checklist.md` · 1.10–1.11).
Yeni açtığınız otelde oda olmadığı için 3–7 arası adımlar denenemez. Supabase Studio → SQL Editor'de
şunu bir kez çalıştırın (`OTEL ADINIZ` yerine kayıt ederken yazdığınız adı koyun):

```sql
-- 1) Beş test odası
insert into public.rooms (hotel_id, number, floor)
select h.id, o.number, o.floor
from public.hotels h,
     (values ('101','1'), ('102','1'), ('204','2'), ('205','2'), ('309','3')) as o(number, floor)
where h.name = 'OTEL ADINIZ';

-- 2) Temizlik kontrol listesi (en fazla 10 madde)
insert into public.checklist_templates (hotel_id, name, items)
select h.id, 'Standart Oda',
       array['Yatak','Banyo','Havlu','Minibar','Zemin','Çöp']
from public.hotels h
where h.name = 'OTEL ADINIZ';

-- 3) Test için gereken kodlar: QR yerine adres çubuğuna yazılır
select number as oda,
       '/oda/'   || staff_code as personel_adresi,
       '/yorum/' || guest_code as misafir_adresi
from public.rooms r
join public.hotels h on h.id = r.hotel_id
where h.name = 'OTEL ADINIZ'
order by number;
```

Üçüncü sorgunun çıktısındaki adresleri tarayıcıya elle yazarak QR okutmadan test edebilirsiniz.
