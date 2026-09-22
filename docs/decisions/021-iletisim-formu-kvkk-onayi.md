# 021 — İletişim Formu: Onay Açık Eylemle Alınır (denetim · Madde 13)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Uygulandı ve ölçülerek doğrulandı. Göçler henüz **çalıştırılmadı** (dağıtım listesi · 6.19).
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 13
> Kod: `vitrin/iletisim.html`, `vitrin/stil.css`, `vitrin/etkilesim.js`,
> `supabase/migrations/20260922100000_iletisim_kvkk_onayi.sql` ve `…110000_iletisim_kvkk_zorunlu.sql`

---

## 1. Zımni onay kaldırıldı

Formun altında şu cümle vardı: *"Formu göndererek KVKK Aydınlatma Metni'ni okuduğunuzu kabul etmiş
olursunuz."* Bu **zımni onaydır**: kimse bir şey yapmaz, sadece gönderir ve kabul etmiş sayılır.

Artık ziyaretçi bir **onay kutusu işaretler**. İşaretlemezse tarayıcı formu göndermez.

### Kural iki yerde birden durur
Tarayıcıdaki `required` bir nezakettir; betiği değiştiren biri onu atlar. Bu yüzden aynı kural
veritabanına da kondu: `kvkk_onay` sütunu **"evet" değilse satır kabul edilmez**. Formu atlayıp
doğrudan sunucuya yazan da aynı duvara çarpar.

### Ticari ileti izni istenmedi
Denetim "isteniyorsa ayrı ve isteğe bağlı bir kutu olsun, birleşik onay alınmasın" diyor. Biz bugün
pazarlama e-postası **göndermiyoruz**, o yüzden izin de istemiyoruz. Bir gün gönderilecekse ayrı ve
isteğe bağlı bir kutu açılır; bu kutuyla birleştirilmez.

### Onay saklanır
Onay, mesajla aynı satıra yazılır. Böylece elimizde *"şu kişi, şu tarihte, açık bir hareketle onay
verdi"* kaydı olur. Eski mesajlarda bu alan `null` kalır — onlar kutu yokken geldi, **geçmişe onay
uydurulmadı**.

## 2. Göçler neden iki tane? (sıra sorunu)

Tek bir göçle yapılsaydı, hangi sırayı seçersek seçelim bir an için form bozulurdu:

| Sıra | Ne olurdu |
|---|---|
| Önce göç, sonra yayın | Eski vitrin bu alanı göndermez → gelen her mesaj reddedilir |
| Önce yayın, sonra göç | Yeni vitrin olmayan bir sütuna yazar → gelen her mesaj reddedilir |

Bu yüzden iş ikiye bölündü ve **hiçbir anda form bozulmaz**:

1. **`…_iletisim_kvkk_onayi.sql`** — sütunu ekler, yazma yetkisi verir, zorunlu kılmaz.
   Bu hâlde eski sürüm de yeni sürüm de çalışır.
2. Vitrinin onay kutulu sürümü yayına girer.
3. **`…_iletisim_kvkk_zorunlu.sql`** — onaysız satırı reddeder.

Kısıt `not valid` yazılır: kural **yalnızca bundan sonraki satırlara** bakar, geçmiş mesajlar
yeniden taranmaz ve olduğu gibi kalır.

## 3. Tuzak alan zaten kapalıydı — doğrulandı

Denetim "tuzak alan ekran okuyucuya açık" diyordu. Ölçüm bunu **doğrulamadı**: alan hâlihazırda
kapsayıcısında `aria-hidden="true"`, kendisinde `tabindex="-1"` taşıyor ve ekranın dışında duruyor.
Denetim büyük ihtimalle bu düzeltmeden önceki bir sürümü görmüş. Yine de ölçülerek teyit edildi:

| Ne bakıldı | Sonuç |
|---|---|
| `aria-hidden="true"` atası | var |
| Tab sırasında mı? | hayır (`tabindex = -1`) |
| Ekranda mı? | hayır (ekran dışında) |

`display: none` **bilerek kullanılmaz**: gizlenen alanı bot da doldurmaz, tuzak işe yaramazdı.

## 4. Hangi alanlar zorunlu?

Denetim "zorunlu alanlar görsel olarak işaretlenmeli" diyor. Yıldız işareti koymak yerine formun
başına tek cümle kondu: *"Sonunda (isteğe bağlı) yazmayan alanların hepsi doldurulmalıdır."*
İsteğe bağlı iki alanın yanında bu not zaten yazıyordu; böylece ikinci bir işaret diline gerek kalmadı.

## 5. Bir tuzak: etiketin içi bölünmesin

Onay etiketinin dokunma alanı 44 pikselden büyük olmalıydı. İlk denemede etikete `display: flex`
verildi ve cümle ikiye bölündü: bağlantı ("KVKK Aydınlatma Metni") ayrı bir kutu, kalan metin ayrı
bir kutu oldu; ekranda iki sütun gibi göründü. Sebep şudur: **flex ya da grid verilen bir öğenin
içindeki her parça ayrı bir kutu olur** — cümlenin içindeki bağlantı da dâhil.

Çözüm: etiket blok kalır, 44 piksel dikey boşlukla sağlanır (13 px yazı × 1,55 satır = 20 px, artı
2 × 12 px boşluk = 44 px). Aynı hata daha önce rol listesinde de yapılmıştı; CSS'e uyarı notu yazıldı.

## Denendi ve doğrulandı

| Ne denendi | Sonuç |
|---|---|
| Kutu boşken form gönderilebiliyor mu? | Hayır (`checkValidity` → false) |
| Kutu işaretliyken? | Evet |
| Etiket dokunma alanı (390 px) | 251 × 60 px — eşik 44 |
| Kutunun kendisi | 24 × 24 px (WCAG 2.5.8 eşiği) |
| Etiket okunabilirliği | 13 px, büyük harf değil, renk `--gri` (6,1:1) |
| Tuzak alan | ekran okuyucuda yok, Tab sırasında yok, ekran dışında |
| Bozulmama | 8 sayfa × 8 genişlik (320–1400 px): taşma yok, çakışma yok |

## Kalan — Genel Müdür kararı bekliyor

- **Aydınlatma metni henüz yazılmadı.** Onay kutusundaki bağlantı "Çok yakında" diyen iskelet sayfaya
  gidiyor. İnsan, içeriği olmayan bir metni onaylamış oluyor; bu eksik canlıya çıkmadan kapatılmalı.
- **Yeni mesaj geldiğinde kimseye haber gitmiyor.** Mesajlar yalnızca Supabase panelinden okunuyor.
  Denetimin kabul ölçütü "başarılı gönderimde hem kullanıcı hem ekip bilgilendiriliyor" diyor; bunun
  için bir e-posta sağlayıcısı ve küçük bir Edge Function gerekir. Yeni bir dış bağımlılık ve ücret
  anlamına geldiği için **yapılmadı**, karar Genel Müdür'e bırakıldı.
- **Sel kapısı** (aynı adresten saatte 5, toplamda 100) zaten kuruludur; denetimin istediği
  "aynı IP'den kısa aralıkta tekrarlanan gönderim engelleniyor" ölçütü bununla karşılanır.
- Sunucu tarafı akışın canlıda bir kez elle denenmesi: dağıtım listesi · 6.8 ve 6.19.
