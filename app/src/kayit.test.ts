// KAYIT — vitrinden gelen kişinin doldurduğu dört alan ve onay kutusu (Aşama 20 · karar 026).
// Denenen: eksik/bozuk bilgi sunucuya gitmeden anlaşılıyor mu ve kişiye ne yapacağı söyleniyor mu?
import { describe, expect, it } from 'vitest';
import { kayitDenetle, EN_KISA_SIFRE, type KayitBilgileri } from './kayit';

const GECERLI: KayitBilgileri = {
  otelAdi: 'Deniz Otel',
  ad: 'Yavuz Duman',
  eposta: 'yavuz@otel.test',
  sifre: 'gizli1234',
  onay: true,
};

describe('Dört alan', () => {
  it('doğru doldurulmuşsa sorun yoktur', () => {
    expect(kayitDenetle(GECERLI)).toBeNull();
    expect(kayitDenetle({ ...GECERLI, otelAdi: '  Deniz Otel  ' })).toBeNull();   // boşluklar sorun değil
  });

  it('otel adı olmadan kayıt olunmaz', () => {
    expect(kayitDenetle({ ...GECERLI, otelAdi: '' })).toBe('Otel adını yazın.');
    expect(kayitDenetle({ ...GECERLI, otelAdi: 'A' })).toBe('Otel adını yazın.');
    expect(kayitDenetle({ ...GECERLI, otelAdi: 'A'.repeat(81) })).toBe('Otel adı çok uzun.');
  });

  it('ad soyad sorulur', () => {
    expect(kayitDenetle({ ...GECERLI, ad: '   ' })).toBe('Adınızı yazın.');
    expect(kayitDenetle({ ...GECERLI, ad: 'A'.repeat(61) })).toBe('Adınız çok uzun.');
  });

  it('e-posta biçimi kontrol edilir', () => {
    expect(kayitDenetle({ ...GECERLI, eposta: 'bozuk' })).toBe('E-posta adresinizi kontrol edin.');
    expect(kayitDenetle({ ...GECERLI, eposta: 'a@b' })).toBe('E-posta adresinizi kontrol edin.');
    expect(kayitDenetle({ ...GECERLI, eposta: ' yavuz@otel.test ' })).toBeNull();
  });

  it('şifre en az sekiz karakter olmalı ve sebebi söylenir', () => {
    expect(kayitDenetle({ ...GECERLI, sifre: 'kisa' })).toBe(`Şifre en az ${EN_KISA_SIFRE} karakter olmalı.`);
    expect(kayitDenetle({ ...GECERLI, sifre: '12345678' })).toBeNull();
  });

  // Karar 026: yasal onay hesabın açıldığı anda, AÇIK EYLEMLE alınır.
  it('onay kutusu işaretlenmeden kayıt olunmaz', () => {
    expect(kayitDenetle({ ...GECERLI, onay: false }))
      .toBe('Devam etmek için Kullanım Şartları ve KVKK metnini onaylayın.');
  });

  it('onay, diğer alanlar doğruysa SON denetimdir (kişi tek seferde tek hata görür)', () => {
    // Şifre de eksikse önce şifre söylenir: kişi bir seferde bir şey düzeltir.
    expect(kayitDenetle({ ...GECERLI, sifre: 'kisa', onay: false }))
      .toBe(`Şifre en az ${EN_KISA_SIFRE} karakter olmalı.`);
  });
});
