# 025 — Yasal Metinlerin Tamamlanması: Saklama Süresi, Çerez Politikası, Kullanım Şartları

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Uygulandı. Dört yasal sayfanın dördü de yayımlandı.
> Kaynak: Genel Müdür talimatı (2026-09-22) · `docs/decisions/024-icerik-paketi.md` · dağıtım listesi 6.11
> Kod: `vitrin/kvkk.html`, `vitrin/cerez-politikasi.html`, `vitrin/kullanim-sartlari.html`,
> `vitrin/iletisim.html`, `vitrin/sitemap.xml`, `araclar/kaynak-notu-taramasi.js`

---

## Durum

Karar 024 dört yasal sayfanın ikisini yazmıştı. Geriye üç açık kalmıştı:

1. İletişim formu kayıtları **ne kadar** saklanıyor? (KVKK metni somut bir sayı vermiyordu.)
2. Çerez politikası sayfası boştu — oysa Gizlilik Politikası "çerez yok" diyordu. Boş bir çerez
   sayfası, söyleyeni olmayan bir iddia bırakıyordu.
3. Kullanım şartları sayfası boştu; ücretli bir hizmetin kuralları hiçbir yerde yazılı değildi.

## Karar (Genel Müdür, 2026-09-22)

| Konu | Karar |
|---|---|
| Saklama süresi | İletişim formu verileri **en fazla 12 ay** saklanır |
| Çerez politikası | Çerez kullanılmadığı ve sayacın çerezsiz çalıştığı **net ve yalın** anlatılır |
| Kullanım şartları | B2B SaaS standardında temel metin: hizmet **"olduğu gibi"** sunulur, kötüye kullanım kısıtlamaları yazılır |

## 1. Saklama süresi: 12 ay

KVKK metnindeki "Ne kadar süre saklanıyor?" bölümü üç paragrafa çıktı: süre (**en fazla 12 ay**,
mesajın geldiği tarihte başlar), sebebi (görüşme uzayabilir, bir yıl sonra geri dönülebilir,
ne cevap verdiğimizi göstermemiz gerekebilir) ve erken silme hakkı.

**Sözün arkasında bugün otomatik bir mekanizma yok.** Silme elle yapılır ve bu, dağıtım listesine
ayrı bir madde olarak yazıldı (6.23): ayda bir kez Supabase Studio'dan tek satırlık bir `delete`.
Otomatikleştirmek mümkündür (pg_cron) ama veri silen zamanlanmış bir iş **geri alınması zor** bir
adımdır; Genel Müdür onayı olmadan kurulmadı.

> Yazılı bir söz, onu tutan bir işten daha kolay yazılır. Bu yüzden söz metne girerken işin de
> nerede yapılacağı yazıldı; aksi hâlde metin ile gerçek altı ay sonra ayrışırdı.

## 2. Çerez politikası

Sayfa tek cümleyle başlar: **bu sitede çerez kullanılmaz.** Gerisi bunu somutlar:

- Çerez nedir? (tek paragraf, jargonsuz)
- Ziyaretçi sayımı çerezsiz nasıl yapılır; sayacın **yapmadıkları** beş madde hâlinde
- Neden "çerezleri kabul edin" kutusu çıkmıyor
- Form doldurulunca da çerez yazılmadığı; ayrıntı için KVKK metnine bağlantı
- **Personel uygulamasında** (`app.oteldijital.com`) da çerez yoktur — ama tarayıcının kendi
  deposunda bir **oturum anahtarı** ve internetsiz çalışma için bekleyen bildirimler durur
- Politika değişirse: çerez yerleştirilmeden **önce** izin istenir

### Neden oturum anahtarı da yazıldı?

Çerez kullanmamak ile "tarayıcınızda hiçbir şey durmuyor" demek aynı şey değildir. Uygulama
giriş oturumunu tarayıcının yerel deposunda tutar (`app/src/oturum.ts`) ve internetsiz çalışma için
bekleyen bildirimleri de orada biriktirir. Bunu yazmamak, teknik olarak doğru ama eksik bir metin
olurdu; eksik beyan, karar 024'te düzeltilen hatanın aynısıdır. Anahtarın ne işe yaradığı ve
**çıkışta silindiği** açıkça söylendi.

## 3. Kullanım şartları

On üç başlık: taraflar · hizmet nedir · hesap ve şifreler · 30 günlük deneme · ücretler ve fatura ·
iptal · verileriniz size aittir · yazılım bizim içerik sizin · kötüye kullanım · hizmet "olduğu
gibi" sunulur · sorumluluk sınırı · şartlar değişirse · hukuk ve yetkili mahkeme.

