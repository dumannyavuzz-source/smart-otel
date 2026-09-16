// Onaylandığı gibi gelmeyen teslimler (son 24 saat) — Blueprint · 3.3:
// "istenen · onaylanan · gelen yan yana; uyuşmuyorsa müdüre uyarı düşer."
//
// Müdür burada üç sayıyı ve kanıt fotoğrafını yan yana görür; tedarikçiyi arayabilecek kadar bilgi.
// Kayıt değiştirilemez: teslim bir imzadır. Bu ekran yalnızca gösterir.
import { useEffect, useState } from 'react';
import { Sayfa } from '../../parcalar/Sayfa';
import { usePanelVerisi } from '../../panelNobeti';
import { miktarMetni } from '../../miktar';
import { kanitAdresi, uyusmazlikMetni } from '../../uyusmazliklar';
import { neZaman } from './MisafirlerEkrani';

// Kanıt fotoğrafı kilitli depodadır; adresi müdür için o an üretilir, beş dakika geçerlidir.
function Kanit({ yol }: { yol: string }) {
  const [adres, setAdres] = useState<string | null | undefined>(undefined);   // undefined: açılıyor

  useEffect(() => {
    let birakildi = false;
    void kanitAdresi(yol)
      .then((bulunan) => {
        if (!birakildi) setAdres(bulunan);
      })
      .catch(() => {
        if (!birakildi) setAdres(null);
      });
    return () => {
      birakildi = true;
    };
  }, [yol]);

  // Sessiz başarısızlık yok: açılamadıysa müdür bunu bilmeli, "yükleniyor" diye beklememeli.
  if (adres === undefined) return <p className="soluk">Kanıt fotoğrafı açılıyor…</p>;
  if (adres === null) return <p className="soluk">Kanıt fotoğrafı açılamadı. İnternet gelince tekrar deneyin.</p>;
  return <img className="fotograf-onizleme" src={adres} alt="Eksik ya da hasarlı ürünün fotoğrafı" />;
}

export function UyusmazliklarEkrani() {
  const { veri, hata } = usePanelVerisi();

  return (
    <Sayfa baslik="Teslimat uyuşmazlıkları" altBaslik="Son 7 gün" geri="/">
      {hata && <p className="orta" role="alert">{hata}</p>}
      {!veri && !hata && <p className="soluk orta">Bakılıyor…</p>}
      {veri && veri.uyusmazliklar.length === 0 && <p className="soluk orta">Her teslimat onaylandığı gibi geldi.</p>}
      <div className="liste">
        {veri?.uyusmazliklar.map((u) => (
          <div key={u.id} className="is-karti isik--kirmizi">
            <div className="is-ust">
              <strong>{u.urun}</strong>
              <span>{uyusmazlikMetni(u)}</span>
            </div>
            <div>
              {miktarMetni(u.onaylanan, u.birim)} onaylandı · {miktarMetni(u.gelen, u.birim)} geldi
            </div>
            {u.istenen !== u.onaylanan && (
              <div className="soluk">{miktarMetni(u.istenen, u.birim)} istenmişti</div>
            )}
            <div className="soluk">
              {u.kimAldi} teslim aldı · {neZaman(u.ne_zaman)}
            </div>
            {u.kanitYolu && <Kanit yol={u.kanitYolu} />}
          </div>
        ))}
      </div>
    </Sayfa>
  );
}
