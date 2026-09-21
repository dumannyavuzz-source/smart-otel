# vitrin/ — OtelDijital Tanıtım Sayfaları

Dışarıya bakan **beş sayfa**: ürünü ve hizmetleri anlatır, menüde "Demo İste", sayfalarda "30 Gün Ücretsiz Dene" der.
Görsel dili "Sakin Lüks"tür (`DESIGN_SYSTEM.md`).
Personel yazılımı (`app/`) ile **hiçbir ortak kodu yoktur**; bilerek böyledir.

## Beş sayfa, beş konu

Ana kural (Genel Müdür, 2026-09-21 · karar `docs/decisions/008-vitrin-sayfa-mimarisi.md`):
**her sayfa yalnızca kendi konusunun uzmanıdır.** Bir sayfa diğer hizmetleri yeniden anlatmaz.

| Sayfa | Ne anlatır |
|---|---|
| `index.html` — **İç Operasyon** (adres `/`) | Ana ürün: otel operasyon merkezi, ayrıntısıyla. Nedir · hangi sorunları çözer · nasıl çalışır · personel nasıl kullanır · müdür neleri görebilir · oda, arıza, depo, fire, görev · raporlama |
| `dijital-vitrin.html` (adres `/dijital-vitrin`) | Dijital check-up panosu, OTA yönetimi, channel manager, Google, web sitesi, online itibar, SEO |
| `teknolojik-altyapi.html` (adres `/teknolojik-altyapi`) | Ne zaman aramalı · Wi-Fi, ağ, kamera, sunucu, NAS, kesintisiz güç · nasıl yürür |
| `fiyatlandirma.html` (adres `/fiyatlandirma`) | Dört paket (personel yazılımındaki ödeme duvarıyla aynı) ve fiyatla ilgili dört soru |
| `iletisim.html` (adres `/iletisim`) | Sitedeki **tek** form. Bütün "Bilgi Al" / "Teknik Destek Al" düğmeleri buraya gelir |

Ana sayfadaki Dijital Vitrin ve Teknolojik Altyapı "kapıları" birer cümle ve birer düğmedir; hizmetin
kendisi orada anlatılmaz. Aynı kural her sayfanın sonundaki iki kapı için de geçerlidir.

## Neden ayrı duruyor?

- Vitrin herkese açıktır, personel yazılımı ise otelin içidir. İkisini aynı pakete koymak, ziyaretçiye
  personel yazılımını da indirtirdi.
- Vitrinde çerçeve, paket **yok**: birkaç dosya, sıfır bağımlılık. Telefonda anında açılır.
  Tek "derleme" adımı, dağıtımda ayar dosyasını üreten bir satırlık kabuk betiğidir (aşağıda).
- Personel yazılımının servis çalışanı (PWA) tanıtım sayfalarını önbelleğe almaz; tanıtım sayfaları da onun
  oturumuna dokunmaz.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `index.html` | Ana sayfa: hero (kodla çizilmiş telefon), "nedir", "hangi sorunları çözer" (iki sütunlu karşılaştırma), iç operasyonun üç alanı (zikzak), döngü hikâyesi, "kim ne yapar" (personel / müdür), keşif alanı, değerler, raporlama, şifre notu, iki kapı, kapanış |
| `dijital-vitrin.html` | Sayfa başı, dijital check-up panosu, altı hizmet, dört adım, iki kapı |
| `teknolojik-altyapi.html` | Sayfa başı, dört belirti, altı hizmet, dört adım, iki kapı |
| `fiyatlandirma.html` | Sayfa başı, tarife (dört plan), sık sorulanlar, kapanış |
| `iletisim.html` | Sayfa başı, zeytin blok içinde form, "hangi konu hangi sayfada" listesi |
| `stil.css` | Beş sayfanın ortak görünümü: "Sakin Lüks" — mat grafit zemin, zeytin iletişim bloğu, şampanya yalnızca eylemde; serif başlık (Cormorant Garamond) + Inter. Tek kaynak `DESIGN_SYSTEM.md`, kararlar `docs/decisions/007` ve `008` |
| `hareket.js` | Canlı akış animasyonu (yalnızca ana sayfada iş görür). Liste HTML'de zaten doludur; bu dosya yalnızca üstüne yeni satır ekler |
| `etkilesim.js` | Beş etkileşim: kaydırdıkça beliren döngü hikâyesi, keşif alanındaki ekran değiştirme, görününce dolan check-up panosu, Ortak Beyin'e yazan iletişim formu ve kaydırınca üst çubuğa gelen ince çizgi. Her biri kendi öğesini bulamazsa sessizce durur; bu yüzden aynı üç betik beş sayfada da durabilir |
| `ayarlar.ornek.js` | Ayar dosyasının örneği: Supabase adresi ve ziyaretçi anahtarı. Gerçeği (`ayarlar.js`) git'e girmez |
| `../ayarlar-uret.sh` (depo kökünde) | Vercel derleme komutu: ortam değişkenlerinden `vitrin/ayarlar.js` üretir; değişken eksik ya da anahtar gizliyse dağıtımı durdurur |
| `simge.svg` · `dokunma-simgesi.png` | Sekme simgesi ve telefon ana ekranı simgesi: grafit zeminde şampanya kare. PNG, kütüphanesiz küçük bir Node betiğiyle üretildi (aşağıda) |
| `paylasim.html` → `paylasim.png` | Bağlantı paylaşılınca görünen 1200×630 kart. HTML kaynaktır, PNG ondan üretilir (aşağıda). Beş sayfa da aynı kartı kullanır |
| `robots.txt` · `sitemap.xml` | Arama motoru yönlendirmesi: beş sayfa listelidir, `paylasim.html` dışarıdadır |
| `../vercel.json` (depo kökünde) | Uzantısız adresler (`cleanUrls`) ve yayın başlıkları: içerik güvenlik politikası (CSP) ile diğer koruyucu başlıklar. Vercel bu dosyayı yalnızca Root Directory'de arar; o yüzden kökte durur |

