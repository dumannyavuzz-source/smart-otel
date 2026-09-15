// Sorun Bildir: "Ne oldu?" → tür seç (2 seçenek) → fotoğraf çek (ana yol) → Gönder.
// Not isteğe bağlıdır. Fotoğraf çekilemiyorsa "Fotoğrafsız Gönder" yolu açıktır.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { FotografSecici } from '../parcalar/FotografSecici';
import { OdaBulunamadi } from '../parcalar/OdaBulunamadi';
import { odayiBul } from '../odalar';
import { SORUN_TURLERI, bekleyenFotografSayisi, sorunBildirBeyani, type SorunTuru } from '../beyanlar';
import { EN_FAZLA_BEKLEYEN_FOTOGRAF, type Oda } from '../telefonDeposu';

export function SorunBildirEkrani() {
  const { kod = '' } = useParams();
  const git = useNavigate();
  const [oda, setOda] = useState<Oda | null | undefined>(undefined);   // undefined: aranıyor
  const [tur, setTur] = useState<SorunTuru | null>(null);
  const [fotograf, setFotograf] = useState<Blob | null>(null);
  const [fotoIsleniyor, setFotoIsleniyor] = useState(false);
  const [not, setNot] = useState('');
  const [tepsiDolu, setTepsiDolu] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    void odayiBul(kod).then(setOda);
    void bekleyenFotografSayisi().then((n) => setTepsiDolu(n >= EN_FAZLA_BEKLEYEN_FOTOGRAF));
  }, [kod]);

  async function gonder() {
    if (!oda || !tur || gonderiliyor || fotoIsleniyor) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      await sorunBildirBeyani(oda, tur, not, fotograf);
    } catch {
      setGonderiliyor(false);
      setHata('Kaydedilemedi. Tekrar deneyin.');
      return;
    }
    git('/tamam', {
      replace: true,
      state: {
        mesaj: `Sorun bildirildi: ${tur.etiket}`,
        donus: { yol: `/oda/${kod}`, yazi: `Oda ${oda.number}’e Dön` },
      },
    });
  }

  if (oda === null) return <OdaBulunamadi />;
  const odaAdi = oda ? `Oda ${oda.number}` : 'Oda';

  if (!tur) {
    return (
      <Sayfa baslik="Ne oldu?" altBaslik={odaAdi} geri={`/oda/${kod}`}>
        <div className="buton-grubu">
          {SORUN_TURLERI.map((t) => (
            <BuyukButon key={t.kod} ikon={t.ikon} disabled={!oda} onClick={() => setTur(t)}>
              {t.ad}
            </BuyukButon>
          ))}
        </div>
      </Sayfa>
    );
  }

  const kilitli = gonderiliyor || fotoIsleniyor;

  return (
    <Sayfa baslik={tur.ad} altBaslik={odaAdi} geri={() => setTur(null)}>
      {tepsiDolu ? (
        <p className="orta">Bekleyen fotoğraf çok. İnternete bağlanın.</p>
      ) : (
        <FotografSecici fotograf={fotograf} onSec={setFotograf} onIsleniyor={setFotoIsleniyor} />
      )}

      <textarea
        className="alan"
        placeholder="Not (isteğe bağlı)"
        value={not}
        onChange={(e) => setNot(e.target.value)}
        maxLength={400}
      />

      {hata && <p className="orta" role="alert">{hata}</p>}

      <div className="esnek" />

      {fotograf ? (
        <BuyukButon ikon="📨" tur="vurgu" disabled={kilitli} onClick={() => void gonder()}>
          Gönder
        </BuyukButon>
      ) : (
        <BuyukButon ikon="📨" disabled={kilitli} onClick={() => void gonder()}>
          Fotoğrafsız Gönder
        </BuyukButon>
      )}
    </Sayfa>
  );
}
