# DESIGN_SYSTEM.md — OtelDijital Görsel Dili: "Sakin Lüks"

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-18
> **Durum:** Onaylandı (2026-09-18). Karar kaydı: `docs/decisions/007-sakin-luks-gorsel-dili.md`. Bu belge
> önceki görsel dil kararını (`docs/decisions/006` — açık zemin, turuncu marka) **geçersiz kılar**.
>
> Bu belge "nasıl görünecek?" sorusunun tek cevabıdır. Vitrin ya da kapı ekranı yapan herkes (insan ya da ajan)
> önce burayı okur. Buradaki ölçülerden sapmak için önce bu belge değişir, sonra kod.

---

## 1. Tek cümleyle

OtelDijital, lüks bir otelin lobisi gibi görünür: **koyu, mat, sessiz ve ferah.** Bağırmaz, ışıldamaz;
az şey söyler ve söylediğini pahalı bir sadelikle söyler.

İki kelime: **Sakin Lüks** (Quiet Luxury) ve **Çağdaş Konukseverlik** (Contemporary Hospitality).

**5 yaşındaki çocuk testi:** "Karanlık ama korkutucu değil. Az yazı var, hepsi büyük ve güzel. Altın renkli bir tek
düğme var, ona basılır." ✅

---

## 2. Nerede geçerli, nerede değil

| Yer | Bu dil geçerli mi? | Neden |
|---|---|---|
| **Vitrin** (`vitrin/` — oteldijital.com) | ✅ Evet, tamamen | Ziyaretçinin ilk gördüğü yer; markanın yüzü |
| **Dış kapı ekranları** (uygulamada Giriş ve Kayıt) | ✅ Evet | Vitrinden gelen ziyaretçi görsel şok yaşamamalı (Genel Müdür kararı) |
| **Uygulamanın içi** (görevli, teknisyen, depo, müdür ekranları) | ❌ Hayır | Orada telefonu ıslak elle tutan görevli vardır: dev butonlar, yüksek karşıtlık, açık zemin kalır (`docs/ux/`) |
| **Misafir yorum sayfası** (`/yorum/:kod`) | ❌ Hayır (şimdilik) | Misafirin 10 saniyede bitirdiği tek ekran; ayrı bir kararla ele alınır |

---

## 3. Renkler

### 3.1 Felsefe
Parlak, doygun, "göz yoran" renk **yoktur**. Sayfa mat grafitten yapılmıştır; zeytin yeşili ona derinlik verir;
şampanya/bronz ise bir otel lobisindeki pirinç kapı kolu gibidir — az, ama gözün gittiği yer.

### 3.2 Paletin tamamı (başka renk eklenmez)

| Rol | Ad (kodda) | Değer | Nerede kullanılır |
|---|---|---|---|
| Zemin, en derin | `--grafit-900` | `#121413` | Hero arkası, alt bölüm |
| **Zemin, ana** | `--grafit-800` | `#1B1E1C` | Sayfa zemini (en çok görünen renk) |
| Yüzey | `--grafit-700` | `#262A27` | Kartlar, form alanları, telefon çerçevesi |
| Yüzey, kalkık | `--grafit-600` | `#343936` | Üstte duran yüzey, ayırıcı çizgi (koyu) |
| Zeytin, derin | `--zeytin-800` | `#2A3327` | İkincil bölüm zemini (bir–iki bölüm, fazlası değil) |
| Zeytin, yüzey | `--zeytin-700` | `#3A4736` | Zeytin bölümde kart |
| Zeytin, soluk | `--zeytin-500` | `#5C6B55` | İkon, küçük işaret, durum "iyi" |
| **Şampanya (marka)** | `--sampanya` | `#C8B48A` | Ana düğme, üst başlık (kicker), tek vurgu kelimesi |
| Bronz | `--bronz` | `#9C7E4E` | Düğme hover, ince çizgi, küçük süs |
| **Fildişi (yazı)** | `--fildisi` | `#EFEAE0` | Koyu zeminde ana yazı |
| Taş (yazı, ikincil) | `--tas` | `#B9B3A6` | Paragraf, açıklama |
| Taş, soluk | `--tas-soluk` | `#8A857A` | Dipnot, alt yazı, boş alan yazısı |
| Durum: iyi | `--durum-iyi` | `#7F9B6E` | Canlı akışta "tamamlandı" |
| Durum: dikkat | `--durum-dikkat` | `#C99A5B` | "Süresi yaklaşıyor" |
| Durum: sorun | `--durum-sorun` | `#B4655A` | "Süresi geçti", form hatası |

