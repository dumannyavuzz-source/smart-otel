# 005 — Demo Süresi 30 Gün ve Ödeme Duvarı

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-17
> **Durum:** Uygulandı (Aşama 21). Göç canlıya uygulanmayı bekliyor.
> Kod: `supabase/migrations/20260917100000_demo_suresi.sql`, `app/src/demo.ts`,
> `app/src/parcalar/DemoCubugu.tsx`, `app/src/ekranlar/OdemeDuvariEkrani.tsx`
> İlgili: `docs/security/006-demo-kilidi.md` · `docs/v1-1-notlari.md` · B2

---

## Durum

Vitrin ve kayıt sayfası otelciye ücretsiz bir deneme sözü veriyor. İki sorun vardı:

1. **Söz verilen süre her yerde aynı değildi.** Vitrin ve kayıt sayfası "14 gün" diyordu.
2. **Süreyi takip eden hiçbir şey yoktu.** Açılan otel süresizdi: bitiş tarihi, uyarı ya da
   kapanma yoktu. 2026-09-16'da bu bilinçli olarak V1.1'e bırakılmıştı.

## Karar

### 1. Deneme süresi 30 gündür
Kullanıcının gördüğü her yerde tek bir sayı vardır: **30 gün**.

### 2. "V1.1'e bırakalım" kararı iptal edilmiştir
2026-09-16 tarihli erteleme kararı geçersizdir; iş bu aşamada yapılmıştır.

### 3. Genel Müdür'ün dört sorusu ve cevapları (2026-09-17)

| Soru | Cevap |
|---|---|
| **Süre dolunca ne olur?** | Kullanıcının verileri güvende kalır, otel operasyon ekranları kilitlenir. Kullanıcı yalnızca ödeme duvarını görür: *"30 günlük demo süreniz sona erdi. Uygulamayı kullanmaya devam etmek için paketinizi seçin."* |
| **Kalan gün nerede görünür?** | Uygulamanın üst menüsünde (navbar). Süre 7 gün ve altına düşünce rengi değişir ve paket seçimi uyarısı verir. |
| **Süre ne zaman başlar?** | Kayıt formu doldurulup hesap oluştuğu an; 30 gün otomatik başlar. |
| **Tarihi kim uzatabilir?** | Yalnızca biz, arka planda Supabase üzerinden. Kullanıcı kendi süresini uzatamaz. |

## Nasıl yapıldı?

**Veritabanı** (`…_demo_suresi.sql` — yeni göç; eski göçlere dokunulmadı):
- `hotels` tablosuna `demo_bitis_tarihi` sütunu. Varsayılanı `now() + 30 gün` olduğu için sayaç,
  kayıt kapısı oteli açtığı an kendiliğinden başlar; kapıya tek satır kod eklemek gerekmedi.
- Süre dolunca **yazma durur, okuma durmaz**: her yazma kilidinin üstüne bir şart daha eklendi.
- Tarihi uygulamadan değiştirmek imkânsızdır; bir kural (trigger) reddeder. Ana anahtarla gelen biz uzatabiliriz.

**Uygulama:**
- `demo.ts` — "kaç gün kaldı", "süre doldu mu" hesabı. Tarih bilinmiyorsa kilit **yoktur**:
  "bilmiyorum" ile "süresi doldu" karıştırılmaz.
- `DemoCubugu.tsx` — her ekranın üstündeki sayaç. Son 7 günde sarıya döner, yanında "Paketinizi seçin" çıkar.
  Süre bizim tarafımızdan uzatılmışsa (ödeme yapılmışsa) çubuk kendiliğinden kaybolur.
- `OdemeDuvariEkrani.tsx` — süre dolunca açılan tek ekran.

## Bugün eksik olan

**Ödeme alma yolu yoktur** (`docs/v1-1-notlari.md` · B3). "Paketleri Gör" düğmesi bugün vitrinin
fiyat sayfasına götürür. Parasını ödeyen otelin süresini bir süre daha **biz elle uzatacağız**.
Ödeme sağlayıcısı bağlanınca bu düğme oraya bağlanacaktır.
