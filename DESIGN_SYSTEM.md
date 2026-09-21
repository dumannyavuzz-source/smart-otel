# DESIGN_SYSTEM.md — OtelDijital Görsel Dili: "Sakin Lüks — Aydınlık Premium Tema"

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Onaylandı. Karar kayıtları: `docs/decisions/007-sakin-luks-gorsel-dili.md` (dilin kendisi) ve
> `docs/decisions/009-aydinlik-premium-tema.md` (**koyu temadan aydınlık temaya geçiş, 2026-09-21**).
> Bu belge önceki görsel dil kararını (`docs/decisions/006` — açık zemin, turuncu marka) geçersiz kılar.
>
> **2026-09-21 değişikliği:** "Sakin Lüks" dili aynen sürüyor; yalnızca **tema koyudan aydınlığa döndü.**
> Tipografi (Cormorant Garamond + Inter + JetBrains Mono), boşluk ölçeği, ızgara, zikzak düzen, hareket ve
> "fotoğraf yok" kuralı **hiç değişmedi.** Değişen tek şey renklerdir.
>
> Bu belge "nasıl görünecek?" sorusunun tek cevabıdır. Vitrin ya da kapı ekranı yapan herkes (insan ya da ajan)
> önce burayı okur. Buradaki ölçülerden sapmak için önce bu belge değişir, sonra kod.

---

## 1. Tek cümleyle

OtelDijital, lüks bir otelin **aydınlık** lobisi gibi görünür: **krem, mat, sessiz ve ferah.** Bağırmaz, ışıldamaz;
az şey söyler ve söylediğini pahalı bir sadelikle söyler.

İki kelime: **Sakin Lüks** (Quiet Luxury) ve **Çağdaş Konukseverlik** (Contemporary Hospitality).

Sayfa saf beyaz değildir: beyaz ucuz ve klinik görünür. Zemin, güneş almış bir kaşmir gibi **uçuk krem**tir.
Yazı da saf siyah değildir; siyah serttir. Yazı **derin antrasit**tir.

**5 yaşındaki çocuk testi:** "Sayfa aydınlık ve ferah, göz yormuyor. Az yazı var, hepsi büyük ve güzel.
Altın renkli bir tek düğme var, ona basılır." ✅

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
Parlak, doygun, "göz yoran" renk **yoktur**. Sayfa uçuk krem bir kaşmirden yapılmıştır; yumuşak adaçayı ona
tek bir yerde derinlik verir; şampanya/bronz ise bir otel lobisindeki pirinç kapı kolu gibidir — az, ama gözün
gittiği yer. Ne saf beyaz ne saf siyah kullanılır: ikisi de ucuz ve sert görünür.

### 3.2 Paletin tamamı (başka renk eklenmez)

| Rol | Ad (kodda) | Değer | Nerede kullanılır |
|---|---|---|---|
| Yüzey, en açık | `--kasmir-0` | `#FFFFFF` | Kart, telefon ekranı, form alanı |
| **Zemin, ana** | `--kasmir-50` | `#F9F8F6` | Sayfa zemini, üst çubuk, hero (en çok görünen renk) |
| Yüzey, gömülü | `--kasmir-100` | `#F2F0EC` | Alt bölüm, pano özeti, ikon zemini |
| **Çizgi** | `--kasmir-200` | `#E6E4E0` | Bölüm çizgisi, kart kenarlığı, boş çubuk izi |
| Çizgi, koyu | `--kasmir-300` | `#D6D3CC` | Hover kenarı, bağlantı altı çizgisi (duran hâli) |
| Zeytin (adaçayı) | `--zeytin-50` | `#E9ECE3` | İletişim bloğu — sayfanın tek renkli alanı |
| Zeytin, çizgi | `--zeytin-200` | `#CFD6C6` | Adaçayı bloğun içindeki kenarlık |
| **Antrasit (yazı)** | `--antrasit` | `#1C1C1A` | Ana yazı ve başlıklar; şampanya düğmenin üstündeki yazı |
| Gri (yazı, ikincil) | `--gri` | `#5E5E5B` | Paragraf, açıklama |
| Gri, soluk | `--gri-soluk` | `#757370` | Dipnot, mono etiket, boş alan yazısı |
| **Şampanya — DOLGU** | `--sampanya` | `#C3A77D` | Ana düğmenin zemini, "içeriğe atla" kutusu |
| **Bronz — YAZI ve ÇİZGİ** | `--bronz` | `#8A6D3B` | Üst başlık (kicker), numara, vurgu kelimesi, kenarlık, odak halkası |
| Cihaz | `--cihaz` | `#23231F` | Telefon maketinin çerçevesi (sayfa yüzeyi değil, bir nesne) |
| Durum: iyi | `--durum-iyi` | `#4F7343` | Canlı akışta "tamamlandı" |
| Durum: dikkat | `--durum-dikkat` | `#8F6415` | "Süresi yaklaşıyor" |
| Durum: sorun | `--durum-sorun` | `#A03A30` | "Süresi geçti", form hatası |

