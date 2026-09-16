# 003 — Güvenlik: Kesirli Miktar ve Teslimat Uyuşmazlığı (Aşama 17.1)

> **Hazırlayan:** Security + Orkestratör · **Tarih:** 2026-09-16 (Aşama 17.2 ile güncellendi) · **Durum:** Açık 1 kapatıldı
> Bu belge, Aşama 17.1 kodlandıktan **sonra** yapılan denetimin sonucudur.
> Dayanak: `docs/security/001-rls-and-maker-checker.md`, `docs/decisions/004-kesirli-miktar.md`.

---

## Bu aşamada bulunup kapatılan açık

### 🔴 "Sayı olmayan sayı" ile kanıt şartı atlatılabiliyordu

Miktar sütunları tam sayıyken (`integer`) imkânsız olan bir değer, ondalıklı sayıya (`numeric`) geçişle mümkün oldu: **NaN**
("sayı olmayan sayı"). PostgreSQL NaN'ı **bütün sayılardan büyük** sayar. Sonuç:

| Kural | NaN karşısında ne oluyordu |
|---|---|
| "Miktar 0'dan büyük olmalı" | NaN geçiyordu |
| "Gelen < onaylanan mı?" (eksik teslim) | **HAYIR** diyordu → eksik teslimde **kanıt fotoğrafı istenmiyordu** |

Yani uygulamayı değil doğrudan sunucu adresini kullanan bir personel, 10 Kg onaylanmış malın 7 Kg'ı gelmişken
`NaN` yazarak kanıtsız "teslim aldım" imzası atabilirdi. Saldırgan, Maker-Checker'ın zaten savunmak için kurulduğu kişidir.

**Kapatıldı:** dört miktar sütununa da üst sınır kuralı eklendi (`quantity <= 9999`). Üst sınır hem NaN'ı hem sonsuzu keser,
çünkü ikisi de "9999'dan küçük mü?" sorusuna hayır der. `supabase/tests/guvenlik_denemeleri.sql` · 11ag–11ak maddeleri bunu dener.

### 🟠 Kanıt fotoğrafının yolu yalnızca eksik teslimde doğrulanıyordu

"Fazla geldi" ya da "tam geldi" kaydına, otelin **bambaşka** bir fotoğrafının yolu yazılabiliyor ve müdür panelinde
"eksik/hasarlı ürünün fotoğrafı" başlığıyla gösteriliyordu. **Kapatıldı:** yol yazılmışsa her durumda denetleniyor
(otelin klasöründe mi, gerçekten yüklenmiş mi). Zorunluluk yalnızca eksik teslimde kalır. Deneme: 11al.

### 🟠 Kanıt açılamazsa müdür bunu öğrenemiyordu

Fotoğrafın adresi üretilemezse ekran sonsuza kadar "açılıyor…" diyordu. Projenin "sessiz başarısızlık yok" kuralına aykırıydı.
**Kapatıldı:** ekran artık "Kanıt fotoğrafı açılamadı." der.

## Temiz çıkanlar (denendi, sağlam)

| Soru | Cevap |
|---|---|
| Teslim kuralı yeniden yazılırken bir kilit düştü mü? | **Hayır.** İki sürüm satır satır karşılaştırıldı; tek fark "onaylanan miktar" kutusunun tipidir. Dokuz kilidin dokuzu da yerinde: giriş zorunlu, talep aynı otelden, onaysız teslim olmaz, iki kez teslim olmaz, onaylayan teslim alamaz, talep eden teslim alamaz, düzeltme aynı talebi işaret etmeli, fatura fotoğrafı şartı, eksik teslimde kanıt şartı. |
| Uyuşmazlık alarmı otel sınırını aşıyor mu? | **Hayır, üç kat koruma var.** Sorgu seçili otele bağlı; `deliveries` kilidi "kendi teslimin ya da müdürsen tümü" der; teslim–talep bağı `(hotel_id, purchase_request_id)` çifti üzerinden kurulduğu için bir teslim başka otelin talebini işaret edemez. |
| Kanıt fotoğrafının imzalı adresi sızıntı yolu mu? | **Bu haliyle hayır.** Adres sunucuda üretilir ve depo, adresi vermeden önce çağıranın o fotoğrafı okuma yetkisini sorar. Süresi **5 dakikadır**: imzalı adres bir taşıyıcı bilettir, eline geçiren giriş yapmadan açar; bu yüzden kısa tutulur ve uzatılmamalıdır. Telefonda kalıcı önbelleğe de yazılmaz. |
| Uyuşmazlık ekranı yalnızca ekran kilidiyle mi korunuyor? | **Hayır.** Görevli JavaScript'i kurcalayıp sorguyu elle atsa bile veritabanı ona yalnızca kendi teslim aldığı kayıtları verir. Rota kilidi bir kolaylıktır, kilit sunucudadır. |
| Negatif ya da devasa miktar yazılabilir mi? | **Hayır.** "0'dan büyük" kuralları tip değişikliğinden sonra da yerinde; üst sınır yeni eklendi. |
| Kodda/git'te gizli anahtar var mı? | Hayır. |

