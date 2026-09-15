# 001 — Teknoloji Yığını (Tech Stack)

> **Karar veren:** Architect · **Tarih:** 2026-09-14 · **Durum:** Genel Müdür tarafından onaylandı (2026-09-15)
> Bu belge "hangi araçlarla inşa edeceğiz?" sorusuna cevap verir. Sade dille yazılmıştır.

---

## Durum (Ne sorunu çözüyoruz?)

Blueprint dört şey istiyor:
1. **Mobil öncelikli** — personel işi telefondan yapacak.
2. **Offline** — internet çekmeyen katlarda çalışacak.
3. **QR okutma** — her iş QR ile başlayacak.
4. **SaaS** — birçok otel aynı sistemi, birbirini görmeden kullanacak.

Kuralımız: **en az parça, en az bağımlılık, en olgun araç.**

---

## Karar (Tek Bakışta)

| Katman | Seçim | Bir cümleyle neden |
|---|---|---|
| **Dil** | TypeScript (her yerde) | Tek dil: öğrenilecek, bakılacak tek şey. Hataları daha yazarken yakalar. |
| **Uygulama tipi** | PWA (Progressive Web App) | Web sitesi gibi açılır, uygulama gibi çalışır. Mağaza yok, kurulum yok, offline var. |
| **Arayüz** | React + Vite | Dünyanın en yaygın arayüz aracı + en sade derleyici. |
| **Görünüm** | Sade CSS (kütüphane yok) | Büyük buton ve büyük yazı için kütüphaneye gerek yok. |
| **Telefonda veri** | IndexedDB (Dexie ile) | Telefonun kendi çekmecesi. Offline kayıtlar burada bekler. |
| **QR okuma** | Telefon kamerası + tarayıcının kendi QR okuyucusu (yoksa küçük bir yedek kütüphane) | Kamera zaten telefonda; internet gerekmez. |
| **Ortak Beyin** | Supabase (PostgreSQL + Giriş + Fotoğraf deposu) | Veritabanı, giriş sistemi ve dosya saklama tek pakette. Açık kaynak; istersek kendi sunucumuza taşırız. |
| **Sunucu mantığı** | SQL (veritabanının içinde) + gerektiğinde küçük Edge Function'lar | Kurallar verinin yanında durur. Ayrı bir sunucu uygulaması yazılmaz. |
| **Yayınlama** | Vercel (arayüz) + Supabase Cloud (beyin) | İkisi de "yükle, çalışsın" tipi. Sunucu bakımı yok. |
| **Test** | Vitest + Playwright | Vite'ın kendi test aracı + gerçek tarayıcıda kullanıcı hatalarını deneme (QA ajanı için). |

**Toplam:** 2 hizmet (Vercel, Supabase) · 1 dil (TypeScript) · 1 kod tabanı.

---

## Neden? (Sade Anlatım)

### 1. Neden PWA, neden "gerçek" bir uygulama değil?
PWA, bir web sitesinin telefona "Ana ekrana ekle" denilince ikon olması ve uygulama gibi açılmasıdır.

- **Mağaza yok.** App Store / Google Play onayı, güncelleme beklemesi, iki ayrı kod (iOS + Android) yok. Bir bağlantı verirsiniz, personel açar, ekler, biter.
- **Tek kod, üç yüz.** Personel uygulaması, misafir QR sayfası ve yönetici paneli aynı koddan çıkar; sadece farklı sayfalardır.
- **Offline çalışır.** Tarayıcının "Service Worker" adlı görünmez yardımcısı, uygulamanın kabuğunu telefonda saklar. İnternet yokken de uygulama açılır.
- **Kamera çalışır.** Modern telefon tarayıcıları (iPhone Safari, Android Chrome) kameraya erişir; QR okumak için mağaza uygulaması gerekmez.

**Dürüst sınır:** iPhone'da PWA'lar bazı şeyleri yapamaz (arka planda eşitleme, zengin bildirim). Biz zaten "uygulama açıkken eşitle" diyoruz (bkz. `002`), bu sınır bizi etkilemez. Bildirim gerekirse (Faz 2) ayrıca değerlendirilir.

### 2. Neden React + Vite?
- **React:** En çok kullanılan, en çok bilinen, en çok belgesi olan arayüz aracı. Yarın başka bir geliştirici gelirse öğrenmesi gerekmez.
- **Vite:** Kodu tarayıcının anlayacağı hale getiren derleyici. Hızlı, sade, PWA eklentisi olgun (`vite-plugin-pwa`).
- **Next.js seçmedik** çünkü sunucu tarafı sayfa üretimi bizim işimize yaramaz; offline çalışan bir uygulama, sunucudan sayfa beklemez. Fazla parça olurdu.

### 3. Neden sade CSS?
Uygulamanın kuralı belli: büyük buton, büyük yazı, az renk. Bunun için bir tasarım kütüphanesi taşımak, bir bardak su için tanker kiralamak gibi olur. Tek bir renk/boyut listesi (CSS değişkenleri) ve birkaç ortak parça (buton, kart, liste) yeterlidir.
Eğer ileride yavaşlatırsa, bu karar tek başına yeniden açılır.

