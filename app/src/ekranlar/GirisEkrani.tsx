// Giriş: e-posta + şifre + tek buton. Hesap var mı yok mu söylenmez.
//
// Bu ekran uygulamanın DIŞ KAPISIDIR: görünümü vitrinle aynı dildedir — "Sakin Lüks"
// (DESIGN_SYSTEM.md · 7.3: derin grafit zemin, serif başlık, şampanya düğme). Vitrinden gelen
// kişi görsel bir şok yaşamaz. Uygulamanın içi ise görevli için ayrı bir dildedir.
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
    // Şifre kabul edildiyse ekran zaten kapanmak üzeredir: düğme 'Giriliyor…' kalır ki kişi
    // yavaş bağlantıda ikinci kez basmasın, 'olmadı' sanmasın. Yalnızca hatada geri açılır.
    if (sonuc !== 'tamam') setBekliyor(false);
    if (sonuc === 'hatali') setHata('Bilgiler hatalı. Tekrar deneyin.');
    if (sonuc === 'internetYok') setHata('İnternet yok. Bağlanıp tekrar deneyin.');
  }

  return (
    <main className="kapi">
      <div className="kapi-kutu">
        <div className="kapi-marka">
          <span className="kapi-isaret" aria-hidden="true"></span>
          <span>OtelDijital</span>
        </div>

        <h1>Tekrar hoş geldiniz.</h1>
        <p className="kapi-giris">E-postanız ve şifrenizle girin; vardiyanız kaldığı yerden devam eder.</p>

        <form className="kapi-form" onSubmit={gonder}>
          <label htmlFor="eposta">E-posta</label>
          <input
            id="eposta"
            className="kapi-alan"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="siz@oteliniz.com"
            value={eposta}
            onChange={(e) => setEposta(e.target.value)}
            required
          />

          <label htmlFor="sifre">Şifre</label>
          <input
            id="sifre"
            className="kapi-alan"
            type="password"
            autoComplete="current-password"
            placeholder="Şifreniz"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            required
            minLength={8}
          />

          {hata && <p className="kapi-hata" role="alert">{hata}</p>}

          <button type="submit" className="kapi-dugme" disabled={bekliyor}>
            {bekliyor ? 'Giriliyor…' : 'Giriş Yap'}
          </button>
        </form>

        {/* Kayıt sayfası uygulamanın DIŞINDADIR (main.tsx). Bu yüzden react-router bağlantısı değil,
            düz bağlantı kullanılır: tam sayfa yenilenir ve /kayit açılır. */}
        <p className="kapi-dip">
          Hesabınız yok mu? <a href="/kayit">30 Gün Ücretsiz Dene</a>
        </p>
      </div>
    </main>
  );
}
