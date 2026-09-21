# OTELDİJİTAL.COM — DÜZELTME UYGULAMA BRİFİ

Hazırlanma tarihi: 21 Eylül 2026
Denetlenen site: https://www.oteldijital.com/
Denetim ölçütü: Premium Web Sitesi Kurulum Taslağı v1.0
Kapsam: `/`, `/fiyatlandirma`, `/iletisim`, `/dijital-vitrin`, robots.txt, sitemap.xml, HTTP başlıkları, 404 yanıtı.
Kapsam dışı: `app.oteldijital.com` (giriş gerektirir), iletişim formunun gerçek gönderimi (test edilmedi).

---

## 0. UYGULAYICIYA NOT

Bu doküman bir denetim sonucudur ve uygulanacak işleri öncelik sırasıyla tanımlar.
Her madde şu yapıdadır: **Sorun → Kanıt → Yapılacak → Kabul kriteri.**

Sitenin mevcut durumu hakkında iki önemli bilgi:

1. **Performans ve güvenlik zaten çok iyi durumda.** Toplam transfer 23KB, 6 istek, TTFB 153ms, load 1.07s. CSP, HSTS, nosniff, referrer-policy ve permissions-policy aktif. **Yapılan hiçbir değişiklik bu iki alanı geriletmemelidir.** Özellikle: üçüncü parti script eklenmesi, büyük görsel eklenmesi ve CSP gevşetilmesi dikkatle yapılmalıdır.
2. **Metin kalitesi yüksek ve dürüstlük korunmuş.** Uydurma müşteri, referans, istatistik veya logo yok; örnek veriler "örnek akış / örnek rapor" olarak etiketlenmiş. **Bu yaklaşım bozulmamalıdır.** Yeni içerik eklenirken de gerçek olmayan sosyal kanıt üretilmemelidir.

### Para birimi kararı (güncellendi)

İlk denetimde fiyatların dolar cinsinden olması eksiklik olarak işaretlenmişti. **Bu değerlendirme geri alınmıştır:** oteller EUR/USD üzerinden satış yaptığı için döviz cinsinden fiyatlandırma bilinçli ve savunulabilir bir karardır. Yapılacak iş fiyatı TL'ye çevirmek değil, **para birimini ve vergiyi şeffaflaştırmaktır** (Madde 4).

---

## ÖNCELİK SIRASI (UYGULAMA SIRASI)

| # | İş | Öncelik | Tahmini etki |
|---|---|---|---|
| 1 | Gerçek ürün ekran görüntüleri | Kritik | Güven / dönüşüm — en yüksek |
| 2 | Telefon + kurumsal künye | Kritik | Güven — yüksek |
| 3 | Markalı 404 / 500 sayfası | Kritik | Marka algısı |
| 4 | Fiyat şeffaflığı: para birimi + KDV | Kritik | Dönüşüm / itiraz azaltma |
| 5 | Analitik ve olay ölçümü | Kritik | Ölçülebilirlik (diğerlerinin etkisi bununla görülür) |
| 6 | Mobil menü | Önemli | Mobil dönüşüm |
| 7 | CTA adlandırma birliği | Önemli | Dönüşüm |
| 8 | Canonical / sitemap host birliği + structured data | Önemli | SEO |
| 9 | Ana sayfayı 7 bölüme indirme | Önemli | Netlik / dönüşüm |
| 10 | Erişilebilirlik + font self-host + kalan teknik maddeler | İyileştirme | Kalite / hız |

Sıralama mantığı: ilk dört madde güveni doğrudan etkiler ve kod değişikliği en küçük olanlardır. Beşinci madde olmadan kalan altı maddenin etkisi ölçülemez, bu yüzden erken konumlandırılmıştır.

---

# 1. GERÇEK ÜRÜN EKRAN GÖRÜNTÜLERİ EKLENMESİ

**Öncelik:** Kritik

**Sorun:** Sitede ürünün gerçekten var olduğunu gösteren hiçbir görsel yok.

**Kanıt:** `/`, `/fiyatlandirma`, `/iletisim`, `/dijital-vitrin` sayfalarının tamamında `<img>` sayısı **0**. `<svg>` 0, `<video>` 0, CSS `background-image` kullanan öğe sayısı 0. Tüm "ekranlar" HTML/CSS ile çizilmiş temsili kutulardır.

**Müşteri açısından sonucu:** Otel müdürü "personelin telefonunda gerçekten nasıl görünüyor?" sorusunun cevabını göremiyor. Ürünün var olduğuna dair görsel kanıt yok. Taslak Bölüm I / 0, Ölçüt 3 sağlanmıyor ve bu ölçüt yayın engeli olarak tanımlanmıştır.

