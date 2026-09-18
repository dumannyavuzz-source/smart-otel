# vitrin/ — OtelDijital Tanıtım Sayfası

Dışarıya bakan tek sayfa: ürünü anlatır ve "30 Gün Ücretsiz Dene" der. Görsel dili "Sakin Lüks"tür (`DESIGN_SYSTEM.md`).
Personel uygulaması (`app/`) ile **hiçbir ortak kodu yoktur**; bilerek böyledir.

## Neden ayrı duruyor?

- Vitrin herkese açıktır, uygulama ise otelin içidir. İkisini aynı pakete koymak, ziyaretçiye
  personel uygulamasını da indirtirdi.
- Vitrinde çerçeve, paket **yok**: birkaç dosya, sıfır bağımlılık. Telefonda anında açılır.
  Tek "derleme" adımı, dağıtımda ayar dosyasını üreten bir satırlık kabuk betiğidir (aşağıda).
- Uygulamanın servis çalışanı (PWA) tanıtım sayfasını önbelleğe almaz; tanıtım sayfası da uygulamanın
  oturumuna dokunmaz.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `index.html` | Sayfanın kendisi: sade menü (+ "Giriş Yap"), hero (kodla çizilmiş telefon), iç operasyon (üç zikzak blok), döngü hikâyesi ("Nasıl çalışır"), keşif alanı ("Uygulama"), dijital check-up panosu, OTA ve dijital yönetim (hizmet listesi), değerler (satırlar), şifre notu, tarife, teknik altyapı (hizmet listesi), iletişim (zeytin blok), kapanış |
| `stil.css` | Görünüm: "Sakin Lüks" — mat grafit zemin, zeytin iletişim bloğu, şampanya yalnızca eylemde; serif başlık (Cormorant Garamond) + Inter. Tek kaynak `DESIGN_SYSTEM.md`, karar `docs/decisions/007-sakin-luks-gorsel-dili.md` |
| `hareket.js` | Canlı akış animasyonu. Liste HTML'de zaten doludur; bu dosya yalnızca üstüne yeni satır ekler |
| `etkilesim.js` | Beş etkileşim: kaydırdıkça beliren döngü hikâyesi, keşif alanındaki ekran değiştirme, görününce dolan check-up panosu, Ortak Beyin'e yazan iletişim formu ve kaydırınca üst çubuğa gelen ince çizgi. Form dışındakiler betiksiz de anlamlıdır |
| `ayarlar.ornek.js` | Ayar dosyasının örneği: Supabase adresi ve ziyaretçi anahtarı. Gerçeği (`ayarlar.js`) git'e girmez |
| `../ayarlar-uret.sh` (depo kökünde) | Vercel derleme komutu: ortam değişkenlerinden `vitrin/ayarlar.js` üretir; değişken eksik ya da anahtar gizliyse dağıtımı durdurur |
| `simge.svg` · `dokunma-simgesi.png` | Sekme simgesi ve telefon ana ekranı simgesi: grafit zeminde şampanya kare. PNG, kütüphanesiz küçük bir Node betiğiyle üretildi (aşağıda) |
| `paylasim.html` → `paylasim.png` | Bağlantı paylaşılınca görünen 1200×630 kart. HTML kaynaktır, PNG ondan üretilir (aşağıda) |
| `robots.txt` · `sitemap.xml` | Arama motoru yönlendirmesi: tek sayfa, `paylasim.html` dışarıda |
| `../vercel.json` (depo kökünde) | Yayın başlıkları: içerik güvenlik politikası (CSP) ve diğer koruyucu başlıklar. Vercel bu dosyayı yalnızca Root Directory'de arar; o yüzden kökte durur |

## Bakmak için

Derleme gerekmez. Dosyaya çift tıklayın ya da küçük yerel sunucuyla açın (Node yeterlidir, paket yok):

```bash
node araclar/sunucu.js "$(pwd)/vitrin"     # sonra tarayıcıda http://localhost:5180
```

İletişim formunun bilgisayarda da çalışması için `ayarlar.ornek.js` dosyasını `ayarlar.js` adıyla
kopyalayıp iki değeri doldurun (`app/.env` içindekilerle aynı). Dosya yoksa sayfa yine açılır;
yalnızca form "gönderilemedi" der ve e-posta adresini gösterir.

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
| `sunucu.js` | Verilen klasörü `http://localhost:5180` adresinde açar (taşma denetimi iframe ister; `file://` izin vermez) |
| `tasma-denetimi.html` | Sayfayı 320–1400 px arası yedi genişlikte iframe içinde açar, sayfa dışına taşan öğeleri listeler. Geçici olarak `vitrin/` içine kopyalayıp sunucuyla açın (`http://localhost:5180/tasma-denetimi.html`); sonuç sayfanın altına yazılır. İşi bitince kopyayı silin |
| `dokunma-simgesi-uret.js` | `dokunma-simgesi.png` üretir (180×180, grafit zeminde şampanya kare): `node araclar/dokunma-simgesi-uret.js vitrin/dokunma-simgesi.png` |

