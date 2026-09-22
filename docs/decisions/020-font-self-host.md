# 020 — Yazı Tipleri Kendi Alan Adımızda (denetim · Madde 12)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Uygulandı ve ölçülerek doğrulandı.
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 12
> Kod: `vitrin/yazilar/` (6 dosya), `vitrin/stil.css` (`@font-face`), 12 sayfanın `<head>`'i,
> `vitrin/paylasim.html`, `vercel.json` (CSP), `araclar/font-indir.js`

---

## Durum

Vitrinin **tek üçüncü taraf bağımlılığı** yazı tipleriydi. Sayfa açılırken tarayıcı önce
`fonts.googleapis.com` adresine gidip bir stil dosyası, sonra `fonts.gstatic.com` adresine gidip yazı
dosyalarını çekiyordu. Bu üç şey demekti:

1. **Bekleme.** İki ayrı sunucuya bağlanmak (DNS + TLS) ilk boyayı geciktiriyordu.
2. **Başkasına bağımlılık.** O sunucu yavaşlarsa ya da bir ülkede engellenirse sayfamızın yazısı geç gelir.
3. **Ziyaretçinin izi.** Ziyaretçinin tarayıcısı, biz istemesek de başka bir şirkete istek atıyordu.

Ayrıca gereğinden fazla indiriliyordu: **üç aile** (Cormorant Garamond, Inter, JetBrains Mono) ve
**kullanılmayan ağırlıklar** (600) isteniyordu.

## Karar

Yazı dosyaları **depoya alındı**; dışarıdan yazı çekilmiyor. Dört alt karar:

### 1. Üçüncü aile kaldırıldı — veri yazısı artık cihazın kendi yazısı
Genel Müdür kararıyla JetBrains Mono kaldırıldı ve brifteki "iki aile" sınırına dönüldü. Telefon
maketindeki sayılar ve saatler artık işletim sisteminin **hazır** monospace yazısını kullanıyor:

```
--veri-yazi: ui-monospace, SFMono-Regular, "SF Mono", "Cascadia Mono", "Segoe UI Mono", Menlo, Consolas, monospace;
```

Mac'te SF Mono, Windows'ta Cascadia/Consolas görünür. İkisi de sayıyı hizalı basar; "veri" hissi durur,
indirilecek dosya kalmaz. Görsel olarak denendi: maket aynı görünüyor.

### 2. Yalnızca kullanılan ağırlıklar
Sayfalar tarandı: **yalnızca 400 ve 500** kullanılıyor. 600 isteniyordu ama hiçbir yerde geçmiyordu;
artık istenmiyor.

### 3. Tek dosya, iki ağırlık
Her iki aile de **değişken (variable) fonttur**: Google'ın verdiği 400 ve 500 dosyaları **bayt bayt
aynıdır**. Bu fark edilince ağırlık bir aralık olarak yazıldı (`font-weight: 400 500`) ve dosya bir kez
indirildi. Dosya sayısı yarıya indi.

### 4. Yalnızca gereken alfabe
Google'ın kendi bölümlemesi kullanıldı: `latin` ve `latin-ext`. Türkçenin **ı, ğ, ş, İ** harfleri
`latin-ext` içindedir; ikisi de gerekir. Diğer alfabeler (kiril, yunan, vietnamca) alınmadı.
`unicode-range` sayesinde tarayıcı yalnızca sayfada geçen harfleri kapsayan dosyayı indirir — nitekim
ana sayfada altı dosyanın **beşi** iniyor, italik latin-ext hiç inmiyor.

### Sonuç: altı dosya

| Dosya | Boyut |
|---|---|
| `cormorant-latin.woff2` | 37 KB |
| `cormorant-latin-ext.woff2` | 33 KB |
| `cormorant-italik-latin.woff2` | 23 KB |
| `cormorant-italik-latin-ext.woff2` | 20 KB |
| `inter-latin.woff2` | 47 KB |
| `inter-latin-ext.woff2` | 83 KB |
| **Toplam** | **242 KB** |

Google'ın sunduğu paket 18 dosya / 727 KB idi (üç aile, kullanılmayan ağırlıklar dâhil). Tarayıcı
bunların hepsini indirmiyordu elbette; ama **sunulan** paket de, **inen** paket de küçüldü.

## Yazı gelene kadar metin görünür kalır

Altı `@font-face` bloğunun hepsinde `font-display: swap` var: yazı inene kadar yedek yazıyla
**okunur**, sonra yerine geçer. Hiçbir an boş metin görünmez.

### Preload: iki dosya, hepsi değil
Her sayfanın `<head>`'inde yalnızca **iki Cormorant dosyası** öne alınır (`<link rel="preload">`).
Sebebi: ilk ekranda göze çarpan en büyük öğe serif başlıktır. Inter gövde metnidir ve `swap` ile
zaten okunur gelir.

**Her şeyi öne almak, hiçbir şeyi öne almamaktır** — altı dosya birden istenirse hepsi birbiriyle
yarışır ve başlık daha geç gelir. Bu yüzden liste bilerek kısa tutuldu.

Hata sayfaları (`404.html`, `500.html`) **kök adres** kullanır (`/yazilar/...`): o sayfalar herhangi
bir adreste açılabilir, göreli yol yazıyı bulamazdı.

