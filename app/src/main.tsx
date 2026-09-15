// Başlangıç noktası
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { ayarlarTamamMi } from './ortakBeyin';
import { sesiHazirla } from './ses';
import './stil.css';

const kok = createRoot(document.getElementById('kok')!);

// Tarayıcı, kullanıcı ekrana dokunmadan ses çıkarmaya izin vermez. En baştan beklemeye başlarız:
// müdürün "Giriş Yap" dokunuşu çanın kilidini açar. Yoksa panele hiç dokunmayan müdür çanı hiç duymaz.
sesiHazirla();

if (ayarlarTamamMi()) {
  kok.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
} else {
  // Yalnızca geliştirici görür: .env dosyası eksik
  kok.render(
    <main className="sayfa sayfa--orta">
      <h1>Ayarlar eksik</h1>
      <p>
        <code>app/.env</code> dosyasını <code>.env.example</code>’a bakarak oluşturun.
      </p>
    </main>,
  );
}
