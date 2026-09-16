// ŞİFRE YENİLEME — müdürün panelden yaptığı beş saniyelik iş (Aşama 19.1).
// Burada denenen, ekrandan önce gelen iki kural: şifre yeterince uzun mu ve
// önerilen şifre telefonda okunup yazılabilir mi?
import { describe, expect, it } from 'vitest';
import { EN_KISA_SIFRE, sifreGecerliMi, sifreOner } from './panel';

describe('Şifre yeterince uzun mu?', () => {
  it('sekiz karakterden kısası kabul edilmez', () => {
    expect(sifreGecerliMi('kisa')).toBe(false);
    expect(sifreGecerliMi('1234567')).toBe(false);
    expect(sifreGecerliMi('')).toBe(false);
  });

  it('sekiz karakter ve üstü kabul edilir', () => {
    expect(sifreGecerliMi('12345678')).toBe(true);
    expect(sifreGecerliMi('kule-4821')).toBe(true);
    expect(EN_KISA_SIFRE).toBe(8);
  });

  it('akıl almaz uzunluk kabul edilmez (sunucu da reddeder)', () => {
    expect(sifreGecerliMi('a'.repeat(129))).toBe(false);
  });
});

describe('Önerilen şifre', () => {
  it('"kelime-kelime-1234" biçimindedir ve kuralı geçer', () => {
    for (let i = 0; i < 30; i += 1) {
      const oneri = sifreOner();
      expect(oneri).toMatch(/^[a-z]+-[a-z]+-\d{4}$/);
      expect(sifreGecerliMi(oneri)).toBe(true);
    }
  });

  it('iki kelime hep farklıdır ("kule-kule-4821" olmaz)', () => {
    for (let i = 0; i < 60; i += 1) {
      const [birinci, ikinci] = sifreOner().split('-');
      expect(birinci).not.toBe(ikinci);
    }
  });

  it('tahmin alanı geniştir: 200 öneri neredeyse hiç tekrar etmez', () => {
    // Tek kelimeli eski biçim yalnızca 90 bin ihtimaldi; iki kelimeyle 20 milyonu aşar.
    const uretilenler = new Set(Array.from({ length: 200 }, () => sifreOner()));
    expect(uretilenler.size).toBeGreaterThan(190);
  });

  it('Türkçe harf içermez: personel hangi klavyeyle yazarsa yazsın aynı tuşlara basar', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(sifreOner()).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
    }
  });

  it('her seferinde aynı şifreyi vermez', () => {
    const uretilenler = new Set(Array.from({ length: 40 }, () => sifreOner()));
    expect(uretilenler.size).toBeGreaterThan(1);
  });
});
