# 001 — Güvenlik Planı: Otel Kilitleri (RLS) ve Maker-Checker

> **Hazırlayan:** Security · **Tarih:** 2026-09-15 · **Durum:** Genel Müdür onayı bekliyor
> Bu belge **kod yazılmadan önce** hazırlandı. Kod yazıldıktan sonra Security, bu belgenin sonundaki test listesiyle aynı kilitleri tek tek dener.
> Dayanak: `docs/decisions/001-tech-stack.md` ve `docs/decisions/002-database-architecture.md` (onaylı).

---

## Bu belge neyi korur?

İki soruya kesin cevap verir:
1. **Oteller birbirini nasıl göremez?** Kat görevlisi ile müdürün sınırı nerede biter?
2. **Aynı kişi hem talep edip hem onaylayamaz** — bunu ekran değil, veritabanı nasıl engeller? "Teslim Aldım" beyanı nasıl **imza** olur, nasıl **değiştirilemez** olur?

Security'nin varsayılan tutumu: **Uygulama koduna güvenmiyoruz.** Telefon çalınabilir, uygulama kurcalanabilir, kodda hata olabilir. Bu yüzden her kilit **dolabın içinde** (veritabanında) durur, kapıcıda (uygulamada) değil.

---

## Sözlük (beş kelime, tek cümle)

| Kelime | Ne demek? |
|---|---|
| **Kart** (JWT) | Giriş yapınca giriş sisteminin verdiği, üzerinde "kimsin?" yazan **imzalı** kimlik. Uygulama bunu değiştiremez, sahtesini yazamaz. |
| **Kilit** (RLS politikası) | Her tablo için veritabanının kendi sorduğu soru: "Bu satırı **bu kartın sahibi** görebilir mi, yazabilir mi?" |
| **Kural** (trigger) | Bir kayıt yazılırken/değiştirilirken veritabanının **otomatik** yaptığı kontrol. Tutmazsa kaydı reddeder. |
| **Kapı anahtarı** (anon key) | Herkese açık anahtar; telefondaki uygulamada durur. **Tek başına hiçbir çekmeceyi açmaz**; ancak kartla birlikte, kilitlerin izin verdiği kadarını açar. |
| **Ana anahtar** (service key) | Her kilidi açan anahtar. **Yalnızca sunucuda** (Edge Function ortam değişkeni). Telefonda yok, kodda yok, git'te yok. |

---

## Bölüm 1 — Beş Temel İlke

1. **Kilit dolabın içinde.** Bir otel diğerini göremez; bunu uygulama kodu değil, veritabanı garanti eder. Kodda hata olsa da geçerli.
2. **Varsayılan: kapalı.** Her tabloda kilit sistemi açık. Kilit yazılmamış tablo = kimse giremez. Erişim açıkça **verilir**, kapatılmaz.
3. **"Kimsin?" sorusunu telefon cevaplamaz.** Kim olduğunu **kart** söyler. Uygulama "ben Ayşe'yim" diyemez; veritabanı kartı okur.
4. **Otel bilgisine telefonun sözüyle güvenilmez.** Telefon "bu kayıt Otel A'nın" dese de veritabanı "sen Otel A'nın üyesi misin?" diye **kendisi** bakar.
5. **Beyan = imza.** Bir kez yazılır, hiç değişmez, hiç silinmez. Kim, ne zaman, ne — üçü de kilitlenir.

---

## Bölüm 2 — RLS: Oteller Birbirini Nasıl Göremez?

### 2.1 Tek soru, her kilitte aynı
Bütün kilitler tek bir yardımcı soruya dayanır:

> **"Kartın sahibi, bu satırın otelinde üye mi? Rolü ne?"**

Cevap `memberships` tablosundan gelir (kişi ↔ otel ↔ rol). Bu soruyu soran küçük bir yardımcı (`rol_nedir(hotel_id)`) yazılır; her tablodaki her kilit ona sorar. Yardımcı yalnızca **kartın sahibinin kendi satırlarına** bakar; başka kimseninkine bakamaz.

Sonuç: Otel A'nın görevlisi Otel B'nin bir satırını sorduğunda yardımcı "üye değil" der → satır **yokmuş gibi** olur. Okuyamaz, yazamaz, var olduğunu bile bilemez.