## Bakmak için

Derleme gerekmez, küçük yerel sunucuyla açılır (Node yeterlidir, paket yok):

```bash
node araclar/sunucu.js "$(pwd)/vitrin"     # sonra tarayıcıda http://localhost:5180
```

İletişim formunun bilgisayarda da çalışması için `ayarlar.ornek.js` dosyasını `ayarlar.js` adıyla
kopyalayıp iki değeri doldurun (`app/.env` içindekilerle aynı). Dosya yoksa sayfa yine açılır;
yalnızca form "gönderilemedi" der ve e-posta adresini gösterir.

> **Not:** Sayfalar artık `file://` ile açılmaz. Bağlantılar uzantısız ve kök adresli olduğu için (`/dijital-vitrin`)
> yalnızca sunucu üzerinden gezilebilir. Bu, yayındaki davranışla birebir aynı olması içindir.

## Paylaşım görseli (Open Graph)

Fotoğraf yok; kart da sitenin kendisi gibi kodla çizilir. `paylasim.html` kaynağı değişirse PNG yeniden üretilir
(Edge/Chrome ile, kurulum gerekmez):

```bash
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --hide-scrollbars   --window-size=1200,630 --screenshot="$(pwd)/vitrin/paylasim.png" "file:///$(pwd)/vitrin/paylasim.html"
```

## Araçlar (depo kökündeki `araclar/`)

Üçü de kütüphanesizdir ve depo kökünde durur: `vitrin/` Vercel'in yayın klasörü olduğu için içine geliştirme aracı konmaz.

| Dosya | Ne yapar |
|---|---|
| `sunucu.js` | Verilen klasörü `http://localhost:5180` adresinde açar. Yayındaki gibi **uzantısız adresleri** de anlar: `/fiyatlandirma` bulunamazsa `fiyatlandirma.html` denenir |
| `tasma-denetimi.html` | Sayfayı 320–1400 px arası yedi genişlikte iframe içinde açar, sayfa dışına taşan öğeleri listeler. Geçici olarak `vitrin/` içine kopyalayıp sunucuyla açın (`http://localhost:5180/tasma-denetimi.html`); sonuç sayfanın altına yazılır. İşi bitince kopyayı silin. **Not:** dosyanın içindeki `index.html` adı elle değiştirilerek diğer dört sayfa da ölçülür |
| `dokunma-simgesi-uret.js` | `dokunma-simgesi.png` üretir (180×180, grafit zeminde şampanya kare): `node araclar/dokunma-simgesi-uret.js vitrin/dokunma-simgesi.png` |

> **Uyarı:** Telefon genişliğini ölçmek için tarayıcıyı `--window-size=390,844` ile açmak **yanıltır**:
> Windows pencereyi en az ~500 px yapar, sayfa 500 px'e göre dizilir, ekran görüntüsü 390 px'e kırpılır.
> Doğru ölçüm iframe içinde yapılır — `tasma-denetimi.html` bu yüzden iframe kullanır.

## Mobil ve performans notları

- Sayfalarda `<img>` yoktur; her görsel kodla çizilir. Bu yüzden "tembel yükleme" (lazy loading) uygulanacak bir
  şey yoktur — tek görsel paylaşım kartıdır ve sayfada görünmez.
- Yazı: başlıklar Cormorant Garamond (400–500), gövde Inter (400–600), veri JetBrains Mono. Kalın (700+) başlık yoktur.
- Betikler `defer` ile yüklenir; sayfa metni betikleri beklemez.
- **Menü telefonda gizlenmez.** Site beş sayfa olduğu için dar ekranda üst çubuk iki satıra ayrılır:
  üstte marka ve "Demo İste", altta beş sayfa (yana kayabilen tek satır, sağ kenarı yumuşak solar).
  Bütün sayfalar alt bölümde de listelenir.
