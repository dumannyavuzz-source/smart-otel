# PROJECT_BLUEPRINT.md — Otel Dijital Proje Planı

> Bu belge, Otel Dijital'in **ne** olduğunu, **kimin için** yapıldığını ve **nasıl** inşa edileceğini anlatır.
> Sade dille yazılmıştır; teknik olmayan biri de okuyup anlayabilmelidir.
> "Hangi teknolojiyle?" sorusu burada cevaplanmaz. O karar Architect tarafından ayrıca verilir ve `docs/decisions/` altına yazılır.

---

## 1. Hedef

### 1.1 Tek Cümleyle Otel Dijital
Otel Dijital; otel personelinin işini telefondan, QR kodla ve birkaç dokunuşla yapmasını sağlayan,
kötü misafir deneyimini internete düşmeden içeride yakalayan ve depo-satın alma işlerinde
suistimali önleyen bir **otel işletim uygulamasıdır**.

### 1.2 Kimin İçin?
| Kullanıcı | Kim | Ne kullanır |
|---|---|---|
| **Personel** | Kat görevlisi, teknisyen, depo sorumlusu | Telefon uygulaması (QR odaklı, az butonlu) |
| **Müdür** | Kat şefi, otel müdürü, satın alma yetkilisi | Yönetici paneli + telefonda onay ekranları |
| **Misafir** | Odada kalan kişi | QR ile açılan tek bir yorum ekranı (kurulum yok, giriş yok) |
| **Otel sahibi / Zincir yönetimi** | Bir veya birden fazla oteli olan işletmeci | Yönetici paneli (otel otel görür) |

**Satış modeli:** SaaS. Otel Dijital tek bir sistemdir; her otel kendi hesabıyla, kendi verisiyle kullanır.
**Hedef pazar:** Butik oteller, zincir oteller ve şehir otelleri.

### 1.3 Üç Söz (Temel Felsefe)
| # | Söz | Ne demek |
|---|---|---|
| 1 | **5 yaşındaki çocuk kadar basit** | Personel uygulamasında az buton, büyük yazı, her iş QR ile başlar. İnternet çekmeyen katlarda da çalışır. |
| 2 | **Kötü deneyim Google'a düşmeden içeride yakalanır** | Misafir şikayeti anında yönetime düşer; otel, misafir daha çıkmadan çözer. |
| 3 | **Suistimal Maker-Checker ile önlenir** | Talep eden, onaylayan ve teslim alan farklı kişilerdir. Her adım kim/ne zaman bilgisiyle kilitlenir. |

### 1.4 Başarı Nasıl Ölçülür? (Öneri — Genel Müdür onayına sunulur)
- Süresi aşılan arıza sayısı **sıfıra yaklaşsın**.
- Misafir şikayetlerinin **büyük çoğunluğu** Google'a değil, önce Otel Dijital'e düşsün.
- Talep edilen adet ile teslim alınan adet arasındaki **uyumsuzluk** görünür olsun ve azalsın.
- Yeni bir personel, eğitim almadan **5 dakikada** ilk odasını sisteme işleyebilsin.

---

## 2. Sistem Mimarisi

### 2.1 Dört Parça
Otel Dijital dört parçadan oluşur. Üçü insanların dokunduğu ekranlar, biri her şeyi hatırlayan ortak beyindir.

```
 [Personel Telefonu] ────┐
                         │
 [Misafir QR Sayfası] ───┼────▶  [ORTAK BEYİN]  ◀────▶  [Yönetici Paneli]
                         │       kayıtlar, kurallar,
                         │       süreler, alarmlar
                         └──────────────────────────────────────────────
```

