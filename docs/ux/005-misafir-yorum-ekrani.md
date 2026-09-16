# 005 — Misafir Yorum Ekranı (odadaki QR'ın açtığı tek sayfa)

> **Hazırlayan:** UX + Orkestratör · **Tarih:** 2026-09-16 · **Durum:** Genel Müdür onayı bekliyor
> Kod: `app/src/ekranlar/MisafirYorumEkrani.tsx`, `app/src/misafir/yorumGonder.ts`. Dayanak: Blueprint · 3.4.

---

## Akış

```
Odadaki QR ──▶ /yorum/<kod> ──▶  Odanızdan memnun kaldınız mı?
 (misafirin                       ★ ★ ★ ★ ★     ← dokunulan yıldıza kadar dolar
  kendi telefonu)                 "İdare eder"  ← yıldızın yanında ne demek olduğu yazar
                                  [ Eklemek istediğiniz bir şey var mı? ]  (isteğe bağlı)
                                  📨 Gönder
                                        │
                                        ▼
                                  Teşekkür ederiz
                                  puan 1–3 → "Hemen ilgileniyoruz."
                                  puan 4–5 → "İyi tatiller dileriz."
```

## Kararlar

- **Giriş yok, kurulum yok, ad-soyad yok.** Misafir hiçbir şey indirmez, hiçbir yere kaydolmaz. QR'ı okutur, dokunur, gider.
- **Sayfa uygulamanın dışındadır.** `/yorum/<kod>` adresi açıldığında oturum sorulmaz, postacı çalışmaz, panel nöbetçisi kurulmaz (`main.tsx`). Misafir, personel uygulamasının hiçbir parçasını görmez.
- **Misafir anahtar taşımaz.** Sayfa doğrudan kapıya (Edge Function) tek bir POST yapar; kapı anahtarsızdır. Koruma kapının içindedir: biçim denetimi, dakikada 3 yorum sınırı, tek veritabanı fonksiyonu.
- **Tek soru, tek cevap.** Ekranda iki şey vardır: kaç yıldız ve (isterse) tek yazı kutusu. Menü, alt bilgi, başka sayfa, "devam" adımı yoktur.
- **Yıldızın yanında kelime yazar.** "3" tek başına bir şey söylemez; "İdare eder" söyler. Renk de tek başına konuşmaz.
- **Yazı yazmak zorunlu değil.** Çoğu misafir yalnızca yıldıza dokunur. Yorum boşsa kayda `null` gider.
- **Gönder butonu yıldız seçilene kadar kapalıdır** ve altında sebebi yazar ("Önce yıldızlara dokunun").
- **Tek renk istisnası:** projenin kuralı iki renktir; yıldız sarı olmazsa yıldız gibi görünmez. Sarı yalnızca bu ekranda ve yalnızca yıldızda kullanılır.
- **Düşük puanda misafire "Hemen ilgileniyoruz" denir.** Sesinin duyulduğunu bilmelidir. Müdüre aynı anda kırmızı alarm düşer.
- **Dışarıdaki yorum sitelerine yönlendirme YOKTUR.** Memnun misafiri Google'a yönlendirip memnun olmayanı yönlendirmemek ("yorum eleme") kurallara aykırıdır ve otele ceza getirir. Bu ekran şikâyeti **içeride hızlı çözmek** içindir, yorumu engellemek için değil (Blueprint · 3.4 notu).
- **Bağlantı bozuksa sunucuya hiç gidilmez.** "Bu bağlantı geçersiz" denir; kodun var olup olmadığı söylenmez.
- **Bağlantı koparsa misafir suçlanmaz:** "Gönderilemedi. İnternete bağlanıp tekrar deneyin." Yorum telefonda saklanmaz — misafirin telefonu bizim depomuz değildir.

## Yapmadıklarımız

| Düşünülen | Neden şimdi değil |
|---|---|
| Oda numarasını ekranda göstermek | QR zaten odadan geliyor; misafire doğrulatmak fazladan bir soru olurdu. |
| Kategori seçtirmek (temizlik/gürültü/personel) | İkinci bir soru. Misafir yazmak isterse yazar; istemezse yıldız yeter. |
| Teşekkür sayfasında "yorumunuzu paylaşın" bağlantısı | Yorum eleme sınırına girer (yukarıda). |
| Misafire geçmiş yorumlarını göstermek | Misafir giriş yapmaz; kimliği yoktur. |
