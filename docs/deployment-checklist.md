# Canlıya Çıkış Kontrol Listesi

> **Hazırlayan:** Orkestratör · **Tarih:** 2026-09-16 · **Durum:** Genel Müdür onayına hazır
> Sistem iki yerde yaşar: **Supabase Cloud** (Ortak Beyin: veri, kurallar, kilitler, fotoğraflar)
> ve **Vercel** (personel uygulaması + misafir yorum sayfası).
> Sırayla yapılır; bir adımın kutusu işaretlenmeden sonrakine geçilmez.

---

## 0. Önce bilinmesi gerekenler

| Şey | Ne demek |
|---|---|
| **Kapı anahtarı** (anon key) | Herkese açıktır, tarayıcıya konur. Tek başına hiçbir çekmeceyi açmaz; kilitler veritabanındadır. |
| **Ana anahtar** (service role key) | Her kilidi açar. **Asla** tarayıcıya, git'e ya da `VITE_` ile başlayan bir değişkene yazılmaz. Yalnızca sunucudaki kapılarda yaşar. |
| **Göç dosyaları** (migrations) | Veritabanının kurulum talimatı. Sırayla çalışır; elle SQL yazılmaz. |
| **Kapılar** (Edge Functions) | Sunucuda çalışan dört küçük program: kayıt (otel açma), misafir yorumu, personel ekleme ve şifre yenileme. |

---

## 1. Supabase Cloud — Ortak Beyin

- [ ] **1.1** Yeni proje aç. Bölge: Türkiye'ye en yakın olan (Frankfurt). Veritabanı şifresini kasaya koy — bir daha gösterilmez.
- [ ] **1.2** Projede **günlük yedeklemenin açık** olduğunu doğrula (veritabanı göçleri geri alınamaz; dönüş yolu yedektir).
- [ ] **1.3** Bilgisayardan bağla: `supabase link --project-ref <proje-kimliği>`
- [ ] **1.4** Veritabanını kur: `supabase db push`
      → 18 göç dosyası sırayla çalışır: tablolar → kurallar → kilitler → fotoğraflar → misafir kapısı → arıza fotoğrafı →
      çözüm fotoğrafı → personel ve ürün → teslim kanıtı → kesirli miktar → fatura gizliliği → şifre güncelleme →
      kayıt kapısı → sayaç kilidi → demo süresi → iletişim formu → iletişim sel kapısı → iletişim konu listesi.
- [ ] **1.5** Kurulumu gözle doğrula (Supabase Studio):
      - `photos` kovası **private** (public değil), dosya sınırı **2 MB**.
      - Bütün tablolarda RLS **açık**.
      - Auth → **açık kayıt kapalı** (kimse kendi kendine hesap açamaz), şifre en az **8 karakter**.
- [ ] **1.6** Auth → URL ayarları: Site URL ve izinli yönlendirme adresleri = `https://<alan-adı>`
- [ ] **1.7** Kapıları yayınla:
      - `supabase functions deploy otel-ac --no-verify-jwt` ← **anahtarsız olmalı**; kaydolan kişinin henüz kartı yoktur.
      - `supabase functions deploy guest-feedback --no-verify-jwt` ← **anahtarsız olmalı**; misafir giriş yapmaz.
      - `supabase functions deploy personel-ekle` ← anahtar ister; müdür girişliyken çağırır.
      - `supabase functions deploy sifre-guncelle` ← anahtar ister; müdür personel şifresi yenilerken çağırır.
- [ ] **1.8** Kapı sırlarını ayarla. **Şu an ikisi de `*`, yani CORS herkese açık:**
      - `GUEST_PAGE_ORIGIN = https://<alan-adı>`
      - `PANEL_ORIGIN = https://<alan-adı>`
      - `KAYIT_SAYFASI_ORIGIN = https://<alan-adı>` ← kayıt kapısı buna bakar
      - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → Supabase bunları kendisi verir, elle eklenmez.