Durum renkleri **yalnızca durum anlatır** (canlı akış, panolar, hata yazısı); süs ya da vurgu olarak kullanılmaz.
Üçü de bilerek mat ve kısık tondadır: kırmızı bağırmaz, yeşil parlamaz.

### 3.3 Oran (bozulursa his gider)

```
 ~%65  grafit / antrasit      sayfanın gövdesi; boşluk da bu renktedir
 ~%15  zeytin                 bir–iki bölümde derinlik; her yere yayılmaz
 ~%15  fildişi / taş          yazı ve (isteğe bağlı) tek bir "nefes" bölümü
  ≤%5  şampanya / bronz       düğme, kicker, çizgi, tek vurgu kelimesi
```

**Kural:** Şampanya, gözün aynı anda gördüğü alanda **en fazla bir düğme + bir kicker**. Şampanya çoğalırsa
"altın kaplama" olur, lüks olmaz.

### 3.4 Okunabilirlik (karşıtlık)
Koyu zeminde yazı her zaman fildişi ya da taştır. Hesaplanan karşıtlık oranları (`--grafit-800` üstünde):
fildişi ≈ 14:1 · taş ≈ 8:1 · taş-soluk ≈ 4.7:1 · şampanya ≈ 8:1. Hepsi erişilebilirlik eşiğinin (4.5:1) üstündedir.
**Bronz yazı olarak kullanılmaz** (≈ 4.5:1, sınırda); yalnızca çizgi ve hover içindir. Uygulama aşamasında bu
değerler araçla yeniden ölçülür (QA).

### 3.5 Eski dilden geçiş (kod için harita)
`vitrin/stil.css` içindeki değişken adları korunur; yalnızca değerleri değişir. Böylece geçiş büyük ölçüde bir
değer değişimidir:

| Eski değişken | Eski değer | Yeni değer |
|---|---|---|
| `--zemin` | `#f6f7f9` (kırık beyaz) | `#1B1E1C` (grafit-800) |
| `--yuzey` | `#ffffff` | `#262A27` (grafit-700) |
| `--yuzey-ust` | `#eef1f5` | `#343936` (grafit-600) |
| `--cizgi` | `#e4e8ee` | `rgba(200,180,138,0.14)` (şampanya tonlu ince çizgi) |
| `--koyu` | `#14181d` | `#121413` (grafit-900) |
| `--metin` | `#14181d` | `#EFEAE0` (fildişi) |
| `--metin-soluk` | `#5b6572` | `#B9B3A6` (taş) |
| `--metin-cok-soluk` | `#8a94a2` | `#8A857A` (taş-soluk) |
| `--marka` | `#ff6a1f` (turuncu) | `#C8B48A` (şampanya) |
| `--marka-soluk` | turuncu %10 | `rgba(200,180,138,0.10)` |
| `--canli` / `--uyari` | `#12a150` / `#b7791f` | `#7F9B6E` / `#C99A5B` |
| `--cam` | beyaz %72 + blur | **kaldırılır** (cam efekti bu dilde yoktur) |

Yeni eklenenler: `--zeytin-800`, `--zeytin-700`, `--zeytin-500`, `--bronz`, `--durum-sorun`.

---

## 4. Yazı (tipografi)

### 4.1 İki aile, iki görev
| Görev | Aile | Ağırlıklar | Neden |
|---|---|---|---|
| **Başlıklar** (h1, h2, büyük rakamlar) | **Cormorant Garamond** (serif) | 400, 500, 600 + 400 italik | Lüks otel dilinin imzası: ince, uzun, sakin serif. Kalın kullanılmaz. |
| **Gövde, menü, düğme, form** | **Inter** (sans) | 400, 500, 600 | Zaten yüklü; temiz ve nötr. 700 ve üstü kullanılmaz. |
| Veri (telefon ekranındaki sayılar, saatler) | JetBrains Mono | 400, 500 | Kodla çizilen arayüzde sayılar hizalı dursun |

Önceki "tek aile" kuralı (006) burada bilerek bırakılır: sakin lüks, serif başlık ile sans gövdenin karşıtlığından doğar.
Üçüncü bir aile eklenmez. Yazı tipleri Google Fonts'tan gelir; `vercel.json` içindeki CSP zaten izin verir.

