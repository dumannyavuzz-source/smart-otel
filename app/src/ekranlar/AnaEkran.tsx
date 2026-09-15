// Ana ekran: tek iş, tek buton — "QR Okut". Menü yok.
// Otelde açık iş varsa teknisyen için ikincil bir kapı görünür: "Açık İşler (3)".
// Altta yalnızca gerekirse tek satır durum (002 · B.9 — personel görsün) ve küçük bir Çıkış (ux/001 · karar 4).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BuyukButon } from '../parcalar/BuyukButon';
import { kutuDurumu } from '../postaci';
import { acikIsler } from '../isEmirleri';
import { cikisYap } from '../oturum';
import { KUTU_DEGISTI_OLAYI, PAKET_OLAYI, YENI_MEKTUP_OLAYI } from '../olaylar';

type Durum = Awaited<ReturnType<typeof kutuDurumu>>;

const OLAYLAR = [YENI_MEKTUP_OLAYI, KUTU_DEGISTI_OLAYI, PAKET_OLAYI];

// Bir sayımı ilk açılışta ve her haberde yenile
function useSayim<T>(say: () => Promise<T>, baslangic: T): T {
  const [deger, setDeger] = useState<T>(baslangic);
  useEffect(() => {
    const yenile = () => void say().then(setDeger);
    yenile();
    OLAYLAR.forEach((olay) => window.addEventListener(olay, yenile));
    return () => OLAYLAR.forEach((olay) => window.removeEventListener(olay, yenile));
  }, [say]);
  return deger;
}

const acikIsSayisi = () => acikIsler().then((isler) => isler.length);

function durumMetni({ bekleyen, gonderilemeyen, baskasinin }: Durum): string {
  if (gonderilemeyen > 0) return `${gonderilemeyen} kayıt gönderilemedi. Müdürünüze haber verin.`;
  if (bekleyen > 0) return `${bekleyen} bildirim internet gelince gönderilecek`;
  if (baskasinin > 0) return `Başka kullanıcının ${baskasinin} bekleyen kaydı var`;
  return ' ';
}

export function AnaEkran() {
  const git = useNavigate();
  const durum = useSayim(kutuDurumu, { bekleyen: 0, gonderilemeyen: 0, baskasinin: 0 });
  const acikIs = useSayim(acikIsSayisi, 0);

  return (
    <main className="sayfa sayfa--orta">
      <h1 className="soluk">Smartotel</h1>
      <div className="esnek" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
        <BuyukButon ikon="📷" tur="ana" dev onClick={() => git('/qr')}>
          QR Okut
        </BuyukButon>
      </div>
      {acikIs > 0 && (
        <div style={{ width: '100%' }}>
          <BuyukButon ikon="🔧" onClick={() => git('/isler')}>
            {`Açık İşler (${acikIs})`}
          </BuyukButon>
        </div>
      )}
      <p className="soluk" aria-live="polite">
        {durumMetni(durum)}
      </p>
      <button type="button" className="buton buton--geri" onClick={() => void cikis(durum)}>
        Çıkış
      </button>
    </main>
  );
}

// Vardiya değişiminde ortak telefondan çıkış. Gönderilmemiş bildirim varsa önce söylenir:
// bildirimler telefonda kalır ama ancak sahibi tekrar girince gider (postaci · kimin mektubu).
async function cikis(durum: Durum): Promise<void> {
  const bekleyen = durum.bekleyen + durum.gonderilemeyen;
  const uyari = `${bekleyen} bildiriminiz henüz gönderilmedi. Çıkarsanız siz tekrar girene kadar telefonda bekler. Çıkılsın mı?`;
  if (bekleyen > 0 && !window.confirm(uyari)) return;
  await cikisYap();
}