### 2.2 Roller (üç tane, fazlası yok)
| Rol | Kim | Kısaca ne yapar |
|---|---|---|
| `staff` | Kat görevlisi, teknisyen, depo görevlisi | Beyan yazar, talep açar, kendi işini görür |
| `manager` | Kat şefi, otel müdürü, satın alma yetkilisi | Her şeyi görür, onaylar, otel ayarlarını yönetir |
| `owner` | Otel sahibi / zincir | Müdürün yapabildiği her şey + müdür atar |

Giriş yapmayan **misafir** ve bizim **Smartotel ekibimiz** rol değildir; ikisinin de tablolara doğrudan yolu yoktur (bkz. Bölüm 5).

### 2.3 Kilit Tablosu — her kutu için kim ne yapabilir?
"Üye" = o otelde herhangi bir rolü olan kişi. "—" = **kimse**, hiçbir rol, uygulamadan asla.

| Kutu | Okuma | Ekleme | Değiştirme | Silme |
|---|---|---|---|---|
| `hotels` | üye | — (Smartotel ekibi, kayıt altında) | owner: ad, saat dilimi | — |
| `memberships` | staff: yalnızca kendi satırı · manager/owner: otelin tümü | owner: manager + staff ekler · manager: yalnızca staff ekler | — (rol değişikliği = çıkar + yeniden ekle; **kendi rolünü kimse değiştiremez**) | owner/manager — ama **kendini kimse silemez** |
| `rooms` | üye | manager/owner | manager/owner (misafir kodunu yenileme dahil) | — (oda "kapalı" işaretlenir) |
| `checklist_templates` | üye | manager/owner | manager/owner | — (pasif işaretlenir) |
| `products`, `suppliers` | üye | manager/owner | manager/owner | — (pasif işaretlenir) |
| `room_cleanings` 🔏 | üye | üye | — | — |
| `supply_reports` 🔏 | üye | üye | — | — |
| `issue_reports` 🔏 | üye | üye | — | — |
| `work_orders` | üye | kural açar (arıza bildirilince otomatik) · manager/owner elle | staff: yalnızca "Aldım" ve "Çözdüm" (bkz. 2.5) · manager/owner: tür, süre, atanan — **iş açıkken** | — |
| `purchase_requests` | staff: kendi talepleri + **onaylanmış** talepler (teslim alabilmek için) · manager/owner: tümü | üye | — (durumu **kural** günceller, el değmez) | — |
| `approvals` 🔏 | manager/owner | manager/owner + Maker-Checker kuralları (Bölüm 3) | — | — |
| `deliveries` 🔏 | staff: kendi teslimleri · manager/owner: tümü | üye + Maker-Checker kuralları (Bölüm 3) | — | — |
| `guest_feedback` 🔏 | manager/owner | — (yalnızca misafir Edge Function'ı, ana anahtarla) | — | — |
| **Fotoğraflar** (Storage, yol `hotel_id/...`) | üye — yalnızca kendi otelinin klasörü | üye — yalnızca kendi otelinin klasörüne | — | — |

🔏 = **Beyan tablosu.** Değiştirme ve silme, rol ne olursa olsun **kural** ile reddedilir (Bölüm 4).

### 2.4 Kat görevlisi ile müdürün sınırı — tek bakışta
| | Kat görevlisi (`staff`) | Müdür (`manager`) |
|---|---|---|
| Kendi otelinin odalarını, listelerini, ürünlerini görür | ✅ | ✅ |
| Beyan yazar (oda hazır, eksik, arıza, teslim aldım) | ✅ | ✅ |
| Satın alma talebi açar | ✅ | ✅ |
| Başkasının talebini / teslimini görür | ❌ | ✅ |
| Talep onaylar / reddeder | ❌ | ✅ (kendi talebi hariç) |
| Misafir yorumlarını görür | ❌ | ✅ |
| Oda, liste, ürün ekler / düzenler | ❌ | ✅ |
| Personel ekler / çıkarır | ❌ | ✅ (yalnızca staff) |
| Müdür atar | ❌ | ❌ (yalnızca owner) |
| Bir beyanı değiştirir veya siler | ❌ | ❌ |
| Başka bir otelin herhangi bir şeyini görür | ❌ | ❌ |

### 2.5 Tek "değişen" kutu: `work_orders`
Beyanlar değişmez; ama bir iş emrinin "kimde?" ve "durumu ne?" bilgisi değişir. Bunun için dar kurallar:
- **Görevli** yalnızca iki şey yapabilir: sahipsiz bir işi **"Aldım"** (atanan = kendisi) ve kendi işini **"Çözdüm"**. Başka hiçbir alana dokunamaz.
- **Müdür/sahip**, iş **açıkken** tür (acil/normal), son süre ve atananı değiştirebilir.
- **"Çözdüm"** denince kim + saat veritabanınca yazılır ve satır **kilitlenir**: bir daha kimse değiştiremez. Yani "çözdüm" de bir imzadır.
- "Çözdüm" imzasını **yalnızca işin atandığı kişi** atar — müdür dahil (müdür bir işi kendisi çözecekse önce kendine atar, sonra çözer). Kimse başkasının adına "çözdüm" diyemez.
- **Çözüm fotoğrafı** (isteğe bağlı) yalnızca "Çözdüm" derken eklenir; yolu otelin klasöründe olmalı ve fotoğraf depoda bulunmalı (arıza fotoğrafıyla aynı kural).

### 2.6 "id=5 → id=6" denemesi neden işe yaramaz?
Uygulama Otel B'nin bir oda kimliğini istese bile kilit önce "üye misin?" sorar. Değilse cevap **boş** döner — "yasak" bile demez. Saldırgan, o kaydın var olup olmadığını dahi öğrenemez.

### 2.7 "Bu kayıt Otel A'nın" yalanı neden tutmaz?
Telefon, gönderdiği her satıra `hotel_id` yazar. Kilit, yazma anında "kartın sahibi **bu** otelin üyesi mi?" diye bakar. Otel A'nın görevlisi `hotel_id = B` yazarsa kayıt **reddedilir**.

### 2.8 "Bunu Ayşe yazdı" bilgisini telefon değil, veritabanı yazar
Beyan tablolarındaki **"kim yazdı"** (`created_by`) alanını telefon göndermez; **veritabanı kartı okur ve kendisi doldurur**. Telefon bir değer gönderse bile üzerine yazılır. Kimse başkasının adına beyan yazamaz.

### 2.9 Anahtarların yeri
| Anahtar | Nerede durur | Nerede **asla** durmaz |
|---|---|---|
| Kapı anahtarı | Telefondaki uygulamada (herkese açık olması normaldir) | — |
| Ana anahtar | Yalnızca Edge Function'ın gizli ortam değişkeninde | Uygulama kodu, telefon, git, mesajlaşma |

Ana anahtar bir yere sızarsa **hemen yenilenir**. Bu bir prosedürdür, tartışma değil.

---

## Bölüm 3 — Maker-Checker: Aynı Kişi Hem Talep Edip Hem Onaylayamaz

### 3.1 Üç adım, üç kişi, üç imza
```
1. TALEP (Maker)          2. ONAY (Checker)          3. TESLİM (Beyan)
   Görevli Ayşe              Müdür Mehmet               Depo Ali
   "20 havlu lazım"    →     "Onaylıyorum"        →     "18 geldi" + fatura fotoğrafı
   purchase_requests         approvals 🔏               deliveries 🔏
```
Her adımda **kim** ve **ne zaman**, kartı okuyan veritabanınca yazılır. Ekran sadece butonu gösterir; kararı veritabanı verir.

### 3.2 Kilit 1 — Onaylayan ≠ Talep eden
`approvals` tablosuna yazılırken **kural** şunu yapar:
1. Kartı okur → onaylayan kişi bulunur. (Telefonun "onaylayan = Mehmet" demesi **sayılmaz.**)
2. Talebi bulur → talep edeni okur.
3. İkisi **aynı kişiyse** → **REDDET.**

Mehmet kendi talebini açıp kendi telefonundan "Onayla"ya bassa bile kayıt veritabanından geri döner. Ekranda o buton hiç gösterilmez; gösterilse de işe yaramaz.

### 3.3 Kilit 2 — Onaylayan müdür veya sahip olmalı, **o otelde**
Aynı kural, onaylayanın rolüne bakar: `rol_nedir(hotel_id)` **manager** veya **owner** değilse → **REDDET.**
Otel A'nın müdürü, Otel B'nin talebini zaten göremez (Bölüm 2); görse bile bu kural ikinci kez keser. **Çift kilit.**

### 3.4 Kilit 3 — Sıra bozulamaz, adım atlanamaz
Talebin durumu bir yoldur: **talep → onaylandı / reddedildi → teslim alındı.**
- Durumu **el değiştiremez**; onay/ret/teslim yazılınca **kural** ilerletir.
- Bir talebe **tek** onay kaydı yazılabilir (ikincisi reddedilir).
- Reddedilmiş veya zaten onaylanmış talep yeniden onaylanamaz.
- **Onaysız teslim olmaz:** `deliveries` yazılırken kural "bu talep onaylandı mı?" diye bakar; değilse **REDDET.**

### 3.5 Kilit 4 — Teslim alan, onaylayanla ve talep edenle **aynı kişi olamaz**
`deliveries` yazılırken kural kartı okur ve kontrol eder:
- Teslim alan = onaylayan → **REDDET.** (En kritik suistimal: müdür şişirilmiş siparişi onaylar, sonra "geldi" der.)
- Teslim alan = talep eden → **REDDET.** (Blueprint'in kuralı: üç adım, üç farklı kişi.)

> **Genel Müdür'e not:** Çok küçük otellerde (2–3 personel) "talep eden = teslim alan" yasağı işi tıkayabilir. Security'nin önerisi: **ilk sürümde yasak kalsın**, sahada tıkanırsa gevşetme **yalnızca Genel Müdür kararıyla** ve ayrı bir karar kaydıyla yapılsın. Onaylayan = teslim alan yasağı ise **hiçbir koşulda** gevşetilmez.

### 3.6 Kilit 5 — Adetler yan yana, uyumsuzluk görünür
Adet uyumsuzluğu **engellenmez** (gerçek hayatta eksik teslim olur); ama **gizlenemez**:
- Üç sayı üç ayrı kayıtta, üç ayrı imzayla durur: **talep edilen · onaylanan · gelen**.
- Adetler yalnızca **sıfır veya pozitif tam sayı** olabilir; veritabanı başka bir şeyi kabul etmez.
- Uyumsuzluk bir **soru**dur (hesaplanır, saklanmaz): "gelen ≠ onaylanan" → müdür panelinde uyarı. Silinecek bir "uyarı kaydı" yoktur; sayılar durdukça uyarı durur.

---

## Bölüm 4 — "Teslim Aldım" Bir İmzadır: Değiştirilemezlik

### 4.1 İmzanın üç parçası — ikisini telefon yazamaz
| Parça | Kim yazar | Neden |
|---|---|---|
| **Kim** (`received_by`) | Veritabanı, karttan | Telefon başkasının adına imza atamaz |
| **Ne zaman** (`received_at`) | Veritabanı, kendi saatinden | Telefonun saati oynanabilir |
| **Ne** (adet + fatura fotoğrafı) | Görevli | İmzalanan içerik budur |

Telefonun kendi saati de ayrıca saklanır (`created_at_device`) — offline gecikmeyi görmek için. Ama **imza saati sunucunun saatidir.**

### 4.2 Kilit — Değiştirme ve silme yasağı, istisnasız
Her beyan tablosunda (🔏) iki **kural** vardır: **"değiştirmeyi reddet"** ve **"silmeyi reddet."**
- Görevli, müdür, sahip — **hiçbir rol** için istisna yok.
- **Ana anahtar bile** bu kuralı geçemez: ana anahtar kilitleri (RLS) atlar ama kuralları (trigger) atlayamaz. Smartotel ekibi de bir beyanı silemez.
- Kuralı kaldırmanın tek yolu veritabanı şemasını değiştirmektir; şema **git'te** durur, her değişiklik **kim/ne zaman** ile kayıtlıdır.

### 4.3 Yanlış yazıldıysa? Yeni kayıt, eskisini işaret eder
"18 geldi" yazıldı ama 19'du. Eski kayıt **silinmez, düzeltilmez.** Yeni bir teslim kaydı yazılır; üzerinde "bu, şu kaydın düzeltmesidir" (`corrects_id`) yazar.
- Düzeltme kaydı da bir beyandır: **kendi imzasıyla**, değiştirilemez.
- Düzeltme, **aynı otelin** bir kaydını işaret etmek zorundadır (kural kontrol eder).
- Müdür panelinde ikisi de görünür: "18 → 19, düzelten: Ali, 15:40".

Suistimal araştırmasında soru hep aynıdır: **"Kim, ne zaman, ne dedi?"** Cevap hiçbir zaman değişmez.

### 4.4 Fatura fotoğrafı da kilitli
- Fotoğraf yolu: `hotel_id/deliveries/<teslim-kimliği>.jpg`. **Yalnızca müdür, sahip ve fotoğrafı yükleyen kişi görür**
  (Aşama 17.2, Genel Müdür talimatı: fatura fotoğrafı tedarikçi fiyatı demektir, kat görevlisi göremez —
  `docs/security/003-kesirli-miktar-ve-uyusmazlik.md`). Arıza fotoğraflarını otelin her üyesi görmeye devam eder.
- **Üzerine yazma ve silme yok.** Aynı yola ikinci yükleme reddedilir.
- Fotoğraf **önce** yüklenir, teslim kaydı **sonra** yazılır ve fotoğrafın yolunu taşır. Kayıt varsa fotoğrafı da vardır.
- Yükleme sınırı: yalnızca resim, en fazla ~2 MB (telefonda küçültülür). Dosya adı telefonun verdiği değil, sistemin ürettiği kimliktir.

### 4.5 Offline ile uyum: aynı beyan iki kez gelirse?
Her beyanın telefonda üretilmiş **rastgele** bir kimliği (UUID) vardır. İnternet koptu, telefon aynı kaydı tekrar gönderdi:
- Veritabanı "bu kimlik zaten var" der → ikincisini **sessizce yok sayar.** Güncellemez, üzerine yazmaz.
- Kimlik **tahmin edilemez** (rastgele, sıralı değil). Başkasının kaydının kimliğini bilerek "çakıştırma" denemesi anlamsızdır.

---

## Bölüm 5 — Bu İki Kilidin Etrafındaki Küçük Kilitler

Kısa, ama kod aşamasında her biri denetlenir:

| Konu | Kilit |
|---|---|
| **Misafir yorumu** | Giriş yok; tek kapı Edge Function (`guest-feedback`). Kapı anahtar istemez (misafir taşımaz); koruma kapının içindedir. Kod biçimi izin listesiyle doğrulanır; puan **1–5 tam sayı**; yorum **en fazla 500 karakter**, düz metin olarak saklanır, ekrana basılırken kaçış uygulanır. Aynı oda kodundan **dakikada en fazla 3** yorum. Kod yanlışsa veya oda kapalıysa cevap hep aynı: "Bu bağlantı geçersiz." — kodun var olup olmadığı **söylenmez.** Ana anahtarla yapılan **tek iş**, yalnızca ana anahtarın çağırabildiği tek veritabanı fonksiyonudur (`misafir_yorumu_yaz`): kodu doğrular, oteli/odayı bulur, yazar; başka hiçbir tabloya dokunmaz. Aynı denetimler kapıda ve veritabanında **iki kez** yapılır. |
| **Şifreler** | Supabase Auth saklar (tuzlu özet). En az **8 karakter**. Art arda hatalı girişte bekleme. "Şifremi unuttum" hesabın varlığını ele vermez. Sıfırlama bağlantısı tek kullanımlık. Biz şifre kodu yazmıyoruz. |
| **Hata mesajları** | Kullanıcı yalnızca **"Bu işlem yapılamadı"** görür. Kilidin veya kuralın adı, tablo adı, sorgu metni ekrana **çıkmaz**; yalnızca sunucu kaydına düşer. |
| **Kayıt (log)** | Reddedilen her yazma denemesi (kilit veya kural) sunucu kaydında **kim + ne zaman + hangi tablo** ile tutulur. Şifre, kart, kişisel veri log'a yazılmaz. |
| **Bağlantı** | Her şey HTTPS. Vercel ve Supabase bunu kendiliğinden yapar. |
| **Yeni tablo** | `hotel_id` + kilit + (beyansa) iki kural. Üçü yoksa tablo yoktur. Security kod incelemesinde bunu ilk sorar. |

---

## Bölüm 6 — Kod Yazıldıktan Sonra Security'nin Deneyeceği Testler

Her madde bir **saldırı denemesidir**. Hepsi **başarısız** olmalıdır; biri başarılı olursa **veto**.

| # | Deneme | Beklenen |
|---|---|---|
| 1 | Otel A görevlisi, oda listesini ister | Yalnızca Otel A'nın odaları gelir |
| 2 | Otel A görevlisi, Otel B'nin oda kimliğiyle ister | **Boş** döner (hata bile değil) |
| 3 | Otel A görevlisi, `hotel_id = B` ile "oda hazır" yazar | **Reddedilir** |
| 4 | Görevli, kendi "oda hazır" beyanını değiştirmeye çalışır | **Reddedilir** |
| 5 | Görevli, `created_by` alanına başkasının kimliğini yazar | Veritabanı **üzerine kendi kimliğini** yazar |
| 6 | Görevli, `approvals` tablosuna yazmaya çalışır | **Reddedilir** (rol) |
| 7 | Müdür, **kendi** talebini onaylar | **Reddedilir** |
| 8 | Müdür, aynı talebi **iki kez** onaylar | İkincisi **reddedilir** |
| 9 | Onaysız talebe teslim yazılır | **Reddedilir** |
| 10 | Onaylayan müdür aynı talebe "teslim aldım" der | **Reddedilir** |
| 11 | Talep eden görevli aynı talebe "teslim aldım" der | **Reddedilir** |
| 12 | Sahip (`owner`), bir teslim kaydını siler | **Reddedilir** |
| 13 | **Ana anahtar** ile bir teslim kaydı değiştirilir | **Reddedilir** (kural) |
| 14 | Aynı UUID ile aynı beyan iki kez gönderilir | **Tek** kayıt kalır, ilkinin içeriğiyle |
| 15 | Giriş yapmadan (yalnızca kapı anahtarıyla) herhangi bir tablo okunur | **Boş** döner |
| 16 | Otel A üyesi, Otel B'nin fotoğraf klasörünü okur | **Reddedilir** |
| 17 | Aynı yola ikinci fatura fotoğrafı yüklenir | **Reddedilir** |
| 18 | Misafir sayfasına uydurma oda kodu verilir | "Bu bağlantı geçersiz." — başka bilgi yok |
| 19 | Misafir sayfasına 1 dakikada 10 yorum gönderilir | 3'ten sonrası **reddedilir** |
| 20 | Görevli, başkasına atanmış iş emrini "Çözdüm" yapar | **Reddedilir** |
| 21 | Çözülmüş iş emri yeniden değiştirilir (müdür dahil) | **Reddedilir** |
| 22 | Uygulama kodunda ve git geçmişinde ana anahtar aranır | **Bulunmaz** |

---

## Yapmadıklarımız (ve neden)

| Düşünülen | Neden yapmıyoruz |
|---|---|
| Blok zinciri / kayıtları birbirine bağlayan özet zinciri | Değiştirmeyi reddeden kural + git'te duran şema + günlük yedek aynı güvenceyi **sıfır ek parçayla** verir. |
| Her otele ayrı veritabanı | Kilit (RLS) aynı ayrımı tek dolapta verir. Architect kararı `002`. |
| Uygulama kodunda ikinci bir yetki katmanı | Kilit dolabın içinde olduğu sürece kapıcıya ikinci kilit **yanlış güven** verir; bakımı ikiye katlar. Uygulama yalnızca **butonu gizler**, kararı vermez. |
| Beyanlara "düzenle" butonu | Bir beyan düzenlenebiliyorsa imza değildir. Düzeltme = yeni kayıt (4.3). |

---

## Sonuç — Veto Şartları ve Sonraki Adım

**Security şu üç durumda veto kullanır; düzeltilmeden kod ilerlemez:**
1. Kilit sistemi açık olmayan **tek bir tablo** bile varsa.
2. Beyan tablolarından birinde "değiştirmeyi reddet / silmeyi reddet" kuralı eksikse.
3. Ana anahtar uygulama kodunda, telefonda veya git'te görünürse.

**Sonraki adım (Genel Müdür "koda geç" dediğinde):** İlk yazılacak kod, uygulama değil **dolabın kendisi**dir: `supabase/` altında tablolar → her tablo için kilit → beyan kuralları → Maker-Checker kuralları. Ardından Bölüm 6'daki 22 deneme çalıştırılır. Hepsi reddedilmeden arayüz koduna geçilmez.
