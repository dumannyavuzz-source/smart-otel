// Fotoğrafı telefonda küçültür (002 · A.9, B.6): en uzun kenar 1280 px, JPEG.
// Telefon kamerası 3–8 MB üretir; depo sınırı 2 MB. Küçültülmüş hâli ~200–600 KB olur.
const EN_UZUN_KENAR = 1280;
const KALITE = 0.8;
const DEPO_SINIRI = 2 * 1024 * 1024;

// Hedef boyut: en uzun kenar 1280'i geçmez, oran korunur, küçük resim büyütülmez.
export function hedefBoyut(genislik: number, yukseklik: number): { genislik: number; yukseklik: number } {
  const oran = Math.min(1, EN_UZUN_KENAR / Math.max(genislik, yukseklik, 1));
  return { genislik: Math.max(1, Math.round(genislik * oran)), yukseklik: Math.max(1, Math.round(yukseklik * oran)) };
}

export async function fotografiKucult(dosya: Blob): Promise<Blob> {
  const resim = await resmiAc(dosya);
  const boyut = hedefBoyut(resim.width, resim.height);
  const tuval = document.createElement('canvas');
  tuval.width = boyut.genislik;
  tuval.height = boyut.yukseklik;
  const cizim = tuval.getContext('2d');
  if (!cizim) throw new Error('Tuval açılamadı');
  cizim.drawImage(resim, 0, 0, tuval.width, tuval.height);
  if ('close' in resim) resim.close();

  let sonuc = await tuvaliJpegYap(tuval, KALITE);
  if (sonuc.size > DEPO_SINIRI) sonuc = await tuvaliJpegYap(tuval, 0.6);   // olağanüstü büyükse bir kez daha sık
  return sonuc;
}

// Kamera dosyasını çizilebilir resme çevirir; yön bilgisini (EXIF) uygular.
async function resmiAc(dosya: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in globalThis) {
    try {
      return await createImageBitmap(dosya, { imageOrientation: 'from-image' });
    } catch {
      // eski tarayıcı: seçenekleri anlamıyor; aşağıdaki yolla devam
    }
  }
  const adres = URL.createObjectURL(dosya);
  try {
    return await new Promise<HTMLImageElement>((tamam, hata) => {
      const img = new Image();
      img.onload = () => tamam(img);
      img.onerror = () => hata(new Error('Resim okunamadı'));
      img.src = adres;
    });
  } finally {
    URL.revokeObjectURL(adres);
  }
}

function tuvaliJpegYap(tuval: HTMLCanvasElement, kalite: number): Promise<Blob> {
  return new Promise((tamam, hata) => {
    tuval.toBlob((blob) => (blob ? tamam(blob) : hata(new Error('Fotoğraf küçültülemedi'))), 'image/jpeg', kalite);
  });
}
