// Eksik Var: "Ne eksik?" → ürün seç → "Kaç Kg?" → Gönder. İki adım, tek soru.
// Soru ürünün birimiyle sorulur; Kg/Litre gibi bölünen birimlerde kesirli yazılabilir ("1,5 Kg").
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { OdaBulunamadi } from '../parcalar/OdaBulunamadi';
import { MiktarSayaci } from '../parcalar/MiktarSayaci';
import { odayiBul, urunleriGetir } from '../odalar';
import { eksikVarBeyani } from '../beyanlar';
import { adim, birimAdi, miktarMetni } from '../miktar';
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
        mesaj: `Eksik bildirildi: ${miktarMetni(adet, secili.unit)} ${secili.name}`,
        donus: { yol: `/oda/${kod}`, yazi: `Oda ${oda.number}’e Dön` },
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
            <BuyukButon
              key={urun.id}
              onClick={() => {
                setSecili(urun);
                setAdet(1);                      // yeni ürün, yeni birim: sayaç baştan başlar
              }}
            >
              {urun.name}
            </BuyukButon>
          ))}
        </div>
      </Sayfa>
    );
  }

  return (
    <Sayfa baslik={`Kaç ${birimAdi(secili.unit)}?`} altBaslik={`${odaAdi} · ${secili.name}`} geri={() => setSecili(null)}>
      <MiktarSayaci
        deger={adet}
        onDegis={setAdet}
        birim={secili.unit}
        enAz={adim(secili.unit)}
        enFazla={EN_FAZLA}
      />
      {hata && <p className="orta" role="alert">{hata}</p>}
      <div className="esnek" />
      <BuyukButon ikon="📨" tur="vurgu" disabled={gonderiliyor} onClick={() => void gonder()}>
        Gönder
      </BuyukButon>
    </Sayfa>
  );
}
