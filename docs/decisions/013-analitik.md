# 013 — Çerezsiz Analitik, Kendi Alan Adımız Üzerinden (denetim · Madde 5)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Kod hazır, **ölçüm HENÜZ AÇIK DEĞİL.** Açmak için tek adım kaldı: hesap (aşağıda).
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 5
> Kod: `vitrin/olcum.js`, `vitrin/etkilesim.js` (iki haber), `vercel.json` (`rewrites`)

---

## Durum

Sitede hiçbir ölçüm yoktu: kaç ziyaretçinin geldiği, kaçının "30 Gün Ücretsiz Dene"ye bastığı, formu
kaç kişinin yarıda bıraktığı bilinmiyordu. Denetim bunu kritik saydı çünkü **bu madde kapanmadan
diğer maddelerin etkisi ölçülemez.**

## Karar

Çerezsiz, gizlilik odaklı bir sayaç ve sayaç **kendi alan adımız üzerinden** sunulur.
**Sağlayıcı: Umami**, ücretsiz bulut katmanıyla başlanıyor (Genel Müdür kararı, 2026-09-21).
Plausible de aynı kodla çalışır; `olcum.js` ikisini de tanır, değişen yalnızca iki yönlendirme hedefidir.

### En önemli kısım: CSP'ye tek karakter eklenmedi

İçerik güvenlik politikamız `script-src 'self'` der — sayfa yalnızca kendi alan adından betik yükler.
Üçüncü parti bir sayaç normalde bu satırı gevşetmeyi gerektirir. Gerekmedi:

| Ne | Nereden ister | Nereye gider |
|---|---|---|
| Sayaç betiği | `/istatistik/script.js` (kendi alan adımız) | `cloud.umami.is/script.js` |
| Olay bildirimi | `/istatistik/api/send` (kendi alan adımız) | `cloud.umami.is/api/send` |

Tarayıcı üçüncü parti bir adrese **hiç bağlanmaz**. `script-src 'self'` ve `connect-src 'self'`
olduğu gibi kalır. `unsafe-inline` de eklenmedi: Plausible'ın normalde sayfaya satır içi yazılan
kuyruk satırı `olcum.js` dosyasının içine alındı.

### Ölçülen olaylar

Denetimin istediği sekiz olay:

| Olay | Nasıl yakalanır |
|---|---|
| Sayfa görüntüleme | Sayaç betiği kendiliğinden |
| Fiyat sayfası görüntüleme | Aynı — `/fiyatlandirma` sayfa görüntülemesi |
| Birincil CTA tıklaması | `Deneme kaydı` · **hangi bölümden geldiği** `bolum` özelliğinde (`#nedir`, `#tarife`, `ust-cubuk`…) |
| `/kayit` yönlendirmesi | Aynı olay — birincil CTA zaten oraya gider |
| `Giriş Yap` tıklaması | `Giriş yap` |
| İletişim formu başlangıcı | `Form başladı` — ilk tuşa basıldığında, bir kez |
| İletişim formu gönderimi | `Form gönderildi` — **yalnızca sunucu kabul edince** |
| `mailto` ve `tel` tıklaması | `E-posta` · `Telefon` (ayrıca `WhatsApp`) |

Ek olarak `İletişime git` ve `Fiyatlara git` sayılır: hizmet sayfalarındaki "Bilgi Al" / "Teknik
Destek Al" düğmelerinin çalışıp çalışmadığı ancak böyle görülür.

### İki tasarım kararı

1. **Form olayları `etkilesim.js`'ten haber olarak çıkar.** O dosya yalnızca "oldu" der
   (`oteldijital:form-basladi`, `oteldijital:form-gonderildi`); sayan taraf `olcum.js`'tir.
   Ölçüm tamamen kaldırılsa bile formun işleyişi değişmez.
2. **Tuzağa düşen bot gönderim sayılmaz.** Honeypot dolu olduğunda form "alındı" ekranını gösterir
   ama sunucuya hiçbir şey gitmez; haber de yalnızca sunucu kabul ettiği yerde verilir. Aksi hâlde
   dönüşüm sayısı botlarla şişerdi.

## Ölçümü açmak için kalan tek adım

Bugün sayfalara **sayaç etiketi eklenmedi.** Sebep: hesap yokken etiket koymak, her ziyaretçiye
hiçbir işe yaramayan iki istek yükler ve sitenin 23 KB / 6 istek çizgisini bozardı.

1. Umami Cloud'da site açın ve **site kimliğini** (website id) alın.
2. Dokuz sayfanın `</body>` satırından önce iki satır eklenir:
   ```html
   <script defer src="/istatistik/script.js" data-website-id="SITE-KIMLIGI"
           data-host-url="https://SITENIN-SUNULDUGU-HOST/istatistik"></script>
   <script src="/olcum.js" defer></script>
   ```

   > **`data-host-url` sitenin sunulduğu host olmalı.** Olay bildirimi bir POST isteğidir; yanlış
   > host yazılırsa yönlendirmeye takılır ve gövdesi düşebilir, olaylar sessizce kaybolur.
   > **Bu tuzak Madde 8 ile kapandı:** kanonik host artık tek ve `www.oteldijital.com`
   > (`docs/decisions/016-host-birligi-ve-yapilandirilmis-veri.md`). Etikete
   > `https://www.oteldijital.com/istatistik` yazılacak.

3. Sağlayıcı değişirse yalnızca `vercel.json` içindeki iki yönlendirmenin hedefi değişir;
   `olcum.js` aynı kalır (dosyadaki `gonder()` hem Umami hem Plausible tanır).
4. Çerez politikası sayfası yazılırken **çerez kullanılmadığı** yazılmalıdır. Bugün o sayfa
   "Çok yakında" iskeleti olduğu için çelişki yok; metin yazılınca bu kural unutulmamalı
   (`docs/decisions/008` · Ek).

## Kabul kriterleri ve bugünkü durum

| Denetimin şartı | Durum |
|---|---|
| Analitik paneli canlı trafiği gösteriyor | ⏳ Hesap açılınca |
| Sekiz olay panelde ayrı ayrı görünüyor | ⏳ Hesap açılınca |
| CSP'de `script-src` hâlâ `'self'`, `unsafe-inline` yok | ✅ Doğrulandı |
| Toplam sayfa ağırlığı artışı ≤ 5 KB | ✅ `olcum.js` 4,5 KB ham / ~1,3 KB sıkıştırılmış; sayaç betiği ~1,5 KB. Vercel sıkıştırarak sunar  |
| Çerez politikası fiilen kullanılan teknolojiyle tutarlı | ✅ Bugün çelişki yok; metin yazılırken kural yukarıda |

## Yayından sonra doğrulanacak

`rewrites` kuralları dosya sisteminden **sonra** çalışır; `/istatistik/...` adında bir dosya
olmadığı için yönlendirme devreye girer. `cleanUrls` ile birlikte davranışın beklendiği gibi
olduğu canlıda görülmelidir (dağıtım listesi · 6.13).
