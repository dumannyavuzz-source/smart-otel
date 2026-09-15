// Beyanlar: önce telefona yazılır; içerik veritabanının beklediği biçimde olmalı.
import { beforeEach, describe, expect, it } from 'vitest';
import { telefonDeposu, type Oda } from './telefonDeposu';
import { SORUN_TURLERI, bekleyenFotografSayisi, eksikVarBeyani, odaHazirBeyani, sorunAciklamasi, sorunBildirBeyani } from './beyanlar';
import { odayiBul } from './odalar';
import { aktifKullaniciyiAyarla } from './kullanici';

const ODA: Oda = { id: 'oda-1', hotel_id: 'otel-1', number: '204', floor: '2', staff_code: 'a'.repeat(32) };

beforeEach(async () => {
  aktifKullaniciyiAyarla('ayse');
  await telefonDeposu.gidenKutusu.clear();
  await telefonDeposu.odalar.clear();
  await telefonDeposu.fotograflar.clear();
});

describe('Beyanlar', () => {
  it('"Oda Hazır" giden kutusuna doğru içerikle konur; kimlik telefonda üretilir', async () => {
    const id = await odaHazirBeyani(ODA, ['Yatak', 'Banyo']);
    const m = await telefonDeposu.gidenKutusu.get(id);

    expect(m?.tablo).toBe('room_cleanings');
    expect(m?.icerik).toMatchObject({ id, hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Yatak', 'Banyo'] });
    expect(typeof m?.icerik.created_at_device).toBe('string');
    expect(m?.icerik).not.toHaveProperty('created_by');       // "kim"i veritabanı yazar, telefon değil
    expect(m?.yazanId).toBe('ayse');                           // ama telefon kimin yazdığını bilir (ortak telefon)
    expect(m?.deneme).toBe(0);
  });

  it('"Eksik Var" ürün ve adedi taşır', async () => {
    const id = await eksikVarBeyani(ODA, 'urun-havlu', 2);
    const m = await telefonDeposu.gidenKutusu.get(id);
    expect(m?.tablo).toBe('supply_reports');
    expect(m?.icerik).toMatchObject({ product_id: 'urun-havlu', quantity: 2 });
  });

  it('"Sorun Bildir": iki tür (Blueprint 3.1); haşere acil, arıza normal', async () => {
    const [ariza, hasere] = SORUN_TURLERI;
    expect(SORUN_TURLERI.length).toBe(2);
    expect(hasere.severity).toBe('urgent');
    expect(ariza.severity).toBe('normal');

    const id = await sorunBildirBeyani(ODA, ariza, 'musluk damlıyor');
    const m = await telefonDeposu.gidenKutusu.get(id);
    expect(m?.tablo).toBe('issue_reports');
    expect(m?.icerik).toMatchObject({ severity: 'normal', description: 'Arıza: musluk damlıyor' });
    expect(m?.icerik).not.toHaveProperty('photo_path');   // fotoğrafsız gönderildi
    expect(m?.fotografYolu).toBeUndefined();
  });

  it('"Sorun Bildir" fotoğrafla: fotoğraf tepside bekler, mektup yolunu taşır', async () => {
    const [, hasere] = SORUN_TURLERI;
    const foto = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });

    const id = await sorunBildirBeyani(ODA, hasere, '', foto);
    const m = await telefonDeposu.gidenKutusu.get(id);
    const beklenenYol = `otel-1/issues/${id}.jpg`;

    expect(m?.fotografYolu).toBe(beklenenYol);
    expect(m?.icerik.photo_path).toBe(beklenenYol);         // veritabanı kuralı: yol otelin klasörüyle başlar
    const bekleyen = await telefonDeposu.fotograflar.get(beklenenYol);
    expect(bekleyen?.veri.size).toBe(4);
    expect(bekleyen?.veri.type).toBe('image/jpeg');            // tür de korunur
    expect(await bekleyenFotografSayisi()).toBe(1);
  });

  it('açıklama boş notla tür etiketidir; 500 karakteri aşmaz', () => {
    const [ariza, hasere] = SORUN_TURLERI;
    expect(sorunAciklamasi(hasere, '')).toBe('Haşere');
    expect(sorunAciklamasi(ariza, '   ')).toBe('Arıza');
    expect(sorunAciklamasi(ariza, 'x'.repeat(1000)).length).toBe(500);
  });

  it('her beyanın kimliği farklıdır ve sıra numarası artar (aynı milisaniyede bile)', async () => {
    const a = await odaHazirBeyani(ODA, []);
    const b = await odaHazirBeyani(ODA, []);
    const c = await odaHazirBeyani(ODA, []);
    expect(new Set([a, b, c]).size).toBe(3);
    const siralar = (await telefonDeposu.gidenKutusu.bulkGet([a, b, c])).map((m) => m?.sira);
    expect(siralar).toEqual([1, 2, 3]);
  });

  it('giriş yoksa beyan yazılamaz', async () => {
    aktifKullaniciyiAyarla(null);
    await expect(odaHazirBeyani(ODA, [])).rejects.toThrow('Giriş gerekli');
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });

  it('50 fotoğraf sınırı: 51. fotoğraflı beyan reddedilir, tepsiye hiçbir şey yazılmaz', async () => {
    const [, hasere] = SORUN_TURLERI;
    const foto = new Blob([new Uint8Array(2)], { type: 'image/jpeg' });
    for (let i = 0; i < 50; i++) await sorunBildirBeyani(ODA, hasere, '', foto);
    await expect(sorunBildirBeyani(ODA, hasere, '', foto)).rejects.toThrow('Bekleyen fotoğraf çok');
    expect(await telefonDeposu.fotograflar.count()).toBe(50);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(50);   // mektup da yazılmadı: ya ikisi ya hiçbiri
    await sorunBildirBeyani(ODA, hasere, '');                    // fotoğrafsız yol açık kalır
    expect(await telefonDeposu.gidenKutusu.count()).toBe(51);
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
