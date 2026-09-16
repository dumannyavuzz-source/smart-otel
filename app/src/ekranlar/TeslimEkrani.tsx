// Teslim Al — Maker-Checker'ın son halkası, tek ekran:
//   1. "Kaç Kg geldi?"  (soru ürünün birimiyle sorulur: Kg · Litre · Koli · adet)
//   2. Fatura fotoğrafı (zorunlu)
//   3. Onaylanandan AZ girildiyse: eksik/hasar fotoğrafı da zorunlu (çürük domatesin kanıtı)
//   4. "Teslim Aldım" — bir imzadır: kim ve saat kaçta olduğunu veritabanı yazar.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Sayfa } from '../parcalar/Sayfa';
import { BuyukButon } from '../parcalar/BuyukButon';
import { FotografSecici } from '../parcalar/FotografSecici';
import {
  birimSorusu,
  eksikMetni,
  hasarFotografiGerekli,
  miktarMetni,
  teslimAlabilirMi,
  teslimAldim,
  teslimatGetir,
} from '../teslimler';
import type { Teslimat } from '../telefonDeposu';

const EN_FAZLA = 999;

export function TeslimEkrani() {
  const { id = '' } = useParams();
  const git = useNavigate();
  const [teslimat, setTeslimat] = useState<Teslimat | null | undefined>(undefined);   // undefined: aranıyor
  const [gelen, setGelen] = useState(0);
  const [fatura, setFatura] = useState<Blob | null>(null);
  const [hasar, setHasar] = useState<Blob | null>(null);
  const [not, setNot] = useState('');
  const [isleniyor, setIsleniyor] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    void teslimatGetir(id).then((bulunan) => {
      setTeslimat(bulunan ?? null);
      if (bulunan) setGelen(bulunan.onaylanan);      // en sık doğru cevap: onaylanan kadar geldi
    });
  }, [id]);

  if (teslimat === undefined) {
    return (
      <Sayfa baslik="Teslim Al" geri="/teslimler">
        <p className="soluk orta">Bakılıyor…</p>
      </Sayfa>
    );
  }

  if (teslimat === null) {
    return (
      <Sayfa baslik="Teslim Al" geri="/teslimler">
        <p className="orta">Bu sipariş listede yok. Teslim alınmış olabilir.</p>
      </Sayfa>
    );
  }

  // Aynı kural veritabanında da var; ekran sadece sebebini söyler.
  if (!teslimAlabilirMi(teslimat)) {
    return (
      <Sayfa baslik={teslimat.urun} geri="/teslimler">
        <p className="orta">Bu siparişi siz teslim alamazsınız: isteyen ya da onaylayan sizsiniz.</p>
        <p className="soluk orta">Üç adımı üç ayrı kişi imzalar. Başka bir arkadaşınız teslim alsın.</p>
      </Sayfa>
    );
  }

  const eksik = hasarFotografiGerekli(gelen, teslimat.onaylanan);
  const hazir = Boolean(fatura) && (!eksik || Boolean(hasar)) && !isleniyor && !gonderiliyor;

  async function gonder() {
    if (!teslimat || !fatura || !hazir) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      // Ekranda görünmeyen fotoğraf gönderilmez: miktar tekrar tam sayıya çıkarılırsa
      // (eksik yok artık) o fotoğraf da kayda geçmez. Görünen neyse giden odur.
      await teslimAldim(teslimat, gelen, fatura, eksik ? hasar : null, not);
    } catch (h) {
      setGonderiliyor(false);
      setHata(h instanceof Error ? h.message : 'Kaydedilemedi. Tekrar deneyin.');
      return;
    }
    git('/tamam', {
      replace: true,
      state: {
        mesaj: `${miktarMetni(gelen, teslimat.birim)} ${teslimat.urun} teslim alındı`,
        donus: { yol: '/teslimler', yazi: 'Teslimlere Dön' },
      },
    });
  }

  return (
    <Sayfa
      baslik={birimSorusu(teslimat.birim)}
      altBaslik={`${teslimat.urun} · ${miktarMetni(teslimat.onaylanan, teslimat.birim)} onaylandı`}
      geri="/teslimler"
    >
      <div className="sayac">
        <button type="button" className="buton" onClick={() => setGelen((g) => Math.max(0, g - 1))} aria-label="Azalt">
          −
        </button>
        <strong aria-live="polite">{gelen}</strong>
        <button type="button" className="buton" onClick={() => setGelen((g) => Math.min(EN_FAZLA, g + 1))} aria-label="Artır">
          +
        </button>
      </div>
      <p className="soluk orta">{miktarMetni(gelen, teslimat.birim)} geldi</p>

      <div className="soluk">Fatura / irsaliye fotoğrafı</div>
      <FotografSecici fotograf={fatura} onSec={setFatura} onIsleniyor={setIsleniyor} kucuk />

      {eksik && (
        <div className="uyari-blok">
          <strong>{eksikMetni(gelen, teslimat)}</strong>
          <p className="soluk">Eksiği ya da çürüğü fotoğraflayın. Kanıt olmadan eksik teslim kaydedilmez.</p>
          <FotografSecici fotograf={hasar} onSec={setHasar} onIsleniyor={setIsleniyor} kucuk />
        </div>
      )}

      <input
        className="alan"
        placeholder="Not (isteğe bağlı)"
        value={not}
        onChange={(e) => setNot(e.target.value)}
        maxLength={500}
      />

      {hata && <p className="orta" role="alert">{hata}</p>}

      <div className="esnek" />

      <BuyukButon ikon="✓" tur="vurgu" disabled={!hazir} onClick={() => void gonder()}>
        {gonderiliyor ? 'Kaydediliyor…' : 'Teslim Aldım'}
      </BuyukButon>
      {!fatura && <p className="soluk orta">Önce fatura fotoğrafını çekin.</p>}
      {fatura && eksik && !hasar && <p className="soluk orta">Eksik/hasar fotoğrafı da gerekiyor.</p>}
    </Sayfa>
  );
}
