# 012 — Fiyat Şeffaflığı: Para Birimi, KDV ve Faturalandırma (denetim · Madde 4)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı (KDV oranı dahil).
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 4
> Kod: `vitrin/fiyatlandirma.html` (`.seffaflik`), `vitrin/stil.css`, `app/src/paketler.ts`

---

## Durum

Fiyatlar döviz cinsinden veriliyordu ama **hangi para birimi** olduğu, **verginin dahil olup olmadığı**
ve **faturanın nasıl kesileceği** hiçbir yerde yazmıyordu. Müşteri ne ödeyeceğini kesin olarak
hesaplayamıyor, bu belirsizlik satış görüşmesine itiraz olarak taşınıyordu.

Döviz cinsinden fiyatlandırma **bilinçli bir karardır ve korunur** — oteller zaten EUR/USD üzerinden
satış yapar. Sorun para biriminin kendisi değil, açıklanmamış olmasıydı.

## Ticari kurallar (Genel Müdür, 2026-09-21)

| Konu | Karar |
|---|---|
| Para birimi | **ABD doları (USD)** |
| KDV | Fiyatlara **dahil değildir**; yurt içi satışta faturaya **%20** eklenir |
| Faturalandırma | Fatura **TL** kesilir; **fatura tarihindeki TCMB döviz satış kuru** esas alınır |
| Ödeme dönemi | Aylık ya da yıllık; yıllıkta iki ay hediye |
| Ödeme yöntemi | Kredi kartı veya havale/EFT |
| Taahhüt | **Yok** |
| İptal | İstenildiği an; hizmet **ödenmiş dönemin sonuna kadar** sürer, kalan gün için ek ücret alınmaz |
| 75 oda üstü | 76–150 **Büyük** paketi; 150+ ya da özel ihtiyaç **özel kurumsal teklif** |

## Uygulama

- Fiyat kartlarında para birimi artık **yazılı**: `$29 USD / ay`. Sembol tek başına bırakılmadı;
  USD ile EUR karıştırılamaz.
- Tarifenin hemen altına **şeffaflık bloğu** eklendi: altı satır (para birimi · KDV · faturalandırma ·
  ödeme · taahhüt ve iptal · büyük oteller). Denetimin şartı gereği **küçük punto değil**: blok
  tarifenin devamı gibi, sayfanın gövde ölçüsünde okunur.
- Sık sorulanlardaki iptal cevabı bu kurallarla eşitlendi.
- `app/src/paketler.ts` de güncellendi: ödeme duvarında da `$29 USD / ay` yazıyor ve yıllık vurgusu
  para birimini söylüyor. Vitrinle personel yazılımının **aynı sözü vermesi zorunludur**; rakam ve
  koşul iki yerde yazılıdır. 139 test geçiyor.

## Kurumsal düğmesi artık İletişim sayfasına gidiyor

Kurumsal paketin düğmesi "Görüşme ayarla" adıyla doğrudan `mailto:` adresine gidiyordu. O karar
(`v1-1-notlari` · B4) **iletişim formu henüz yokken** alınmıştı. Form geldikten sonra sitedeki tek
huni İletişim sayfasıdır; şeffaflık bloğundaki "özel kurumsal teklif" bağlantısı da oraya gider.
İki farklı hedef karışıklık yaratırdı. Düğme artık **"Teklif Alın" → `/iletisim`**.
E-posta ile yazmak isteyen için adres İletişim sayfasında zaten duruyor.

## KDV oranı: %20 (Genel Müdür onayı alındı, 2026-09-21)

Denetim, "yurt içi satışta geçerli KDV oranı **ayrıca belirtilmeli**" diyor. İlk yazımda oran
konmamıştı: canlı bir fiyat sayfasına yanlış ya da güncelliğini yitirmiş bir vergi oranı yazmak ticari
ve hukuki risktir ve oranı Genel Müdür henüz vermemişti. **Onay aynı gün geldi:** blok artık
"Fiyatlara KDV dahil değildir. Yurt içi satışlarda faturaya **%20 KDV** eklenir." diyor.

Oran değişirse **tek yerde** değişir: bu satır. Personel yazılımındaki ödeme duvarı oran yazmaz,
yalnızca "KDV dahil değildir" der; ikisi çelişmez.

## Denetimin bir tespiti eksikti: 75 oda üstü zaten vardı

Rapor "mevcut paketler 75 odada bitiyor, büyük otel *bana ne oluyor?* sorusuyla kalıyor" diyor.
Sayfada **Büyük (76–150, $99)** ve **Kurumsal (150+, özel teklif)** paketleri zaten vardı; denetim
aracı sayfanın tamamını okumamış görünüyor. Yine de maddenin ruhu uygulandı: şeffaflık bloğuna
"büyük oteller" satırı kondu ve özel teklif yolu açıkça gösterildi. Var olan paketlerle çelişen
bir "75 oda üstü için teklif alın" cümlesi **yazılmadı**; yazılsaydı hemen üstündeki Büyük paketi
yalanlardı.

## Sonraki maddeye bırakılan

Fiyatın `Product` + `Offer` yapılandırılmış verisiyle işaretlenmesi denetimde **Madde 8** ile birlikte
yapılacak şekilde tanımlanmış; bu adımda yapılmadı. `priceCurrency` değeri `USD` olacak ve sayfada
görünen bilgiyle birebir tutacak.

## Bozulmayanlar

- Dört paketin adı, oda aralığı ve rakamı değişmedi; `app/src/paketler.ts` ile birebir aynı.
- Fiyat sayfası 320–1400 px arası yedi genişlikte taşma yapmıyor.
- Aydınlık tema, temiz adresler, CSP ve üçüncü parti isteksizlik aynı. Eklenen ağırlık: HTML ~1,6 KB, CSS ~1 KB.
