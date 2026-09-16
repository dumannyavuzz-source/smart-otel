// Teslim bekleyenler (depo): müdürün onayladığı, henüz gelmemiş siparişler. En eski sipariş en üstte.
// Listede yalnızca BU kişinin teslim alabileceği siparişler vardır: kendi talebini ya da kendi onayladığını görmez.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { teslimBekleyenler } from '../teslimler';
import { miktarMetni } from '../miktar';
import { KUTU_DEGISTI_OLAYI, PAKET_OLAYI } from '../olaylar';
import type { Teslimat } from '../telefonDeposu';

export function TeslimlerEkrani() {
  const git = useNavigate();
  const [liste, setListe] = useState<Teslimat[] | null>(null);

  useEffect(() => {
    const yenile = () => void teslimBekleyenler().then(setListe);
    yenile();
    window.addEventListener(PAKET_OLAYI, yenile);
    window.addEventListener(KUTU_DEGISTI_OLAYI, yenile);
    return () => {
      window.removeEventListener(PAKET_OLAYI, yenile);
      window.removeEventListener(KUTU_DEGISTI_OLAYI, yenile);
    };
  }, []);

  return (
    <Sayfa baslik="Teslim Al" geri="/">
      {!liste && <p className="soluk orta">Bakılıyor…</p>}
      {liste?.length === 0 && <p className="soluk orta">Bekleyen sipariş yok.</p>}
      <div className="liste">
        {liste?.map((teslimat) => (
          <button key={teslimat.id} type="button" className="is-karti" onClick={() => git(`/teslim/${teslimat.id}`)}>
            <div className="is-ust">
              <strong>{teslimat.urun}</strong>
              <span>{miktarMetni(teslimat.onaylanan, teslimat.birim)}</span>
            </div>
            <div className="soluk">
              {teslimat.istenen === teslimat.onaylanan
                ? 'Onaylandı, bekleniyor'
                : `${miktarMetni(teslimat.istenen, teslimat.birim)} istendi, ${miktarMetni(teslimat.onaylanan, teslimat.birim)} onaylandı`}
            </div>
          </button>
        ))}
      </div>
    </Sayfa>
  );
}
