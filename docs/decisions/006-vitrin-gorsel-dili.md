# 006 — Vitrinin Görsel Dili: "Premium Teknoloji Şirketi"

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-17
> **Durum:** Aşama 1–3 uygulandı (görsel dil, menü, hero). Sonraki aşamalar bu kurallara uyar.
> Kod: `vitrin/stil.css`, `vitrin/index.html`

---

## Durum

Vitrin, gece yarısı zeminli koyu bir sayfaydı. Genel Müdür yönü değiştirdi: sayfa artık bir
**katalog** gibi değil, sakin ve ferah bir **ürün sayfası** gibi görünmelidir.

## Karar

### 1. Renk oranı: %70 açık · %20 koyu · %10 marka
- **%70 açık** — kırık beyaz zemin (`#f6f7f9`), beyaz kartlar. Sayfanın nefesi burada.
- **%20 koyu** — antrasit (`#14181d`). Yalnızca üç yerde: yazı, hero'daki telefon çerçevesi, alt bölüm.
- **%10 marka** — turuncu (`#ff6a1f`). Yalnızca **eylem** için: butonlar ve tek bir vurgu kelimesi.

Oran bozulursa sayfa katalog hissine döner. **Yeni renk eklenmez.** Yeşil ve sarı yalnızca
durum anlatır (canlı akış, dikkat) ve asla vurgu yerine kullanılmaz.

### 2. Tek yazı ailesi: Inter
Başlık ve gövde aynı aileden gelir; ayrım yalnızca **ağırlık ve harf aralığıyla** kurulur
(başlıklar 700 ve sıkı aralık). Veriler için JetBrains Mono kalır. Üç ayrı yazı ailesi kullanmak
sayfayı kalabalıklaştırıyordu.

### 3. Yüzey dili
İnce çizgi (1px), **büyük yuvarlatılmış köşeler** (16 / 26 / 40 px), hafif cam (blur) ve yumuşak
gölge. Kalın çerçeve, sert gölge, renkli dolgu yoktur. Butonlar hap biçimindedir.

### 4. Menü sade
Solda marka, **tam ortada** beş bağlantı, sağda tek eylem: "30 Gün Ücretsiz Dene". Başka hiçbir
şey konmaz — menüye eklenen her madde diğerlerinin değerini düşürür.

### 5. Hero'da fotoğraf yok
Klasik otel fotoğrafı kaldırıldı. Sağda **kodla çizilmiş bir telefon** durur ve ekranındaki akış
gerçekten kıpırdar: ziyaretçi ürünün kendisini görür, sahnelenmiş bir fotoğrafı değil.
Telefon sayfanın sağ kenarından hafifçe taşar; önünde cam bir kart durur.

## Henüz bölümü olmayan menü maddeleri

Menüdeki **Çözümler**, **Dijital Check-up** ve **Hakkımızda** için sayfada tam karşılığı olan bölüm
yoktur. Bağlantılar bugün en yakın bölüme gider (sırasıyla şifre bölümü, fiyatlar ve alt bölüm).
Sonraki aşamalarda bu bölümler yazılınca kendi yerlerine bağlanacaklardır.
