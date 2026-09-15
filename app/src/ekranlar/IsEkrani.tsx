// Tek iş: ne, nerede, ne kadar süre. Altta tek büyük buton:
//   sahipsizse "Aldım" · bendeyse "Çözdüm" (isteğe bağlı fotoğraf) · başkasındaysa buton yok.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { FotografSecici } from '../parcalar/FotografSecici';
import { isiAl, isiCoz, isiGetir, kalanMs, sahiplik, sureMetni, trafikIsigi } from '../isEmirleri';
import { KUTU_DEGISTI_OLAYI, PAKET_OLAYI } from '../olaylar';
import type { IsEmri } from '../telefonDeposu';
import { useSimdi } from './IslerEkrani';

export function IsEkrani() {
  const { id = '' } = useParams();
  const git = useNavigate();
  const simdi = useSimdi();
  const [is, setIs] = useState<IsEmri | null | undefined>(undefined);   // undefined: aranıyor
  const [fotograf, setFotograf] = useState<Blob | null>(null);
  const [fotoIsleniyor, setFotoIsleniyor] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    const yukle = () => void isiGetir(id).then((bulunan) => setIs(bulunan ?? null));
    yukle();
    window.addEventListener(PAKET_OLAYI, yukle);
    window.addEventListener(KUTU_DEGISTI_OLAYI, yukle);
    return () => {
      window.removeEventListener(PAKET_OLAYI, yukle);
      window.removeEventListener(KUTU_DEGISTI_OLAYI, yukle);
    };
  }, [id]);

  async function aldim() {
    if (!is || calisiyor) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await isiAl(is);
      setIs(await isiGetir(id).then((b) => b ?? null));
    } catch {
      setHata('Kaydedilemedi. Tekrar deneyin.');
    } finally {
      setCalisiyor(false);
    }
  }

  async function cozdum() {
    if (!is || calisiyor || fotoIsleniyor) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await isiCoz(is, fotograf);
    } catch {
      setCalisiyor(false);
      setHata('Kaydedilemedi. Tekrar deneyin.');
      return;
    }
    git('/tamam', {
      replace: true,
      state: { mesaj: `Oda ${is.oda_no} çözüldü`, donus: { yol: '/isler', yazi: 'İşlere Dön' } },
    });
  }

  if (is === undefined) {
    return (
      <Sayfa baslik="İş" geri="/isler">
        <p className="soluk orta">Aranıyor…</p>
      </Sayfa>
    );
  }

  if (is === null || is.status === 'resolved') {
    return (
      <Sayfa baslik="İş kapandı" geri="/isler">
        <p>Bu iş artık açık değil.</p>
      </Sayfa>
    );
  }

  const durum = sahiplik(is);
  const sure = sureMetni(kalanMs(is, simdi));
  const aciliyet = is.severity === 'urgent' ? 'Acil' : 'Normal';

  return (
    <Sayfa baslik={`Oda ${is.oda_no}`} altBaslik={`${aciliyet} · ${sure}`} geri="/isler">
      <div className={`is-karti isik--${trafikIsigi(is, simdi)}`}>
        <div>{is.aciklama}</div>
      </div>

      {durum === 'baskasinda' && <p className="soluk orta">Bu iş başkasında.</p>}

      {durum === 'bende' && (
        <FotografSecici fotograf={fotograf} onSec={setFotograf} onIsleniyor={setFotoIsleniyor} kucuk />
      )}

      {hata && <p className="orta" role="alert">{hata}</p>}

      <div className="esnek" />

      {durum === 'sahipsiz' && (
        <BuyukButon ikon="🙋" tur="ana" dev disabled={calisiyor} onClick={() => void aldim()}>
          Aldım
        </BuyukButon>
      )}

      {durum === 'bende' && (
        <BuyukButon ikon="✅" tur="vurgu" dev disabled={calisiyor || fotoIsleniyor} onClick={() => void cozdum()}>
          Çözdüm
        </BuyukButon>
      )}
    </Sayfa>
  );
}
