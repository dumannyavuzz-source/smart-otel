# El ile Test Listesi — Personel Uygulaması

> **Hazırlayan:** Orkestratör · **Tarih:** 2026-09-21 · **Kimin için:** Genel Müdür
> Canlıya çıkış adımları ayrı bir belgededir: `docs/deployment-checklist.md`.
> Buradaki liste "sistem gerçekten çalışıyor mu?" sorusunu **elle** yanıtlamak içindir.
> Uygulamanın kendi otomatik testleri ayrıca vardır: `cd app && npm test` (23 dosya · 222 test · 2026-11-01).

---

## 0. Başlamadan önce

| Ne | Nasıl |
|---|---|
| Uygulamayı çalıştır | `cd app && npm run dev` → `http://localhost:5173` |
| Otomatik testler | `cd app && npm test` |
| Hesap | `/kayit` sayfasından kaydol; oluşan hesabın rolü `owner`'dır (en üst yetki) |
| Odalar | Uygulamada oda ekleme ekranı **yoktur**; odalar Supabase Studio'dan girilir (aşağıda) |

**Neden iki tarayıcı gerekir?** Depo zinciri kuralı gereği (Maker–Checker) **talep eden kişi teslim
alamaz**. Tek hesapla zincirin tamamı denenemez; en az iki hesap ve iki ayrı tarayıcı penceresi gerekir.

---

## 1. Kapı ve hesap

- [ ] `/kayit` — otel adı, ad, e-posta, şifre (**en az 8 karakter**) ve **yasal onay kutusu** ile kaydol. Ana Kumanda açılmalı.
- [ ] `/kayit` — **onay kutusunu işaretlemeden** gönder: form gitmemeli (karar 026).
- [ ] `/kayit` — "Kullanım Şartları" ve "KVKK Aydınlatma Metni" bağlantıları **yeni sekmede** açılmalı; dönünce form dolu durmalı.
- [ ] Eksik/hatalı alanla dene: her hata **tek cümleyle** söylenmeli, form kaybolmamalı.
- [ ] Çıkış yap, `/giris` ile tekrar gir.
- [ ] Giriş yapmadan `/panel` adresini aç: kapıya (`/giris`) gönderilmeli. Giriş yapınca **panele** dönmeli.
- [ ] Giriş yapmışken `/giris` adresini aç: ana ekrana geçmeli.

## 2. Müdür paneli (Ana Kumanda)

- [ ] Kırmızı bir şey yoksa ekran yeşil: "Her şey yolunda" demeli.
- [ ] **Personel** → yeni personel ekle. Şifresi ekranda görünmeli (mail gitmez).
- [ ] **Personel** → 🔑 Şifre → yeni şifre ver, o personelle giriş yapabildiğini doğrula (**5 saniye vaadi**).
- [ ] **Ürünler** → ürün ekle (en fazla 8 açık ürün). Listeden çıkarmayı da dene.

## 3. Kat görevlisi akışı (oda operasyonu)

> Oda kapısındaki kare kodun içinde `rooms.staff_code` vardır. Kamera yalnızca **https** üzerinde
> açılır; bilgisayarda `http://localhost` ile test ederken adresi elle yazın: `/oda/<staff_code>`.

- [ ] Odayı aç, temizlik listesini tikle.
- [ ] **Oda Hazır** → "✓" görünmeli, ana ekrana dönmeli.
- [ ] **Eksik Var** → ürün seç → miktar (Kg ise yarımşar gitmeli, sayının üstüne dokununca yazılabilmeli) → gönder.
- [ ] **Bir Şey Bozuk** → fotoğraf çek → tür seç → gönder.
- [ ] Bozuk bildirimi sonrası oda **satışa hazır olmamalı**; müdür panelinde iş emri görünmeli.

## 4. Arıza → iş emri → süre (SLA)