## Kim neyi görür (Aşama 17.1 ile eklenenler)

| Veri | Kim görür |
|---|---|
| `/panel/uyusmazliklar` ekranı | Yalnızca müdür ve sahip (rota kilidi + veritabanı kilidi) |
| Teslim kayıtları (`deliveries`) | Müdür ve sahip otelin tümünü; görevli yalnızca kendi teslim aldıklarını |
| Onay kayıtları (`approvals`) | Müdür ve sahip tümünü; görevli yalnızca teslim alacağı, onaylanmış talebin kararını ("kaç bekliyoruz?") |
| Kanıt/fatura fotoğrafı | **Müdür ve sahip** (otelin tümü) · **fotoğrafı yükleyen kişi** (yalnızca kendi yüklediği) — imzalı adres 5 dakika geçerli |
| Arıza fotoğrafı | Otelin her üyesi (teknisyenin arızayı görmesi gerekir) |

## Açık maddeler

### ✅ Açık 1 KAPATILDI — Fatura gizliliği (Aşama 17.2)
Genel Müdür bunu "çok kritik" sayıp derhal kapatılmasını istedi: kat görevlisinin tedarikçi fiyatlarını görmesi bir zafiyettir.
`supabase/migrations/…_fatura_gizliligi.sql` ile depo kilidi ikiye ayrıldı:

| Klasör | Kim görür |
|---|---|
| `<otel>/deliveries/` (fatura · kanıt) | Müdür ve sahip otelin tümünü; **fotoğrafı yükleyen kişi yalnızca kendi yüklediğini**. Başka hiç kimse. |
| `<otel>/issues/` (arıza) | Otelin her üyesi — teknisyenin arızayı görmesi gerekir. |

Yükleme kuralı değişmedi: otelin her üyesi kendi otelinin klasörüne yükleyebilir; depo görevlisi teslim alırken
fatura fotoğrafını yükleyebilmelidir. Eski geniş kural **kaldırıldı** — kurallar birbirine eklendiği için o kalsaydı
yenisi hiçbir şeyi kapatmazdı.

**Bilinerek bırakılan tek şey:** depo görevlisi kendi çektiği fotoğrafı sonradan da görebilir. Bu bir sızıntı değildir
(fotoğrafı zaten kendi telefonuyla o çekti) ve teslim yüklemesinin sağlıklı çalışmasını garantiler.
Genel Müdür bunu da kapatmak isterse kuraldan tek satır (`or owner = auth.uid()`) çıkarılır.
Denemeler: `supabase/tests/guvenlik_denemeleri.sql` · 16b, 16e–16h.

### Açık 2 — Düzeltme kayıtları panelde ayrı alarm gibi görünür
Bir teslim düzeltildiğinde (eski kayıt durur, yenisi onu işaret eder) panelde iki kart birden çıkabilir.
Bugün ulaşılamaz: uygulamada düzeltme yazma yolu yoktur. Düzeltme ekranı yapıldığında birlikte çözülmelidir.

### Açık 3 — Aşama 16'dan devreden madde
Uygulamada şifre değiştirme yolu yok; müdür personelin şifresini bilmeye devam ediyor
(`docs/security/002-personel-kapisi-ve-panel.md` · Açık 1). Hâlâ açıktır.