| Parça | Nedir | Nerede çalışır | Kim kullanır |
|---|---|---|---|
| **Personel Telefonu** | QR okutur, liste tikler, sorun bildirir, teslimat beyan eder | Personelin telefonu | Personel |
| **Misafir QR Sayfası** | Odadaki QR ile açılan tek ekran; puan + yorum | Misafirin kendi telefonu (kurulum yok) | Misafir |
| **Yönetici Paneli** | Olan biteni, alarmları, onayları ve hızı gösteren kumanda | Tablet / bilgisayar / telefon | Müdür, otel sahibi |
| **Ortak Beyin** | Tüm kayıtları tutar, süreleri sayar, alarmı çalar, kim neyi görebilir karar verir | Sunucu (bulutta) | Kimse doğrudan dokunmaz |

### 2.2 İnternet Yokken Ne Olur? (Offline)
Otellerin bazı katlarında internet çekmez. Personel bunu **hiç fark etmemelidir**.
- Personel telefonu internet olmasa da QR okur, listeyi tikler, eksik bildirir, fotoğraf çeker.
- Bu kayıtlar telefonda bekler. İnternet gelince **kendiliğinden** Ortak Beyin'e gider.
- Personelin basacağı bir "gönder / eşitle" butonu **yoktur**. Ekranın köşesinde küçük bir not olur: "Bekleyen 3 kayıt".
- Onay gerektiren işler (müdür onayı, kırmızı alarm) internet ister; bunlar zaten müdürün ekranında olur ve müdürün interneti vardır.

### 2.3 Her Otel Kendi Odasında (SaaS)
- Bir otelin verisi diğer otele **hiçbir şekilde** görünmez. Her otel kilitli kendi dolabındadır.
- Zincir yönetimi kendi otellerini tek panelden, otel otel görür.
- Yeni bir otel eklemek, bir dolap daha açmaktır; sistemin geri kalanı değişmez.

### 2.4 Kapılar ve Kilitler (Güvenlik İlkeleri)
- Herkes **yalnızca kendi işine ait** ekranı görür. Kat görevlisi depo onayını görmez, misafir hiçbir şey görmez.
- Misafir **asla giriş yapmaz**. QR sadece "bu yorum 204 numaralı odadan geldi" bilgisini taşır.
- Dijital beyanlar (oda hazır, teslim aldım, çözdüm) **kim + ne zaman + ne** bilgisiyle kilitlenir ve sonradan değiştirilemez.
- Aynı kişi bir işin hem talep edeni hem onaylayanı **olamaz**.
- Fotoğraflar ve yorumlar yalnızca ilgili otelin yetkilileri tarafından görülür.
- Detaylı kontrol listesi: `.claude/skills/security-checklist.md`.

### 2.5 Teknoloji Kararı
Bu belge "ne yapacağız?" sorusuna cevap verir. "Hangi araçla yapacağız?" sorusunu Architect,
her karar için ayrı bir karar kaydıyla `docs/decisions/` altında cevaplar.
Kural bellidir: **en az parça, en az bağımlılık, en olgun araç.**

---

## 3. Faz 1 Modülleri (MVP — İlk Sürüm)

Beş modül vardır. Her modül için: amaç, akış, ekranda ne var ve "5 yaşındaki çocuk" testi.

### 3.1 Housekeeping (Kat Hizmetleri)
**Amaç:** Kat görevlisi odayı temizler, sistem odanın durumunu bilir; eksik ve arıza anında bildirilir.

**Akış:**
1. Görevli oda kapısındaki **QR'ı okutur** → oda ekranı açılır.
2. **Temizlik listesini tikler**: yatak, banyo, havlu, minibar... (en fazla 10 madde).
3. Eksik varsa **"Eksik Var"** → listeden seçer (havlu, şampuan...) → adet → biter.
4. Arıza/haşere varsa **"Sorun Bildir"** → fotoğraf çeker → tür seçer (Arıza / Haşere) → gönderir.
5. **"Oda Hazır"** → oda "Temiz" olur. Sorun bildirildiyse oda "Satışa Hazır" **olmaz**, iş emri açılır (bkz. 3.2).