### 4.2 Ölçek
| Öğe | Boyut | Satır aralığı | Harf aralığı | Ağırlık |
|---|---|---|---|---|
| h1 (hero) | `clamp(2.75rem, 6vw, 5.25rem)` | 1.02 | −0.01em | 400 serif |
| h2 (bölüm) | `clamp(2rem, 4vw, 3.25rem)` | 1.08 | −0.005em | 400 serif |
| h3 (kart) | `1.375rem` | 1.25 | 0 | 500 serif |
| Kicker (üst başlık) | `0.75rem` | 1 | **+0.18em, BÜYÜK HARF** | 500 sans, şampanya |
| Gövde | `clamp(1rem, 0.4vw + 0.9rem, 1.125rem)` | 1.65 | 0 | 400 sans, taş |
| Küçük | `0.875rem` | 1.5 | +0.01em | 400 sans, taş-soluk |
| Düğme | `0.8125rem` | 1 | **+0.12em, BÜYÜK HARF** | 500 sans |

**Bölüm başlığı kalıbı** (her bölümde aynı sırayla):
1. Kicker — şampanya, büyük harf, kısa: "KAT HİZMETLERİ"
2. h2 — serif, en fazla iki satır, en fazla 9 kelime
3. Bir paragraf — taş, en fazla 2 cümle, genişlik en fazla 56 karakter (`max-width: 56ch`)

Tek vurgu kelimesi: h1 içinde **bir** kelime *italik serif* ve şampanya olabilir. İkinci vurgu yoktur.

