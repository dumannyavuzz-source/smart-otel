# 008 — Vitrin Sayfa Mimarisi: Tek Sayfadan Beş Sayfaya

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı. Canlıya alma `docs/deployment-checklist.md` · 6 ile yapılır.
> **Değiştirdiği karar:** `007-sakin-luks-gorsel-dili.md` yürürlükte kalır; yalnızca "tek sayfa" varsayımı düşer.
> Kod: `vitrin/index.html`, `vitrin/dijital-vitrin.html`, `vitrin/teknolojik-altyapi.html`,
> `vitrin/fiyatlandirma.html`, `vitrin/iletisim.html`, `vitrin/stil.css`, `vitrin/sitemap.xml`, `vitrin/robots.txt`

---

## Durum

Vitrin tek bir uzun sayfaydı. O sayfada dört ayrı konu sırayla anlatılıyordu: iç operasyon merkezi,
dijital vitrin hizmetleri, fiyatlar ve teknolojik altyapı. Menüdeki sözcükler sayfa değil, o sayfanın
içindeki bölümlere inen çapalardı (`#dijital`, `#teknik`, `#fiyat`).

Bunun iki sorunu vardı:

1. **Ana ürün kayboluyordu.** OtelDijital'in ana ürünü iç operasyon merkezidir; ama sayfanın yarısından
   fazlası başka konuları anlatıyordu. Ziyaretçi "bu tam olarak ne yapıyor?" sorusunun cevabını
   bulamadan sayfanın sonuna geliyordu.
2. **Hiçbir konu derinleşemiyordu.** Sayfa uzamasın diye her hizmet birkaç satıra sıkıştırılmıştı.
   Bir konuyu ayrıntılandırmak, diğer üçünü de uzatma baskısı yaratıyordu.

## Karar

Vitrin **beş ayrı sayfaya** bölünür. Her sayfa yalnızca kendi konusunun uzmanıdır.

| Sayfa | Dosya | Neyi anlatır |
|---|---|---|
| İç Operasyon (ana sayfa) | `index.html` (adres: `/`) | **Yalnızca iç operasyon merkezini**, ayrıntısıyla |
| Dijital Vitrin | `dijital-vitrin.html` (adres: `/dijital-vitrin`) | Dijital check-up, OTA, channel manager, Google, web sitesi, itibar, SEO |
| Teknolojik Altyapı | `teknolojik-altyapi.html` (adres: `/teknolojik-altyapi`) | Wi-Fi, ağ, kamera, sunucu, NAS, kesintisiz güç |
| Fiyatlandırma | `fiyatlandirma.html` (adres: `/fiyatlandirma`) | Dört paket ve fiyatla ilgili sorular |
| İletişim | `iletisim.html` (adres: `/iletisim`) | Sitedeki **tek** form |

### En önemli kural
**Bir sayfa diğer hizmetleri yeniden anlatmaz.** Ana sayfada Dijital Vitrin ve Teknolojik Altyapı için
yalnızca birer cümle ve kendi sayfasına giden bir düğme vardır ("kapı"); hizmetin kendisi orada anlatılmaz.
Aynı kural her sayfanın sonundaki iki kapı için de geçerlidir.

### Ana sayfa neyin cevabını verir?
Genel Müdür'ün saydığı sorular ana sayfada şu bölümlerde cevaplanır:

| Soru | Bölüm |
|---|---|
| OtelDijital nedir? | `#nedir` |
| Hangi sorunları çözer? | `#sorunlar` (solda bugün, sağda OtelDijital ile) |
| Nasıl çalışır? | `#dongu` (bildir · ata · yap · tamamla) |
| Oda operasyonu, depo, arıza | `#operasyon` (üç zikzak blok) |
| Personel nasıl kullanır? · Müdür neleri görebilir? | `#kimler` |
| Görev, malzeme, temizlik ekranları | `#kesfet` (dokunmatik keşif) |
| Fire nasıl kontrol edilir? | `#urun` · 02 |
| Raporlama nasıl yapılır? | `#rapor` |

## Neden böyle?

- **Ana ürün öne çıkar.** Ana sayfanın tamamı iç operasyonu anlatır; ziyaretçi ürünü bir bakışta değil,
  gerçekten öğrenerek terk eder.
- **Her sayfa uzayabilir.** Dijital Vitrin'e yeni bir hizmet eklemek artık ana sayfayı uzatmaz.
- **Arama motoru için de doğru.** Her sayfanın kendi başlığı, kendi açıklaması ve kendi adresi vardır;
  "otel wi-fi kurulumu" arayan kişi doğrudan teknik altyapı sayfasına iner.
- **Form tek yerde durur.** Form beş sayfaya kopyalansaydı beş yerde bakım gerekirdi. Bütün "Bilgi Al" ve
  "Teknik Destek Al" düğmeleri İletişim sayfasına (`/iletisim`) gider.

## Marka dili: "uygulama" denmez

Genel Müdür 2026-09-21'de ikinci bir kararı daha verdi: **"'Uygulama' kelimesinden özellikle uzak duruyoruz."**
OtelDijital bir uygulama satıcısı değil, otelin **operasyon merkezi ve teknoloji partneridir**.

