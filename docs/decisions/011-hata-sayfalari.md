# 011 — Markalı Hata Sayfaları (denetim · Madde 3)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı. Yayından sonra doğrulanacak tek şey var: `docs/deployment-checklist.md` · 6.12
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 3
> Kod: `vitrin/404.html`, `vitrin/500.html`, `vitrin/stil.css` (`.hata`), `araclar/sunucu.js`

---

## Durum

Olmayan bir adres istendiğinde barındırma sağlayıcısının 79 baytlık ham düz metni dönüyordu.
İki sorun vardı: yanlış bağlantıya basan ziyaretçi terk edilmiş bir hata ekranı görüyor ve marka
algısı anında düşüyordu; ayrıca yanıtın içinde sunucu bölgesi ve istek kimliği gibi hiç gerekmeyen
teknik bilgiler ziyaretçiye sızıyordu.

## Karar

Sitenin kendi diliyle yazılmış iki hata sayfası eklendi. İkisi de diğer sayfalarla aynı üst çubuğu,
alt bölümü ve aydınlık temayı kullanır; içerik ekranın ortasında tek bir blok olarak durur
(`.hata`, yasal sayfalarla aynı düzen).

| Sayfa | Başlık | Çıkışlar |
|---|---|---|
| `404.html` | "Aradığınız sayfa bulunamadı." | **Ana Sayfaya Dön** · **Fiyatları Gör** · e-posta |
| `500.html` | "Bir şeyler ters gitti." | **Ana Sayfaya Dön** · **Bize Yazın** · e-posta |

## Bu işin iki tuzağı vardı

### 1. Varlık yolları kök adresli olmak zorunda
404 sayfası **herhangi bir adreste** açılabilir — örneğin `/bir/iki/olmayan-sayfa`. Stil dosyası
diğer sayfalardaki gibi göreli yazılsaydı (`stil.css`), tarayıcı onu `/bir/iki/stil.css` adresinde
arar, bulamaz ve ziyaretçi çıplak bir HTML görürdü. Bu yüzden hata sayfalarında **bütün** varlık
yolları kök adreslidir: `/stil.css`, `/simge.svg`, `/etkilesim.js`. Diğer sayfalarda göreli yol
sorun değildir; burada sorundur.

### 2. Eski hata metni örnek olarak bile yazılmaz
Denetimin kabul kriteri "yanıt gövdesinde o ifadeler geçmesin" diyor. HTML yorumu da gövdenin
parçasıdır: sayfanın başındaki açıklamaya eski sağlayıcı metnini alıntılamak kriteri ihlal eder.
İlk denemede bu hataya düştüm, yerel denetim yakaladı. Yorum, ifadeleri tekrarlamadan yazıldı.

## Yerel sunucu da artık aynı davranıyor

`araclar/sunucu.js` bulunamayan adreste boş bir 404 dönüyordu. Artık `404.html` dosyasını
`text/html` olarak ve **HTTP 404 durumuyla** döndürüyor. Böylece bilgisayardaki önizleme ile
yayındaki davranış aynı; hata sayfası yayına çıkmadan denenebiliyor.

## 500 sayfası hakkında dürüst not

Vitrin tamamen durağan dosyalardan oluşur; kendi başına 500 üretmez. Gerçek bir 500 barındırma
katmanından gelir ve o katmanın bu dosyayı kullanıp kullanmayacağı **yayından önce doğrulanamaz.**
Dosya yine de duruyor: maliyeti birkaç kilobayt, karşılığı ise ileride sunucu tarafı bir parça
eklenirse hata sayfasının markasız kalmaması. Doğrulama dağıtım listesine madde olarak eklendi.

## Denendi ve doğrulandı (yerelde)

- `/bir/iki/olmayan-sayfa` → **HTTP 404**, `text/html; charset=utf-8`, markalı sayfa.
  Sahte 200 ("soft-404") üretilmiyor.
- Yanıt gövdesinde sunucu bölgesi, istek kimliği ya da yığın izi geçmiyor (arama ile doğrulandı).
- Derin adreste stil ve betik yolları kök adresli olduğu için sayfa tam biçimli açılıyor.
- Gerçek sayfalar hâlâ 200 dönüyor; `/`, `/fiyatlandirma`, `/kvkk`, `/stil.css` denendi.
- İki hata sayfası da 320–1400 px arası yedi genişlikte yatay taşma yapmıyor.
- Hata sayfaları `noindex, follow` etiketli ve `sitemap.xml` dışında.

## Yayından sonra doğrulanacak

`cleanUrls: true` ayarı `/404.html` isteğini uzantısız adrese yönlendirir. Vercel'in durağan
sitelerde `404.html` dosyasını bulunamayan adresler için kullanma davranışının bu ayarla birlikte
de sürdüğü canlıda görülmelidir (dağıtım listesi · 6.12). Sürmezse çözüm `vercel.json` içine bir
`routes`/`rewrites` kuralı eklemektir — ancak **rewrite 200 döndürür**, yani soft-404 üretir;
o yüzden ilk tercih her zaman sağlayıcının kendi 404 davranışıdır.
