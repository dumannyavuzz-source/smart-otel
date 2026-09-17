// Üst çubuk: demo süresinden kaç gün kaldığını söyler. Uygulamanın her ekranının üstünde durur.
// Son 7 günde rengi değişir ve yanında "Paketinizi seçin" bağlantısı belirir.
// Süre bittiğinde bu çubuk değil, ödeme duvarı görünür (App.tsx).
import { kalanGun, PAKETLER_ADRESI, sayacGorunsunMu, sonGunlerMi } from '../demo';

export function DemoCubugu({ bitis }: { bitis: string | null }) {
  const kalan = kalanGun(bitis);
  if (kalan === null || !sayacGorunsunMu(kalan)) return null;

  const sonGunler = sonGunlerMi(kalan);
  return (
    <div className={sonGunler ? 'demo-cubuk demo-cubuk--son' : 'demo-cubuk'} role="status">
      <span>Demo: {kalan} gün kaldı</span>
      {sonGunler && (
        <a className="demo-baglanti" href={PAKETLER_ADRESI} target="_blank" rel="noreferrer">
          Paketinizi seçin
        </a>
      )}
    </div>
  );
}
