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

## Metin ile ürün aynı mı? Evet.

Sayfada **"Personel şifreleri doğrudan Müdür Paneli üzerinden 5 saniyede güncellenir"** yazıyor.
Bu vaat **Aşama 19.1'de karşılandı**: Müdür Paneli → Personel → kartın üstündeki "🔑 Şifre" düğmesi.
Kutu hazır bir öneriyle açılır, müdür kaydeder ve ekranda gördüğü şifreyi kişiye söyler. Mail gitmez.

Geriye kalan açık, sayfanın vaat etmediği bir şeydir ve kayıtlıdır: personelin **kendi** şifresini değiştirme yolu
henüz yoktur (`docs/security/002-personel-kapisi-ve-panel.md` · Açık 1). Vitrin metni bunu iddia etmiyor.
