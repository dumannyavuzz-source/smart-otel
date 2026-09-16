# 004 — Güvenlik: Şifre Yenileme Kapısı (Aşama 19.1)

> **Hazırlayan:** Security + Orkestratör · **Tarih:** 2026-09-16 · **Durum:** 4 açık madde Genel Müdür kararı bekliyor
> Bu belge, şifre yenileme kodlandıktan **sonra** yapılan denetimin sonucudur.
> Kod: `supabase/functions/sifre-guncelle/`, `supabase/migrations/…_sifre_guncelleme.sql`, `app/src/panel.ts`.

---

## Ne yapıldı

Müdür, şifresini unutan personelin şifresini panelden yeniler. Mail linki yoktur: müdür yeni şifreyi yazar,
ekranda görür ve kişiye kendisi söyler. Şifre değiştirmek ana anahtar ister; bu yüzden iş sunucudaki kapıda yapılır.

| Kilit | Kural |
|---|---|
| Kim kimin şifresini değiştirir | sahip → müdür + görevli · müdür → yalnızca görevli · görevli → hiç kimse |
| Sahibin şifresi | **Kimse** değiştiremez |
| Kendi şifresi | Bu kapıdan değiştirilemez (kimlik karttan okunur, gövdedeki söze bakılmaz) |
| Başka otelin müdürü | O otelde rolü olmadığı için reddedilir |
| **İki otelde çalışan kişi** | Şifresine **hiç dokunulmaz** — yoksa bir otelin müdürü diğerinin kapısını açardı |
| Soru cevaplanamazsa | Şifre yazılmaz. Bilinmezlik "hayır" sayılmaz (fail-closed) |
| Ana anahtar | Yalnızca tek iş: şifreyi yazmak. Üç soru da çağıranın kendi kartıyla sorulur, kilitler geçerli |

## Denetimde bulunup aynı aşamada kapatılanlar

### 🔴 Önerilen şifre tahmin edilebilirdi
İlk sürümde öneri tek kelime + dört rakamdı (`kule-4821`): 10 kelime × 9000 = **90 bin ihtimal**, üstelik kelime
listesi herkesin tarayıcısında duruyor. Şifre kalıcı olduğu için (personel kendi şifresini değiştiremiyor) sabırlı
bir görevli müdürün hesabına girebilirdi. **Düzeltildi:** öneri artık iki farklı kelime + dört rakam
(`kule-zeytin-4821`), 48 kelimelik listeyle **20 milyonu aşan** ihtimal. Telefonda söylenebilirliği bozulmadı.

### 🔴 Güvenlik denemeleri dosyası bozuktu
17.2'de yapılan toplu bir metin düzenlemesi sırasında iki `$$` işareti kabuğun süreç numarasına dönüşmüş,
bu da dosyanın tamamını geçersiz kılmıştı: **145 denemenin hiçbiri çalışmıyordu.** Düzeltildi ve bütün göç
dosyalarında `$$` işaretleri tek tek sayılarak tarandı. Denemelerin gerçekten geçtiği, Staging'de
`supabase test db` çalıştırılarak doğrulanacaktır (kontrol listesi · 3.1).

### 🟠 Yetki matrisi "kara liste" idi
Sahip için `owner` dışındaki **her** role izin veriliyordu; ileride yeni bir rol eklenirse kural onu sessizce
içeri alırdı. **Düzeltildi:** yalnızca `staff` ve `manager` açıkça sayılıyor, varsayılan kapalı.

### 🟠 Tanınmayan hesap yoklanabiliyordu
"Bu kişi başka otelde de çalışıyor mu?" sorusu, o otelde çalışmayan biri için de cevaplanıyordu; müdür,
elindeki bir kimlikle bir hesabın başka otelde çalışıp çalışmadığını öğrenebilirdi. **Düzeltildi:** soru artık
yalnızca o otelin çalışanları için cevaplanıyor, değilse reddediliyor.

