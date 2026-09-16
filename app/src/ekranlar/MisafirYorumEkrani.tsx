// Misafir Yorum Ekranı — odadaki QR'ın açtığı TEK sayfa (Blueprint · 3.4).
//
// Misafir için kurulum yok, giriş yok, ad-soyad yok, menü yok, başka hiçbir sayfa yok.
// Ekranda iki şey vardır: kaç yıldız, ve (isterse) tek bir yazı kutusu.
//
// Amaç: kötü deneyimi misafir otelden çıkmadan ve internete düşmeden içeride yakalamak.
// Not (Blueprint · 3.4): memnun misafiri dışarıdaki yorum sitelerine yönlendirmek yoktur; bu ekran
// şikâyeti İÇERİDE hızlı çözmek içindir, yorumu engellemek için değil.
import { useState } from 'react';
import { EN_UZUN_YORUM, odaKoduGecerliMi, yorumGonder } from '../misafir/yorumGonder';

// Yıldızın yanında ne anlama geldiği yazar: renk tek başına konuşmaz, sayı da tek başına konuşmaz.
const PUAN_YAZISI = ['', 'Çok kötü', 'Kötü', 'İdare eder', 'İyi', 'Harika'];

export function MisafirYorumEkrani({ odaKodu }: { odaKodu: string }) {
  const [puan, setPuan] = useState(0);
  const [yorum, setYorum] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(false);

  if (!odaKoduGecerliMi(odaKodu)) {
    return (
      <main className="sayfa sayfa--orta">
        <h1>Bu bağlantı geçersiz</h1>
        <p className="soluk orta">Lütfen odanızdaki kareyi tekrar okutun.</p>
      </main>
    );
  }

  // Teşekkür sayfası. Puan düşükse otel "hemen ilgileniyoruz" der: misafir sesinin duyulduğunu bilmeli.
  if (bitti) {
    return (
      <main className="sayfa sayfa--orta">
        <div className="alarm-ikon" aria-hidden="true">{puan <= 3 ? '🙏' : '💚'}</div>
        <h1>Teşekkür ederiz</h1>
        <p className="orta">
          {puan <= 3 ? 'Hemen ilgileniyoruz.' : 'İyi tatiller dileriz.'}
        </p>
      </main>
    );
  }

  async function gonder() {
    if (puan === 0 || gonderiliyor) return;
    setGonderiliyor(true);
    setHata(null);
    const sonuc = await yorumGonder(odaKodu, puan, yorum);
    if (sonuc.ok) {
      setBitti(true);
      return;
    }
    setGonderiliyor(false);
    setHata(sonuc.mesaj);
  }

  return (
    <main className="sayfa sayfa--orta">
      <h1 className="orta">Odanızdan memnun kaldınız mı?</h1>

      <div className="yildizlar" role="group" aria-label="Puanınız">
        {[1, 2, 3, 4, 5].map((sayi) => (
          <button
            key={sayi}
            type="button"
            className={sayi <= puan ? 'yildiz yildiz--dolu' : 'yildiz'}
            aria-label={`${sayi} yıldız — ${PUAN_YAZISI[sayi]}`}
            aria-pressed={sayi === puan}
            onClick={() => setPuan(sayi)}
          >
            ★
          </button>
        ))}
      </div>
      <p className="yildiz-yazi" aria-live="polite">{PUAN_YAZISI[puan]}</p>

      <textarea
        className="alan"
        placeholder="Eklemek istediğiniz bir şey var mı? (isteğe bağlı)"
        value={yorum}
        onChange={(e) => setYorum(e.target.value)}
        maxLength={EN_UZUN_YORUM}
      />

      {hata && <p className="orta" role="alert">{hata}</p>}

      <button
        type="button"
        className="buton buton--dev buton--vurgu"
        disabled={puan === 0 || gonderiliyor}
        onClick={() => void gonder()}
      >
        <span className="ikon" aria-hidden="true">📨</span>
        <span>{gonderiliyor ? 'Gönderiliyor…' : 'Gönder'}</span>
      </button>
      {puan === 0 && <p className="soluk orta">Önce yıldızlara dokunun.</p>}
    </main>
  );
}
