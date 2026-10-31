# 028 — Kayıt Kutusu, Kayıt Durumları ve Doğrulanmış Gönderim

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-10-23
> **Durum:** Uygulandı (yetki planı · Aşama 1). Yalnızca personel uygulaması değişti; veritabanına,
> göçlere ve canlı sisteme dokunulmadı. Canlıya çıkmadı.
> Kod: `app/src/kayitDeposu.ts`, `app/src/tasima.ts`, `app/src/postaci.ts`, `app/src/beyanlar.ts`,
> `app/src/isEmirleri.ts`, `app/src/teslimler.ts`, `app/src/kullanici.ts`, `app/src/telefonDeposu.ts`,
> `app/src/ekranlar/KayitlarimEkrani.tsx`, `app/src/ekranlar/TamamEkrani.tsx` (+ sonuç cümleleri)
> **Güncelleme (Genel Müdür, 2026-10-24):** yüklenen fotoğrafın yerel kopyası kayıt doğrulanana kadar
> korunur (§3); iş listesine yalnızca kişinin aktif oteldeki bekleyenleri uygulanır (§5); 30 günlük
> otomatik budama kaldırıldı (§3); Kayıtlarım'da geç dönen sorgu düzeltmesi (§6).

---

## Sorun

1. **Uygulanmayan işlem başarılı görünüyordu.** "Aldım/Çözdüm" sunucuya "şu satırı güncelle" diye
   gidiyordu; hiçbir satır değişmese de hata gelmiyor, telefon kaydı siliyordu. Ekran da sunucu
   görmeden "Oda 204 hazır", "çözüldü", "teslim alındı" diyordu.
2. **Reddedilen "Aldım/Çözdüm" sessizce siliniyordu.** Kişi ne olduğunu hiç öğrenmiyordu.
3. **Eski sürüm yeni davranışı bozabilirdi.** Telefonda eski sürüm (ya da eski bir sekme) açık kalırsa
   aynı kutudaki reddedilen kaydı yine silerdi.

## Karar (Genel Müdür, 2026-10-23)

- Telefona kaydedildi, sunucuda tamamlandı ve reddedildi **ayrı** gösterilir.
- Kesin reddedilen kayıt **otomatik yeniden gönderilmez**; silinmez, nedeniyle saklanır, arşivlenebilir.
- Yalnızca giriş yapan kişinin **aktif oteldeki** kayıtları gönderilir; diğer otellerinki korunur.
- Bir iş, sunucudaki satır **kişi + otel + içerikle** eşleşmeden "tamamlandı" sayılmaz.

## 1. Ayrı kayıt kutusu — neden yeni bir veritabanı?

Kayıtlar artık `smartotel-kayitlar` adlı **ayrı** bir telefon veritabanında durur.

| Seçenek | Sonuç |
|---|---|
| Eski veritabanının (`smartotel`) sürümünü yükseltmek | **Elendi.** Dexie kendinden yeni bir veritabanını açmaz: eski sürüme dönülünce uygulama telefonda açılmazdı. |
| Eski kutuya yeni alanlar eklemek | **Elendi.** Eski sürüm reddedilen "Aldım/Çözdüm"ü yine silerdi. |
| Ayrı veritabanı | **Seçildi.** Eski sürüm onu tanımaz: ne okur ne siler. `smartotel` sürümü 5'te kalır. |

`smartotel` içindeki iş listesine eklenen `onayBekliyor` alanı dizinsizdir; sürüm gerektirmez.

## 2. Taşıma (`tasima.ts`)

Yeni sürüm her gönderim turundan önce eski kutuya bakar. Kural: eski kayıt, yenisi fotoğraflarıyla
yazılıp **geri okunarak doğrulanmadan** silinmez.

1. Kayıt ve fotoğrafları yeni kutuya **tek işlemde** yazılır (yer dolarsa hiçbiri yazılmaz).
2. Geri okunur: kayıt orada mı, her fotoğraf aynı bayt sayısı ve içerikle mi?
3. Ancak o zaman eski kutudan silinir.

Yarıda kalırsa eski kayıt yerinde durur; sonraki tur aynı kimlikle güvenle tamamlar (çift kayıt yok).
Kayıtların oteli içerikten, "Aldım/Çözdüm"de telefondaki işten okunur; **tahmin edilmez**.
Bilinemiyorsa otel boş kalır, kayıt gönderilmez, ekranda görünür; internet gelince sunucudan öğrenilir.

