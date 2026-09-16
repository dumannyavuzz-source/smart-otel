// Mutsuz misafirler (son 24 saat, puan 1–3): oda, puan, yorum, ne zaman. Amaç: misafir çıkmadan ilgilenmek.
import { Sayfa } from '../../parcalar/Sayfa';
import { usePanelVerisi } from '../../panelNobeti';

// Pencere 24 saat: "03:15" bu geceye mi dün geceye mi ait, yazıdan anlaşılmalı.
// (Uyuşmazlıklar ekranı da aynı pencereye bakar, aynı cümleyi kullanır.)
export function neZaman(iso: string): string {
  const an = new Date(iso);
  const saat = an.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return an.toDateString() === new Date().toDateString() ? saat : `Dün ${saat}`;
}

export function MisafirlerEkrani() {
  const { veri, hata } = usePanelVerisi();

  return (
    <Sayfa baslik="Mutsuz misafirler" altBaslik="Son 24 saat" geri="/">
      {hata && <p className="orta" role="alert">{hata}</p>}
      {!veri && !hata && <p className="soluk orta">Bakılıyor…</p>}
      {veri && veri.mutsuzMisafirler.length === 0 && <p className="soluk orta">Mutsuz misafir yok.</p>}
      <div className="liste">
        {veri?.mutsuzMisafirler.map((y) => (
          <div key={y.id} className="is-karti isik--kirmizi">
            <div className="is-ust">
              <strong>Oda {y.oda_no}</strong>
              <span>{'★'.repeat(y.rating)}{'☆'.repeat(5 - y.rating)} · {neZaman(y.created_at)}</span>
            </div>
            {y.comment && <div>{y.comment}</div>}
          </div>
        ))}
      </div>
    </Sayfa>
  );
}
