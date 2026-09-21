# 015 — CTA Adlandırma Birliği ve "Demo" Sözcüğünün Kaldırılması (denetim · Madde 7)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı ve yerelde doğrulandı.
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 7
> Kod: on bir sayfanın üst çubuğu ve hero'su, `vitrin/stil.css`

---

## Durum

Aynı hedef (`app.oteldijital.com/kayit`) için üç farklı vaat kullanılıyordu:
üst çubukta **"Demo İste"**, hero'da ikincil konumda **"30 Gün Ücretsiz Dene"**, hero'nun birincil
düğmesinde ise yalnızca sayfayı aşağı kaydıran **"Operasyon Merkezini Tanıyın →"**.

İki sorun: "demo" bekleyen ziyaretçi kayıt formuyla karşılaşınca güven kırılıyordu; ve en güçlü
teklif — 30 gün, kredi kartsız, taahhütsüz — sayfanın en görünür düğmesi değildi.

## Karar

### 1. "Demo" sözcüğü siteden tamamen kalktı
Genel Müdür: *"Ortada takvim üzerinden ilerleyen canlı bir demo akışımız olmadığı için 'Demo'
kelimesini siteden tamamen kaldıralım."* Sözcük artık hiçbir sayfada geçmiyor — görünen metinde de,
HTML yorumlarında da. (Madde 3'te öğrenildiği gibi yorum da yanıt gövdesinin parçasıdır.)

### 2. Tek isim politikası
| Konum | Eski | Yeni |
|---|---|---|
| Üst çubuk (on bir sayfa) | "Demo İste" | **"30 Gün Ücretsiz Dene"** → `/kayit` |
| Hero birincil düğme | "Operasyon Merkezini Tanıyın →" (sayfa içi) | **"30 Gün Ücretsiz Dene"** → `/kayit` |
| Hero ikincil çağrı | "30 Gün Ücretsiz Dene" (sessiz bağlantı) | **"Nasıl çalışır?"** → `#dongu` (sessiz bağlantı) |
| Kapanış ikincil çağrı | "Önce fiyatlara bakayım" | **"Fiyatları Gör"** |

Risk azaltıcı satır ("Kredi kartı yok · Taahhüt yok · 30 gün boyunca tüm özellikler") korundu;
denetim onun iyi çalıştığını söylüyor.

### 3. Hizmet sayfalarının birincil çağrısı DEĞİŞMEDİ
Dijital Vitrin ve Teknolojik Altyapı sayfalarında birincil düğme hâlâ **"Bilgi Al"** ve
**"Teknik Destek Al"**; ikisi de `/iletisim` sayfasına gider.

Denetim "birincil CTA her yerde 30 Gün Ücretsiz Dene olsun" diyor ama bu, Genel Müdür'ün duran bir
kararıyla çelişir: **hizmet bölümleri deneme kaydına zorlamaz.** Bu hizmetler danışmanlık ve kurulum
işidir; kayıt sayfasına gönderilen ziyaretçi yanlış yere düşer. Uygulanan şey maddenin asıl derdidir:
**sayfa başına tek birincil çağrı, tek vaat, ikincil çağrı sessiz biçimde.** Hangi çağrı olduğu
sayfanın konusuna göre değişir; adı sayfa içinde tutarlıdır.

## Dar ekranda metin nasıl korunuyor?

Uzun metin üst çubuğu iki yerde zorladı. İkisi de ölçülerek çözüldü; **vaat hiçbir yerde
değişmedi**, yalnızca önek gizlendi:

| Genişlik | Ne oluyor | Neden |
|---|---|---|
| ≤ 620 px | Menü düğmesinin "Menü" yazısı ekrandan çekilir (üç çizgi kalır) | Marka ile menü üst üste biniyordu. Yazı silinmez, ekran okuyucu yine "Menü" okur |
| ≤ 1240 px | **Üst çubuktaki** düğmede "30 Gün" öneki gizlenir → "Ücretsiz Dene" | Beş sözcüklük menüyle birlikte sığmıyordu (ölçüldü: 1000 px'te +13, 1150 px'te +39 piksel taşma) |

Önek yalnızca üst çubukta gizlenir. Sayfaların içindeki bütün düğmelerde metin her genişlikte
tam hâliyle durur. Ayrıca önek ile devamı **aynı esnek öğenin içindedir**: ayrı olsalardı aralarına
düğmenin 10 piksellik boşluğu girip "30 GÜN  ÜCRETSİZ DENE" diye çift boşluklu görünürdü.

## Denendi ve doğrulandı

Yedi sayfa × on iki genişlik (320–1400 px), iframe içinde ölçüldü:

- Yatay taşma yok.
- Üst çubukta marka, menü düğmesi ve eylem düğmesi **hiçbir genişlikte üst üste binmiyor**
  (bu denetim bu maddede eklendi; ilk denemede 320 px'te marka ile menü çakışmıştı, ölçüm yakaladı).
- Üst çubuk düğmesi hiçbir genişlikte iki satıra kırılmıyor.
- Sitede "demo" sözcüğü geçmiyor.

## Bozulmayanlar

- Hedefler aynı: üst çubuk ve hero düğmesi `/kayit`, hizmet sayfaları `/iletisim`.
- Mobil menü (Madde 6), aydınlık tema, temiz adresler, CSP aynı.
- `app/src/paketler.ts` ile vitrin arasındaki fiyat sözü aynı.
