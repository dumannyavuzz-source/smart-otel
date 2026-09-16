// MİKTAR — "7,5 Kg" var, "2,5 havlu" yok.
// Denenen kural: kesirli yazılabilir mi, nerede yazılamaz, ekrana Türkçe mi yazılıyor?
import { describe, expect, it } from 'vitest';
import {
  adim,
  birimAdi,
  birimSorusu,
  bolunebilirMi,
  miktarMetni,
  miktariSinirla,
  sayiOku,
  sayiYaz,
  yaziyiTemizle,
  yuvarla,
} from './miktar';

describe('Kararı birim verir', () => {
  it('Kg, Litre, gram bölünür; adet, Koli, Paket bölünmez', () => {
    expect(bolunebilirMi('Kg')).toBe(true);
    expect(bolunebilirMi('litre')).toBe(true);
    expect(bolunebilirMi('LT')).toBe(true);
    expect(bolunebilirMi('adet')).toBe(false);
    expect(bolunebilirMi('Koli')).toBe(false);
    expect(bolunebilirMi('')).toBe(false);          // birim yoksa "adet" sayılır
  });

  it('− + tuşu: bölünen birimde yarımşar, sayılan birimde birer birer', () => {
    expect(adim('Kg')).toBe(0.5);
    expect(adim('Litre')).toBe(0.5);
    expect(adim('adet')).toBe(1);
    expect(adim('Koli')).toBe(1);
  });
});

describe('Sayı ekrana Türkçe yazılır', () => {
  it('ondalık ayırıcı virgüldür, gereksiz sıfır yazılmaz', () => {
    expect(sayiYaz(7.5)).toBe('7,5');
    expect(sayiYaz(10)).toBe('10');
    expect(sayiYaz(1.2)).toBe('1,2');
    expect(sayiYaz(0.25)).toBe('0,25');
  });

  it('miktar her yerde birimiyle yazılır, çıplak sayı bırakılmaz', () => {
    expect(miktarMetni(7.5, 'Kg')).toBe('7,5 Kg');
    expect(miktarMetni(3, '')).toBe('3 adet');
    expect(birimAdi('  ')).toBe('adet');
    expect(birimSorusu('Litre')).toBe('Kaç Litre geldi?');
  });
});

describe('Kullanıcının yazdığı sayı', () => {
  it('virgülle de noktayla da yazılabilir', () => {
    expect(sayiOku('7,5')).toBe(7.5);
    expect(sayiOku('7.5')).toBe(7.5);
    expect(sayiOku(' 12 ')).toBe(12);
  });

  it('yarım kalmış ya da anlamsız yazı sayı sayılmaz (ekran eski sayıyı korur)', () => {
    expect(sayiOku('')).toBeNull();
    expect(sayiOku(',')).toBeNull();
    expect(sayiOku(',5')).toBe(0.5);          // "yarım kilo" diye yazan kullanıcı anlaşılır
    expect(sayiOku('abc')).toBeNull();
    expect(sayiOku('-3')).toBeNull();               // eksi miktar diye bir şey yok
  });

  it('"7," yazarken ekran bozulmaz: nokta sonrası boş kabul edilir', () => {
    expect(sayiOku('7,')).toBe(7);
  });
});

describe('Ondalık gürültüsü', () => {
  it('0,1 + 0,2 ekrana 0,3 diye yazılır', () => {
    expect(yuvarla(0.1 + 0.2)).toBe(0.3);
    expect(sayiYaz(0.1 + 0.2)).toBe('0,3');
  });

  it('iki ondalıktan fazlası yuvarlanır — veritabanı da öyle saklar', () => {
    expect(yuvarla(7.456)).toBe(7.46);
  });
});

describe('Birim büyük harfle yazılmış olabilir (müdür elle yazar)', () => {
  it('"LİTRE", "KİLO", "Lt." de bölünebilir sayılır', () => {
    // Türkçe tuzağı: "LİTRE".toLowerCase() noktalı bir i üretir; düz karşılaştırma bunu kaçırırdı
    // ve personel "1,2 Litre" yazamazdı.
    expect(bolunebilirMi('LİTRE')).toBe(true);
    expect(bolunebilirMi('LITRE')).toBe(true);
    expect(bolunebilirMi('KİLO')).toBe(true);
    expect(bolunebilirMi('Lt.')).toBe(true);
    expect(bolunebilirMi('kg.')).toBe(true);
    expect(bolunebilirMi('ŞİŞE')).toBe(false);
  });
});

describe('Sayacın kalbi: yazılanı temizleme', () => {
  it('sayılabilen birimde virgül ve sonrası ATILIR — "2,5" asla 25 olmaz', () => {
    expect(yaziyiTemizle('2,5', 'Koli')).toBe('2');     // on kat hata buradan çıkardı
    expect(yaziyiTemizle('2.5', 'adet')).toBe('2');
    expect(yaziyiTemizle('12,9', 'Paket')).toBe('12');
  });

  it('bölünen birimde virgül korunur', () => {
    expect(yaziyiTemizle('2,5', 'Kg')).toBe('2,5');
    expect(yaziyiTemizle('1,2', 'Litre')).toBe('1,2');
  });

  it('harf, boşluk ve eksi işareti hiç girmez', () => {
    expect(yaziyiTemizle('a1b,2c', 'Kg')).toBe('1,2');
    expect(yaziyiTemizle('-3', 'Kg')).toBe('3');
  });
});

describe('Sayacın kalbi: sayıyı kurala sokma', () => {
  it('sayılabilen birime kesirli sayı taşınamaz (ürün değişince kendiliğinden düzelir)', () => {
    expect(miktariSinirla(7.5, 'adet', 1, 999)).toBe(8);
    expect(miktariSinirla(7.5, 'Kg', 0.5, 999)).toBe(7.5);
  });

  it('alt ve üst sınır uygulanır', () => {
    expect(miktariSinirla(99999, 'Kg', 0, 999)).toBe(999);
    expect(miktariSinirla(0, 'adet', 1, 99)).toBe(1);
    expect(miktariSinirla(1.234, 'Kg', 0, 999)).toBe(1.23);
  });
});
