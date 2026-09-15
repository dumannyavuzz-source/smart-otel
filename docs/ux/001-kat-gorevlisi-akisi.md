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

## Genel Müdür kararları (2026-09-15, Aşama 14 başında onaylandı)

1. **Ürün listesi:** personel ekranında **en fazla 8 ürün** (sınır müdür panelinde uygulanır).
2. **Sorun bildirimi:** **fotoğraf ana yol**, not isteğe bağlı. (Aşama 14'te uygulandı — aşağıda.)
3. **Acil arıza türü:** sahadan veri gelene kadar **eklenmez**; müdür iş emrinde acile çevirir.
4. **Çıkış butonu:** **Müdür Paneli aşamasında** çözülecek.

## Fotoğraf adımı (Aşama 14)

```
Ne oldu? ──▶ [🔧 Bir şey bozuk | 🐜 Böcek var] ──▶ Tek ekran:
                                                  ┌────────────────────────┐
                                                  │  📷 Fotoğraf Çek (dev) │  ← telefonun kendi kamerası
                                                  │  Not (isteğe bağlı)    │
                                                  │  Fotoğrafsız Gönder    │  ← kamera açılmazsa yol kapanmaz
                                                  └────────────────────────┘
                     fotoğraf çekilince: küçük önizleme + "Yeniden çek", buton yeşil "✅ Gönder" olur
```

- Kamera, telefonun kendi kamera uygulamasıdır (galeri yok, düzenleme yok). Fotoğraf telefonda küçültülür (en uzun kenar 1280 px, JPEG; ~200–600 KB).
- Gönder'e basınca fotoğraf + kayıt **tek seferde** telefona yazılır; ekran anında ✓ der. İnternet beklenmez.
- Postacı: **önce fotoğraf, sonra kayıt**. Yüklenen fotoğraf telefondan silinir. Yarım kalan yükleme tekrar denenir; aynı fotoğraf sunucuya iki kez gitmez.
- Tepside 50 fotoğraf birikirse ekran "Bekleyen fotoğraf çok. İnternete bağlanın." der; sorun yine fotoğrafsız bildirilebilir.
- Gönder'e çift dokunma ikinci kayıt oluşturmaz (tüm gönderme butonlarında). Fotoğraf hazırlanırken Gönder kilitlidir.

## QA (Hata Avcısı) denetiminden çıkan kararlar (Aşama 14)

- **Sıra saate değil, sıra numarasına göre:** aynı milisaniyede yazılan veya saati geri alınan telefonda mektuplar karışmaz.
- **Ortak telefon:** her beyan yazan kişinin kimliğiyle etiketlenir; postacı yalnızca giriş yapmış kişinin beyanlarını gönderir. Ayşe'nin beyanı Mehmet'in imzasıyla gitmez. Ana ekran: "Başka kullanıcının 3 bekleyen kaydı var".
- **Bodrumda bir saatten uzun internetsiz kalınca** uygulama giriş ekranına düşmez; telefondaki oturum geçerli sayılır (gerçek kilit sunucudadır).
- **Kesin reddedilen kayıt** (kilit/kural) 3 denemeden sonra 10 dakikada bir denenir — mobil veri boşa gitmez; ana ekran "1 kayıt gönderilemedi. Müdürünüze haber verin." der.
- **Kamera:** QR ekranından kamera açılmadan çıkılsa da kamera kapatılır.
- **Oda bulunamazsa** "Eksik Var" ve "Sorun Bildir" ekranları da "Oda bulunamadı" der; sessiz kalmaz.
- **Telefona yazılamazsa** (dolu depo, özel mod) "Kaydedilemedi. Tekrar deneyin." — buton donmaz.
- **Ölü Wi-Fi:** istekler 60 saniyede zaman aşımına uğrar; postacı asılı kalmaz.
- **Sunucu tarafı:** arıza fotoğrafının yolu otelin klasöründe olmalı ve fotoğraf depoda bulunmalı (veritabanı kuralı, teslimattakiyle aynı).
- **Ertelenen (düşük):** fotoğraf çekip "Geri" basınca fotoğraf sessizce silinir; taslak saklama ileride değerlendirilecek.
