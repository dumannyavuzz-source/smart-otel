# 002 — Güvenlik: Personel Kapısı ve Müdür Paneli (Aşama 16)

> **Hazırlayan:** Security + Orkestratör · **Tarih:** 2026-09-15 · **Durum:** Genel Müdür kararı bekliyor (4 açık madde)
> Bu belge, Aşama 16 kodlandıktan **sonra** yapılan denetimin sonucudur.
> Dayanak: `docs/security/001-rls-and-maker-checker.md`, `docs/decisions/002-database-architecture.md`.

---

## Temiz çıkanlar (denendi, sağlam)

| Soru | Cevap |
|---|---|
| Panelin ekran kilidi aşılırsa veri sızar mı? | **Hayır.** Rota kilidi (`App.tsx`) bir kolaylıktır; asıl kilit sunucudadır. Görevli, tarayıcıdan panel adresine gitse bile misafir yorumlarını, onayları, başkasının talebini ve personel listesini göremez — kilitler reddeder. |
| Ana anahtar nerede kullanılıyor? | Yalnızca **hesap açmak** ve yarım kalırsa **geri silmek** için (`personel-ekle/index.ts`). Hiçbir tabloya ana anahtarla dokunulmuyor; üyelik, çağıran müdürün **kendi kartıyla** yazılıyor, yani kilitler geçerli. |
| Görevli kendini müdür yapabilir mi? | **Hayır.** Çift kilit: kapıda rol denetimi (`kapi.ts · ekleyebilirMi`), veritabanında RLS. Sahip → müdür + görevli · müdür → yalnızca görevli · görevli → hiçbir şey. |
| Talep eden kendi talebini onaylayabilir mi? | **Hayır.** Ekran butonu gizler, **veritabanı da reddeder** ("Talep eden kendi talebini onaylayamaz."). Bir talebe tek karar yazılır. |
| Hata mesajları bilgi sızdırıyor mu? | Hayır. Ham veritabanı hataları ekrana çıkmıyor; yalnızca kendi Türkçe kural cümlelerimiz geçiyor. (Tek istisna aşağıda · Açık 2.) |
| Çan sesi (`app/src/ses.ts`) veri sızdırıyor mu? | **Hayır.** Dış bağlantı, ses dosyası, üçüncü taraf yok; sesi tarayıcı üretir. Hafızada yalnızca alarm kimlikleri durur ve çıkışta silinir. |
| Kodda/git'te gizli anahtar var mı? | Hayır. |

## Bu aşamada düzeltilenler

- **"Çıkar" düğmesi yalnızca görevlide görünür** ve silinen satır geri istenir: kilide takılan bir silme işlemi PostgREST'te hata vermez, sıfır satır siler. Artık müdür "çıkardım" sanmıyor; çıkaramadıysa bunu okuyor.
- **`urun_siniri` tetikleyicisinden gereksiz yetki kaldırıldı** (`security definer` yok). Saydığı tabloyu müdür zaten görebiliyor; fazladan yetki vermeye gerek yok.
- **Göç uyarısı yazıldı:** personel görev kuralı boş bir veritabanı varsayar; içinde görevli satırı olan bir veritabanında önce `job` doldurulmalıdır.
- **`PANEL_ORIGIN` belgelendi** (`supabase/README.md`): canlıya çıkmadan önce panelin adresi yazılmalı, yoksa kapı her adresten gelen tarayıcı isteğine cevap verir.

## Genel Müdür kararı bekleyen dört açık madde

### Açık 1 · YÜKSEK — Müdür, personelin şifresini biliyor ve personel onu değiştiremiyor
Müdür yeni personelin ilk şifresini kendisi koyuyor; uygulamada **şifre değiştirme yolu yok**. Bu, Maker-Checker'ın
dayandığı "herkes yalnızca kendi hesabına girer" varsayımını zayıflatır: şifreleri bilen bir müdür, personelin
hesabıyla talep açıp kendi hesabıyla onaylayabilir. Veritabanı üç farklı kişi gördüğü için itiraz etmez.

Seçenekler: **(a)** "Şifremi değiştir" ekranı + ilk girişte zorunlu değiştirme · **(b)** müdür şifre koymasın,
e-posta ile davet bağlantısı gönderilsin · **(c)** risk bilerek kabul edilsin ve buraya yazılsın.
Aynı kararla birlikte: şifre alanı şu an **yazarken görünüyor** (omuz üstünden okunabilir). Gizlenmesi güvenlik
için daha iyidir; ama şifre sıfırlama yolu olmadığı için yanlış yazılan bir şifre hesabı kullanılmaz hale getirir.
İkisi tek kararda çözülmelidir.

### Açık 2 · ORTA — Personel kapısında hız sınırı yok, e-posta varlığı ele veriliyor
Kapı sınırsız çağrılabiliyor ve "Bu e-posta zaten kayıtlı." diyerek bir adresin sistemde olup olmadığını söylüyor.
Misafir kapısında dakikada 3 sınırı varken burada hiç yok. Kartı olan (ya da kartı çalınan) bir müdür, adres adres
deneyerek "bu kişi Smartotel'de kayıtlı mı?" sorusunu yanıtlayabilir. Önerilen: otel başına sınır (ör. dakikada 3,
günde 20) — misafir kapısındaki desenin aynısı.

### Açık 3 · ORTA-DÜŞÜK — Kapının varsayılanı "her adrese açık"
`PANEL_ORIGIN` boşsa kapı `*` döner. Belgeye yazıldı (yukarıda), ama asıl doğrusu: değişken boşsa veya adres
eşleşmiyorsa kapı **403** demeli. Bu bir satırlık değişikliktir; yerel geliştirmeyi zorlaştırmaması için karar sizin.

### Açık 4 · ORTA-DÜŞÜK — Müdür, var olan herhangi bir hesabı kendi oteline ekleyebilir
Üyelik kilidi `hotel_id` ve `role`'e bakıyor, **`user_id`'ye bakmıyor**. Yani müdür, bildiği bir kullanıcı kimliğini
(başka otelin personeli ya da kendi ikinci hesabı) kendi oteline görevli yazabilir; o kişi otelin tüm odalarını ve
işlerini görmeye başlar, kendisine sorulmaz. Bu **bilinçli bir esneklik mi**, yoksa kapatılmalı mı?
Kapatılacaksa: üyelik yazımı yalnızca `personel-ekle` kapısından geçsin. Her iki durumda da güvenlik denemelerine
bu madde eklenmelidir ki karar bilinçli olsun, kaza olmasın.

---

> **Sonraki adım:** Açık 1 karara bağlanmadan personel şifre akışı sahaya çıkmamalıdır. Açık 2 ve 3 canlıya
> çıkmadan önce, Açık 4 yakın zamanda çözülmelidir.
