// Ana ekran: tek iş, tek buton — "QR Okut". Menü yok.
// Altta yalnızca gerekirse: "Bekleyen 3 kayıt" (002 · B.9 — personel görsün).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BuyukButon } from '../parcalar/BuyukButon';
import { telefonDeposu } from '../telefonDeposu';
import { KUTU_DEGISTI_OLAYI, YENI_MEKTUP_OLAYI } from '../olaylar';

function useBekleyenSayisi(): number {
  const [sayi, setSayi] = useState(0);

  useEffect(() => {
    const say = () => void telefonDeposu.gidenKutusu.count().then(setSayi);
    say();
    window.addEventListener(YENI_MEKTUP_OLAYI, say);
    window.addEventListener(KUTU_DEGISTI_OLAYI, say);
    return () => {
      window.removeEventListener(YENI_MEKTUP_OLAYI, say);
      window.removeEventListener(KUTU_DEGISTI_OLAYI, say);
    };
  }, []);

  return sayi;
}

export function AnaEkran() {
  const git = useNavigate();
  const bekleyen = useBekleyenSayisi();

  return (
    <main className="sayfa sayfa--orta">
      <h1 className="soluk">Smartotel</h1>
      <div className="esnek" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
        <BuyukButon ikon="📷" tur="ana" dev onClick={() => git('/qr')}>
          QR Okut
        </BuyukButon>
      </div>
      <p className="soluk" aria-live="polite">
        {bekleyen > 0 ? `${bekleyen} bildirim internet gelince gönderilecek` : ' '}
      </p>
    </main>
  );
}
