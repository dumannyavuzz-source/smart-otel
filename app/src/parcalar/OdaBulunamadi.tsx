// Oda bulunamadı: QR bir odaya bağlı değil, oda kapatılmış ya da telefonda yok ve internet yok.
import { Sayfa } from './Sayfa';

export function OdaBulunamadi() {
  return (
    <Sayfa baslik="Oda bulunamadı" geri="/">
      <p>Bu QR bir odaya bağlı değil. Müdürünüze haber verin.</p>
    </Sayfa>
  );
}