- [ ] **1.9** İlk oteli aç. **Aşama 20'den beri iki yol var:**
      (a) `/kayit` sayfasından normal müşteri gibi kaydol (tercih edilen: akışın gerçekten çalıştığını da doğrular), ya da
      (b) Studio'dan elle: `hotels` satırı + kullanıcı hesabı + `memberships` satırı (`role = 'owner'`).
- [ ] **1.10** Odaları gir (`rooms`): numara ve kat. `staff_code` ve `guest_code` kendiliğinden üretilir.
      Uygulamada oda ekleme ekranı **yoktur**; bu adım Studio üzerinden yapılır.
      Kopyalanmaya hazır SQL: `docs/test-listesi.md` (son bölüm).
- [ ] **1.11** Temizlik kontrol listesini (`checklist_templates`) gir. Ürünleri müdür uygulamadan ekleyebilir (en fazla 8 açık ürün).

## 2. Vercel — Personel uygulaması ve misafir sayfası

- [ ] **2.1** Repoyu bağla. **Root Directory: `app`** · Framework: Vite · Build: `npm run build` · Çıktı: `dist`
- [ ] **2.2** Ortam değişkenleri (Production **ve** Preview):
      - `VITE_SUPABASE_URL = https://<proje>.supabase.co`
      - `VITE_SUPABASE_ANON_KEY = <kapı anahtarı>`
      - ⚠️ Ana anahtar buraya **yazılmaz**. `VITE_` ile başlayan her şey tarayıcıya iner.
- [ ] **2.3** `app/vercel.json` dosyasının repoda olduğunu doğrula. Bu dosya bütün adresleri `index.html`'e yönlendirir;
      olmazsa QR ile açılan `/oda/<kod>` ve `/yorum/<kod>` adresleri **404** verir — yani sistemin ana kapısı çalışmaz.
- [ ] **2.4** Yayınla, alan adını bağla. HTTPS otomatik gelir — **kamera (QR okuma) yalnızca https'te açılır.**
- [ ] **2.5** Alan adı kesinleştikten sonra **1.6 ve 1.8'e geri dön**, adresleri gerçek alan adıyla güncelle.

## 3. Canlıdan hemen önce — doğrulamalar

- [x] **3.1** ✅ **150 güvenlik denemesi Staging'de koşuldu ve hepsi geçti** (2026-09-16).
      Docker gerekmedi: `supabase db query --linked --file supabase/tests/guvenlik_denemeleri.sql`
      (`supabase test db --linked` Docker istiyor; `db query` istemiyor). Dosya kendini begin…rollback
      içine aldığı için veritabanında iz bırakmaz. Üretimde de aynı komutla tekrarlanmalıdır.
      Üretimde bir tanesi bile düşerse canlıya çıkılmaz.
- [ ] **3.2** Kapıların kendi testleri: `deno test supabase/functions/` (misafir kapısı, personel ekleme, şifre yenileme)
- [ ] **3.3** Uygulama testleri ve derleme: `cd app && npm test && npm run build`
- [ ] **3.4** Ana anahtar taraması: `bash supabase/scripts/ana_anahtar_taramasi.sh` — koda ya da git'e anahtar sızmış mı?
- [ ] **3.4b** Kapılardaki `npm:@supabase/supabase-js@2` bağımlılığı tam sürüme sabitlensin (ana anahtarı tutan dosyalar).
- [ ] **3.5** **Gerçek telefonda duman testi** (en az iki telefon: biri görevli, biri müdür):
      1. Görevli girişi → QR okut → oda açılır.
      2. "Oda Hazır" · "Eksik Var" (kesirli dene: 1,5 Kg) · "Sorun Bildir" (fotoğraflı).
      3. **Uçak modu aç** → aynı beyanları yap → ekran anında "✓" demeli, ana ekran "internet gelince gönderilecek" demeli.
      4. Uçak modunu kapat → kayıtlar gitmeli, sayaç sıfırlanmalı.
      5. Müdür panelinde bekleyen onay görünmeli; onayla → depo görevlisinde "📦 Teslim Al" çıkmalı.
      6. Eksik teslim al (kanıt fotoğrafıyla) → müdür panelinde **kırmızı uyuşmazlık kutusu** ve **çan sesi**.
      7. Misafir sayfası: `/yorum/<guest_code>` → 2 yıldız ver → müdüre "mutsuz misafir" alarmı düşmeli.
      8. Müdür panelinde bir görevlinin şifresini yenile → o telefonda yeni şifreyle giriş yapılabilmeli.
      9. **Kayıt akışı:** vitrindeki düğme → `/kayit` → dört alan → "Otelimi Başlat" → panele düşmeli.
         Aynı e-postayla ikinci kez denenince "Bu e-posta zaten kayıtlı" demeli; dört kez üst üste denenince durdurmalı.
