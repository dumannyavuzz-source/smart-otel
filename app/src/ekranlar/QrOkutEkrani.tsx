// QR Okut: kamera açılır, kod telefonda çözülür (internet gerekmez), oda ekranı açılır.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { baglantidanOdaKodu, kodCozucuHazirla } from '../qr/qrOku';

const KARE_ARASI_MS = 250;

export function QrOkutEkrani() {
  const git = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);

  useEffect(() => {
    let calisiyor = true;
    let akis: MediaStream | undefined;
    let zamanlayici: number | undefined;

    async function basla() {
      try {
        akis = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || !calisiyor) {
          akis.getTracks().forEach((iz) => iz.stop());   // kamera açılırken "Geri" basıldı: ışığı söndür
          return;
        }
        video.srcObject = akis;
        await video.play();

        const coz = await kodCozucuHazirla();

        const bak = async () => {
          if (!calisiyor) return;
          const metin = await coz(video).catch(() => null);
          if (metin) {
            const kod = baglantidanOdaKodu(metin);
            if (kod) {
              calisiyor = false;
              git(`/oda/${kod}`, { replace: true });
              return;
            }
            setUyari('Bu QR bir Smartotel odası değil.');
          }
          zamanlayici = window.setTimeout(bak, KARE_ARASI_MS);
        };
        void bak();
      } catch {
        setHata('Kamera açılamadı. Telefonun kendi kamerasıyla QR’ı okutabilirsiniz.');
      }
    }

    void basla();

    return () => {
      calisiyor = false;
      if (zamanlayici) window.clearTimeout(zamanlayici);
      akis?.getTracks().forEach((iz) => iz.stop());
    };
  }, [git]);

  return (
    <div className="kamera-sayfa">
      <div className="kamera-ust">{hata ?? uyari ?? 'QR’ı çerçeveye getirin'}</div>
      {!hata && <video ref={videoRef} className="kamera" playsInline muted />}
      {hata && <div className="esnek" />}
      <div className="kamera-alt">
        <button type="button" className="buton" onClick={() => git('/', { replace: true })}>
          ← Geri
        </button>
      </div>
    </div>
  );
}
