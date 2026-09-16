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
      → 13 göç dosyası sırayla çalışır: tablolar → kurallar → kilitler → fotoğraflar → misafir kapısı → arıza fotoğrafı →
      çözüm fotoğrafı → personel ve ürün → teslim kanıtı → kesirli miktar → fatura gizliliği → şifre güncelleme → kayıt kapısı.
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

- [ ] **3.1** **145 güvenlik denemesini** Staging (test) projesinde koştur: `supabase test db`
      ⚠️ Bu dosya 19.1 denetiminde bozuk bulundu ve onarıldı; ilk çalıştırmada "145 ok" çıktısı GÖZLE görülmelidir.
      Hepsi reddedilmeli. Bir tanesi bile geçerse canlıya çıkılmaz.
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

- [ ] **6.1** Vercel'de ikinci proje: **Root Directory: `vitrin`** · Framework: Other · Derleme komutu **yok** · Çıktı klasörü `vitrin`
- [ ] **6.2** Alan adlarını ayır:
      - `oteldijital.com` → vitrin
      - `app.oteldijital.com` → personel uygulaması ve misafir yorum sayfası
- [ ] **6.3** Vitrindeki "Ücretsiz Başlat" düğmeleri `https://app.oteldijital.com/kayit` adresine bağlandı (Aşama 20).
      Gerçek alan adı farklıysa bu adres `vitrin/index.html` içinde **beş yerde** güncellenmelidir.
      Kurumsal plandaki "Görüşme ayarla" düğmesi hâlâ boştur: gerçek bir iletişim adresi belirlenmeli.
- [x] **6.4** ✅ **Metin–ürün doğrulaması yapıldı:** sayfa "şifreler Müdür Paneli'nden 5 saniyede güncellenir" diyor
      ve Aşama 19.1'den beri ürün bunu karşılıyor (Personel ekranı → 🔑 Şifre). Vaat ile ürün aynı.
- [ ] **6.5** Fiyat tablosundaki plan içerikleri (hangi özellik hangi pakette) Genel Müdür onayından geçmelidir.

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
