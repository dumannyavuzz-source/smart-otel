// Ödeme duvarı: demo süresi dolunca uygulamanın açılan tek ekranı budur.
//
// İki şey aynı anda doğrudur ve ikisi de yazılıdır:
//   * Operasyon durur — hiçbir ekran açılmaz, hiçbir kayıt yazılmaz.
//   * Veri durur — hiçbir şey silinmez; paket seçilince her şey yerli yerindedir.
//
// Buradaki kilit nezakettir; asıl kilit sunucudadır (…_demo_suresi.sql).
import { PAKETLER_ADRESI } from '../demo';
import { cikisYap } from '../oturum';

export function OdemeDuvariEkrani() {
  return (
    <main className="sayfa sayfa--orta">
      <h1>Demo süreniz sona erdi</h1>
      <p>30 günlük demo süreniz sona erdi. Uygulamayı kullanmaya devam etmek için paketinizi seçin.</p>
      <p className="soluk">
        Verileriniz güvende. Hiçbir kaydınız silinmedi; paketinizi seçtiğiniz an kaldığınız yerden devam edersiniz.
      </p>
      <a className="buton buton--ana" href={PAKETLER_ADRESI} target="_blank" rel="noreferrer">
        Paketleri Gör
      </a>
      <button type="button" className="buton buton--geri" onClick={() => void cikisYap()}>
        Çıkış
      </button>
    </main>
  );
}
