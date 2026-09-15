// Başlangıç noktası
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { ayarlarTamamMi } from './ortakBeyin';
import './stil.css';

const kok = createRoot(document.getElementById('kok')!);

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
