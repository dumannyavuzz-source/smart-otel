// Kayıtlarım (karar 028): giriş yapan kişinin telefondaki kayıtları — başkasınınki hiç görünmez.
//   Dikkat     → sunucu kabul etmedi ya da çakıştı: nedeni, fotoğrafı ve "Arşivle" düğmesiyle
//   Bekleyen   → telefona kaydedildi, bu otelde gönderilecek / doğrulanıyor
//   Diğer otel → başka otelinizde bekliyor; o otele geçince gönderilir (silinmez)
//   Tamamlanan → sunucuda kişi + otel + içerikle doğrulandı (yalnızca özet; kendiliğinden silinmez)
//   Arşiv      → "gördüm" dediğiniz reddedilen kayıtlar; silinmez
// Kesin reddedilen kayıt buradan yeniden gönderilmez (bu aşamada elle yeniden gönderme yok).
//
// Ortak telefon: kişi her sorguda YENİDEN okunur. Geç dönen bir sorgu (eski kişinin, ya da yerine yenisi
// başlamış olan) ekrana yazılmaz; çizerken de sahibi bugünkü kişi olmayan hiçbir kayıt ve fotoğraf gösterilmez.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Sayfa } from '../parcalar/Sayfa';
import { arsivle, kaydinFotograflari, kayitlariGrupla, kisininKayitlari, type Kayit } from '../kayitDeposu';
import { aktifKullanici, aktifProfil } from '../kullanici';
import { CIKIS_OLAYI, KUTU_DEGISTI_OLAYI, YENI_MEKTUP_OLAYI } from '../olaylar';

