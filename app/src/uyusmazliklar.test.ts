// TESLİMAT UYUŞMAZLIĞI — "onaylandığı gibi gelmedi" (Genel Müdür talebi, Aşama 17.1)
// Denenen kural: üç sayı (istenen · onaylanan · gelen) karşılaştırılır; uyuşmayan teslim
// müdüre kırmızı alarm olarak düşer, uyuşan teslim hiç görünmez.
import { describe, expect, it } from 'vitest';
import { uyusmazlikMetni, uyusmazliklariAyikla, type TeslimSatiri } from './uyusmazliklar';

const ADLAR = new Map([['ali', 'Ali']]);

function teslim(gelen: number, onaylanan: number, istenen = onaylanan, ozel: Partial<TeslimSatiri> = {}): TeslimSatiri {
  return {
    id: `teslim-${gelen}`,
    received_quantity: gelen,
    damage_photo_path: null,
    received_at: '2026-09-16T09:00:00.000Z',
    received_by: 'ali',
    purchase_requests: {
      quantity: istenen,
      products: { name: 'Domates', unit: 'Kg' },
      approvals: [{ approved_quantity: onaylanan }],
    },
    ...ozel,
  };
}

describe('Hangi teslim müdüre düşer?', () => {
  it('onaylandığı kadar gelen teslim alarm değildir', () => {
    expect(uyusmazliklariAyikla([teslim(10, 10)], ADLAR)).toEqual([]);
  });

  it('eksik gelen teslim alarmdır', () => {
    const [u] = uyusmazliklariAyikla([teslim(7.5, 10)], ADLAR);
    expect(u?.gelen).toBe(7.5);
    expect(u?.onaylanan).toBe(10);
    expect(uyusmazlikMetni(u!)).toBe('2,5 Kg eksik geldi');
  });

  it('fazla gelen teslim de alarmdır: onaylanmayan mal girmiştir', () => {
    const [u] = uyusmazliklariAyikla([teslim(12, 10)], ADLAR);
    expect(uyusmazlikMetni(u!)).toBe('2 Kg fazla geldi');
  });

  it('hiç gelmeyen teslim de alarmdır', () => {
    expect(uyusmazliklariAyikla([teslim(0, 4)], ADLAR)).toHaveLength(1);
  });
});

describe('Müdürün kartta gördüğü', () => {
  it('ürün, birim, üç sayı, kanıt fotoğrafı ve teslim alan kişinin adı', () => {
    const satir = teslim(7, 10, 12, { damage_photo_path: 'otel-1/deliveries/a-hasar.jpg' });
    const [u] = uyusmazliklariAyikla([satir], ADLAR);
    expect(u).toMatchObject({
      urun: 'Domates',
      birim: 'Kg',
      istenen: 12,
      onaylanan: 10,
      gelen: 7,
      kanitYolu: 'otel-1/deliveries/a-hasar.jpg',
      kimAldi: 'Ali',
    });
  });

  it('adı bilinmeyen kişi "Personel" diye yazılır, kart yine de gösterilir', () => {
    const [u] = uyusmazliklariAyikla([teslim(7, 10)], new Map());
    expect(u?.kimAldi).toBe('Personel');
  });

  it('onay kaydı okunamadıysa istenen miktar ölçü alınır (kart kaybolmaz)', () => {
    const satir = teslim(7, 0, 9);
    satir.purchase_requests!.approvals = null;
    const [u] = uyusmazliklariAyikla([satir], ADLAR);
    expect(u?.onaylanan).toBe(9);
    expect(uyusmazlikMetni(u!)).toBe('2 Kg eksik geldi');
  });
});

describe('Yok yere alarm çalmaz', () => {
  it('talebi okunamayan teslim alarma düşmez (eksik veriden kırmızı kutu üretilmez)', () => {
    const satir = teslim(7, 10);
    satir.purchase_requests = null;
    expect(uyusmazliklariAyikla([satir], ADLAR)).toEqual([]);
  });

  it('iki ondalıktan küçük fark alarm sayılmaz ("0 Kg fazla geldi" diye kutu çıkmaz)', () => {
    expect(uyusmazliklariAyikla([teslim(10.001, 10)], ADLAR)).toEqual([]);
  });
});
