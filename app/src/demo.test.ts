import { describe, expect, it } from 'vitest';
import { demoBitti, kalanGun, sayacGorunsunMu, sonGunlerMi } from './demo';

const SIMDI = new Date('2026-09-17T10:00:00.000Z');
const ileri = (gun: number, saat = 0) =>
  new Date(SIMDI.getTime() + gun * 24 * 60 * 60 * 1000 + saat * 60 * 60 * 1000).toISOString();

describe('kalanGun', () => {
  it('başlamış günü kalan sayar: 2 gün 3 saat kaldıysa cevap 3', () => {
    expect(kalanGun(ileri(2, 3), SIMDI)).toBe(3);
  });

  it('tam 30 gün kaldıysa 30 der', () => {
    expect(kalanGun(ileri(30), SIMDI)).toBe(30);
  });

  it('süre dolmuşsa 0 der, eksiye düşmez', () => {
    expect(kalanGun(ileri(-5), SIMDI)).toBe(0);
  });

  it('tarih bilinmiyorsa "bilmiyorum" der (null); 0 ile karıştırmaz', () => {
    expect(kalanGun(null, SIMDI)).toBeNull();
    expect(kalanGun(undefined, SIMDI)).toBeNull();
    expect(kalanGun('bozuk tarih', SIMDI)).toBeNull();
  });
});

describe('demoBitti', () => {
  it('tarih geçmişse bitmiştir', () => {
    expect(demoBitti(ileri(-1), SIMDI)).toBe(true);
  });

  it('tarih ileride ise bitmemiştir', () => {
    expect(demoBitti(ileri(1), SIMDI)).toBe(false);
  });

  // En önemli deneme: bilinmezlik yüzünden kimse kilitlenmez.
  it('tarih bilinmiyorsa KİLİTLEMEZ', () => {
    expect(demoBitti(null, SIMDI)).toBe(false);
    expect(demoBitti(undefined, SIMDI)).toBe(false);
    expect(demoBitti('bozuk tarih', SIMDI)).toBe(false);
  });
});

describe('sonGunlerMi', () => {
  it('7 gün ve altı son günlerdir', () => {
    expect(sonGunlerMi(7)).toBe(true);
    expect(sonGunlerMi(1)).toBe(true);
  });

  it('8 gün ve üstü son günler değildir', () => {
    expect(sonGunlerMi(8)).toBe(false);
  });

  it('süre dolduysa sayaç değil, ödeme duvarı görünür', () => {
    expect(sonGunlerMi(0)).toBe(false);
  });
});

describe('sayacGorunsunMu', () => {
  it('demo penceresinde görünür', () => {
    expect(sayacGorunsunMu(30)).toBe(true);
  });

  it('süre bizim tarafımızdan uzatıldıysa kaybolur (ödeyen otel sayaç görmez)', () => {
    expect(sayacGorunsunMu(365)).toBe(false);
  });
});
