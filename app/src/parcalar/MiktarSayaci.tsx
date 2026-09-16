// Miktar sayacı: − ile azalt, + ile artır — ya da sayının üstüne dokunup yaz ("1,2").
// Yazma yolu şart: 1,2 Litre'ye yarımşar adımlarla ulaşılamaz.
// Adımı ve ondalık iznini BİRİM belirler (miktar.ts): Kg yarımşar, adet birer birer.
//
// Üç kuralı vardır, üçü de sahada yanlış kayıt yazılmasını önlemek içindir:
//   1. Sayılabilen birimde virgül yok sayılır ve SONRASI ATILIR ("2,5 Koli" → 2 Koli).
//      Yalnızca virgülü silmek "25" ederdi: on kat hata, doğrudan para.
//   2. Kutu boşaltılır ya da anlamsız bir şey yazılırsa en küçük değere düşer.
//      Eski sayı sessizce kaydedilmez: kimse yazmadığı bir miktarı imzalamaz.
//   3. Dışarıdan gelen sayı kurala uymuyorsa (ürün değişti, birim değişti) kendiliğinden düzeltilir.
//      Ekranda görünen sayı ile kaydedilecek sayı asla ayrışmaz.
import { useCallback, useEffect, useState } from 'react';
import { adim, bolunebilirMi, miktariSinirla, sayiOku, sayiYaz, yaziyiTemizle } from '../miktar';

interface Ozellikler {
  deger: number;
  onDegis: (yeni: number) => void;
  birim: string;
  enAz?: number;
  enFazla?: number;
}

export function MiktarSayaci({ deger, onDegis, birim, enAz = 0, enFazla = 999 }: Ozellikler) {
  const [yazilan, setYazilan] = useState<string | null>(null);   // null: kimse yazmıyor, gerçek sayı görünüyor
  const ondalikli = bolunebilirMi(birim);

  const sinirla = useCallback((sayi: number) => miktariSinirla(sayi, birim, enAz, enFazla), [birim, enAz, enFazla]);

  useEffect(() => {
    if (sinirla(deger) !== deger) onDegis(sinirla(deger));       // kural 3: sessiz uyuşmazlık kalmasın
  }, [deger, sinirla, onDegis]);

  function tusaBasildi(yeni: number) {
    setYazilan(null);                                            // yarım kalmış yazı silinir
    onDegis(sinirla(yeni));
  }

  function yazildi(metin: string) {
    const temiz = yaziyiTemizle(metin, birim);        // kural 1
    setYazilan(temiz);
    onDegis(sinirla(sayiOku(temiz) ?? enAz));         // kural 2
  }

  return (
    <div className="sayac">
      <button
        type="button"
        className="buton"
        disabled={deger <= enAz}
        onClick={() => tusaBasildi(deger - adim(birim))}
        aria-label="Azalt"
      >
        −
      </button>
      <input
        className="sayac-alan"
        type="text"
        inputMode={ondalikli ? 'decimal' : 'numeric'}
        value={yazilan ?? sayiYaz(deger)}
        onChange={(e) => yazildi(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => setYazilan(null)}                          // yazma bitti: ekran yine gerçek sayıyı gösterir
        aria-label="Miktar"
      />
      <button
        type="button"
        className="buton"
        disabled={deger >= enFazla}
        onClick={() => tusaBasildi(deger + adim(birim))}
        aria-label="Artır"
      >
        +
      </button>
    </div>
  );
}
