# Gerçek uygulama ekran görüntüleri

Bu klasör, sitedeki **tek gerçek görsel** kaynağıdır (denetim · Madde 1). Sayfalardaki telefon
maketleri kodla çizilmiştir; buradaki dosyalar onların yerine değil, **yanında** durur.

## Beklenen dosyalar

Her ekran için **iki** dosya gerekir — aynı ad, iki uzantı:

| Ad | Ne gösterir |
|---|---|
| `kumanda` | Müdürün kumanda ekranı |
| `kat-gorevlisi` | Kat görevlisinin üç butonlu ekranı |
| `is-emri` | İş emri / zaman çizelgesi |
| `teslim` | Teslim ve uyuşmazlık ekranı |

Yani sekiz dosya: `kumanda.avif` + `kumanda.webp`, `kat-gorevlisi.avif` + `kat-gorevlisi.webp` …

## Neden iki uzantı? (`<picture>` kuralı)

`<picture>` etiketi, tarayıcının **desteklediği ilk** kaynağı seçer. Seçtiği dosya sunucuda yoksa
**bir alttakine düşmez** — kırık görsel çıkar. Bu yüzden AVIF koyulduysa WebP de koyulmak
zorundadır; yedek, dosya eksikliği için değil, **eski tarayıcı** içindir.

AVIF'i Safari yalnızca 16.4 ve sonrasında tanır. Daha eski bir iPad'den bakan otel müdürü WebP
görür. İkisi de yoksa hiçbir şey görmez.

## Ölçü ve ağırlık

- Oran **780 × 1688** (telefon). Sayfadaki yer tutucular da bu orandadır; görsel geldiğinde düzen
  **zıplamaz**.
- Hero'ya yakın duran görsel **250 KB'ı geçmemeli** (denetimin ölçütü).
- Görselde gerçek otel ya da kişi bilgisi varsa **anonimleştirilir** ve altyazısında belirtilir.

## Dosyalar geldiğinde ne yapılır?

1. Sekiz dosya bu klasöre konur.
2. `vitrin/index.html` ve `vitrin/ic-operasyon.html` içindeki `.ekran-kart` bloklarında:
   yorum içindeki `<picture>` bloğunun yorumu kaldırılır, altındaki `.gorsel-yer` yer tutucusu silinir.
3. `alt` metinleri gözden geçirilir: görselde ne yazıyorsa onu anlatmalıdır.
4. Sayfa ağırlığı ve LCP yeniden ölçülür (dağıtım listesi · 6.22).

Elde yalnızca AVIF varsa WebP kopyaları tarayıcının kendi kodlayıcısıyla üretilebilir; yeni bir
araç kurmak gerekmez (paylaşım kartı da böyle üretiliyor — `vitrin/README.md`).
