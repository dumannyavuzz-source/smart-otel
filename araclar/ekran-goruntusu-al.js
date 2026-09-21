// Gerçek uygulamadan ekran görüntüsü alır ve WebP'ye çevirir. Kütüphane yok; tek gereken Edge/Chrome.
//
// NEDEN BÖYLE?
//   1. Vitrindeki bütün "ekranlar" bugün CSS ile çizilmiş temsillerdir. Denetim raporu (Madde 1)
//      ürünün gerçekten var olduğunu gösteren görsel istiyor. Temsili kutu bunu kanıtlamaz.
//   2. Ekranlar giriş ister. Başsız tarayıcı kendi başına giriş yapamaz; bu yüzden araç, SİZİN bir kez
//      giriş yaptığınız tarayıcı profilini ödünç alır (--user-data-dir). Şifre hiçbir yere yazılmaz.
//   3. Telefon genişliği (390 px) doğrudan pencere boyutuyla ölçülemez: Windows pencereyi en az ~500 px
//      yapar, sayfa 500 px'e göre dizilir (vitrin/README.md · Uyarı). O yüzden uygulama 390 px'lik bir
//      iframe içinde açılır, geniş pencere çekilir ve fazlası kırpılır.
//   4. Bilgisayarda WebP çeviricisi yok. Var olan tek kodlayıcı tarayıcının kendisidir: PNG bir canvas'a
//      çizilir, kırpılır ve canvas.toDataURL('image/webp') ile kodlanır. Sonuç base64 olarak okunur.
//
// KULLANIM
//   1. Uygulamayı çalıştırın:        cd app && npm run dev
//   2. Ayrı bir profille tarayıcı açıp GİRİŞ YAPIN (bu profil yalnızca ekran görüntüsü içindir):
//        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --user-data-dir=C:/tmp/od-profil http://localhost:5173
//   3. Aynı profili vererek aracı çalıştırın:
//        node araclar/ekran-goruntusu-al.js C:/tmp/od-profil
//   Çıktı: vitrin/gorseller/ içine 2x WebP dosyaları.
//
// ÇEKİLECEK EKRANLAR aşağıdaki listede durur. <KOD> ve <ID> yerlerini kendi otelinizin değerleriyle
// doldurun (kodları docs/test-listesi.md sonundaki SQL sorgusu döker).

const EKRANLAR = [
  { ad: 'oda-uc-buton',   yol: '/oda/<KOD>',            aciklama: 'Kat görevlisi: temizlik listesi ve üç büyük buton' },
  { ad: 'mudur-kumanda',  yol: '/',                     aciklama: 'Müdür kumandası: kırmızı varsa en üstte' },
  { ad: 'is-emri',        yol: '/is/<ID>',              aciklama: 'İş emri: aldım / çözdüm ve süre' },
  { ad: 'teslim-uyusmazlik', yol: '/panel/uyusmazliklar', aciklama: 'Teslimat uyuşmazlığı: istenen · onaylanan · gelen' },
];

const UYGULAMA = 'http://localhost:5173';
const GENISLIK = 390, YUKSEKLIK = 844;      // telefon ölçüsü (CSS pikseli)
const OLCEK = 2;                            // 2x: retina ekranda keskin dursun
const KALITE = 0.82;                        // WebP kalitesi; 0.82 ekran görüntüsünde gözle farksız

const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const EDGE = process.env.EDGE ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profil = process.argv[2];
if (!profil) { console.error('Kullanım: node araclar/ekran-goruntusu-al.js <giriş-yapılmış-tarayıcı-profili>'); process.exit(1); }

const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'od-ekran-'));
const hedefKlasor = path.join(__dirname, '..', 'vitrin', 'gorseller');
fs.mkdirSync(hedefKlasor, { recursive: true });

function tarayici(args) {
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', ...args], { stdio: ['ignore', 'pipe', 'ignore'] });
}

// 1. Adım: uygulamayı 390 px'lik bir iframe içinde açıp geniş pencereyi çeker.
function cek(ekran, pngYolu) {
  const sarmal = path.join(gecici, ekran.ad + '.html');
  fs.writeFileSync(sarmal, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}iframe{border:0;width:${GENISLIK}px;height:${YUKSEKLIK}px;display:block}</style>
<iframe src="${UYGULAMA}${ekran.yol}"></iframe>`);
  tarayici([
    `--user-data-dir=${profil}`,
    `--force-device-scale-factor=${OLCEK}`,
    `--window-size=${GENISLIK + 170},${YUKSEKLIK + 40}`,   // Windows'un en az ~500 px kuralı için geniş tutulur
    '--virtual-time-budget=6000',
    `--screenshot=${pngYolu}`,
    'file:///' + sarmal.replace(/\\/g, '/'),
  ]);
}

// 2. Adım: PNG'yi tarayıcıya çizdirip kırpar ve WebP olarak kodlar (bilgisayarda başka çevirici yok).
function webpYap(pngYolu, webpYolu) {
  const sayfa = path.join(gecici, 'cevir.html');
  const en = GENISLIK * OLCEK, boy = YUKSEKLIK * OLCEK;
  fs.writeFileSync(sayfa, `<!doctype html><meta charset="utf-8"><pre id="c"></pre><script>
var g = new Image();
g.onload = function () {
  var t = document.createElement('canvas'); t.width = ${en}; t.height = ${boy};
  t.getContext('2d').drawImage(g, 0, 0, ${en}, ${boy}, 0, 0, ${en}, ${boy});   // sol üstten telefon ölçüsünde kırp
  document.getElementById('c').textContent = t.toDataURL('image/webp', ${KALITE});
};
g.src = 'file:///${pngYolu.replace(/\\/g, '/')}';
</script>`);
  const dom = execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    `--user-data-dir=${path.join(gecici, 'cevirici-profil')}`, '--virtual-time-budget=8000', '--dump-dom',
    'file:///' + sayfa.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const veri = /data:image\/webp;base64,([A-Za-z0-9+/=]+)/.exec(dom);
  if (!veri) throw new Error('WebP kodlanamadı; tarayıcı canvas çıktısı okunamadı.');
  fs.writeFileSync(webpYolu, Buffer.from(veri[1], 'base64'));
}

let eksik = 0;
for (const ekran of EKRANLAR) {
  if (ekran.yol.includes('<')) {
    console.log(`atlandı  ${ekran.ad}  → adresteki ${ekran.yol.match(/<[A-Z]+>/)[0]} yerine gerçek değeri yazın`);
    eksik++;
    continue;
  }
  const png = path.join(gecici, ekran.ad + '.png');
  const webp = path.join(hedefKlasor, ekran.ad + '.webp');
  cek(ekran, png);
  webpYap(png, webp);
  const kb = Math.round(fs.statSync(webp).size / 1024);
  console.log(`yazıldı  vitrin/gorseller/${ekran.ad}.webp  ${GENISLIK * OLCEK}×${YUKSEKLIK * OLCEK}  ${kb} KB`);
  if (kb > 250) console.log(`  ⚠ ${kb} KB — denetim sınırı 250 KB. KALITE değerini düşürün.`);
}

fs.rmSync(gecici, { recursive: true, force: true });
if (eksik) console.log(`\n${eksik} ekran atlandı. Kodlar için: docs/test-listesi.md (son bölümdeki SQL).`);