İstisnalar: **geçiş bölümü** (#checkup) kicker + tek soru cümlesiyle yetinir, paragrafı yoktur; **iç operasyon**
(#operasyon) ortalanmış kicker + h2 ile başlar, paragraf yerine üç zikzak blok gelir; **kapanış** yalnızca
h2 + bir cümle + düğmedir. Bunun dışında kalıp değişmez.

**Üçleme kuralı (Genel Müdür, 2026-09-18):** hero altındaki iç operasyon vitrini **üç** bloktur — sol görsel/sağ metin,
sonra tersi. Dördüncü blok sayfayı uzatır, ferahlığı bozar; ayrıntılar (kayıp eşya, personel yönetimi…) alt sayfaya
kalır ve bölümün altındaki tek düğme oraya bağlanır.

---

## 5. Boşluk ve ızgara

- **Temel birim 8 px.** Boşluk adımları: 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 176.
- **Bölüm dikey boşluğu:** `clamp(96px, 12vw, 176px)`. Bölümler arasında "hiçbir şey olmayan" alan bilerek bırakılır;
  boşluk lükstür, doldurulmaz.
- **Sütun genişliği:** en fazla `1200px`, ortalanmış. Yan boşluk: 20 px (telefon) · 32 px (masaüstü).
- **Izgara:** 12 sütun, 24 px aralık (telefon 16 px).
- **Editoryal asimetri serbesttir ve teşvik edilir:** yazı 5 sütun, görsel 7 sütun; ya da yazı sola yaslı 4 sütun,
  geri kalanı boş. "Üç eşit kutu yan yana" ve "dörtlü özellik ızgarası" **bu dilde yoktur** — SaaS şablonu hissi verir.
- **Paragraf genişliği:** `max-width: 56ch`. Uzun satır okumayı yorar; lüks yormaz.
- **Menü:** yükseklik 72 px; solda marka (küçük, harf aralıklı), ortada en fazla beş bağlantı, sağda sade bir
  "Giriş Yap" bağlantısı ve tek düğme. Bu düğme **ikincil** türdedir: çubuk yapışkan olduğu için sayfadaki ana
  düğmelerle hep aynı görünür alanda durur; dolu olsaydı ekranda iki şampanya olurdu (§3.3). Zemin grafit-900;
  kaydırınca altına 1 px şampanya tonlu çizgi gelir. Cam/blur yok.

---

## 6. Yüzeyler

| Öğe | Kural |
|---|---|
| **Çizgi** | 1 px, `rgba(200,180,138,0.14)`. Hover ve vurgu çizgisi `0.28`; seçili yüzey dolgusu `0.06`, hover dolgusu `0.08`. Çizgi çoğu yerde kartın tek sınırıdır; dolgu yerine çizgi tercih edilir. |
| **Köşe** | Kart 4 px · düğme ve form alanı 2 px · telefon mockup 36 px (gerçek telefon gibi). Hap (pill) düğme **yoktur**. |
| **Gölge** | Kartlarda yok. Yalnızca telefon mockup'ında tek, yumuşak, geniş gölge: `0 32px 80px rgba(0,0,0,0.45)`. |
| **Cam / blur** | **Yoktur.** Cam efekti önceki dile aitti; sakin lüks mat yüzeylerden yapılır. |
| **Degrade** | Yalnızca zeminde, fark edilmeyecek kadar hafif: grafit-800 → grafit-900, dikey. Renkli degrade yok. |
| **Doku** | İsteğe bağlı: hero zemininde %3 opaklıkta ince grain (kum dokusu). Bundan fazlası "efekt" olur. |
| **Fotoğraf** | Klasik stok otel fotoğrafı **yoktur** (Genel Müdür kararı korunur). Ürün, kodla çizilmiş arayüz olarak gösterilir. |

---

## 7. Parçalar (bileşenler)

### 7.1 Düğmeler — üç tür, bir sayfada bir ana düğme
| Tür | Görünüm | Ne zaman |
|---|---|---|
| **Ana** | Şampanya zemin, grafit-900 yazı, 52 px yükseklik, 0 28 px iç boşluk, 2 px köşe, büyük harf. Hover: bronz zemin. | Sayfanın tek gerçek eylemi: "30 Gün Ücretsiz Dene" (hero, tarifede yalnızca Standart, kapanış) ve formun "Gönder"i |
| **İkincil** | Saydam zemin, 1 px şampanya çizgi, fildişi yazı. Hover: `rgba(200,180,138,0.08)` zemin. | "Bilgi Al", "Teknik Destek Al", üst çubuktaki düğme, tarifedeki diğer üç satır |
| **Bağlantı** | Fildişi yazı, altında 1 px bronz çizgi (4 px aşağıda). Hover: çizgi şampanya. | Metin içi, alt bölüm, "Giriş yapın", hero'daki "Uygulamayı keşfet" |

Deneme düğmesinin metni **her yerde aynıdır**: "30 Gün Ücretsiz Dene" (Genel Müdür kararı). Tek istisna üst çubuk:
orada kısa "Demo İste" yazar ve aynı kayıt sayfasına gider (Genel Müdür, 2026-09-18). Hero'daki ana düğme
"Operasyon Merkezini Keşfet →" sayfanın içine çağırır; deneme kaydı hero'da sessiz bağlantıdadır.
Düğmelerde ikon ve emoji yoktur; "→" yalnızca "keşfet" düğmelerinde, metnin parçası olarak durur.

### 7.2 Kart
Grafit-700 zemin, 1 px çizgi, 4 px köşe, 32 px iç boşluk (telefon 24 px). İçinde: küçük işaret (zeytin-500, 20 px)
→ h3 serif → bir paragraf taş. Hover'da yükselmez, parlamaz; yalnızca çizgi şampanyaya döner (300 ms).

### 7.3 Form (Giriş, Kayıt, İletişim)
- Alan: grafit-700 zemin, 1 px çizgi, 2 px köşe, 56 px yükseklik, fildişi yazı, taş-soluk placeholder.
- Etiket: küçük (0.75rem), büyük harf, +0.12em, taş; alanın **üstünde** (içinde değil).
- Odak (focus): çizgi şampanya olur. Renkli parlama halkası (glow) **yoktur**.
- Hata: alan çizgisi `--durum-sorun`, altında bir satır kısık kırmızı yazı. Kutu sallanmaz, ekran kızarmaz.
- Düğme: ana düğme, tam genişlik (kapı ekranlarında).
- Kapı kutusu (giriş/kayıt kartı): en fazla 440 px, sayfa ortasında, arkasında grafit-900 zemin. Marka üstte küçük ve
  harf aralıklı; başlık serif ("Tekrar hoş geldiniz."); tek paragraf; form; altta tek bağlantı.

### 7.4 Kodla çizilen telefon (mockup)
Çerçeve grafit-700, 36 px köşe, 1 px çizgi; ekran grafit-900. Ekrandaki akış fildişi yazı, sayılar JetBrains Mono,
durumlar üç durum rengiyle. Telefon, hero'da sağ kenardan hafifçe taşar (önceki karar korunur).

### 7.5 Alt bölüm (footer)
Grafit-900 zemin. Üstte 1 px çizgi. Solda marka ve tek cümle; sağda dört yasal bağlantı (bağlantı türü). Sosyal ikon,
"Made with ♥", rozet **yoktur**.

### 7.6 Dijital check-up panosu ve canlı akış
Veri tek renkle çizilir (fildişi çubuk, taş-soluk iz); şampanya yalnızca toplam skorda. Durum renkleri yalnızca
"geçti / dikkat / sorun" ayrımı için. Panoda üçten fazla renk görünmez.

---

## 8. Hareket

- **Süre:** 500 ms · **Eğri:** `cubic-bezier(0.2, 0.7, 0.2, 1)` (yavaş biter). Hızlı, zıplayan, esneyen hareket yoktur.
- **Tek hareket türü:** belirme + 12 px yukarı kayma. Bölüm görününce çocukları 60 ms arayla sırayla belirir.
  Canlı akışa düşen yeni satır da aynı hareketle gelir; "canlı" noktası sabittir, nabız gibi atmaz.
- Parallax, otomatik kayan bant (carousel), sürekli dönen ikon, yazı yazma efekti **yoktur**.
- Hover'da yalnızca renk değişir (çizgi, zemin); hiçbir şey büyümez.
- `prefers-reduced-motion` açıksa hiçbir şey kıpırdamaz; bütün içerik baştan görünür (mevcut kural korunur).
- Betik olmadan da sayfa eksiksiz okunur (mevcut kural korunur).

---

## 9. Dil ve ton (metin)

- Kısa, sakin, kendinden emin cümleler. Ünlem işareti **yoktur**. Emoji **yoktur**.
- "Devrim", "yapay zekâ destekli", "süper", "inanılmaz" gibi pazarlama sıfatları yoktur. Ürün ne yapıyorsa o söylenir.
- Fiil öne: "Personel kareyi okutur. Müdür anında görür."
- Sayılar sade: "30 gün", "5 saniye". Yüzde ve istatistik yalnızca kaynağı varsa.
- Hitap: "siz". Otel sahibine konuşulur, personele değil.

---

## 10. Yapılmayacaklar listesi

1. Turuncu, parlak mavi, neon yeşil — hiçbir doygun renk.
2. Cam / blur efekti, renkli parlama (glow), sert gölge.
3. Hap (pill) düğme, yuvarlak rozet, gradient düğme.
4. Üçlü/dörtlü eşit özellik ızgarası; ikonlu "features" bölümü.
5. Stok otel fotoğrafı, sahte müşteri yorumu, logo şeridi ("bize güvenenler").
6. Emoji, ünlem, "🚀 Hemen başla!" tarzı metin.
7. Otomatik kayan bant, parallax, yazı yazma efekti, sürekli animasyon.
8. Kalın (700+) başlık; büyük harfli serif başlık.
9. Aynı ekranda birden fazla ana (şampanya) düğme.
10. Uygulamanın **içine** bu dili taşımak.

---

## 11. Teslim öncesi kontrol listesi (UX ve QA ajanları için)

- [ ] Sayfada §3.2 dışında bir renk var mı? (Hex arama ile doğrulanır.)
- [ ] Görünür alanda birden fazla şampanya düğme var mı?
- [ ] Her h1/h2 serif ve 400–500 ağırlıkta mı? Hiçbir başlık 700 mü?
- [ ] Bölüm başlığı kalıbı (kicker → h2 → paragraf) her bölümde aynı mı?
- [ ] Paragraf genişliği 56ch'i aşıyor mu?
- [ ] Bölümler arası boşluk 96 px'in altına düşüyor mu?
- [ ] 320–1400 px arasında yatay taşma var mı? (Mevcut betikle denetlenir.)
- [ ] Yazı karşıtlığı 4.5:1'in altında bir yer var mı? (Bronz yazı olarak kullanılmış mı?)
- [ ] `prefers-reduced-motion` ile hiçbir şey kıpırdamıyor mu? Betiksiz sayfa eksiksiz mi?
- [ ] Hizmet bölümleri hâlâ iletişime iniyor, demoya göndermiyor mu? (Genel Müdür kararı)
- [ ] Ana düğme metni her yerde "30 Gün Ücretsiz Dene" mi?
- [ ] Giriş ve Kayıt ekranları vitrinle aynı dilde mi; uygulamanın içi dokunulmamış mı?

---

## 12. Bu belge nasıl değişir

Yeni bir renk, yazı ailesi ya da parça gerekiyorsa önce buraya yazılır, gerekçesi eklenir, Genel Müdür onaylar;
sonra kod değişir. Kodda olup burada olmayan bir şey hatadır.