### Paylaşım kartı
`paylasim.html` ortak stil dosyasını yüklemez; oraya kendi içinde `@font-face` blokları yazıldı ve
`paylasim.png` yeniden üretildi (119 KB). Göz ile denetlendi: kart aynı görünüyor.

## Bir yıl önbellek — ve bunun tek kuralı

`vercel.json` içinde `/yazilar/` klasörü için `Cache-Control: public, max-age=31536000, immutable`
yazar. Yazılar değişmeyen dosyalardır; ziyaretçi ikinci kez geldiğinde hiçbirini tekrar indirmez.

**Bunun bedeli tek bir kuraldır:** bir yazı dosyasının içeriği değişecekse **adı da değişmelidir**
(örneğin `inter-latin-2.woff2`). Aynı adla üzerine yazılırsa eski ziyaretçiler bir yıl boyunca eski
dosyayı görmeye devam eder. Ağırlık eklemek ya da alt küme değiştirmek gerekirse `araclar/font-indir.js`
çalıştırılır, dosyalar **yeni adla** konur ve `stil.css` başındaki `@font-face` blokları güncellenir.

## Güvenlik: kapı iyice daraldı

CSP'den Google adresleri **tamamen** çıktı:

```
style-src 'self' 'unsafe-inline';   (eskiden fonts.googleapis.com da vardı)
font-src  'self';                   (eskiden fonts.gstatic.com'du, 'self' hiç yoktu)
```

Artık sayfa, kendi alan adımız ve Supabase dışında hiçbir yere bağlanamaz.

## Ölçüldü

| Ne | Önce | Sonra |
|---|---|---|
| Üçüncü taraf istek | 1 host (`fonts.googleapis.com`) | **0** |
| İlk boya (FCP) | 460–536 ms | **200–272 ms** |
| Yazı ailesi | 3 | **2** (+ cihazın kendi monospace'i) |
| Sunulan yazı paketi | 18 dosya · 727 KB | **6 dosya · 242 KB** |
| Ana sayfada inen yazı | — | 5 dosya · 224 KB |
| Ana sayfa toplam istek | 5 (yazılar hariç) | 9 (yazılar dâhil) |

İstek sayısı arttı gibi görünüyor; öyle değil. Eskiden yazı istekleri **başka bir sunucuya**
gidiyordu ve sayıma girmiyordu. Şimdi hepsi aynı bağlantı üzerinden, kendi sunucumuzdan geliyor —
yeni bağlantı kurulmuyor. Kazanç da buradan geliyor.

**Bozulmama:** 8 sayfa × 8 genişlik (320–1400 px) tarandı; yatay taşma yok, üst çubukta çakışma yok,
hiçbir sayfada Google Fonts bağlantısı kalmadı. Ana sayfa göz ile denetlendi: serif başlık, italik
vurgu ve maket içindeki sayılar doğru görünüyor.

## Kalan iş

- Canlıda doğrulama: dağıtım listesi · **6.17** (vitrin) ve **6.18** (uygulama).

## Ek adım: personel uygulaması da aynı yola geçti (2026-09-22)

Genel Müdür kararıyla `app/` de dışarıdan yazı çekmeyi bıraktı. Oradaki durum vitrinden farklı ve daha
kötüydü: `app/index.html` içindeki Google stil bağlantısı **uygulamanın her açılışında** çizimi
bekletiyordu — **internet yokken bile**, boşuna. Çevrimdışı çalışması gereken bir uygulama için bu
doğrudan bir kusurdu.

- Dört dosya `app/public/yazilar/` içine kondu (Cormorant + Inter · latin + latin-ext · **201 KB**).
  İtalik alınmadı: dış kapıda italik yazı yok.
- `@font-face` blokları `app/src/stil.css` başına yazıldı; `index.html` içinden üç satır (iki
  `preconnect` ve stil bağlantısı) silindi.
- **Preload yok, çevrimdışı önbellek yok.** Sebebi basit: bu yazıları yalnızca dış kapı (`/giris`,
  `/kayit`) kullanır. Uygulamanın içi bilerek telefonun kendi yazısıyla çizilir — ıslak elle bakan
  görevli için en hızlısı odur. Giriş yapan kişi yazıları bir kez indirir, içerideki görevli hiç
  indirmez. Ayrıca giriş yapmak zaten internet ister; "çevrimdışı giriş ekranı" diye bir senaryo yok.
  Servis çalışanının önden yükleme listesi (`globPatterns`) bu yüzden **değiştirilmedi**.
- `app/vercel.json` `/yazilar/` için bir yıllık önbellek başlığı verir.

Derlendi ve göz ile denetlendi: `/giris` ekranı serif başlığı ve Türkçe harfleriyle doğru çıkıyor,
derleme çıktısında `googleapis`/`gstatic` geçmiyor, servis çalışanı yazıları önbelleğe almıyor.

## Bu karar neyi geçersiz kılar

006, 007 ve 009 numaralı kararlardaki "veri yazısı JetBrains Mono" satırı artık geçerli değildir.
O kayıtlar tarihî belgedir, değiştirilmedi; güncel kural `DESIGN_SYSTEM.md` · 4.1'dedir.
