// Oda ekranı: temizlik kontrol listesi + üç net buton: Eksik Var · Sorun Bildir · Oda Hazır
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { kontrolListesiniGetir, odayiBul } from '../odalar';
import { odaHazirBeyani } from '../beyanlar';
import type { Oda } from '../telefonDeposu';

// Yarım kalan iş kaybolmasın: tiklenenler telefonda tutulur (uygulama kapansa bile).
function tiklenenleriOku(kod: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`tiklenen:${kod}`) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function tiklenenleriYaz(kod: string, tiklenen: string[]) {
  localStorage.setItem(`tiklenen:${kod}`, JSON.stringify(tiklenen));
}
function tiklenenleriSil(kod: string) {
  localStorage.removeItem(`tiklenen:${kod}`);
}

export function OdaEkrani() {
  const { kod = '' } = useParams();
  const git = useNavigate();
  const [oda, setOda] = useState<Oda | null | undefined>(undefined);   // undefined: aranıyor
  const [maddeler, setMaddeler] = useState<string[]>([]);
  const [tiklenen, setTiklenen] = useState<string[]>(() => tiklenenleriOku(kod));

  useEffect(() => {
    let aktif = true;
    void (async () => {
      const bulunan = await odayiBul(kod);
      if (!aktif) return;
      setOda(bulunan);
      if (bulunan) {
        const liste = await kontrolListesiniGetir(bulunan.hotel_id);
        if (aktif) setMaddeler(liste?.items ?? []);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [kod]);

  function tikla(madde: string) {
    const yeni = tiklenen.includes(madde) ? tiklenen.filter((m) => m !== madde) : [...tiklenen, madde];
    setTiklenen(yeni);
    tiklenenleriYaz(kod, yeni);
  }

  async function odaHazir() {
    if (!oda) return;
    await odaHazirBeyani(oda, maddeler.filter((m) => tiklenen.includes(m)));
    tiklenenleriSil(kod);
    git('/tamam', { replace: true, state: { mesaj: `Oda ${oda.number} hazır` } });
  }

  if (oda === undefined) {
    return (
      <Sayfa baslik="Oda" geri="/">
        <p className="soluk orta">Oda aranıyor…</p>
      </Sayfa>
    );
  }

  if (oda === null) {
    return (
      <Sayfa baslik="Oda bulunamadı" geri="/">
        <p>Bu QR bir odaya bağlı değil. Müdürünüze haber verin.</p>
      </Sayfa>
    );
  }

  return (
    <Sayfa baslik={`Oda ${oda.number}`} altBaslik={oda.floor ? `${oda.floor}. Kat` : undefined} geri="/">
      {maddeler.length > 0 && (
        <div className="liste" role="group" aria-label="Temizlik listesi">
          {maddeler.map((madde) => {
            const secili = tiklenen.includes(madde);
            return (
              <button
                key={madde}
                type="button"
                role="checkbox"
                aria-checked={secili}
                className={secili ? 'satir satir--secili' : 'satir'}
                onClick={() => tikla(madde)}
              >
                <span className="kutu" aria-hidden="true">{secili ? '✓' : ''}</span>
                <span>{madde}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="esnek" />

      <div className="buton-grubu buton-grubu--sabit">
        <BuyukButon ikon="🧺" onClick={() => git(`/oda/${kod}/eksik`)}>
          Eksik Var
        </BuyukButon>
        <BuyukButon ikon="⚠️" onClick={() => git(`/oda/${kod}/sorun`)}>
          Sorun Bildir
        </BuyukButon>
        <BuyukButon ikon="✅" tur="vurgu" onClick={odaHazir}>
          Oda Hazır
        </BuyukButon>
      </div>
    </Sayfa>
  );
}
