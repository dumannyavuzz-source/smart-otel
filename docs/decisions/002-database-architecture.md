# 002 — Veritabanı Mimarisi: Çoklu Otel (SaaS) ve Çevrimdışı Eşitleme

> **Karar veren:** Architect · **Tarih:** 2026-09-14 · **Durum:** Genel Müdür tarafından onaylandı (2026-09-15)
> Bu belge iki zor soruya sade cevap verir. Teknoloji seçimi için `001-tech-stack.md` okunmalıdır.

---

## Durum (Ne sorunu çözüyoruz?)

1. **Yüzlerce otel** aynı sistemi kullanacak; hiçbiri diğerinin verisini görmeyecek. Nasıl?
2. Personel **internet yokken** iş yapacak; internet gelince hiçbir şey kaybolmayacak, hiçbir şey iki kez yazılmayacak. Nasıl?

---

## Karar (Tek Bakışta)

| Konu | Karar |
|---|---|
| Veritabanı | **Tek PostgreSQL**, tek yapı; her tabloda bir `hotel_id` sütunu |
| Otel ayrımı | **Satır Seviyesinde Güvenlik (RLS):** kilit veritabanının içinde, uygulama kodunda değil |
| Kim, nerede, ne rolde | `memberships` tablosu (kişi ↔ otel ↔ rol). Zincir sahibi = birden fazla satır |
| Beyanlar | **Yazılır, kilitlenir.** Oda hazır / teslim aldım / çözdüm / misafir yorumu asla değiştirilmez, silinmez |
| Maker-Checker | Veritabanı kuralı: onaylayan ≠ talep eden, onaylayan rolü = müdür |
| Oda durumu | **Hesaplanır**, elle değiştirilmez (son temizlik + açık iş emirleri → durum) |
| SLA | Zamanlayıcı yok. Son süre (`due_at`) saklanır; "gecikti mi?" bir **sorudur** |
| Kimlikler (ID) | Telefonda üretilen **UUID** — offline'da bile eşsiz |
| Offline | **Giden Kutusu (Outbox):** önce telefona yaz, internet gelince sırayla gönder |
| Fotoğraflar | Telefonda küçültülür, giden kutusunda bekler, Supabase Storage'a aynı kilitle gider |
| Misafir yorumu | Giriş yok. QR'daki tahmin edilemez oda kodu + küçük bir Edge Function kapısı |

---

## Bölüm A — Çoklu Otel (Multi-tenant)

### A.1 Tek dolap, her otele kilitli çekmece
Bütün oteller **aynı dolabı** (tek veritabanı) kullanır. Ama her satırın üzerinde "bu hangi otelin?" yazar (`hotel_id`).
Ayrı ayrı dolap (her otele ayrı veritabanı) **kurmuyoruz**: 300 otel = 300 dolap = 300 bakım. Fazla parça.

### A.2 Kilit dolabın içinde: RLS
Satır Seviyesinde Güvenlik şöyle çalışır:
1. Kullanıcı giriş yapınca eline bir **kart** alır (teknik adı JWT). Kartta kim olduğu yazar.
2. Veritabanı, her satır için şu soruyu **kendisi** sorar: "Bu kartın sahibi bu otelin üyesi mi?"
3. Değilse satır **yokmuş gibi** davranır. Okuyamaz, yazamaz, var olduğunu bile bilemez.

Neden önemli: Uygulama kodunda bir hata olsa bile, bir otel diğerini **göremez**. Kilit kapıcıda değil, dolabın kendisindedir.

Kural: **Varsayılan erişim yok.** Bir tabloya kilit tanımlanmadıysa kimse giremez. Her tablo için kilit açıkça yazılır.

### A.3 Kim, hangi otelde, hangi rolde?
| Tablo | Ne tutar |
|---|---|
| `memberships` | kişi + otel + rol (`staff` / `manager` / `owner`) |

