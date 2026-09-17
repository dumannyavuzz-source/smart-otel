// Giriş: e-posta + şifre + tek buton. Hesap var mı yok mu söylenmez.
import { useState, type FormEvent } from 'react';
import { girisYap } from '../oturum';

export function GirisEkrani() {
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    setHata(null);
    setBekliyor(true);
    const sonuc = await girisYap(eposta, sifre);
    setBekliyor(false);
    if (sonuc === 'hatali') setHata('Bilgiler hatalı. Tekrar deneyin.');
    if (sonuc === 'internetYok') setHata('İnternet yok. Bağlanıp tekrar deneyin.');
  }

  return (
    <main className="sayfa sayfa--orta">
      <h1>OtelDijital</h1>
      <form className="buton-grubu" style={{ width: '100%' }} onSubmit={gonder}>
        <input
          className="alan"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="E-posta"
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          required
        />
        <input
          className="alan"
          type="password"
          autoComplete="current-password"
          placeholder="Şifre"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          required
          minLength={8}
        />
        <button type="submit" className="buton buton--ana" disabled={bekliyor}>
          <span className="ikon" aria-hidden="true">🔑</span>
          <span>{bekliyor ? 'Giriliyor…' : 'Giriş Yap'}</span>
        </button>
        {hata && <p className="orta" role="alert">{hata}</p>}
      </form>

      {/* Kayıt sayfası uygulamanın DIŞINDADIR (main.tsx). Bu yüzden react-router bağlantısı değil,
          düz bağlantı kullanılır: tam sayfa yenilenir ve /kayit açılır. */}
      <p className="giris-kayit">
        Hesabınız yok mu? <a href="/kayit">30 Gün Ücretsiz Dene</a>
      </p>
    </main>
  );
}
