# 016 — Kanonik Host Birliği ve Yapılandırılmış Veri (denetim · Madde 8)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı ve yerelde doğrulandı. Canlı doğrulama: `docs/deployment-checklist.md` · 6.14
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 8
> Kod: on bir sayfanın `<head>`'i, `vitrin/sitemap.xml`, `vitrin/robots.txt`

---

## 8a. Host birliği: kanonik adres `www.oteldijital.com`

### Durum
Site `www` ile sunuluyordu ama bütün kanonik sinyaller `www`siz adresi gösteriyordu:
`canonical`, `og:url`, `sitemap.xml` içindeki beş adres, `robots.txt` içindeki `Sitemap:` satırı ve
`Organization` şemasındaki `url`/`logo`. Yani **canonical, yönlendirilen bir adresi işaret ediyordu**
ve sitemap'teki her adres gereksiz bir 308 üretiyordu.

### Karar
Kanonik host **`www.oteldijital.com`** (Genel Müdür, 2026-09-21). Bugünkü 308 yönlendirmesinin yönü
zaten oydu; tersini seçmek yaşayan adresleri kırardı. Otuz iki mutlak adresin tamamı `www`ye eşitlendi:

| Nerede | Kaç yerde |
|---|---|
| `canonical` | 9 sayfa |
| `og:url` · `og:image` · `twitter:image` | 5 sayfa |
| `Organization` şeması (`url`, `logo`) | ana sayfa |
| `sitemap.xml` | 5 adres |
| `robots.txt` · `Sitemap:` | 1 satır |

### Yan faydası: ölçüm tuzağı kapandı
`docs/decisions/013-analitik.md` bir tuzak not etmişti: Umami'nin `data-host-url` değeri yanlış
host'u gösterirse olay bildirimi (bir POST isteği) 308'e takılır ve gövdesi düşebilir. Host artık
tek olduğu için sayaç etiketi eklenirken `https://www.oteldijital.com/istatistik` yazılacak.

---

## 8b. Yapılandırılmış veri

### Değişmez kural
**Yalnızca sayfada gerçekten görünen bilgi işaretlenir.** Bu kural üç yerde bilinçli boşluk bıraktı:

1. **Kurumsal paket `Offer` olarak yazılmadı.** Fiyatı "Özel teklif"tir, sayısal bir bedeli yoktur;
   fiyatsız bir teklif işaretlemek arama motoruna yanlış bilgi vermek olurdu.
2. **`/iletisim` şemasında `telephone` yok.** Telefon künye bloğunda duruyor ama blok `hidden`
   (`docs/decisions/010`). Görünmeyen bilgi işaretlenmez; telefon açılınca buraya da eklenecek.
3. **Hizmet sayfalarına `Service`/`Offer` yazılmadı.** O sayfalarda fiyat yoktur; teklif otele
   bakıldıktan sonra verilir.

### Sayfa sayfa eklenen şemalar

| Sayfa | Şema | İçindeki veri |
|---|---|---|
| `/` | `Organization` (vardı, host güncellendi) | ad, adres, logo, e-posta, tanım |
| `/dijital-vitrin` | `BreadcrumbList` | Ana Sayfa → Dijital Vitrin |
| `/teknolojik-altyapi` | `BreadcrumbList` | Ana Sayfa → Teknolojik Altyapı |
| `/fiyatlandirma` | `BreadcrumbList` + `Product` + `FAQPage` | üç ücretli paket ve dört soru |
| `/iletisim` | `BreadcrumbList` + `ContactPage` | e-posta (telefon yok, yukarıya bakın) |

Yasal sayfalara ve hata sayfalarına şema yazılmadı: ikisi de `noindex`.

### `Product` / `Offer` ayrıntısı
Üç `Offer`: Butik `$29`, Standart `$59`, Büyük `$99`. Her birinde `priceCurrency: USD`,
oda aralığı `description` alanında ve `availability: InStock`.

Her teklifte ayrıca bir `UnitPriceSpecification` var; iki şeyi söylüyor ve ikisi de Madde 4'te
sayfaya yazılan sözün aynısı:

- `valueAddedTaxIncluded: false` — **fiyatlara KDV dahil değildir.**
- `referenceQuantity: 1 MON` — bedel **aylıktır**, tek seferlik değil.

### Üç kaynak birbirini tutuyor mu? Ölçüldü.
Paket bilgisi üç yerde yazılı: şema, sayfanın görünen metni ve `app/src/paketler.ts`. Üçü
karşılaştırıldı — ad, oda aralığı ve fiyat üçünde de aynı. Ayrıca `FAQPage` içindeki dört sorunun
ve dört cevabın tamamının sayfada **görünür metin olarak** bulunduğu ayrı bir denetimle doğrulandı
(HTML yorumları ve betikler sayılmadan).

Fiyat değişirse **üç yer birden** değişmelidir.

## Denendi ve doğrulandı (yerelde)

- Beş sayfadaki JSON-LD blokları **geçerli JSON** olarak ayrıştırıldı.
- Sayfalarda `www`siz mutlak adres kalmadı; her sayfanın `canonical` değeri `www` ile başlıyor.
- Paket bilgisi şema · sayfa · uygulama kodunda aynı; para birimi üçünde de USD.
- Yedi sayfa × sekiz genişlikte yatay taşma ve üst çubuk çakışması yok (Madde 6 ve 7 bozulmadı).

## Yayından sonra doğrulanacak

Google Rich Results Test ile dört sayfa da hatasız geçmelidir; `Search Console`'da tercih edilen
adres `www` olarak görünmelidir ve `sitemap.xml` içindeki hiçbir adres 308 üretmemelidir
(dağıtım listesi · 6.14).