**Ekranda ne var:**
- Ana ekran: tek büyük buton — **QR Okut**.
- Oda ekranı: tikleme listesi + altta 3 buton: **Eksik Var** · **Sorun Bildir** · **Oda Hazır**.
- Metin yok denecek kadar az; ikon + tek kelime.

**5 yaşındaki çocuk testi:** Ana ekranda 1 buton, oda ekranında 3 buton. Fotoğraf çekmek telefonun kendi kamerası kadar kolay. ✅

### 3.2 İş Emirleri ve SLA (Süre Takibi)
**Amaç:** Her arıza bir süreye bağlanır, süre aşılırsa müdür anında görür, çözülünce oda satışa döner.

**Kurallar:**
| Tür | Süre | Örnek |
|---|---|---|
| **Acil** | 30 dakika | Su baskını, elektrik yok, kapı kilidi bozuk, klima yok (yaz) |
| **Normal** | 2 saat | Ampul, damlayan musluk, TV çalışmıyor |

> Varsayım (onayınıza sunulur): Tür, bildirimdeki sorun tipine göre **otomatik** belirlenir; müdür isterse değiştirir. Personel "acil mi?" diye düşünmez.

**Akış:**
1. Sorun bildirimi **kendiliğinden** iş emri olur; süre saymaya başlar.
2. Teknisyen telefonunda listeyi görür: **en az süresi kalan en üstte**. Renk: yeşil → sarı → kırmızı.
3. **"Başladım"** → **"Çözdüm"** (isteğe bağlı fotoğraf).
4. Süre dolarsa müdürün panelinde **kırmızı alarm**.
5. Çözülünce oda (temizlik de tamamsa) **"Satışa Hazır"** olur.

**Ekranda ne var:** Teknisyen ekranında sadece 2 buton: **Başladım** · **Çözdüm**.

**5 yaşındaki çocuk testi:** Liste kendiliğinden sıralı, renk ne kadar acil olduğunu söylüyor, 2 buton. ✅

### 3.3 Depo ve Satın Alma (Maker-Checker)
**Amaç:** Hiçbir ürün tek kişinin kararıyla alınmaz, tek kişinin sözüyle "geldi" denmez. Üç kişi, üç adım, her adım kayıtlı.

**Akış:**
| Adım | Kim | Ne yapar |
|---|---|---|
| **1. Talep** (Maker) | Personel | "Ne lazım?" → ürün seçer + adet → gönderir. |
| **2. Onay** (Checker) | Müdür | Telefonunda talebi görür → **Onayla** / **Reddet**. Onaylayınca sistem tedarikçiye gidecek hazır bir sipariş metni ve bağlantı üretir; müdür WhatsApp'tan gönderir. |
| **3. Teslim** (Beyan) | Depo görevlisi | Ürün gelince **"Gelen adet"** girer → fatura/irsaliye fotoğrafı çeker → **"Teslim Aldım"**. Bu, dijital imzadır: isim + saat + adet. |

**Kontrol:** Sistem üç sayıyı yan yana gösterir: **talep edilen · onaylanan · gelen**. Uyuşmuyorsa müdüre uyarı düşer.

> Varsayım (onayınıza sunulur): İlk sürümde WhatsApp'a **otomatik bağlanmıyoruz**; sistem mesajı hazırlar, müdür kopyalayıp gönderir. Bu hem sade hem güvenlidir. Otomatik gönderim ileride eklenebilir.

**Ekranda ne var:** Her kişi yalnızca kendi adımını görür. Talep eden onay ekranını, onaylayan teslim ekranını görmez.

**5 yaşındaki çocuk testi:** Her ekranda tek soru, tek buton: "Ne lazım?", "Onaylıyor musun?", "Kaç tane geldi?". ✅

### 3.4 Misafir Yorum Kalkanı
**Amaç:** Misafir memnuniyetsizliğini otel içinde, misafir daha otelden çıkmadan yakalamak.