- [ ] Teknisyen hesabıyla gir → **Açık İşler**: en az süresi kalan en üstte olmalı, renk yeşil→sarı→kırmızı.
- [ ] **Aldım** → **Çözdüm** (isteğe bağlı fotoğraf). İş kapanmalı.
- [ ] Süre aşılınca müdür panelinde **kırmızı alarm** ve **zarif bir çan** sesi (siren değil).
- [ ] İş çözülünce oda (temizlik de tamamsa) **satışa hazır** olmalı.

## 5. Depo zinciri (üç imza — en kritik kural)

> Kural: **talep eden ≠ onaylayan ≠ teslim alan.** Kural ekranda değil, veritabanındadır.

- [ ] Personel hesabıyla **talep** oluştur.
- [ ] Müdür hesabıyla **Bekleyen Onaylar** → onayla.
- [ ] Depo hesabıyla **Teslim Al** → gelen miktarı gir → fatura fotoğrafı ekle → Teslim Aldım.
- [ ] **Eksik teslim dene** (örn. 10 Kg onaylandı, 7,5 Kg geldi): kanıt fotoğrafı **zorunlu** olmalı.
- [ ] Müdür panelinde **Teslimat Uyuşmazlıkları** alarmı düşmeli; istenen · onaylanan · gelen yan yana görünmeli.
- [ ] **Kuralı kırmayı dene:** talep eden kişiyle teslim almayı dene — sunucu reddetmeli.

## 6. Misafir yorum kalkanı

- [ ] `/yorum/<guest_code>` adresini aç (giriş istememeli, kurulum istememeli).
- [ ] Düşük puan (1–3) gönder → müdür panelinde **Mutsuz Misafirler** alarmı düşmeli.
- [ ] Yüksek puan (4–5) gönder → yalnızca teşekkür; alarm düşmemeli.

## 7. İnternetsiz çalışma (offline)

- [ ] Tarayıcı geliştirici araçlarından ağı kapat (Network → Offline).
- [ ] Oda Hazır bildir: ekran anında "📱 Telefona kaydedildi" demeli (✓ **dememeli**), ana ekranda "… kayıt telefona kaydedildi, internet gelince gönderilecek" yazmalı.
- [ ] Ağı aç: kayıt kendiliğinden gitmeli, ana ekrandaki satır kaybolmalı; **Kayıtlarım**'da "Sunucuda tamamlandı" altında görünmeli.
- [ ] Fotoğraflı bir bildirimi de aynı şekilde dene (önce fotoğraf, sonra kayıt gider).

## 7b. Kayıt durumları (karar 028)

- [ ] İki telefonda (ya da iki tarayıcıda) aynı işe "Aldım" de; ikincisi internetsizken desin. İnternet gelince ikincisinin **Kayıtlarım**'ında "Sunucu kabul etmedi · Bu iş başkasında" görünmeli; iş listesi gerçek sahibi göstermeli; kayıt silinmemeli.
- [ ] Reddedilen kayıtta "Gördüm, arşivle"ye bas: ana ekrandaki uyarı kaybolmalı, kayıt **Arşiv**'de durmalı.
- [ ] Ortak telefon: A kişisi internetsiz bir kayıt bıraksın ve çıksın; B girsin. B, A'nın kaydını ve fotoğrafını **görmemeli** (yalnızca "Başka kullanıcının 1 bekleyen kaydı var"). A tekrar girince kayıt gitmeli.
- [ ] İki otelli hesap: A otelindeyken internetsiz kayıt bırak, B oteline geç, interneti aç. Kayıt **gitmemeli**, "Başka otelinizde 1 kayıt bekliyor" yazmalı. A oteline dönünce gitmeli.

## 7c. Uzun bağlantı kesintisi ve oturum kartı (karar 029)

- [ ] Giriş yap, oteli seç. İnterneti, giriş kartının süresi dolacak kadar uzun kes (kart ~1 saatliktir; kesinti
  sırasında kalan süresi bitmesi yeter). İnterneti aç: ekran **asla "Otel bulunamadı" dememeli**; çalışma
  ekranı ve odalar yerinde kalmalı. Birkaç dakika içinde bilgiler sunucudan sessizce tazelenmeli.