**Metin üründen ve fiyat sayfasından türetildi, uydurulmadı:**

| Cümle | Nereden geliyor |
|---|---|
| 30 gün, kredi kartı yok, süre dolunca veri silinmez — yazma durur, okuma sürer | `docs/decisions/005-demo-suresi-ve-odeme-duvari.md` |
| USD · KDV hariç %20 · TL fatura, TCMB satış kuru · aylık/yıllık · taahhüt yok | `docs/decisions/012-fiyat-seffafligi.md` ve `/fiyatlandirma` |
| Yetkiler oteldedir, şifreyi müdür paneli değiştirir | `docs/ux/003-mudur-paneli-akisi.md` · ürün |
| Veri otelindir, biz yalnızca hizmet için işleriz | `docs/security/001-rls-and-maker-checker.md` |

**Verilmeyen sözler bilinçlidir:** çalışma süresi (uptime) oranı, para iadesi ve veri dışa aktarma
düğmesi yazılmadı — üçü de bugün yok. Metin "elimizden gelen özeni gösteririz, kesintisiz ve
hatasız çalışacağına dair garanti veremeyiz" der. Sorumluluk sınırı son 12 ayda ödenen tutarla
sınırlıdır; kast ve ağır kusur hâlleri saklıdır (Türk hukukunda bu iki hâl sınırlandırılamaz).

## 4. Onay bağlantıları artık gerçek metinlere gidiyor

İletişim formundaki KVKK onay kutusunun bağlantısı ile on iki sayfanın alt bölümündeki dört yasal
bağlantı, artık "Çok yakında." iskeletine değil **yazılmış metinlere** gider. Formun üstündeki
eskimiş not ("metin henüz yazılmadı") güncellendi; dört yasal sayfadaki iskelet notu da öyle.

Kutunun **metni** değişmedi ve ikinci bir kutu eklenmedi: form bir mesaj kutusudur, hizmet
sözleşmesi değildir. Ticari ileti izni de istenmemeye devam ediyor (öyle bir e-posta göndermiyoruz).

## 5. Tarama artık elle değil, betikle yapılıyor

Karar 024'te canlıda bir HTML yorumunun görünür metne dönüştüğü görülmüş ve "tarama listesine
eklendi" denmişti. O tarama elle yapılıyordu. Artık tek komutla çalışan küçük bir betiktir:

```bash
node araclar/kaynak-notu-taramasi.js      # temizse 0, sızıntı varsa 1 döner
```

Betik sayfadan yorumları, betikleri, stilleri ve `<head>` bölümünü çıkarır; geriye kalan
**ziyaretçinin gördüğü metinde** dosya adı, karar numarası, "Genel Müdür kararı" gibi izleri arar.
Ayrıca her `<!--` için bir `-->` olduğunu sayar — sızıntının asıl sebebi buydu.

## Denendi ve doğrulandı

| Ne denendi | Sonuç |
|---|---|
| Kaynak notu sızıntısı (13 sayfa) | **Temiz** |
| İki yeni sayfa yerel sunucuda | `/cerez-politikasi` ve `/kullanim-sartlari` **200** |
| Sayfa görünümü (1200 px) | Diğer yasal sayfalarla aynı düzen; yeni CSS yazılmadı |
| Sitemap | 10 adres, açılış–kapanış etiketleri dengeli |
| Meta açıklama uzunlukları | 139 ve 127 karakter (sınırlar içinde) |
| KVKK "12 ay" cümlesi | Sayfada iki yerde, çelişki yok |

## Sorulan dört soru ve Genel Müdür'ün cevapları (2026-09-22)

| Soru | Cevap |
|---|---|
| 12 aylık silme otomatikleşsin mi? | **Hayır, şimdilik aylık elle SQL.** Geri alınması zor otomatik silme, sistem rutine oturana kadar insan onaylı kalır (dağıtım listesi · 6.23) |
| Kayıt ekranına onay kutusu eklensin mi? | **Evet, kesinlikle.** Yasal onayın en kritik anı hesabın açıldığı andır; `/kayit` ekranına KVKK ve Kullanım Şartları'na atıf yapan **zorunlu** kutu, iletişim formundaki titizlikle eklenir → `docs/decisions/026` |
| "Peşin ödenen dönem için geri ödeme yapılmaz" kalsın mı? | **Kalsın.** Standart SaaS abonelik mantığı: iptalde iade yoktur, hizmet ödenen dönem sonuna kadar açıktır |
| Yetkili mahkeme Kayseri mi? | **Evet.** Kurumsal künyeyle örtüşüyor |

Metinlerde bu cevaplarla birlikte değişen bir şey olmadı: üç metin de cevapların yönünde yazılmıştı.
