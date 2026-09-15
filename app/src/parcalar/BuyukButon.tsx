// Büyük buton: ikon + metin. İkon yalnızca bir anlam taşıyorsa verilir; süs için ikon yok.
import type { ReactNode } from 'react';

interface Ozellikler {
  ikon?: string;
  tur?: 'ana' | 'vurgu' | 'ikincil';
  dev?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function BuyukButon({ ikon, tur = 'ikincil', dev = false, disabled, onClick, children }: Ozellikler) {
  const siniflar = ['buton'];
  if (tur === 'ana') siniflar.push('buton--ana');
  if (tur === 'vurgu') siniflar.push('buton--vurgu');
  if (dev) siniflar.push('buton--dev');

  return (
    <button type="button" className={siniflar.join(' ')} onClick={onClick} disabled={disabled}>
      {ikon && <span className="ikon" aria-hidden="true">{ikon}</span>}
      <span>{children}</span>
    </button>
  );
}
