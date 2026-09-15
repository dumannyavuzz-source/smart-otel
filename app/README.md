# app/ — Personel Uygulaması (PWA)

Telefonda çalışır, mağaza gerekmez, internet yokken de açılır.
İki akış vardır: **Kat Görevlisi** (QR → oda) ve **Teknisyen** (açık işler → Aldım → Çözdüm).

## Ekranlar

```
Giriş ──▶ Ana Ekran ──▶ QR Okut ──▶ Oda 204 ──┬─▶ Eksik Var ──▶ Ne eksik? ──▶ Kaç tane? ──▶ ✓ ──▶ Oda 204'e Dön
        (tek buton)   (kamera)    (liste)     ├─▶ Sorun Bildir ──▶ Ne oldu? ──▶ 📷 Fotoğraf Çek (+ not) ──▶ Gönder ──▶ ✓ ──▶ Oda 204'e Dön
                                              └─▶ Oda Hazır ─────────────────────────────────────▶ ✓ ──▶ Ana Ekran
          └─▶ 🔧 Açık İşler (3) ──▶ Liste (en acil üstte) ──▶ İş ──▶ 🙋 Aldım ──▶ ✅ Çözdüm (+ fotoğraf) ──▶ ✓ ──▶ İşlere Dön
```

Her beyan **önce telefona** yazılır (giden kutusu), ekran anında "✓" der. Postacı internet gelince gönderir.
Ana ekranda "3 bildirim internet gelince gönderilecek" yazısı, henüz gitmemiş beyanları gösterir.
Ekran kararları: `docs/ux/001-kat-gorevlisi-akisi.md`, `docs/ux/002-teknisyen-akisi.md`.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `src/ekranlar/` | Dokuz ekran: Giriş, Ana, QR Okut, Oda, Eksik Var, Sorun Bildir, Açık İşler, İş, Tamam |
| `src/parcalar/` | Ortak parçalar: büyük buton, sayfa iskeleti, fotoğraf çekici |
| `src/telefonDeposu.ts` | Telefonun çekmecesi: odalar, kontrol listesi, ürünler, giden kutusu, bekleyen fotoğraflar |
| `src/postaci.ts` | Giden kutusunu sunucuya taşır (önce fotoğraf, sonra kayıt); vardiya paketini indirir |
| `src/beyanlar.ts` | Üç beyan: Oda Hazır · Eksik Var · Sorun Bildir (fotoğraflı); giden kutusuna yazma |
| `src/isEmirleri.ts` | Teknisyen: trafik lambası, sıralama, Aldım/Çözdüm, listeyi indirme |
| `src/fotograf/kucult.ts` | Fotoğrafı telefonda küçültür (1280 px, JPEG) |
| `src/odalar.ts` | QR kodundan odayı bulur (önce telefon, sonra sunucu) |
| `src/qr/qrOku.ts` | QR çözme: tarayıcının okuyucusu, yoksa jsQR |
| `src/oturum.ts` | Giriş var mı? (internet yokken de girişli kalır) |
| `src/kullanici.ts` | Şu an giriş yapmış kişi; beyanlar bu kimlikle etiketlenir (ortak telefon) |
| `src/ortakBeyin.ts` | Supabase bağlantısı (kapı anahtarıyla) |
| `src/stil.css` | Sade görünüm: 2 renk, 2 yazı boyutu, büyük butonlar |

## Çalıştırmak

```bash
cd app
cp .env.example .env      # Supabase adresini ve kapı anahtarını yazın
npm install
npm run dev               # geliştirme
npm test                  # testler
npm run build             # tip denetimi + üretim paketi (PWA dahil)
```

Kamera yalnızca **https** (veya localhost) üzerinde açılır; telefonda denemek için https gerekir.

## QR kodlarının içeriği

Personel QR'ı bir bağlantıdır: `https://<uygulama-adresi>/oda/<rooms.staff_code>`
Telefonun kendi kamerasıyla okutulsa da uygulama doğru odada açılır.
