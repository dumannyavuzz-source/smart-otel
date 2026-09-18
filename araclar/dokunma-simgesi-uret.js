// dokunma-simgesi.png: 180×180, grafit zemin üstünde şampanya kare (simge.svg ile aynı oran: 24/64).
// Kütüphane yok; PNG elle yazılır (zlib Node'un içinde).
const zlib = require('zlib'), fs = require('fs');
const N = 180, zemin = [0x12, 0x14, 0x13], kare = [0xc8, 0xb4, 0x8a];
const bas = Math.round(N * 20 / 64), son = Math.round(N * 44 / 64);
const ham = Buffer.alloc((N * 3 + 1) * N);
for (let y = 0; y < N; y++) {
  ham[y * (N * 3 + 1)] = 0;                                   // filtre: yok
  for (let x = 0; x < N; x++) {
    const r = (x >= bas && x < son && y >= bas && y < son) ? kare : zemin;
    ham.set(r, y * (N * 3 + 1) + 1 + x * 3);
  }
}
const crcTablo = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTablo[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const parca = (tip, veri) => { const u = Buffer.alloc(4); u.writeUInt32BE(veri.length); const tv = Buffer.concat([Buffer.from(tip), veri]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(tv)); return Buffer.concat([u, tv, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), parca('IHDR', ihdr), parca('IDAT', zlib.deflateSync(ham)), parca('IEND', Buffer.alloc(0))]);
fs.writeFileSync(process.argv[2], png);
console.log('yazıldı:', process.argv[2], png.length, 'bayt');
