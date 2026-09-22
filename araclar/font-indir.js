// Fontları kendi alan adımıza alır (denetim · Madde 12). Kütüphane yok.
//
// Yöntem: Google Fonts'un CSS'i modern bir tarayıcı kimliğiyle istenir; gelen @font-face
// bloklarından YALNIZCA latin ve latin-ext alt kümeleri alınır (Türkçe harfler bu ikisindedir),
// woff2 dosyaları indirilir ve yerel yollarla yeni bir @font-face bloğu yazılır.
// Böylece alt küme işi ayrı bir araca gerek kalmadan, Google'ın kendi alt kümeleriyle yapılır.
const fs = require('fs'), path = require('path'), https = require('https');
const hedef = 'C:/Users/Yvz/Desktop/smart-otel/vitrin/yazilar';
fs.mkdirSync(hedef, { recursive: true });

const TARAYICI = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function al(adres, ikili) {
  return new Promise((coz, red) => {
    https.get(adres, { headers: { 'User-Agent': TARAYICI } }, (c) => {
      if (c.statusCode >= 300 && c.statusCode < 400 && c.headers.location) return al(c.headers.location, ikili).then(coz, red);
      if (c.statusCode !== 200) return red(new Error(adres + ' -> HTTP ' + c.statusCode));
      const parcalar = [];
      c.on('data', (p) => parcalar.push(p));
      c.on('end', () => coz(ikili ? Buffer.concat(parcalar) : Buffer.concat(parcalar).toString('utf8')));
    }).on('error', red);
  });
}

// Kullanılan ağırlıklar ölçüldü: yalnızca 400 ve 500. 600 hiçbir yerde geçmiyor, istenmiyor.
const ISTEKLER = [
  { ad: 'cormorant', adres: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap' },
  { ad: 'inter', adres: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap' },
];

(async () => {
  let ciktiCss = '';
  let toplam = 0, dosyaSayisi = 0;

  for (const istek of ISTEKLER) {
    const css = await al(istek.adres, false);
    const bloklar = css.split('@font-face').slice(1);
    for (const blok of bloklar) {
      const altKume = (/\/\*\s*([a-z-]+)\s*\*\//.exec(css.slice(0, css.indexOf(blok))) || [])[1];
      // Alt küme adı bloktan ÖNCEKİ yorumda yazar; güvenli yol: blok içindeki unicode-range ile eşleştir.
      const aile = /font-family:\s*'([^']+)'/.exec(blok)[1];
      const agirlik = /font-weight:\s*(\d+)/.exec(blok)[1];
      const stil = /font-style:\s*([a-z]+)/.exec(blok)[1];
      const url = /url\((https:[^)]+\.woff2)\)/.exec(blok);
      const aralik = /unicode-range:\s*([^;]+);/.exec(blok);
      if (!url || !aralik) continue;

      // Türkçe için gereken iki alt küme: latin (U+0000-00FF…) ve latin-ext (U+0100-…)
      const lat = aralik[1].indexOf('U+0100') !== -1 ? 'latin-ext' : (aralik[1].indexOf('U+0000') !== -1 ? 'latin' : null);
      if (!lat) continue;

      const dosyaAdi = `${istek.ad}-${agirlik}${stil === 'italic' ? 'i' : ''}-${lat}.woff2`;
      const veri = await al(url[1], true);
      fs.writeFileSync(path.join(hedef, dosyaAdi), veri);
      toplam += veri.length; dosyaSayisi++;
      console.log(`indirildi  ${dosyaAdi}  ${Math.round(veri.length / 1024)} KB`);

      ciktiCss += `@font-face {\n  font-family: '${aile}';\n  font-style: ${stil};\n  font-weight: ${agirlik};\n  font-display: swap;\n  src: url('yazilar/${dosyaAdi}') format('woff2');\n  unicode-range: ${aralik[1]};\n}\n\n`;
    }
  }

  fs.writeFileSync('C:/Users/Yvz/Desktop/smart-otel/vitrin/yazilar/_font-face.css', ciktiCss);
  console.log(`\n${dosyaSayisi} dosya · toplam ${Math.round(toplam / 1024)} KB`);
})();
