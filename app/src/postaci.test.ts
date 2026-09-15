// Postacı: giden kutusu davranışı (002 · B.2). Ağa dokunmaz; sahte gönderici kullanır.
import { beforeEach, describe, expect, it } from 'vitest';
import { telefonDeposu, type Mektup } from './telefonDeposu';
import { mektuplariGonder, type Gonderici } from './postaci';

function mektup(id: string, saat: string): Mektup {
  return { id, tablo: 'room_cleanings', icerik: { id }, olusturuldu: saat, deneme: 0 };
}

beforeEach(async () => {
  await telefonDeposu.gidenKutusu.clear();
  await telefonDeposu.gidenKutusu.bulkAdd([
    mektup('yeni', '2026-09-15T10:05:00.000Z'),
    mektup('eski', '2026-09-15T10:00:00.000Z'),
  ]);
});

describe('Postacı', () => {
  it('mektupları eskiden yeniye gönderir ve tepsiden kaldırır', async () => {
    const gidenler: string[] = [];
    const gonder: Gonderici = async (m) => {
      gidenler.push(m.id);
      return { ok: true };
    };

    await mektuplariGonder(gonder);

    expect(gidenler).toEqual(['eski', 'yeni']);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });

  it('internet kesikse durur; mektuplar tepside kalır, deneme sayılır', async () => {
    let cagri = 0;
    const gonder: Gonderici = async () => {
      cagri++;
      return { ok: false, kalici: false, hata: 'Failed to fetch' };
    };

    await mektuplariGonder(gonder);

    expect(cagri).toBe(1);                                     // ilk mektupta durdu, ikincisini denemedi
    expect(await telefonDeposu.gidenKutusu.count()).toBe(2);
    const eski = await telefonDeposu.gidenKutusu.get('eski');
    expect(eski?.deneme).toBe(1);
    expect(eski?.sonHata).toBe('Failed to fetch');
  });

  it('sunucu bir mektubu reddederse onu işaretler, diğerlerine devam eder', async () => {
    const gonder: Gonderici = async (m) =>
      m.id === 'eski'
        ? { ok: false, kalici: true, hata: 'new row violates row-level security policy' }
        : { ok: true };

    await mektuplariGonder(gonder);

    expect(await telefonDeposu.gidenKutusu.count()).toBe(1);   // reddedilen kaldı, diğeri gitti
    const kalan = await telefonDeposu.gidenKutusu.get('eski');
    expect(kalan?.sonHata).toContain('row-level security');
    expect(await telefonDeposu.gidenKutusu.get('yeni')).toBeUndefined();
  });

  it('ikinci kez çağrılınca kalan mektubu yeniden dener (asla vazgeçmez)', async () => {
    let kesik = true;
    const gonder: Gonderici = async () => (kesik ? { ok: false, kalici: false, hata: 'kesik' } : { ok: true });

    await mektuplariGonder(gonder);                            // internet yok
    expect(await telefonDeposu.gidenKutusu.count()).toBe(2);

    kesik = false;
    await mektuplariGonder(gonder);                            // internet geldi
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });
});