**Yapılacak:**
- Gerçek uygulamadan alınmış en az 4 ekran görüntüsü: (a) kat görevlisi üç buton ekranı, (b) müdür kumanda ekranı, (c) iş emri zaman çizelgesi, (d) teslim / uyuşmazlık ekranı.
- Format AVIF veya WebP, 2x çözünürlük, telefon çerçevesi içinde.
- Hero'daki LCP görseli `priority` / `fetchpriority="high"`, diğerleri `loading="lazy"`.
- Her görselde bilgi taşıyan `alt` metni.
- Görsellerdeki veriler gerçek otel/kişi bilgisi içeriyorsa anonimleştirilsin; anonimleştirildiği görselin altında belirtilsin.
- Mevcut CSS mockup'lar korunabilir; gerçek görsellerin **yerine** değil, yanında durur.

**Kabul kriteri:**
- Ana sayfada en az 2, iç operasyon anlatımında toplam en az 4 gerçek ekran görüntüsü var.
- Hero görseli ≤ 250KB, toplam sayfa ağırlığı ≤ 1.5MB.
- LCP mobilde ≤ 2.5s (mevcut load 1.07s; görsel eklendikten sonra tekrar ölçülmeli).
- CSP `img-src 'self' data:` olduğu için görseller kendi alan adından sunulmalı.

---

# 2. TELEFON VE KURUMSAL KÜNYE EKLENMESİ

**Öncelik:** Kritik

**Sorun:** Sitede telefon, adres veya tüzel kişilik bilgisi yok.

**Kanıt:** Ana sayfa metninde telefon deseni (`+90` / `0xxx xxx`) bulunamadı. Adres/şehir ifadesi bulunamadı. Tüm sayfalarda tek iletişim kanalı `mailto:merhaba@oteldijital.com`. `tel:` bağlantısı hiç yok.

**Müşteri açısından sonucu:** Bu en ciddi güven açığıdır. Otel müdürü operasyonunu emanet edeceği yazılımın arkasında kim olduğunu göremiyor; "sorun çıkarsa kimi arayacağım?" sorusu cevapsız kalıyor. B2B abonelik satışında telefonsuz iletişim dönüşümü belirgin şekilde düşürür.

**Yapılacak:**
- `/iletisim` sayfasına: telefon (`tel:` bağlantılı) ve/veya WhatsApp, çalışma saatleri, destek kanalının yanıt süresi, şehir.
- Footer'a kısa kurumsal künye: ticari ünvan, vergi dairesi/no veya ticaret sicil no, şehir.
- Tüzel kişilik henüz kurulu değilse: en azından yetkili kişi adı, telefon ve şehir yazılmalı; boş bırakılmamalı.
- Destek SLA'sı varsa yazılsın ("mesajınız aynı gün okunur" ifadesi mevcut, telefonla desteklenmeli).

**Kabul kriteri:**
- Her sayfanın footer'ında ulaşılabilir bir telefon veya WhatsApp bağlantısı var.
- `/iletisim` sayfasında çalışma saatleri ve şehir görünür.
- Footer'da ticari ünvan bilgisi var.

---

# 3. MARKALI 404 VE 500 SAYFASI

**Öncelik:** Kritik

**Sorun:** 404 durumunda barındırma sağlayıcısının ham hata metni gösteriliyor.

**Kanıt:** `https://www.oteldijital.com/bulunmayan-sayfa-testi` isteği `HTTP 404`, `content-type: text/plain`, gövde 79 byte:
```
The page could not be found

NOT_FOUND

iad1::g7p4r-1789996874857-6d5da0176b5e
```

**Müşteri açısından sonucu:** Yanlış linke basan ziyaretçi terk edilmiş bir hata ekranı görüyor; marka algısı anında düşüyor. Ayrıca sunucu bölgesi ve istek kimliği gereksiz şekilde kullanıcıya sızdırılıyor. Taslak Bölüm I / 0 Ölçüt 6 ve Bölüm 8 ihlali.

**Yapılacak:**
- Sitenin tasarım diliyle uyumlu 404 sayfası: "Aradığınız sayfa bulunamadı" + iki çıkış: "Ana Sayfaya Dön" ve "Fiyatları Gör".
- Aynı tasarımda 500 sayfası: kısa açıklama + ana sayfa bağlantısı + iletişim e-postası.
- Sunucu kimliği, istek id'si ve yığın izi kullanıcıya gösterilmemeli.
- 404 sayfası `text/html` dönmeli ve HTTP durum kodu 404 kalmalı (soft-404 üretilmemeli).

**Kabul kriteri:**
- Rastgele bir olmayan adres, markalı HTML sayfa ve HTTP 404 döndürüyor.
- Sayfada en az iki gezinme çıkışı var.
- Yanıt gövdesinde `NOT_FOUND`, sunucu bölgesi veya istek id'si geçmiyor.

---

