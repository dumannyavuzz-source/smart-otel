# 004 — Depo ve Teslimat Akışı (Maker-Checker'ın son halkası)

> **Hazırlayan:** UX + Orkestratör · **Tarih:** 2026-09-15 (Aşama 17.1 ile güncellendi: 2026-09-16) · **Durum:** Onaylandı
> Kod: `app/src/teslimler.ts`, `app/src/miktar.ts`, `app/src/ekranlar/TeslimlerEkrani.tsx`, `TeslimEkrani.tsx`,
> `supabase/migrations/20260915100800_teslim_hasar.sql`. Dayanak: Blueprint · 3.3.

---

## Üç kişi, üç imza

```
1. Maker          2. Checker              3. Beyan (bu aşama)
   Personel          Müdür                   Depo görevlisi
   "Eksik Var"  ──▶  "10 Kg onaylandı"  ──▶  "Kaç Kg geldi?" ──▶ 📷 Fatura ──▶ ✓ Teslim Aldım
   (talep)           (onay)                  (teslim)                 └─ eksikse: 📷 Eksik/hasar da zorunlu
```

**Aynı kişi iki halkayı imzalayamaz.** Talep eden de onaylayan da o siparişi teslim alamaz;
ekran bu siparişleri o kişiye hiç göstermez, veritabanı da yazmayı reddeder.

## Akış

```
Ana Ekran ──▶ 📦 Teslim Al (2) ──▶ Bekleyen siparişler ──▶ Domates · 10 Kg onaylandı
 (görevli)    (sipariş varsa                                      │
               görünür)                                           ▼
                                                      "Kaç Kg geldi?"  − 10 +
                                                      (sayıya dokunup "7,5" yazılabilir)
                                                      📷 Fatura / irsaliye  (zorunlu)
                                                      ┌──────────────────────────────┐
                                        7 girilirse → │ 3 Kg eksik geldi             │
                                                      │ Eksiği/çürüğü fotoğraflayın  │
                                                      │ 📷 (zorunlu)                 │
                                                      └──────────────────────────────┘
                                                      Not (isteğe bağlı)
                                                      ✓ Teslim Aldım ──▶ ✓ ──▶ Teslimlere Dön
```

## Sahada hayat kurtaran iki ayrıntı

### 1. Soru ürünün birimiyle sorulur
Sistem sabit "Kaç adet geldi?" demez. Ürünün birimi neyse soru odur:

| Ürünün birimi | Ekrandaki soru | Ekrandaki cevap |
|---|---|---|
| Kg | **"Kaç Kg geldi?"** | "7,5 Kg geldi" |
| Litre | **"Kaç Litre geldi?"** | "20 Litre geldi" |
| Koli | **"Kaç Koli geldi?"** | "3 Koli geldi" |
| (boş) | "Kaç adet geldi?" | "5 adet geldi" |

Sayı hiçbir yerde çıplak bırakılmaz; miktar her yazıldığı yerde birimiyle birlikte yazılır.
Birimi müdür belirler (Ürünler ekranı); depo görevlisi hiçbir şey seçmez, sadece cevap verir.

### 2. Eksik geldiyse kanıt istenir
Depo görevlisi onaylanandan **az** bir miktar girerse, bu bir iddiadır: "10 Kg onaylandı ama 7 Kg geldi."
İddia kanıtsız kayda geçmez. Ekran, fatura fotoğrafına **ek olarak** ikinci bir fotoğraf ister:
çürük domatesin, kırık kolinin, eksik kasanın fotoğrafı.

| Durum | İstenen |
|---|---|
| Gelen = onaylanan | Yalnızca fatura fotoğrafı |
| Gelen > onaylanan (fazla geldi) | Yalnızca fatura fotoğrafı |
| **Gelen < onaylanan** | Fatura **+ eksik/hasar fotoğrafı** (ikisi de zorunlu) |
| Hiç gelmedi (0) | Fatura + eksik/hasar fotoğrafı — "hiç gelmedi" de bir iddiadır |

Bu şart ekranda **ve** veritabanında ayrı ayrı vardır. Ekran kolaylıktır; asıl kilit sunucudadır:
fotoğraf yüklenmeden teslim kaydı yazılamaz, yazılmaya çalışılırsa veritabanı reddeder.

