# app/ — Personel Uygulaması (PWA)

Telefonda çalışır, mağaza gerekmez, internet yokken de açılır.
Dört akış vardır: **Kat Görevlisi** (QR → oda), **Teknisyen** (açık işler → Aldım → Çözdüm),
**Depo** (teslim al → kaç Kg geldi → fatura fotoğrafı) ve **Müdür** (kumanda → alarmlar, onaylar, personel, ürünler).
Bir de personele ait olmayan tek sayfa vardır: odadaki QR ile açılan **Misafir Yorum Ekranı** (giriş yok, kurulum yok).

## Ekranlar

```
Giriş ──▶ Ana Ekran ──▶ QR Okut ──▶ Oda 204 ──┬─▶ Eksik Var ──▶ Ne eksik? ──▶ Kaç Kg? ──▶ ✓ ──▶ Oda 204'e Dön
        (tek buton)   (kamera)    (liste)     ├─▶ Sorun Bildir ──▶ Ne oldu? ──▶ 📷 Fotoğraf Çek (+ not) ──▶ Gönder ──▶ ✓ ──▶ Oda 204'e Dön
                                              └─▶ Oda Hazır ─────────────────────────────────────▶ ✓ ──▶ Ana Ekran
          ├─▶ 🔧 Açık İşler (3) ──▶ Liste (en acil üstte) ──▶ İş ──▶ 🙋 Aldım ──▶ ✅ Çözdüm (+ fotoğraf) ──▶ ✓ ──▶ İşlere Dön
          └─▶ 📦 Teslim Al (2) ──▶ Siparişler ──▶ "Kaç Kg geldi?" ──▶ 📷 Fatura (+ eksikse 📷 hasar) ──▶ ✓ Teslim Aldım

Giriş (müdür) ──▶ Ana Kumanda ──┬─▶ 🔴 Süresi Geçenler · 🔴 Mutsuz Misafirler · 🔴 Teslimat Uyuşmazlıkları
                                │    (kırmızı yoksa 🟢 "Her şey yolunda")
                                ├─▶ 🟡 Bekleyen Onaylar ──▶ ✕ Reddet / ✓ Onayla
                                ├─▶ 👥 Personel ──▶ ➕ Personel Ekle
                                ├─▶ 📦 Ürünler (listede en fazla 8) ──▶ ➕ Ürün Ekle · Listeden çıkar
                                └─▶ Çıkış

Odadaki misafir QR'ı ──▶ /yorum/<kod> ──▶ ★ ★ ★ ★ ★ (+ isteğe bağlı yorum) ──▶ 📨 Gönder ──▶ Teşekkür ederiz
```

Her beyan **önce telefona** yazılır (giden kutusu), ekran anında "✓" der. Postacı internet gelince gönderir.
Ana ekranda "3 bildirim internet gelince gönderilecek" yazısı, henüz gitmemiş beyanları gösterir.
Müdür panelinde yeni bir kırmızı alarm düşünce zarif bir çan sesi çalar (`src/ses.ts`); panel internet ister.
Miktarlar kesirli olabilir ("7,5 Kg", "1,2 Litre"): sayaç yarımşar gider, sayının üstüne dokunup doğrudan da yazılır.
Ekran kararları: `docs/ux/001-kat-gorevlisi-akisi.md`, `002-teknisyen-akisi.md`, `003-mudur-paneli-akisi.md`, `004-depo-teslimat-akisi.md`, `005-misafir-yorum-ekrani.md`.
Canlıya çıkış adımları: `docs/deployment-checklist.md`.

## Dosyalar

| Dosya | Ne yapar |
|---|---|
| `src/ekranlar/` | Personel ekranları: Giriş, Otel Seç, Ana, QR Okut, Oda, Eksik Var, Sorun Bildir, Açık İşler, İş, Teslim Al, Tamam · ve misafirin tek sayfası: Misafir Yorum Ekranı |
| `src/ekranlar/panel/` | Müdür ekranları: Ana Kumanda, Süresi Geçenler, Mutsuz Misafirler, Teslimat Uyuşmazlıkları, Onaylar, Personel, Ürünler |
| `src/parcalar/` | Ortak parçalar: büyük buton, sayfa iskeleti, fotoğraf çekici, miktar sayacı (− + ve yazarak) |
| `src/telefonDeposu.ts` | Telefonun çekmecesi: odalar, kontrol listesi, ürünler, giden kutusu, bekleyen fotoğraflar |
| `src/postaci.ts` | Giden kutusunu sunucuya taşır (önce fotoğraf, sonra kayıt); vardiya paketini indirir |
| `src/beyanlar.ts` | Üç beyan: Oda Hazır · Eksik Var · Sorun Bildir (fotoğraflı); giden kutusuna yazma |
| `src/isEmirleri.ts` | Teknisyen: trafik lambası, sıralama, Aldım/Çözdüm, listeyi indirme |
| `src/teslimler.ts` | Depo: bekleyen siparişler, "Kaç Kg geldi?" sorusu, eksik teslimde kanıt şartı, Teslim Aldım |
| `src/miktar.ts` | Miktar ve birim: "7,5 Kg" yazımı, hangi birim bölünür (Kg yarımşar, adet birer birer) |
| `src/uyusmazliklar.ts` | Müdür alarmı: teslim onaylandığı gibi mi geldi? (istenen · onaylanan · gelen + kanıt fotoğrafı) |
| `src/misafir/yorumGonder.ts` | Misafir yorumunu kapıya (Edge Function) yollar; misafir anahtar taşımaz, giriş yapmaz |
| `src/panel.ts` | Müdür: alarmlar (hesaplanır, saklanmaz), onaylar, personel, ürünler |
| `src/panelNobeti.ts` | Panel nöbetçisi: 30 saniyede bir sorar, yeni kırmızı alarmda çanı çalar; ekranlar cevabı buradan okur |
| `src/ses.ts` | Yeni kırmızı alarmda çalan zarif çan sesi; "bu alarmı duyurmuş muyduk?" hafızası |
| `src/fotograf/kucult.ts` | Fotoğrafı telefonda küçültür (1280 px, JPEG) |
| `src/odalar.ts` | QR kodundan odayı bulur (önce telefon, sonra sunucu) |
| `src/qr/qrOku.ts` | QR çözme: tarayıcının okuyucusu, yoksa jsQR |
| `src/oturum.ts` | Giriş var mı? (internet yokken de girişli kalır) |
| `src/kullanici.ts` | Şu an giriş yapmış kişi; beyanlar bu kimlikle etiketlenir (ortak telefon) |
| `src/ortakBeyin.ts` | Supabase bağlantısı (kapı anahtarıyla) |
| `src/stil.css` | Sade görünüm: 2 renk, 2 yazı boyutu, büyük butonlar |
| `vercel.json` | Bütün adresleri `index.html`'e yönlendirir; olmazsa QR ile açılan adresler 404 verir |

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
