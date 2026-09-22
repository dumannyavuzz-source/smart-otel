# 019 — Kaydırınca Beliren Bölümler: İçerik Betiğe Emanet Edilmez (denetim · Madde 11)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Uygulandı ve ölçülerek doğrulandı.
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 11
> Kod: `vitrin/etkilesim.js` (· 1 ve 3), `vitrin/stil.css` (`@media print`)

---

## Durum

Denetim ölçüm anında **opaklığı 0,15'in altında ve 20 karakterden uzun yedi öğe** buldu. Tam sayfa
ekran görüntüsünde bölümler arası büyük boş alanlar bu yüzden oluşuyordu.

Ölçüm tekrarlandı ve doğrulandı: `/ic-operasyon` sayfasında dört hikâye adımı ve üç operasyon bloğu,
yani tam **yedi blok**, sayfa açıldığında görünmez durumda bekliyordu.

Bu tek başına bir hata değil — kaydırınca beliren bir animasyonun doğası bu. Asıl risk şuydu:
gizleme sınıfı eklendikten **sonra** gözcü (IntersectionObserver) herhangi bir sebeple çalışmazsa
o yedi blok kalıcı olarak görünmez kalır. Yazdırmada ve tam sayfa görüntüsünde de boş çıkıyorlardı.

## Karar

İçerik hiçbir koşulda betiğe emanet edilmez. **Dört katmanlı koruma** kuruldu; biri tutmazsa
diğeri tutar.

### 1. Gizlemeyi betik yapar (zaten vardı, korundu)
Gizleme sınıfını (`js-hikaye`, `js-operasyon`, `js-pano`) HTML değil betik ekler. Betik hiç
yüklenmezse hiçbir şey gizlenmez; sayfa eksiksiz görünür. Ters kurgu (HTML'de gizle, betikle aç)
betiksiz ziyaretçiye boş sayfa gösterirdi.

### 2. Ekranda olan hiçbir şey gizlenmez (yeni)
Kurulum anında görüş alanında olan bloklar **hiç gizlenmez**, doğrudan açık işaretlenir. Yalnızca
aşağıda kalanlar beklemeye alınır. Böylece sayfanın ilk ekranı hiçbir zaman gözcüye bağımlı olmaz
ve açılışta bir "yanıp sönme" yaşanmaz.

### 3. Kurulum hata verirse gizleme geri alınır (yeni)
Sınıf ekleme ile gözcüye kayıt arasında bir hata olursa içerik gizli kalırdı. Kurulum artık
`try/catch` içindedir ve hata hâlinde gizleme sınıfı geri alınır.

### 4. Gözcü hiç çalışmazsa üç saniye sonra her şey açılır (yeni)
IntersectionObserver normalde ilk çağrısını hemen yapar — kesişmeyen öğeler için bile. Üç saniye
geçtiği hâlde bir kez bile çalışmadıysa ortada bir terslik var demektir; o durumda gizli kalan ne
varsa açılır.

Güvenlik ağı **"üç saniye sonra hepsini aç"** değildir. Gözcü sağlıklıysa hiçbir şey yapmaz ve
animasyon olduğu gibi kalır; yalnızca gözcünün ölü olduğu durumda devreye girer.

## Yazdırma

Kâğıtta "kaydırma" diye bir şey yoktur. İki yerden birden çözüldü:

- **Betik:** `beforeprint` olayında ve `print` medya sorgusu etkinleştiğinde gizli kalan her şey açılır.
- **CSS:** `@media print` bloğu gizlemeyi `!important` ile geri alır. Betik çalışmasa da kâğıda boş
  bölüm basılmaz.

Aynı kural sayfa okuyucu kiplerinde ve tam sayfa ekran görüntüsünde de işe yarar. Ayrıca kâğıtta
işe yaramayan parçalar (üst çubuk, "içeriğe atla", kapılar, bölüm çağrıları) basılmaz.

## Hareket istemeyen kullanıcı

`prefers-reduced-motion: reduce` seçiliyse gözcü **hiç kurulmaz**; dolayısıyla hiçbir şey gizlenmez
ve hiçbir şey kıpırdamaz. Bu davranış önceden de vardı, doğrulandı.

## Denendi ve doğrulandı

Ölçüm tarayıcıda yapıldı. **Bir yöntem dersi:** ilk denemelerde CSS geçişleri sanal zamanda
ilerlemediği için sınıf eklendiği hâlde opaklık 0 okunuyordu — ölçüm yanlış, kod doğruydu.
Testte geçişler kapatılarak son durum ölçüldü.

| Ne denendi | Sonuç |
|---|---|
| Açılışta, kaydırılmadan | 7 blok beklemede (animasyonun doğası) |
| Güvenlik ağı çalışınca | **0 gizli / 7 açık** — hiçbir bölüm gizli kalmıyor |
| Uzun görüntü alanı (2600 px) | 3 blok açık, 4 beklemede; **ekranda olup gizlenen: 0** |
| Bozulmama | 8 sayfa × 8 genişlik (320–1400 px): taşma yok, üst çubuk çakışması yok |

## Bozulmayanlar

- Kaydırınca beliren animasyon aynen duruyor; güvenlik ağı sağlıklı durumda hiç devreye girmiyor.
- Erişilebilirlik tabanları (Madde 10), mobil menü (Madde 6), aydınlık tema ve CSP aynı.
- Yeni bağımlılık yok; eklenen kod birkaç düzine satır.
