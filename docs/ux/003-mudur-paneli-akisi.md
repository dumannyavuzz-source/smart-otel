# 003 — Müdür Paneli Akışı (Ana Kumanda, onaylar, yönetim)

> **Hazırlayan:** UX + Orkestratör · **Tarih:** 2026-09-15 · **Durum:** Genel Müdür onayı bekliyor
> Kod: `app/src/ekranlar/panel/`, `app/src/panel.ts`, `app/src/panelNobeti.ts`, `app/src/ses.ts`. Dayanak: Blueprint · 3.5.

---

## Akış

```
Giriş ──▶ Ana Kumanda ──┬─ 🔴 "3 işin süresi geçti"   ──▶ Süresi Geçenler (oda · ne kadar geçti · kimde)
 (müdür)  (tek sayfa)   ├─ 🔴 "2 mutsuz misafir"      ──▶ Mutsuz Misafirler (oda · puan · yorum · saat)
                        ├─ 🟢 "Her şey yolunda"        (kırmızı yoksa; dokunulmaz, sadece haber verir)
                        ├─ 🟡 "4 onay bekliyor"        ──▶ Bekleyen Onaylar ──▶ ✕ Reddet / ✓ Onayla
                        ├─ 👥 Personel                 ──▶ Liste ──▶ ➕ Personel Ekle (ad · e-posta · şifre · görev)
                        ├─ 📦 Ürünler                  ──▶ Liste (3/8) ──▶ ➕ Ürün Ekle · Listeden çıkar/koy
                        ├─ 📷 QR Okut                  (müdür de odaya girebilir; görevlideki akışın aynısı)
                        └─ Çıkış                       (başlıkta, sağ üstte)
```

## Ekranlar

| Ekran | Ne gösterir | Tek ana eylem |
|---|---|---|
| **Ana Kumanda** | Otel adı, müdürün adı, Çıkış. Altında alarm kutuları: kırmızılar **en üstte**, kırmızı yoksa yeşil "Her şey yolunda". Sayfa dibinde Personel · Ürünler · QR Okut | kırmızı kutuya dokun |
| Süresi Geçenler | Süresi geçmiş her iş: Oda no · "25 dk geçti" · açıklama · Acil/Normal · **kimde** (personel adı ya da "Sahipsiz") | bak, kime sesleneceğini gör |
| Mutsuz Misafirler | Son 24 saatin 1–3 yıldızlı yorumları: Oda no · yıldızlar · saat · yorum | bak, odaya git |
| Bekleyen Onaylar | Her talep bir kart: ürün · istenen adet · talep eden · not. Adet **− +** ile değiştirilebilir | **✓ Onayla** (yanında ✕ Reddet) |
| Personel | Ad · görev listesi. Yalnızca görevlilerde "İşten çıkar" (müdürü/sahibi veritabanı zaten çıkartmaz) | **➕ Personel Ekle** |
| Ürünler | Personelin listesindeki ürünler, başlıkta "Personelin listesinde 5 ürün var (en fazla 8)" | **➕ Ürün Ekle** |

## Trafik lambası (renk tek başına konuşmaz)

| Renk | Ne zaman | Yanındaki yazı |
|---|---|---|
| 🔴 Kırmızı | Süresi geçen iş **veya** mutsuz misafir var | "3 işin süresi geçti" · "2 mutsuz misafir" |
| 🟡 Sarı | Onay bekleyen satın alma talebi var | "4 onay bekliyor" |
| 🟢 Yeşil | Kırmızı hiçbir şey yok | "Her şey yolunda · 7 açık iş, hepsi süresinde" |

Panel 30 saniyede bir sunucuya sorar. Alarm veritabanında **saklanmaz, hesaplanır**: "süresi geçti mi?" bir sorudur (002 · A.8).

## Çan sesi (Genel Müdür talebi)

Müdür panele bakmıyor olabilir; telefon masada durur. Bu yüzden sisteme **yeni** bir kırmızı alarm düştüğünde
(süresi geçen iş ya da mutsuz misafir yorumu) zarif bir "ding" çalar.

| Karar | Neden |
|---|---|
| **Ses dosyası yok, sesi tarayıcı üretir** | Tek bir çan için dosya indirmek, saklamak ve önbelleğe almak gerekirdi. İki sinüs dalgası (660 Hz + 990 Hz) + yumuşak sönüm = çan. Dosya yok, gecikme yok. |
| **Tok, keskin değil** | Tizler süzülür (1800 Hz üstü kesilir). Sinüs dalgası en yumuşak dalgadır; "çat" diye başlamaz, 20 ms'de yumuşakça açılır. |
| **Kısık (%18) ve 1,4 saniye** | Odadaki konuşmayı bastırmaz, başı kaldırtır. Siren yok, tekrar yok, titreşim yok. |
| **Aynı alarm iki kez ses çıkarmaz** | Panel 30 saniyede bir aynı listeyi görür. Ses yalnızca listede **daha önce olmayan** bir alarm belirince çalar. |
| **Panel ilk açıldığında susar** | Ekranı açan müdür alarmları zaten görüyor; karşılama sesi stres yaratır. |
| **Çıkışta hafıza silinir** | Sıradaki müdür, devraldığı eski alarmların sesiyle karşılanmaz. |
| **Kilit en baştan açılır** | Tarayıcı, kullanıcı ekrana dokunmadan ses çıkarmaya izin vermez. Bu yüzden uygulama **açılır açılmaz** ilk dokunuşu bekler: müdürün "Giriş Yap" dokunuşu kilidi açar. (Panele girdikten sonra beklenseydi, telefona hiç dokunmayan müdür çanı hiç duymazdı.) |
| **Açılmazsa uygulama susar** | Kilit yine de açılmazsa hata verilmez, sessiz devam edilir — ekrandaki kırmızı kutu zaten oradadır. **Ses bir ek uyarıdır, tek uyarı değildir.** |
| **Panelin her ekranında çalar** | Müdür "Onaylar" ya da "Ürünler" ekranındayken de yeni alarm duyulur: nöbetçi ekranlardan bağımsız çalışır. |

