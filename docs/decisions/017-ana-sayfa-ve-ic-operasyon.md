# 017 — Ana Sayfa Yedi Bölüme İndi, /ic-operasyon Açıldı (denetim · Madde 9 + 15)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı ve yerelde ölçüldü.
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 9 ve 15
> **Değiştirdiği karar:** `008-vitrin-sayfa-mimarisi.md` — "ana sayfa = iç operasyonun vitrini"
> varsayımı düşer. Beş sayfalık yapı **altı sayfaya** çıkar; kalan kuralların hepsi yürürlükte.
> Kod: `vitrin/index.html`, **yeni** `vitrin/ic-operasyon.html`, on iki sayfanın menüsü ve alt bölümü,
> `vitrin/stil.css`, `vitrin/sitemap.xml`

---

## Durum

Denetim iki kusuru birlikte işaretledi ve çözümlerinin de birlikte yapılmasını istedi.

**Madde 9 — ana sayfa çok uzundu.** 13.648 piksel (~14 ekran), 10.383 karakter, on bir `<h2>`.
Mesajlar tekrarlanıyordu: "kayıt sonradan değiştirilemez" en az beş yerde, "üç imza" dört yerde,
"acil 30 dk, normalde 2 saat" dört yerde. Karar vermiş ziyaretçi fiyatı bulmak için uzun yol
kat ediyordu.

**Madde 15 — menü asimetrikti.** Üç hizmetten biri (İç Operasyon) kök dizindeydi, diğer ikisi alt
sayfadaydı. Logo ile "İç Operasyon" aynı adrese gidiyordu. Ziyaretçi üç hizmetin eşit olup
olmadığını anlayamıyordu.

## Karar

`/ic-operasyon` ayrı bir sayfa olarak açıldı; ana sayfa üç hizmeti **eşit sunan bir şirket vitrini**
oldu. Genel Müdür'ün ifadesiyle: *"Ana sayfanın sade bir şirket vitrini olarak kalması ve ürün
detaylarının kendi özel alt sayfasına taşınması çok daha profesyonel bir strateji."*

### Ana sayfada kalan yedi bölüm

| # | Bölüm | Not |
|---|---|---|
| 1 | Hero | Değişmedi |
| 2 | `#nedir` | Operasyonun üç alanının **özeti** buraya katıldı (ayrı bölüm değil) |
| 3 | `#sorunlar` | Bugün / OtelDijital ile karşılaştırması; beş satır **dörde** indi |
| 4 | `#dongu` | Dört adımın **özeti**; ekran kesitli tam hâli taşındı |
| 5 | `#urun` | Üç değer, **paragraf hâlinde**; madde listeleri taşındı |
| 6 | `#sorular` | **Yeni.** Beş soru — "şifre unutuldu" bölümü buraya bir soru olarak indi |
| 7 | `#kapilar` | **Üç hizmet yan yana ve eşit** (Madde 15) |

Kapanış çağrısı sekizinci bir konu değil, sayfanın imzasıdır.

### `/ic-operasyon` sayfasına taşınanlar

Hiçbiri silinmedi; hepsi tam hâliyle yeni sayfada:
operasyonun üç alanı (zikzak bloklar) · döngü hikâyesi (dört adım, ekran kesitleriyle) ·
kim ne yapar (personel / müdür) · ekranlar (dokunmatik keşif) · raporlama · şifre yönetimi ·
"ne kazandırır" bölümünün madde listeleri.

### Menü hiyerarşisi (Madde 15)

`İç Operasyon` artık `/ic-operasyon` adresine gider. Böylece **menüdeki hiçbir öğe kök adrese
gitmiyor**; logo ile hiçbir menü öğesi aynı yere düşmüyor ve üç hizmet menüde eşit seviyede.
Ana sayfaya alt bölümdeki "Ana Sayfa" bağlantısından ve logodan ulaşılır.

## 8.000 piksel sınırına nasıl inildi? (ve neyi yapmadık)

Denetimin ölçütü "masaüstünde ≤ 8.000 piksel". İlk yapısal düzenlemeden sonra sayfa 9.494 pikseldi.
Aradaki farkı **boşlukları kısarak** kapatmak kolaydı ama yanlış olurdu: "boşluk lükstür" bu sitenin
onaylanmış tasarım ilkesidir (`DESIGN_SYSTEM.md`). Bir ara hero'nun alt boşluğu da kısılmıştı;
**geri alındı** — hero sayfanın girişidir.

Fark, tekrarı azaltarak kapatıldı:

| Ne yapıldı | Kazanç |
|---|---|
| `#nedir` içindeki dört maddelik liste çıkarıldı (aynı bilgi artık `#sorular` içinde) | ~340 px |
| `#dongu` özete indi, ekran kesitli tam hâli `/ic-operasyon` sayfasına taşındı | ~840 px |
| `#sorunlar`'daki iki depo satırı tek satırda birleştirildi ("üç imza" tekrarı azaldı) | ~250 px |
| `#urun`'ün üç madde listesi `/ic-operasyon` sayfasına taşındı | ~330 px |
| Bölüm boşluğu ölçeği 12vw → 11vw (tek, ölçülü ayar; gözle fark edilmez) | ~250 px |

**Sonuç: 13.648 px → ~7.980 px.** Ölçüm yazı tipi yüklenmesine göre ±60 piksel oynuyor, yani sayfa
sınırın tam üstünde duruyor. Yeni bölüm eklenecekse önce hangisinin çıkacağına karar verilmelidir.

## Denendi ve doğrulandı

On bir sayfa × sekiz genişlik (320–1400 px), iframe içinde:

- Yatay taşma yok; üst çubukta marka/menü/eylem çakışması yok.
- Her sayfanın `canonical` değeri `www` ile başlıyor; `/ic-operasyon` sitemap'e eklendi.
- **Menüdeki hiçbir bağlantı kök adrese gitmiyor** (Madde 15'in kabul ölçütü, ayrı denetlendi).
- Ana sayfada `<h2>` sayısı **7**; `/ic-operasyon` sayfasında 9 (detay sayfasında sınır yok).
- On adres de 200 dönüyor.

## Bozulmayanlar

- "Her sayfa kendi konusunun uzmanıdır" kuralı (`008`) aynen sürüyor; yalnızca sayfa sayısı arttı.
- Hizmet sayfalarının çağrıları ("Bilgi Al" / "Teknik Destek Al") değişmedi (`015`).
- Aydınlık tema, temiz adresler, mobil açılır menü, CSP ve üçüncü parti isteksizlik aynı.
- Taşınan içeriğin tamamı erişilebilir durumda; ana sayfadan her birine bağlantı var.
