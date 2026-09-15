// Ana ekran: tek iş, tek buton — "QR Okut". Menü yok.
// Altta yalnızca gerekirse tek satır durum (002 · B.9 — personel görsün).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BuyukButon } from '../parcalar/BuyukButon';
import { kutuDurumu } from '../postaci';
import { KUTU_DEGISTI_OLAYI, YENI_MEKTUP_OLAYI } from '../olaylar';

type Durum = Awaited<ReturnType<typeof kutuDurumu>>;

function useKutuDurumu(): Durum {
  const [durum, setDurum] = useState<Durum>({ bekleyen: 0, gonderilemeyen: 0, baskasinin: 0 });

  useEffect(() => {
    const say = () => void kutuDurumu().then(setDurum);
    say();
    window.addEventListener(YENI_MEKTUP_OLAYI, say);
    window.addEventListener(KUTU_DEGISTI_OLAYI, say);
    return () => {
      window.removeEventListener(YENI_MEKTUP_OLAYI, say);
      window.removeEventListener(KUTU_DEGISTI_OLAYI, say);
    };
  }, []);

  return durum;
}

function durumMetni({ bekleyen, gonderilemeyen, baskasinin }: Durum): string {
  if (gonderilemeyen > 0) return `${gonderilemeyen} kayıt gönderilemedi. Müdürünüze haber verin.`;
  if (bekleyen > 0) return `${bekleyen} bildirim internet gelince gönderilecek`;
  if (baskasinin > 0) return `Başka kullanıcının ${baskasinin} bekleyen kaydı var`;
  return ' ';
}

export function AnaEkran() {
  const git = useNavigate();
  const durum = useKutuDurumu();

  return (
    <main className="sayfa sayfa--orta">
      <h1 className="soluk">Smartotel</h1>
      <div className="esnek" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
        <BuyukButon ikon="📷" tur="ana" dev onClick={() => git('/qr')}>
          QR Okut
        </BuyukButon>
      </div>
      <p className="soluk" aria-live="polite">
        {durumMetni(durum)}
      </p>
    </main>
  );
}
