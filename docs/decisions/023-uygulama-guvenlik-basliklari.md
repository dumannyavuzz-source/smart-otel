# 023 — Personel Uygulamasına Güvenlik Başlıkları

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Uygulandı; CSP yerelde gerçek derlemeyle sınandı. İç ekranlar canlıda doğrulanmalı
> (dağıtım listesi · 6.21).
> Kod: `app/vercel.json`

---

## Durum

Vitrinde beş güvenlik başlığı vardı. Personel uygulamasında **hiçbiri yoktu** — oysa asıl otel
verisi (odalar, personel, fotoğraflar, alarmlar) orada dönüyor. Genel Müdür kararıyla bu boşluk
kapatıldı.

## Eklenen başlıklar

| Başlık | Ne işe yarar (tek cümle) |
|---|---|
| `Content-Security-Policy` | Sayfanın nereden betik, stil, resim ve bağlantı alabileceğini kilitler |
| `Strict-Transport-Security` | "Bu adrese yalnızca şifreli gel" (karar 022) |
| `X-Content-Type-Options: nosniff` | Tarayıcı dosya türünü tahmin etmeye çalışmaz |
| `Referrer-Policy` | Başka siteye giderken hangi sayfadan gelindiği tam adresiyle sızmaz |
| `Permissions-Policy` | Hangi cihaz yeteneği kullanılabilir: **kamera evet**, gerisi hayır |

## Politika neden vitrinle birebir aynı değil?

Uygulama vitrine benzemez; dört yerde bilerek ayrılır. Her ayrım bir ihtiyaca dayanır:

| Fark | Neden |
|---|---|
| `camera=(self)` | QR okutma ve fotoğraf çekme kameraya muhtaçtır. Vitrindeki gibi `camera=()` yazılsaydı **görevli QR okutamazdı** — kopyala-yapıştır bir politikanın sessizce kıracağı ilk şey buydu |
| `img-src … blob: https://*.supabase.co` | Çekilen fotoğrafın önizlemesi `blob:` adresiyle gösterilir; uyuşmazlık kanıtı ise Supabase'in imzalı adresinden gelir |
| `worker-src 'self'` | Çevrimdışı çalışmayı sağlayan servis çalışanı (PWA) kendi alanımızdan yüklenir |
| `wss://*.supabase.co` | Bugün canlı bağlantı (realtime) kullanılmıyor; ileride açılırsa politika yüzünden sessizce kırılmasın diye baştan izinli |

Geri kalanı vitrinle aynıdır: betik yalnızca kendi alanından (`script-src 'self'`, satır içi betik
yasak), sayfa başka bir siteye gömülemez (`frame-ancestors 'none'`), eklenti yok (`object-src 'none'`).

### `'unsafe-inline'` yalnızca stilde var, betikte yok
Arayüzde üç yerde satır içi stil (`style={{…}}`) kullanılıyor; tarayıcı bunu `style-src` altında
sayar. Betik tarafında satır içi hiçbir şey yok — derlenmiş sayfada tek bir satır içi `<script>`
bulunmuyor, hepsi ayrı dosya. **Asıl tehlikeli olan `script-src`'deki gevşeklik**; orası sıkı kaldı.

### `'unsafe-eval'` yok
Derlenmiş paket tarandı: `eval`, `new Function` ve WebAssembly geçmiyor. QR çözücü dâhil hiçbir
parça buna ihtiyaç duymuyor, dolayısıyla izin de verilmedi.

## Denendi

Politika, **gerçek üretim derlemesi** üzerinde `<meta>` olarak uygulanıp denendi (vitrinde de aynı
yöntem kullanılmıştı). Tarayıcının `securitypolicyviolation` olayı dinlendi:

| Ekran | İhlal | Ekran doğru çizildi mi? |
|---|---|---|
| `/giris` | **0** | evet |
| `/kayit` | **0** | evet |
| `/` (girişe yönlenir) | **0** | evet |

## Dürüst sınır: iç ekranlar yerelde denenemedi

Bu üç ekran giriş yapmadan görülebilen tek ekranlardır. **Kamera, fotoğraf yükleme, imzalı fotoğraf
adresi ve müdür paneli** giriş gerektirir; bunlar politika kaynak koddan okunarak karşılandı ama
tarayıcıda sınanmadı. Canlıda bir kez elle denenmelidir — dağıtım listesi · **6.21**. Bir şey
kırılırsa belirtisi nettir: ekran boş kalır ya da fotoğraf gelmez, tarayıcı konsolunda hangi
direktifin engellediği yazar.

## Kalan

`Cross-Origin-Opener-Policy` ve `Cross-Origin-Embedder-Policy` eklenmedi. Bugün bir faydası
olmayacaktı ve yanlış ayarlanırsa kamera ile fotoğraf akışını kırabilirdi; gerekirse ayrı bir adımda
ölçülerek eklenir.