- [ ] **3.6** Fatura gizliliğini elle dene: kat görevlisi hesabıyla bir fatura fotoğrafına ulaşmayı dene → **ulaşamamalı**.

## 4. QR kodlarını basmak

Her odada **iki ayrı** QR vardır. Karıştırılmamalıdır:

| QR | İçeriği | Nereye asılır |
|---|---|---|
| **Personel** | `https://<alan-adı>/oda/<rooms.staff_code>` | Dolap içi, kapının iç yüzü — misafirin görmeyeceği yer |
| **Misafir** | `https://<alan-adı>/yorum/<rooms.guest_code>` | Komodin, masa — misafirin göreceği yer |

- [ ] **4.1** Kodları al: Studio → SQL → `select number, staff_code, guest_code from rooms order by number;`
- [ ] **4.2** QR'ları üret ve bas. Altına oda numarasını yaz; personel QR'ının altına "Personel", misafir QR'ının altına "Görüşünüz bizim için değerli".
- [ ] **4.3** İki odada elle dene: yanlış QR yanlış ekranı açmamalı.

## 5. İlk gün

- [ ] **5.1** Müdür panelinden personeli ekle (ad, e-posta, şifre, görev). Şifreyi müdür belirler ve kendisi söyler.
- [ ] **5.2** Personele 10 dakikalık gösterim: tek buton, QR okut, üç beyan. Uygulama mağazadan indirilmez; telefona "Ana ekrana ekle" denir.
- [ ] **5.3** İlk hafta müdür paneli günde iki kez açılsın (sabah/akşam): kırmızı kutu var mı?

## 6. Vitrin (tanıtım sayfası)

Vitrin ayrı bir Vercel projesidir; uygulamayla ortak kodu yoktur (`vitrin/README.md`).

- [ ] **6.1** Vercel'de ikinci proje: **Root Directory boş (depo kökü)** · Framework: Other · Build Command `sh ayarlar-uret.sh` · **Output Directory `vitrin`**.
      Betik ve `vercel.json` depo kökündedir; Vercel ikisini de yalnızca Root Directory'de arar (2026-09-17: "exited with 127" dersi).
- [ ] **6.2** Alan adlarını ayır:
      - `oteldijital.com` → vitrin
      - `app.oteldijital.com` → personel uygulaması (giriş `/giris`, kayıt `/kayit`) ve misafir yorum sayfası
