// Kayıt Ekranı — vitrindeki "30 Gün Ücretsiz Dene" düğmesinin indiği yer (Aşama 20).
//
// Dört soru, tek düğme. Kurulum sihirbazı, adım adım form, oda sayısı sorusu, kart bilgisi yoktur.
// Görünümü vitrinle aynı dildedir ("Sakin Lüks", DESIGN_SYSTEM.md · 7.3): kişi aynı ürünün içinde olduğunu hissetmeli.
//
// Sayfa uygulamanın DIŞINDADIR: oturum sorulmaz, postacı çalışmaz (main.tsx).
// Kayıt bitince kişi kendi şifresiyle normal yoldan girer ve panele düşer.
import { useState, type FormEvent } from 'react';
import { kayitDenetle, otelAc, EN_KISA_SIFRE } from '../kayit';
import { girisYap } from '../oturum';

export function KayitEkrani() {
  const [otelAdi, setOtelAdi] = useState('');
  const [ad, setAd] = useState('');
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [durum, setDurum] = useState<'form' | 'kuruluyor'>('form');
  const [hata, setHata] = useState<string | null>(null);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    if (durum === 'kuruluyor') return;

    const bilgi = { otelAdi, ad, eposta, sifre };
    const sorun = kayitDenetle(bilgi);
    if (sorun) {
      setHata(sorun);
      return;
    }

    setDurum('kuruluyor');
    setHata(null);

    const sonuc = await otelAc(bilgi);
    if (!sonuc.ok) {
      setDurum('form');
      setHata(sonuc.mesaj);
      return;
    }

    // Otel kuruldu. Şimdi normal giriş: kayıt akışı kendine özel bir kapı açmaz.
    const giris = await girisYap(eposta, sifre);
    if (giris === 'tamam') {
      window.location.replace('/');            // tam yenileme: uygulama girişli açılır, panel gelir
      return;
    }
    // Otel açıldı ama giriş yapılamadı (internet gitti). Kişi kaybolmasın: ne yapacağını söyle.
    setDurum('form');
    setHata('Oteliniz kuruldu ancak giriş yapılamadı. Giriş ekranından e-posta ve şifrenizle girin.');
  }

  return (
    <main className="kapi">
      <div className="kapi-kutu">
        <div className="kapi-marka">
          <span className="kapi-isaret" aria-hidden="true"></span>
          <span>OtelDijital</span>
        </div>

        <h1>30 Gün Ücretsiz Dene</h1>
        <p className="kapi-giris">
          Dört soru soruyoruz, gerisini biz hallediyoruz. Kurulum bitince doğrudan müdür panelinize düşersiniz.
        </p>

        <form className="kapi-form" onSubmit={gonder}>
          <label htmlFor="otelAdi">Otel adı</label>
          <input
            id="otelAdi"
            className="kapi-alan"
            value={otelAdi}
            onChange={(e) => setOtelAdi(e.target.value)}
            placeholder="Deniz Otel"
            maxLength={80}
            autoComplete="organization"
            required
          />

          <label htmlFor="ad">Adınız soyadınız</label>
          <input
            id="ad"
            className="kapi-alan"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Yavuz Duman"
            maxLength={60}
            autoComplete="name"
            required
          />

          <label htmlFor="eposta">E-posta</label>
          <input
            id="eposta"
            className="kapi-alan"
            type="email"
            inputMode="email"
            value={eposta}
            onChange={(e) => setEposta(e.target.value)}
            placeholder="siz@oteliniz.com"
            maxLength={120}
            autoComplete="email"
            required
          />

          <label htmlFor="sifre">Şifre</label>
          <input
            id="sifre"
            className="kapi-alan"
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            placeholder={`En az ${EN_KISA_SIFRE} karakter`}
            minLength={EN_KISA_SIFRE}
            maxLength={128}
            autoComplete="new-password"
            required
          />

          {hata && <p className="kapi-hata" role="alert">{hata}</p>}

          <button type="submit" className="kapi-dugme" disabled={durum === 'kuruluyor'}>
            {durum === 'kuruluyor' ? 'Oteliniz kuruluyor…' : 'Otelimi Başlat'}
          </button>
        </form>

        <ul className="kapi-guvence">
          <li>✓ Kredi kartı yok</li>
          <li>✓ Taahhüt yok</li>
          <li>✓ 30 gün boyunca tüm özellikler</li>
        </ul>

        <p className="kapi-dip">
          Zaten hesabınız var mı? <a href="/giris">Giriş yapın</a>
        </p>
      </div>
    </main>
  );
}
