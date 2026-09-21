// Küçük statik sunucu: vitrin klasörünü http://localhost:5180 adresinde açar (taşma ölçümü iframe ister; file:// izin vermez)
//
// Adresler vitrinde uzantısızdır (/dijital-vitrin). Vercel bunu "cleanUrls" ayarıyla yapar;
// burada da aynı şey yapılır ki bilgisayardaki önizleme ile yayındaki site aynı davransın:
// uzantısız bir adres bulunamazsa sonuna ".html" eklenip bir kez daha bakılır.
const http = require('http'), fs = require('fs'), path = require('path');
const kok = process.argv[2]; const tur = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};

function gonder(res, dosya) {
  fs.readFile(dosya, (hata, veri) => {
    if (hata) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type': tur[path.extname(dosya)] || 'application/octet-stream'}); res.end(veri);
  });
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const dosya = path.join(kok, p);
  // Uzantısız adres (/fiyatlandirma) → önce dosyanın kendisine, yoksa .html eklenmişine bakılır.
  if (!path.extname(dosya)) {
    fs.access(dosya + '.html', fs.constants.R_OK, (yok) => gonder(res, yok ? dosya : dosya + '.html'));
    return;
  }
  gonder(res, dosya);
}).listen(5180);