**Akış:**
1. Misafir odadaki **QR'ı okutur** → tek sayfa açılır. Kurulum yok, giriş yok, ad-soyad yok.
2. **5 yüz ifadesi** (çok mutsuz → çok mutlu) seçer.
3. İsteğe bağlı: "Bir şey eklemek ister misiniz?" kutusu.
4. **Gönder**.
5. Puan düşükse (1–3): Müdüre **anında** alarm — "Oda 204'te mutsuz misafir". Misafire: "Hemen ilgileniyoruz."
   Puan yüksekse (4–5): "Teşekkürler."

**Ekranda ne var:** Tek ekran, 5 yüz, bir kutu, bir buton. Bu kadar.

> UX notu: Memnun misafiri Google'a yönlendirip memnun olmayanı yönlendirmemek ("yorum eleme") Google'ın kurallarına aykırıdır ve otele ceza getirebilir. Kalkan, şikayeti **içeride hızlı çözmek** içindir; yorumu engellemek için değil. Bu sınır korunur.

**5 yaşındaki çocuk testi:** Yüz seç, gönder. Okuma bilmeyen biri bile yapar. ✅

### 3.5 Yönetici Paneli (Ana Kumanda)
**Amaç:** Müdür tek bakışta "her şey yolunda mı?" sorusuna cevap alır. Yolunda değilse ne olduğunu kırmızıyla görür.

**Ekranda ne var (tek sayfa, trafik lambası mantığı):**
| Kutu | Ne gösterir |
|---|---|
| **Odalar** | Kaç temiz · kaç kirli · kaç arızalı · kaç satışa hazır |
| **İş Emirleri** | Açık olanlar; **süresi geçenler kırmızı ve en üstte** |
| **Bekleyen Onaylar** | Onay bekleyen satın alma talepleri; tek dokunuşla onayla/reddet |
| **Misafir Alarmları** | Düşük puanlı yorumlar, oda numarasıyla |
| **Personel Hızı** | Ortalama oda temizleme süresi · ortalama arıza çözme süresi |

**Kural:** Ekranda kırmızı bir şey varsa **en üstte** durur. Detay için kutuya dokunulur; ana sayfa sade kalır.

**5 yaşındaki çocuk testi:** Kırmızı = sorun, yeşil = iyi. Beş kutu, bir bakış. ✅

### 3.6 Faz 1'de OLMAYANLAR (Kapsam Dışı)
Sadeliği korumak için ilk sürümde **bilinçli olarak yapılmayacaklar**:
- Rezervasyon ve ödeme alma
- Mevcut otel yazılımlarıyla (PMS) entegrasyon
- Misafirin indireceği bir uygulama (misafir yalnızca QR sayfasını kullanır)
- WhatsApp'a otomatik mesaj gönderimi
- Faz 2 modülleri

---

## 4. Faz 2 Modülleri (Gelecek Sürüm)

Faz 1 sahada çalışıp oturduktan sonra eklenecekler. İkisi de Faz 1'de kurulan altyapıyı yeniden kullanır; sıfırdan bir şey inşa edilmez.

### 4.1 VIP Transfer Takibi
**Amaç:** VIP misafirin havalimanı–otel transferi; hangi araç, hangi şoför, saat kaçta — müdür tek ekrandan izler.
**Neden Faz 2:** Otelin günlük işleyişini (oda, arıza, depo) etkilemez; önce temel düzen kurulmalı.

### 4.2 Cankurtaran ve SPA Kontrol Şablonları
**Amaç:** Havuz ve SPA için günlük güvenlik ve temizlik kontrol listeleri: klor ölçümü, cankurtaran nöbeti, ekipman kontrolü.
**Neden Faz 2:** Housekeeping'deki **tikleme listesi** mantığının aynısıdır; Faz 1'de o motor kurulunca buraya şablon eklemek küçük bir iştir.

---

> **Sonraki adım:** Bu belge Genel Müdür tarafından onaylandığında Architect, teknoloji ve yapı kararlarını `docs/decisions/` altına yazmaya başlar. Uygulama kodu, Genel Müdür "koda geç" demeden yazılmaz.
