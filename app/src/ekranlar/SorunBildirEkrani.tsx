// Sorun Bildir: "Ne oldu?" → iki seçenek.
//   Böcek var  → tek dokunuşla gider.
//   Bir şey bozuk → "Ne bozuk?" kısa not → Gönder.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { odayiBul } from '../odalar';
import { SORUN_TURLERI, sorunBildirBeyani, type SorunTuru } from '../beyanlar';
import type { Oda } from '../telefonDeposu';

export function SorunBildirEkrani() {
  const { kod = '' } = useParams();
  const git = useNavigate();
  const [oda, setOda] = useState<Oda | null>(null);
  const [tur, setTur] = useState<SorunTuru | null>(null);
  const [not, setNot] = useState('');

  useEffect(() => {
    void odayiBul(kod).then(setOda);
  }, [kod]);

  async function gonder(secilen: SorunTuru, notMetni: string) {
    if (!oda) return;
    await sorunBildirBeyani(oda, secilen, notMetni);
    git('/tamam', {
      replace: true,
      state: {
        mesaj: `Sorun bildirildi: ${secilen.etiket}`,
        odayaDon: { yol: `/oda/${kod}`, yazi: `Oda ${oda.number}’e Dön` },
      },
    });
  }

  function turSec(secilen: SorunTuru) {
    if (secilen.notIster) setTur(secilen);
    else void gonder(secilen, '');
  }

  const odaAdi = oda ? `Oda ${oda.number}` : 'Oda';

  if (!tur) {
    return (
      <Sayfa baslik="Ne oldu?" altBaslik={odaAdi} geri={`/oda/${kod}`}>
        <div className="buton-grubu">
          {SORUN_TURLERI.map((t) => (
            <BuyukButon key={t.kod} ikon={t.ikon} onClick={() => turSec(t)}>
              {t.ad}
            </BuyukButon>
          ))}
        </div>
      </Sayfa>
    );
  }

  return (
    <Sayfa baslik="Ne bozuk?" altBaslik={odaAdi} geri={() => setTur(null)}>
      <textarea
        className="alan"
        placeholder="Kısaca yazın. Örnek: TV açılmıyor"
        value={not}
        onChange={(e) => setNot(e.target.value)}
        maxLength={400}
        autoFocus
      />
      <div className="esnek" />
      <BuyukButon ikon="📨" tur="vurgu" onClick={() => void gonder(tur, not)}>
        Gönder
      </BuyukButon>
    </Sayfa>
  );
}