- Kat görevlisi: 1 otelde `staff`.
- Otel müdürü: 1 otelde `manager`.
- Zincir sahibi: 5 otelde `owner` → 5 satır. Panelde 5 oteli görür.
- **Smartotel ekibi** (bizim destek): uygulamadan **asla** girmez; yalnızca yönetim anahtarıyla, kayıt altında.

### A.4 Kutular (Tablolar — sade liste)
| Kutu | İçinde ne var |
|---|---|
| `hotels` | Otel adı, saat dilimi |
| `memberships` | Kim, hangi otelde, hangi rolde |
| `rooms` | Oda numarası, kat, personel QR kodu, misafir QR kodu |
| `checklist_templates` | "Temizlikte neler tiklenir?" listesi (otel başına, en fazla 10 madde) |
| `room_cleanings` | "204 numaralı odayı Ayşe 10:42'de hazır etti" — beyan |
| `supply_reports` | "204'te 2 havlu eksik" — beyan |
| `issue_reports` | "204'te musluk damlıyor" + fotoğraf — beyan |
| `work_orders` | Her arıza için: tür (acil/normal), son süre, kimde, durum |
| `products` / `suppliers` | Depo ürünleri ve tedarikçiler |
| `purchase_requests` | Talep: kim, ne, kaç adet, durum (talep/onay/ret/teslim) |
| `approvals` | "Müdür Mehmet 11:05'te onayladı" — beyan |
| `deliveries` | "Depo görevlisi Ali 15 adet teslim aldı" + fatura fotoğrafı — beyan |
| `guest_feedback` | Oda, puan (1–5), yorum, saat — beyan |

Her kutuda `hotel_id` vardır. İstisnasız.

### A.5 Beyanlar yazılır, kilitlenir
`room_cleanings`, `supply_reports`, `issue_reports`, `approvals`, `deliveries`, `guest_feedback` tablolarında:
- **Güncelleme yok. Silme yok.** Veritabanı bunu bir kuralla (trigger) reddeder; uygulama isterse bile yapamaz.
- Yanlış mı yazıldı? **Yeni bir kayıt** açılır, eskisini işaret eder: "Bu, şu kaydın düzeltmesidir." Eski kayıt durur.

Neden: Suistimal araştırmasında "kim ne zaman ne dedi?" sorusunun cevabı hiçbir zaman değişmemeli.

### A.6 Maker-Checker dolabın içinde
`approvals` tablosuna yazılırken veritabanı iki şeyi kontrol eder:
1. Onaylayan kişi, talebi açan kişiyle **aynı değil**.
2. Onaylayan kişinin bu oteldeki rolü **müdür veya sahip**.

İkisinden biri tutmuyorsa kayıt **reddedilir**. Ekran ne derse desin.

### A.7 Oda durumu hesaplanır
Odanın durumunu kimse elle "Satışa Hazır" yapmaz. Veritabanı şuna bakar:
- Son temizlik beyanı var mı? → **Temiz**, yoksa **Kirli**
- Açık iş emri var mı? → **Arızalı**
- Temiz **ve** açık iş emri yok → **Satışa Hazır**

Neden: İki kişi aynı odaya farklı şey yazsa bile çakışma olmaz; ikisi de beyanını yazar, durum kendiliğinden doğru çıkar.

### A.8 SLA: saat değil, soru
Bir arıza bildirilince `work_orders` satırına son süre yazılır: **acil → +30 dk**, **normal → +2 saat**.
"Gecikti mi?" = `şu an > son süre` **ve** `bitmedi`. Bu bir sorudur; yönetici paneli 30 saniyede bir sorar.
Zamanlayıcı, kuyruk, arka plan işi **yok**. Bozulacak parça yok.

### A.9 Fotoğraflar
Supabase Storage'da tek bir depo; her dosyanın yolu `hotel_id/...` ile başlar. Kilit aynı mantık: yalnızca o otelin üyeleri görür.
Fotoğraf telefonda küçültülür (~1 MB), sonra gönderilir. Dolabı şişirmeyiz.

