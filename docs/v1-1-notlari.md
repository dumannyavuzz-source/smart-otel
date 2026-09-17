# Versiyon 1.1 Notları — Sonraya Bırakılanlar

> **Karar veren:** Genel Müdür · **Tarih:** 2026-09-16
> Bu dosya, **bilerek** sonraya bırakılan işlerin tek listesidir. Buradaki hiçbir madde
> V1 kapsamında yapılmaz; odak dağılmasın diye buraya yazılır ve unutulmaz.

---

## A. Şifre ve hesap güvenliği (Aşama 19.1 denetiminden)

Genel Müdür kararı: **dördü de V1.1'e bırakıldı.** Hiçbiri canlıya çıkışı engellemez;
dördü de "bir gün kötüye kullanılabilir" sınıfındadır, "bugün kırık" sınıfında değildir.

| # | Madde | Bugün ne oluyor? | V1.1'de ne yapılacak? |
|---|---|---|---|
| A1 | **Şifre yenileme deftere yazılmıyor, hız sınırı yok** | Müdür bir personelin şifresini yeniler; bu işlem hiçbir yere kaydedilmez ve kaç kez yapılabileceğinin sınırı yoktur | `sifre_yenilemeleri (hotel_id, hedef_user_id, created_by, created_at)` beyan tablosu + otel başına dakikada 3 sınırı |
| A2 | **Şifre değişince açık oturum kapanmıyor** | "Telefonu kayboldu, şifresini değiştirdim" yetmez; telefondaki uygulama çalışmaya devam eder | Oturum zaman aşımı (`inactivity_timeout`) ya da şifre yazıldıktan sonra kişinin oturumlarının da sonlandırılması |
| A3 | **Üyelik kilidiyle zincirlenme** | Müdür, kimliğini bildiği ve hiçbir otelde çalışmayan bir hesabı kendi oteline yazıp şifresini alabilir | Üyelik yazımı yalnızca `personel-ekle` kapısından geçsin (`docs/security/002` · Açık 4 ile birlikte) |
| A4 | **Sahip kilitlenirse geri dönüş yolu yazılı değil** | Sahip şifresini unutursa tek çare OtelDijital ekibinin ana anahtarı; bu yol yazılı değil | "Sahip kilitlendi" yordamı: kim, nasıl, hangi kayıtla açar — `docs/security/` altına yazılır |

**Bugünkü doğru yol (A2 için, ekip bilmeli):** telefon kaybolduysa kişi otelden **çıkarılır**
(üyelik silinince kilitler erişimi anında keser), sonra yeniden eklenir. Şifre yenilemek tek başına yetmez.

Ayrıntı: `docs/security/004-sifre-yenileme.md`

## B. Kayıt akışından doğanlar (Aşama 20)

| # | Madde | Bugün ne oluyor? | V1.1'de ne yapılacak? |
|---|---|---|---|
| B1 | **E-posta doğrulanmıyor** | Sistem hiç e-posta göndermiyor; kayıt olan kişinin adresi doğrulanmadan hesap açılıyor. Biri başkasının adresiyle otel açabilir | SMTP bağlanınca doğrulama bağlantısı; ya da ilk girişte kod doğrulaması |
| B2 | **Deneme süresi takip edilmiyor** | ✅ **Çözüldü (Aşama 21)** — artık takip ediliyor | Bu listeden düştü: `demo_bitis_tarihi` sütunu, üst menüdeki sayaç ve ödeme duvarı yapıldı |
| B3 | **Ödeme yok** | Fiyat tablosu var, ödeme alma yolu yok | Ödeme sağlayıcısı kararı ve bağlanması |
| B4 | **Kurumsal plan için iletişim yalnızca e-posta** | Düğme `merhaba@oteldijital.com` adresine yazıyor (Genel Müdür kararı) | Gerçek bir iletişim formu / talep takibi |

> **B2 kapandı (2026-09-17).** Genel Müdür, "süre takibi V1.1'e bırakılsın" kararını **iptal etti**;
> deneme süresi **30 gün** olarak belirlendi ve iş aynı gün yapıldı: `hotels` tablosuna `demo_bitis_tarihi`
> sütunu eklendi, üst menüye kalan gün sayacı, süre dolunca da ödeme duvarı kondu. Süreyi yalnızca biz
> uzatabiliriz. Ayrıntı: `docs/decisions/005-demo-suresi-ve-odeme-duvari.md` ve `docs/security/006-demo-kilidi.md`.
> Ödeme **alma** yolu hâlâ yoktur (B3): parasını ödeyen otelin süresi şimdilik elle uzatılır.

## C. Daha önce kayda geçmiş, sonraya bırakılanlar

Bunlar yeni değildir; ilgili belgelerinde zaten duruyor. Tek yerden görülsün diye buraya da yazıldı.

| # | Madde | Kaynak |
|---|---|---|
| C1 | Personel kendi şifresini değiştiremiyor (müdür şifreyi bilmeye devam ediyor) | `docs/security/002` · Açık 1 |
| C2 | Personel kapısında hız sınırı yok, e-posta varlığı ele veriliyor | `docs/security/002` · Açık 2 |
| C3 | Teslim düzeltme ekranı yok (veritabanı yolu hazır, ekranı yok) | `docs/ux/004` |
| C4 | Uyuşmazlık kartında "Gördüm" düğmesi yok; kart 7 gün sonra kendiliğinden düşer | `docs/ux/003` |
| C5 | Fatura fotoğrafını yükleyen kişi kendi yüklediğini sonradan da görebiliyor | `docs/security/003` · Açık 1 |
| C6 | Kapılardaki Supabase kütüphanesi tam sürüme sabitlenmeli (ana anahtarı tutan dosyalar) | `docs/security/004` |
| C7 | Onay kayıtları otelin BÜTÜN personeline açık (yalnızca depo görevlisine daraltılabilir) | Aşama 17 kararı · deneme 2.4b |

---

## Kural

Bu listeye bir madde eklemek serbesttir; **listeden bir maddeyi V1'e almak Genel Müdür kararıdır.**
Odak, V1'i canlıya çıkarmaktır.
