# 005 — Güvenlik: Kayıt Kapısı (Aşama 20)

> **Hazırlayan:** Security + Orkestratör · **Tarih:** 2026-09-16 · **Durum:** 3 madde V1.1'e bırakıldı
> Kod: `supabase/functions/otel-ac/`, `supabase/migrations/…_kayit_kapisi.sql`, `app/src/kayit.ts`.

---

## Neden bu belge var?

Kayıt kapısı, sistemin **ilk kimlik doğrulaması olmayan yazma yoludur**. Bugüne kadar yeni otel açmak
Smartotel ekibinin işiydi; artık vitrindeki bir düğme bunu yapıyor. Üstelik kapı üç şeyi birden ana
anahtarla yazıyor — çünkü ortada henüz giriş yapmış kimse yok:

1. yeni hesap, 2. yeni otel, 3. o otelin **ilk sahibi**.

Bu üçü tek bir yerde toplandığı için kapının kuralları açıkça yazılmalıdır.

## Kapının kilitleri

| Kilit | Nasıl çalışıyor |
|---|---|
| **Hız sınırı** | Aynı internet adresinden **saatte en fazla 3 deneme**. Sayaç veritabanındadır (`kayit_denemesi_say_ve_yaz`), kapıda değil. Dördüncü deneme 429 ile döner. |
| **Adres gizliliği** | İnternet adresi açık saklanmaz; **özeti (SHA-256)** saklanır. Amaç kimliği bilmek değil, "aynı yer mi?" sorusudur. |
| **Sayaç bozuksa** | Kapı açılmaz. Bilinmezlik "sorun yok" sayılmaz (fail-closed). |
| **Biçim denetimi** | Otel adı 2–80, ad 1–60, e-posta biçimi ve ≤120, şifre 8–128. Ekran da aynı soruları sorar ama asıl denetim kapıdadır. |
| **Yarım iş yok** | Otel açılamazsa hesap silinir; ilk sahiplik yazılamazsa otel de hesap da silinir. |
| **E-posta zaten kayıtlıysa** | Otel hiç açılmaz; 409 ve "Giriş yapmayı deneyin." |
| **`hotels` tablosu** | Ekleme kuralı hiç kimseye açılmadı. Yeni bir otel yalnızca bu kapıdan doğar. |
| **Sayaç tablosu** | `kayit_denemeleri` üzerinde RLS açık, **hiç kural yok**: kimse okuyamaz, kimse yazamaz. Yalnızca kapı (ana anahtar) dokunur. Bir günden eski satırlar her denemede silinir — bu bir defter değil, sayaçtır. |
| **Kapı anahtarsızdır** | `verify_jwt = false` (kayıt olan kişinin kartı yoktur). Bu yüzden yukarıdaki sayaç zorunludur. |

## Kabul edilen riskler (V1.1'e bırakıldı — Genel Müdür kararı)

### 1. E-posta doğrulanmıyor
Sistem hiç e-posta göndermiyor (SMTP bağlı değil), bu yüzden hesap doğrudan açılıyor (`email_confirm: true`).
Sonuç: biri **başkasının e-posta adresiyle** otel açabilir. Zararı sınırlıdır — açtığı otel boştur, kimsenin
verisine erişmez — ama o adresin gerçek sahibi ileride kaydolmak isterse "bu e-posta zaten kayıtlı" duvarına çarpar.
`docs/v1-1-notlari.md` · B1.

### 2. Deneme süresi takip edilmiyor
Vitrin "14 gün" diyor; sistemde deneme bitiş tarihi, uyarı veya kapanma yoktur. Açılan otel süresizdir.
Bu bir güvenlik açığı değil, **kaynak tüketimi** ve ticari bir açıktır. `docs/v1-1-notlari.md` · B2.

### 3. Sınır IP başınadır
Farklı adreslerden gelen toplu kayıt (bot ağı) engellenmez. Saatte 3 sınırı sıradan kötüye kullanımı keser;
kararlı bir saldırganı kesmez. Gerekirse captcha (`auth.captcha`) açılabilir — bugün gerekmiyor.

## Canlıya çıkmadan

- `KAYIT_SAYFASI_ORIGIN` ayarlanmalı; boşken kapı her adrese cevap veriyor (`*`).
- Kapı **anahtarsız** yayınlanmalı: `supabase functions deploy otel-ac --no-verify-jwt`.
- İlk kayıt denemesi Staging'de elle yapılmalı: otel açılıyor mu, kişi sahip olarak yazılıyor mu,
  panele düşüyor mu, ikinci kez aynı e-postayla denenince ne oluyor?
