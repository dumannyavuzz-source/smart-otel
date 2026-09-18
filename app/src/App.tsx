// Yollar (rotalar). Giriş yoksa her yol /giris'e gider; giriş yapılınca gelinen yola dönülür.
// Müdür/sahip için ana ekran Kumanda'dır; görevli için "QR Okut".
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { cikisYap, useOturum } from './oturum';
import { guvenliYol } from './kapiYolu';
import { postaciyiBaslat } from './postaci';
import { aktifProfil, yoneticiMi } from './kullanici';
import { panelNobetiniBaslat } from './panelNobeti';
import { demoBitti } from './demo';
import { DemoCubugu } from './parcalar/DemoCubugu';
import { OdemeDuvariEkrani } from './ekranlar/OdemeDuvariEkrani';
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
import { UyusmazliklarEkrani } from './ekranlar/panel/UyusmazliklarEkrani';
import { OnaylarEkrani } from './ekranlar/panel/OnaylarEkrani';
import { PersonelEkrani } from './ekranlar/panel/PersonelEkrani';
import { UrunlerEkrani } from './ekranlar/panel/UrunlerEkrani';

export function App() {
  const { durum, uyelikler, otelSec } = useOturum();

  // Demo süresi dolduysa uygulama kilitlidir: ne postacı çalışır, ne panel nöbetçisi, ne de ekranlar açılır.
  // Tarih bilinmiyorsa (eski önbellek ya da sunucu sorulamadı) kilit YOKTUR:
  // "bilmiyorum" ile "süresi doldu" karıştırılmaz, kimse bilinmezlik yüzünden kapıda kalmaz.
  const profil = durum === 'var' ? aktifProfil() : null;
  const kilitli = demoBitti(profil?.demoBitis);

  // Giriş varsa postacı işe başlar; çıkışta durur. Kilitliyken hiç başlamaz:
  // sunucu zaten yazdırmaz, boşuna kapı çalınmaz.
  useEffect(() => {
    if (durum === 'var' && !kilitli) return postaciyiBaslat();
  }, [durum, kilitli]);

  // Müdür girişliyse panel nöbetçisi çalışır: hangi panel ekranında olursa olsun alarmları izler,
  // yeni bir kırmızı alarm düşerse çanı çalar.
  const panelOteli = !kilitli && yoneticiMi(profil) ? profil?.otelId ?? '' : '';
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

  // Giriş yok: kapının adresi /giris'tir. Başka bir yola gelen (QR'dan /oda/… gibi) önce kapıya
  // gönderilir; geldiği yol yanında taşınır ki giriş yapınca aynı odada kalsın.
  if (durum === 'yok') {
    return (
      <Routes>
        <Route path="/giris" element={<GirisEkrani />} />
        <Route path="*" element={<KapiyaGonder />} />
      </Routes>
    );
  }
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

  // Demo süresi doldu: operasyon durur, veri durur. Açılan tek ekran ödeme duvarıdır.
  if (kilitli) return <OdemeDuvariEkrani />;

  const yonetici = yoneticiMi(profil);
  const yalnizYonetici = (ekran: React.ReactElement) => (yonetici ? ekran : <Navigate to="/" replace />);

  return (
    <div className="uygulama">
      {/* Demo sayacı her ekranın üstünde durur; süre bittiyse zaten buraya hiç gelinmez. */}
      <DemoCubugu bitis={profil?.demoBitis ?? null} />
      <Routes>
        <Route path="/" element={yonetici ? <PanelEkrani /> : <AnaEkran />} />
        {/* Girişliyken kapıda durulmaz: gelinen yola (yoksa ana ekrana) geçilir. */}
        <Route path="/giris" element={<KapidanIceri />} />
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
        <Route path="/panel/uyusmazliklar" element={yalnizYonetici(<UyusmazliklarEkrani />)} />
        <Route path="/panel/onaylar" element={yalnizYonetici(<OnaylarEkrani />)} />
        <Route path="/panel/personel" element={yalnizYonetici(<PersonelEkrani />)} />
        <Route path="/panel/urunler" element={yalnizYonetici(<UrunlerEkrani />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Girişsiz kişiyi kapıya götürür; geldiği yolu (adres + soru işareti sonrası) yanına koyar.
function KapiyaGonder() {
  const { pathname, search } = useLocation();
  return <Navigate to="/giris" replace state={{ sonra: pathname + search }} />;
}

// Giriş yapılmış kişiyi kapıdan içeri alır: taşınan yol varsa oraya, yoksa ana ekrana.
function KapidanIceri() {
  const { state } = useLocation();
  const sonra = (state as { sonra?: unknown } | null)?.sonra;
  return <Navigate to={guvenliYol(sonra)} replace />;
}
