# 009 — Aydınlık Premium Tema: Koyu Zeminden Kaşmir Kreme

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı. Canlıya alma `docs/deployment-checklist.md` · 6 ile yapılır.
> **İlişki:** `007-sakin-luks-gorsel-dili.md` yürürlükte kalır — "Sakin Lüks" dili aynen sürüyor.
> Yalnızca o karardaki **koyu zemin** varsayımı düşer. `008-vitrin-sayfa-mimarisi.md` etkilenmez.
> Kural belgesi: `DESIGN_SYSTEM.md` (proje kökü)
> Kod: `vitrin/stil.css`, `vitrin/paylasim.html` → `paylasim.png`, `vitrin/simge.svg`,
> `vitrin/dokunma-simgesi.png`, `araclar/dokunma-simgesi-uret.js`, beş sayfanın `theme-color` etiketi

---

## Durum

Vitrin mat grafit (koyu) zeminliydi. Genel Müdür yönü değiştirdi: OtelDijital kurumsal otel yöneticilerine
satılıyor ve **aydınlık bir sayfa daha ferah, daha kurumsal ve daha premium** duruyor.

Karar, dili değil **temayı** değiştirir. "Sakin Lüks" aynen sürer.

## Karar

### 1. Yeni palet (Genel Müdür'ün verdiği tonlar)

| Rol | Değer |
|---|---|
| Ana zemin | `#F9F8F6` — saf beyaz değil, uçuk krem/kaşmir |
| Ana metin ve başlık | `#1C1C1A` — saf siyah değil, derin antrasit |
| Alt metin | `#5E5E5B` — yumuşak, okunaklı gri |
| Vurgu ve düğme | `#C3A77D` — mat, zarif şampanya |
| Çizgi ve kenarlık | `#E6E4E0` — belli belirsiz açık gri/krem |

Ara tonlar bu beşinden türetildi: `#FFFFFF` (kart ve form alanı), `#F2F0EC` (gömülü yüzey: alt bölüm, pano
özeti), `#D6D3CC` (koyu çizgi), `#757370` (dipnot). Tamamı `DESIGN_SYSTEM.md` · 3.2'de.

### 2. Şampanya ikiye ayrıldı: dolgu ve yazı
Bu kararın en önemli teknik sonucu budur. Açık şampanya (`#C3A77D`) krem zeminde **yazı olarak okunmaz**:
karşıtlık ≈ 1,9:1, erişilebilirlik eşiğinin (4,5:1) çok altında. Koyu temada aynı renk hem düğme zemini hem
kicker yazısıydı; aydınlık temada bu mümkün değil. Bu yüzden:

- `--sampanya` `#C3A77D` → **yalnızca DOLGU**: ana düğmenin zemini. Üstündeki yazı antrasittir (≈ 6,8:1).
- `--bronz` `#8A6D3B` → **YAZI ve İNCE ÇİZGİ**: kicker, numara, vurgu kelimesi, kenarlık, odak halkası (≈ 4,7:1).

Yeni bir vurgu eklenirken sorulacak soru: "Bu bir dolgu mu, okunacak bir şey mi?"

### 3. Düğmenin üstündeki yazı antrasit
Genel Müdür "antrasit veya beyaz olabilir, kontrastı en şık duracak şekilde ayarla" dedi.
Şampanya üstünde antrasit ≈ 6,8:1, beyaz ≈ 1,9:1. Antrasit hem okunaklı hem sakin durduğu için o seçildi.
Düğmenin hover hâli bronz zemin + beyaz yazıdır.

### 4. Durum renkleri koyulaştırıldı
Koyu zemin için ayarlanmış mat yeşil/amber/kırmızı, krem zeminde soluk kalıyordu:
`#7F9B6E → #4F7343` · `#C99A5B → #8F6415` · `#B4655A → #A03A30`. Hepsi hâlâ mat ve kısıktır.

### 5. Telefon maketi neden koyu kaldı?
Sayfadaki telefon çerçevesi (`--cihaz` `#23231F`) koyu kalır, **ekranı beyaz oldu.** Gerekçe iki tane:

1. Telefon bir sayfa yüzeyi değil, masanın üstündeki bir **nesnedir**. Gerçek telefonların çerçevesi koyudur;
   koyu çerçeve, içindeki aydınlık ekranı öne çıkarır.
2. **Daha dürüst oldu.** Personel yazılımının gerçek arayüzü zaten aydınlıktır (`app/src/stil.css`:
   zemin `#f4f6f8`, kart `#ffffff`, yazı `#1b1b1b`). Koyu maket, ürünü olduğundan farklı gösteriyordu.
   Artık vitrindeki ekran ile personelin telefonunda gördüğü ekran aynı ailedendir.

### 6. Sekme ve ana ekran simgesi koyu kaldı
`simge.svg` ve `dokunma-simgesi.png` koyu plaka üstünde şampanya kare olarak kalır (yalnızca şampanya tonu
`#C8B48A → #C3A77D` güncellendi). Krem bir simge, tarayıcının açık renkli sekme çubuğunda kaybolurdu.

### 7. Paylaşım kartı yeniden üretildi
`paylasim.html` aydınlık temaya çevrildi ve `paylasim.png` yeniden çizildi. Aksi hâlde bağlantı paylaşılınca
koyu bir kart, tıklanınca aydınlık bir site çıkardı.

## Değişmeyenler

- **Tipografi:** Cormorant Garamond (başlık) + Inter (gövde) + JetBrains Mono (veri). Ağırlıklar, ölçek, satır
  yüksekliği ve harf aralığı aynı.
- **Düzen:** zikzak iç operasyon blokları, hikâye adımları, keşif alanı, hizmet listeleri, tarife satırları,
  beş sayfalık mimari — hiçbiri değişmedi.
- **Boşluk ve ızgara:** bölüm boşlukları, `.kolon` genişliği, kırılma noktaları aynı.
- **Hareket:** kaydırınca beliren bloklar, `prefers-reduced-motion` davranışı aynı.
- **Kurallar:** fotoğraf yok, cam/blur yok, hap düğme yok, ekranda tek ana düğme.
- **HTML ve betikler:** tek bir sınıf adı değişmedi. Değişken **takma adları** (`--zemin`, `--yuzey`, `--metin`,
  `--cizgi`…) korunduğu için geçiş, ağırlıklı olarak bir değer değişimi oldu.

## Yol boyunca düzeltilen bir hata

`stil.css` içinde emoji ikonları tek renge çeken kural ikiye bölünmüştü: yorum `.olay-ikon`'un başına yapışmış,
süzgeç yalnızca `.mini-ikon`'a uygulanıyordu. Koyu zeminde fark edilmiyordu; aydınlık ekranda renkli emoji göze
battığı için kural yeniden birleştirildi ve `.mini-oda` kendi kuralına ayrıldı.

## Denendi ve doğrulandı

- Beş sayfa da 320 · 375 · 414 · 768 · 900 · 1024 · 1400 px genişliklerde yatay taşma yapmıyor.
- Sayfalarda `DESIGN_SYSTEM.md` · 3.2 dışında renk kalmadı (eski değişken adları için arama yapıldı, sonuç boş).
- Şampanya hiçbir yerde yazı rengi değil; yalnızca iki dolgu olarak duruyor (ana düğme ve "içeriğe atla" kutusu).
- Paylaşım kartı, simge ve `theme-color` etiketi yeni temayla uyumlu.
