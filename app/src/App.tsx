// Yollar (rotalar). Giriş yoksa her yol Giriş ekranına çıkar.
// Müdür/sahip için ana ekran Kumanda'dır; görevli için "QR Okut".
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { cikisYap, useOturum } from './oturum';
import { postaciyiBaslat } from './postaci';
import { aktifProfil, yoneticiMi } from './kullanici';
import { panelNobetiniBaslat } from './panelNobeti';
import { GirisEkrani } from './ekranlar/GirisEkrani';
import { OtelSecEkrani } from './ekranlar/OtelSecEkrani';
import { AnaEkran } from './ekranlar/AnaEkran';
import { QrOkutEkrani } from './ekranlar/QrOkutEkrani';
import { OdaEkrani } from './ekranlar/OdaEkrani';
import { EksikVarEkrani } from './ekranlar/EksikVarEkrani';
import { SorunBildirEkrani } from './ekranlar/SorunBildirEkrani';
import { TamamEkrani } from './ekranlar/TamamEkrani';
import { IslerEkrani } from './ekranlar/IslerEkrani';
import { IsEkrani } from './ekranlar/IsEkrani';
import { TeslimlerEkrani } from './ekranlar/TeslimlerEkrani';
import { TeslimEkrani } from './ekranlar/TeslimEkrani';
import { PanelEkrani } from './ekranlar/panel/PanelEkrani';
import { GecikenlerEkrani } from './ekranlar/panel/GecikenlerEkrani';
import { MisafirlerEkrani } from './ekranlar/panel/MisafirlerEkrani';
import { OnaylarEkrani } from './ekranlar/panel/OnaylarEkrani';
import { PersonelEkrani } from './ekranlar/panel/PersonelEkrani';
import { UrunlerEkrani } from './ekranlar/panel/UrunlerEkrani';

export function App() {
  const { durum, uyelikler, otelSec } = useOturum();

  // Giriş varsa postacı işe başlar; çıkışta durur.
  useEffect(() => {
    if (durum === 'var') return postaciyiBaslat();
  }, [durum]);

  // Müdür girişliyse panel nöbetçisi çalışır: hangi panel ekranında olursa olsun alarmları izler,
  // yeni bir kırmızı alarm düşerse çanı çalar.
  const panelOteli = durum === 'var' && yoneticiMi(aktifProfil()) ? aktifProfil()?.otelId ?? '' : '';
  useEffect(() => {
    if (panelOteli) return panelNobetiniBaslat(panelOteli);
  }, [panelOteli]);

  if (durum === 'yukleniyor') {
    return (
      <main className="sayfa sayfa--orta">
        <p className="soluk">Açılıyor…</p>
      </main>
    );
  }

  if (durum === 'yok') return <GirisEkrani />;
  if (durum === 'otelSec') return <OtelSecEkrani uyelikler={uyelikler} onSec={otelSec} />;

  // Giriş yapıldı ama üyelikler sorulamadı. "Oteliniz yok" demek yanlış olur: sebep internettir.
  if (durum === 'baglantiYok') {
    return (
      <main className="sayfa sayfa--orta">
        <h1>Bağlantı yok</h1>
        <p>Bilgileriniz alınamadı. İnternete bağlanıp tekrar deneyin.</p>
        <button type="button" className="buton buton--ana" onClick={() => window.location.reload()}>
          Tekrar dene
        </button>
        <button type="button" className="buton buton--geri" onClick={() => void cikisYap()}>
          Çıkış
        </button>
      </main>
    );
  }

  if (durum === 'otelsiz') {
    return (
      <main className="sayfa sayfa--orta">
        <h1>Otel bulunamadı</h1>
        <p>Bu hesap bir otele bağlı değil. Müdürünüze haber verin.</p>
        <button type="button" className="buton buton--geri" onClick={() => void cikisYap()}>
          Çıkış
        </button>
      </main>
    );
  }

  const yonetici = yoneticiMi(aktifProfil());
  const yalnizYonetici = (ekran: React.ReactElement) => (yonetici ? ekran : <Navigate to="/" replace />);

  return (
    <Routes>
      <Route path="/" element={yonetici ? <PanelEkrani /> : <AnaEkran />} />
      <Route path="/qr" element={<QrOkutEkrani />} />
      <Route path="/oda/:kod" element={<OdaEkrani />} />
      <Route path="/oda/:kod/eksik" element={<EksikVarEkrani />} />
      <Route path="/oda/:kod/sorun" element={<SorunBildirEkrani />} />
      <Route path="/isler" element={<IslerEkrani />} />
      <Route path="/is/:id" element={<IsEkrani />} />
      <Route path="/teslimler" element={<TeslimlerEkrani />} />
      <Route path="/teslim/:id" element={<TeslimEkrani />} />
      <Route path="/tamam" element={<TamamEkrani />} />
      <Route path="/panel/gecikenler" element={yalnizYonetici(<GecikenlerEkrani />)} />
      <Route path="/panel/misafirler" element={yalnizYonetici(<MisafirlerEkrani />)} />
      <Route path="/panel/onaylar" element={yalnizYonetici(<OnaylarEkrani />)} />
      <Route path="/panel/personel" element={yalnizYonetici(<PersonelEkrani />)} />
      <Route path="/panel/urunler" element={yalnizYonetici(<UrunlerEkrani />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