### 4. Neden Supabase?
Supabase, hazır kiralık bir "Ortak Beyin"dir. İçinde:
- **PostgreSQL:** 30 yıllık, dünyanın en güvenilen açık kaynak veritabanı. Bankalar kullanır.
- **Satır Seviyesinde Güvenlik (RLS):** Her otelin çekmecesine kilidi **veritabanının kendisi** vurur, uygulama kodu değil. Kodda hata olsa bile bir otel diğerini göremez. (Detay: `002`)
- **Giriş sistemi:** Şifre saklama, şifre sıfırlama, oturum yönetimi hazır. Biz yazmıyoruz, biz yanlış yapamıyoruz.
- **Fotoğraf deposu:** Arıza ve fatura fotoğrafları için, aynı kilit mantığıyla.
- **Açık kaynak:** Bir gün Supabase şirketi olmasa bile aynı yazılım kendi sunucumuza kurulabilir. Tuzak yok.

**Yazmadığımız şeyler (ve bu yüzden bozamayacağımız şeyler):** giriş sistemi, şifre saklama, dosya yükleme sunucusu, API sunucusu.

### 5. Sunucu mantığı nerede yaşar?
- **Kurallar SQL'de:** "Aynı kişi hem talep edip hem onaylayamaz", "beyan yazıldıktan sonra değiştirilemez", "gecikmiş iş emri = son süresi geçmiş ve bitmemiş olan" gibi kurallar veritabanının içinde durur. Böylece hangi ekrandan gelirse gelsin kural uygulanır.
- **Edge Function yalnızca zorunluysa:** Misafir yorumu gibi "giriş yapmamış birinin yazması gereken" nadir işler için küçük bir kapı görevlisi. Sayısı bir elin parmaklarını geçmemeli.

### 6. QR nasıl çalışır?
- Her QR'ın içinde bir **bağlantı** vardır: örn. `https://app.smartotel.com/oda/K7M2X9`.
- Personel uygulamada **"QR Okut"** butonuna basar; kamera açılır, kod telefonda çözülür (internet gerekmez), oda ekranı açılır.
- Tarayıcının kendi QR okuyucusu (`BarcodeDetector`) varsa o kullanılır; olmayan telefonlarda aynı işi yapan küçük bir yedek kütüphane devreye girer. Kesin paket, kod aşamasında doğrulanır.
- **Yedek yol:** Aynı QR telefonun normal kamerasıyla da okunabilir; bağlantı uygulamayı doğru odada açar.
- **Misafir QR'ı** da bir bağlantıdır; içinde odaya özel, tahmin edilemez bir kod vardır (bkz. `002`).

---

## Alternatifler (Neleri düşündük, neden seçmedik?)

| Alternatif | Neden seçmedik |
|---|---|
| React Native / Expo / Flutter (mağaza uygulaması) | İki platform, mağaza süreci, ayrı bir dil (Flutter). Fazla parça. PWA ihtiyacı karşılıyor. |
| Next.js | Sunucu tarafı sayfa üretimi offline uygulamaya fayda sağlamaz; ek karmaşıklık. |
| Firebase / Firestore | Offline kütüphanesi iyi ama tablo mantığı yok; "otel A, otel B'yi görmesin" kuralları karmaşıklaşır, raporlama (ortalama süre vb.) zorlaşır. |
| Kendi Node.js API sunucumuz | Giriş, şifre, dosya yükleme, yetki — hepsini biz yazardık. Daha çok kod = daha çok hata = daha büyük güvenlik yüzeyi. |
| PocketBase | Tek dosya, çok sade — cazip. Ama tek sunucuda SQLite; yüzlerce otel ve fotoğraf için büyümesi belirsiz, topluluğu küçük. |
| Tailwind / hazır tasarım kiti | Ekranlarımız çok basit; kit taşımak gereksiz ağırlık. Gerekirse sonradan eklenir. |
| Ayrı "senkronizasyon motoru" (PowerSync, ElectricSQL vb.) | Güçlü ama yeni ve ağır. Bizim veri modelimiz (değiştirilmeyen beyanlar) buna ihtiyaç duymuyor. (Detay: `002`) |

---

## Sonuç (Bu karar neyi değiştirir?)

### Bağımlılık listesi (tamamı — ne kadar az olduğu görülsün)
| Grup | Paketler |
|---|---|
| Arayüz | `react`, `react-dom`, `react-router` |
| Telefonda veri | `dexie` |
| Ortak Beyin bağlantısı | `@supabase/supabase-js` |
| QR | tarayıcı `BarcodeDetector` + yedek küçük kütüphane (kod aşamasında seçilir) |
| Derleme / PWA | `vite`, `vite-plugin-pwa`, `typescript` |
| Test ve düzen | `vitest`, `playwright`, `eslint`, `prettier` |

Bu listeye **her yeni paket için** bir karar kaydı gerekir.

### Proje iskeleti (kod aşamasında oluşturulacak)
```
smartotel/
├── app/         ← Tek uygulama: personel + misafir + yönetici sayfaları
└── supabase/    ← Tablolar, kilitler (RLS), kurallar (SQL) ve Edge Function'lar
```

### Sonraki adımlar
1. `002-database-architecture.md` — çoklu otel ve offline eşitleme kararı.
2. Security ajanı, kod yazılmadan önce RLS planını inceler.
3. Genel Müdür onayı → kod aşaması (ancak Genel Müdür açıkça "koda geç" dediğinde).