- [ ] Aynı kesinti sırasında uygulamayı kapatıp aç: telefonda bilinen oteller varsa çalışma ekranı, yoksa
  **"Bağlantı yok · Tekrar dene"** görünmeli (asla "Otel bulunamadı" değil).
- [ ] Kesintide bırakılan kayıt (fotoğraflı da) internet gelince **bir kez** gitmeli; "Sunucu kabul etmedi"
  olmamalı; fotoğraf kaybolmamalı.
- [ ] Gerçek yetki iptali (yalnız deneme otelinde): müdür bir görevlinin **tek** üyeliğini kaldırsın. Görevli
  internet varken uygulamayı açınca "Otel bulunamadı" görmeli. Üyelik geri eklenince düzelmeli.
- [ ] Ortak telefon: A çıkar, B girer. B'nin ekranında A'nın otelleri, odaları ya da işleri hiç görünmemeli.
- [ ] İki otelli B girişinde otel seçim ekranı gelince, seçim yapmadan bekle: A'nın odaları B'nin telefonuna
  inmemeli; B otelini seçince yalnızca kendi otellerinin bilgileri görünmeli.
- [ ] Çıkış'a bas ve hemen ekrana bak: giriş ekranı gelmeli ve birkaç saniye bekleyince **kendiliğinden geri
  açılmamalı**. Ardından yeniden giriş yapınca normal açılmalı.

## 8. Yetki sınırları (en az yetki ilkesi)

- [ ] Personel hesabıyla `/panel` adresini aç: **girememeli**.
- [ ] Bir otelin personeliyle başka otelin oda kodunu aç: **açılmamalı**.
- [ ] Teslim ekranında başkasının talebini onaylamayı dene: **reddedilmeli**.

## 9. Demo kilidi (isteğe bağlı, dikkatli)

> `hotels.demo_bitis_tarihi` yalnızca **ana anahtarla** değiştirilebilir. Test için geçmişe çekilirse
> uygulama yazmayı durdurur; okuma sürer ve **hiçbir veri silinmez**. Test bitince tarihi geri alın.

- [ ] Tarih geçmişe çekilince ödeme duvarı görünmeli, yeni kayıt kabul edilmemeli.
- [ ] Geçmiş kayıtlar hâlâ görünmeli.

---

## Testten önce Supabase'de yapılacak iki hazırlık

Uygulamada oda ekleme ve kontrol listesi ekranı **yoktur** (bilinçli: `docs/deployment-checklist.md` · 1.10–1.11).
Yeni açtığınız otelde oda olmadığı için 3–7 arası adımlar denenemez. Supabase Studio → SQL Editor'de
şunu bir kez çalıştırın (`OTEL ADINIZ` yerine kayıt ederken yazdığınız adı koyun):

```sql
-- 1) Beş test odası
insert into public.rooms (hotel_id, number, floor)
select h.id, o.number, o.floor
from public.hotels h,
     (values ('101','1'), ('102','1'), ('204','2'), ('205','2'), ('309','3')) as o(number, floor)
where h.name = 'OTEL ADINIZ';

-- 2) Temizlik kontrol listesi (en fazla 10 madde)
insert into public.checklist_templates (hotel_id, name, items)
select h.id, 'Standart Oda',
       array['Yatak','Banyo','Havlu','Minibar','Zemin','Çöp']
from public.hotels h
where h.name = 'OTEL ADINIZ';

-- 3) Test için gereken kodlar: QR yerine adres çubuğuna yazılır
select number as oda,
       '/oda/'   || staff_code as personel_adresi,
       '/yorum/' || guest_code as misafir_adresi
from public.rooms r
join public.hotels h on h.id = r.hotel_id
where h.name = 'OTEL ADINIZ'
order by number;
```

Üçüncü sorgunun çıktısındaki adresleri tarayıcıya elle yazarak QR okutmadan test edebilirsiniz.