## Mobil ve performans notları

- Sayfada `<img>` yoktur; her görsel kodla çizilir. Bu yüzden "tembel yükleme" (lazy loading) uygulanacak bir
  şey yoktur — sayfanın tek görseli paylaşım kartıdır ve sayfada görünmez.
- Yazı: başlıklar Cormorant Garamond (400–500), gövde Inter (400–600), veri JetBrains Mono. Kalın (700+) başlık yoktur.
- Betikler `defer` ile yüklenir; sayfa metni betikleri beklemez.
- Yatay taşma denetimi 320–1400 px arası yedi genişlikte `araclar/tasma-denetimi.html` ile yapılır (aşağıda, "Araçlar"); hiçbir öğe sayfa dışına çıkmıyor.
  Hero'daki telefonun kenardan taşması yalnızca yanlarda boşluk varken (≥ 1240 px) açıktır.

## Yayınlamak

Vercel'de **ikinci bir proje** olarak yayınlanır. Derleme depo kökünden başlar (betik ve `vercel.json` bu yüzden köktedir):
**Root Directory boş** (depo kökü) · Build Command `sh ayarlar-uret.sh` · **Output Directory `vitrin`** ·
ortam değişkenleri `SUPABASE_URL` ve `SUPABASE_ANON_KEY` (`docs/deployment-checklist.md` · 6.1 ve 6.7).

| Adres | Ne çalışır |
|---|---|
| `oteldijital.com` | Bu vitrin sayfası |
| `app.oteldijital.com` | Personel uygulaması (`app/`): giriş (`/giris`), kayıt (`/kayit`) ve misafir yorum sayfası |

Alan adları Genel Müdür tarafından onaylandı (2026-09-16). Sayfadaki bağlantılar:
"30 Gün Ücretsiz Dene" düğmeleri `app.oteldijital.com/kayit` adresine (altı yerde), menüdeki ve alt bölümdeki "Giriş Yap" `app.oteldijital.com/giris` adresine;
Kurumsal plandaki "Görüşme ayarla" düğmesi ve iletişim bölümündeki adres
`mailto:merhaba@oteldijital.com`'a gider. Bu posta kutusunun canlıya çıkmadan çalıştığı doğrulanmalıdır.

**İletişim formu Ortak Beyin'e yazar.** "Gönder" mesajı Supabase'deki `iletisim_formu` tablosuna
bırakır; sayfa yenilenmez, alanların yerini onay ekranı alır. Ziyaretçi anahtarı bu tabloya yalnızca
yazabilir, okuyamaz; kimse silemez. Aynı adresten saatte 5, toplamda 300 mesajdan fazlası reddedilir.
Mesajlar Supabase panelinden okunur. Sayfa depo kökündeki `vercel.json` ile içerik güvenlik politikası (CSP) altında yayınlanır:
betik yalnızca kendi alanından, bağlantı yalnızca `*.supabase.co`. Ayrıntı ve canlı doğrulama: `docs/security/007-iletisim-formu.md`.

Alt bölümdeki yasal bağlantılar (KVKK Aydınlatma Metni, Gizlilik Politikası, Çerez Politikası,
Kullanım Şartları) ve formun altındaki KVKK bağlantısı **şimdilik `#` adresine gider**; metinler
yazılınca gerçek sayfalarına bağlanacaktır.

Hizmet bölümlerindeki **"Bilgi Al"** (check-up ve dijital yönetim) ile **"Teknik Destek Al"** (teknik altyapı)
düğmeleri kayıt sayfasına değil, iletişim bölümüne iner. Bu bölümler demo üyeliğine yönlendirmez;
bu, Genel Müdür'ün açık kararıdır.

Adımlar `docs/deployment-checklist.md` · Bölüm 6'da.

## Metin ile ürün aynı mı? Evet.

Sayfada **"Personel şifreleri doğrudan Müdür Paneli üzerinden 5 saniyede güncellenir"** yazıyor.
Bu vaat **Aşama 19.1'de karşılandı**: Müdür Paneli → Personel → kartın üstündeki "🔑 Şifre" düğmesi.
Kutu hazır bir öneriyle açılır, müdür kaydeder ve ekranda gördüğü şifreyi kişiye söyler. Mail gitmez.

Geriye kalan açık, sayfanın vaat etmediği bir şeydir ve kayıtlıdır: personelin **kendi** şifresini değiştirme yolu
henüz yoktur (`docs/security/002-personel-kapisi-ve-panel.md` · Açık 1). Vitrin metni bunu iddia etmiyor.