### 🟡 Ekranda iki küçük kusur
Yeni şifre kartta süresiz duruyordu ve geri alınamaz bir sıfırlama hiç onay sormuyordu. **Düzeltildi:**
"Tamam, söyledim" düğmesi şifreyi ekrandan kaldırıyor; kaydetmeden önce tek cümlelik onay soruluyor.

## Açık maddeler

### Açık 1 · ORTA-YÜKSEK — Şifre yenileme deftere yazılmıyor, üstelik sınırsız
Bu projenin bütün mantığı "her iş bir beyandır, kim yaptı yazılır" üzerine kuruludur. Ama başkasının hesabına
erişim veren tek işlem hiçbir yere kaydedilmiyor; yalnızca **yetkisiz** denemeler sunucu günlüğüne düşüyor.
Hız sınırı da yok: kartı ele geçirilen bir müdür hesabıyla bütün personelin şifresi arka arkaya sıfırlanabilir.

**Öneri:** küçük bir beyan tablosu — `sifre_yenilemeleri (hotel_id, hedef_user_id, created_by, created_at)`.
Şifre değil, yalnızca "kim, kimin, ne zaman". Çağıranın kendi kartıyla yazılsın; yazılamazsa şifre de değişmesin.
Yanına misafir kapısındaki gibi bir sınır (otel başına dakikada 3).

### Açık 2 · ORTA — Şifre değişse de kişinin açık oturumu devam eder
Şifreyi değiştirmek, o kişinin telefonundaki açık oturumu kapatmaz. Yani **"telefonu kayboldu, şifresini
değiştirdim" cümlesi bugün yanlıştır**; telefondaki uygulama çalışmaya devam eder.

**Bugünkü doğru yol:** telefon kaybolduysa kişi otelden **çıkarılır** (üyelik silinince kilitler erişimi anında
keser), sonra yeniden eklenir. Bu, sistemin gerçekten çalışan çözümüdür ve ekip bunu bilmelidir.
**Orta vade:** oturum zaman aşımı (`[auth.sessions] inactivity_timeout`) ya da kapının şifre yazdıktan sonra
o kişinin oturumlarını da sonlandırması.

### Açık 3 · ORTA — Üyelik kilidiyle zincirlenme (002 · Açık 4)
`memberships` ekleme kilidi, eklenen `user_id`'nin kim olduğuna bakmıyor. Müdür, kimliğini bildiği bir hesabı
kendi oteline "görevli" yazabiliyor; **artık** o hesabın şifresini de yenileyebiliyor. Hiçbir otelde üyeliği
olmayan hesaplar (açılıp atanmamış, deneme hesapları) bu yolla ele geçirilebilir. Başka otelde üyeliği olanlar
"iki otelde çalışıyor" kuralıyla zaten korunuyor.
**Öneri:** üyelik yazımı yalnızca `personel-ekle` kapısından geçsin (002 · Açık 4 ile birlikte çözülür).

### Açık 4 · BİLGİ — Sahip kilitlenirse geri dönüş yolu yazılı değil
"Sahibin şifresine kimse dokunamaz" doğru bir karardır; ama uygulamada "şifremi unuttum" akışı da yoktur.
Sahip şifresini unutursa tek çare Smartotel ekibinin ana anahtarıdır. Bu yol **bugünden** yazılmazsa, acil bir
günde güvensiz bir kestirme icat edilir. Kim, nasıl, hangi kayıtla yapar — karara bağlanmalıdır.

## Ayrıca (canlıya çıkmadan)

- `PANEL_ORIGIN` boşken kapı her adrese açık cevap veriyor (`*`). Artık şifre değiştiren bir uçtan söz ediyoruz:
  gerçek alan adı yazılmalı (kontrol listesi · 1.8).
- Kapılardaki `npm:@supabase/supabase-js@2` bağımlılığı tam sürüme sabitlenmeli: bu dosyalar ana anahtarı elinde tutar.
- Şifre kuralı yalnızca uzunluktur; `12345678` geçerli bir şifredir. Müdür elle böyle bir şifre yazarsa hiçbir katman
  itiraz etmez. Supabase'in `password_requirements` ayarı açılabilir.
