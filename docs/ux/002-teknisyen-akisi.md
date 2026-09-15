# 002 — Teknisyen Akışı (iş emirleri ve SLA)

> **Hazırlayan:** UX + Orkestratör · **Tarih:** 2026-09-15 · **Durum:** Genel Müdür onayı bekliyor
> Kod: `app/src/ekranlar/IslerEkrani.tsx`, `IsEkrani.tsx`, `app/src/isEmirleri.ts`. Dayanak: Blueprint · 3.2.

---

## Akış

```
Ana Ekran ──▶ 🔧 Açık İşler (3) ──▶ Liste (en acil üstte) ──▶ Oda 204 · "Arıza: musluk" ──┬─ sahipsiz ──▶ 🙋 Aldım (dev)
  (QR Okut                                                                                   ├─ bende ────▶ 📷 Fotoğraf Ekle (isteğe bağlı)
   hâlâ tek                                                                                  │              ✅ Çözdüm (dev) ──▶ ✓ ──▶ İşlere Dön
   dev buton)                                                                                └─ başkasında ▶ "Bu iş başkasında." (buton yok)
```

## Ekranlar

| Ekran | Ne gösterir | Tek ana eylem |
|---|---|---|
| Ana Ekran | Dev "QR Okut". Otelde açık iş varsa altında ikincil "🔧 Açık İşler (3)"; yoksa görünmez | QR Okut |
| Açık İşler | Yalnızca açık işler, **en az süresi kalan en üstte**. Her kartta: Oda no · kalan süre · açıklama · Sahipsiz/Bende/Başkasında. Sol şerit trafik lambası | karta dokun |
| İş | Oda no, Acil/Normal, kalan süre, açıklama | sahipsizse **Aldım**; bendeyse **Çözdüm** |
| ✓ Tamam | "Oda 204 çözüldü" | İşlere Dön |

## Trafik lambası (renk tek başına konuşmaz; yanında süre yazar)

| Renk | Ne zaman | Yanındaki yazı |
|---|---|---|
| 🟢 Yeşil | Sürenin yarısından fazlası var | "20 dk kaldı" |
| 🟡 Sarı | Yarısından azı kaldı | "8 dk kaldı" |
| 🔴 Kırmızı | Süre geçti | "25 dk geçti" |

Acil iş 30 dk, normal iş 2 saat (sunucu kuralı). Süre yazısı 30 saniyede bir tazelenir.

## Kararlar

- **Kim teknisyen?** Veritabanında görevli/teknisyen ayrımı yok (ikisi de `staff`). Bu aşamada "Açık İşler" kapısı otelde açık iş varsa **her personele** görünür; yoksa ana ekran yalnızca "QR Okut"tur. Görev ayrımı (kat / teknik / depo) **Müdür Paneli** aşamasında, personel eklerken seçilecek.
- **İsim yok, üç durum var:** Kartta "Ali'de" değil "Başkasında" yazar; personel adı sistemde henüz tutulmuyor (Müdür Paneli).
- **"Aldım" ilk alan kazanır.** Bodrumda iş alan teknisyenin mektubu sunucuya geç ulaşır ve iş bu arada başkasına geçmişse sunucu reddeder; telefon "sunucu haklı" der, mektup düşer, liste bir sonraki tazelemede gerçeği gösterir. Bu bilinen ve kabul edilen sınırdır (002 · B.4).
- **Çözüm fotoğrafı** isteğe bağlı ve ikincil butondur; dev buton "Çözdüm"dür. Fotoğraf, arızadaki gibi telefonda bekler, önce yüklenir, sonra kayıt gider.
- **Çözülen iş anında listeden düşer** (telefonda); sunucu kilidi (yalnızca atanan çözer, çözülünce değişmez) veritabanındadır.
- **Şema eki:** Blueprint 3.2 "Çözdüm (isteğe bağlı fotoğraf)" için `work_orders.resolved_photo_path` sütunu ve kuralı eklendi (göç 7).

## Offline

Liste vardiya paketiyle telefona iner (her 60 sn ve internet gelince tazelenir). Bodrumda: liste telefondan gelir, Aldım/Çözdüm önce telefona yazılır, ekran anında tepki verir; postacı internet gelince sırayla gönderir (Aldım → fotoğraf → Çözdüm). Sunucudan inen eski liste, gönderilmemiş yerel değişiklikleri ezmez.
