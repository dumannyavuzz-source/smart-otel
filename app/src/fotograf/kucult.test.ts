import { describe, expect, it } from 'vitest';
import { hedefBoyut } from './kucult';

describe('Fotoğraf hedef boyutu', () => {
  it('büyük fotoğrafı en uzun kenar 1280 olacak şekilde küçültür, oranı korur', () => {
    expect(hedefBoyut(4000, 3000)).toEqual({ genislik: 1280, yukseklik: 960 });
    expect(hedefBoyut(3000, 4000)).toEqual({ genislik: 960, yukseklik: 1280 });   // dikey fotoğraf
  });

  it('küçük fotoğrafı büyütmez', () => {
    expect(hedefBoyut(800, 600)).toEqual({ genislik: 800, yukseklik: 600 });
  });

  it('saçma değerlerde çökmez', () => {
    expect(hedefBoyut(0, 0)).toEqual({ genislik: 1, yukseklik: 1 });
  });
});
