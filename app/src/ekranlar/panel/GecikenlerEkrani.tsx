// Süresi geçen işler: oda, ne, kaç dakika geçti, kimde. Müdür kime seslenmesi gerektiğini görür.
// Süre yazısı canlı kalır (useSimdi): bağlantı kopsa bile ekranda donmuş bir "25 dk geçti" durmaz.
import { Sayfa } from '../../parcalar/Sayfa';
import { sureMetni } from '../../isEmirleri';
import { useSimdi } from '../IslerEkrani';
import { usePanelVerisi } from '../../panelNobeti';

export function GecikenlerEkrani() {
  const { veri, hata } = usePanelVerisi();
  const simdi = useSimdi();

  return (
    <Sayfa baslik="Süresi geçenler" geri="/">
      {hata && <p className="orta" role="alert">{hata}</p>}
      {!veri && !hata && <p className="soluk orta">Bakılıyor…</p>}
      {veri && veri.gecikenler.length === 0 && <p className="soluk orta">Süresi geçen iş yok.</p>}
      <div className="liste">
        {veri?.gecikenler.map((is) => (
          <div key={is.id} className="is-karti isik--kirmizi">
            <div className="is-ust">
              <strong>Oda {is.oda_no}</strong>
              <span>{sureMetni(Date.parse(is.due_at) - simdi)}</span>
            </div>
            <div>{is.aciklama}</div>
            <div className="soluk">
              {is.severity === 'urgent' ? 'Acil' : 'Normal'} · {is.kimde}
            </div>
          </div>
        ))}
      </div>
    </Sayfa>
  );
}
