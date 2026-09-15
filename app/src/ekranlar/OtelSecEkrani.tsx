// Zincir sahibi: birden fazla otel. Tek soru: "Hangi otel?"
import { BuyukButon } from '../parcalar/BuyukButon';
import type { Uyelik } from '../oturum';
import { cikisYap } from '../oturum';

export function OtelSecEkrani({ uyelikler, onSec }: { uyelikler: Uyelik[]; onSec: (hotelId: string) => void }) {
  return (
    <main className="sayfa">
      <h1>Hangi otel?</h1>
      <div className="buton-grubu">
        {uyelikler.map((u) => (
          <BuyukButon key={u.hotel_id} ikon="🏨" onClick={() => onSec(u.hotel_id)}>
            {u.hotels?.name ?? 'Otel'}
          </BuyukButon>
        ))}
      </div>
      <div className="esnek" />
      <button type="button" className="buton buton--geri" onClick={() => void cikisYap()}>
        Çıkış
      </button>
    </main>
  );
}
