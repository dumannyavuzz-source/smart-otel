# 007 — Vitrin İletişim Formu: Ziyaretçi Yalnızca Yazar

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-17
> **Durum:** Canlıda (staging). Göçler: `…_iletisim_formu.sql` (tablo, kilit, sel kapısı v1) ve
> `…_iletisim_sel_kapisi_v2.sql` (güvenlik incelemesi sonrası düzeltmeler).
> Denemeler: `supabase/tests/guvenlik_denemeleri.sql` · 26. bölüm (30 deneme, hepsi geçti)

---

## Durum

Vitrindeki iletişim formu önce ziyaretçinin posta uygulamasını açıyordu (`mailto:`). Genel Müdür
bunu reddetti: posta uygulaması olmayan cihazda form tepkisiz kalıyor, premium bir ürüne yakışmıyor.
Karar: mesajlar **arka planda Ortak Beyin'e (Supabase) yazılır**, ziyaretçi sayfa yenilenmeden bir
onay ekranı görür.

Bu, sistemin kimlik doğrulamasız **ikinci** yazma yoludur (ilki kayıt kapısı, `docs/security/005`).
Kimlik doğrulamasız her yazma yolu bir kapıdır ve kapının kilidi aşağıdadır.

## Kilit üç cümlede

1. **Ziyaretçi yalnızca yazar.** Ziyaretçi anahtarı (`anon`) tabloya ekleme yapabilir; altı sütuna
   (ad, otel, telefon, e-posta, konu, mesaj) ve yalnızca onlara. Kimlik, tarih ve adres özetini
   veritabanı kendisi koyar.
2. **Kimse okuyamaz, değiştiremez, silemez.** Okuma, güncelleme ve silme kuralı hiç kimseye
   yazılmadı; kural yoksa kilit kapalıdır. Giriş yapmış personel bu tabloya **ekleme de yapamaz**
   (sınandı: 26p–26r). Mesajlar yalnızca Supabase panelinden (ana anahtar) okunur.
3. **Sel kapısı.** Aynı adresten saatte en fazla 5 mesaj; toplamda saatte en fazla 300. Fazlası
   reddedilir. Eş zamanlı istekler bir danışma kilidiyle sıraya girer; sayım her zaman doğrudur.

## Neden `hotel_id` yok? (bilinçli istisna)

`supabase/README.md` her yeni tabloda `hotel_id` ister. Bu tablo o kuralın istisnasıdır çünkü bir
otelin verisi değildir: yazan kişi henüz müşteri değil, otelin bir kaydı yok. Bu bir **satış öncesi
posta kutusudur**. Otel ayrımı yerine tam kapalılık uygulanır — hiçbir uygulama kullanıcısı bu
tabloyu göremez, ona yazamaz.

## Veri tarafındaki kontroller (veritabanı, ekran değil)

Tetikleyici önce alanları **kırpar** (baştaki/sondaki boşluk, sekme, satır sonu; boş kalan isteğe
bağlı alan `null` olur; e-posta küçük harfe iner), kısıtlar sonra **ham uzunluğu** ölçer. Böylece
"Ali" + yüz bin boşluk depoya "Ali" olarak girer; içi boşlukla şişirilmiş ad ise reddedilir.

| Alan | Kural |
|---|---|
| `ad_soyad` | zorunlu · 2–80 karakter |
| `otel_adi` | isteğe bağlı · ≤ 80 |
| `telefon` | zorunlu · 6–24 · yalnızca rakam ve `+ ( ) . -` boşluk |
| `eposta` | zorunlu · ≤ 120 · `a@b.c` biçiminde |
| `konu` | yalnızca beş değer: Teknik Altyapı · OTA & Dijital Yönetim · Web Sitesi · SEO · Diğer |
| `mesaj` | isteğe bağlı · ≤ 2000 |
| `ip_ozeti` | veritabanı yazar; ziyaretçi dokunamaz (sınandı: 26s) |
| `olusturulma_tarihi` | veritabanı yazar; ziyaretçi dokunamaz (sınandı: 26e) |

Ekrandaki (`vitrin/index.html`) `required`, `maxlength`, `type="email"` yalnızca nezakettir;
uygulamayı atlayıp doğrudan sunucuya yazan da aynı kurallara çarpar.

## Adres nasıl belirlenir, özet ne kadar korur?

- Önce Cloudflare'in koyduğu `cf-connecting-ip` okunur; yoksa `x-forwarded-for`'un **son** parçası.
  İlk parça istemcinin kendi yazdığı değerdir ve sayılmaz — güvenlik incelemesinin ilk sürümde
  bulduğu açık buydu (sahte adresle sınır atlanıyordu). Canlıda doğrulandı: sahte
  `X-Forwarded-For: 1.1.1.1` gönderilen istekte gerçek adresin özeti kaydedildi.
- Adres açık yazılmaz; SHA-256 özeti saklanır (kayıt kapısıyla aynı algoritma). **Bu bir gizleme
  değildir:** tuzsuz özet, 4 milyar IPv4 adresi denenerek geri çevrilebilir. Bu yüzden `ip_ozeti`
  KVKK açısından **kişisel veri sayılır** ve saklama süresine dahildir. Amacı gizlemek değil,
  "aynı yerden mi?" sorusuna cevap vermektir.

