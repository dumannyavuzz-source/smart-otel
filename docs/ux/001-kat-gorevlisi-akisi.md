# 001 — Kat Görevlisi Akışı (ekranlar)

> **Hazırlayan:** UX + Orkestratör · **Tarih:** 2026-09-15 · **Durum:** Genel Müdür onayı bekliyor
> Kod: `app/src/ekranlar/`. Kural seti: `.claude/skills/simplicity-rule.md`.

---

## Akış

```
Giriş ──▶ Ana Ekran ──▶ QR Okut ──▶ Oda 204 ──┬─▶ Eksik Var ──▶ Ne eksik? ──▶ Kaç tane? ──▶ ✓ ──▶ Oda 204'e Dön
        (tek buton)   (kamera)    (liste)     ├─▶ Sorun Bildir ──▶ Ne oldu? ──┬─ Böcek var ─────▶ ✓ ──▶ Oda 204'e Dön
                                              │                             └─ Bir şey bozuk ─▶ Ne bozuk? ─▶ ✓ ──▶ Oda 204'e Dön
                                              └─▶ Oda Hazır ─────────────────────────────────────▶ ✓ ──▶ Ana Ekran
```

En sık iş: **QR Okut → tikle → Oda Hazır** = 3 dokunuş. Eksik bildirmek odadan çıkarmaz; görevli odaya döner, QR'ı yeniden okutmaz.

## Ekranlar (tek cümleyle)

| Ekran | Soru | Tek ana eylem |
|---|---|---|
| Giriş | — | **Giriş Yap** |
| Ana Ekran | — | **QR Okut** (devasa). Altta yalnızca gerekirse: "3 bildirim internet gelince gönderilecek" |
| QR Okut | "QR'ı çerçeveye getirin" | (kamera; kod telefonda çözülür) |
| Oda 204 | Temizlik listesi (≤ 10 madde, büyük tik satırları) | **Oda Hazır** (yeşil) + iki ikincil: Eksik Var · Sorun Bildir. Üç buton alta sabit, liste uzasa da görünür |
| Ne eksik? | Ürün listesi (metin, ikonsuz) | ürüne dokun |
| Kaç tane? | − 1 + | **Gönder** |
| Ne oldu? | 🔧 Bir şey bozuk · 🐜 Böcek var | dokun (Böcek var anında gider) |
| Ne bozuk? | kısa not | **Gönder** |
| ✓ Tamam | "Oda 204 hazır" / "Eksik bildirildi: 2 × Havlu" | **Oda 204'e Dön** veya **Ana Ekran** |

## Kararlar (UX denetiminden çıkan)

- **Sorun türleri Blueprint'e hizalandı:** Arıza / Haşere (3.1 · madde 4). Ekranda sade sözler: "Bir şey bozuk", "Böcek var".
  Haşere → **acil**, notsuz, tek dokunuş. Arıza → **normal** (müdür acile çevirir), kısa not istenir; not olmadan teknisyen ne bozuk bilemez.
- **Tamam ekranı geldiği yere göre döner:** eksik/sorun sonrası odaya, "Oda Hazır" sonrası ana ekrana.
- **Butonlar alta sabit** (Oda ekranı): 10 maddelik liste + 3 buton bir telefon ekranına sığmaz; butonlar kaybolmaz.
- **İkincil adımda "← Geri" bir önceki soruya döner** (odaya değil).
- **Giriş ekranı interneti ayırt eder:** "İnternet yok. Bağlanıp tekrar deneyin." — hesap var/yok yine söylenmez.
- **Yarım kalan tikler** telefon uygulamayı kapatsa da durur (localStorage); "Oda Hazır" denince silinir.
- **Ürün listesinde ikon yok:** hepsi aynı ikonu taşıyacaktı; anlam taşımayan ikon süs sayılır.
- **"QR" kısaltması** korundu: Genel Müdür talimatı ("QR Okut") kural 4.2'nin önündedir.

## Genel Müdür kararı bekleyen sorular

1. **Ürün listesi uzunluğu:** Müdür 20 ürün girerse "Ne eksik?" uzun bir liste olur. Sınır (örn. en fazla 8) ya da gruplama (Banyo / Yatak / Minibar) ister misiniz? Öneri: müdür paneli aşamasında **en fazla 8 ürün** sınırı.
2. **Arıza notu mu, fotoğraf mı:** Blueprint fotoğraf diyor; bu aşamada fotoğraf yok, kısa not var. Fotoğraf gelince not kalksın mı, ikisi de kalsın mı? Öneri: fotoğraf gelince **not isteğe bağlı kalsın**, fotoğraf ana yol olsun.
3. **Acil arıza türü:** "Su baskını" gibi acil arızalar şu an "Bir şey bozuk" → normal (2 saat) olarak açılır; müdür acile çevirir. Üçüncü bir tür ("Su var" → acil) eklensin mi? Öneri: sahadan veri gelene kadar **eklenmesin**; müdür panelinde tek dokunuşla acile çevirme yeterli.
4. **Çıkış (logout) butonu:** Ana ekranda talimat gereği yok. Ortak telefonlarda personel değişimi için bir yol gerekecek. Öneri: Giriş/çıkış işini **müdür paneli aşamasında** ele alalım.