Durum renkleri **yalnızca durum anlatır** (canlı akış, panolar, hata yazısı); süs ya da vurgu olarak kullanılmaz.
Üçü de bilerek mat ve kısık tondadır: kırmızı bağırmaz, yeşil parlamaz.

### 3.2.1 Şampanya ile bronz neden iki ayrı renk?
Bu, aydınlık temanın en önemli kuralıdır. Açık şampanya (`#C3A77D`) krem zeminde bir **yazı** rengi olarak
okunmaz — karşıtlık ≈ 1,9:1, yani erişilebilirlik eşiğinin çok altında. Bu yüzden vurgu ikiye ayrıldı:

- `--sampanya` → **DOLGU**: ana düğmenin zemini. Üstündeki yazı antrasittir (≈ 6,8:1).
- `--bronz` → **YAZI ve İNCE ÇİZGİ**: kicker, numara, vurgulu kelime, kenarlık, odak halkası (≈ 4,7:1).

Yeni bir vurgu eklenirken önce şu sorulur: "Bu bir dolgu mu, yoksa okunacak bir şey mi?" Cevap "okunacak"sa
bronz kullanılır. Koyu temada tek bir şampanya yetiyordu; aydınlık temada yetmez.

### 3.3 Oran (bozulursa his gider)

```
 ~%70  kaşmir (krem)          sayfanın gövdesi; boşluk da bu renktedir
 ~%15  antrasit               yazı ve başlık
 ~%10  gri                    alt metin
  ≤%5  şampanya / bronz       düğme, kicker, çizgi, tek vurgu kelimesi
```

Adaçayı bu orana girmez: sayfada **tek bir yerde** durur (iletişim bloğu). İkinci bir adaçayı blok açılmaz.

**Kural:** Şampanya dolgusu, gözün aynı anda gördüğü alanda **en fazla bir düğme**. Şampanya çoğalırsa
"altın kaplama" olur, lüks olmaz.

### 3.4 Okunabilirlik (karşıtlık)
Krem zeminde (`--kasmir-50`) hesaplanan karşıtlık oranları:
antrasit ≈ 15:1 · gri ≈ 6,0:1 · gri-soluk ≈ 4,4:1 · bronz ≈ 4,7:1.
Şampanya düğmenin üstündeki antrasit yazı ≈ 6,8:1.
**Şampanya yazı olarak kullanılmaz** (≈ 1,9:1); yalnızca dolgudur. Bronz ise yazı olarak kullanılabilir.
Uygulama aşamasında bu değerler araçla yeniden ölçülür (QA).

### 3.5 Koyu temadan geçiş (kod için harita)
`vitrin/stil.css` içindeki **takma adlar korunur**; yalnızca değerleri değişir. Böylece HTML'deki sınıflar ve
betikler hiç değişmeden çalışır:

| Değişken | Koyu tema (2026-09-18) | Aydınlık tema (2026-09-21) |
|---|---|---|
| `--zemin` | `#1B1E1C` (grafit-800) | `#F9F8F6` (kaşmir-50) |
| `--yuzey` | `#262A27` (grafit-700) | `#FFFFFF` (kaşmir-0) |
| `--yuzey-ust` | `#343936` (grafit-600) | `#F2F0EC` (kaşmir-100) |
| `--cizgi` | `rgba(200,180,138,0.14)` | `#E6E4E0` (kaşmir-200) |
| `--cizgi-koyu` | `rgba(200,180,138,0.28)` | `#D6D3CC` (kaşmir-300) |
| `--metin` | `#EFEAE0` (fildişi) | `#1C1C1A` (antrasit) |
| `--metin-soluk` | `#B9B3A6` (taş) | `#5E5E5B` (gri) |
| `--metin-cok-soluk` | `#8A857A` (taş-soluk) | `#757370` (gri-soluk) |
| `--sampanya` | `#C8B48A` (yazı + dolgu) | `#C3A77D` (**yalnızca dolgu**) |
| `--bronz` | `#9C7E4E` (yalnızca çizgi) | `#8A6D3B` (**yazı + çizgi**) |
| `--durum-iyi` / `--dikkat` / `--sorun` | `#7F9B6E` / `#C99A5B` / `#B4655A` | `#4F7343` / `#8F6415` / `#A03A30` |