## Ekranlar

| Ekran | Ne gösterir | Tek ana eylem |
|---|---|---|
| Ana Ekran | Sipariş varsa ikincil buton: "📦 Teslim Al (2)". Yoksa görünmez | QR Okut (dev buton olarak kalır) |
| Bekleyen siparişler | Her sipariş bir kart: ürün · onaylanan miktar · (istenenle farklıysa ikisi birden). En eski üstte | karta dokun |
| Teslim Al | Başlıkta soru ("Kaç Kg geldi?"), altında sayaç (onaylanan miktardan başlar; kesirli miktar sayıya dokunup yazılır), fatura fotoğrafı, gerekirse eksik/hasar fotoğrafı, isteğe bağlı not | **✓ Teslim Aldım** |

## Offline — eksi kattaki depo

Depo eksi ikinci kattadır, telefon çekmez. Akışın tamamı internetsiz çalışır:

1. Bekleyen sipariş listesi **telefona iner** (60 saniyede bir ve internet gelince tazelenir).
2. Miktar girilir, fotoğraflar çekilir, "Teslim Aldım" denir → hepsi **önce telefona** yazılır, ekran anında "✓" der.
3. Sipariş listeden hemen düşer: aynı sipariş ikinci kez teslim alınamaz.
4. İnternet gelince postacı sırayla gönderir: **önce fatura fotoğrafı, sonra hasar fotoğrafı, en son kayıt.**
   Sıra zorunludur — sunucu, fotoğrafı yüklenmemiş bir teslimi kabul etmez.
5. Fotoğraflardan biri yüklenemezse kayıt hiç gönderilmez; yüklenen fotoğraf ikinci kez yüklenmez.
6. Sunucudan inen liste, telefonda gönderilmeyi bekleyen teslimi geri getirmez.

## Kararlar

- **Sayaç onaylanan miktardan başlar.** En sık doğru cevap "onaylandığı kadar geldi"dir; görevli çoğu zaman hiçbir şeye dokunmadan fotoğrafı çekip onaylar.
- **Fotoğraf ikincil butonla çekilir, "Teslim Aldım" dev butondur.** Ekranın tek ana eylemi teslim almaktır.
- **Buton, şartlar tamamlanmadan açılmaz** ve altında sebebi yazar ("Önce fatura fotoğrafını çekin").
- **Not isteğe bağlıdır.** Asıl kanıt fotoğraftır; yazı yazmak zorunlu tutulmaz (eldiven, karanlık depo).
- **Silme ve düzeltme yok (bu aşamada).** Teslim bir imzadır, değiştirilemez. Yanlış girilen miktar için veritabanında **düzeltme kaydı** yolu vardır (eski kayıt durur, yenisi onu işaret eder); ekranı henüz yoktur — Genel Müdür isterse eklenir.
- **Miktarlar kesirli olabilir (Aşama 17.1, Genel Müdür kararı).** "7,5 Kg", "1,2 Litre" yazılabilir. Kararı birim verir: Kg/Litre bölünür (− + yarımşar gider), adet/Koli bölünmez. Sayının üstüne dokunup doğrudan yazmak da mümkündür — 1,2 Litre'ye yarımşar adımlarla ulaşılamaz. Ayrıntı: `docs/decisions/004-kesirli-miktar.md`.
- **Uyuşmazlık müdüre kırmızı alarm olarak düşer (Aşama 17.1, Genel Müdür kararı).** Teslim onaylandığı gibi gelmediyse müdürün panelinde kırmızı kutu belirir ve çan çalar: "1 teslimat onaylandığı gibi gelmedi". Kutuya dokununca üç sayı (istenen · onaylanan · gelen), teslim alan kişi, saat ve kanıt fotoğrafı yan yana görünür. Ayrıntı: `docs/ux/003-mudur-paneli-akisi.md`.
- **Küçük otel sınırı KALICI olarak korundu (Genel Müdür kararı, 2026-09-16).** Tek kişilik bir depoda bile talebi açan kişi teslim alamaz; o sipariş bekler. Genel Müdür esnetme talebini açıkça reddetti: Maker-Checker ilk sürümde katı kalır. Bu kural gevşetilmez.