### A.10 Misafir yorumu: giriş yok, ama kapıcı var
Misafir giriş yapmaz. Peki yorumu doğru otele, doğru odaya nasıl yazarız?
1. Her odanın misafir QR'ında **uzun, tahmin edilemez bir kod** vardır (`rooms.guest_code`).
2. Misafir sayfası bu kodu, puanı ve yorumu küçük bir **Edge Function**'a verir.
3. Edge Function kodu doğrular → hangi otel, hangi oda olduğunu bulur → `guest_feedback` tablosuna yazar.
4. Misafir **hiçbir zaman** veritabanına doğrudan dokunmaz.

Ek koruma: aynı koddan dakikada en fazla birkaç yorum (spam engeli). Kod sızarsa müdür tek dokunuşla yeniler; QR yeniden basılır.

### A.11 Zaman ve yedek
- Bütün saatler sunucuda **UTC** saklanır; ekranda otelin saat dilimiyle gösterilir.
- Yedek: Supabase günlük otomatik yedek alır. Ayrıca haftalık dışa aktarım (ileride karar).

---

## Bölüm B — Çevrimdışı (Offline-first)

### B.1 İlke: Önce telefon, sonra sunucu
Personelin her işlemi **önce telefona** yazılır. Ekran anında tepki verir. Sunucuya gitmek ikinci iştir ve personel bunu **görmez**.
Uygulama hiçbir zaman "internet bekleniyor…" demez.

### B.2 Giden Kutusu (Outbox)
Telefonda bir **posta tepsisi** vardır (IndexedDB içinde `outbox` tablosu).

```
Personel "Oda Hazır" der
   │
   ▼
Telefon: kaydı yaz + tepsiye bir mektup koy      ← anında, internet gerekmez
   │
   ▼
Ekran: "Oda hazır ✓"                             ← personelin işi bitti
   │
   ▼ (arka planda, internet varsa)
Postacı: tepsideki mektupları eskiden yeniye gönder
   │
   ▼
Sunucu: "aldım" → mektup tepsiden kalkar
```

- **Sıra korunur:** eskiden yeniye.
- **Asla iki kez yazılmaz:** her mektubun telefonda üretilmiş bir UUID'si vardır; sunucu "bu ID zaten var" diyorsa ikinciyi sessizce yok sayar. İnternet kopup tekrar denense bile kayıt tekleşir.
- **Asla vazgeçilmez:** gönderilemeyen mektup tepside kalır; bir sonraki fırsatta yeniden denenir.
- **Ne zaman denenir:** uygulama açıldığında · internet geldiğinde (`online` olayı) · uygulama açıkken her 30 saniyede bir.

### B.3 Gelen paket (vardiya için telefona inenler)
İnternet varken telefon, vardiya boyunca lazım olacakları indirir ve saklar:
- Otelin oda listesi ve QR kodları
- Temizlik kontrol listesi şablonu
- Depo ürün listesi
- Bana atanmış açık iş emirleri

Bunlar bir vardiya boyunca "biraz eski" olsa da sorun değildir. İnternet gelince tazelenir.

### B.4 Çakışmalar neden nadir?
Çünkü **beyanlar değiştirilmez, eklenir** (A.5). İki kişi aynı odaya beyan yazarsa ikisi de geçerlidir; oda durumu sunucuda hesaplanır (A.7).
"Aynı kaydı iki kişi aynı anda değiştirdi" durumu ilk sürümde **yoktur**, çünkü değiştirilen kayıt yoktur.
İleride "kimde?" gibi değişen alanlar gelirse: **son yazan kazanır**, ve bu karar ayrıca yazılır.

### B.5 Saat: telefonun saati mi, sunucunun mu?
Her mektupta iki saat olur: **telefonda oluşturulma saati** ve **sunucuya varış saati**.
- SLA süresi, arızanın **bildirildiği** saatten sayar (telefon saati). 10:00'da bildirilen arıza 10:40'ta sunucuya ulaşsa bile "10:00'dan beri" gecikmiştir. Dürüst olan budur.
- Telefonun saati saçmaysa (yıl 1970 gibi) sunucu kendi saatini kullanır.