# 4. FİYAT ŞEFFAFLIĞI: PARA BİRİMİ VE KDV

**Öncelik:** Kritik
**Not:** Bu madde ilk denetime göre revize edilmiştir. Döviz cinsinden fiyatlandırma korunacaktır.

**Sorun:** Fiyatlar döviz cinsinden veriliyor ancak hangi para birimi olduğu, verginin dahil olup olmadığı ve faturalandırmanın nasıl yapıldığı yazılı değil.

**Kanıt:** `/fiyatlandirma` sayfasında paketler `$ 29 /ay` (Butik, 1–25 oda) ve `$ 59 /ay` (Standart, 26–75 oda) olarak görünüyor. Sayfa metninde KDV, vergi, kur veya faturalandırma para birimine dair hiçbir ifade bulunamadı. `Product` / `Offer` structured data yok.

**Bağlam:** Oteller EUR/USD üzerinden tahsilat yaptığı için döviz fiyatlandırma bilinçli bir karardır ve korunacaktır. Sorun para biriminin kendisi değil, **açıklanmamış olmasıdır.**

**Müşteri açısından sonucu:** Müşteri ne ödeyeceğini kesin olarak hesaplayamıyor: KDV eklenecek mi, fatura dövizle mi TL ile mi kesilecek, TL ise hangi günün kuru. Taslak Bölüm 59'un "gizli ücret olmaması" şartı fiilen sağlanmıyor ve satış görüşmesine itiraz olarak taşınıyor.

**Yapılacak:** Fiyat kartlarının hemen altına, küçük punto değil okunur boyutta bir şeffaflık bloğu:
- Para biriminin açık yazımı: `$29 USD / ay` (sembol tek başına bırakılmamalı; USD ve EUR arasında karışıklık olmamalı).
- Vergi durumu: "Fiyatlara KDV dahil değildir" veya "KDV dahildir" — hangisi doğruysa net cümleyle. Türkiye'de yurt içi satışta geçerli KDV oranı ayrıca belirtilmeli.
- Faturalandırma para birimi: fatura USD/EUR olarak mı kesilecek, yoksa TL karşılığı mı. TL kesiliyorsa kur kaynağı ve tarihi ("fatura tarihindeki TCMB döviz satış kuru" gibi) yazılmalı.
- Ödeme yöntemi ve dönemi: aylık/yıllık, kredi kartı/havale, otomatik yenileme var mı.
- İptal koşulu: mevcut "tek tıkla bırakırsınız" ifadesi somutlaştırılmalı (dönem sonu mu, anında mı).
- Opsiyonel ama önerilir: USD/EUR arasında geçiş yapan bir para birimi seçici. Sadece iki para birimi gösterilecekse statik iki satır da yeterlidir.
- 75 oda üstü için ne olduğu yazılmalı (mevcut paketler 75 odada bitiyor; büyük otel "bana ne oluyor?" sorusuyla kalıyor).

**Kabul kriteri:**
- Fiyat sayfasında para birimi kodu (USD ve/veya EUR) yazılı.
- KDV durumu tek ve net bir cümleyle belirtilmiş.
- Faturalandırma para birimi ve kur esası belirtilmiş.
- 75 oda üstü için bir yol gösterilmiş (özel fiyat / iletişim).
- Fiyat bilgisi `Product` + `Offer` structured data ile işaretlenmiş (Madde 8 ile birlikte yapılır); `priceCurrency` gerçek para birimiyle tutarlı.

---

# 5. ANALİTİK VE OLAY ÖLÇÜMÜ

**Öncelik:** Kritik

**Sorun:** Sitede hiçbir analitik kurulu değil; dönüşüm ölçülemiyor.

**Kanıt:** `window.gtag` undefined, `window.dataLayer` yok, `window.plausible` undefined, `window.fbq` undefined. Yüklenen tek script grubu kendi alan adından: `ayarlar.js`, `hareket.js`, `etkilesim.js`. CSP `script-src 'self'` olduğu için üçüncü parti analitik zaten bloklanır.

**Müşteri açısından sonucu:** Doğrudan bir zarar yok; ancak iş tarafında kaç ziyaretçinin geldiği, kaçının "30 Gün Ücretsiz Dene"ye bastığı, formu kaç kişinin yarıda bıraktığı bilinmiyor. Bu maddeyi kapatmadan diğer düzeltmelerin etkisi ölçülemez.

