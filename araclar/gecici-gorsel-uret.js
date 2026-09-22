// GEÇİCİ YER TUTUCU GÖRSELLER — gerçek ekran görüntüleri gelene kadar (denetim · Madde 1)
//
// NE İŞE YARAR?
//   vitrin/gorseller/uygulama/ klasörüne sekiz dosya yazar: dört ekranın avif ve webp hâli.
//   Hepsi 780 × 1688 (telefon ölçüsü 2x), grafit zemin üstünde şampanya blok. İçerikleri boştur;
//   tek işleri sayfadaki <picture> etiketlerinin KIRIK GÖRSEL vermeden çalışabilmesidir.
//
// Kullanımı:  node araclar/gecici-gorsel-uret.js
//
// GERÇEK GÖRSELLERİN ÜZERİNE YAZMAZ. Klasördeki bir dosya bu yer tutucudan farklıysa
// ona dokunulmaz ve ekrana "gerçek görsel duruyor" diye yazılır. Yani Genel Müdür gerçek
// dosyaları koyduktan sonra bu betik yanlışlıkla çalıştırılsa bile bir şey kaybolmaz.
//
// NEDEN BAYTLAR DOSYANIN İÇİNE GÖMÜLÜ?
//   Bu bilgisayarda AVIF kodlayıcı yok (ffmpeg, ImageMagick, avifenc kurulu değil) ve tarayıcı
//   da AVIF YAZAMIYOR — canvas.toDataURL('image/avif') sessizce PNG döndürüyor (denendi).
//   WebP'yi tarayıcı üretebilirdi ama iki dosyanın aynı görüntüyü göstermesi gerekir; ikisi de
//   bir kez üretilip buraya gömüldü. Böylece betik kurulumsuz, internetsiz ve her seferinde
//   AYNI sonucu üretir. İkisi de tarayıcıda 780 × 1688 olarak çözüldüğü doğrulandı.
const fs = require('fs');
const path = require('path');

const KLASOR = path.join(__dirname, '..', 'vitrin', 'gorseller', 'uygulama');

// Dört ekran: adları vitrin/gorseller/uygulama/README.md ile birebir aynı olmalıdır.
const EKRANLAR = ['kat-gorevlisi', 'kumanda', 'is-emri', 'teslim'];

const YER_TUTUCU = {
  avif: Buffer.from(
  'AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAAXBtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAA' +
  'ADRpbG9jAAAAAERAAAIAAQAAAAABlAABAAAAAAAAAZcAAgAAAAADKwABAAAAAAAAAFsAAAA4aWluZgAAAAAAAgAAABVpbmZlAgAA' +
  'AAABAABhdjAxAAAAABVpbmZlAgAAAAACAABhdjAxAAAAAA5waXRtAAAAAAABAAAAr2lwcnAAAACKaXBjbwAAAAxhdjFDgSgCAAAA' +
  'ABRpc3BlAAAAAAAAAwwAAAaYAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQgcAAAAAA5waXhpAAAAAAEIAAAAOGF1eEMAAAAAdXJu' +
  'Om1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAdaXBtYQAAAAAAAAACAAEDgQIDAAIEhAIFhgAAABpp' +
  'cmVmAAAAAAAAAA5hdXhsAAIAAQABAAAB+m1kYXQSAAoKOiawvS7SAhoNIDKGAxtSsJi5OEECEFBIsAAVl78skh5VMf5J+nf4216i' +
  'M1kO2M8MLxaXvyySHlUx/kn6d/KnEv02z0DEOtVIqDuXvyySHlUx/kn6d/jbXqJjMQnPSaCDYKPezNfpDWtCcHfy2y2U24YmKpqN' +
  'GYKEZXfw7JAYW9eZ8K9ezYBKl78skh5VMf5J+nfypxNSTqAKh/OtJQESNOETb2vfk5FwSjw/gnVioD0BaR2Ae+MNgAmcOjaqoFaV' +
  'WAlb8IZwr93IKFVE18pKhj2kQJe/LJIeVTH+VPo5i6njnDrQkgDNkXYaOSxKp3xSe8tN9ktIOShHslPsnBwjVK3siR8wfdHWnE0z' +
  '8geebvJdAreGTpe/LJCtWJYXFOIEld+ew8boawjOPUp3TNGGadfoVRXjaY1xBKTGCZ84nKkmHR2MNMqB2TV+/eWqsA0fGcKyu2vO' +
  'dc0K+40RUza5gqZiwIoWl78skh5VMf5J+nf4216iM1kO2M5/ADyXvyySHlUx/kn6d/KnEv02z0DEOrN3eRIACgcaJrC9L8KgMk4b' +
  'AmAAAEAABwVsULP1r+d2BwVsULP1pRFOBwVsULP1r+d2BwVsULP1pRFOBwVsULP1r+d2BwVsULP1pRFOBwVsULP1rwXABWxQs/Wf' +
  'eYA=',
    'base64',
  ),
  webp: Buffer.from(
  'UklGRiILAABXRUJQVlA4IBYLAABQLwGdASoMA5gGPp1OpU2lpKOiIN/YALATiWlu4XdhGsBgewCfWn8LywD3U30bUOcZQD3U30bU' +
  'OcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUO' +
  'cZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOc' +
  'ZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZ' +
  'QD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQ' +
  'D3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD' +
  '3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3' +
  'U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U' +
  '30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U3' +
  '0bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30' +
  'bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30bUOcZQD3U30b' +
  'UNsaFUIav21yRq/bXJGr9tckav21yRq/bXJGr9tckav21yRq/bXJGr9tckav21yRqxUfw+6m+jahzgGWwK21BbyKEu+i5x9VCXfR' +
  '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' +
  'RQHyKAAAAAA=',
    'base64',
  ),
};

let yazilan = 0;
let korunan = 0;

for (const ekran of EKRANLAR) {
  for (const uzanti of ['avif', 'webp']) {
    const yol = path.join(KLASOR, `${ekran}.${uzanti}`);
    const yeni = YER_TUTUCU[uzanti];

    if (fs.existsSync(yol)) {
      const mevcut = fs.readFileSync(yol);
      if (!mevcut.equals(yeni)) {
        console.log(`• ${ekran}.${uzanti} — GERÇEK GÖRSEL duruyor (${mevcut.length} bayt), dokunulmadı.`);
        korunan++;
        continue;
      }
      continue;                                  // zaten yer tutucu: sessizce geç
    }

    fs.writeFileSync(yol, yeni);
    console.log(`✓ ${ekran}.${uzanti} yazıldı (${yeni.length} bayt, yer tutucu)`);
    yazilan++;
  }
}

console.log(
  yazilan === 0 && korunan === 0
    ? 'Sekiz dosya da zaten yerinde (yer tutucu).'
    : `${yazilan} yer tutucu yazıldı, ${korunan} gerçek görsel korundu.`,
);
