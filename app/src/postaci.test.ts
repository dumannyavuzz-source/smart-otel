// Postacı: giden kutusu davranışı (002 · B.2). Ağa dokunmaz; sahte gönderici kullanır.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { telefonDeposu, type Mektup } from './telefonDeposu';
import { mektuplariGonder, type Gonderici } from './postaci';
import { aktifKullaniciyiAyarla } from './kullanici';

afterEach(() => vi.useRealTimers());

function mektup(id: string, sira: number): Mektup {
  return { id, sira, yazanId: 'ayse', tablo: 'room_cleanings', icerik: { id }, olusturuldu: '2026-09-15T10:00:00.000Z', deneme: 0 };
}

beforeEach(async () => {
  aktifKullaniciyiAyarla('ayse');
  await telefonDeposu.gidenKutusu.clear();
  await telefonDeposu.gidenKutusu.bulkAdd([mektup('yeni', 2), mektup('eski', 1)]);
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
it('başka kullanıcının mektuplarına dokunmaz; sahibi girince onlar da gider', async () => {
    await telefonDeposu.gidenKutusu.add({ ...mektup('mehmetin', 3), yazanId: 'mehmet' });
    const gidenler: string[] = [];
    const gonder: Gonderici = async (m) => {
      gidenler.push(m.id);
      return { ok: true };
    };

    await mektuplariGonder(gonder);                            // Ayşe girişli
    expect(gidenler).toEqual(['eski', 'yeni']);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(1);   // Mehmet'inki bekliyor

    aktifKullaniciyiAyarla('mehmet');
    await mektuplariGonder(gonder);
    expect(gidenler).toEqual(['eski', 'yeni', 'mehmetin']);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });

  it('kimse giriş yapmamışsa hiçbir şey gönderilmez', async () => {
    aktifKullaniciyiAyarla(null);
    let cagri = 0;
    await mektuplariGonder(async () => {
      cagri++;
      return { ok: true };
    });
    expect(cagri).toBe(0);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(2);
  });

  it('gönderici patlarsa (hata fırlatırsa) postacı kilitlenmez, mektup kaybolmaz, sonra yine dener', async () => {
    let patla = true;
    const gonder: Gonderici = async () => {
      if (patla) throw new TypeError('network down');
      return { ok: true };
    };

    await mektuplariGonder(gonder);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(2);
    expect((await telefonDeposu.gidenKutusu.get('eski'))?.sonHata).toBe('network down');

    patla = false;
    await mektuplariGonder(gonder);                            // kilit açık kaldıysa buraya gelir
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });

  it('kayıt gitti ama telefon silmeden kapandı: tekrar gönderilir, sunucu yok sayar, tepsi boşalır', async () => {
    const sunucudakiler = new Set<string>();
    let gonderim = 0;
    const gonder: Gonderici = async (m) => {
      gonderim++;
      sunucudakiler.add(m.id);                                 // aynı UUID: ikinci kez "yok sayılır", hata değil
      return { ok: true };
    };
    // "eski" aslında gitmiş ama silinememiş gibi: sunucuda zaten var
    sunucudakiler.add('eski');

    await mektuplariGonder(gonder);
    expect(gonderim).toBe(2);
    expect(sunucudakiler.size).toBe(2);                        // sunucuda tek kopya
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });

  it('kesin reddedilen mektup 3 denemeden sonra 10 dakikada bir denenir; diğerleri normal gider', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });        // yalnızca saat; IndexedDB zamanlayıcılarına dokunma
    vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'));
    let eskiDenemesi = 0;
    const gonder: Gonderici = async (m) => {
      if (m.id === 'eski') {
        eskiDenemesi++;
        return { ok: false, kalici: true, hata: 'check constraint' };
      }
      return { ok: true };
    };

    await mektuplariGonder(gonder);                            // 1. deneme, "yeni" gider
    await mektuplariGonder(gonder);                            // 2.
    await mektuplariGonder(gonder);                            // 3.
    await mektuplariGonder(gonder);                            // artık beklemede: denenmez
    expect(eskiDenemesi).toBe(3);
    expect((await telefonDeposu.gidenKutusu.get('eski'))?.kalici).toBe(true);

    vi.setSystemTime(new Date('2026-09-15T12:11:00.000Z'));   // 11 dk sonra
    await mektuplariGonder(gonder);
    expect(eskiDenemesi).toBe(4);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(1);   // hâlâ tepside: asla vazgeçilmez
  });
});
