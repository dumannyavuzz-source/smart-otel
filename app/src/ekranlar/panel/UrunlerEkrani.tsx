// Ürünler: personelin "Eksik Var" listesinde görecekleri. Listede en fazla 8 ürün (kural veritabanında).
// Silme yok: ürün listeden "gizlenir" (pasif), gerekirse yeniden gösterilir.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Sayfa } from '../../parcalar/Sayfa';
import { EN_FAZLA_URUN, urunEkle, urunKapatAc, urunListesi, type UrunKaydi } from '../../panel';
import { aktifProfil } from '../../kullanici';

export function UrunlerEkrani() {
  const profil = aktifProfil();
  const [urunler, setUrunler] = useState<UrunKaydi[] | null>(null);
  const [ad, setAd] = useState('');
  const [birim, setBirim] = useState('');        // boş bırakılırsa "adet" sayılır; ipucu böylece görünür kalır
  const [bekliyor, setBekliyor] = useState(false);
  const [calisan, setCalisan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      setUrunler(await urunListesi(profil?.otelId ?? ''));
      setHata(null);
    } catch {
      setHata('İnternet yok. Bu ekran internet ister.');
    }
  }, [profil?.otelId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const acikSayisi = urunler?.filter((u) => u.is_active).length ?? 0;
  const doldu = acikSayisi >= EN_FAZLA_URUN;

  async function ekle(olay: FormEvent) {
    olay.preventDefault();
    if (bekliyor || doldu) return;

    // Sadece boşluktan oluşan ad, veritabanına gidip anlaşılmaz bir hatayla dönmesin.
    const temizAd = ad.trim();
    if (!temizAd) {
      setHata('Ürün adı yazın.');
      return;
    }
    // Aynı ürün iki kez listeye girmesin: personel birbirinin aynı iki buton görmesin.
    const ayni = urunler?.find((u) => u.name.toLocaleLowerCase('tr') === temizAd.toLocaleLowerCase('tr'));
    if (ayni) {
      setHata(ayni.is_active ? 'Bu ürün zaten listede.' : `"${ayni.name}" listede değil. "Listeye koy" diyebilirsiniz.`);
      return;
    }

    setBekliyor(true);
    setHata(null);
    try {
      await urunEkle(profil?.otelId ?? '', temizAd, birim);
      setAd('');
      setBirim('');
      await yukle();
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Bu işlem yapılamadı.');
    } finally {
      setBekliyor(false);
    }
  }

  // Aynı anda tek işlem: yavaş bağlantıda iki istek yarışıp ekranda yanlış durum bırakmasın.
  async function kapatAc(u: UrunKaydi) {
    if (calisan) return;
    setCalisan(u.id);
    setHata(null);
    try {
      await urunKapatAc(u.id, !u.is_active);
      await yukle();
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Bu işlem yapılamadı.');
    } finally {
      setCalisan(null);
    }
  }

  return (
    <Sayfa baslik="Ürünler" altBaslik={`Personelin listesinde ${acikSayisi} ürün var (en fazla ${EN_FAZLA_URUN})`} geri="/">
      {hata && <p className="orta" role="alert">{hata}</p>}
      {!urunler && !hata && <p className="soluk orta">Bakılıyor…</p>}

      <div className="liste">
        {urunler?.map((u) => (
          <div key={u.id} className={u.is_active ? 'kart' : 'kart kart--soluk'}>
            <div className="is-ust">
              <strong>{u.name}</strong>
              <span className="soluk">{u.unit}{u.is_active ? '' : ' · listede değil'}</span>
            </div>
            <button type="button" className="buton buton--geri" disabled={calisan !== null} onClick={() => void kapatAc(u)}>
              {calisan === u.id ? 'Bekleyin…' : u.is_active ? 'Listeden çıkar' : 'Listeye koy'}
            </button>
          </div>
        ))}
      </div>

      <div className="esnek" />

      {doldu ? (
        <p className="orta">Liste dolu ({EN_FAZLA_URUN} ürün). Yeni eklemek için önce birini listeden çıkarın.</p>
      ) : (
        <form className="buton-grubu" onSubmit={ekle}>
          <input className="alan" placeholder="Ürün adı (ör. Havlu)" value={ad} onChange={(e) => setAd(e.target.value)} required maxLength={60} />
          <input className="alan" placeholder="Birim: Kg, Litre, adet, paket…" value={birim} onChange={(e) => setBirim(e.target.value)} maxLength={10} />
          {/* Birim yalnızca bir kelime değil, bir izindir: bölünen birimde personel kesirli miktar girebilir. */}
          <p className="soluk">Kg ya da Litre yazarsanız personel "7,5" gibi kesirli miktar girebilir. Boş bırakırsanız "adet" olur.</p>
          <button type="submit" className="buton buton--ana" disabled={bekliyor}>
            <span className="ikon" aria-hidden="true">➕</span>
            <span>Ürün Ekle</span>
          </button>
        </form>
      )}
    </Sayfa>
  );
}
