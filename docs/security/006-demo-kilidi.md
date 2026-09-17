# 006 — Güvenlik: Demo Kilidi (Aşama 21)

> **Hazırlayan:** Orkestratör · **Tarih:** 2026-09-17 · **Durum:** Yazıldı, canlıya uygulanmayı bekliyor
> Kod: `supabase/migrations/20260917100000_demo_suresi.sql` · Denemeler: `supabase/tests/guvenlik_denemeleri.sql` · 25a–25e
> Karar: `docs/decisions/005-demo-suresi-ve-odeme-duvari.md`

---

## Neden bu belge var?

Ödeme duvarı bir **para kapısıdır**. Ekranda yazan "süreniz doldu" yazısı tek başına bir kilit değildir:
uygulamayı atlayıp doğrudan sunucuya yazmayı bilen biri, ekranı hiç görmeden çalışmaya devam edebilirdi.
Bu yüzden asıl kilit veritabanına kondu.

## Kilit nasıl çalışıyor?

| Konu | Karar |
|---|---|
| **Kilidin yeri** | Veritabanı. Ekran yalnızca nezakettir; sunucu süre dolmuş otelden hiçbir yazma kabul etmez. |
| **Ne durur?** | Yazma: yeni beyan, yeni oda/ürün/personel, iş emri ilerletme, onay, teslim. |
| **Ne durmaz?** | Okuma. Süresi dolmuş otel bütün geçmişini görmeye devam eder; **hiçbir veri silinmez.** |
| **Nasıl eklendi?** | Mevcut kilitlerin hiçbiri silinmedi veya değiştirilmedi. Üstlerine **kısıtlayıcı (restrictive)** birer kilit eklendi: eski kural da geçerlidir, yeni şart da. |
| **Tarihi kim değiştirir?** | Yalnızca ana anahtarla gelen biz. Otelin sahibi bile değiştiremez: bir kural (trigger) reddeder ve kurallar ana anahtarla bile atlanamaz. |
| **Bilinmezlik** | Otel bulunamazsa cevap boştur ve kilit **kapalı** kalır (fail-closed) — `docs/security/005` ile aynı desen. |
| **Yeni fonksiyonun yetkileri** | `demo_bitti_mi` için yetkiler açıkça yazıldı: `public` ve `anon` geri alındı, `authenticated` ve `service_role` verildi. Kilitler bu soruyu giriş yapmış kişinin adına sorar, bu yüzden `authenticated` çağırabilmelidir. (`docs/security/005` · staging dersi) |

## Bilerek dışarıda bırakılanlar

- **Misafir yorumları** (`guest_feedback`): misafirin yıldız vermesi otelin ödeme durumuna bağlı değildir.
  O kapı ana anahtarla çalışır ve etkilenmez.
- **Giriş yapmak**: süresi dolmuş otelin personeli yine girebilir — girince ödeme duvarını görür.
  Kişiyi kapıda bırakmak, ona ne olduğunu anlatmamak olurdu.

## Uygulamadaki iki incelik

1. **Telefonda bekleyen kayıtlar.** Süre dolduğunda giden kutusunda mektup kalmışsa sunucu onları reddeder.
   Mektuplar **silinmez**, telefonda bekler (postacı · kalıcı hata yolu). Paket seçilip süre uzayınca giderler.
   Uygulama kilitliyken postacı hiç başlatılmaz; boşuna kapı çalınmaz.
2. **Eski önbellek.** Telefonda demo tarihi bilinmeyen eski bir profil varsa uygulama **kilitlenmez**.
   Bilinmezlik yüzünden kimse çalışamaz hâle gelmemelidir; sunucu zaten kendi kilidini uygular.

## Canlıya çıkmadan

- Göç uygulanmalı: `supabase db push`.
- **Dikkat:** göç çalıştığı anda **var olan bütün oteller** 30 günlük süre alır.
  Staging için doğrudur; canlıda ödeme yapmış bir otel varsa süresi elle uzatılmalıdır.
- Denemeler koşulmalı: `supabase test db` (25a–25e demo kilidini sınar).
