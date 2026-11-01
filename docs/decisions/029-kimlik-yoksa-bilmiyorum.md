# 029 — Kimlik Yoksa "Bilmiyorum": Süresi Dolmuş Oturumda Yanlış "Otel Bulunamadı"

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-11-01
> **Durum:** Uygulandı (yerel düzeltme dalı `duzeltme/otel-bulunamadi`). Yalnızca personel uygulaması değişti;
> veritabanı, yetki kuralları (RLS), paket sürümleri ve canlı ayarlar değişmedi. Canlıya çıkmadı.
> Kod: `app/src/kimlik.ts` (yeni), `app/src/oturum.ts`, `app/src/postaci.ts`, `app/src/isEmirleri.ts`,
> `app/src/teslimler.ts`

---

## Sorun

PROVA-028 masaüstü provasında (Senaryo 2) bağlantı kesikken giriş kartının süresi doldu. İnternet gelince
görevli, iki oteli olduğu hâlde **"Otel bulunamadı — Bu hesap bir otele bağlı değil"** ekranını gördü ve telefondaki
otel bilgisi silindi. Yaklaşık 9 dakika sonra kendiliğinden düzeldi.

**Neden:**
1. Supabase kütüphanesi başarısız kart yenilemesini kısa bir süre (60 sn) hatırlar; bu sürede "oturum yok" der.
2. Oturum yokken kütüphane sorguyu **herkese açık anahtarla** gönderir.
3. Sunucu kimliksiz soruya kural gereği **boş liste** verir (yetki kuralları doğru çalışıyor).
4. Uygulama bu boş listeyi "bu kişinin oteli yok" sanıp telefondaki bilgiyi siliyordu.

Aynı yol telefondaki **oda listesi, kontrol listeleri, ürünler, iş emirleri ve teslimleri** de boşaltabiliyordu.
Gönderimde ise kimliksiz fotoğraf yüklemesi "kabul edilmedi" sayılıp kaydı **reddedildi** yapabiliyor, eski
sürümde reddedilmiş bir kayıt kimliksiz "sunucuda yok" cevabıyla yeniden reddedilebiliyordu.

## Karar

**Personel verisi yalnızca geçerli kullanıcı kartıyla sorulur. Kart yoksa cevap "bilmiyorum"dur, "yok" değil.**

- Kart her sorgunun **kendi başlığına** konur (`kimlikliKart` + `setHeader` / yüklemede `headers`). Ortak
  istemcinin kalıcı ayarı değişmez. Kart arada dolarsa sunucu 401 der — "boş" demez.
- Kart yoksa sorgu hiç gönderilmez. Kart yok / 401 / ağ hatası → **aynı kişinin** telefondaki bilinen bilgisi
  korunur. Üyelik için önbellek de yoksa "Bağlantı yok · Tekrar dene" gösterilir.
- **Geçerli kartla gelen boş liste gerçektir:** üyelik iptalinde "Otel bulunamadı" gösterilir ve üyelik
  önbelleği boşalır; "açık iş yok" gibi boş listeler de yazılır. Gerçek iptal önbellekle gizlenmez.
- **Geç gelen cevap:** üyelik yüklemesi ve üç liste indirmesi (paket, iş emirleri, teslimler) sıra numarası
  alır; kişi/otel değiştiyse ya da daha yeni bir yükleme başladıysa cevap **son yazma anında** (veritabanı
  işleminin içinde) reddedilir. A→B ve A→B→A değişimleri kapsanır.
- **Toparlanma:** "bilmiyorum"dan sonra kart yenilenince (`TOKEN_REFRESHED` / `SIGNED_IN`), internet gelince ve en
  fazla 3 kez 65 sn'lik zamanlayıcıyla yeniden sorulur. Oturum olayı dinleyicisi işi bir sonraki tura bırakır
  (kütüphanenin kilidi içinde oturum sorulmaz); aynı kişi için üst üste istekler birleşir; çıkışta dinleyiciler ve
  zamanlayıcı kapanır.
- **Gönderim:** gerçek gönderici, sorgulayıcı ve yükleyici kart yokken sunucuya gitmez; hata **geçicidir**,
  kayıt kuyrukta kalır, fotoğraf telefonda kalır. Tamamlanmış ve reddedilmiş kayıtlara dokunulmaz.
- **Kişi değişimi (Codex incelemesi, 2. tur):** başka kişi girdiği anda önceki kişinin etkin profili bırakılır
  ve ekran "Açılıyor…" olur (eski kişinin ekranı ve postacısı kapanır). Yeni kişinin birden çok oteli varsa,
  otelini seçene kadar **hiçbir otel etkin değildir**; eski kişinin yoldaki paket/iş/teslim indirmesi bağlam
  değiştiği için telefona yazılmaz. Aynı kişinin oturum tazelemesi bağlamı değiştirmez.
