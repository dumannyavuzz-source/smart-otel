// Başlangıç noktası
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { MisafirYorumEkrani } from './ekranlar/MisafirYorumEkrani';
import { misafirKodunuOku } from './misafir/yorumGonder';
import { ayarlarTamamMi } from './ortakBeyin';
import { sesiHazirla } from './ses';
import './stil.css';

const kok = createRoot(document.getElementById('kok')!);

// Misafir sayfası uygulamanın DIŞINDADIR: oturum sorulmaz, postacı çalışmaz, panel nöbetçisi kurulmaz.
// Misafir giriş yapmaz (Blueprint · 3.4): QR'ı okutur, yıldıza dokunur, gider.
const misafirKodu = misafirKodunuOku(window.location.pathname);

if (!ayarlarTamamMi()) {
  // Yalnızca geliştirici görür: .env dosyası eksik
  kok.render(
    <main className="sayfa sayfa--orta">
      <h1>Ayarlar eksik</h1>
      <p>
        <code>app/.env</code> dosyasını <code>.env.example</code>’a bakarak oluşturun.
      </p>
    </main>,
  );
} else if (misafirKodu !== null) {
  kok.render(
    <StrictMode>
      <MisafirYorumEkrani odaKodu={misafirKodu} />
    </StrictMode>,
  );
} else {
  // Tarayıcı, kullanıcı ekrana dokunmadan ses çıkarmaya izin vermez. En baştan beklemeye başlarız:
  // müdürün "Giriş Yap" dokunuşu çanın kilidini açar. Yoksa panele hiç dokunmayan müdür çanı hiç duymaz.
  sesiHazirla();
  kok.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
