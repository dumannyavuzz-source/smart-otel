// Personel: liste (ad · görev) + "Personel Ekle". Görev: Kat Görevlisi / Teknisyen / Depo (3 seçenek).
// Sahip ayrıca müdür ekleyebilir. Şifreyi müdür belirler, personele söyler (personel sonra değiştirir).
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Sayfa } from '../../parcalar/Sayfa';
import { BuyukButon } from '../../parcalar/BuyukButon';
import { personelCikar, personelEkle, personelListesi, type Personel } from '../../panel';
import { GOREV_ADI, ROL_ADI, aktifProfil, type Gorev } from '../../kullanici';

const GOREVLER: Gorev[] = ['housekeeping', 'technician', 'warehouse'];

export function PersonelEkrani() {
  const profil = aktifProfil();
  const [liste, setListe] = useState<Personel[] | null>(null);
  const [ekleniyor, setEkleniyor] = useState(false);
  const [calisan, setCalisan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setListe(await personelListesi(profil?.otelId ?? ''));
      setHata(null);
    } catch {
      setHata('İnternet yok. Bu ekran internet ister.');
    }
  }, [profil?.otelId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function cikar(p: Personel) {
    if (calisan) return;
    if (!window.confirm(`${p.name || 'Bu kişi'} otelden çıkarılsın mı?`)) return;   // geri alınamaz: sorulur
    setCalisan(p.id);
    setHata(null);
    try {
      await personelCikar(p.id);
      await yukle();
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Bu işlem yapılamadı.');
    } finally {
      setCalisan(null);
    }
  }

  if (ekleniyor) {
    return (
      <PersonelEkleFormu
        onBitti={() => {
          setEkleniyor(false);
          void yukle();
        }}
        onVazgec={() => setEkleniyor(false)}
      />
    );
  }

  return (
    <Sayfa baslik="Personel" geri="/">
      {hata && <p className="orta" role="alert">{hata}</p>}
      {!liste && !hata && <p className="soluk orta">Bakılıyor…</p>}
      <div className="liste">
        {liste?.map((p) => (
          <div key={p.id} className="kart">
            <div className="is-ust">
              <strong>{p.name || 'İsimsiz'}</strong>
              <span className="soluk">{p.job ? GOREV_ADI[p.job] : ROL_ADI[p.role]}</span>
            </div>
            {/* Yalnızca görevli çıkarılabilir: müdürü/sahibi veritabanı zaten çıkartmaz, düğme de yalan söylemesin. */}
            {p.role === 'staff' && p.user_id !== profil?.id && (
              <button type="button" className="buton buton--geri" disabled={calisan !== null} onClick={() => void cikar(p)}>
                {calisan === p.id ? 'Bekleyin…' : 'İşten çıkar'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="esnek" />
      <BuyukButon ikon="➕" tur="ana" onClick={() => setEkleniyor(true)}>
        Personel Ekle
      </BuyukButon>
    </Sayfa>
  );
}

function PersonelEkleFormu({ onBitti, onVazgec }: { onBitti: () => void; onVazgec: () => void }) {
  const profil = aktifProfil();
  const sahipMi = profil?.rol === 'owner';
  const [ad, setAd] = useState('');
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [gorev, setGorev] = useState<Gorev | 'manager' | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder(olay: FormEvent) {
    olay.preventDefault();
    if (!gorev) {
      setHata('Görev seçin.');
      return;
    }
    setBekliyor(true);
    setHata(null);
    const sonuc = await personelEkle({
      hotel_id: profil?.otelId ?? '',
      name: ad,
      email: eposta,
      password: sifre,
      role: gorev === 'manager' ? 'manager' : 'staff',
      job: gorev === 'manager' ? null : gorev,
    });
    setBekliyor(false);
    if (sonuc.ok) onBitti();
    else setHata(sonuc.mesaj);
  }

  return (
    <Sayfa baslik="Personel Ekle" geri={onVazgec}>
      <form className="buton-grubu" onSubmit={gonder}>
        <input className="alan" placeholder="Ad Soyad" value={ad} onChange={(e) => setAd(e.target.value)} required maxLength={60} />
        <input className="alan" type="email" inputMode="email" autoComplete="off" placeholder="E-posta" value={eposta} onChange={(e) => setEposta(e.target.value)} required />
        <input className="alan" type="text" autoComplete="off" placeholder="İlk şifre (en az 8 karakter)" value={sifre} onChange={(e) => setSifre(e.target.value)} required minLength={8} />

        <div className="soluk">Görevi ne?</div>
        <div className="liste" role="radiogroup" aria-label="Görev">
          {GOREVLER.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={gorev === g}
              className={gorev === g ? 'satir satir--secili' : 'satir'} onClick={() => setGorev(g)}>
              <span className="kutu" aria-hidden="true">{gorev === g ? '✓' : ''}</span>
              <span>{GOREV_ADI[g]}</span>
            </button>
          ))}
          {sahipMi && (
            <button type="button" role="radio" aria-checked={gorev === 'manager'}
              className={gorev === 'manager' ? 'satir satir--secili' : 'satir'} onClick={() => setGorev('manager')}>
              <span className="kutu" aria-hidden="true">{gorev === 'manager' ? '✓' : ''}</span>
              <span>Müdür</span>
            </button>
          )}
        </div>

        {hata && <p className="orta" role="alert">{hata}</p>}

        <button type="submit" className="buton buton--vurgu" disabled={bekliyor}>
          <span className="ikon" aria-hidden="true">✓</span>
          <span>{bekliyor ? 'Ekleniyor…' : 'Ekle'}</span>
        </button>
      </form>
    </Sayfa>
  );
}
