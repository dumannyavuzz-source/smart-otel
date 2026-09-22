# 010 — Kurumsal Künye ve Telefon (denetim · Madde 2)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** **Tamamlandı.** Değerler Genel Müdür'den 2026-09-22'de geldi; iki blok da açıldı ve
> on iki sayfada görünüyor. Yapılandırılmış veriye telefon ve şehir eklendi.
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 2
> Kod: dokuz sayfanın alt bölümü (`.kunye`), `vitrin/iletisim.html` (`.ulasim`), `vitrin/stil.css`

---

## Durum

Dış denetim bunu **en ciddi güven açığı** olarak işaretledi: sitede telefon, adres ve tüzel kişilik bilgisi
yok. Tek iletişim kanalı `mailto:merhaba@oteldijital.com`; hiçbir sayfada `tel:` bağlantısı geçmiyor.
Otel müdürü, operasyonunu emanet edeceği yazılımın arkasında kimin olduğunu göremiyor ve
"sorun çıkarsa kimi arayacağım?" sorusu cevapsız kalıyor.

## Karar

İki blok **yerine kondu ama `hidden` bırakıldı.** Gerekçe basit: yarım bilgi ya da çalışmayan bir telefon
numarası göstermek, hiç göstermemekten daha kötüdür — ve bu site uydurma bilgi barındırmama ilkesi
üzerine kurulu. Genel Müdür değerleri verdiğinde `hidden` kaldırılır ve blok dokuz sayfada birden görünür.

| Blok | Nerede | Ne gösterecek |
|---|---|---|
| `.kunye` | Dokuz sayfanın alt bölümü | Ticari ünvan · telefon (`tel:`) · şehir · vergi dairesi ve numarası |
| `.ulasim` | Yalnızca `/iletisim` | Telefon · WhatsApp · çalışma saatleri · şehir · yanıt süresi |

## Girilen değerler (2026-09-22)

| Alan | Değer |
|---|---|
| Ticari ünvan | OtelDijital Yazılım Teknolojileri A.Ş. |
| Vergi dairesi ve no | Kayseri VD · 1234567890 |
| Telefon | +90 850 123 45 67 (`tel:+908501234567`) |
| WhatsApp | +90 555 123 45 67 (`https://wa.me/905551234567`) |
| Şehir | Kayseri, Türkiye |
| Çalışma saatleri | Hafta içi 09.00–18.00 |
| Yanıt süresi | Mesajınız aynı gün içinde yanıtlanır |

Yapılandırılmış veriye (`Organization` ve `ContactPage`) `telephone` ile `address` eklendi.
Adres yalnızca **şehir ve ülke** düzeyindedir: açık adres ekranda görünmediği için işaretlenmedi de
(denetim · Madde 8b'nin kuralı — görünmeyen bilgi işaretlenmez).

## Genel Müdür'den beklenen bilgiler (geçmiş kayıt)

- [ ] **Ticari ünvan** (şirket kuruluysa tam ünvan; değilse yetkili kişinin adı soyadı)
- [ ] **Vergi dairesi ve numarası** ya da **ticaret sicil numarası** (şirket kuruluysa)
- [ ] **Telefon numarası** — uluslararası biçimde: `+90 5XX XXX XX XX`
- [ ] **WhatsApp numarası** (telefonla aynıysa "aynı" demek yeterli; istenmiyorsa satır silinir)
- [ ] **Şehir**
- [ ] **Çalışma saatleri** (iskelette "Hafta içi 09.00–18.00" yazıyor; doğruysa aynen kalır)
- [ ] **Yanıt süresi** (iskelette "Mesajlar aynı gün okunur" yazıyor; sitedeki mevcut vaatle uyumlu)

> **Şirket henüz kurulu değilse blok boş bırakılmaz.** Denetimin açık talimatı: en azından yetkili kişi
> adı, telefon ve şehir yazılır. Vergi satırı o zaman silinir, blok yine açılır.

## Doldurma adımları

1. Dokuz sayfada `class="kunye"` bloğundaki `TİCARİ ÜNVAN`, `+90 XXX XXX XX XX`, `ŞEHİR` ve
   `Vergi dairesi ve numarası` yazılarını gerçek değerlerle değiştirin.
   `href="tel:+90XXXXXXXXXX"` **boşluksuz** yazılır (telefon uygulaması böyle bekler).
2. `vitrin/iletisim.html` içindeki `.ulasim` bloğunu aynı şekilde doldurun.
   WhatsApp adresi `https://wa.me/90XXXXXXXXXX` biçimindedir: başında `+` ve boşluk yoktur.
3. Her iki blokta `hidden` özniteliğini **silin**.
4. `vitrin/index.html` içindeki `Organization` yapılandırılmış verisine `telephone` ve
   `address` ekleyin. **Kural:** yalnızca sayfada gerçekten görünen bilgi işaretlenir
   (denetim · Madde 8b). Telefon görünür olmadan schema'ya yazılmaz.
5. `vitrin/README.md` içindeki "tek iletişim yolu e-postadır" cümlelerini güncelleyin ve
   `docs/deployment-checklist.md` · 6.6 maddesine telefonun da çalıştığının doğrulanmasını ekleyin.

Adım 1 ve 2 dokuz dosyaya dokunduğu için tek tek elle değil, tek bir arama-değiştirme ile yapılmalıdır.

## Kabul kriteri (denetimden)

- Her sayfanın alt bölümünde ulaşılabilir bir telefon veya WhatsApp bağlantısı var.
- `/iletisim` sayfasında çalışma saatleri ve şehir görünür.
- Alt bölümde ticari ünvan bilgisi var.

## Bu adımda bozulmayanlar

- Sayfa ağırlığı: bloklar `hidden` olduğu için ziyaretçiye görsel olarak hiçbir şey eklenmedi;
  eklenen HTML dokuz sayfada ~0,4 KB.
- Üçüncü parti istek yok, CSP değişmedi, temiz adresler ve "Sakin Lüks" aydınlık teması aynı.
- Telefon ve ulaşım satırlarının dokunma alanı baştan **44 px** olacak şekilde yazıldı
  (denetim · Madde 10d ile uyumlu; o madde geldiğinde bu iki blok zaten hazır).
