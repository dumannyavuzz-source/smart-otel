// Kaynak notu sızıntısı taraması (karar 024 · 2026-09-22'de bir kez canlıda yaşandı).
//
// NE ARAR? Bir HTML yorumunun açılış satırı (<!--) silinirse, iç notumuz ziyaretçiye DÜZ METİN
// olarak görünür. Bu bir kez canlıda oldu: /ic-operasyon sayfasında "Genel Müdür kararı…" diye
// başlayan bir not ekranda duruyordu. Göz bunu kaçırır; makine kaçırmaz.
//
// NASIL ARAR? Sayfadan yorumlar, betikler ve stiller çıkarılır; geriye ziyaretçinin GÖRDÜĞÜ metin
// kalır. O metinde dosya adı, karar numarası, "Genel Müdür kararı" gibi iç izler aranır.
// Ayrıca yorum işaretleri sayılır: her <!-- için bir --> olmalıdır.
//
// Kullanımı:  node araclar/kaynak-notu-taramasi.js
// Çıkış kodu: temizse 0, sızıntı varsa 1 (bir gün otomatik denetime bağlanabilsin diye).
const fs = require('fs');
const path = require('path');

const KLASOR = path.join(__dirname, '..', 'vitrin');

// Ziyaretçinin metninde asla görünmemesi gereken izler.
const IZLER = [
  '<!--', '-->',
  'etkilesim.js', 'hareket.js', 'olcum.js', 'ayarlar.js', 'stil.css', 'vercel.json',
  'docs/decisions', 'docs/security', 'Genel Müdür kararı', 'denetim · Madde',
  'yer tutucu', 'TODO',
];

function gorunenMetin(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')                       // yorumlar
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')            // betikler
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')              // stiller
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')                // sayfa başlığı ve meta satırları
    .replace(/<[^>]+>/g, ' ')                               // etiketler
    .replace(/\s+/g, ' ');
}

const dosyalar = fs.readdirSync(KLASOR).filter((d) => d.endsWith('.html')).sort();
let sorun = 0;

for (const dosya of dosyalar) {
  const html = fs.readFileSync(path.join(KLASOR, dosya), 'utf8');

  const acilis = (html.match(/<!--/g) || []).length;
  const kapanis = (html.match(/-->/g) || []).length;
  if (acilis !== kapanis) {
    console.log(`✗ ${dosya}: yorum işaretleri eşit değil (${acilis} adet <!--, ${kapanis} adet -->)`);
    sorun++;
  }

  const metin = gorunenMetin(html);
  const bulunanlar = IZLER.filter((iz) => metin.includes(iz));
  if (bulunanlar.length) {
    console.log(`✗ ${dosya}: görünen metinde kaynak izi var → ${bulunanlar.join(', ')}`);
    sorun++;
  }
}

console.log(sorun === 0
  ? `✓ ${dosyalar.length} sayfa tarandı, hepsi temiz.`
  : `${sorun} sorun bulundu.`);
process.exit(sorun === 0 ? 0 : 1);
