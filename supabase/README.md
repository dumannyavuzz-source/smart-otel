# supabase/ — Ortak Beyin (veritabanı)

Bu klasör uygulamanın **kalbidir**: tablolar, kilitler ve kurallar burada yaşar.
Arayüz kodu burada değildir.

## Ne var?

| Dosya | Ne işe yarar? |
|---|---|
| `migrations/…_tablolar.sql` | Kutular (tablolar) ve oda durumu görünümü |
| `migrations/…_kurallar.sql` | Kurallar: beyan kilidi, imza, Maker-Checker, iş emri |
| `migrations/…_kilitler.sql` | Kilitler (RLS): kim neyi görür, neyi yazar |
| `migrations/…_fotograflar.sql` | Fotoğraf deposu ve kilitleri |
| `migrations/…_misafir_kapisi.sql` | Misafir yorumunu yazan tek veritabanı fonksiyonu (yalnızca ana anahtar çağırır) |
| `migrations/…_ariza_fotografi.sql` | Arıza fotoğrafı kuralı: yol otelin klasöründe, fotoğraf depoda olmalı |
| `migrations/…_cozum_fotografi.sql` | Teknisyenin çözüm fotoğrafı (sütun + kural) |
| `functions/guest-feedback/` | Misafir Kapısı (Edge Function): `index.ts` ince kabuk, `kapi.ts` saf mantık, `kapi_test.ts` testleri |
| `tests/guvenlik_denemeleri.sql` | 22 maddelik saldırı denemesi (hepsi reddedilmeli) |
| `scripts/ana_anahtar_taramasi.sh` | 22. deneme: ana anahtar kodda/git'te var mı? |
| `config.toml` | Yerel Supabase ayarları (şifre ≥ 8 karakter, fotoğraf ≤ 2 MB, açık kayıt kapalı, misafir kapısı anahtarsız) |

## Misafir Kapısı nasıl çalışır?

```
Misafir sayfası ──POST {oda_kodu, puan, yorum}──▶ guest-feedback (Edge Function)
                                                     │  biçim/tip/uzunluk denetimi
                                                     │  ana anahtarla TEK çağrı:
                                                     ▼
                                          misafir_yorumu_yaz (veritabanı)
                                                     │  kod → otel + oda (kapalı oda = yok)
                                                     │  dakikada en fazla 3 yorum
                                                     ▼
                                               guest_feedback 🔏
```

- Misafir giriş yapmaz, anahtar taşımaz. Kod yanlışsa cevap hep aynıdır: **"Bu bağlantı geçersiz."**
- Ana anahtar yalnızca sunucuda (`SUPABASE_SERVICE_ROLE_KEY`, Supabase kendisi verir). Kodda, telefonda, git'te yok.
- Kapının testleri: `deno test supabase/functions/guest-feedback/`

Dayanak belgeler: `docs/decisions/002-database-architecture.md`, `docs/security/001-rls-and-maker-checker.md`.

## Nasıl çalıştırılır? (Docker + Supabase CLI gerekir)

```bash
supabase start        # yerel Supabase'i başlatır
supabase db reset     # tabloları, kuralları, kilitleri kurar
supabase test db      # güvenlik denemelerini çalıştırır — hepsi "ok" olmalı
bash supabase/scripts/ana_anahtar_taramasi.sh   # 22. deneme
```

## Yeni tablo eklerken (istisnasız)

1. `hotel_id` sütunu
2. Kilit sistemi açık + her işlem için kilit (`kilitler.sql`)
3. Beyan tablosuysa: `beyan_kilidi` + `yazani_doldur` kuralları (`kurallar.sql`)
4. `tests/guvenlik_denemeleri.sql` içine en az bir saldırı denemesi

Üçü olmadan tablo yoktur. Security kod incelemesinde bunu ilk sorar.
