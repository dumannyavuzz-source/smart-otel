// Personel: liste (ad · görev) + "Personel Ekle". Görev: Kat Görevlisi / Teknisyen / Depo (3 seçenek).
// Sahip ayrıca müdür ekleyebilir. Şifreyi müdür belirler ve personele kendisi söyler.
//
// Şifre unutulursa: kartın üstündeki "Şifre" düğmesi. Mail gitmez, bağlantı beklenmez;
// müdür yeni şifreyi yazar, ekranda görür, kişiye söyler. Yetki kuralı sunucudadır.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Sayfa } from '../../parcalar/Sayfa';
import { BuyukButon } from '../../parcalar/BuyukButon';
import {
  personelCikar,
  personelEkle,
  personelListesi,
  sifreGecerliMi,
  sifreGuncelle,
  sifreOner,
  type Personel,
} from '../../panel';
import { GOREV_ADI, ROL_ADI, aktifProfil, type Gorev } from '../../kullanici';

const GOREVLER: Gorev[] = ['housekeeping', 'technician', 'warehouse'];

export function PersonelEkrani() {
  const profil = aktifProfil();
  const sahipMi = profil?.rol === 'owner';
  const [liste, setListe] = useState<Personel[] | null>(null);
  const [ekleniyor, setEkleniyor] = useState(false);
  const [calisan, setCalisan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // Şifre yenileme: hangi kartın kutusu açık, ne yazıldı, sonuç ne oldu?
  const [sifreAcik, setSifreAcik] = useState<string | null>(null);
  const [yeniSifre, setYeniSifre] = useState('');
  const [sifreHatasi, setSifreHatasi] = useState<string | null>(null);
  const [sifreSonucu, setSifreSonucu] = useState<{ id: string; ad: string; sifre: string } | null>(null);

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

  // Aynı kural sunucuda da var; düğme yalan söylemesin diye ekran da bilir:
  //   kendi şifresi → hayır · görevlinin şifresi → müdür ve sahip
  //   müdürün şifresi → yalnızca sahip · sahibin şifresine → kimse dokunamaz
  function sifresiniDegistirebilirim(p: Personel): boolean {
    if (p.user_id === profil?.id) return false;
    if (p.role === 'staff') return true;
    if (p.role === 'manager') return sahipMi;
    return false;
  }

  function sifreKutusunuAc(p: Personel) {
    setSifreAcik(p.id);
    setYeniSifre(sifreOner());          // hazır bir öneriyle açılır: çoğu zaman tek dokunuş yeter
    setSifreHatasi(null);
    setSifreSonucu(null);
  }

  function sifreKutusunuKapat() {
    setSifreAcik(null);
    setYeniSifre('');
    setSifreHatasi(null);
  }

  async function sifreKaydet(p: Personel) {
    if (calisan || !sifreGecerliMi(yeniSifre)) return;
    // Geri alınamaz: eski şifre o an çalışmaz olur. "İşten çıkar" gibi bu da bir kez sorulur.
    const ad = p.name || 'Bu kişi';
    if (!window.confirm(`${ad} için eski şifre çalışmayacak. Yeni şifreyi ona siz söyleyeceksiniz. Devam edilsin mi?`)) return;
    setCalisan(p.id);
    setSifreHatasi(null);
    const sonuc = await sifreGuncelle(profil?.otelId ?? '', p.user_id, yeniSifre);
    setCalisan(null);
    if (!sonuc.ok) {
      setSifreHatasi(sonuc.mesaj);
      return;
    }
    // Şifre ekranda kalır: müdürün bunu kişiye SÖYLEMESİ gerekir.
    setSifreSonucu({ id: p.id, ad: p.name || 'Bu kişi', sifre: yeniSifre });
    sifreKutusunuKapat();
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

            {sifreSonucu?.id === p.id && (
              <div className="uyari-blok">
                <strong>Yeni şifre: {sifreSonucu.sifre}</strong>
                <p className="soluk">
                  {sifreSonucu.ad} kişisine bu şifreyi söyleyin. Mail gitmedi; şifre yalnızca burada yazıyor.
                </p>
                {/* Şifre ekranda süresiz durmasın: söylendiği anda kaldırılır. */}
                <button type="button" className="buton buton--geri" onClick={() => setSifreSonucu(null)}>
                  Tamam, söyledim
                </button>
              </div>
            )}

            {sifreAcik === p.id ? (
              <div className="sifre-kutu">
                <label className="soluk" htmlFor={`sifre-${p.id}`}>Yeni şifre (en az 8 karakter)</label>
                <input
                  id={`sifre-${p.id}`}
                  className="alan"
                  type="text"
                  autoComplete="off"
                  value={yeniSifre}
                  onChange={(e) => setYeniSifre(e.target.value)}
                  maxLength={128}
                />
                <button type="button" className="buton buton--geri" onClick={() => setYeniSifre(sifreOner())}>
                  Başka bir şifre öner
                </button>
                {sifreHatasi && <p className="orta" role="alert">{sifreHatasi}</p>}
                <div className="ikili">
                  <button type="button" className="buton buton--geri" onClick={sifreKutusunuKapat}>
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    className="buton buton--vurgu"
                    disabled={!sifreGecerliMi(yeniSifre) || calisan !== null}
                    onClick={() => void sifreKaydet(p)}
                  >
                    {calisan === p.id ? 'Kaydediliyor…' : '✓ Kaydet'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="ikili">
                {sifresiniDegistirebilirim(p) && (
                  <button type="button" className="buton buton--geri" disabled={calisan !== null} onClick={() => sifreKutusunuAc(p)}>
                    🔑 Şifre
                  </button>
                )}
                {/* Yalnızca görevli çıkarılabilir: müdürü/sahibi veritabanı zaten çıkartmaz, düğme de yalan söylemesin. */}
                {p.role === 'staff' && p.user_id !== profil?.id && (
                  <button type="button" className="buton buton--geri" disabled={calisan !== null} onClick={() => void cikar(p)}>
                    {calisan === p.id ? 'Bekleyin…' : 'İşten çıkar'}
                  </button>
                )}
              </div>
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
        <button type="button" className="buton buton--geri" onClick={() => setSifre(sifreOner())}>
          Şifre öner
        </button>

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