**Yapılacak:**
- Çerezsiz, privacy-first analitik: Plausible veya Umami. Kişisel veri toplamadığı için çerez onayı gereksinimini de sadeleştirir.
- **CSP'yi gevşetmeden kurulum:** script kendi alan adınızdan proxy edilerek sunulmalı (ör. `/istatistik/script.js` → analitik sağlayıcıya rewrite). `script-src 'self'` korunmalı. Bu mümkün değilse CSP'ye yalnızca ilgili host eklenmeli, `unsafe-inline` **eklenmemelidir**.
- Ölçülecek olaylar: sayfa görüntüleme · birincil CTA tıklaması (hangi bölümden geldiği ayırt edilebilir şekilde) · `app.oteldijital.com/kayit` yönlendirmesi · `Giriş Yap` tıklaması · iletişim formu başlangıcı · iletişim formu gönderimi · fiyat sayfası görüntüleme · `mailto` ve `tel` tıklaması.
- Çerez politikası sayfası mevcut; kurulan çözüm çerez kullanmıyorsa politika metni buna göre güncellenmeli (var olmayan çerezi anlatan politika da bir tutarsızlıktır).

**Kabul kriteri:**
- Analitik paneli canlı trafiği gösteriyor.
- Yukarıdaki 8 olay panelde ayrı ayrı görünüyor.
- CSP'de `script-src` hâlâ `'self'` (veya yalnızca tek ek host içeriyor), `unsafe-inline` yok.
- Toplam sayfa ağırlığı artışı ≤ 5KB.
- Çerez politikası metni fiilen kullanılan teknolojiyle tutarlı.

---

# 6. MOBİL MENÜ

**Öncelik:** Önemli

**Sorun:** Mobilde üst menü ekranın sağında kesiliyor; bazı sayfalara menüden ulaşılamıyor.

**Kanıt:** 390×844 ve 320×700 emülasyonunda menü yatay kaydırmalı bir şerit. Ölçümde bazı `<a>` öğelerinin sağ kenarı görünür alanın dışında kaldı; ekran görüntüsünde "Teknolojik A…" kelime ortasından kesik. `Fiyatlandırma`, `İletişim` ve `Giriş Yap` ilk görünümde yok. Hamburger menü mevcut değil.

**Olumlu not:** Sayfanın kendisinde yatay taşma yok — 390px ve 320px'te `scrollWidth == clientWidth`. Bu korunmalı.

**Müşteri açısından sonucu:** Mobil ziyaretçi fiyat sayfasını menüden bulamıyor. Taslak Bölüm 12 ve 55 ihlali.

**Yapılacak:**
- Mobilde standart hamburger menü veya alt sabit gezinme; tüm sayfalar tek dokunuşla erişilebilir.
- Menü açıkken odak tuzağı (focus trap), `Esc` ile kapanma, `aria-expanded` doğru yönetilmeli.
- Kaydırmalı şerit tercih edilirse: kenarda görünür kesme gölgesi/oku olmalı ve hiçbir öğe kelime ortasından kesilmemeli.
- Birincil CTA mobilde de görünür kalmalı; şu anda header'daki buton metni ("OPERASYON MERKEZİNİ TANIYIN →") mobilde iki satıra kırılıyor — kısaltılmalı.

**Kabul kriteri:**
- 320px ve 390px genişlikte tüm ana menü öğeleri erişilebilir.
- Hiçbir menü öğesi görünür alan dışında kesik değil.
- `scrollWidth == clientWidth` korunuyor (yatay kaydırma yok).
- Menü klavye ve ekran okuyucu ile kullanılabilir.

---

# 7. CTA ADLANDIRMA BİRLİĞİ

**Öncelik:** Önemli

**Sorun:** Aynı hedef için üç farklı vaat kullanılıyor; "demo" butonu demo vermiyor.

**Kanıt:** Header'da `DEMO İSTE` → `https://app.oteldijital.com/kayit` (kayıt sayfası). Hero'da birincil CTA `OPERASYON MERKEZİNİ TANIYIN →` (sayfa içi kaydırma, `#nedir`), ikincil CTA `30 Gün Ücretsiz Dene`. Kapanış bölümünde `30 GÜN ÜCRETSİZ DENE` + `Önce fiyatlara bakayım`.

**Müşteri açısından sonucu:** "Demo" bekleyen kullanıcı kayıt formuyla karşılaşınca güven kırılır. Ayrıca en güçlü teklif — 30 gün, kredi kartsız, taahhütsüz — hero'da ikincil konumda kalıyor; birincil buton ise yalnızca sayfayı aşağı kaydırıyor.

**Yapılacak:**
- Tek isim politikası: birincil CTA her yerde `30 Gün Ücretsiz Dene`, ikincil CTA `Fiyatları Gör`.
- Header butonu `DEMO İSTE` → `30 Gün Ücretsiz Dene` olarak değişsin (hedef `/kayit` kalabilir).
- Hero'da birincil ve ikincil CTA yer değiştirsin: ücretsiz deneme birincil, "Nasıl çalışır" ikincil (ve daha silik bir stil).
- "Demo" kelimesi yalnızca gerçekten canlı demo/ekran paylaşımı sunuyorsanız kullanılsın; o durumda ayrı bir randevu akışı olmalı.
- CTA'ların hemen altındaki risk azaltıcı metin ("Kredi kartı yok · Taahhüt yok") korunsun — iyi çalışıyor.

