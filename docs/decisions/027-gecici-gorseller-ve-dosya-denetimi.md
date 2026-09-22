# 027 — Geçici Yer Tutucu Görseller ve "Dosya Gerçekten Yerinde mi?" Denetimi

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Uygulandı. `<picture>` etiketleri açıldı; dosyalar bugün geçicidir.
> Kaynak: Genel Müdür talimatı (2026-09-22) · `docs/decisions/024` · dağıtım listesi 6.22
> Kod: `vitrin/index.html`, `vitrin/ic-operasyon.html`, `vitrin/stil.css`,
> `araclar/gecici-gorsel-uret.js`, `araclar/kaynak-notu-taramasi.js`,
> `vitrin/gorseller/uygulama/` (sekiz dosya)

---

## Durum

Karar 024 görsel altyapısını kurmuş, `<picture>` bloklarını **yorum içinde** bekletmiş ve ekrana
aynı orandaki yer tutucular koymuştu. Gerçek dosyaların depoya ulaştığı bildirildi; ancak denetimde
dosyaların **ne yerelde ne de GitHub'da** olmadığı görüldü (aktarımda senkronizasyon sorunu).
Etiketleri o hâliyle açmak canlıda dört kırık görsel demekti, o yüzden açılmadı ve durum bildirildi.

## Karar (Genel Müdür, 2026-09-22)

1. **Kod bekletilmesin:** yapı canlıda doğrulanabilsin diye dört ekranın **geçici** `.avif` ve
   `.webp` dosyaları bir Node betiğiyle üretilsin; `<picture>` etiketleri bunlar üzerinden açılsın.
   Gerçek dosyalar sonra aynı adlarla üzerine yazılacak.
2. **Güvenlik ağı eklensin:** sayfada adı geçen görsel dosyasının gerçekten yerinde olup olmadığını
   denetleyen bir test, tarama betiğine dahil edilsin.

## 1. Geçici görseller — `araclar/gecici-gorsel-uret.js`

Sekiz dosya yazar (dört ekran × avif + webp), hepsi **780 × 1688**: grafit zemin, ortada şampanya
blok. İçerikleri boştur; tek işleri `<picture>` yapısını kırık görsel olmadan ayakta tutmaktır.

### Baytlar neden betiğin içine gömülü?

Bu bilgisayarda **AVIF kodlayıcı yok** (ffmpeg, ImageMagick, avifenc kurulu değil) ve **tarayıcı da
AVIF yazamıyor**: `canvas.toDataURL('image/avif')` sessizce PNG döndürüyor — denendi ve ekranda
görüldü. Elle yazılmış "en küçük AVIF" denemesi de tarayıcıda çözülmedi.

Bu yüzden iki dosya (bir avif, bir webp) depo **dışında**, geçici bir araçla bir kez üretildi;
tarayıcıda 780 × 1688 olarak çözüldükleri doğrulandı ve baytları betiğin içine gömüldü. Sonuç:
betik kurulumsuz, internetsiz çalışır ve her seferinde aynı dosyaları üretir. Projeye **hiçbir
bağımlılık eklenmedi**.

### Gerçek görselin üzerine yazmaz

Betik, klasördeki bir dosya yer tutucudan farklıysa ona **dokunmaz** ve ekrana "gerçek görsel
duruyor" yazar. Yani Genel Müdür gerçek dosyaları koyduktan sonra betik yanlışlıkla çalıştırılsa
bile hiçbir şey kaybolmaz.

## 2. `<picture>` etiketleri açıldı, yer tutucular silindi

Altı kartta (ana sayfada iki, `/ic-operasyon` sayfasında dört) yorum kaldırıldı, `.gorsel-yer`
blokları ve onların CSS'i silindi. Kartlardaki uzun "görsel gelince ne yapılacak" notu da kalktı;
açıklama bölüm başındaki tek yoruma toplandı — aynı şey altı kez yazılmaz.

**Zıplamayı (CLS) önleyen şey, HTML'deki `width`/`height` ile CSS'teki `height: auto`dur.**
Tarayıcı oranı bu ikisinden hesaplar ve dosya inmeden önce yeri ayırır. Ölçüldü: altı görselin
hesaplanan oranı `780 / 1688`, yani yer baştan ayrılıyor.

## 3. Yeni denetim: dosya gerçekten yerinde mi, gerçekten o biçimde mi?

`araclar/kaynak-notu-taramasi.js` artık iki iş yapar. İkincisi şudur: her sayfadaki `src`, `srcset`
ve `href` hedefleri toplanır, diskte aranır ve **ilk baytları uzantısıyla karşılaştırılır**.

Neden ikisi birden? Çünkü `<picture>` seçtiği dosyayı bulamazsa bir alttakine **düşmez**; ayrıca
bir WebP dosyasının adını `.avif` yapmak da aynı sonucu verir — tarayıcı biçimi içerikten anlar
ama bizim "avif var" iddiamız yanlış olur.

Denetim dışında tutulan iki yol vardır ve ikisi de bilinçlidir: `ayarlar.js` dağıtımda üretilir
(git'e girmez), `/istatistik/` altı ise sağlayıcıya yönlendirilir (diskte dosyası yoktur).

### Test'in kendisi test edildi

| Senaryo | Sonuç |
|---|---|
| `kumanda.avif` dosyası silindi | ✗ iki sayfada da yakalandı, çıkış kodu 1 |
| `kumanda.webp` dosyası `kumanda.avif` adıyla kondu | ✗ "içerik uzantıya uymuyor", çıkış kodu 1 |
| Her şey yerinde | ✓ 13 sayfa, 106 dosya bağlantısı temiz |

## Denendi ve doğrulandı

| Ne denendi | Sonuç |
|---|---|
| Tarama (iki denetim) | ✓ 13 sayfa, 106 dosya bağlantısı temiz |
| Yatay taşma: `/` ve `/ic-operasyon` × 320 · 390 · 768 · 1200 px | Sekiz ölçümün hepsinde **taşma yok** |
| Görsellerin hesaplanan oranı | `780 / 1688` (altısında da) — yer baştan ayrılıyor, **CLS yok** |
| Dosyaların tarayıcıda çözülmesi | avif ve webp, ikisi de **780 × 1688** |
| Görünüm | Dört kart `/ic-operasyon` sayfasında, iki kart ana sayfada; altyazılar yerinde, kırık görsel yok |

## Açık kalan

- **Gerçek görseller.** Sekiz dosya aynı adlarla üzerine yazılacak; HTML değişmeyecek (6.22).
- **`fetchpriority="high"` iki görselde duruyor** ama ikisi de ilk ekranın altındadır. Yer tutucular
  902 bayt olduğu için bugün zararsızdır; gerçek dosyalar (≈250 KB) konduğunda sayfanın asıl
  açılışıyla yarışır. Ölçümde LCP kötüleşirse bu iki etiketi `loading="lazy"` yapmak tek satırlık
  düzeltmedir. Ölçüm gerçek dosyalarla yapılmadan değiştirilmedi.
