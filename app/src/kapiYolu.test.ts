// KAPI YOLU — giriş yapınca nereye dönülür? (Aşama 2: /giris adresi)
// QR'dan gelen görevli aynı odada kalmalı; ama kapı, kimseyi başka bir siteye ya da kendine göndermemeli.
import { describe, expect, it } from 'vitest';
import { guvenliYol } from './kapiYolu';

describe('Giriş sonrası dönülecek yol', () => {
  it('uygulamanın kendi yoluna döner (QR ile gelen görevli aynı odada kalır)', () => {
    expect(guvenliYol('/oda/ABC')).toBe('/oda/ABC');
    expect(guvenliYol('/oda/ABC?x=1')).toBe('/oda/ABC?x=1');
    expect(guvenliYol('/panel/personel')).toBe('/panel/personel');
    expect(guvenliYol('/')).toBe('/');
  });

  it('yol yoksa ya da bozuksa ana ekrana düşer', () => {
    expect(guvenliYol(undefined)).toBe('/');
    expect(guvenliYol(null)).toBe('/');
    expect(guvenliYol('')).toBe('/');
    expect(guvenliYol(42)).toBe('/');
    expect(guvenliYol({ sonra: '/oda/ABC' })).toBe('/');
    expect(guvenliYol('oda/ABC')).toBe('/');
  });

  it('başka bir siteye çıkan adres kabul edilmez', () => {
    expect(guvenliYol('//kotu.site/oda')).toBe('/');
    expect(guvenliYol('/\\kotu.site')).toBe('/');
    expect(guvenliYol('https://kotu.site')).toBe('/');
    expect(guvenliYol('javascript:alert(1)')).toBe('/');
  });

  it('kapının kendisine dönmez (sonsuz döngü olmaz)', () => {
    expect(guvenliYol('/giris')).toBe('/');
    expect(guvenliYol('/giris/')).toBe('/');
    expect(guvenliYol('/giris?x=1')).toBe('/');
    // "/girisim" gibi bambaşka bir yol kapı değildir
    expect(guvenliYol('/girisim')).toBe('/girisim');
  });
});
