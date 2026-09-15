// Tamam: büyük onay işareti + ne yapıldığı + tek buton. İnternet beklenmez, "gönderiliyor" denmez.
// Görevli hâlâ odadaysa (eksik/sorun bildirdi) odaya döner; oda bittiyse ana ekrana.
import { Navigate, useLocation, useNavigate } from 'react-router';
import { BuyukButon } from '../parcalar/BuyukButon';

export interface TamamBilgisi {
  mesaj: string;
  odayaDon?: { yol: string; yazi: string };
}

export function TamamEkrani() {
  const git = useNavigate();
  const konum = useLocation();
  const bilgi = konum.state as TamamBilgisi | null;

  if (!bilgi?.mesaj) return <Navigate to="/" replace />;

  return (
    <main className="sayfa sayfa--orta">
      <div className="esnek" />
      <div className="onay" aria-hidden="true">✓</div>
      <h1>{bilgi.mesaj}</h1>
      <div className="esnek" />
      {bilgi.odayaDon ? (
        <BuyukButon ikon="🚪" tur="ana" onClick={() => git(bilgi.odayaDon!.yol, { replace: true })}>
          {bilgi.odayaDon.yazi}
        </BuyukButon>
      ) : (
        <BuyukButon ikon="🏠" tur="ana" onClick={() => git('/', { replace: true })}>
          Ana Ekran
        </BuyukButon>
      )}
    </main>
  );
}
