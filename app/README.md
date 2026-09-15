# app/ — Personel Uygulaması (PWA)

Telefonda çalışır, mağaza gerekmez, internet yokken de açılır.
Bu aşamada yalnızca **Kat Görevlisi akışı** vardır.

## Ekranlar

```
Giriş ──▶ Ana Ekran ──▶ QR Okut ──▶ Oda 204 ──┬─▶ Eksik Var ──▶ Ne eksik? ──▶ Kaç tane? ──▶ ✓ ──▶ Oda 204'e Dön
        (tek buton)   (kamera)    (liste)     ├─▶ Sorun Bildir ──▶ Ne oldu? ──┬─ Böcek var ─────▶ ✓ ──▶ Oda 204'e Dön
                                              │                             └─ Bir şey bozuk ─▶ Ne bozuk? ─▶ ✓ ──▶ Oda 204'e Dön
                                              └─▶ Oda Hazır ─────────────────────────────────────▶ ✓ ──▶ Ana Ekran
```

Her beyan **önce telefona** yazılır (giden kutusu), ekran anında "✓" der. Postacı internet gelince gönderir.
Ana ekranda "3 bildirim internet gelince gönderilecek" yazısı, henüz gitmemiş beyanları gösterir.
Ekran kararları ve açık sorular: `docs/ux/001-kat-gorevlisi-akisi.md`.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `src/ekranlar/` | Yedi ekran: Giriş, Ana, QR Okut, Oda, Eksik Var, Sorun Bildir, Tamam |
| `src/parcalar/` | Ortak parçalar: büyük buton, sayfa iskeleti |
| `src/telefonDeposu.ts` | Telefonun çekmecesi: odalar, kontrol listesi, ürünler, giden kutusu |
| `src/postaci.ts` | Giden kutusunu sunucuya taşır; vardiya paketini indirir |
| `src/beyanlar.ts` | Üç beyan: Oda Hazır · Eksik Var · Sorun Bildir |
| `src/odalar.ts` | QR kodundan odayı bulur (önce telefon, sonra sunucu) |
| `src/qr/qrOku.ts` | QR çözme: tarayıcının okuyucusu, yoksa jsQR |
| `src/oturum.ts` | Giriş var mı? |
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
