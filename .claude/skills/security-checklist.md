# Güvenlik Kontrol Listesi (security-checklist)

> Kullanan ajanlar: **Security** (öncelikli), QA, Orkestratör.
> Temel ilke: **Dışarıdan gelen hiçbir şeye güvenme. Herkese yalnızca işi için gereken yetkiyi ver.**

---

## 1. Şifre Güvenliği
- [ ] Şifreler **asla düz metin** olarak saklanmıyor; tek yönlü, tuzlu (salted) bir özet (hash) ile saklanıyor.
- [ ] Şifreler loglara, hata mesajlarına veya ekrana yazılmıyor.
- [ ] Minimum şifre uzunluğu **8 karakter**; üst sınır makul (örn. 128) ve gereksiz karmaşıklık kuralı yok.
- [ ] Giriş denemeleri sınırlı: art arda başarısız denemelerde bekleme süresi veya geçici kilit var.
- [ ] "Şifremi unuttum" akışı, hesabın var olup olmadığını **ele vermiyor** ("Eğer bu e-posta kayıtlıysa bağlantı gönderildi").
- [ ] Şifre sıfırlama bağlantıları tek kullanımlık ve kısa ömürlü.
- [ ] Oturum çerezleri `HttpOnly`, `Secure` ve `SameSite` işaretli.

## 2. Gizli Bilgiler
- [ ] API anahtarı, veritabanı şifresi, token gibi hiçbir gizli bilgi **kodun içinde değil**; ortam değişkenlerinde.
- [ ] `.env` ve benzeri dosyalar `.gitignore` içinde; git geçmişinde gizli bilgi yok.
- [ ] Örnek yapılandırma dosyaları (`.env.example`) gerçek değer değil, sahte değer içeriyor.

## 3. XSS (Zararlı Kod Enjeksiyonu)
- [ ] Kullanıcıdan gelen **her metin**, ekrana basılmadan önce kaçış işlemi (escape) uygulanıyor.
- [ ] HTML'i doğrudan basan fonksiyonlar (`innerHTML`, `dangerouslySetInnerHTML` vb.) kullanıcı verisiyle **asla** kullanılmıyor.
- [ ] Kullanıcı girdisi URL'ye, dosya adına veya komuta doğrulanmadan eklenmiyor.
- [ ] Tarayıcıya gönderilen sayfalarda içerik güvenlik politikası (CSP) başlığı var.
- [ ] Dosya yükleme varsa: tür ve boyut sınırı var, dosya adı yeniden üretiliyor, dosya çalıştırılabilir bir yerde saklanmıyor.

## 4. Girdi Doğrulama
- [ ] Her girdi **sunucu tarafında** doğrulanıyor. Tarayıcıdaki doğrulama yalnızca kullanıcı kolaylığı için.
- [ ] Her alanın izin verilen tipi, uzunluğu ve formatı tanımlı ("izin listesi"); yasak listesi değil.
- [ ] Veritabanı sorguları parametreli; kullanıcı girdisi sorgu metnine yapıştırılmıyor (SQL enjeksiyonu).
- [ ] Sayısal kimlikler (id) tahmin edilebilir olsa bile, yetki kontrolü olmadan veri döndürülmüyor.

## 5. Yetkilendirme (Kim Neye Erişebilir?)
- [ ] Her API ucunun (endpoint) yazılı bir cevabı var: **"Buna kim erişebilir?"** Cevap yoksa uç hazır değil.
- [ ] Varsayılan **erişim yok**. Erişim açıkça verilir, kapatılmaz.
- [ ] Kimlik doğrulama (kimsin?) ile yetkilendirme (ne yapabilirsin?) ayrı ayrı kontrol ediliyor.
- [ ] Kullanıcı yalnızca **kendi verisine** erişebiliyor; `id=5` → `id=6` değişikliği başkasının verisini göstermiyor.
- [ ] Roller net ve az sayıda (örn. misafir, personel, yönetici). Yetki kontrolü sunucuda, arayüzde değil.
- [ ] Yetkisiz istekler sessizce reddediliyor; neden reddedildiği saldırgana açıklanmıyor.

## 6. Hata ve Kayıt (Log)
- [ ] Kullanıcıya gösterilen hata mesajı **teknik detay içermiyor** (yığın izi, dosya yolu, sorgu metni yok).
- [ ] Loglar kişisel veri, şifre veya token içermiyor.
- [ ] Başarısız giriş denemeleri ve yetki ihlalleri loglanıyor.

## 7. Bağlantı ve Dış Kaynaklar
- [ ] Tüm trafik HTTPS üzerinden.
- [ ] Dış servislere yapılan her çağrının zaman aşımı var.
- [ ] Eklenen her bağımlılık bilinen açık listelerine karşı kontrol ediliyor; kullanılmayan bağımlılık kaldırılıyor.

---

## Risk Seviyeleri
| Seviye | Anlamı | Ne yapılır |
|---|---|---|
| **Yüksek** | Veri sızabilir, hesap ele geçirilebilir | **Veto.** Düzeltilmeden iş ilerlemez. |
| **Orta** | Kötüye kullanılabilir ama sınırlı etki | Bu aşama bitmeden düzeltilir. |
| **Düşük** | İyileştirme, en iyi pratik | Kayda geçer, planlanır. |
