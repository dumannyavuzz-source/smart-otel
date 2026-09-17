// Ödeme duvarı: demo süresi dolunca uygulamanın açılan tek ekranı budur.
//
// İki şey aynı anda doğrudur ve ikisi de yazılıdır:
//   * Operasyon durur — hiçbir ekran açılmaz, hiçbir kayıt yazılmaz.
//   * Veri durur — hiçbir şey silinmez; paket seçilince her şey yerli yerindedir.
//
// Paketler burada, kişinin gözünün önünde durur: "fiyatı görmek için vitrine git" denmez.
// Buradaki kilit nezakettir; asıl kilit sunucudadır (…_demo_suresi.sql).
import { PAKETLER_ADRESI } from '../demo';
import { KURUMSAL_ADRESI, PAKETLER, YILLIK_VURGU } from '../paketler';
import { cikisYap } from '../oturum';

export function OdemeDuvariEkrani() {
  return (
    <main className="sayfa sayfa--orta">
      <h1>Demo süreniz sona erdi</h1>
      <p>30 günlük demo süreniz sona erdi. Uygulamayı kullanmaya devam etmek için paketinizi seçin.</p>
      <p className="soluk">
        Verileriniz güvende. Hiçbir kaydınız silinmedi; paketinizi seçtiğiniz an kaldığınız yerden devam edersiniz.
      </p>

      <ul className="paketler">
        {PAKETLER.map((paket) => (
          <li key={paket.ad} className="kart paket">
            <span className="paket-ad">
              <strong>{paket.ad}</strong>
              <span className="soluk paket-oda">{paket.odalar}</span>
            </span>
            <span className="paket-sag">
              <span className="paket-fiyat">
                {paket.fiyat}
                {paket.donem && <span className="paket-donem">{paket.donem}</span>}
              </span>
              {paket.iletisim && (
                <a className="paket-iletisim" href={KURUMSAL_ADRESI}>
                  İletişime Geçin
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>

      <p className="soluk paket-dip">{YILLIK_VURGU}</p>

      <a className="buton buton--ana" href={PAKETLER_ADRESI} target="_blank" rel="noreferrer">
        Paketleri Karşılaştır
      </a>
      <button type="button" className="buton buton--geri" onClick={() => void cikisYap()}>
        Çıkış
      </button>
    </main>
  );
}
