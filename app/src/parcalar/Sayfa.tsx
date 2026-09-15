// Sayfa iskeleti: üstte "← Geri" ve başlık, altta içerik.
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

interface Ozellikler {
  baslik: string;
  altBaslik?: string;
  geri?: string | (() => void);   // adres ya da "bir önceki soruya dön" işlevi; yoksa önceki sayfa
  children: ReactNode;
}

export function Sayfa({ baslik, altBaslik, geri, children }: Ozellikler) {
  const git = useNavigate();
  const geriGit = () => {
    if (typeof geri === 'function') geri();
    else if (geri) git(geri);
    else git(-1);
  };

  return (
    <main className="sayfa">
      <header className="baslik">
        <button type="button" className="buton buton--geri" onClick={geriGit}>
          ← Geri
        </button>
        <div>
          <h1>{baslik}</h1>
          {altBaslik && <div className="soluk">{altBaslik}</div>}
        </div>
      </header>
      {children}
    </main>
  );
}
