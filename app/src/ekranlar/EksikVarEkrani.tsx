// Eksik Var: "Ne eksik?" → ürün seç → "Kaç tane?" → Gönder. İki adım, tek soru.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { OdaBulunamadi } from '../parcalar/OdaBulunamadi';
import { odayiBul, urunleriGetir } from '../odalar';
import { eksikVarBeyani } from '../beyanlar';
import type { Oda, Urun } from '../telefonDeposu';

const EN_FAZLA = 99;

export function EksikVarEkrani() {
  const { kod = '' } = useParams();
  const git = useNavigate();
  const [oda, setOda] = useState<Oda | null | undefined>(undefined);   // undefined: aranıyor
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [secili, setSecili] = useState<Urun | null>(null);
  const [adet, setAdet] = useState(1);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const bulunan = await odayiBul(kod);
      setOda(bulunan);
      if (bulunan) setUrunler(await urunleriGetir(bulunan.hotel_id));
    })();
  }, [kod]);

  async function gonder() {
    if (!oda || !secili || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await eksikVarBeyani(oda, secili.id, adet);
    } catch {
      setGonderiliyor(false);
      setHata('Kaydedilemedi. Tekrar deneyin.');
      return;
    }
    git('/tamam', {
      replace: true,
      state: {
        mesaj: `Eksik bildirildi: ${adet} × ${secili.name}`,
        odayaDon: { yol: `/oda/${kod}`, yazi: `Oda ${oda.number}’e Dön` },
      },
    });
  }

  if (oda === null) return <OdaBulunamadi />;
  const odaAdi = oda ? `Oda ${oda.number}` : 'Oda';

  if (!secili) {
    return (
      <Sayfa baslik="Ne eksik?" altBaslik={odaAdi} geri={`/oda/${kod}`}>
        {oda && urunler.length === 0 && <p className="soluk">Ürün listesi henüz yok. İnternete bağlanın.</p>}
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
      {hata && <p className="orta" role="alert">{hata}</p>}
      <div className="esnek" />
      <BuyukButon ikon="📨" tur="vurgu" disabled={gonderiliyor} onClick={() => void gonder()}>
        Gönder
      </BuyukButon>
    </Sayfa>
  );
}