**Kabul kriteri:**
- Sitede "demo" ifadesi yalnızca gerçek demo sunulan yerde geçiyor.
- Her sayfada tek bir birincil CTA metni kullanılıyor.
- Hero'daki en belirgin buton ücretsiz denemeye götürüyor.

---

# 8. CANONICAL / SITEMAP HOST BİRLİĞİ VE STRUCTURED DATA

**Öncelik:** Önemli

## 8a. Host tutarsızlığı

**Sorun:** Site `www` ile sunuluyor ama kanonik sinyaller `www`siz adresi gösteriyor.

**Kanıt:**
- `https://oteldijital.com/` → `HTTP 308`, `location: https://www.oteldijital.com/`
- Ana sayfada `<link rel="canonical" href="https://oteldijital.com/">`
- `og:url = https://oteldijital.com/`
- `sitemap.xml` içindeki 5 URL'nin tamamı `https://oteldijital.com/...`
- `robots.txt` içindeki `Sitemap:` satırı da `www`siz
- Alt sayfalarda da aynı durum: canonical `https://oteldijital.com/fiyatlandirma` vb.

**Sonucu:** Canonical, yönlendirilen bir adresi işaret ediyor. Arama motoruna tutarsız sinyal gidiyor ve sitemap'teki her URL gereksiz bir 308 üretiyor.

**Yapılacak:** Tek kanonik host seçilsin. Mevcut 308 yönlendirme yönüne uyacak şekilde **`www.oteldijital.com` önerilir.** Ardından şunların hepsi aynı host'a eşitlensin: `canonical`, `og:url`, `sitemap.xml` içindeki tüm `loc` değerleri, `robots.txt` içindeki `Sitemap:` satırı, `Organization` schema'sındaki `url` ve `logo`.

**Kabul kriteri:** Hiçbir canonical veya sitemap URL'si yönlendirme üretmiyor; tüm kanonik sinyaller aynı host'u gösteriyor.

## 8b. Eksik structured data

**Sorun:** Structured data yalnızca ana sayfada var ve tek tip.

**Kanıt:** Ana sayfada tek `application/ld+json` bloğu, `@type: Organization`. `/fiyatlandirma`, `/iletisim`, `/dijital-vitrin` sayfalarında `application/ld+json` sayısı **0**.

**Yapılacak:**
- `/fiyatlandirma`: `Product` + `Offer` (paket adı, `price`, `priceCurrency`, oda aralığı), fiyat SSS'i için `FAQPage`.
- Ana sayfa: SSS içeriği varsa `FAQPage`.
- `/iletisim`: `ContactPage` ve telefon eklendikten sonra `Organization.telephone`.
- Tüm alt sayfalar: `BreadcrumbList`.
- `Organization` bloğuna telefon, adres ve sosyal profiller eklenebilir (gerçek bilgi varsa).
- Kural: yalnızca sayfada gerçekten görünen bilgi işaretlenmeli.

**Kabul kriteri:** Google Rich Results Test ile dört sayfanın tamamı hatasız geçiyor; işaretlenen her veri sayfada görünür durumda.

---

# 9. ANA SAYFAYI 7 BÖLÜME İNDİRME

**Öncelik:** Önemli

**Sorun:** Ana sayfa çok uzun ve mesajlar tekrarlanıyor.

**Kanıt:** Sayfa yüksekliği **13.648px** (~14 ekran), toplam metin 10.383 karakter, 11 adet `<h2>` bölümü, 18 adet `<h3>`. Taslak Bölüm 2 sınırı 7 bölümdür.

Tekrarlanan mesajlar: "kayıt sonradan değiştirilemez" (en az 5 yerde), "üç imza / üç ayrı kişi" (4 yerde), "acil 30 dk, normal 2 saat" (4 yerde), "kapıdaki kareyi okutur" (5 yerde).

**Müşteri açısından sonucu:** Karar vermiş kullanıcı fiyatı bulmak için uzun yol kat ediyor. Tekrar, güçlü metnin etkisini azaltıyor.