Eski sürümde "kalıcı" sayılmış kayıt: hata bir bağlantı/oturum sorunu gibi görünüyorsa bekler; sunucu
reddiyse **yeniden gönderilmez**, önce sunucuda var mı diye bakılır (varsa ve eşleşiyorsa tamamlandı,
yoksa reddedildi).

**Eski sekmeye karşı güvence kilitte değildir** (eski sürüm kilidi tanımaz). Güvence şudur:
eski sekme kaydı gönderip silmişse yeni kutudaki kopya yeniden gider, sunucu aynı kimliği tanır,
eşleştirme "tamamlandı" der. **Kalan sınır:** eski sekme, yeni sekme kopyalamadan *önce* reddedilen bir
"Aldım/Çözdüm"ü silebilir.

## 3. Kayıt durumları

| Durum | Anlamı | Kuyrukta mı? |
|---|---|---|
| bekliyor | Telefona kaydedildi, sırası gelince gider | Evet |
| belirsiz | Cevap geldi ama sonuç net değil; sunucuya bakılarak doğrulanır | Evet |
| tamamlandı | Sunucuda kişi + otel + içerikle eşleşti | Hayır — **geçmişte** |
| reddedildi | Sunucu kesin "hayır" dedi; neden saklanır, otomatik tekrar yok | Hayır — **dikkat** |
| çakışma | Sunucuda aynı kimlikle başka bir kayıt var (kişi, otel ya da içerik farklı) | Hayır — **dikkat** |

**Kuyruktan çıkmak silinmek değildir:**
- Tamamlanan kayıt kuyruktan çıkar; telefonda yalnızca **kısa özeti** kalır (içerik ve fotoğraf silinir —
  ortak telefon gizliliği).
- Reddedilen ve çakışan kayıt içeriği ve fotoğrafıyla saklanır. "Gördüm, arşivle" uyarıyı susturur;
  kaydı da fotoğrafı da silmez.
- **Hiçbir kayıt telefondan kendiliğinden silinmez** — tamamlanmış özetler de. Önceki "30 gün sonra
  budanır" kuralı 2026-10-24'te kaldırıldı; saklama süresi ayrıca kararlaştırılacak. O zamana kadar
  tamamlanmış özetler telefonda birikir (her biri yalnızca birkaç satırlık özet; içerik ve fotoğraf yok).

**Fotoğrafın yerel kopyası (2026-10-24):** fotoğraf sunucuya yüklendiğinde telefondan **silinmez**;
kayıt yalnızca "bu fotoğraf yüklendi" diye işaretlenir (`yuklenenFotograflar`), böylece ikinci kez
yüklenmez. Kopya ancak kayıt sunucuda **doğrulanınca** (tamamlandı) silinir. Asıl kayıt reddedilir,
çakışır, belirsiz kalır ya da bağlantı koparsa fotoğraf telefonda kalır; arşivlemek de onu silmez.
Eski sürümden taşınan kayıtlarda tepside olmayan fotoğraf, eski sürümün kuralıyla "yüklenmiş" sayılır.

## 4. Sunucu cevabı nasıl okunur?

- **Geçici** (bekle, yeniden dene): bağlantı yok, oturum kartının süresi dolmuş (401 / PGRST3xx),
  zaman aşımı, yoğunluk (429), sunucu hatası (5xx).
- **Kesin** (sakla, kendiliğinden gönderme): kural ve kilit retleri (P0001, 42501 vb.).
  Kesin retten önce sunucuya bakılır — önceki bir deneme zaten yazmış olabilir.
- Yazmanın ardından satır **geri istenir**. Satır dönmezse (zaten var / görünmüyor) sunucuya sorulur.

**Eşleştirme:**
- Beyan: sunucudaki otel = kaydın oteli, imza (`created_by`, teslimde `received_by`) = kayıt sahibi,
  gönderilen her alan aynı (miktar 2 basamağa, saat ana göre, madde sırası gözetmeden karşılaştırılır).
- Aldım: iş sunucuda kayıt sahibinde (ve devam ediyor ya da kendisi çözmüş).
- Çözdüm: iş çözülmüş **ve** çözen kayıt sahibi (fotoğraf yolu da aynı).

