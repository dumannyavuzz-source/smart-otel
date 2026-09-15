# 003 — Arayüz Paketleri: Onaylı Listeye Eklenen 3 Küçük Parça

> **Karar veren:** Architect · **Tarih:** 2026-09-15 · **Durum:** Genel Müdür onayı bekliyor
> Kural (001): "Bu listeye her yeni paket için bir karar kaydı gerekir." Bu o kayıttır.

---

## Durum

Arayüz kodlanırken (Aşama 13) onaylı listedeki paketler kuruldu:
`react`, `react-dom`, `react-router`, `dexie`, `@supabase/supabase-js`, `vite`, `vite-plugin-pwa`, `typescript`, `vitest`.

Üç şey daha gerekti. Hiçbiri "belki lazım olur" değil; üçü de bugün çalışması için şart.

## Karar

| Paket | Ne için | Neden kaçınılmaz |
|---|---|---|
| `jsqr` (uygulamada) | QR yedek okuyucu | 001'de "yedek küçük kütüphane, kod aşamasında seçilir" denmişti. iPhone Safari'de tarayıcının kendi okuyucusu (BarcodeDetector) yok; jsQR olmadan iPhone'da QR okunmaz. Saf JavaScript, bağımlılığı yok, yalnızca gerektiğinde iner (130 KB). |
| `@vitejs/plugin-react` (yalnızca geliştirme) | React ↔ Vite bağı | Vite'ın React için resmi eklentisi. Geliştirirken ekran, kod değişince yenilenmeden güncellenir. Üretim paketine girmez. |
| `fake-indexeddb` (yalnızca test) | Testlerde telefonun çekmecesi | Giden kutusu (offline) mantığı gerçek IndexedDB davranışıyla test edilmeli; Node'da IndexedDB yok. Yalnızca testte kullanılır. |

Ayrıca tip tanımları: `@types/react`, `@types/react-dom` (yalnızca geliştirme; kod değil, sözlük).

## Yapmadıklarımız

| Düşünülen | Neden şimdi değil |
|---|---|
| `playwright`, `eslint`, `prettier` (onaylı listede) | Bugün gerekmiyor. QA aşamasında gerçek tarayıcı testi gerekince Playwright eklenir. |
| `dexie-react-hooks` | "Bekleyen 3 kayıt" sayısı için tek küçük hook yeterli oldu; ek paket gereksiz. |
| Hazır QR tarayıcı bileşeni (`html5-qrcode` vb.) | Kamera açma 20 satır; hazır bileşen kendi arayüzünü ve ayarlarını getirir. Fazla parça. |

## Sonuç

Uygulama paketi (üretim): **6 paket.** Geliştirme/test: **8 paket.** Liste `app/package.json` içindedir; buradan başka paket eklenmesi yeni bir karar kaydı gerektirir.