- Ana sayfanın başlığı ve bütün paylaşım etiketleri: **"OtelDijital | Otel Operasyon Merkezi ve Teknoloji Partneri"**.
- Ziyaretçinin gördüğü hiçbir metinde "uygulama" sözcüğü geçmez. Yerine duruma göre
  **"operasyon merkezi"**, **"iç operasyon"**, **"sistem"** veya **"ekranlar"** denir.
- Bu kural beş sayfanın tamamında uygulandı; yeni metin yazarken de geçerlidir.
- Depo içindeki teknik adlar (klasör `app/`, sınıf adları, `ayarlar.js` gibi) değişmez: kural
  **ziyaretçiye görünen dil** içindir. Depodaki yazılarda personel tarafı için "personel yazılımı" denir.

## Bunun getirdiği iki teknik zorunluluk

1. **Telefonda menü artık gizlenemez.** Tek sayfa varken menü dar ekranda gizleniyordu; aşağı kaydırmak
   yetiyordu. Beş sayfa olunca gizli menü ziyaretçiyi ana sayfaya hapsederdi. Üst çubuk dar ekranda
   **iki satıra** ayrılır: üstte marka ve "Demo İste", altta beş sayfa (yana kayabilen tek satır).
   Alt bölümde de bütün sayfalar listelenir; menü orada da bulunur.
2. **Bulunulan sayfa menüde belli olur.** Menüdeki bağlantıya `aria-current="page"` konur; altında ince
   bir şampanya çizgi belirir.

## Değişmeyenler

- Görsel dil "Sakin Lüks"tür ve `DESIGN_SYSTEM.md` tek kaynaktır (`007`).
- Beş sayfa **tek** `stil.css` ve **aynı üç betiği** kullanır. Betikler kendi öğelerini bulamazsa sessizce durur;
  bu yüzden her sayfada aynı üç satır durabilir.
- Fiyatlar personel yazılımındaki ödeme duvarıyla (`app/src/paketler.ts`) birebir aynı kalmak zorundadır.
- Sayfada fotoğraf yoktur; bütün görseller kodla çizilir.
- **Adresler uzantısızdır** ("temiz adres"): `oteldijital.com/dijital-vitrin`. Genel Müdür kararı (2026-09-21):
  ".html uzantısı markanın premium yapısına uygun değil." Yayında `vercel.json` içindeki `cleanUrls` bunu sağlar;
  bilgisayarda `araclar/sunucu.js` aynı davranışı taklit eder (uzantısız adres bulunamazsa sonuna `.html` ekleyip bakar).
  Sayfalardaki bağlantılar da uzantısız yazılır; dosya adları diskte `.html` olarak kalır.
  **Uyarı:** `vercel.json` bir JSON dosyasıdır ve yorum kabul etmez. Ayarın gerekçesini dosyanın içine
  `"//": "..."` anahtarıyla yazmak dağıtımı durdurur (*"should NOT have additional property"*); gerekçe
  `vitrin/README.md` ya da bu klasördeki karar kayıtlarına yazılır.

## Denendi ve doğrulandı

- Yatay taşma: beş sayfa da 320 · 375 · 414 · 768 · 900 · 1024 · 1400 px genişliklerde temiz
  (`araclar/tasma-denetimi.html` yöntemiyle, iframe içinde ölçüldü).
- Bütün sayfa içi çapalar (`#…`) kendi sayfalarında mevcuttur; eski tek sayfa çapaları kalmamıştır.

---

## Ek (2026-09-21): Dört yasal sayfa iskeleti

Alt bölümdeki yasal bağlantılar `#` adresine, yani boşluğa gidiyordu. Genel Müdür bunların
"boşluğa düşmemesini" istedi ve sayfaların **iskeletlerinin** şimdi açılmasına karar verdi;
metinler hukuk onayından sonra kendisi girecek.

| Adres | Dosya |
|---|---|
| `/kvkk` | `vitrin/kvkk.html` |
| `/gizlilik-politikasi` | `vitrin/gizlilik-politikasi.html` |
| `/cerez-politikasi` | `vitrin/cerez-politikasi.html` |
| `/kullanim-sartlari` | `vitrin/kullanim-sartlari.html` |

Kurallar:

- Dört sayfa **birebir aynı iskelettir**; yalnızca üst başlık (kicker) ve sayfa adı değişir.
  İçerik, ekranın ortasında duran tek bir "Çok yakında." satırı ile bir e-posta adresidir.
  Görünüm sitenin geri kalanıyla aynıdır (`.yasal` bölümü, `stil.css`).
- **Menüde yer almazlar.** Yalnızca alt bölümden ve iletişim formunun altındaki KVKK
  bağlantısından erişilir. Üst menü beş sayfalık kalır; bu, `008`in ana kuralını bozmaz.
- İçerik olmadığı için dördü de **`noindex, follow`** etiketlidir ve `sitemap.xml` dosyasında
  **yoktur**. Boş bir sayfanın aramaya girmesi markaya zarar verir.

**Metin girildiğinde yapılacak iki şey** (unutulmasın diye buraya yazıldı):

1. O sayfanın `<meta name="robots">` etiketi `index, follow` olur.
2. Sayfa `vitrin/sitemap.xml` dosyasına eklenir.
