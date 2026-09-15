// Beyanlar: önce telefona yazılır; içerik veritabanının beklediği biçimde olmalı.
import { beforeEach, describe, expect, it } from 'vitest';
import { telefonDeposu, type Oda } from './telefonDeposu';
import { SORUN_TURLERI, eksikVarBeyani, odaHazirBeyani, sorunAciklamasi, sorunBildirBeyani } from './beyanlar';
import { odayiBul } from './odalar';

const ODA: Oda = { id: 'oda-1', hotel_id: 'otel-1', number: '204', floor: '2', staff_code: 'a'.repeat(32) };

beforeEach(async () => {
  await telefonDeposu.gidenKutusu.clear();
  await telefonDeposu.odalar.clear();
});

describe('Beyanlar', () => {
  it('"Oda Hazır" giden kutusuna doğru içerikle konur; kimlik telefonda üretilir', async () => {
    const id = await odaHazirBeyani(ODA, ['Yatak', 'Banyo']);
    const m = await telefonDeposu.gidenKutusu.get(id);

    expect(m?.tablo).toBe('room_cleanings');
    expect(m?.icerik).toMatchObject({ id, hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Yatak', 'Banyo'] });
    expect(typeof m?.icerik.created_at_device).toBe('string');
    expect(m?.icerik).not.toHaveProperty('created_by');       // "kim"i veritabanı yazar, telefon değil
    expect(m?.deneme).toBe(0);
  });

  it('"Eksik Var" ürün ve adedi taşır', async () => {
    const id = await eksikVarBeyani(ODA, 'urun-havlu', 2);
    const m = await telefonDeposu.gidenKutusu.get(id);
    expect(m?.tablo).toBe('supply_reports');
    expect(m?.icerik).toMatchObject({ product_id: 'urun-havlu', quantity: 2 });
  });

  it('"Sorun Bildir": iki tür (Blueprint 3.1); haşere acil ve notsuz, arıza normal ve notlu', async () => {
    const [ariza, hasere] = SORUN_TURLERI;
    expect(SORUN_TURLERI.length).toBe(2);
    expect(hasere.severity).toBe('urgent');
    expect(hasere.notIster).toBe(false);
    expect(ariza.severity).toBe('normal');
    expect(ariza.notIster).toBe(true);

    const id = await sorunBildirBeyani(ODA, ariza, 'musluk damlıyor');
    const m = await telefonDeposu.gidenKutusu.get(id);
    expect(m?.tablo).toBe('issue_reports');
    expect(m?.icerik).toMatchObject({ severity: 'normal', description: 'Arıza: musluk damlıyor' });
  });

  it('açıklama boş notla tür etiketidir; 500 karakteri aşmaz', () => {
    const [ariza, hasere] = SORUN_TURLERI;
    expect(sorunAciklamasi(hasere, '')).toBe('Haşere');
    expect(sorunAciklamasi(ariza, '   ')).toBe('Arıza');
    expect(sorunAciklamasi(ariza, 'x'.repeat(1000)).length).toBe(500);
  });

  it('her beyanın kimliği farklıdır (aynı odaya iki beyan iki kayıt)', async () => {
    const a = await odaHazirBeyani(ODA, []);
    const b = await odaHazirBeyani(ODA, []);
    expect(a).not.toBe(b);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(2);
  });
});

describe('Oda arama', () => {
  it('oda telefondaysa uzağa sormaz (offline çalışır)', async () => {
    await telefonDeposu.odalar.put(ODA);
    let uzagaSoruldu = false;
    const oda = await odayiBul(ODA.staff_code, async () => {
      uzagaSoruldu = true;
      return null;
    });
    expect(oda?.number).toBe('204');
    expect(uzagaSoruldu).toBe(false);
  });

  it('oda telefonda yoksa uzağa sorar ve bulunca telefona yazar', async () => {
    const oda = await odayiBul(ODA.staff_code, async () => ODA);
    expect(oda?.id).toBe('oda-1');
    expect(await telefonDeposu.odalar.get('oda-1')).toBeDefined();
  });

  it('uzakta da yoksa null (yabancı veya kapalı oda)', async () => {
    expect(await odayiBul('b'.repeat(32), async () => null)).toBeNull();
  });
});
