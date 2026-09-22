# 018 — Erişilebilirlik: Sekmeler, Kontrast, Yazı Boyutu, Dokunma Alanı (denetim · Madde 10)

> **Karar veren:** Genel Müdür · **Yazan:** Orkestratör · **Tarih:** 2026-09-22
> **Durum:** Uygulandı ve ölçülerek doğrulandı. Hedef: WCAG 2.2 AA.
> Kaynak: `docs/denetim-brifi-2026-09-21.md` · Madde 10
> Kod: `vitrin/stil.css`, `vitrin/etkilesim.js` (· 2), `vitrin/ic-operasyon.html` (sekmeler)

---

## Korunan iyi durum

Denetim şunları olumlu saydı ve **hiçbiri bozulmadı**: "içeriğe atla" bağlantısı, `<main>` alanı,
`lang="tr"`, `prefers-reduced-motion` desteği, odak (focus) biçimleri, formdaki her alanın etiketli
olması.

---

## 10a. Sekmeler gerçek sekme oldu

`/ic-operasyon` sayfasındaki "Ekranlar" bölümünde dört düğme vardı ama bunlar ekran okuyucuya
sekme olarak görünmüyordu: `role="tab"` yoktu, `aria-selected` yoktu, klavye yönetimi yoktu.
Sayfadaki `[role=tab]` sayısı sıfırdı.

Artık WAI-ARIA sekme deseni uygulanıyor:

| Ne | Nasıl |
|---|---|
| Liste | `role="tablist"` + `aria-label="Uygulama ekranları"` |
| Sekme | `role="tab"`, `id`, `aria-controls`, `aria-selected` |
| Panel | `role="tabpanel"`, `aria-labelledby`, `tabindex="0"` |
| Klavye | Sol/sağ ve yukarı/aşağı oklarıyla geçiş, `Home`/`End` ilk ve son sekmeye; sarmalı |
| Odak sırası | Seçili sekme `tabindex="0"`, diğerleri `-1` — Tab tuşu listede **bir kez** durur |

`aria-pressed` kaldırıldı: o öznitelik "basılı düğme" içindir, sekme için yanlış sinyaldi.

## 10b. Kontrast

İki renk eşiğin altındaydı. Değerler hesaplanarak seçildi; her ikisi de sitenin dört zemininde
(krem, beyaz, gömülü krem, adaçayı) eşiği geçiyor:

| Değişken | Eski | Yeni | Krem | Beyaz | Gömülü | Adaçayı |
|---|---|---|---|---|---|---|
| `--gri-soluk` | `#757370` (4,45) | **`#6B6966`** | 5,16 | 5,47 | 4,81 | 4,58 |
| `--bronz` | `#8A6D3B` (4,57 ama adaçayıda 4,06) | **`#816335`** | 5,25 | 5,57 | 4,89 | 4,66 |

Bronz seçilirken **adaçayı zemin belirleyici oldu**: iletişim bloğunun üst başlığı orada duruyor ve
krem zemine göre seçilen bir ton orada eşiğin altında kalıyordu. Diğer renkler zaten geçiyordu
(antrasit 16,1 · gri 6,1 · durum renkleri 4,9–6,3 · şampanya düğme üstünde antrasit 7,4).

## 10c. Yazı boyutu

Sayfada 10,5–13,6 piksel arası yazılar vardı. **38 yerde** taban 13 piksele (`0.8125rem`)
yükseltildi. Gövde metni zaten 16 pikseldi ve değişmedi.

### Bir istisna var ve bilinçlidir: telefon maketinin içi
Maketin içindeki yazılar sayfanın metni değil, **küçültülmüş bir ürün ekranının resmidir** — bir
ekran görüntüsünün içindeki yazı gibi. 320 pikselde 13 punto zorlandığında maket sayfayı yatay
olarak taşırıyordu. Bu yüzden dar ekranda maket içi etiketler 12 pikselde kalır (`.rozet`,
`.mini-rozet`, `.mini-etiket`, `.olay-kim`, `.mini-oda`) ve rozet metni artık satır kırabilir.
**Sayfanın kendi metinleri** — başlık, paragraf, etiket, dipnot, düğme — her genişlikte 13 piksel
ve üstüdür.

## 10d. Dokunma alanları

Ölçümde ikincil çağrılar 29, alt bölüm bağlantıları 26, "içeriğe atla" 26, logo 22 piksel çıkmıştı.
Hedef 44 piksel. **Yazı boyutu büyütülmeden**, yalnızca dikey boşlukla çözüldü: görünüm aynı kalır,
hedef büyür.

`.baglanti` · alt bölüm ve yasal bağlantılar · e-posta bağlantısı · "içeriğe atla" · **logo** artık
mobilde en az 44 piksel.

### Cümle içindeki bağlantılar muaf
Bir paragrafın ortasındaki bağlantı (örneğin "…ayrıntısı **Fiyatlandırma sayfasında**") 44 piksele
çıkarılmadı. WCAG 2.5.8 bunu açıkça muaf tutar: hedef bir cümlenin içindeyse ve boyutu satır
yüksekliğiyle sınırlıysa kural uygulanmaz. Zorlanması satır aralarını bozar, metni okunmaz hâle
getirirdi.

## Denendi ve doğrulandı

Ölçüm betiği tarayıcıda çalıştırıldı (gerçek hesaplanmış stiller üzerinden):

- **Kontrast:** beş sayfadaki bütün metin taşıyan öğeler tarandı; eşiğin altında **tek öğe yok**.
  Büyük metin için 3:1, normal metin için 4,5:1 eşiği ayrı ayrı uygulandı.
- **Dokunma alanı:** yedi sayfada 390 piksel genişlikte bütün bağlantı ve düğmeler ölçüldü;
  cümle içi bağlantılar dışında 44 pikselin altında **tek hedef yok**.
- **Sekmeler:** her sayfada tam bir sekme seçili, sekme ve panel sayıları eşit.
- **Bozulmama:** sekiz sayfa × dokuz genişlikte (320–1400 px) yatay taşma yok, üst çubukta
  çakışma yok. Yazı büyütmesi ilk denemede 320 pikselde iki yeri bozmuştu (üst çubuk düğmesi ve
  hero'daki maket); ikisi de ölçümle yakalandı ve düzeltildi.

## Kalan

Denetimin bu maddedeki kabul ölçütü "axe ile kritik/ciddi ihlal yok" diyor. Buradaki denetim elle
yazılmış bir ölçüm betiğiyle yapıldı; `axe` aracı bu bilgisayarda kurulu değil ve yeni bir
bağımlılık eklenmedi. Yayından sonra tarayıcı eklentisiyle bir kez doğrulanmalıdır
(dağıtım listesi · 6.16).