Kaldırılanlar: `--grafit-*`, `--fildisi`, `--tas`, `--tas-soluk`, `--zeytin-700`, `--zeytin-500` (aydınlık temada
karşılığı yok) ve hiçbir yerde kullanılmayan `--koyu`, `--marka`, `--marka-soluk`, `--canli`, `--uyari`.
Eklenenler: `--kasmir-0…300`, `--zeytin-50`, `--zeytin-200`, `--antrasit`, `--gri`, `--gri-soluk`, `--cihaz`.

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
| Küçük | `0.875rem` | 1.5 | +0.01em | 400 sans, gri-soluk |
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
  düğmelerle hep aynı görünür alanda durur; dolu olsaydı ekranda iki şampanya olurdu (§3.3). Zemin krem (`--kasmir-50`);
  kaydırınca altına 1 px şampanya tonlu çizgi gelir. Cam/blur yok.

---

## 6. Yüzeyler

| Öğe | Kural |
|---|---|
| **Çizgi** | 1 px, `--cizgi` (`#E6E4E0`). Hover ve vurgu çizgisi `--cizgi-koyu` (`#D6D3CC`) ya da bronz; seçili yüzey dolgusu `rgba(195,167,125,0.16)`, düğme hover dolgusu `rgba(138,109,59,0.07)`. Çizgi çoğu yerde kartın tek sınırıdır; dolgu yerine çizgi tercih edilir. |
| **Köşe** | Kart 4 px · düğme ve form alanı 2 px · telefon mockup 36 px (gerçek telefon gibi). Hap (pill) düğme **yoktur**. |
| **Gölge** | Kartlarda yok. Sayfada **iki** yumuşak gölge vardır: telefon maketi `0 28px 64px rgba(28,28,26,0.13)` ve onun üstünde duran kumanda kartı `0 14px 30px rgba(28,28,26,0.14)`. Üçüncüsü eklenmez. |
| **Cam / blur** | **Yoktur.** Cam efekti önceki dile aitti; sakin lüks mat yüzeylerden yapılır. |
| **Degrade** | Yoktur. Aydınlık temada krem zemin tek düzlemdir; derinlik çizgiyle ve beyaz kartla verilir. |
| **Doku** | İsteğe bağlı: hero zemininde %3 opaklıkta ince grain (kum dokusu). Bundan fazlası "efekt" olur. |
| **Fotoğraf** | Klasik stok otel fotoğrafı **yoktur** (Genel Müdür kararı korunur). Ürün, kodla çizilmiş arayüz olarak gösterilir. |

---

## 7. Parçalar (bileşenler)

### 7.1 Düğmeler — üç tür, bir sayfada bir ana düğme
| Tür | Görünüm | Ne zaman |
|---|---|---|
| **Ana** | Şampanya zemin, **antrasit** yazı, 52 px yükseklik, 0 28 px iç boşluk, 2 px köşe, büyük harf. Hover: bronz zemin, beyaz yazı. | Sayfanın tek gerçek eylemi: "30 Gün Ücretsiz Dene" (hero, tarifede yalnızca Standart, kapanış) ve formun "Gönder"i |
| **İkincil** | Saydam zemin, 1 px **bronz** çizgi, antrasit yazı. Hover: `rgba(138,109,59,0.07)` zemin. | "Bilgi Al", "Teknik Destek Al", üst çubuktaki düğme, tarifedeki diğer üç satır |
| **Bağlantı** | Antrasit yazı, altında 1 px açık gri çizgi (4 px aşağıda). Hover: çizgi **bronz** olur. | Metin içi, alt bölüm, "Giriş yapın", hero'daki "Uygulamayı keşfet" |

Deneme düğmesinin metni **her yerde aynıdır**: "30 Gün Ücretsiz Dene" (Genel Müdür kararı). Tek istisna üst çubuk:
orada kısa "Demo İste" yazar ve aynı kayıt sayfasına gider (Genel Müdür, 2026-09-18). Hero'daki ana düğme
"Operasyon Merkezini Keşfet →" sayfanın içine çağırır; deneme kaydı hero'da sessiz bağlantıdadır.
Düğmelerde ikon ve emoji yoktur; "→" yalnızca "keşfet" düğmelerinde, metnin parçası olarak durur.

