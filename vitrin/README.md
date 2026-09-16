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
| `index.html` | Sayfanın kendisi: başlık, canlı akış, değer sütunları, şifre notu, fiyatlar |
| `stil.css` | Görünüm: gece yarısı zemin, iki vurgu rengi (turuncu = eylem, yeşil = canlı durum) |
| `hareket.js` | Canlı akış animasyonu. Liste HTML'de zaten doludur; bu dosya yalnızca üstüne yeni satır ekler |

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
| `app.oteldijital.com` | Personel uygulaması (`app/`) ve misafir yorum sayfası |

Adımlar `docs/deployment-checklist.md` · Bölüm 6'da.

## Açık madde — metin ile ürün arasındaki tek fark

Sayfada **"Personel şifreleri doğrudan Müdür Paneli üzerinden 5 saniyede güncellenir"** yazıyor.
Bu, Genel Müdür'ün istediği metindir ve doğru hedeftir; ama **uygulamada şifre değiştirme ekranı henüz yoktur**
(`docs/security/002-personel-kapisi-ve-panel.md` · Açık 1). Müdür bugün yalnızca yeni personel eklerken şifre belirleyebiliyor.

Yayına çıkmadan önce ikisinden biri yapılmalıdır:

1. Müdür Paneli'ne "Şifreyi değiştir" ekranı eklenir (küçük bir iş, açık madde zaten kapatılacaktı), **ya da**
2. Bu cümle, ürün o özelliğe kavuşana kadar sayfadan çıkarılır.

Reklamı yapılan her cümlenin ürün tarafından karşılanması, projenin "sonuçlar dürüstçe bildirilir" kuralının bir parçasıdır.
