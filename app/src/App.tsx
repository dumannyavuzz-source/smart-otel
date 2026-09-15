// Yollar (rotalar). Giriş yoksa her yol Giriş ekranına çıkar.
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useOturum } from './oturum';
import { postaciyiBaslat } from './postaci';
import { GirisEkrani } from './ekranlar/GirisEkrani';
import { AnaEkran } from './ekranlar/AnaEkran';
import { QrOkutEkrani } from './ekranlar/QrOkutEkrani';
import { OdaEkrani } from './ekranlar/OdaEkrani';
import { EksikVarEkrani } from './ekranlar/EksikVarEkrani';
import { SorunBildirEkrani } from './ekranlar/SorunBildirEkrani';
import { TamamEkrani } from './ekranlar/TamamEkrani';

export function App() {
  const oturum = useOturum();

  // Giriş varsa postacı işe başlar; çıkışta durur.
  useEffect(() => {
    if (oturum === 'var') return postaciyiBaslat();
  }, [oturum]);

  if (oturum === 'yukleniyor') {
    return (
      <main className="sayfa sayfa--orta">
        <p className="soluk">Açılıyor…</p>
      </main>
    );
  }

  if (oturum === 'yok') return <GirisEkrani />;

  return (
    <Routes>
      <Route path="/" element={<AnaEkran />} />
      <Route path="/qr" element={<QrOkutEkrani />} />
      <Route path="/oda/:kod" element={<OdaEkrani />} />
      <Route path="/oda/:kod/eksik" element={<EksikVarEkrani />} />
      <Route path="/oda/:kod/sorun" element={<SorunBildirEkrani />} />
      <Route path="/tamam" element={<TamamEkrani />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