function zaman(iso: string | undefined): string {
  if (!iso) return '';
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

// Fotoğraf önizlemesi — yalnızca kaydın sahibine (kaydinFotograflari sahibi kontrol eder)
function Fotograflar({ kayit }: { kayit: Kayit }) {
  const [adresler, setAdresler] = useState<string[]>([]);
  useEffect(() => {
    let iptal = false;
    let olusan: string[] = [];
    void kaydinFotograflari(kayit, aktifKullanici()).then((fotolar) => {
      // Cevap gelene kadar ekran kapandıysa ya da kişi değiştiyse fotoğraf gösterilmez
      if (iptal || aktifKullanici() !== kayit.yazanId) return;
      olusan = fotolar.map((f) => URL.createObjectURL(f.veri));
      setAdresler(olusan);
    });
    return () => {
      iptal = true;
      olusan.forEach((a) => URL.revokeObjectURL(a));
    };
  }, [kayit]);
  if (adresler.length === 0 || aktifKullanici() !== kayit.yazanId) return null;
  return (
    <>
      {adresler.map((a) => (
        <img key={a} src={a} alt="Kayıttaki fotoğraf" className="fotograf-onizleme" />
      ))}
    </>
  );
}

function Kart({ kayit, children }: { kayit: Kayit; children?: ReactNode }) {
  return (
    <div className="kart">
      <strong>{kayit.ozet}</strong>
      <span className="soluk">Yazıldı: {zaman(kayit.olusturuldu)}</span>
      {children}
    </div>
  );
}

const DIKKAT_BASLIGI: Record<string, string> = {
  reddedildi: 'Sunucu kabul etmedi',
  cakisma: 'Sunucuda farklı bir kayıtla çakıştı',
};

// Ekrandaki liste, kimin için okunduğuyla birlikte tutulur
interface Okunan {
  kisi: string;
  kayitlar: Kayit[];
}

export function KayitlarimEkrani() {
  const [okunan, setOkunan] = useState<Okunan | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const sonSorgu = useRef(0);
  const ben = aktifKullanici();
  const otel = aktifProfil()?.otelId || null;

  const yukle = useCallback(() => {
    const kisi = aktifKullanici();                       // her seferinde GÜNCEL kişi
    const no = ++sonSorgu.current;
    if (!kisi) {
      setOkunan(null);
      return;
    }
    void kisininKayitlari(kisi).then((liste) => {
      // Geç dönen sorgu: yerine yenisi başladıysa ya da kişi değiştiyse atılır
      if (no !== sonSorgu.current || aktifKullanici() !== kisi) return;
      setOkunan({ kisi, kayitlar: liste });
    });
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle, ben]);                                      // kişi değişince yeniden okunur

  useEffect(() => {
    window.addEventListener(KUTU_DEGISTI_OLAYI, yukle);
    window.addEventListener(YENI_MEKTUP_OLAYI, yukle);
    window.addEventListener(CIKIS_OLAYI, yukle);
    return () => {
      window.removeEventListener(KUTU_DEGISTI_OLAYI, yukle);
      window.removeEventListener(YENI_MEKTUP_OLAYI, yukle);
      window.removeEventListener(CIKIS_OLAYI, yukle);
    };
  }, [yukle]);

  async function arsiveKaldir(id: string) {
    setHata(null);
    if (!(await arsivle(id, aktifKullanici()))) setHata('Bu kayıt arşivlenemedi.');
    yukle();
  }

  // Çizerken son kez: liste bugünkü kişi için okunmadıysa gösterilmez; sahibi başkası olan kayıt hiç çizilmez.
  const kayitlar = okunan && ben && okunan.kisi === ben ? okunan.kayitlar.filter((k) => k.yazanId === ben) : null;

  if (!kayitlar) {
    return (
      <Sayfa baslik="Kayıtlarım" geri="/">
        <p className="soluk orta">Bakılıyor…</p>
      </Sayfa>
    );
  }

  const { dikkat, bekleyen, digerOtel, tamamlanan, arsiv } = kayitlariGrupla(kayitlar, otel);

  return (
    <Sayfa baslik="Kayıtlarım" geri="/">
      {hata && <p className="orta" role="alert">{hata}</p>}
      {kayitlar.length === 0 && <p className="soluk orta">Telefonda kaydınız yok.</p>}

      {dikkat.length > 0 && (
        <section className="liste" aria-label="Kabul edilmeyenler">
          <h2>Kabul edilmeyenler</h2>
          {dikkat.map((k) => (
            <Kart key={k.id} kayit={k}>
              <span className="alarm-metin">{DIKKAT_BASLIGI[k.durum]}</span>
              {k.neden && <span>{k.neden}</span>}
              <span className="soluk">Kayıt ve fotoğrafı telefonda saklandı. Gerekirse yöneticinize gösterin.</span>
              <Fotograflar kayit={k} />
              <button type="button" className="buton buton--geri" onClick={() => void arsiveKaldir(k.id)}>
                Gördüm, arşivle
              </button>
            </Kart>
          ))}
        </section>
      )}

      {bekleyen.length > 0 && (
        <section className="liste" aria-label="Bekleyenler">
          <h2>Telefona kaydedildi</h2>
          {bekleyen.map((k) => (
            <Kart key={k.id} kayit={k}>
              <span className="soluk">
                {k.durum === 'belirsiz' ? 'Sunucuda doğrulanıyor.' : 'İnternet gelince gönderilecek.'}
              </span>
            </Kart>
          ))}
        </section>
      )}

      {digerOtel.length > 0 && (
        <section className="liste" aria-label="Diğer otellerde bekleyenler">
          <h2>Başka otelde bekleyen</h2>
          {digerOtel.map((k) => (
            <Kart key={k.id} kayit={k}>
              <span className="soluk">
                {k.otelId === null
                  ? 'Oteli henüz bilinmiyor; internet gelince sunucudan öğrenilecek.'
                  : 'Bu kayıt başka otelinize ait. O otele geçince gönderilir.'}
              </span>
            </Kart>
          ))}
        </section>
      )}

      {tamamlanan.length > 0 && (
        <section className="liste" aria-label="Sunucuda tamamlananlar">
          <h2>Sunucuda tamamlandı</h2>
          {tamamlanan.map((k) => (
            <Kart key={k.id} kayit={k}>
              <span className="soluk">✓ Doğrulandı: {zaman(k.tamamlandi)}</span>
            </Kart>
          ))}
        </section>
      )}

      {arsiv.length > 0 && (
        <section className="liste" aria-label="Arşiv">
          <h2>Arşiv</h2>
          {arsiv.map((k) => (
            <Kart key={k.id} kayit={k}>
              <span className="soluk">{DIKKAT_BASLIGI[k.durum]} · arşivlendi {zaman(k.arsivlendi)}</span>
              {k.neden && <span className="soluk">{k.neden}</span>}
            </Kart>
          ))}
        </section>
      )}
    </Sayfa>
  );
}