- [x] **6.3** ✅ Vitrindeki bütün düğmeler bağlandı (Aşama 20 · 20.1):
      Kayıt sayfası `https://app.oteldijital.com/kayit` (her sayfanın üst çubuğunda, hero'da, tarifede ve kapanışta; metin her yerde aynı: "30 Gün Ücretsiz Dene") · "Giriş Yap" → `https://app.oteldijital.com/giris` (menü ve alt bölüm) ·
      Kurumsal "Görüşme ayarla" → `mailto:merhaba@oteldijital.com`.
      Alan adları Genel Müdür tarafından onaylandı; ileride değişirse adres vitrindeki **beş sayfada birden** geçer
      (`index.html`, `dijital-vitrin.html`, `teknolojik-altyapi.html`, `fiyatlandirma.html`, `iletisim.html`) — her sayfanın üst çubuğunda ve alt bölümünde.
- [ ] **6.10** **Uzantısız adresleri canlıda doğrula** (Genel Müdür kararı, 2026-09-21 · `docs/decisions/008`):
      `oteldijital.com/dijital-vitrin`, `/teknolojik-altyapi`, `/fiyatlandirma`, `/iletisim` açılmalı;
      `/dijital-vitrin.html` kalıcı olarak uzantısız adrese yönlenmelidir. Bunu `vercel.json` içindeki
      `"cleanUrls": true` sağlar; ayar Vercel panelinden değil, bu dosyadan gelir.
      `vercel.json` yorum kabul etmez; değişiklikten sonra `node -e "require(./vercel.json)"` ile geçerliliği denetlenir.
- [ ] **6.6** `merhaba@oteldijital.com` posta kutusunun **gerçekten çalıştığını** doğrula (vitrindeki tek iletişim yolu).
- [ ] **6.13** **Ölçümü aç ve doğrula** (denetim · Madde 5 · `docs/decisions/013-analitik.md`):
      Umami Cloud hesabı açıldıktan sonra dokuz sayfaya iki satırlık sayaç etiketi eklenir.
      Sonra canlıda: `oteldijital.com/istatistik/script.js` **200** dönmeli, panelde canlı trafik
      görünmeli ve sekiz olay ayrı ayrı düşmeli. **CSP'ye dokunulmaz** — sayaç kendi alan adımızdan
      sunulduğu için `script-src 'self'` olduğu gibi kalır; gevşetme gerekirse kurulum yanlıştır.
- [ ] **6.12** **Hata sayfalarını canlıda doğrula** (denetim · Madde 3 · `docs/decisions/011-hata-sayfalari.md`):
      Olmayan bir adres (`oteldijital.com/olmayan-sayfa-testi`) **markalı HTML** sayfa ve **HTTP 404** dönmeli.
      Yanıtta sağlayıcının ham metni, sunucu bölgesi ya da istek kimliği görünmemeli.
      `cleanUrls` açık olduğu için `404.html` davranışının sürdüğü özellikle bu adımda görülür;
      sürmezse çözüm `vercel.json` ile yönlendirmedir — ama **rewrite 200 döner (soft-404)**, o yüzden
      önce sağlayıcının kendi 404 davranışı denenir. `500.html` durağan sitede kullanılmayabilir; notu kararda.
- [ ] **6.11** **Yasal metinler:** bugün dört sayfa da "Çok yakında." diyen bir iskelettir (`/kvkk`, `/gizlilik-politikasi`,
      `/cerez-politikasi`, `/kullanim-sartlari`) ve `noindex` etiketlidir. Metinler girilince her sayfada
      `<meta name="robots">` `index, follow` yapılır ve sayfa `vitrin/sitemap.xml` dosyasına eklenir
      (`docs/decisions/008` · Ek). KVKK metninde iletişim formu verisinin **saklama süresi** belirtilmelidir.
- [x] **6.4** ✅ **Metin–ürün doğrulaması yapıldı:** sayfa "şifreler Müdür Paneli'nden 5 saniyede güncellenir" diyor
      ve Aşama 19.1'den beri ürün bunu karşılıyor (Personel ekranı → 🔑 Şifre). Vaat ile ürün aynı.
- [ ] **6.5** Fiyat tablosundaki plan içerikleri (hangi özellik hangi pakette) Genel Müdür onayından geçmelidir.
- [ ] **6.7** Vitrin projesine iki ortam değişkeni gir: `SUPABASE_URL` ve `SUPABASE_ANON_KEY` (ziyaretçi anahtarı;
      uygulamadaki `VITE_SUPABASE_*` ile aynı değerler). Depo kökündeki `ayarlar-uret.sh` bunlardan `vitrin/ayarlar.js` üretir;
      biri eksikse ya da anahtar gizli anahtarsa dağıtım durur. Anahtar git'e girmez (`docs/security/007-iletisim-formu.md`).
- [ ] **6.8** Canlıda formu bir kez gönder, Supabase panelinde `iletisim_formu` tablosuna düştüğünü gör, deneme satırını sil.

---

## Bilinen açıklar (canlıya çıkışı engellemez, takip edilir)

Hepsi tek bir dosyada toplandı: **`docs/v1-1-notlari.md`** (Genel Müdür kararı, 2026-09-16).
V1 kapsamında hiçbiri yapılmayacaktır; oradaki listeden bir maddeyi V1'e almak Genel Müdür kararıdır.

Başlıklar: şifre yenileme kaydı ve hız sınırı · şifre değişince oturumun kapanmaması · üyelik kilidiyle
zincirlenme · sahip kilitlenirse geri dönüş · e-posta doğrulaması · deneme süresi takibi · ödeme.

## Geri dönüş planı

- **Uygulama bozulursa:** Vercel → önceki dağıtımı "Promote to Production" ile geri al. Saniyeler sürer.
- **Veritabanı bozulursa:** göçler geri alınmaz; günlük yedekten dönülür. Bu yüzden 1.2 adımı atlanmaz.
- **Kapı bozulursa:** `supabase functions deploy <ad>` ile önceki sürüm yeniden yayınlanır.

---

## Staging kurulum kaydı (2026-09-16)

Proje: `pnevrqzwgcpdspjfbqst` · Bölge: eu-central-1 (Frankfurt) · PostgreSQL 17.6 · Durum: ACTIVE_HEALTHY

| Adım | Sonuç |
|---|---|
| 14 göç dosyası (+ 2026-09-17: `iletisim_formu` ve `iletisim_sel_kapisi_v2`, toplam 17) | ✅ Uygulandı |
| 4 kapı (otel-ac · guest-feedback · personel-ekle · sifre-guncelle) | ✅ Yayınlandı; ilk ikisi anahtarsız, son ikisi kartsız isteği 401 ile reddediyor |
| Kilitler (anon istemci) | ✅ `hotels`, `memberships`, `kayit_denemeleri` — üçü de boş dönüyor |
| 150 güvenlik denemesi (2026-09-17 itibarıyla 185) | ✅ Hepsi geçti (ilk koşuda 2 düşmüştü, ikisi de düzeltildi — aşağıda) |
| Uçtan uca kayıt | ✅ Kayıt → 200 · aynı e-posta ikinci kez → 409 · yeni hesapla giriş → çalışıyor · kart yalnızca kendi otelini ve `owner` üyeliğini görüyor |

**Canlı koşunun bulduğu üç şey (üçü de düzeltildi):**

1. **Tip uyuşmazlığı:** Aşama 17.1'de miktar sütunları `numeric` olmuştu; iki eski deneme onları hâlâ tam
   sayıyla karşılaştırıyordu (`is(numeric, integer)` diye bir işlev yok). Karşılaştırmalar `::numeric` ile düzeltildi.
2. **Ortam farkı:** Supabase Cloud, `storage.objects` üzerinde doğrudan silmeyi/değiştirmeyi istisna fırlatarak
   engelliyor (yerelde sessizce 0 satır etkilenirdi). 17b ve 17c denemeleri iki ortamda da çalışacak biçimde yeniden yazıldı.
3. **🔴 Gerçek açık:** `revoke all … from public` tek başına yetmiyor — Supabase yeni fonksiyonlara `anon` ve
   `authenticated` rollerine ayrı ayrı yetki veriyor. Kayıt sayacını giriş yapmış herkes çağırabiliyordu.
   `…_sayac_kilidi.sql` göçüyle kapatıldı (doğru desen misafir kapısında zaten vardı).

**Staging'de duran deneme verisi:** "Staging Deneme Oteli" / `staging-deneme@oteldijital.com`.
Üretime çıkmadan silinmelidir.
