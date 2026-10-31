// Tamam: büyük onay işareti + ne yapıldığı + tek buton. İnternet beklenmez, "gönderiliyor" denmez.
// Geldiği yere göre döner: odaya (eksik/sorun), işlere (çözdüm) ya da ana ekrana (oda hazır).
import { Navigate, useLocation, useNavigate } from 'react-router';
import { BuyukButon } from '../parcalar/BuyukButon';

export interface TamamBilgisi {
  mesaj: string;
  donus?: { yol: string; yazi: string };   // verilmezse "Ana Ekran"
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
      {bilgi.donus ? (
        <BuyukButon ikon="↩" tur="ana" onClick={() => git(bilgi.donus!.yol, { replace: true })}>
          {bilgi.donus.yazi}
        </BuyukButon>
      ) : (
        <BuyukButon ikon="🏠" tur="ana" onClick={() => git('/', { replace: true })}>
          Ana Ekran
        </BuyukButon>
      )}
    </main>
  );
}
