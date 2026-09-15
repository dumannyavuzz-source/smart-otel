import { describe, expect, it } from 'vitest';
import { baglantidanOdaKodu } from './qrOku';

const KOD = '0123456789abcdef0123456789abcdef';

describe('QR bağlantısından oda kodu', () => {
  it('tam bağlantıdan kodu ayıklar', () => {
    expect(baglantidanOdaKodu(`https://app.smartotel.com/oda/${KOD}`)).toBe(KOD);
  });

  it('sondaki / veya ?… ile de çalışır', () => {
    expect(baglantidanOdaKodu(`https://app.smartotel.com/oda/${KOD}/`)).toBe(KOD);
    expect(baglantidanOdaKodu(`https://app.smartotel.com/oda/${KOD}?k=1`)).toBe(KOD);
  });

  it('kodun kendisi verilse de kabul eder (boşluklar önemsiz)', () => {
    expect(baglantidanOdaKodu(`  ${KOD}\n`)).toBe(KOD);
  });

  it('yabancı QR → null', () => {
    expect(baglantidanOdaKodu('https://example.com/menu')).toBeNull();
    expect(baglantidanOdaKodu('WIFI:S:otel;P:1234;;')).toBeNull();
    expect(baglantidanOdaKodu('')).toBeNull();
  });

  it('bozuk veya kısa kod → null', () => {
    expect(baglantidanOdaKodu('https://app.smartotel.com/oda/KISA')).toBeNull();
    expect(baglantidanOdaKodu(`https://app.smartotel.com/oda/${KOD}x`)).toBeNull();
    expect(baglantidanOdaKodu(KOD.toUpperCase())).toBeNull();
  });
});