### B.6 Fotoğraflar offline'da
Fotoğraf telefonda küçültülür, mektubun yanında tepside bekler. İnternet gelince önce fotoğraf yüklenir, sonra ona işaret eden kayıt gönderilir. Yüklenen fotoğraf telefondan silinir; telefon şişmez.
Tepside en fazla **50 fotoğraf** bekleyebilir; aşılırsa ekranda sade bir uyarı: "İnternete bağlanın."

### B.7 Kabuk: uygulama internetsiz nasıl açılır?
Service Worker, uygulamanın dosyalarını (ekranlar, ikonlar) telefonda saklar. Personel katta uygulamayı açar; kabuk telefondan gelir, veri telefondan gelir. Sunucu hiç sorulmaz.
Yeni sürüm çıkınca: internet varken sessizce iner, bir sonraki açılışta devreye girer. Personel hiçbir şey yapmaz.

### B.8 Ne offline ÇALIŞMAZ? (Dürüst liste)
| İş | Neden | Ne görür |
|---|---|---|
| Müdür onayı | Onay, başkasının kaydını ilgilendirir; sunucu şart | Müdürün interneti vardır; sorun beklenmez |
| Yönetici paneli | Bütün otelin canlı durumu | "Bağlantı yok" — sade bir mesaj |
| Misafir sayfası | Misafirin kendi telefonu | "Bağlantı yok" — sade bir mesaj |

### B.9 Telefon kaybolursa / bozulursa?
Tepsideki gönderilmemiş mektuplar **o telefondadır**. Telefon eşitlemeden ölürse o kayıtlar gider. Bunu küçültmek için:
- Ekran köşesinde her zaman: **"Bekleyen 3 kayıt"** — personel görür.
- Kat girişlerinde ve resepsiyonda Wi-Fi olması, günlük işletme kuralı olarak önerilir.
- Sıfıra indirmenin yolu yoktur; bu bilinen ve kabul edilen bir sınırdır.

---

## Alternatifler (Neleri düşündük, neden seçmedik?)

| Alternatif | Neden seçmedik |
|---|---|
| Her otele ayrı veritabanı / ayrı şema | 300 otel = 300 bakım, 300 yedek, her değişiklik 300 kez. RLS aynı güvenliği tek dolapta verir. Büyük zincirler için ileride yeniden açılabilir. |
| Firebase / Firestore offline | Offline'ı hazır ama otel ayrımı kuralları karmaşıklaşır, "ortalama çözüm süresi" gibi raporlar zorlaşır. |
| Hazır eşitleme motoru (PowerSync, ElectricSQL, Replicache) | Çift yönlü, çakışma çözen güçlü araçlar. Bizim verimiz tek yönlü ve eklemeli; bu güce ihtiyacımız yok, ağırlığına da. |
| SLA için zamanlayıcı / arka plan işi | Bozulabilecek fazladan bir parça. "Gecikti mi?" sorusu aynı işi sıfır parçayla yapar. |
| Oda durumunu elle değiştirmek | Çakışma ve yalan kayıt kapısı açar. Hesaplanan durum kendini düzeltir. |

---

## Sonuç (Bu karar neyi değiştirir?)

1. `supabase/` klasöründe yazılacaklar: tablolar, **her tablo için RLS kilidi**, kilitleme kuralları (trigger), oda durumu görünümü (view), misafir yorumu Edge Function'ı.
2. **Security ajanı**, tek satır uygulama kodu yazılmadan önce RLS kilitlerini ve Maker-Checker kuralını inceler ve onaylar.
3. **QA ajanı**, test listesine "uçak modu" senaryolarını ekler: offline'da oda hazırla → internet aç → tek kayıt, doğru saat.
4. Yeni tablo eklemek = `hotel_id` + RLS kilidi + (beyansa) kilitleme kuralı. Üçü olmadan tablo yok.
5. Bu karar Genel Müdür onayıyla kesinleşir. Kod, "koda geç" talimatıyla başlar.
