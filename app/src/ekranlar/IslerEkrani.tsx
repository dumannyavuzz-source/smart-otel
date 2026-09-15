// Açık İşler: yalnızca açık iş emirleri, en acil (en az süresi kalan) en üstte.
// Trafik lambası: yeşil → sarı → kırmızı. Renk tek başına konuşmaz; yanında süre yazar.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { acikIsler, isEmirleriniIndir, kalanMs, sahiplik, sureMetni, trafikIsigi, type Sahiplik } from '../isEmirleri';
import { KUTU_DEGISTI_OLAYI, PAKET_OLAYI, YENI_MEKTUP_OLAYI } from '../olaylar';
import type { IsEmri } from '../telefonDeposu';

const SAHIP_METNI: Record<Sahiplik, string> = {
  sahipsiz: 'Sahipsiz',
  bende: 'Bende',
  baskasinda: 'Başkasında',
};

export function useAcikIsler(): IsEmri[] {
  const [isler, setIsler] = useState<IsEmri[]>([]);

  useEffect(() => {
    const yukle = () => void acikIsler().then(setIsler);
    yukle();
    void isEmirleriniIndir().catch(() => undefined);   // internet varsa taze liste
    window.addEventListener(PAKET_OLAYI, yukle);
    window.addEventListener(YENI_MEKTUP_OLAYI, yukle);
    window.addEventListener(KUTU_DEGISTI_OLAYI, yukle);
    return () => {
      window.removeEventListener(PAKET_OLAYI, yukle);
      window.removeEventListener(YENI_MEKTUP_OLAYI, yukle);
      window.removeEventListener(KUTU_DEGISTI_OLAYI, yukle);
    };
  }, []);

  return isler;
}

// Kalan süre yazısı canlı kalsın: her 30 saniyede bir yeniden çiz
export function useSimdi(): number {
  const [simdi, setSimdi] = useState(() => Date.now());
  useEffect(() => {
    const sayac = window.setInterval(() => setSimdi(Date.now()), 30_000);
    return () => window.clearInterval(sayac);
  }, []);
  return simdi;
}

export function IslerEkrani() {
  const git = useNavigate();
  const isler = useAcikIsler();
  const simdi = useSimdi();

  return (
    <Sayfa baslik="Açık İşler" geri="/">
      {isler.length === 0 && <p className="soluk orta">Açık iş yok.</p>}
      <div className="liste">
        {isler.map((is) => (
          <button
            key={is.id}
            type="button"
            className={`is-karti isik--${trafikIsigi(is, simdi)}`}
            onClick={() => git(`/is/${is.id}`)}
          >
            <div className="is-ust">
              <strong>Oda {is.oda_no}</strong>
              <span>{sureMetni(kalanMs(is, simdi))}</span>
            </div>
            <div>{is.aciklama}</div>
            <div className="soluk">{SAHIP_METNI[sahiplik(is)]}</div>
          </button>
        ))}
      </div>
    </Sayfa>
  );
}
