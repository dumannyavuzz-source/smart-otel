# 007 — Görsel Dil "Sakin Lüks" ve Girişe Adres (`/giris`)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-18
> **Durum:** Uygulandı (Aşama 2–7, 2026-09-18). Canlıya alma ve canlı doğrulama `docs/deployment-checklist.md` · 6 ile yapılır.
> **Geçersiz kıldığı karar:** `006-vitrin-gorsel-dili.md` (açık zemin, turuncu marka, tek yazı ailesi, cam efekti).
> Kural belgesi: `DESIGN_SYSTEM.md` (proje kökü) · Kurgu: `PROJECT_BLUEPRINT.md` · Bölüm 5
> Kod: `vitrin/stil.css`, `vitrin/index.html`, `app/src/App.tsx`, `app/src/ekranlar/GirisEkrani.tsx`,
> `app/src/ekranlar/KayitEkrani.tsx`, `app/src/stil.css` (yalnızca `.kapi…`)

---

## Durum

Vitrin, "premium teknoloji şirketi" dilindeydi: kırık beyaz zemin, turuncu düğmeler, cam kartlar, hap düğmeler.
Genel Müdür yönü değiştirdi: OtelDijital **lüks otellere** satılıyor; sayfa da bir lüks otelin lobisi gibi
görünmeli. "Parlak, göz yoran renkleri ve sıradan SaaS şablonlarını terk ediyoruz."

Ayrıca uygulamada giriş ekranının adresi yoktu: giriş yapılmamışsa her adres giriş ekranını gösteriyor,
adres çubuğu değişmiyordu.

## Karar

### 1. Görsel dil: "Sakin Lüks" (Quiet Luxury · Contemporary Hospitality)
Bütün ölçüler `DESIGN_SYSTEM.md` içindedir. Özeti:
- **Renk:** mat grafit zemin (`#1B1E1C`), koyu zeytin ikincil yüzey (`#2A3327`), şampanya yalnızca eylem ve
  vurgu için (`#C8B48A`), fildişi yazı (`#EFEAE0`). Oran ~%65 grafit · %15 zeytin · %15 fildişi/taş · ≤%5 şampanya.
  Turuncu ve bütün doygun renkler kalkar. Durum renkleri mat ve kısıktır.
- **Yazı:** başlıklar Cormorant Garamond (serif, 400–500), gövde Inter, veri JetBrains Mono. 006'daki "tek aile"
  kuralı bilerek bırakılır; serif–sans karşıtlığı bu dilin imzasıdır.
- **Yüzey:** 1 px şampanya tonlu çizgi, küçük köşe (kart 4 px, düğme 2 px), gölge yok, **cam/blur yok**, hap düğme yok.
- **Düzen:** bol boşluk, 12 sütun, editoryal asimetri; eşit üçlü/dörtlü özellik ızgarası yok.
- **Hero'da fotoğraf yok** (006'dan korunur): ürünün kendisi, kodla çizilmiş arayüz olarak gösterilir.
- **Kapsam:** vitrin + uygulamanın dış kapı ekranları (Giriş, Kayıt). Uygulamanın içi bu dilin dışındadır.

006'dan **korunan** kararlar: sade menü (sol marka · orta bağlantılar · sağ tek düğme), hero'da kodla çizilmiş
telefon, ana düğme metni her yerde "30 Gün Ücretsiz Dene", hizmet bölümleri demoya değil iletişime iner,
teknik altyapı katalog gibi olmaz, formlar arka planda çalışır (mailto yok).

### 2. Vitrin ayrı kalır
`vitrin/` (oteldijital.com) ve `app/` (app.oteldijital.com) iki ayrı Vercel projesi olarak kalır. Vitrin uygulamanın
içine alınmaz: ziyaretçi personel uygulamasını indirmemeli, telefona kurulu uygulamanın açılışı tanıtım sayfası
olmamalı, çalışan giriş sistemi ve QR bağlantılarına dokunulmamalı. Ayrıntı: `PROJECT_BLUEPRINT.md` · 5.1 ve 5.6.

