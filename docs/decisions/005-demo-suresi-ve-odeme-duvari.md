# 005 — Demo Süresi 30 Gün ve Ödeme Duvarı

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-17
> **Durum:** Karar verildi — uygulaması **bir sonraki aşamada** yapılacak, bu aşamada kod yazılmadı.
> İlgili: `docs/security/005-kayit-kapisi.md` · `docs/v1-1-notlari.md` · B2

---

## Durum

Vitrin ve kayıt sayfası otelciye ücretsiz bir deneme sözü veriyor. İki sorun vardı:

1. **Söz verilen süre her yerde aynı değildi.** Vitrin ve kayıt sayfası "14 gün" diyordu,
   Genel Müdür ise kayıt sayfasının başlığını "30 Gün Ücretsiz Dene" olarak istedi.
2. **Süreyi takip eden hiçbir şey yoktu.** Açılan otel süresizdi: bitiş tarihi, uyarı ya da
   kapanma yoktu. 2026-09-16'da bu bilinçli olarak V1.1'e bırakılmıştı.

## Karar

### 1. Deneme süresi 30 gündür
Kullanıcının gördüğü her yerde tek bir sayı vardır: **30 gün**. Vitrin, kayıt sayfası ve
güvenlik belgeleri bu sayıya göre düzeltilmiştir.

### 2. "V1.1'e bırakalım" kararı iptal edilmiştir
2026-09-16 tarihli erteleme kararı geçersizdir. Süre takibi artık "bir gün yapılacak" işler
listesinde değildir; **bir sonraki aşamanın** işidir.

### 3. Bir sonraki aşamada kurulacaklar
- `hotels` tablosuna **`demo_bitis_tarihi`** sütunu eklenecek.
- **Aktif demo takibi:** otel açılırken tarih yazılır, panelde kalan gün görünür.
- **Ödeme duvarı (paywall):** süre dolunca otelin kullanımı durur.

## Bu aşamada ne yapılmadı

Bu belge yalnızca kararın kaydıdır. Veritabanına sütun eklenmedi, hiçbir kilit veya ekran
yazılmadı. Bugün açılan oteller hâlâ süresizdir.

## Sonraki aşamada cevaplanacak sorular

Bunlar uygulamadan önce Genel Müdür'e sorulacaktır; bugün cevabı yoktur:

- **Süre dolunca tam olarak ne olur?** Otel büsbütün kilitlenir mi, yoksa okumak serbest kalıp
  yazmak mı durur? Misafirin QR'ı çalışmaya devam eder mi?
- **Kalan gün nerede görünür?** Yalnızca müdür panelinde mi, personel de görür mü?
- **Süre ne zaman başlar?** Otelin açıldığı an mı, ilk girişte mi?
- **Süre kim tarafından uzatılır?** Ödeme sonrası tarihi kim, hangi kayıtla değiştirebilir?
  (Maker-Checker kuralı burada da geçerli midir?)
