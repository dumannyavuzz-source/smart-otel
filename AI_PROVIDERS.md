# AI_PROVIDERS.md — Harici AI Sağlayıcıları

> Bu belge, projede hangi AI sistemlerinin hangi rolde kullanıldığını ve bunların projeye nasıl dahil edildiğini tanımlar.

---

## 1. Temel İlke: Tek Genel Müdür, Çok Danışman

- **Claude Code**, projenin Genel Müdürü ve Baş Geliştiricisidir. Kod adı: `CODING_AI`.
- Tüm kod yazma, mimari karar, güvenlik denetimi ve proje yönetimi Claude Code'un sorumluluğundadır.
- Diğer AI sistemleri projeye **danışman** olarak dahil edilir. Kod yazmazlar, karar vermezler. Fikir, tasarım, görsel ve araştırma üretirler.

---

## 2. Dahil Etme Yöntemi: İnsan Aracılı (Human-in-the-loop)

Harici AI'lar projeye **doğrudan API ile bağlanmaz**. Aralarındaki köprü, Proje Sahibi'dir (insan).

Neden böyle?
- **Sadelik:** API entegrasyonu, anahtar yönetimi ve maliyet takibi gibi karmaşıklıklar projeye girmez.
- **Güvenlik:** Projeye ait hiçbir gizli bilgi üçüncü taraf API'lere otomatik olarak gitmez. Ne paylaşıldığını her zaman bir insan görür ve kontrol eder.
- **Kalite:** İnsan, harici AI'dan gelen cevabı Claude'a iletmeden önce süzer; kötü fikirler kapıdan içeri girmez.

---

## 3. Soyut Roller

Kod adları soyuttur: arkasındaki araç değişebilir, rol değişmez.

| Rol (Kod Adı) | Görev | Önerilen Araç |
|---|---|---|
| `CODING_AI` | Genel Müdür ve Baş Geliştirici. Planlar, kodlar, denetler, raporlar. | Claude Code |
| `DESIGN_UX_AI` | Tasarım ve kullanılabilirlik danışmanı. Ekran akışları, yerleşim, "5 yaşındaki çocuk" testi. | Gemini |
| `VISUAL_AI` | Görsel üretimi. İkon, illüstrasyon, logo, arka plan. | Midjourney / DALL-E |
| `RESEARCH_AI` | Rakip ve pazar analizi. Benzer ürünler, sektör pratikleri, kullanıcı beklentileri. | Perplexity |

---

## 4. İş Akışı (Adım Adım)

Örnek: Bir ekranın tasarımı gerekiyor.

1. **Claude durur, kod yazmaz.** Tasarım kararı bir danışmanın işidir; Claude tahmin yürütmez.
2. **Claude prompt hazırlar.** `DESIGN_UX_AI`'a sorulmak üzere çok detaylı bir istem yazar (bkz. Bölüm 5).
3. **Proje Sahibi promptu ilgili AI'a sorar.** (Gemini, Midjourney, Perplexity...)
4. **Proje Sahibi gelen cevabı Claude'a iletir.** Olduğu gibi ya da kendi yorumunu ekleyerek.
5. **Claude cevabı değerlendirir.** Proje anayasasına (`CLAUDE.md`) uyuyor mu? Sade mi? Güvenli mi?
   - Uyuyorsa **onaylar**.
   - Uymuyorsa gerekçesiyle geri bildirir ve düzeltilmiş yeni bir prompt hazırlar (2. adıma dönülür).
6. **Claude onaylanan fikri koda döker.**

Aynı akış `VISUAL_AI` (görsel istekleri) ve `RESEARCH_AI` (araştırma soruları) için de geçerlidir.

```
Genel Müdür ──talep──▶ Claude ──prompt──▶ Genel Müdür ──soru──▶ Harici AI
                         ▲                                          │
                         └────────── cevap ◀── Genel Müdür ◀────────┘
                         │
                    değerlendir → onayla → koda dök
```

---

## 5. Prompt Hazırlama Standardı

Claude'un harici AI'lar için hazırladığı her prompt şu bölümleri içerir:

| Bölüm | İçerik |
|---|---|
| **Bağlam** | Proje nedir? Bu istek neyin parçası? |
| **Hedef** | Tam olarak ne isteniyor? Tek cümleyle. |
| **Hedef kullanıcı** | Bu çıktıyı kim kullanacak? (örn. otel misafiri, resepsiyon görevlisi) |
| **Kısıtlar** | Proje kuralları: sadelik, 5 yaşındaki çocuk anlayabilmeli, güvenlik. |
| **Çıktı formatı** | Cevap nasıl gelmeli? (madde listesi, ekran açıklaması, görsel boyutu/stili...) |
| **Örnek** | Varsa iyi ve kötü örnek. |

**Gizlilik kuralı:** Prompt'a asla gizli bilgi (şifre, API anahtarı, kişisel veri, müşteri bilgisi) konulmaz.

---

## 6. Kayıt Tutma

- Harici AI'lara gönderilen önemli promptlar ve gelen cevaplar ilgili `docs/` klasöründe saklanır:
  - Tasarım çıktıları → `docs/ux/`
  - Araştırma çıktıları → `docs/decisions/` (karar gerekçesi olarak)
  - Mimariyi etkileyen bulgular → `docs/architecture/`
- Böylece "bu fikir nereden geldi?" sorusunun cevabı her zaman bulunabilir.
