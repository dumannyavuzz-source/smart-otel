# 022 — HSTS: "Bu Siteye Yalnızca HTTPS ile Gel" (denetim · Madde 14)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Başlık eklendi. **Preload listesine başvuru YAPILMADI** — o ayrı ve geri alınması zor
> bir adımdır (dağıtım listesi · 6.20).
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 14
> Kod: `vercel.json` (vitrin) ve `app/vercel.json` (personel uygulaması)

---

## HSTS nedir? (tek paragraf)

Tarayıcıya verilen bir söz: *"Bu adrese bundan sonra yalnızca şifreli (HTTPS) gel; kullanıcı yanlışlıkla
`http://` yazsa bile."* Böylece araya girip trafiği dinlemeye çalışan biri, şifresiz ilk isteği
yakalama şansını da kaybeder. Süre `max-age` ile verilir; bizde **iki yıl**.

## Ne değişti

Önce (Vercel'in kendi verdiği hâli):

```
strict-transport-security: max-age=63072000
```

Sonra:

```
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

İki kelime eklendi:

- **`includeSubDomains`** — söz yalnızca `oteldijital.com` için değil, **bütün alt adresleri** için
  geçerlidir: `app.oteldijital.com`, `www.oteldijital.com`, bir gün açılacak her ne varsa.
- **`preload`** — "bu alan adı tarayıcıların hazır listesine alınabilir" iznidir. **Kendi başına
  hiçbir şey yapmaz**; aşağıya bakın.

Başlık iki projeye de kondu: vitrin (depo kökündeki `vercel.json`) ve personel uygulaması
(`app/vercel.json`). Uygulama tarafında daha önce **hiç** güvenlik başlığı yoktu.

## Önce kontrol edildi: alt adresler HTTPS ile çalışıyor mu?

`includeSubDomains` dikkat ister: HTTPS ile çalışmayan bir alt adres varsa o adres tarayıcıda
**erişilemez** hâle gelir. Bu yüzden eklemeden önce bakıldı:

| Adres | Durum (2026-09-22) |
|---|---|
| `oteldijital.com` | HTTPS · 308 ile `www`'ye yönlendiriyor · HSTS başlığı var |
| `www.oteldijital.com` | HTTPS · 200 · HSTS başlığı var |
| `app.oteldijital.com` | **Henüz yok** (DNS kaydı yok) |

Yani bugün kıracak bir alt adres yok. Personel uygulaması bir alt adrese taşındığında Vercel onu
zaten yalnızca HTTPS ile yayınlar, dolayısıyla kural onu da sorunsuz kapsar.

**Kalıcı kural:** bundan sonra açılacak her alt adres HTTPS ile çalışmak zorundadır. Şifresiz
çalışan bir alt adres (eski bir sunucu, bir posta arayüzü, bir test makinesi) bu başlık yüzünden
tarayıcıda açılmaz. Yeni alt adres açan bunu bilerek açar.

## `preload` — asıl geri alınamaz adım burada

Başlığa `preload` yazmak **izin vermektir**, işlem değil. Asıl işlem `hstspreload.org` adresinden
alan adını listeye **göndermektir**. Liste tarayıcıların içine gömülüdür; oraya girdikten sonra:

- `oteldijital.com` ve **bütün alt adresleri** şifresiz hiçbir şekilde açılamaz,
- listeden çıkmak **aylar** sürer ve eski tarayıcılarda çok daha uzun sürer.

Bu yüzden başvuru **yapılmadı**. Denetim de bunu öneriyor: bir süre `includeSubDomains` ile yayında
kalınsın, her şey oturduktan sonra başvurulsun. Sıra dağıtım listesinde yazılıdır (**6.20**):
önce `app.oteldijital.com` açılsın ve HTTPS ile çalıştığı görülsün, sonra başvurulsun.

## Kalan — Genel Müdür kararı bekliyor

Personel uygulamasında artık HSTS var ama **başka güvenlik başlığı yok**: içerik güvenlik politikası
(CSP), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` — hiçbiri. Vitrinde dördü de
var. Bu madde HSTS'ye aitti, kapsam sessizce genişletilmedi; ama uygulama asıl veriye dokunan taraf
olduğu için bu boşluk kapatılmalıdır. Ayrı bir adım olarak yapılabilir.
