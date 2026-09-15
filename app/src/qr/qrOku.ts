// QR okuma (001 · "QR nasıl çalışır?")
//   1. Telefon tarayıcısının kendi okuyucusu varsa (BarcodeDetector) o kullanılır.
//   2. Yoksa (iPhone Safari gibi) küçük yedek kütüphane jsQR devreye girer — yalnızca o zaman indirilir.
//   İkisi de telefonda çalışır; internet gerekmez.

const KOD_BICIMI = /^[0-9a-f]{32}$/;

// QR'ın içindeki bağlantıdan oda kodunu ayıklar.
//   https://app.smartotel.com/oda/<kod>  →  <kod>
//   <kod>                                →  <kod>   (kodun kendisi de kabul)
//   başka her şey                        →  null    (yabancı QR)
export function baglantidanOdaKodu(metin: string): string | null {
  const temiz = metin.trim();
  if (KOD_BICIMI.test(temiz)) return temiz;
  const eslesme = temiz.match(/\/oda\/([0-9a-f]{32})(?:[/?#]|$)/);
  return eslesme?.[1] ?? null;
}

// Bir video karesine bakıp QR metnini döndürür; yoksa null.
export type KodCozucu = (video: HTMLVideoElement) => Promise<string | null>;

export async function kodCozucuHazirla(): Promise<KodCozucu> {
  if ('BarcodeDetector' in globalThis) {
    const okuyucu = new BarcodeDetector({ formats: ['qr_code'] });
    return async (video) => {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
      const bulunanlar = await okuyucu.detect(video);
      return bulunanlar[0]?.rawValue ?? null;
    };
  }

  // Yedek: kareyi tuvale çiz, jsQR ile çöz
  const { default: jsQR } = await import('jsqr');
  const tuval = document.createElement('canvas');
  const cizim = tuval.getContext('2d', { willReadFrequently: true });
  if (!cizim) return async () => null;

  return async (video) => {
    if (!video.videoWidth || !video.videoHeight) return null;
    tuval.width = video.videoWidth;
    tuval.height = video.videoHeight;
    cizim.drawImage(video, 0, 0);
    const kare = cizim.getImageData(0, 0, tuval.width, tuval.height);
    const sonuc = jsQR(kare.data, kare.width, kare.height, { inversionAttempts: 'dontInvert' });
    return sonuc?.data ?? null;
  };
}
