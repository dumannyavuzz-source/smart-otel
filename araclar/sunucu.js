// Küçük statik sunucu: vitrin klasörünü http://localhost:5180 adresinde açar (taşma ölçümü iframe ister; file:// izin vermez)
const http = require('http'), fs = require('fs'), path = require('path');
const kok = process.argv[2]; const tur = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const dosya = path.join(kok, p);
  fs.readFile(dosya, (hata, veri) => { if (hata) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type': tur[path.extname(dosya)] || 'application/octet-stream'}); res.end(veri); });
}).listen(5180);