### 3. Girişin adresi `/giris`
- Giriş yapılmamışken `/` ve bütün korumalı adresler `/giris`'e yönlendirir; **gelinen adres yanında taşınır**,
  giriş sonrası oraya dönülür (QR'dan gelen görevli aynı odada kalır — bugünkü davranış korunur).
- Giriş yapılmışken `/giris`, `/`'e (ya da taşınan adrese) yönlendirir.
- `/kayit` ve `/yorum/<kod>` yönlendiricinin dışında kalmaya devam eder (`main.tsx`).
- Adres Türkçedir: uygulamadaki bütün adresler Türkçe (`/kayit`, `/oda`, `/panel`); `/login` tutarsız olurdu.
- Klasör taşınmaz; giriş ekranı kendi dosyasında kalır.

## Neden

- **Hedef müşteri lüks otel.** Otel sahibi, kendi lobisine yakışmayan bir sayfadan ürün almaz. Görsel dil
  satış aracıdır.
- **Sadelik korunur.** Dil değişimi büyük ölçüde `stil.css` değişken değerlerinin değişimidir (`DESIGN_SYSTEM.md` §3.5);
  HTML yapısı bölüm bölüm sadeleşir. Yeni bağımlılık yoktur (yazı tipleri Google Fonts'tan; CSP zaten izinli).
- **Girişin adresi olması** paylaşılabilir bağlantı ("giriş: app.oteldijital.com/giris"), doğru geri tuşu davranışı
  ve vitrinden doğrudan bağlantı sağlar. Oturum mantığına dokunulmaz; yalnızca ekranın nerede gösterildiği değişir.

## Sonuçları

- `docs/decisions/006` geçersizdir; tarih olarak durur, kural olarak okunmaz.
- Vitrin ve kapı ekranlarında yeni bir renk, yazı ailesi ya da parça gerekirse önce `DESIGN_SYSTEM.md` değişir.
- Uygulamanın iç ekranları (`docs/ux/001–005`) etkilenmez.

## Aşamalar (uygulandıkça işlenir)

| Aşama | Kapsam | Durum |
|---|---|---|
| 2 | Uygulamada `/giris` adresi (yalnızca yönlendirme) | ✅ 2026-09-18 — `App.tsx`, `kapiYolu.ts` (+4 test), kayıt ekranı bağlantısı, vitrin menüsünde "Giriş Yap" |
| 3 | Vitrin: değişkenler, yazı, yüzeyler | ✅ 2026-09-18 — `stil.css` baştan yazıldı, Cormorant Garamond eklendi, taşma denetimi 7 genişlikte geçti |
| 4 | Vitrin: hero ve menü | ✅ 2026-09-18 — tam genişlik grafit-900 blok, 5/7 sütun, tek italik vurgu, bağlantı türü eylem, kaydırınca çizgi |
| 5 | Vitrin: kalan bölümler | ✅ 2026-09-18 — adımlar/değerler satır, hizmet listesi, tarife tablosu, zeytin iletişim bloğu, alt bölümde "Giriş Yap" |
| 6 | Kapı ekranları (Giriş, Kayıt) | ✅ 2026-09-18 — `app/src/stil.css` yalnızca `.kapi…` bloğu, `app/index.html` serif yazı tipi; ekran mantığı değişmedi |
| 7 | Paylaşım kartı, simge, README'ler | ✅ 2026-09-18 — `paylasim.html` → `paylasim.png`, `simge.svg`, `dokunma-simgesi.png`, README'ler, dağıtım listesi, `araclar/` |

## UX denetimi sonrası Genel Müdür kararları (2026-09-18)

- **Menü = bölüm başlığı.** Menüdeki her sözcük, indiği bölümün üst başlığıyla (kicker) aynıdır ve sıra sayfa
  sırasıdır: Nasıl Çalışır · Uygulama · Dijital Check-up · Ne Kazandırır · Fiyatlar. "Hakkımızda" kalktı
  (indiği yerde tek cümle vardı); yerine otel sahibinin en çok aradığı bilgi olan Fiyatlar geldi.
- **#nasil kaldırıldı.** Döngü hikâyesi ve keşif alanı aynı şeyi anlatıyordu; tekrar eden bölüm silindi.
- **İletişim formuna "Dijital Check-up / Analiz" konusu.** Bölüm metni bu konuyu vaat ediyordu ama listede
  yoktu. Konu listesi veritabanı kuralında sabit olduğu için yeni göçle eklendi:
  `supabase/migrations/20260918100000_iletisim_konu_checkup.sql` (eski göçe dokunulmadı).
- **Kapı metinleri.** Kayıt örnek adı "Ahmet Yılmaz"; giriş ekranı otel sahibine hitap eder:
  "Otelinizi tek merkezden yönetmeye devam edin."

Sonraya bırakılanlar (Genel Müdür karar vermedi, mevcut hâl korunur): kayıt ekranındaki güvence satırı,
formda telefon ve e-postanın ikisinin de zorunlu olması, 0,75 rem altındaki küçük yazı boyutları.

## İç operasyon vitrini — üç zikzak blok (2026-09-18)

Hero'nun hemen altına #operasyon bölümü eklendi: ortalanmış serif başlık ("Tüm operasyon tek ekranda.") ve üç
blok — Kat Hizmetleri (sol görsel/sağ metin), Depo ve Mal Kabul (sağ görsel/sol metin), Arıza ve Tamirat (sol
görsel/sağ metin). Görseller kodla çizilmiş arayüz kesitleridir. Genel Müdür üçleme kuralında ısrar etti: dördüncü
blok (kayıp eşya, personel yönetimi) sayfayı uzatır; bu ayrıntılar alt sayfaya kalır. Alt sayfa henüz yazılmadı;
bölümün altındaki "Tüm operasyon detaylarını keşfet →" düğmesi şimdilik #dongu'ya iner.

## Konumlandırma: "Otel Operasyon Merkezi ve Teknoloji Partneri" (2026-09-18)

Genel Müdür kararıyla üst çubuk ve hero yeni konumlandırmaya geçti. Menü: İç Operasyon · Dijital Vitrin ·
Teknolojik Altyapı · Fiyatlandırma · İletişim (her biri indiği bölümün kicker'ıyla aynı; #dijital, #teknik ve
#fiyat kicker'ları buna göre yenilendi). Menü düğmeleri: Giriş Yap · Demo İste (deneme kaydına gider). Hero: kicker
"Otel operasyon merkezi", başlık "Otel operasyonunuzu yönetmek artık bir mesaj atmak kadar kolay." (tek italik: kolay),
açıklama üç çözüm alanını sayar, ana düğme "Operasyon Merkezini Keşfet →" (#operasyon), deneme kaydı sessiz bağlantıda.
Sayfa başlığı, açıklama, Open Graph ve paylaşım kartı da aynı konumlandırmada.
