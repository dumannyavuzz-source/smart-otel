# 006 — Kayıt Akışı (Otelini kendi açan müşteri)

> **Hazırlayan:** UX + Orkestratör · **Tarih:** 2026-09-16 · **Durum:** Genel Müdür onayı bekliyor
> Kod: `app/src/ekranlar/KayitEkrani.tsx`, `app/src/kayit.ts`, `supabase/functions/otel-ac/`. Dayanak: Aşama 20.

---

## Akış

```
Vitrin (oteldijital.com)
  "Otelimi Ücretsiz Başlat"
          │
          ▼
app.oteldijital.com/kayit        ← gece yarısı zemin, vitrinle aynı dil
  ┌─────────────────────────┐
  │ Otel adı                │
  │ Adınız soyadınız        │     Dört soru. Başka hiçbir şey sorulmaz:
  │ E-posta                 │     oda sayısı yok, telefon yok, kart yok, sihirbaz yok.
  │ Şifre                   │
  │  [ Otelimi Başlat ]     │
  └─────────────────────────┘
          │
          ▼  (arka planda, tek istekte)
  1. hesap açılır      2. otel açılır      3. kişi o otelin SAHİBİ yazılır
          │
          ▼
  kişi kendi şifresiyle giriş yapar  ──▶  Müdür Paneli (Ana Kumanda)
```

## Kararlar

- **Dört soru, tek düğme.** Oda sayısı, telefon, şehir, "nereden duydunuz" sorulmaz. Oda sayısı zaten
  sonra odalar girilirken belli olur; kayıt anında sorulan her fazladan soru bir vazgeçme sebebidir.
- **Sayfa uygulamanın dışındadır.** `/kayit` açıldığında oturum sorulmaz, postacı çalışmaz, panel nöbetçisi
  kurulmaz (`main.tsx`). Henüz hesabı olmayan birine uygulamanın makineleri çalıştırılmaz.
- **Vitrinle aynı görünüm.** "Sakin Lüks" (`DESIGN_SYSTEM.md` · 7.3): derin grafit zemin, serif başlık, şampanya düğme. Kişi bir sayfadan diğerine
  geçerken "başka bir yere mi düştüm?" diye düşünmemeli.
- **Kayıt kendine özel bir giriş yolu icat etmez.** Otel kurulduktan sonra kişi, az önce yazdığı şifreyle
  **normal giriş** yapar. Böylece tek bir giriş yolu vardır ve kayıt akışı güvenlik açısından ayrıcalıklı değildir.
- **Yarım otel diye bir şey yoktur.** Hesap açılır ama otel açılamazsa hesap geri silinir; otel açılır ama
  ilk sahiplik yazılamazsa otel de hesap da geri silinir. Geriye ya çalışan bir otel kalır ya da hiçbir şey.
- **E-posta zaten kayıtlıysa otel hiç açılmaz** ve kişiye "Giriş yapmayı deneyin" denir.
- **Şifre gizli yazılır.** Personel eklerken şifre görünür (müdür onu söylemek zorundadır); burada kişi
  kendi şifresini yazar, kimseye söylemeyecektir — bu yüzden `type="password"`.
- **Kurulum bitince kişi panele düşer.** "Hesabınız oluşturuldu, giriş yapın" diye ikinci bir kapı yoktur.
- **İnternet giderse kişi kaybolmaz.** Otel kurulduktan sonra giriş yapılamazsa ekran şunu söyler:
  "Oteliniz kuruldu ancak giriş yapılamadı. Giriş ekranından e-posta ve şifrenizle girin."

## Kayıttan sonra ne olur?

Kişi panele düşer ve **boş bir otel** görür: oda yok, personel yok, ürün yok. Bu, bilinçli bir başlangıçtır —
sistem ne yapacağını bildiği kadarını gösterir, hayali veriyle doldurmaz. İlk işleri: odaları girmek,
personeli eklemek, kontrol listesini yazmak.

> **Sonraki adım için not (V1.1):** panelde "otelinizi kurmaya başlayın" diye üç adımlık bir yol gösterici
> yoktur. Boş panel, yeni müşteriyi yalnız bırakır. `docs/v1-1-notlari.md` · B bölümüne eklenebilir.

## Yapmadıklarımız

| Düşünülen | Neden şimdi değil |
|---|---|
| Çok adımlı kurulum sihirbazı | Dört alan tek ekrana sığıyor. Adım eklemek vazgeçme oranını artırır. |
| Oda sayısını kayıtta sormak | Fiyat planı oda sayısına bağlı ama ödeme henüz yok; sormak bugün boşuna. |
| Google/Apple ile giriş | Yeni bir bağımlılık ve yeni bir güvenlik yüzeyi. E-posta + şifre bugün yetiyor. |
| Kayıt sonrası karşılama e-postası | Sistem hiç e-posta göndermiyor (SMTP bağlı değil). |