## Kararlar

- **Beş kutu değil, üç kutu.** Blueprint 3.5'te beş kutu vardı (Odalar · İş Emirleri · Onaylar · Misafir Alarmları · Personel Hızı). Ekranda yalnızca **bugün karar gerektirenler** duruyor: süresi geçenler, mutsuz misafirler, bekleyen onaylar. "Odalar özeti" ve "Personel hızı" birer **rapordur**, alarm değildir; müdürün onlara bakarak yapacağı bir iş yoktur. Genel Müdür isterse ayrı bir aşamada eklenir.
- **"Acile çevirme" yok.** `docs/ux/001` · karar 3'te müdürün bir işi acile çevirebilmesi düşünülmüştü; panelde bu yok. Müdür geciken işi görür ve **kime sesleneceğini** bilir; süreyi değiştirmek gerçeği değiştirmez. Genel Müdür'ün kararına bırakılmıştır.
- **Personelin Çıkış butonu** (`docs/ux/001` · karar 4, bu aşamaya bırakılmıştı) ana ekranın dibine küçük ve ikincil olarak kondu. Ortak telefonda vardiya değişince görevli çıkabilir. Gönderilmemiş bildirimi varsa önce uyarılır: bildirimler telefonda kalır, ancak **sahibi tekrar girince** gider.
- **Panelde "QR Okut" da var.** Müdür de odaya girip "Oda Hazır" diyebilir, eksik bildirebilir; ayrı bir uygulama öğrenmez. Tek ek kapıdır, kumandanın sadeliğini bozmaz.
- **Yeşil kutuya dokunulmaz.** "Her şey yolunda" bir haberdir, bir kapı değil. Dokunulacak bir şey yoksa buton da yoktur.
- **Onayda adet değiştirilebilir.** Depocu 10 havlu ister, müdür 6 onaylar. Karar bir beyandır: kimin, ne zaman, kaç tane onayladığı veritabanınca yazılır.
- **Kendi talebini onaylayamaz.** Müdür kendi yazdığı talepte buton görmez; veritabanı da reddeder (ekran kilidi tek başına kilit sayılmaz).
- **Personel silinmez, çıkarılır.** Geri alınamaz bir iş olduğu için önce sorulur ("Ayşe otelden çıkarılsın mı?"). Geçmiş beyanları yerinde kalır.
- **Ürün silinmez, listeden çıkarılır.** "Kapat/Aç" değil "Listeden çıkar / Listeye koy" denir: müdürün asıl sorusu "personel bunu listesinde görsün mü?"dür. 8 ürün sınırı ekranda değil **veritabanında** sayılır; ekran dolunca ekleme formunu gizler. Aynı ad ikinci kez eklenemez (personel birbirinin aynı iki buton görmesin).
- **Onayda iki sayı karışmaz.** Kartın üstünde "10 adet istendi", sayacın üstünde "Kaç tane onaylıyorsunuz?" yazar. Müdürün elle değiştirdiği adet, başka bir karar verilse de yerinde kalır.
- **Reddet ince, Onayla vurgulu.** İkisi de geri alınamaz; yanlış parmakla reddedilmesin diye "Reddet" ikincil görünür. Bir karar giderken bütün butonlar kapanır: dokunuşun sessizce yutulduğu an olmaz.
- **"Bakılıyor…" yazısı.** Cevap gelene kadar ne yeşil ne kırmızı gösterilir: "her şey yolunda" ile "henüz bilmiyorum" aynı şey değildir.
- **Tek nöbetçi.** Panelin bütün ekranları aynı cevabı tek bir nöbetçiden okur (`app/src/panelNobeti.ts`). Böylece müdür "Onaylar" ekranındayken de alarmlar izlenir ve çan çalar; iki ekran açıkken sunucuya iki kez sorulmaz.
- **Şifreyi müdür belirler.** Personelin ilk şifresini müdür koyar ve kendisi söyler. Hesap açmak ana anahtar ister; bu yüzden sunucudaki `personel-ekle` kapısında yapılır, müdürün yetkisi orada yeniden denetlenir.
  ⚠️ **Açık madde:** Uygulamada henüz şifre değiştirme yolu yok; yani müdür personelin şifresini bilmeye devam ediyor. Bunun neden önemli olduğu ve seçenekler: `docs/security/002-personel-kapisi-ve-panel.md` · Açık 1. Genel Müdür kararı bekleniyor.

## Offline

Panel internet ister (002 · B.8): müdürün masasında internet vardır, alarm ancak sunucudaki gerçeği yansıtırsa işe yarar.
Bağlantı kesilince ekran bunu **hemen** söyler ve **ekrandaki bilginin kaç itibarıyla olduğunu** yazar
("İnternet yok. Ekrandaki bilgi saat 14:05 itibarıyla.") — yeşil kutu yalan söylemesin. İnternet gelince kendiliğinden tazelenir.

Giriş yapıldığı hâlde üyelikler sorulamazsa ekran "Bağlantı yok" der ve "Tekrar dene" sunar. **"Oteliniz yok" demez:**
soramamakla "oteli olmamak" aynı şey değildir; müdür hesabının silindiğini sanmamalıdır.

Çıkış internet beklemez: kart ve profil telefondan hemen silinir, ekran anında giriş ekranına döner.
