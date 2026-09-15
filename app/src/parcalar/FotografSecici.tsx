// Fotoğraf çek: telefonun kendi kamerasını açan tek büyük buton.
// Çekilince küçük bir önizleme ve "Yeniden çek". Karmaşa yok, galeri yok, düzenleme yok.
import { useEffect, useRef, useState } from 'react';
import { fotografiKucult } from '../fotograf/kucult';

interface Ozellikler {
  fotograf: Blob | null;
  onSec: (fotograf: Blob | null) => void;
  onIsleniyor?: (isleniyor: boolean) => void;   // üst ekran bu sırada Gönder'i kapatır
}

export function FotografSecici({ fotograf, onSec, onIsleniyor }: Ozellikler) {
  const girdiRef = useRef<HTMLInputElement>(null);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [isleniyor, setIsleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  // Önizleme adresi: fotoğraf değişince yenisi, eskisi serbest bırakılır
  useEffect(() => {
    if (!fotograf) {
      setOnizleme(null);
      return;
    }
    const adres = URL.createObjectURL(fotograf);
    setOnizleme(adres);
    return () => URL.revokeObjectURL(adres);
  }, [fotograf]);

  function islemeDurumu(durum: boolean) {
    setIsleniyor(durum);
    onIsleniyor?.(durum);
  }

  async function dosyaSecildi(dosya: File | undefined) {
    if (!dosya) return;                              // kamera iptal edildi
    setHata(null);
    islemeDurumu(true);
    try {
      onSec(await fotografiKucult(dosya));
    } catch {
      setHata('Fotoğraf alınamadı. Tekrar deneyin.');
    } finally {
      islemeDurumu(false);
      if (girdiRef.current) girdiRef.current.value = '';   // aynı fotoğraf tekrar seçilebilsin
    }
  }

  return (
    <div className="fotograf-blok">
      <input
        ref={girdiRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void dosyaSecildi(e.target.files?.[0])}
      />

      {onizleme ? (
        <>
          <img className="fotograf-onizleme" src={onizleme} alt="Çekilen fotoğraf" />
          <button
            type="button"
            className="buton buton--geri"
            onClick={() => girdiRef.current?.click()}
            disabled={isleniyor}
          >
            {isleniyor ? 'Hazırlanıyor…' : '📷 Yeniden çek'}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="buton buton--ana buton--dev"
          onClick={() => girdiRef.current?.click()}
          disabled={isleniyor}
        >
          <span className="ikon" aria-hidden="true">📷</span>
          <span>{isleniyor ? 'Hazırlanıyor…' : 'Fotoğraf Çek'}</span>
        </button>
      )}

      {hata && <p className="orta" role="alert">{hata}</p>}
    </div>
  );
}
