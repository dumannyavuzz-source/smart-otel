# vitrin/ — OtelDijital Tanıtım Sayfası

Dışarıya bakan tek sayfa: ürünü anlatır ve "Otelimi Ücretsiz Başlat" der.
Personel uygulaması (`app/`) ile **hiçbir ortak kodu yoktur**; bilerek böyledir.

## Neden ayrı duruyor?

- Vitrin herkese açıktır, uygulama ise otelin içidir. İkisini aynı pakete koymak, ziyaretçiye
  personel uygulamasını da indirtirdi.
- Vitrinde çerçeve, paket, derleme adımı **yok**: üç dosya, sıfır bağımlılık. Telefonda anında açılır.
- Uygulamanın servis çalışanı (PWA) tanıtım sayfasını önbelleğe almaz; tanıtım sayfası da uygulamanın
  oturumuna dokunmaz.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `index.html` | Sayfanın kendisi: sade menü, hero (kodla çizilmiş telefon), döngü hikâyesi, keşif alanı, dijital check-up panosu, OTA ve dijital yönetim, değer sütunları, şifre notu, fiyatlar, teknik altyapı, iletişim |
| `stil.css` | Görünüm: açık (kırık beyaz) zemin, antrasit koyu bloklar, tek marka rengi. Oran %70 açık · %20 koyu · %10 marka — `docs/decisions/006-vitrin-gorsel-dili.md` |
| `hareket.js` | Canlı akış animasyonu. Liste HTML'de zaten doludur; bu dosya yalnızca üstüne yeni satır ekler |
| `etkilesim.js` | Üç etkileşim: kaydırdıkça beliren döngü hikâyesi, keşif alanındaki ekran değiştirme ve görününce dolan check-up panosu. Üçü de betiksiz de anlamlı çalışır |

## Bakmak için

Derleme gerekmez. Dosyaya çift tıklayın ya da:

```bash
cd vitrin
python -m http.server 8000     # sonra tarayıcıda http://localhost:8000
```

## Yayınlamak

Vercel'de **ikinci bir proje** olarak yayınlanır (Root Directory: `vitrin`, derleme komutu yok, çıktı klasörü `vitrin`).

| Adres | Ne çalışır |
|---|---|
| `oteldijital.com` | Bu vitrin sayfası |
| `app.oteldijital.com` | Personel uygulaması (`app/`), kayıt sayfası (`/kayit`) ve misafir yorum sayfası |

Alan adları Genel Müdür tarafından onaylandı (2026-09-16). Sayfadaki bağlantılar:
"30 Gün Ücretsiz Dene" düğmeleri `app.oteldijital.com/kayit` adresine (altı yerde);
Kurumsal plandaki "Görüşme ayarla" düğmesi ve iletişim bölümündeki (`#iletisim`) düğme
`mailto:merhaba@oteldijital.com` adresine gider.
Bu posta kutusu vitrindeki **tek** iletişim yoludur; canlıya çıkmadan çalıştığı doğrulanmalıdır.

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
