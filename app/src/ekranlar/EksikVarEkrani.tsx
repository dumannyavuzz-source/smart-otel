// Eksik Var: "Ne eksik?" → ürün seç → "Kaç tane?" → Gönder. İki adım, tek soru.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { odayiBul, urunleriGetir } from '../odalar';
import { eksikVarBeyani } from '../beyanlar';
import type { Oda, Urun } from '../telefonDeposu';

const EN_FAZLA = 99;

export function EksikVarEkrani() {
  const { kod = '' } = useParams();
  const git = useNavigate();
  const [oda, setOda] = useState<Oda | null>(null);
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [secili, setSecili] = useState<Urun | null>(null);
  const [adet, setAdet] = useState(1);

  useEffect(() => {
    void (async () => {
      const bulunan = await odayiBul(kod);
      setOda(bulunan);
      if (bulunan) setUrunler(await urunleriGetir(bulunan.hotel_id));
    })();
  }, [kod]);

  async function gonder() {
    if (!oda || !secili) return;
    await eksikVarBeyani(oda, secili.id, adet);
    git('/tamam', {
      replace: true,
      state: {
        mesaj: `Eksik bildirildi: ${adet} × ${secili.name}`,
        odayaDon: { yol: `/oda/${kod}`, yazi: `Oda ${oda.number}’e Dön` },
      },
    });
  }

  const odaAdi = oda ? `Oda ${oda.number}` : 'Oda';

  if (!secili) {
    return (
      <Sayfa baslik="Ne eksik?" altBaslik={odaAdi} geri={`/oda/${kod}`}>
        {urunler.length === 0 && <p className="soluk">Ürün listesi henüz yok. İnternete bağlanın.</p>}
        <div className="buton-grubu">
          {urunler.map((urun) => (
            <BuyukButon key={urun.id} onClick={() => setSecili(urun)}>
              {urun.name}
            </BuyukButon>
          ))}
        </div>
      </Sayfa>
    );
  }

  return (
    <Sayfa baslik="Kaç tane?" altBaslik={`${odaAdi} · ${secili.name}`} geri={() => setSecili(null)}>
      <div className="sayac">
        <button type="button" className="buton" onClick={() => setAdet((a) => Math.max(1, a - 1))} aria-label="Azalt">
          −
        </button>
        <strong aria-live="polite">{adet}</strong>
        <button type="button" className="buton" onClick={() => setAdet((a) => Math.min(EN_FAZLA, a + 1))} aria-label="Artır">
          +
        </button>
      </div>
      <div className="esnek" />
      <BuyukButon ikon="📨" tur="vurgu" onClick={gonder}>
        Gönder
      </BuyukButon>
    </Sayfa>
  );
}
