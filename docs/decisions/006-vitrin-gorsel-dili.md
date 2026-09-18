# 006 — Vitrinin Görsel Dili: "Premium Teknoloji Şirketi"

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-17
> **Durum:** ⛔ **GEÇERSİZ** (2026-09-18) — yerini `007-sakin-luks-gorsel-dili.md` ve `DESIGN_SYSTEM.md` aldı. Bu dosya tarihçe olarak durur; kural olarak okunmaz.
> Kod: `vitrin/stil.css`, `vitrin/index.html`

---

## Durum

Vitrin, gece yarısı zeminli koyu bir sayfaydı. Genel Müdür yönü değiştirdi: sayfa artık bir
**katalog** gibi değil, sakin ve ferah bir **ürün sayfası** gibi görünmelidir.

## Karar

### 1. Renk oranı: %70 açık · %20 koyu · %10 marka
- **%70 açık** — kırık beyaz zemin (`#f6f7f9`), beyaz kartlar. Sayfanın nefesi burada.
- **%20 koyu** — antrasit (`#14181d`). Yalnızca üç yerde: yazı, hero'daki telefon çerçevesi, alt bölüm.
- **%10 marka** — turuncu (`#ff6a1f`). Yalnızca **eylem** için: butonlar ve tek bir vurgu kelimesi.

Oran bozulursa sayfa katalog hissine döner. **Yeni renk eklenmez.** Yeşil ve sarı yalnızca
durum anlatır (canlı akış, dikkat) ve asla vurgu yerine kullanılmaz.

### 2. Tek yazı ailesi: Inter
Başlık ve gövde aynı aileden gelir; ayrım yalnızca **ağırlık ve harf aralığıyla** kurulur
(başlıklar 700 ve sıkı aralık). Veriler için JetBrains Mono kalır. Üç ayrı yazı ailesi kullanmak
sayfayı kalabalıklaştırıyordu.

### 3. Yüzey dili
İnce çizgi (1px), **büyük yuvarlatılmış köşeler** (16 / 26 / 40 px), hafif cam (blur) ve yumuşak
gölge. Kalın çerçeve, sert gölge, renkli dolgu yoktur. Butonlar hap biçimindedir.

### 4. Menü sade
Solda marka, **tam ortada** beş bağlantı, sağda tek eylem: "30 Gün Ücretsiz Dene". Başka hiçbir
şey konmaz — menüye eklenen her madde diğerlerinin değerini düşürür.

### 5. Hero'da fotoğraf yok
Klasik otel fotoğrafı kaldırıldı. Sağda **kodla çizilmiş bir telefon** durur ve ekranındaki akış
gerçekten kıpırdar: ziyaretçi ürünün kendisini görür, sahnelenmiş bir fotoğrafı değil.
Telefon sayfanın sağ kenarından hafifçe taşar; önünde cam bir kart durur.

## Henüz bölümü olmayan menü maddeleri

Menüdeki **Çözümler**, **Dijital Check-up** ve **Hakkımızda** için sayfada tam karşılığı olan bölüm
yoktur. Bağlantılar bugün en yakın bölüme gider (sırasıyla şifre bölümü, fiyatlar ve alt bölüm).
Sonraki aşamalarda bu bölümler yazılınca kendi yerlerine bağlanacaklardır.

## Aşama 4 — Etkileşimli tanıtım (2026-09-17)

İki bölüm eklendi; ikisi de sayfanın dilini bozmaz ve **betik olmadan da anlamlıdır**:

- **Döngü hikâyesi** (`#dongu`) — "Bildir → Ata → Yap → Tamamla". Kullanıcı aşağı kaydırdıkça
  adımlar belirir; her adımın yanında uygulamadan küçük bir arayüz kesiti durur. Gizleme yalnızca
  betik çalışıyorsa başlar, bu yüzden betiksiz ziyaretçi dört adımı da baştan görür.
  Hareket istemeyen kullanıcıda (`prefers-reduced-motion`) hiçbir şey kıpırdamaz.
- **Keşif alanı** (`#kesfet`) — ortada telefon, iki yanında dört başlık: Temizlik, Arıza, Görev,
  Malzeme. Başlığa dokununca telefondaki ekran değişir. Dar ekranda düğmeler ikişerli ızgaraya,
  telefon altına geçer. Ekranların dördü de HTML'de açıktır; betik yalnızca birini bırakır.

Menüdeki **Çözümler** artık gerçek bir yere gidiyor (`#kesfet`). Hero'daki "Uygulamayı Keşfet"
düğmesi de aynı bölüme iner.