### 7.2 Kart
Beyaz zemin (`--kasmir-0`), 1 px çizgi, 4 px köşe, 32 px iç boşluk (telefon 24 px). İçinde: küçük işaret
→ h3 serif → bir paragraf gri. Hover'da yükselmez, parlamaz; yalnızca çizgi koyulaşır (300 ms).

### 7.3 Form (Giriş, Kayıt, İletişim)
- Alan: **beyaz** zemin, 1 px çizgi, 2 px köşe, 56 px yükseklik, antrasit yazı, gri-soluk placeholder.
- Etiket: küçük (0.75rem), büyük harf, +0.12em, gri; alanın **üstünde** (içinde değil).
- Odak (focus): çizgi **bronz** olur. Renkli parlama halkası (glow) **yoktur**.
- Hata: alan çizgisi `--durum-sorun`, altında bir satır kısık kırmızı yazı. Kutu sallanmaz, ekran kızarmaz.
- Düğme: ana düğme, tam genişlik (kapı ekranlarında).
- Kapı kutusu (giriş/kayıt kartı): en fazla 440 px, sayfa ortasında, arkasında krem zemin. Marka üstte küçük ve
  harf aralıklı; başlık serif ("Tekrar hoş geldiniz."); tek paragraf; form; altta tek bağlantı.

### 7.4 Kodla çizilen telefon (mockup)
Çerçeve `--cihaz` (`#23231F`) — sayfa yüzeyi değil, masadaki bir NESNEDİR, o yüzden koyu kalır. 36 px köşe,
kenarında ince bir ışık çizgisi (`rgba(255,255,255,0.08)`); **ekran beyazdır.** Böylece maket, personel
yazılımının gerçek aydınlık arayüzüyle (`app/src/stil.css`) aynı şeyi gösterir. Akış antrasit yazı, sayılar JetBrains Mono,
durumlar üç durum rengiyle. Telefon, hero'da sağ kenardan hafifçe taşar (önceki karar korunur).

### 7.5 Alt bölüm (footer)
Gömülü krem zemin (`--kasmir-100`). Üstte 1 px çizgi. Solda marka ve tek cümle; sağda sayfa listesi ile dört
yasal bağlantı. Sosyal ikon,
"Made with ♥", rozet **yoktur**.

### 7.6 Dijital check-up panosu ve canlı akış
Veri tek renkle çizilir (antrasit çubuk, açık gri iz); bronz yalnızca toplam skor halkasında. Durum renkleri yalnızca
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
10. Personel yazılımının **içine** bu dili taşımak.
11. **Şampanyayı yazı rengi olarak kullanmak** (§3.2.1) — aydınlık zeminde okunmaz; yazı vurgusu bronzdur.
12. Saf beyaz zemin (`#FFFFFF`) ya da saf siyah yazı (`#000000`) — ikisi de bu dile ait değildir.

---

## 11. Teslim öncesi kontrol listesi (UX ve QA ajanları için)

- [ ] Sayfada §3.2 dışında bir renk var mı? (Hex arama ile doğrulanır.)
- [ ] Görünür alanda birden fazla şampanya düğme var mı?
- [ ] Her h1/h2 serif ve 400–500 ağırlıkta mı? Hiçbir başlık 700 mü?
- [ ] Bölüm başlığı kalıbı (kicker → h2 → paragraf) her bölümde aynı mı?
- [ ] Paragraf genişliği 56ch'i aşıyor mu?
- [ ] Bölümler arası boşluk 96 px'in altına düşüyor mu?
- [ ] 320–1400 px arasında yatay taşma var mı? (Mevcut betikle denetlenir.)
- [ ] Yazı karşıtlığı 4.5:1'in altında bir yer var mı? (**Şampanya yazı olarak kullanılmış mı?** §3.2.1)
- [ ] `prefers-reduced-motion` ile hiçbir şey kıpırdamıyor mu? Betiksiz sayfa eksiksiz mi?
- [ ] Hizmet bölümleri hâlâ iletişime iniyor, demoya göndermiyor mu? (Genel Müdür kararı)
- [ ] Ana düğme metni her yerde "30 Gün Ücretsiz Dene" mi?
- [ ] Giriş ve Kayıt ekranları vitrinle aynı dilde mi; personel yazılımının içi dokunulmamış mı?

---

## 12. Bu belge nasıl değişir

Yeni bir renk, yazı ailesi ya da parça gerekiyorsa önce buraya yazılır, gerekçesi eklenir, Genel Müdür onaylar;
sonra kod değişir. Kodda olup burada olmayan bir şey hatadır.