- Yatay taşma denetimi 320–1400 px arası yedi genişlikte yapıldı; **beş sayfada da hiçbir öğe sayfa dışına çıkmıyor**.
  Hero'daki telefonun kenardan taşması yalnızca yanlarda boşluk varken (≥ 1240 px) açıktır.

## Yayınlamak

Vercel'de **ikinci bir proje** olarak yayınlanır. Derleme depo kökünden başlar (betik ve `vercel.json` bu yüzden köktedir):
**Root Directory boş** (depo kökü) · Build Command `sh ayarlar-uret.sh` · **Output Directory `vitrin`** ·
ortam değişkenleri `SUPABASE_URL` ve `SUPABASE_ANON_KEY` (`docs/deployment-checklist.md` · 6.1 ve 6.7).

| Adres | Ne çalışır |
|---|---|
| `oteldijital.com` | Ana sayfa (iç operasyon) |
| `oteldijital.com/dijital-vitrin` · `/teknolojik-altyapi` · `/fiyatlandirma` · `/iletisim` | Diğer dört sayfa |
| `app.oteldijital.com` | Personel yazılımı (`app/`): giriş (`/giris`), kayıt (`/kayit`) ve misafir yorum sayfası |

**Adresler uzantısızdır.** Yayında bunu depo kökündeki `vercel.json` içindeki `"cleanUrls": true` sağlar; bilgisayarda
`araclar/sunucu.js` aynı davranışı taklit eder. Dosya adları diskte `.html` kalır, sayfalardaki bağlantılar uzantısız yazılır
(Genel Müdür kararı, 2026-09-21 · `docs/decisions/008`).

Alan adları Genel Müdür tarafından onaylandı (2026-09-16). Sayfalardaki bağlantılar:
Kayıt sayfasına (`app.oteldijital.com/kayit`) her sayfanın üst çubuğundaki "Demo İste" ile ana sayfa, fiyat sayfası
ve kapanışlardaki "30 Gün Ücretsiz Dene" düğmeleri gider; "Giriş Yap" (üst çubuk ve alt bölüm)
`app.oteldijital.com/giris` adresine; Kurumsal plandaki "Görüşme ayarla" ve iletişim sayfasındaki adres
`mailto:merhaba@oteldijital.com`'a gider. Bu posta kutusunun canlıya çıkmadan çalıştığı doğrulanmalıdır.

**İletişim formu Ortak Beyin'e yazar.** Form yalnızca İletişim sayfasındadır (`/iletisim`) — ikinci bir kopyası yoktur.
"Gönder" mesajı Supabase'deki `iletisim_formu` tablosuna bırakır; sayfa yenilenmez, alanların yerini onay ekranı alır.
Ziyaretçi anahtarı bu tabloya yalnızca yazabilir, okuyamaz; kimse silemez. Aynı adresten saatte 5, toplamda
300 mesajdan fazlası reddedilir. Mesajlar Supabase panelinden okunur. Sayfalar depo kökündeki `vercel.json` ile
içerik güvenlik politikası (CSP) altında yayınlanır: betik yalnızca kendi alanından, bağlantı yalnızca
`*.supabase.co`. Ayrıntı ve canlı doğrulama: `docs/security/007-iletisim-formu.md`.

Alt bölümdeki yasal bağlantılar (KVKK Aydınlatma Metni, Gizlilik Politikası, Çerez Politikası,
Kullanım Şartları) ve formun altındaki KVKK bağlantısı **şimdilik `#` adresine gider**; metinler
yazılınca gerçek sayfalarına bağlanacaktır.

Hizmet sayfalarındaki **"Bilgi Al"** ve **"Teknik Destek Al"** düğmeleri kayıt sayfasına değil,
İletişim sayfasına (`/iletisim`) gider. Bu bölümler demo üyeliğine yönlendirmez; bu, Genel Müdür'ün açık kararıdır.

Adımlar `docs/deployment-checklist.md` · Bölüm 6'da.

## Metin ile ürün aynı mı? Evet.

Ana sayfada **"Personel şifreleri doğrudan Müdür Paneli üzerinden 5 saniyede güncellenir"** yazıyor.
Bu vaat **Aşama 19.1'de karşılandı**: Müdür Paneli → Personel → kartın üstündeki "🔑 Şifre" düğmesi.
Kutu hazır bir öneriyle açılır, müdür kaydeder ve ekranda gördüğü şifreyi kişiye söyler. Mail gitmez.

Ana sayfadaki "Müdür neleri görebilir?" listesi ve "Raporlama" bölümü, müdür panelinde gerçekten duran
şeyleri sayar (`PROJECT_BLUEPRINT.md` · 3.5): geciken işler, bekleyen onaylar, uyuşmazlıklar,
misafir alarmları, personel ve süre ortalamaları. Yeni bir vaat eklenmemiştir.

Geriye kalan açık, sayfanın vaat etmediği bir şeydir ve kayıtlıdır: personelin **kendi** şifresini değiştirme yolu
henüz yoktur (`docs/security/002-personel-kapisi-ve-panel.md` · Açık 1). Vitrin metni bunu iddia etmiyor.
