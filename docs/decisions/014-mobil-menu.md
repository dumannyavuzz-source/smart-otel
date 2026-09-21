# 014 — Mobil Menü: Kayan Şeritten Açılır Kutuya (denetim · Madde 6)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-21
> **Durum:** Uygulandı ve yerelde doğrulandı.
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 6
> Kod: on bir sayfanın üst çubuğu, `vitrin/stil.css`, `vitrin/etkilesim.js` (· 6)

---

## Durum

Dar ekranda menü, yana kayan bir şeritti. Denetim iki kusur buldu:

1. Sözcükler görünür alanın dışında **kelime ortasından kesiliyordu** ("Teknolojik A…").
2. **Fiyatlandırma, İletişim ve Giriş Yap ilk bakışta hiç görünmüyordu.** Mobil ziyaretçi fiyat
   sayfasını menüden bulamıyordu.

Olumlu taraf korunmalıydı: sayfanın kendisinde yatay taşma yoktu.

## Karar

Üst çubuk dar ekranda **tek satır** oldu (marka · menü düğmesi · eylem) ve beş sayfa, tek
dokunuşla açılan bir listeye taşındı. Üst çubuğun dar ekrandaki yüksekliği ~98 px'ten ~60 px'e indi.

### Neden `<details>`, neden elle yazılmış bir "hamburger" değil?

Açılır menü, elle yazıldığında kolayca erişilemez hâle gelir: `aria-expanded` unutulur, klavye
desteği eksik kalır, betik yüklenmezse menü hiç açılmaz. `<details>`/`<summary>` bunların hepsini
tarayıcının kendisinden getirir: açık/kapalı durumu ekran okuyucuya kendiliğinden bildirilir,
boşluk ve Enter tuşları çalışır, **betik olmasa bile açılır.**

### Betik yoksa ne olur? (en önemli tasarım kararı)

HTML'de `<details class="menu-kapsul" open>` yazar — yani **liste açık gelir.** Betik yüklenmezse
menü çubuğun altında normal bir liste olarak durur: uzun görünür ama **hiçbir sayfa erişilmez
kalmaz.** Betik çalıştığında `<html>` etiketine `js` sınıfı eklenir, dar ekranda `open` kaldırılır
ve liste açılır kutuya döner.

Ters kurgu (kapalı başlatıp betikle açmak) betiksiz ziyaretçiyi ana sayfaya hapsederdi.

### Betiğin eklediği dört incelik

| Ne | Neden |
|---|---|
| Dar ekranda kapalı başlatmak, geniş ekranda açık tutmak | Geniş ekranda menü zaten tek satır; açılır kutu olmamalı |
| `Esc` ile kapatmak | Klavye kullanıcısı fareye uzanmak zorunda kalmasın |
| Dışarı dokununca ve bağlantıya basınca kapatmak | Kutu arkada açık kalmasın |
| Odak tuzağı | Kutu açıkken `Tab`, düğme ile son bağlantı arasında döner; odak arkadaki sayfaya kaçmaz |

Ekran genişliği değişince (telefon yan çevrilince) menü kendini yeniden ayarlar.

## Denendi ve doğrulandı

Yedi sayfa × yedi genişlik (320 · 375 · 414 · 768 · 900 · 1024 · 1400 px), iframe içinde ölçüldü:

- **Yatay taşma yok** — `scrollWidth == clientWidth` korundu.
- **Hiçbir menü bağlantısı kesik değil** — görünür alanın dışında kalan bağlantı sayısı sıfır.
- **Geniş ekranda menü açık ve tek satır**; menü düğmesi görünmüyor.
- **Dar ekranda menü düğmesi görünüyor**; açılınca beş sayfa da listede, bulunulan sayfa bronz
  çizgiyle işaretli.
- Sunulan HTML'de `open` özniteliği duruyor: betiksiz ziyaretçi eksiksiz menü görür.

## Bozulmayanlar

- Masaüstü görünümü **hiç değişmedi**: aynı tek satır, aynı alt çizgi.
- Birincil eylem düğmesi ("Demo İste") dar ekranda da görünür kalıyor.
- Aydınlık tema, temiz adresler, CSP, üçüncü parti isteksizlik aynı.
- Eklenen ağırlık: CSS ~1,6 KB, betik ~1,8 KB.

## Denetimin bir tespiti bizde geçerli değildi

Rapor, "header'daki buton metni (`OPERASYON MERKEZİNİ TANIYIN →`) mobilde iki satıra kırılıyor,
kısaltılmalı" diyor. O metin üst çubukta değil **hero'da** duruyor; üst çubuktaki düğme
"Demo İste"dir. Ölçümde hero düğmesi 390 px'te tek satıra sığıyor, 320 px'te de taşma yapmıyor.
Metnin kendisi denetimin **Madde 7**'sinde (CTA adlandırma birliği) zaten ele alınacak; bu adımda
dokunulmadı.