## 5. Bağlam: kişi ve aktif otel

Gönderim başlarken kişi + otel + bağlam sürümü not edilir. **Her kayıttan önce** yeniden bakılır;
değiştiyse (ortak telefonda çıkış/giriş, otel değişimi — A→B→A dahil) postacı durur. O an yoldaki
cevabın sonucu yalnızca **sahibinin** kaydına yazılır; yeni kişinin ekranında görünmez. İş listesinin
sunucuya göre düzeltilmesi de yalnızca bağlam aynıysa yapılır.

**İş listesi (`isEmirleri.ts`, 2026-10-24):** sunucudan inen listeye henüz doğrulanmamış "Aldım/Çözdüm"ler
yeniden uygulanırken yalnızca **giriş yapan kişinin, aktif oteldeki** kayıtları kullanılır; kaydın oteli
işin oteliyle de uyuşmalıdır. Ortak telefonda başkasının ya da diğer otelin bekleyen işlemi listeyi
değiştirmez; kayıt silinmez, sahibi o otelde tekrar girince yine uygulanır. Liste yoldayken kişi ya da
otel değişirse gelen cevap telefondaki listeye yazılmaz.

## 6. Ekranda ne değişti

- Sonuç ekranı: "📱 Telefona kaydedildi" → "✓ Sunucuda tamamlandı" → ya da "! Sunucu kabul etmedi".
  "Oda 204 hazır / çözüldü / teslim alındı" cümleleri "… kaydedildi" oldu.
- İş ekranı: "Telefona kaydedildi · sunucunun onayı bekleniyor".
- Ana ekran ve müdür paneli: **Kayıtlarım** düğmesi. Ana ekrandaki satır kabul edilmeyen, bu otelde
  bekleyen ve başka otelde bekleyen kayıtları ayrı söyler.
- Kayıtlarım: kabul edilmeyenler (neden + fotoğraf + arşivle), bekleyenler, başka otelde bekleyenler,
  tamamlananlar, arşiv. Başkasının kaydı görünmez; fotoğraf önizlemesi yalnızca sahibine.
- Kayıtlarım, ortak telefon (2026-10-24): kişi her sorguda yeniden okunur. Geç dönen sorgu (eski kişinin,
  ya da yerine yenisi başlamış olan) ekrana yazılmaz; fotoğraf cevabı kişi değiştikten sonra gelirse
  gösterilmez; çizerken sahibi bugünkü kişi olmayan kayıt çizilmez.
- Bekleyen fotoğraf sınırı (50) **kuyruktaki** kayıtların telefondaki fotoğraflarını sayar (yüklenmiş ama
  kaydı henüz doğrulanmamış olanlar dahil — yer tutarlar, doğrulanınca silinirler). Reddedilip saklanan
  kayıtların fotoğrafları sayılmaz, yeni bildirimi engellemez.

## 7. Geri dönüş yöntemi

- **Uygulama:** Vercel'de bir önceki yayın "Promote to Production" ile geri alınır; kodda ayrı bir geri
  alma kaydı açılır (git geçmişi değiştirilmez); bu belgeye tarih ve neden eklenir.
- **Etkisi:** veritabanı değişmediği için yetkiler aynı kalır. Eski sürüm açılır (`smartotel` sürümü 5).
  Yeni kutudaki kayıtlar geri dönüş süresince **gönderilmez ama silinmez**; yeni sürüm dönünce gider.
  Eski sürümün bu arada yazdıkları eski kutuya düşer ve yeni sürüm dönünce taşınır.
- **Prova:** `app/src/tasima.test.ts` · "Eski sürüme dönüş ve yeniden yükseltme" — yalnızca testin kendi
  ürettiği deneme verileriyle. Gerçek telefonda prova canlıya çıkmadan önce yapılmalıdır (aşağıda).

## 8. Doğrulama ve kalan sınırlar

- Otomatik testler: `cd app && npm test` — 19 dosya, 180 test (2026-10-24, bu bilgisayarda geçti).
  Tip denetimi (`tsc --noEmit`) geçti; derleme geçici bir klasöre alındı ve geçti.
- Yeni testlerin hatayı yakaladığı denendi: fotoğraf ve iş listesi düzeltmeleri geçici olarak geri
  alınınca ilgili yeni testler (3 ve 4) kırıldı; düzeltmeler geri konunca geçti.
