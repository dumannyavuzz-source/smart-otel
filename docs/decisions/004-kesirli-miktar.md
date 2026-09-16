# 004 — Kesirli (Ondalıklı) Miktar: "7,5 Kg Domates"

> **Karar veren:** Genel Müdür · **Uygulayan:** Orkestratör + Architect · **Tarih:** 2026-09-16 · **Durum:** Uygulandı (Aşama 17.1)
> Kod: `supabase/migrations/…_kesirli_miktar.sql`, `app/src/miktar.ts`, `app/src/parcalar/MiktarSayaci.tsx`

---

## Durum

Aşama 17'de miktarlar **tam sayıydı**: "7 Kg" yazılabiliyordu, "7,5 Kg" yazılamıyordu.
Genel Müdür'e bu sınır bildirildi ve kararı net oldu:

> "Otel mutfaklarına 7,5 Kg veya 1,2 Litre gibi küsuratlı ürünler sıkça gelir.
> Bu yapısal değişikliği sonraya bırakamayız, hemen yapmalıyız."

Karar doğrudur ve zamanlaması da doğrudur: sayı tipi, üzerine kayıt biriktikçe değiştirilmesi pahalılaşan bir şeydir.

## Karar

### 1. Veritabanında tam sayı yerine ondalıklı sayı

Dört sütun birden değişti. **Üçü birden değişmeliydi**; yoksa 7,5 Kg istenir, 7 Kg onaylanır ve
"eksik mi geldi?" karşılaştırması yalan söylerdi.

| Tablo · sütun | Ne demek | Eski | Yeni |
|---|---|---|---|
| `supply_reports.quantity` | Personelin "şu kadar eksik" beyanı | `integer` | `numeric(8,2)` |
| `purchase_requests.quantity` | İstenen miktar (Maker) | `integer` | `numeric(8,2)` |
| `approvals.approved_quantity` | Onaylanan miktar (Checker) | `integer` | `numeric(8,2)` |
| `deliveries.received_quantity` | Gelen miktar (Beyan) | `integer` | `numeric(8,2)` |

`numeric(8,2)`: en çok 999999,99 ve **iki ondalık**. "7,456 Kg" diye bir şey yoktur; veritabanı 7,46'ya yuvarlar.
Tartı da zaten o kadarını gösterir.

**Neden `numeric`, `float` değil?** `float` para ve ölçü için yanlış tiptir: 0,1 + 0,2 işlemi 0,30000000000000004 eder.
`numeric` ondalığı olduğu gibi saklar. Bu bir muhasebe kaydıdır, tahmin değildir.

**İki ondalıktan küçük farklar yok sayılır.** 7,50 onaylanmışken 7,495 yazılırsa veritabanı bunu 7,50 olarak saklar
 ve "eksik geldi" demez. Gerçek fark 5 gramdır; otel tartısı da o farkı göstermez. Bu bilinçli bir karardır, hata değildir.

**Üst sınır: 9999.** Ondalıklı sayı, tam sayıda imkânsız olan bir şeye izin verir: "sayı olmayan sayı" (NaN).
PostgreSQL NaN'ı bütün sayılardan büyük sayar; üst sınır olmasaydı uygulamayı değil doğrudan sunucuyu kullanan biri
NaN yazarak "gelen < onaylanan mı?" sorusunu atlatır ve **eksik teslimde kanıt fotoğrafı şartını delerdi**.
Dört sütunun da üst sınırı vardır; sınır bir iş kuralı değil, akıl sınırıdır (ekranlar zaten 999'da durur).
Bu açık, Aşama 17.1 güvenlik denetiminde bulundu ve aynı göç dosyasında kapatıldı.

### 2. Kesirli yazma iznini BİRİM verir

"7,5 Kg" vardır, "2,5 havlu" yoktur. Bu yüzden kararı ürünün birimi verir (`app/src/miktar.ts`):

| Birim | − + adımı | Ondalık yazılabilir mi |
|---|---|---|
| Kg, kilo, gram, Litre, lt, ml, metre | **0,5** (yarımşar) | Evet |
| adet, Koli, Paket, Kutu, (boş) | **1** (birer birer) | Hayır — virgül ve sonrası atılır ("2,5" → 2) |

Birimi müdür belirler (Ürünler ekranı). Personel hiçbir şey seçmez; sadece cevap verir.

### 3. Sayı artık yazılabilir de

− + tuşları yarımşar gider. Ama **1,2 Litre'ye yarımşar adımlarla ulaşılamaz**.
Bu yüzden sayacın ortasındaki sayı artık bir yazı alanıdır: üstüne dokunulur, telefonun sayı klavyesi açılır, "1,2" yazılır.

Tek bir parça (`MiktarSayaci`) üç ekranda birden kullanılır: **Eksik Var** (personel), **Bekleyen Onaylar** (müdür), **Teslim Al** (depo).
Üç ekran da aynı şekilde çalışır; personel bir kez öğrenir.

### 4. Ekranda Türkçe yazılır

Ondalık ayırıcı **virgüldür**: "7,5 Kg". Gereksiz sıfır yazılmaz ("7,50" değil). Sayı hiçbir yerde çıplak bırakılmaz;
her yazıldığı yerde birimiyle birlikte yazılır.

## Yapmadıklarımız

| Düşünülen | Neden şimdi değil |
|---|---|
| Gramı ayrı sütunda tutmak (7 Kg + 500 g) | İki sütun, iki soru, iki hata kaynağı. Tek sayı yeter. |
| Üç ondalık (7,455 Kg) | Otel tartısı o hassasiyette değil. İki ondalık hem yeter hem okunur. |
| "Kg mı, gram mı?" diye personele sormak | Birimi müdür bir kez belirler; personel sahada seçim yapmaz. |