## Toplam sınır bir hizmet engelleme koludur (bilinçli tercih)

Saatte 300 toplam sınırı veritabanını selden korur; ama 60 farklı adresten 5'er mesaj gönderen
biri formu bir saatliğine **herkes için** kapatabilir. Kabul edilen sınır budur: o durumda ziyaretçi
"gönderilemedi" notunu ve e-posta adresini görür, yolsuz kalmaz. Asıl savunma adres sınırıdır.
Bunun fark edilmesi için henüz bir gözcü yok (aşağıda "Açık kalan").

## Ziyaretçi anahtarı nerede durur, ne yapabilir?

Anahtar **git'te yoktur**. `vitrin/ayarlar.js` dosyası `.gitignore`'dadır; Vercel'de depo
kökündeki `ayarlar-uret.sh` her dağıtımda ortam değişkenlerinden (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
üretir. Betik şunları reddeder ve dağıtımı durdurur: değişken eksikse; anahtar gizli anahtarsa
(`sb_secret_…` ya da rolü `service_role` olan JWT); adres `https://<proje>.supabase.co` değilse.
Anahtar tarama betiği (`supabase/scripts/ana_anahtar_taramasi.sh`) JWT biçimindeki her anahtarı
yakaladığı için bu düzen zorunludur; ayrıca CLAUDE.md · 1.3 ile uyumludur.

Ziyaretçi anahtarı tarayıcıda görünür — bu Supabase'in tasarımıdır. Bu anahtar sistemin başka
kapılarını da çağırabilir (giriş uçları, anahtarsız kapılar, depolama uçları); her birinin kendi
kilidi vardır ve ayrı belgelenmiştir. **Bu tabloda** yapabildiği tek şey yazmaktır.

## Ekran tarafı (vitrin)

- `Prefer: return=minimal`: cevapta satır istenmez (ziyaretçinin okuma yetkisi yok; istense 401 dönerdi).
- **Zaman aşımı 15 saniye:** cevap gelmezse düğme sonsuza dek "Gönderiliyor…" kalmaz; hata notu ve
  e-posta adresi görünür.
- **Tuzak alan** (`bos_birakin`): insan görmez, bot doldurur. Doluysa "alındı" denir, hiçbir şey
  gönderilmez. Adı bilerek adres/web sitesi çağrıştırmaz — tarayıcı otomatik doldurması gerçek
  ziyaretçinin mesajını yutmasın. Bu yalnızca form üzerinden gelen botlara karşıdır; doğrudan
  API'ye yazan botu sel kapısı **yavaşlatır** (durdurmaz).
- **İçerik güvenlik politikası** (depo kökündeki `vercel.json`): betik yalnızca kendi alanından, bağlantı
  yalnızca kendi alanı ve `*.supabase.co`; sayfa başka bir sayfaya gömülemez. Olası bir betik
  enjeksiyonunda anahtar ve form verisi başka bir yere gönderilemez. Politika yerelde `<meta>`
  ile sınandı: ihlal yok, form çalışıyor.
- Gönderilemezse ekranda e-posta adresi gösterilir; betik kapalıysa `<noscript>` notu aynı adresi gösterir.

## Canlı doğrulama (2026-09-17, staging)

| Deneme | Sonuç |
|---|---|
| Ziyaretçi anahtarıyla REST üzerinden ekleme | 201 |
| Aynı anahtarla okuma (`GET`) · silme (`DELETE`) | 401 · 401 |
| Sahte `X-Forwarded-For: 1.1.1.1` ile ekleme | Gerçek adresin özeti kaydedildi, sahte olan değil |
| Gerçek tarayıcıdan form gönderimi (başsız Edge, CSP altında) | Satır düştü, onay ekranı göründü, ihlal yok |
| Dağıtım betiği: service_role JWT · `sb_secret_` · eksik değişken · yanlış adres | Dördü de durdurdu |
| 185 güvenlik denemesi (30'u bu tablo için) | Hepsi geçti |

Deneme satırları silindi; tablo boş başlıyor. Güvenlik Denetçisi'nin ilk sürümde bulduğu beş orta
bulgu (sahte başlık, toplam sınır, yarış, boşluk açığı, betik koruması) ve altı düşük bulgu bu
belgeye ve `…_sel_kapisi_v2.sql` göçüne işlendi.

## Açık kalan

- **KVKK:** form kişisel veri toplar (ad, telefon, e-posta, adres özeti). Aydınlatma metni henüz
  yazılmadı; formun altındaki bağlantı şimdilik `#`. Metin yazılınca **saklama süresi** belirlenmeli
  (örneğin: yanıtlanmış mesajlar 12 ay sonra silinir). Şimdilik satırlar süresiz durur.
- **Bildirim ve gözcü:** yeni mesaj geldiğinde kimseye haber gitmez; Genel Müdür Supabase panelinden
  bakar. Toplam sınıra çarpıldığında da kimse fark etmez. E-posta bildirimi ya da günlük satır
  sayısı bakışı istenirse ayrı bir kapı (Edge Function) gerekir — ayrı karar.
- **Cloudflare'sız ortam:** yerel çalışmada başlık yoksa adres özeti boş kalır; o zaman yalnızca
  toplam sınır çalışır. Canlıda (Supabase, Cloudflare arkasında) başlık her istekte var.