- **Kayıtlarım ekranı gerçek tarayıcıda denendi (2026-10-24):** proje içinde tarayıcı taklit eden bir test
  aracı kurulu değil; bu yüzden ekran, bu bilgisayardaki Chrome'da görünmez modda, geçici ve boş bir
  profille, gerçek IndexedDB ve yalnızca deneme verileriyle açıldı; eski kişinin sorgusu yapay olarak
  geciktirildi. Sonuç: düzeltilmiş ekranda 4/4 senaryo geçti (kendi kaydını görme; ekran açıkken kişi
  değişimi; fotoğrafın geç dönmesi; çıkış + giriş). Düzeltme öncesi ekranla aynı deneme 2 senaryoda
  **kaldı** (Ali'nin kaydı ve fotoğrafı Mehmet'e göründü) — açık gerçekti, deneme onu yakalıyor.
  Deneme düzeneği projeye eklenmedi (geçici klasörde); otomatik test takımının parçası değildir.
- 2026-10-24 düzeltmeleri, testleri: `postaci.test.ts` · "Fotoğrafın yerel kopyası" ve "tamamlanmış
  özetler kendiliğinden silinmez"; `isEmirleriBaglam.test.ts` (ortak telefon, otel değişimi, otel
  uyuşmazlığı, yoldaki liste). `ucakModu.test.ts` ve `teslimler.test.ts`'teki iki beklenti, eski
  "yüklenen fotoğraf hemen silinir" kuralına göre yazıldığı için güncellendi (testlerde not düşüldü).
- 2026-10-24 gözden geçirmesinde iki düzeltme (ikisi de testli):
  - Taşıma: eski kutuda yarıda kalmış bir kopya, yeni kutuda zaten **tamamlanmış** bir kayda aitse
    fotoğrafı yeni kutuya geri kopyalanmaz (sahipsiz fotoğraf kalırdı); eski kopya yalnızca silinir.
  - Sonuç ekranı: kaydın sahibi artık giriş yapmış kişi değilse hiçbir durum gösterilmez
    (önceki durum yazısı ekranda kalabiliyordu).
- **Elle doğrulanmadı:** Kayıtlarım dışındaki ekranlar gerçek tarayıcıda, hiçbir ekran telefonda
  denenmedi; Kayıtlarım'ın tarayıcı denemesi de uygulamanın tamamı (giriş akışı, yönlendirme) içinde değil,
  ekranın tek başına açıldığı bir deneme sayfasında yapıldı. Gerçek Supabase'e karşı
  gönderim (geri istenen satır, 401 / P0001 / 42501 kodları) Staging'de denenmedi. Testler bu davranışları
  sahte bir sunucuyla sınar. Canlıdan önce dağıtım listesi 3.5'teki telefon denemesi yapılmalıdır.
- Kesin reddedilen kaydı elle yeniden gönderme bu aşamada yoktur (ayrı karar).
- Kalan sınır: eski sekme, yeni sekme kopyalamadan önce reddedilen bir "Aldım/Çözdüm"ü silebilir.
- Kalan sınır: sunucu yazmayı yok sayar **ve** satırı göstermezse (ör. aynı kimlik başkasına ait, satır
  okuma kuralıyla gizli), kayıt "belirsiz" ile "bekliyor" arasında gidip gelir: kuyrukta kalır, kaybolmaz,
  ama kendiliğinden çakışma diye işaretlenemez. Gerçek sunucuda bu davranış Staging'de görülmeli.
- Kalan sınır: kişi değiştiğinde, önceki kişinin daha önce telefondaki iş listesine uygulanmış bekleyen
  "Aldım/Çözdüm"ü, liste sunucudan yeniden inene kadar listede görünür (internet yoksa geri alınamaz:
  sunucudaki önceki hali telefonda bilinmez). Yeni uygulanmaz; liste inince düzelir.
- Kalan sınır: tamamlanmış özetler için saklama süresi yok; karar verilene kadar telefonda birikir.
- Telefondaki kayıtlar şifrelenmeden durur: telefona fiziksel erişimi ve tarayıcı bilgisi olan biri
  okuyabilir. Ortak telefonlarda ekran kilidi önerilir.