**Yapılacak:**
- Ana sayfada kalacak 7 bölüm: Hero · OtelDijital nedir · Hangi sorunları çözer (BUGÜN/OTELDİJİTAL İLE tablosu) · Nasıl çalışır (4 adım) · Ne kazandırır · SSS (4-6 soru) · Kapanış CTA.
- `/ic-operasyon` detay sayfasına taşınacak bölümler: "Ekranlar" (sekmeli ekran gezgini), "Kim ne yapar" (personel/müdür ayrımı), "Raporlama nasıl yapılır".
- "Şifre unutuldu / 5 SANİYE" bölümü ana sayfadan çıkarılıp bir SSS maddesine dönüştürülsün.
- "Tüm operasyon tek ekranda" bölümündeki üç alt blok (oda durumu / depo / arıza) özetlenip tek bölüme sıkıştırılsın.
- Taşınan içerik silinmesin — detay sayfasında tam haliyle kalsın ve ana sayfadan bağlantı verilsin.
- **Ön koşul:** Bu madde Madde 15 (navigasyon adlandırması) ile birlikte yapılmalıdır; `/ic-operasyon` sayfası oluşturulduğunda menü yapısı da düzelir.

**Kabul kriteri:**
- Ana sayfada `<h2>` sayısı ≤ 7.
- Sayfa yüksekliği masaüstünde ≤ 8.000px.
- Taşınan içeriğin tamamı `/ic-operasyon` sayfasında erişilebilir.
- Hiçbir ana mesaj ana sayfada 2 defadan fazla tekrarlanmıyor.

---

# 10. ERİŞİLEBİLİRLİK DÜZELTMELERİ

**Öncelik:** İyileştirme (ancak 10a ve 10b kolay kazanç)

**Mevcut olumlu durum:** `skip link` var (`#icerik`), `<main>` landmark var, `lang="tr"` doğru, CSS'te `prefers-reduced-motion` medya sorgusu tanımlı, focus stilleri tanımlı, iletişim formundaki tüm alanlar label'lı. Bunlar korunmalı.

## 10a. Sekmeler erişilebilir değil

**Kanıt:** "Ekranlar" bölümündeki 4 sekme gerçek `<button>` öğeleri, ancak `role="tab"` / `role="tablist"` yok, `aria-selected` yok, `tabindex` yönetimi yok. Sayfada `[role=tab]` sayısı 0.

**Yapılacak:** `role="tablist"` / `role="tab"` / `role="tabpanel"`, `aria-selected`, `aria-controls`, sol/sağ ok tuşu ile gezinme.

## 10b. Kontrast

**Kanıt:** Eşiğin altında 11 öğe bulundu.
- Bölüm numaraları: `rgb(138,109,59)` (altın), 12px → kontrast **2.11** (gerekli 4.5). Açık ihlal.
- Gövde/etiket grisi `rgb(117,115,112)` → kontrast **4.45** (gerekli 4.5). Sınırda ihlal; "BUGÜN" etiketleri, "Örnek akış…" notu, footer başlıkları ve copyright bu tonda.

**Yapılacak:** Altın tonu metin kullanımında koyulaştırılsın (yalnızca dekoratifse `aria-hidden` ile işaretlenip kontrast şartından muaf tutulabilir). Gri ton 4.5 üzerine çekilsin — `rgb(107,105,102)` civarı yeterli olur.

## 10c. Yazı boyutları

**Kanıt:** Sayfada 10.56px, 11.2px, 11.52px, 11.84px, 12px, 12.48px, 12.8px, 13.6px boyutunda metinler var.

**Yapılacak:** Gövde metni 16px'e çekilsin; etiket/caption için alt sınır 13px olsun, 10-12px metin kullanılmasın.

## 10d. Dokunma alanları

**Kanıt:** 390px genişlikte: ikincil CTA'lar (`30 Gün Ücretsiz Dene`, `Önce fiyatlara bakayım`) 29px yüksekliğinde; footer bağlantıları 26px; `İçeriğe atla` 26px. Hedef ≥44×44px.

**Yapılacak:** Mobilde buton ve bağlantı dokunma alanları en az 44px'e çıkarılsın (görsel boyut değişmeden padding ile sağlanabilir).

**Kabul kriteri (10a-10d):** axe ile kritik/ciddi ihlal yok; tüm metin kontrastı ≥ 4.5:1 (büyük metin ≥ 3:1); sekmeler klavye ile kullanılabiliyor; mobilde tüm dokunma alanları ≥ 44px; WCAG 2.2 AA hedefi karşılanıyor.

---

# 11. SCROLL-REVEAL BAĞIMLILIĞI

**Öncelik:** İyileştirme

**Sorun:** İçeriğin bir kısmı JS tabanlı görünürlük animasyonuna bağlı.

**Kanıt:** Ölçüm anında `opacity < 0.15` olan ve 20 karakterden uzun metin içeren **7 öğe** vardı. Tam sayfa ekran görüntüsünde bölümler arası büyük boş alanlar bu nedenle oluşuyor.

**Risk:** `hareket.js` yüklenmez, hata verir veya yavaş bağlantıda gecikirse bu bölümler görünmez kalır. Yazdırma ve bazı okuyucu modlarında da boş çıkabilir.

