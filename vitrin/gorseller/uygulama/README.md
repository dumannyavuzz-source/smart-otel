# Uygulama ekran görüntüleri

Bu klasör, sitedeki **tek gerçek görsel** kaynağıdır (denetim · Madde 1). Sayfalardaki telefon
maketleri kodla çizilmiştir; buradaki dosyalar onların yerine değil, **yanında** durur.

## Bugünkü durum: sekiz dosya da GEÇİCİ yer tutucudur

Klasördeki dosyalar bugün gerçek ekran görüntüsü değildir: grafit zemin üstünde şampanya bir blok,
780 × 1688 ölçüsünde. Tek işleri sayfadaki `<picture>` etiketlerinin **kırık görsel vermeden**
çalışmasıdır. Üreten betik: `araclar/gecici-gorsel-uret.js`.

**Gerçek görüntüler geldiğinde yapılacak tek şey, dosyaları aynı adlarla üzerine yazmaktır.**
HTML'e, CSS'e ya da başka bir yere dokunmak gerekmez.

## Sekiz dosya

Her ekran için **iki** dosya gerekir — aynı ad, iki uzantı:

| Ad | Ne gösterir |
|---|---|
| `kat-gorevlisi` | Kat görevlisinin üç butonlu ekranı |
| `kumanda` | Müdürün kumanda ekranı |
| `is-emri` | İş emri / zaman çizelgesi |
| `teslim` | Teslim ve uyuşmazlık ekranı |

Yani: `kat-gorevlisi.avif` + `kat-gorevlisi.webp`, `kumanda.avif` + `kumanda.webp` …

## Neden iki uzantı? (`<picture>` kuralı)

`<picture>` etiketi, tarayıcının **desteklediği ilk** kaynağı seçer. Seçtiği dosya sunucuda yoksa
**bir alttakine düşmez** — kırık görsel çıkar. Bu yüzden AVIF koyulduysa WebP de koyulmak
zorundadır; yedek, dosya eksikliği için değil, **eski tarayıcı** içindir.

AVIF'i Safari yalnızca 16.4 ve sonrasında tanır. Daha eski bir iPad'den bakan otel müdürü WebP
görür. İkisi de yoksa hiçbir şey görmez.

**Bu yüzden bir denetim vardır:** `node araclar/kaynak-notu-taramasi.js` sayfada adı geçen her
dosyanın yerinde olduğuna ve uzantısının içeriğiyle uyuştuğuna bakar. Bir WebP dosyasının adını
`.avif` yapmak da kırık görsel demektir; betik bunu da yakalar.

## Ölçü ve ağırlık

- Oran **780 × 1688** (telefon). HTML'de `width`/`height` bu değerlerle yazılıdır ve CSS
  `height: auto` der; oran bu ikisinden hesaplandığı için görsel indiğinde sayfa **zıplamaz**.
  Başka orandaki bir dosya koyarsanız görsel gerilir — bu ölçüye sadık kalın.
- Hero'ya yakın duran görsel **250 KB'ı geçmemeli** (denetimin ölçütü).
- Görselde gerçek otel ya da kişi bilgisi varsa **anonimleştirilir**; sayfadaki altyazı zaten
  "otel adı ve kişi adları örnektir" der.

## Gerçek görüntüler nasıl alınır?

`araclar/ekran-goruntusu-al.js` uygulamanın kendisinden telefon ölçüsünde görüntü alır ve WebP'ye
çevirir (ayrıntı: `vitrin/README.md` · "Ürün ekran görüntüleri"). AVIF'i bu bilgisayarda üretecek
bir araç **yoktur** (ffmpeg, ImageMagick, avifenc kurulu değil; tarayıcı da AVIF yazamaz), bu
yüzden AVIF dosyaları dışarıda üretilip klasöre konur.

## Dosyaları koyduktan sonra

```bash
node araclar/kaynak-notu-taramasi.js     # sekiz dosya yerinde ve doğru biçimde mi?
```

Sonrası dağıtım listesinde: `docs/deployment-checklist.md` · 6.22.
