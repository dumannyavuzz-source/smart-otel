// Vitrin taraması: iki denetim (karar 024–027).
//
//   1. KAYNAK NOTU SIZINTISI — iç notumuz ziyaretçiye görünür metin olarak çıkmış mı?
//   2. EKSİK DOSYA — sayfada adı geçen her görsel, stil ve betik dosyası gerçekten yerinde mi
//      ve gerçekten o biçimde mi? (Genel Müdür'ün isteği, 2026-09-22.)
//
// NE ARAR? Bir HTML yorumunun açılış satırı (<!--) silinirse, iç notumuz ziyaretçiye DÜZ METİN
// olarak görünür. Bu bir kez canlıda oldu: /ic-operasyon sayfasında "Genel Müdür kararı…" diye
// başlayan bir not ekranda duruyordu. Göz bunu kaçırır; makine kaçırmaz.
//
// NASIL ARAR? Sayfadan yorumlar, betikler ve stiller çıkarılır; geriye ziyaretçinin GÖRDÜĞÜ metin
// kalır. O metinde dosya adı, karar numarası, "Genel Müdür kararı" gibi iç izler aranır.
// Ayrıca yorum işaretleri sayılır: her <!-- için bir --> olmalıdır.
//
// NEDEN İKİNCİ DENETİM? <picture> etiketi tarayıcının desteklediği İLK kaynağı seçer ve o dosya
// sunucuda yoksa bir alttakine DÜŞMEZ: ziyaretçi kırık görsel görür. Yani "kumanda.avif" yanlışlıkla
// silinirse ya da yanlış adla yüklenirse sayfa sessizce bozulur. Dosya adı denetimi bunu yakalar.
// Uzantı ile içerik de karşılaştırılır: WebP dosyasının adını .avif yapmak kırık görsel demektir.
//
// Kullanımı:  node araclar/kaynak-notu-taramasi.js
// Çıkış kodu: temizse 0, sorun varsa 1 (bir gün otomatik denetime bağlanabilsin diye).
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

// Denetlenecek dosya türleri. Uzantısız adresler SAYFADIR (örn. /fiyatlandirma), dosya değildir.
const DOSYA_UZANTILARI = ['.css', '.js', '.png', '.jpg', '.svg', '.webp', '.avif', '.woff2', '.ico', '.xml', '.txt'];

// Her dosyanın ilk baytları ne olmalı? (Uzantı ile içerik uyuşmazsa tarayıcı kırık görsel verir.)
const IMZALAR = {
  '.png':   (b) => b.slice(1, 4).toString('latin1') === 'PNG',
  '.webp':  (b) => b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP',
  '.avif':  (b) => b.slice(4, 8).toString('latin1') === 'ftyp' && /avi[fs]/.test(b.slice(8, 12).toString('latin1')),
  '.woff2': (b) => b.slice(0, 4).toString('latin1') === 'wOF2',
  '.svg':   (b) => b.toString('utf8', 0, 400).includes('<svg'),
};

// Yerel dosya olmayan adresler: dış bağlantı, e-posta, telefon, sayfa içi çapa, gömülü veri.
// /istatistik/ altı Vercel tarafından sağlayıcıya yönlendirilir (vercel.json), diskte dosyası yoktur.
// ayarlar.js dağıtımda üretilir (ayarlar-uret.sh) ve git'e girmez; bu yüzden yokluğu sorun değildir.
function yerelDosyaMi(adres) {
  if (/^(https?:|mailto:|tel:|data:|#)/i.test(adres)) return false;
  if (adres.startsWith('/istatistik/')) return false;
  if (adres.replace('/', '') === 'ayarlar.js') return false;
  return DOSYA_UZANTILARI.some((u) => adres.split('?')[0].endsWith(u));
}

function adresleriTopla(html) {
  const adresler = new Set();
  for (const [, deger] of html.matchAll(/(?:src|href|srcset)="([^"]+)"/g)) {
    for (const parca of deger.split(',')) {
      const adres = parca.trim().split(' ')[0];            // srcset "dosya 2x" olabilir
      if (yerelDosyaMi(adres)) adresler.add(adres.split('?')[0]);
    }
  }
  return [...adresler];
}

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
let denetlenenDosya = 0;

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

  for (const adres of adresleriTopla(html)) {
    const hedef = adres.startsWith('/')
      ? path.join(KLASOR, adres.slice(1))
      : path.join(KLASOR, adres);

    if (!fs.existsSync(hedef)) {
      console.log(`✗ ${dosya}: sayfada adı geçen dosya yok → ${adres}`);
      sorun++;
      continue;
    }

    const uzanti = path.extname(adres).toLowerCase();
    const denetle = IMZALAR[uzanti];
    if (denetle && !denetle(fs.readFileSync(hedef))) {
      console.log(`✗ ${dosya}: ${adres} gerçekten ${uzanti} değil (içerik uzantıya uymuyor)`);
      sorun++;
    }
    denetlenenDosya++;
  }
}

console.log(sorun === 0
  ? `✓ ${dosyalar.length} sayfa tarandı, ${denetlenenDosya} dosya bağlantısı denetlendi — hepsi temiz.`
  : `${sorun} sorun bulundu.`);
process.exit(sorun === 0 ? 0 : 1);
