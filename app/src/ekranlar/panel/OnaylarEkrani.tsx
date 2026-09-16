// Bekleyen onaylar (Maker-Checker · Checker adımı): her talep bir kart, iki buton: Onayla / Reddet.
// Onaylanan miktar değiştirilebilir (− + ya da sayının üstüne yazarak: "7,5 Kg").
// Kendi talebi: buton yok (veritabanı da reddeder).
import { useCallback, useEffect, useState } from 'react';
import { Sayfa } from '../../parcalar/Sayfa';
import { bekleyenTalepler, karar, type Talep } from '../../panel';
import { aktifProfil } from '../../kullanici';
import { MiktarSayaci } from '../../parcalar/MiktarSayaci';
import { adim, birimAdi, miktarMetni } from '../../miktar';

export function OnaylarEkrani() {
  const profil = aktifProfil();
  const [talepler, setTalepler] = useState<Talep[] | null>(null);
  const [adetler, setAdetler] = useState<Record<string, number>>({});
  const [calisan, setCalisan] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // sessiz = karar yazıldıktan SONRAKİ tazeleme. Orada çıkan ağ hatası ekrana yazılmaz;
  // yoksa müdür, kaydedilmiş bir kararı verilmemiş sanıp ikinci kez dener.
  const yukle = useCallback(async (sessiz = false) => {
    try {
      const liste = await bekleyenTalepler(profil?.otelId ?? '');
      setTalepler(liste);
      // Müdürün elle değiştirdiği adet korunur; yalnızca yeni gelen talep istenen adetle başlar.
      setAdetler((eski) => Object.fromEntries(liste.map((t) => [t.id, eski[t.id] ?? t.quantity])));
      setHata(null);
    } catch {
      if (!sessiz) setHata('İnternet yok. Bu ekran internet ister.');
    }
  }, [profil?.otelId]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function kararVer(talep: Talep, sonuc: 'approved' | 'rejected') {
    if (calisan) return;
    setCalisan(talep.id);
    setHata(null);
    try {
      await karar(talep, sonuc, adetler[talep.id] ?? talep.quantity);
      setTalepler((liste) => liste?.filter((t) => t.id !== talep.id) ?? null);   // karar yazıldı: kart düşer
      await yukle(true);
    } catch (h) {
      setHata(h instanceof Error ? h.message : 'Bu işlem yapılamadı.');
      await yukle(true);                        // gerçeği göster: karar zaten verilmişse kart listeden düşer
    } finally {
      setCalisan(null);
    }
  }

  function adetYaz(id: string, yeni: number) {
    setAdetler((a) => ({ ...a, [id]: yeni }));
  }

  return (
    <Sayfa baslik="Bekleyen onaylar" geri="/">
      {hata && <p className="orta" role="alert">{hata}</p>}
      {!talepler && !hata && <p className="soluk orta">Bakılıyor…</p>}
      {talepler && talepler.length === 0 && <p className="soluk orta">Bekleyen istek yok.</p>}
      <div className="liste">
        {talepler?.map((t) => {
          const kendiTalebim = t.created_by === profil?.id;
          const adet = adetler[t.id] ?? t.quantity;
          return (
            <div key={t.id} className="kart">
              <div className="is-ust">
                <strong>{t.urun}</strong>
                <span>{miktarMetni(t.quantity, t.birim)} istendi</span>
              </div>
              <div className="soluk">İsteyen: {t.talepEden}</div>
              {t.note && <div>{t.note}</div>}

              {kendiTalebim ? (
                <p className="soluk">Kendi isteğinizi onaylayamazsınız.</p>
              ) : (
                <>
                  <div className="soluk orta">Kaç {birimAdi(t.birim)} onaylıyorsunuz?</div>
                  <MiktarSayaci
                    deger={adet}
                    onDegis={(yeni) => adetYaz(t.id, yeni)}
                    birim={t.birim}
                    enAz={adim(t.birim)}
                  />
                  <div className="ikili">
                    {/* Reddetmek geri alınamaz: ince buton. Onaylamak asıl iştir: vurgulu buton. */}
                    {/* Bir karar giderken bütün butonlar kapanır: dokunuşun sessizce yutulduğu an olmasın. */}
                    <button type="button" className="buton buton--geri" disabled={calisan !== null} onClick={() => void kararVer(t, 'rejected')}>
                      ✕ Reddet
                    </button>
                    <button type="button" className="buton buton--vurgu" disabled={calisan !== null} onClick={() => void kararVer(t, 'approved')}>
                      {calisan === t.id ? 'Gönderiliyor…' : '✓ Onayla'}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Sayfa>
  );
}
