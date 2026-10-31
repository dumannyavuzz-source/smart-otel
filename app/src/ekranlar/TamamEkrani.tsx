// Tamam: ne yapıldığı + kaydın GERÇEK durumu + tek buton. İnternet beklenmez (karar 028):
//   📱 Telefona kaydedildi      → kayıt kutusunda, internet gelince gider
//   ✓  Sunucuda tamamlandı      → sunucuda kişi + otel + içerikle eşleşti
//   !  Sunucu kabul etmedi      → nedeniyle saklandı (Kayıtlarım)
// Sunucu doğrulamadan "tamamlandı" denmez. Geldiği yere göre döner: odaya, işlere ya da ana ekrana.
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { BuyukButon } from '../parcalar/BuyukButon';
import { kayitDeposu, type Kayit, type KayitDurumu } from '../kayitDeposu';
import { aktifKullanici } from '../kullanici';
import { KUTU_DEGISTI_OLAYI, YENI_MEKTUP_OLAYI } from '../olaylar';

export interface TamamBilgisi {
  mesaj: string;
  kayitId?: string;                         // durumu canlı gösterilecek kayıt
  donus?: { yol: string; yazi: string };   // verilmezse "Ana Ekran"
}

const GORUNUM: Record<KayitDurumu, { ikon: string; yazi: string }> = {
  bekliyor: { ikon: '📱', yazi: 'Telefona kaydedildi. İnternet gelince gönderilecek.' },
  belirsiz: { ikon: '📱', yazi: 'Telefona kaydedildi. Sunucuda doğrulanıyor.' },
  tamamlandi: { ikon: '✓', yazi: 'Sunucuda tamamlandı.' },
  reddedildi: { ikon: '!', yazi: 'Sunucu bu kaydı kabul etmedi. Nedeni Kayıtlarım’da.' },
  cakisma: { ikon: '!', yazi: 'Sunucuda farklı bir kayıtla çakıştı. Ayrıntı Kayıtlarım’da.' },
};

// Kaydın durumu — yalnızca kaydın sahibine. Ortak telefonda kişi değiştiyse (ya da kayıt yoksa) hiçbir
// sonuç gösterilmez: eski kişinin geç gelen sonucu yeni kişinin ekranında görünmez. null = gösterme.
export function sahibineDurum(kayit: Pick<Kayit, 'yazanId' | 'durum'> | undefined, ben: string | null): KayitDurumu | null {
  return kayit && ben && kayit.yazanId === ben ? kayit.durum : null;
}

function useKayitDurumu(id: string | undefined): KayitDurumu | null {
  // İlk an: kayıt az önce bu kişi tarafından yazıldı → "telefona kaydedildi". Sonra kutudan okunur.
  const [durum, setDurum] = useState<KayitDurumu | null>('bekliyor');
  useEffect(() => {
    if (!id) return;
    const bak = () =>
      void kayitDeposu.kayitlar.get(id).then((k) => setDurum(sahibineDurum(k, aktifKullanici())));
    bak();
    window.addEventListener(KUTU_DEGISTI_OLAYI, bak);
    window.addEventListener(YENI_MEKTUP_OLAYI, bak);
    return () => {
      window.removeEventListener(KUTU_DEGISTI_OLAYI, bak);
      window.removeEventListener(YENI_MEKTUP_OLAYI, bak);
    };
  }, [id]);
  return durum;
}

export function TamamEkrani() {
  const git = useNavigate();
  const konum = useLocation();
  const bilgi = konum.state as TamamBilgisi | null;
  const durum = useKayitDurumu(bilgi?.kayitId);

  if (!bilgi?.mesaj) return <Navigate to="/" replace />;
  const gorunum = durum ? GORUNUM[durum] : null;

  return (
    <main className="sayfa sayfa--orta">
      <div className="esnek" />
      {gorunum && <div className="onay" aria-hidden="true">{gorunum.ikon}</div>}
      <h1>{bilgi.mesaj}</h1>
      <p className="orta" aria-live="polite">{gorunum?.yazi ?? ' '}</p>
      <div className="esnek" />
      {(durum === 'reddedildi' || durum === 'cakisma') && (
        <BuyukButon ikon="📋" onClick={() => git('/kayitlarim', { replace: true })}>
          Kayıtlarım
        </BuyukButon>
      )}
      {bilgi.donus ? (
        <BuyukButon ikon="↩" tur="ana" onClick={() => git(bilgi.donus!.yol, { replace: true })}>
          {bilgi.donus.yazi}
        </BuyukButon>
      ) : (
        <BuyukButon ikon="🏠" tur="ana" onClick={() => git('/', { replace: true })}>
          Ana Ekran
        </BuyukButon>
      )}
    </main>
  );
}
