# 024 — İçerik Paketi: Künye, Ölçüm, Yasal Metinler ve Ekran Görüntüleri

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Dört parçanın üçü tamamlandı. Ekran görüntüleri **yer tutucu** olarak duruyor;
> dosyalar depoya eklendiğinde açılacak (dağıtım listesi · 6.22).
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 1, 2, 5 · ve Genel Müdür'ün içerik teslimi
> Kod: on iki sayfa, `vitrin/stil.css`, `vitrin/sitemap.xml`, `vitrin/gorseller/uygulama/`

---

## 1. Kurumsal künye ve ulaşım (Madde 2)

Değerler geldi; iki blok da `hidden` olmaktan çıktı.

| Nerede | Ne görünüyor |
|---|---|
| On iki sayfanın alt bölümü | OtelDijital Yazılım Teknolojileri A.Ş. · +90 850 123 45 67 · Kayseri, Türkiye · Kayseri VD · 1234567890 |
| `/iletisim` | Telefon · WhatsApp · çalışma saatleri · şehir · yanıt süresi |

İki biçim kuralı vardır ve ikisi de sessizce bozulabilecek türdendir: telefon bağlantısı
**boşluksuz** yazılır (`tel:+908501234567`), WhatsApp adresinde **`+` ve boşluk yoktur**
(`wa.me/905551234567`).

Yapılandırılmış veriye `telephone` ve `address` eklendi. Adres yalnızca **şehir ve ülke**
düzeyindedir: açık adres ekranda görünmediği için işaretlenmedi de (Madde 8b'nin kuralı —
görünmeyen bilgi işaretlenmez).

## 2. Ziyaretçi ölçümü (Madde 5)

Site kimliği geldi; sayaç etiketi on iki sayfanın sonuna kondu ve `data-host-url` kanonik hostu
gösteriyor. **CSP'ye tek karakter eklenmedi** — sayaç kendi alan adımız üzerinden geçiyor.

## 3. Yasal metinler

`/kvkk` ve `/gizlilik-politikasi` yazıldı, `index, follow` oldu ve sitemap'e eklendi.
`/cerez-politikasi` ile `/kullanim-sartlari` hâlâ iskelet.

### Metinler siteyle uyumlu olmak zorunda — iki yerde genişletildi

Genel Müdür'ün verdiği taslak metinler iki noktada sitenin **gerçekte yaptığıyla örtüşmüyordu**.
Yasal bir metnin eksik ya da fazla söz vermesi, hiç olmamasından kötüdür; ikisi de düzeltildi ve
Genel Müdür'e bildirildi.

| Taslakta | Gerçekte | Ne yapıldı |
|---|---|---|
| "ad, e-posta ve mesaj" alınıyor | Form ayrıca **telefon** (zorunlu), **otel adı**, **konu** alıyor; veritabanı **adres özeti** ve tarih yazıyor | KVKK metnindeki liste, fiilen alınan altı alanı ve adres özetini tek tek sayacak şekilde yazıldı |
| "IP adresiniz izlenmez" | İletişim formunda sel kapısı için **adresin şifrelenmiş özeti** saklanıyor | Gizlilik metnine "tek istisnayı açıkça yazalım" başlıklı paragraf kondu: adresin kendisi değil özeti saklanır, geri döndürülemez, form doldurulmazsa hiç oluşmaz |

Metinlerin geri kalanı taslaktaki cümlelerdir.

### Saklama süresi hâlâ somut değil
KVKK metni "talebinizle ilgilenmek için gereken süre" der ve silme talebini kabul eder. Somut bir
sayı (örneğin 12 ay) **uydurulmadı**; Genel Müdür karar verdiğinde metne yazılacak ve silme işi bir
düzene bağlanacak (dağıtım listesi · 6.11).

> **Güncelleme (2026-09-22):** Karar geldi — **12 ay**. Metne yazıldı, silme işi dağıtım listesine
> madde 6.23 olarak bağlandı. Kalan iki yasal metin de aynı gün yazıldı:
> `docs/decisions/025-yasal-metinlerin-tamamlanmasi.md`.

## 4. Gerçek ekran görüntüleri (Madde 1) — altyapı kuruldu, görseller bekleniyor

Dosyalar depoya ulaşmadı. Genel Müdür'ün talimatıyla **altyapı kuruldu, yerine yer tutucu kondu**:

- `/` sayfasında iki kart (`#nedir` bölümünün içinde, **yeni `h2` açılmadan** — ana sayfanın yedi
  bölüm sınırı korunur), `/ic-operasyon` sayfasında dört kart (kendi bölümünde).
- Her kartta hazır `<picture>` bloğu **yorum içinde** bekler; ekranda aynı orandaki bir yer tutucu
  durur.

### Neden yorum içinde, kırık `<img>` değil?
`<picture>` etiketi tarayıcının desteklediği **ilk** kaynağı seçer ve o dosya sunucuda yoksa bir
alttakine **düşmez** — ziyaretçi kırık görsel görür. Dosyalar gelmeden etiketi açmak, canlıda dört
kırık kutu demekti. Yer tutucu ise ne kırılır ne de sayfayı bozar.

### Yer tutucu neden aynı oranda?
Oran (780 × 1688) baştan verilmezse görsel indiği anda sayfa aşağı doğru **zıplar** — okuyan kişi
satırı kaybeder. Yer tutucu yeri şimdiden ayırdığı için görsel geldiğinde hiçbir şey kımıldamaz.

### Neden hem AVIF hem WebP?
AVIF'i Safari yalnızca **16.4 ve sonrasında** tanır. Daha eski bir iPad'den bakan otel müdürü WebP
görür; ikisi de yoksa hiçbir şey görmez. Bu yüzden her ekran için iki dosya istenir.
Ayrıntı: `vitrin/gorseller/uygulama/README.md`.

---

## Yol üstünde bulunan kusur: canlıda görünen kaynak notu

Bu iş sırasında `/ic-operasyon` sayfasında bir HTML yorumunun **açılış satırının eksik** olduğu
görüldü. Sonuç: iç notumuz ziyaretçiye görünür metin olarak çıkıyordu — "Üç blok, üç kutu değil…
(Genel Müdür kararı, 2026-09-18)… etkilesim.js · 1'de" diye. Canlıdaki sayfada da öyleydi.

Açılış satırı geri kondu. Aynı hatanın bir daha fark edilmeden durmaması için tarama listesine
yeni bir denetim eklendi: **on bir sayfanın görünen metni taranır**, içinde `-->`, `<!--`,
`etkilesim.js`, `stil.css`, `docs/decisions`, "Genel Müdür kararı" gibi kaynak izleri geçmemelidir.
Tarama şu an **temiz**.

## Denendi ve doğrulandı

| Ne denendi | Sonuç |
|---|---|
| 10 sayfa × 8 genişlik (320–1400 px) | Taşma yok, üst çubukta çakışma yok |
| Yer tutucular dar ekranda | Hiçbiri 80 px'in altına düşmüyor |
| Kaynak notu sızıntısı (11 sayfa) | **Temiz** |
| Ana sayfa `<h2>` sayısı | 7 — sınır korundu |
| JSON-LD (altı blok) | Hepsi geçerli |
| Sitemap | 8 adres, etiketler dengeli |
| Yasal sayfa açıklamaları | 151 ve 147 karakter (sınırlar içinde) |
