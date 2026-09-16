// Kumanda: müdür tek bakışta "her şey yolunda mı?" sorusuna cevap alır.
// Kırmızı varsa en üstte, devasa. Yoksa yeşil "Her şey yolunda". Grafik yok, tablo yok.
// Soruyu 30 saniyede bir panel nöbetçisi sorar (panelNobeti.ts); yeni kırmızı alarmda çan çalar.
import { useNavigate } from 'react-router';
import { BuyukButon } from '../../parcalar/BuyukButon';
import { usePanelVerisi } from '../../panelNobeti';
import { aktifProfil } from '../../kullanici';
import { cikisYap } from '../../oturum';

export function PanelEkrani() {
  const git = useNavigate();
  const profil = aktifProfil();
  const { veri, hata } = usePanelVerisi();

  const kirmizi = veri ? veri.gecikenler.length + veri.mutsuzMisafirler.length + veri.uyusmazliklar.length : 0;

  return (
    <main className="sayfa">
      <header className="panel-baslik">
        <div>
          <h1>{profil?.otelAdi || 'Otel'}</h1>
          <div className="soluk">{profil?.ad || 'Müdür'}</div>
        </div>
        <button type="button" className="buton buton--geri" onClick={() => void cikisYap()}>
          Çıkış
        </button>
      </header>

      {hata && <p className="orta" role="alert">{hata}</p>}
      {/* "Her şey yolunda" ile "henüz bakmadım" aynı şey değildir: ilk cevap gelene kadar söylenir. */}
      {!veri && !hata && <p className="soluk orta">Bakılıyor…</p>}

      {veri && (
        <>
          {veri.gecikenler.length > 0 && (
            <button type="button" className="alarm alarm--kirmizi" onClick={() => git('/panel/gecikenler')}>
              <span className="alarm-ikon" aria-hidden="true">⏰</span>
              <span className="alarm-metin">{veri.gecikenler.length} işin süresi geçti</span>
              <span className="soluk">Dokunun, kim yapıyor görün</span>
            </button>
          )}

          {veri.mutsuzMisafirler.length > 0 && (
            <button type="button" className="alarm alarm--kirmizi" onClick={() => git('/panel/misafirler')}>
              <span className="alarm-ikon" aria-hidden="true">😟</span>
              <span className="alarm-metin">{veri.mutsuzMisafirler.length} mutsuz misafir</span>
              <span className="soluk">Odayı görün, hemen ilgilenin</span>
            </button>
          )}

          {/* Eksik ya da fazla gelen teslim: ortada para var, müdür derhal görmeli (Blueprint · 3.3). */}
          {veri.uyusmazliklar.length > 0 && (
            <button type="button" className="alarm alarm--kirmizi" onClick={() => git('/panel/uyusmazliklar')}>
              <span className="alarm-ikon" aria-hidden="true">🧾</span>
              <span className="alarm-metin">{veri.uyusmazliklar.length} teslimat onaylandığı gibi gelmedi</span>
              <span className="soluk">Dokunun, eksiği ve kanıt fotoğrafını görün</span>
            </button>
          )}

          {kirmizi === 0 && (
            <div className="alarm alarm--yesil">
              <span className="alarm-ikon" aria-hidden="true">✅</span>
              <span className="alarm-metin">Her şey yolunda</span>
              <span className="soluk">{veri.acikIs > 0 ? `${veri.acikIs} açık iş, hepsi süresinde` : 'Açık iş yok'}</span>
            </div>
          )}

          {veri.bekleyenOnay > 0 ? (
            <button type="button" className="alarm alarm--sari" onClick={() => git('/panel/onaylar')}>
              <span className="alarm-ikon" aria-hidden="true">✋</span>
              <span className="alarm-metin">{veri.bekleyenOnay} onay bekliyor</span>
              <span className="soluk">Personelin istediği ürünler</span>
            </button>
          ) : (
            <BuyukButon ikon="✋" onClick={() => git('/panel/onaylar')}>
              Onaylar
            </BuyukButon>
          )}
        </>
      )}

      <div className="esnek" />

      <div className="buton-grubu">
        <BuyukButon ikon="👥" onClick={() => git('/panel/personel')}>
          Personel
        </BuyukButon>
        <BuyukButon ikon="📦" onClick={() => git('/panel/urunler')}>
          Ürünler
        </BuyukButon>
        <BuyukButon ikon="📷" onClick={() => git('/qr')}>
          QR Okut
        </BuyukButon>
      </div>
    </main>
  );
}