**Yapılacak:** Mantık tersine çevrilsin — içerik varsayılan olarak görünür olsun, JS yüklendiğinde animasyon sınıfı eklenerek gizlenip açılsın (`.js-yuklendi` gibi bir kök sınıfı ile). `prefers-reduced-motion` durumunda animasyon tamamen atlanmalı (CSS'te medya sorgusu mevcut, davranış doğrulanmalı).

**Kabul kriteri:** JavaScript devre dışıyken ana sayfanın tüm metni okunabilir; tam sayfa ekran görüntüsünde boş bölüm yok.

---

# 12. FONT SELF-HOST VE ÜÇÜNCÜ PARTİ BAĞIMLILIĞININ KALDIRILMASI

**Öncelik:** İyileştirme

**Sorun:** Üç font ailesi kullanılıyor ve sayfanın tek üçüncü parti bağımlılığı Google Fonts.

**Kanıt:**
- Yüklenen stylesheet: `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`
- Tespit edilen tek üçüncü parti host: `fonts.googleapis.com`
- CSP'de `font-src https://fonts.gstatic.com` — `'self'` yok
- FCP 1.028s; render engelleyen dış CSS bunun önemli bir bileşeni
- Taslak sınırı 2 font ailesi; burada 3 aile var

**Yapılacak:**
- Fontlar kendi alan adına alınsın: woff2, Türkçe karakterleri kapsayan subset, `font-display: swap`, kritik ağırlıklar için `<link rel="preload">`.
- `JetBrains Mono` gerçekten gerekli değilse kaldırılsın (2 aile sınırına dönülür).
- CSP güncellensin: `font-src 'self'`, `style-src 'self' 'unsafe-inline'` (googleapis kaldırılır).
- Kullanılmayan font ağırlıkları yüklenmesin.

**Kabul kriteri:** Üçüncü parti istek sayısı 0; font dosyası sayısı ≤ 2 aile; FCP mevcut değerin altında; CSP'de `fonts.googleapis.com` ve `fonts.gstatic.com` referansı kalmamış.

---

# 13. İLETİŞİM FORMU DÜZELTMELERİ

**Öncelik:** İyileştirme

**Mevcut olumlu durum:** Form alanları: `ad_soyad`, `otel_adi`, `telefon`, `eposta`, `konu` (select), `mesaj`, `bos_birakin`. **Tüm alanlar label'lı.** `bos_birakin` alanı bir honeypot — spam koruması düşünülmüş.

**Sorunlar ve yapılacaklar:**
- **Honeypot ekran okuyucuya açık.** `bos_birakin` alanı label'lı ve odaklanabilir durumda; ekran okuyucu kullanıcısı "Bu alanı boş bırakın" talimatını duyuyor. `aria-hidden="true"`, `tabindex="-1"` eklenmeli ve görsel olarak erişilemez hale getirilmeli (`display:none` yerine off-screen tekniği kullanılırsa bot yakalama oranı korunur).
- **KVKK onayı zımni.** Mevcut metin: "Formu göndererek KVKK Aydınlatma Metni'ni okuduğunuzu kabul etmiş olursunuz." Açık rıza için işaretlenebilir onay kutusu daha güvenli; ticari iletişim izni isteniyorsa bu ayrı ve opsiyonel bir kutu olmalı (birleşik onay alınmamalı).
- **Sunucu tarafı akış test edilmedi** (form gönderilmedi). Şunlar elle doğrulanmalı: sunucu tarafı doğrulama, rate limit, başarılı gönderim durumu, hata durumu mesajları, ekibe bildirim e-postası, gönderene otomatik yanıt.
- `telefon` alanı zorunlu görünüyor ancak `otel_adi` ve `mesaj` opsiyonel — alan sayısı azaltılırsa dönüşüm artar; en azından hangi alanların zorunlu olduğu görsel olarak işaretlenmeli.

**Kabul kriteri:** Honeypot ekran okuyucu ve klavye ile erişilemez; KVKK onayı açık eylemle alınıyor; boş/hatalı gönderim anlaşılır hata mesajı veriyor; başarılı gönderimde hem kullanıcı hem ekip bilgilendiriliyor; aynı IP'den kısa aralıkta tekrarlanan gönderim engelleniyor.

---

# 14. HSTS BAŞLIĞININ TAMAMLANMASI

**Öncelik:** İyileştirme

**Kanıt:** Tüm yanıtlarda `strict-transport-security: max-age=63072000` — `includeSubDomains` ve `preload` direktifleri yok.

**Yapılacak:** `strict-transport-security: max-age=63072000; includeSubDomains; preload`

**Dikkat:** `includeSubDomains` eklenmeden önce `app.oteldijital.com` dahil tüm alt alan adlarının HTTPS ile çalıştığı doğrulanmalı; aksi halde alt alan adı erişilemez hale gelir. `preload` listesine başvuru geri alınması zor bir işlemdir, önce `includeSubDomains` ile bir süre yayında kalınması önerilir.

**Kabul kriteri:** Başlık güncellenmiş ve tüm alt alan adları HTTPS üzerinden sorunsuz çalışıyor.

---

# 15. NAVİGASYON ADLANDIRMASI VE HİYERARŞİ

**Öncelik:** İyileştirme (Madde 9 ile birlikte yapılır)

**Sorun:** Menüdeki hizmet adlandırması asimetrik.

**Kanıt:** Header bağlantıları: `OtelDijital → /` · `İç Operasyon → /` · `Dijital Vitrin → /dijital-vitrin` · `Teknolojik Altyapı → /teknolojik-altyapi` · `Fiyatlandırma → /fiyatlandirma` · `İletişim → /iletisim` · `Giriş Yap → app.oteldijital.com/giris` · `DEMO İSTE → app.oteldijital.com/kayit`

Yani üç hizmetten biri (`İç Operasyon`) kök dizinde, diğer ikisi alt sayfada. Logo ve "İç Operasyon" aynı adrese gidiyor.

**Müşteri açısından sonucu:** Ana sayfa hem şirket vitrini hem tek bir ürünün sayfası. Kullanıcı üç hizmetin eşit olup olmadığını anlayamıyor.

**Yapılacak:** Tercih edilen çözüm — `/ic-operasyon` ayrı sayfa olarak oluşturulsun (Madde 9'daki taşınan içerik buraya gider), ana sayfa üç hizmeti eşit sunan bir vitrin olsun. Menüde `İç Operasyon` bu yeni sayfaya bağlanır. Alternatif olarak mevcut yapı korunup menüye ayrı bir `Ana Sayfa` girdisi eklenebilir, ancak bu daha zayıf bir çözümdür.

**Kabul kriteri:** Menüdeki her hizmet kendi URL'sine sahip; logo ile hiçbir menü öğesi aynı adrese gitmiyor; üç hizmet menüde eşit seviyede.

---

# BOZULMAMASI GEREKENLER (REGRESYON KONTROL LİSTESİ)

Değişikliklerden sonra şunlar tekrar doğrulanmalı:

- [ ] Toplam transfer ≤ 250KB, istek sayısı makul (mevcut: 23KB / 6 istek)
- [ ] TTFB ≤ 400ms, load ≤ 2s (mevcut: 153ms / 1.07s)
- [ ] LCP mobil ≤ 2.5s, CLS ≤ 0.1
- [ ] CSP hâlâ `script-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'` içeriyor; `unsafe-inline` script'te yok
- [ ] HSTS, `x-content-type-options`, `referrer-policy`, `permissions-policy` başlıkları duruyor
- [ ] 320px ve 390px'te yatay kaydırma yok (`scrollWidth == clientWidth`)
- [ ] `skip link`, `<main>`, `lang="tr"` duruyor
- [ ] Tüm form alanları label'lı
- [ ] Uydurma müşteri / referans / istatistik / logo eklenmemiş
- [ ] Örnek veriler hâlâ "örnek" olarak etiketli ("Örnek akış…", "Deniz Otel · örnek rapor")
- [ ] Title ve meta description uzunlukları korunuyor (mevcut: 58 / 146 karakter)
- [ ] OG görseli 1200×630 ve `og:image:alt` mevcut
- [ ] `robots.txt` ve `sitemap.xml` erişilebilir ve geçerli
- [ ] Konsolda hata/uyarı yok

---

# DENETİM VERİLERİ (REFERANS)

Ölçüm tarihi: 21 Eylül 2026, gerçek tarayıcı (masaüstü 1920×1001; mobil emülasyon 390×844 ve 320×700).

| Metrik | Değer |
|---|---|
| Toplam transfer | 23 KB |
| İstek sayısı | 6 |
| HTML | 12 KB |
| JS | 6 KB |
| CSS | 17 KB |
| TTFB | 153 ms |
| FCP | 1.028 s |
| DOMContentLoaded | 684 ms |
| Load | 1.072 s |
| Üçüncü parti host | 1 (`fonts.googleapis.com`) |
| Ana sayfa yüksekliği | 13.648 px |
| Ana sayfa metin uzunluğu | 10.383 karakter |
| `<h1>` / `<h2>` / `<h3>` | 1 / 11 / 18 |
| `<img>` sayısı (tüm sayfalar) | 0 |
| `<form>` sayısı | 1 (yalnızca `/iletisim`) |
| Font ailesi | 3 (Cormorant Garamond, Inter, JetBrains Mono) |
| Kontrast eşiği altındaki öğe | 11 |
| Analitik | Yok |
| Structured data | 1 blok (`Organization`), yalnızca ana sayfada |
| 404 yanıtı | `text/plain`, 79 byte, ham sağlayıcı metni |