- **Kimlik olaylarının sırası:** her oturum olayı, başlangıçtaki oturum sorgusu ve çıkış **geldiği anda** sıra
  numarası alır. İş bir sonraki tura bırakıldığı için, arada daha yeni bir çıkış ya da başka kişinin girişi
  olduysa eski olay/eski başlangıç cevabı yok sayılır — açık çıkış geri alınamaz. Çıkıştan **sonra** gelen gerçek
  yeni giriş daha büyük numara alır ve normal çalışır.
- Paket kişinin **bütün otellerini** kapsamaya devam eder (çok otelli çevrimdışı çalışma daralmadı).
- Misafir sayfası, kayıt ve iletişim formu değişmedi; kimliksiz çalışmaya devam eder.

## Doğrulama (2026-11-01)

- Otomatik testler: `cd app && npm test` — 23 dosya, 222 test geçti (önceki 180 + yeni 42). Tip denetimi ve
  derleme geçti.
- **2. tur (Codex incelemesi):** Codex'in iki regresyon testi (`codexOturumRegresyon.test.ts`, birebir) ve
  `oturum.test.ts`'e eklenen 6 sıra/kişi değişimi testi. İlk yamada bu 8 testten 5'i kırıldı (Codex'in ikisi +
  geciken başlangıç sorgusu ×2 + eski profilin hemen bırakılması); geçen ikisi "çıkıştan sonra gerçek giriş
  çalışır" ve "kuyrukta A sonra B girişi" — düzeltmenin gerçek girişi engellemediğini korurlar. Düzeltmeden
  sonra 8/8 geçti.
- **Önce hata yakalandı:** yeni 34 testten 21'i düzeltme öncesi kodda kırıldı (yanlış "Otel bulunamadı", silinen
  listeler, geç cevabın başka kişinin ekranını ezmesi, kimliksiz yüklemede kaydın reddedilmesi…). Düzeltmeden
  sonra 34/34 geçti. Oturum mantığı önce davranışı değiştirmeden `oturumuIzle` işlevine taşındı (React'tan
  bağımsız test edilebilsin diye); testler bu ara hâlde kırıldı, düzeltmeyle geçti.
- Yeni testler: `oturum.test.ts`, `kimlikliIndirme.test.ts`, `postaciKimlik.test.ts`; taklit sunucu
  `testYardimcilari/sahteBeyin.ts` (anon → boş liste, süresi dolmuş kart → 401, geçerli kart → yalnız üye
  otellerin satırları; geç gelen cevap istek anındaki veriyi taşır). `isEmirleriBaglam.test.ts`'in taklidi yeni
  çağrı biçimine (oturum + `setHeader`) uyarlandı; beklentileri değişmedi.
- **Hızlandırılmış tarayıcı denemesi** (gerçek Supabase kütüphanesi, eski ve yeni derleme, ayrı geçici Chrome,
  bu bilgisayardaki sahte Supabase sunucusu; kartlar gerçekten 40 sn'de dolar, sunucu süresi dolan kartı 401 ile
  reddeder; yalnız kart yenileme engellendi):
  - Bekleme süresi yolu: eski sürüm "Otel bulunamadı" gösterdi, üyelik önbelleği 2 → 0, sunucuya 1 kimliksiz
    üyelik sorgusu gitti ve 120 sn içinde toparlanmadı. Yeni sürüm çalışma ekranında kaldı, önbellek 2, kimliksiz
    sorgu 0; engel kalkınca üyelikleri geçerli kartla 2 kez yeniden doğruladı.
  - Gerçek 401 yolu (istemci kartı geçerli sanır, sunucu reddeder): yeni sürümde 7 adet 401, ekran ve önbellek
    korundu, kimliksiz sorgu 0.

## Kalan sınırlar

- **Müdür paneli ve uyuşmazlık ekranı** (`panel.ts`, `uyusmazliklar.ts`) bu kararın dışında kaldı. Telefona veri
  yazmazlar; ancak kimliksiz pencerede geçici olarak boş liste / alarm yok gösterebilir veya yazma hatası
  verebilirler. QR'dan telefonda olmayan odayı sorma (`odalar.ts`) kimliksizken "Oda bulunamadı" diyebilir.
  Ayrı bir kararla aynı yardımcıya bağlanmaları önerilir.
- İnternetsizken yetki iptali fark edilemez: telefondaki son bilinen otelle çalışılır; gerçek kilit sunucudadır.
- Kart yokken her 30 sn'lik gönderim turunda ilk kaydın deneme sayısı bir artar (geçici hata kaydı); kayıt
  kuyrukta kalır.
- Yüklemede kimliksiz isteğin "kabul edilmedi" sayılması taklit sunucuda gösterildi (status 400 / statusCode
  "403"); gerçek Supabase depolama cevabı bu biçimde ayrıca doğrulanmadı. Düzeltme bu varsayıma dayanmaz: kart
  yokken yükleme hiç denenmez.
- Gerçek telefon ve gerçek Supabase test projesinde uzun kesinti provası henüz yapılmadı.
