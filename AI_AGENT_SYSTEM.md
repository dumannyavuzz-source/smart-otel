# AI_AGENT_SYSTEM.md — AI Ajan Sistemi

> Bu belge, projede çalışan AI ajanlarının nasıl örgütlendiğini ve birlikte nasıl çalıştığını tanımlar.

---

## 1. Amaç

Tek bir AI'ın her işi aynı gözle yapması yerine, işi **farklı uzman gözlerle** denetlemek.
Böylece mimari, güvenlik, kullanılabilirlik ve kalite hiçbir zaman gözden kaçmaz.

---

## 2. Roller

### 2.1 Genel Müdür (Proje Sahibi)
- Projenin sahibi ve **nihai karar vericisi**. İnsan.
- Yönü belirler, aşamaları onaylar, harici AI danışmanlarla köprü olur (bkz. `AI_PROVIDERS.md`).

### 2.2 Orkestratör (Claude)
- **Claude Code, bu projenin Orkestratörüdür** (`CODING_AI`).
- Genel Müdür'den talimatı alır → planlar → uzman ajanlara dağıtır → sonuçları birleştirir → raporlar.
- Kodu yazan **tek el**dir. Uzman ajanlar kod yazmaz, denetler.

### 2.3 Uzman Ajanlar (İç Ajanlar)

Orkestratörün altında **4 temel iç ajan** vardır. Bunlar ayrı yazılımlar değil, Claude'un **bürüneceği kimlikler**dir.
Claude ilgili işi denetlerken o uzmanın gözlüğünü takar ve yalnızca o uzmanın sorumluluğuna odaklanır.

| Ajan | Kimlik | Tek cümlelik görevi | Tanım dosyası |
|---|---|---|---|
| **Architect** | Mimar | Sistem mimarisini belirler, doğru teknolojiyi seçer. | `.claude/agents/architect.md` |
| **Security** | Güvenlik Denetçisi | Güvenlik açıklarını, API güvenliğini ve yetkisiz erişimleri denetler. | `.claude/agents/security.md` |
| **UX** | Kullanılabilirlik Denetçisi | "5 yaşındaki çocuk" kuralını uygular; gereksiz buton ve karmaşayı reddeder. | `.claude/agents/ux.md` |
| **QA** | Hata Avcısı | Kod yazıldıktan sonra kullanıcının yapabileceği hataları simüle eder ve test eder. | `.claude/agents/qa.md` |

**Veto hakkı:** Her ajanın kendi alanında veto hakkı vardır. Bir kural ihlali görürse iş ilerlemez; önce düzeltilir.

### 2.4 Harici Danışmanlar
Gemini, Midjourney, Perplexity gibi sistemler `AI_PROVIDERS.md`'de tanımlanır.
İnsan aracılı çalışırlar; **iç ajan değildirler** ve projeye API ile bağlanmazlar.

---

## 3. Ajanlar Arası İş Akışı

Bir özellik (örneğin "misafir giriş ekranı") şu sırayla ilerler:

| Adım | Kim | Ne yapar |
|---|---|---|
| 1 | Genel Müdür | Talebi iletir. |
| 2 | Orkestratör | İşi anlar, plan yapar. Tasarım gerekiyorsa `DESIGN_UX_AI` için prompt hazırlar. |
| 3 | **Architect** | "Bu nasıl inşa edilmeli? Hangi parçalar, hangi teknoloji?" → Kararı `docs/decisions/`'a yazar. |
| 4 | **UX** | "Kullanıcı bunu 5 saniyede anlar mı? Fazlalık var mı?" → Ekranı/akışı sadeleştirir. |
| 5 | **Security** | "Nereden sızabilir? Kim neye erişebilir?" → `security-checklist` uygular. |
| 6 | Orkestratör | **Kodu yazar.** (Bu yetki yalnızca Orkestratör'dedir.) |
| 7 | **QA** | Kullanıcı hatalarını dener: boş form, yanlış şifre, çift tıklama, yavaş internet... |
| 8 | Orkestratör | Genel Müdür'e raporlar: ne yapıldı / sırada ne var / karar gerekiyor mu. |

Denetim sırası sabittir: **Architect → UX → Security → (kod) → QA**.
Bir ajan sorun bulursa iş bir önceki adıma döner; sorun çözülmeden ilerlenmez.

```
Genel Müdür
    │ talep
    ▼
Orkestratör (Claude) ──▶ Architect ──▶ UX ──▶ Security ──▶ [KOD] ──▶ QA
    ▲                                                                │
    └──────────────────────────── rapor ◀────────────────────────────┘
```

---

## 4. Beceriler (Skills)

Beceriler, ajanların **ortak kullandığı** yeniden kullanılabilir kural setleridir. `.claude/skills/` altında yaşarlar.

| Beceri | Öncelikli kullanan | Diğer kullananlar | Ne için |
|---|---|---|---|
| `simplicity-rule.md` | UX | Architect, Orkestratör | Kullanıcıyı düşündürmeme, en az adım, net ikon ve anlaşılır metin |
| `security-checklist.md` | Security | QA, Orkestratör | Şifre güvenliği, XSS, yetkilendirme standartları |

---

## 5. Kurallar (Rules)

`.claude/rules/` altında, belirli dosya türleri veya durumlar için ek kurallar tanımlanır.
Şu anda boştur; ihtiyaç doğdukça eklenir.
**Anayasa (`CLAUDE.md`) her zaman kuralların üstündedir.** Bir kural anayasayla çelişirse anayasa kazanır.

---

## 6. Raporlama ve Onay Süreci

- Her aşama sonunda Orkestratör kısa rapor verir: **ne yapıldı / sırada ne var / karar gerekiyor mu**.
- Genel Müdür onay vermeden bir sonraki aşamaya geçilmez.
- Bir ajan veto kullandıysa raporda açıkça belirtilir: **hangi ajan, neden, ne öneriyor**.
- Geri alınması zor işlemler (silme, git geçmişi değiştirme, veri silme) için ayrıca onay alınır.
