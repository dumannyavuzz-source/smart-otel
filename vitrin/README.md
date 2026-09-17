# vitrin/ — OtelDijital Tanıtım Sayfası

Dışarıya bakan tek sayfa: ürünü anlatır ve "Otelimi Ücretsiz Başlat" der.
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
| `index.html` | Sayfanın kendisi: sade menü, hero (kodla çizilmiş telefon), döngü hikâyesi, keşif alanı, dijital check-up panosu, OTA ve dijital yönetim, değer sütunları, şifre notu, fiyatlar, teknik altyapı, iletişim |
| `stil.css` | Görünüm: açık (kırık beyaz) zemin, antrasit koyu bloklar, tek marka rengi. Oran %70 açık · %20 koyu · %10 marka — `docs/decisions/006-vitrin-gorsel-dili.md` |
| `hareket.js` | Canlı akış animasyonu. Liste HTML'de zaten doludur; bu dosya yalnızca üstüne yeni satır ekler |
| `etkilesim.js` | Dört etkileşim: kaydırdıkça beliren döngü hikâyesi, keşif alanındaki ekran değiştirme, görününce dolan check-up panosu ve Ortak Beyin'e yazan iletişim formu. İlk üçü betiksiz de anlamlıdır; form betik ister |
| `ayarlar.ornek.js` | Ayar dosyasının örneği: Supabase adresi ve ziyaretçi anahtarı. Gerçeği (`ayarlar.js`) git'e girmez |
| `ayarlar-uret.sh` | Vercel derleme komutu: ortam değişkenlerinden `ayarlar.js` üretir; değişken eksikse dağıtımı durdurur |
| `simge.svg` · `dokunma-simgesi.png` | Sekme simgesi ve telefon ana ekranı simgesi: marka işareti (turuncu yuvarlak kare) |
| `paylasim.html` → `paylasim.png` | Bağlantı paylaşılınca görünen 1200×630 kart. HTML kaynaktır, PNG ondan üretilir (aşağıda) |
| `robots.txt` · `sitemap.xml` | Arama motoru yönlendirmesi: tek sayfa, `paylasim.html` dışarıda |
| `vercel.json` | Yayın başlıkları: içerik güvenlik politikası (CSP) ve diğer koruyucu başlıklar |

## Bakmak için

Derleme gerekmez. Dosyaya çift tıklayın ya da:

```bash
cd vitrin
python -m http.server 8000     # sonra tarayıcıda http://localhost:8000
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

## Mobil ve performans notları (Aşama 15–16)

- Sayfada `<img>` yoktur; her görsel kodla çizilir. Bu yüzden "tembel yükleme" (lazy loading) uygulanacak bir
  şey yoktur — sayfanın tek görseli paylaşım kartıdır ve sayfada görünmez.
- Yazı ailesi tek (Inter, 400–700) + veri için JetBrains Mono. 800 ağırlığı kullanılmıyor; tarayıcı sahte kalın üretmiyor.
- Betikler `defer` ile yüklenir; sayfa metni betikleri beklemez.
- Yatay taşma denetimi 320–1400 px arası yedi genişlikte betikle yapıldı; hiçbir öğe sayfa dışına çıkmıyor.
  Hero'daki telefonun kenardan taşması yalnızca yanlarda boşluk varken (≥ 1240 px) açıktır.

## Yayınlamak

Vercel'de **ikinci bir proje** olarak yayınlanır: Root Directory `vitrin` · Build Command `sh ayarlar-uret.sh` ·
Output Directory `.` · ortam değişkenleri `SUPABASE_URL` ve `SUPABASE_ANON_KEY` (`docs/deployment-checklist.md` · 6.7).

| Adres | Ne çalışır |
|---|---|
| `oteldijital.com` | Bu vitrin sayfası |
| `app.oteldijital.com` | Personel uygulaması (`app/`), kayıt sayfası (`/kayit`) ve misafir yorum sayfası |

Alan adları Genel Müdür tarafından onaylandı (2026-09-16). Sayfadaki bağlantılar:
"30 Gün Ücretsiz Dene" düğmeleri `app.oteldijital.com/kayit` adresine (altı yerde);
Kurumsal plandaki "Görüşme ayarla" düğmesi ve iletişim bölümündeki adres
`mailto:merhaba@oteldijital.com`'a gider. Bu posta kutusunun canlıya çıkmadan çalıştığı doğrulanmalıdır.

**İletişim formu Ortak Beyin'e yazar.** "Gönder" mesajı Supabase'deki `iletisim_formu` tablosuna
bırakır; sayfa yenilenmez, alanların yerini onay ekranı alır. Ziyaretçi anahtarı bu tabloya yalnızca
yazabilir, okuyamaz; kimse silemez. Aynı adresten saatte 5, toplamda 300 mesajdan fazlası reddedilir.
Mesajlar Supabase panelinden okunur. Sayfa `vercel.json` ile içerik güvenlik politikası (CSP) altında yayınlanır:
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
