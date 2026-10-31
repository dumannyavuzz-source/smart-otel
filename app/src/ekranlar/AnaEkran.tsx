// Ana ekran: tek iş, tek buton — "QR Okut". Menü yok.
// Otelde açık iş varsa teknisyen için ikincil bir kapı görünür: "Açık İşler (3)".
// Altta yalnızca gerekirse tek satır durum (002 · B.9 — personel görsün) ve küçük bir Çıkış (ux/001 · karar 4).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BuyukButon } from '../parcalar/BuyukButon';
import { benimKutuOzetim } from '../postaci';
import { acikIsler } from '../isEmirleri';
import { teslimBekleyenler } from '../teslimler';
import { cikisYap } from '../oturum';
import { KUTU_DEGISTI_OLAYI, PAKET_OLAYI, YENI_MEKTUP_OLAYI } from '../olaylar';
import type { KutuOzeti } from '../kayitDeposu';

type Durum = KutuOzeti;

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
const teslimSayisi = () => teslimBekleyenler().then((liste) => liste.length);

// Telefona kaydedilen, sunucuda tamamlanan ve reddedilen ayrı söylenir (karar 028).
function durumMetni({ bekleyen, digerOtelde, dikkat, baskasinin }: Durum): string {
  if (dikkat > 0) return `${dikkat} kaydınız sunucuda kabul edilmedi. Kayıtlarım'a bakın.`;
  if (bekleyen > 0) return `${bekleyen} kayıt telefona kaydedildi, internet gelince gönderilecek`;
  if (digerOtelde > 0) return `Başka otelinizde ${digerOtelde} kayıt bekliyor; o otele geçince gönderilir`;
  if (baskasinin > 0) return `Başka kullanıcının ${baskasinin} bekleyen kaydı var`;
  return ' ';
}

export function AnaEkran() {
  const git = useNavigate();
  const durum = useSayim(benimKutuOzetim, { bekleyen: 0, digerOtelde: 0, dikkat: 0, baskasinin: 0 });
  const acikIs = useSayim(acikIsSayisi, 0);
  const teslim = useSayim(teslimSayisi, 0);

  return (
    <main className="sayfa sayfa--orta">
      <h1 className="soluk">OtelDijital</h1>
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
      {/* Depo görevlisi için ikincil kapı: teslim alınacak sipariş varsa görünür, yoksa yok. */}
      {teslim > 0 && (
        <div style={{ width: '100%' }}>
          <BuyukButon ikon="📦" onClick={() => git('/teslimler')}>
            {`Teslim Al (${teslim})`}
          </BuyukButon>
        </div>
      )}
      <p className="soluk" aria-live="polite">
        {durumMetni(durum)}
      </p>
      <div className="ikili" style={{ width: '100%' }}>
        <button type="button" className="buton buton--geri" onClick={() => git('/kayitlarim')}>
          {durum.dikkat > 0 ? `Kayıtlarım (${durum.dikkat})` : 'Kayıtlarım'}
        </button>
        <button type="button" className="buton buton--geri" onClick={() => void cikis(durum)}>
          Çıkış
        </button>
      </div>
    </main>
  );
}

// Vardiya değişiminde ortak telefondan çıkış. Gönderilmemiş kayıt varsa önce söylenir:
// kayıtlar telefonda kalır ama ancak sahibi tekrar girince gider (postaci · kimin kaydı).
async function cikis(durum: Durum): Promise<void> {
  const bekleyen = durum.bekleyen + durum.digerOtelde;
  const uyari = `${bekleyen} bildiriminiz henüz gönderilmedi. Çıkarsanız siz tekrar girene kadar telefonda bekler. Çıkılsın mı?`;
  if (bekleyen > 0 && !window.confirm(uyari)) return;
  await cikisYap();
}