## Aşama 5 — Dijital check-up, hizmetler ve teknik altyapı (2026-09-17)

Sayfa bu aşamada "otelin içi"nden "otelin dışı"na geçer. Dört bölüm eklendi:

- **Dijital check-up** (`#checkup`) — keşif alanından sonra bilerek geniş bir boşluk ve tek bir
  geçiş cümlesi: *"Otelin içini yönetiyoruz. Peki dışarıdan nasıl görünüyor?"* Altında örnek bir
  **durum panosu**: 78/100 toplam skor (halka), altı başlık (Web 84 · Google 91 · Rezervasyon 76 ·
  OTA 72 · SEO 69 · AI 63) ince çubuklarla, altta "12 geliştirme alanı bulundu" ve tek düğme.
  Veri **tek renkle** (antrasit) çizilir; turuncu yalnızca düğmede kalır — oran bozulmaz.
  Pano betiksiz de doludur; betik yalnızca görününce dolma hareketi ekler.
- **OTA ve dijital yönetim** (`#dijital`) — check-up'taki altı başlığın karşılığı: OTA yönetimi,
  Channel Manager, Google, web sitesi, online itibar, SEO. Değer sütunlarıyla aynı kart dili.
- **Teknik altyapı** (`#teknik`) — "Otelin arkasındaki teknoloji": Wi-Fi, ağ, güvenlik kameraları,
  sunucu, NAS, UPS. Katalog değil: fiyat yok, marka yok, parça listesi yok; her kartta tek cümle
  fayda ve bir satır teknik not.
- **İletişim** (`#iletisim`) — hizmet düğmelerinin indiği kart; tek kanal e-posta.

**Çağrı kuralı:** hizmet bölümlerinde yalnızca **"Bilgi Al"** ve **"Teknik Destek Al"** vardır ve
ikisi de iletişim bölümüne iner. Bu bölümler ziyaretçiyi demo üyeliğine yönlendirmez (Genel Müdür
kararı). Ana çağrı "30 Gün Ücretsiz Dene" yalnızca uygulama bölümlerinde kalır.

Menüdeki **Dijital Check-up** artık kendi bölümüne (`#checkup`) gider. Kendi bölümü olmayan tek
menü maddesi **Hakkımızda**'dır; o hâlâ alt bölüme iner.

Bu aşamada bir de önceki aşamadan kalan hata düzeltildi: değer sütunlarındaki liste ile döngü
kartları aynı sınıf adını (`.mini`) paylaşıyordu ve kartların yan boşluğu siliniyordu. Liste
artık `.sutun-liste` adını taşıyor.

## Aşama 6 — İletişim formu ve yasal bağlantılar (2026-09-17)

- **Cam kart içinde form** (`#iletisim`) — Genel Müdür'ün "şık, cam efektli ve premium" isteğiyle.
  Arkada iki çok soluk ışık (marka ve antrasit) durur, kart onları bulanıklaştırır; böylece cam
  efekti bir anlam taşır. Alanlar: Ad Soyad, Otel Adı (isteğe bağlı), Telefon, E-posta,
  İlgilendiğiniz Konu (Teknik Altyapı · OTA & Dijital Yönetim · Web Sitesi · SEO · Diğer),
  Mesaj (isteğe bağlı). Düğme marka renginde: **"Gönder"**.
- **Form Ortak Beyin'e yazar** (Aşama 7 kararı). İlk sürüm posta uygulamasını açıyordu (`mailto:`);
  Genel Müdür bunu reddetti — posta uygulaması olmayan cihazda form tepkisiz kalır. Şimdi "Gönder"
  mesajı Supabase'deki `iletisim_formu` tablosuna yazar; alanlar yumuşakça kaybolur, yerini onay
  ekranı alır ("Mesajınız başarıyla alındı…"). Kilit ve canlı doğrulama: `docs/security/007`.
  Formun altında KVKK Aydınlatma Metni'ne giden tek satırlık bir not vardır.
- **Yasal bağlantılar** alt bölüme eklendi: KVKK Aydınlatma Metni, Gizlilik Politikası, Çerez
  Politikası, Kullanım Şartları. Metinler henüz yazılmadığı için bağlantılar şimdilik `#`
  adresine gider.

**Karar verildi (Aşama 7):** gönderiler saklanır. Anahtar yönetimi (`ayarlar-uret.sh`), yalnızca-yazma
izni (RLS) ve sel kapısı uygulandı; KVKK saklama süresi ise yasal metinle birlikte belirlenecek
(`docs/security/007` · Açık kalan).
