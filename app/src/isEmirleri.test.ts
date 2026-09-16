// İş emirleri (teknisyen): trafik lambası, sıra, Aldım/Çözdüm ve bodrum (offline) senaryosu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { telefonDeposu, type IsEmri } from './telefonDeposu';
import { acikIsler, bekleyenleriUygula, isiAl, isiCoz, kalanMs, sahiplik, sirala, sureMetni, trafikIsigi } from './isEmirleri';
import { mektuplariGonder, type Gonderici, type Yukleyici } from './postaci';
import { aktifKullaniciyiAyarla } from './kullanici';

const T0 = Date.parse('2026-09-15T12:00:00.000Z');
const dk = (n: number) => n * 60_000;

function isEmri(id: string, acilisDk: number, sureDk: number, ek: Partial<IsEmri> = {}): IsEmri {
  return {
    id,
    hotel_id: 'otel-1',
    room_id: 'oda-1',
    oda_no: '204',
    aciklama: 'Arıza: musluk',
    severity: sureDk <= 30 ? 'urgent' : 'normal',
    created_at: new Date(T0 + dk(acilisDk)).toISOString(),
    due_at: new Date(T0 + dk(acilisDk + sureDk)).toISOString(),
    assigned_to: null,
    status: 'open',
    ...ek,
  };
}

beforeEach(async () => {
  aktifKullaniciyiAyarla('ali');
  await telefonDeposu.gidenKutusu.clear();
  await telefonDeposu.fotograflar.clear();
  await telefonDeposu.isEmirleri.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe('Trafik lambası ve süre', () => {
  it('acil iş (30 dk): 20 dk kala yeşil, 10 dk kala sarı, süre geçince kırmızı', () => {
    const is = isEmri('w', 0, 30);
    expect(trafikIsigi(is, T0 + dk(10))).toBe('yesil');
    expect(trafikIsigi(is, T0 + dk(20))).toBe('sari');
    expect(trafikIsigi(is, T0 + dk(31))).toBe('kirmizi');
  });

  it('normal iş (2 saat): 1 saatten fazla kaldıysa yeşil, azsa sarı', () => {
    const is = isEmri('w', 0, 120);
    expect(trafikIsigi(is, T0 + dk(50))).toBe('yesil');
    expect(trafikIsigi(is, T0 + dk(70))).toBe('sari');
  });

  it('süre metni sade: "12 dk kaldı", "1 sa 20 dk kaldı", "25 dk geçti"', () => {
    expect(sureMetni(dk(12))).toBe('12 dk kaldı');
    expect(sureMetni(dk(80))).toBe('1 sa 20 dk kaldı');
    expect(sureMetni(dk(120))).toBe('2 sa kaldı');
    expect(sureMetni(-dk(25))).toBe('25 dk geçti');
    expect(sureMetni(0)).toBe('1 dk geçti');
    expect(kalanMs(isEmri('w', 0, 30), T0 + dk(5))).toBe(dk(25));
  });

  it('en az süresi kalan en üstte (açılış sırasına değil, son süreye göre)', () => {
    const erkenAcilanNormal = isEmri('normal', 0, 120);      // 14:00'a kadar
    const gecAcilanAcil = isEmri('acil', 30, 30);            // 13:00'a kadar
    const cokGec = isEmri('gec', 60, 120);                   // 15:00'a kadar
    expect(sirala([cokGec, erkenAcilanNormal, gecAcilanAcil]).map((i) => i.id)).toEqual(['acil', 'normal', 'gec']);
  });

  it('sahiplik: sahipsiz / bende / başkasında', () => {
    expect(sahiplik(isEmri('w', 0, 30))).toBe('sahipsiz');
    expect(sahiplik(isEmri('w', 0, 30, { assigned_to: 'ali' }))).toBe('bende');
    expect(sahiplik(isEmri('w', 0, 30, { assigned_to: 'ayse' }))).toBe('baskasinda');
  });
});

describe('Aldım / Çözdüm', () => {
  it('"Aldım": telefondaki kayıt anında güncellenir, güncelleme mektubu tepsiye konur', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30));
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);

    const yerel = await telefonDeposu.isEmirleri.get('w1');
    expect(yerel).toMatchObject({ assigned_to: 'ali', status: 'in_progress' });

    const [m] = await telefonDeposu.gidenKutusu.toArray();
    expect(m).toMatchObject({ tablo: 'work_orders', islem: 'guncelle', kosul: { id: 'w1' }, yazanId: 'ali' });
    expect(m?.icerik).toEqual({ assigned_to: 'ali', status: 'in_progress' });   // id / created_at_device eklenmez
  });

  it('"Çözdüm" fotoğrafla: fotoğraf tepside, yol otelin resolutions klasöründe; iş listeden düşer', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30, { assigned_to: 'ali', status: 'in_progress' }));
    const foto = new Blob([new Uint8Array(3)], { type: 'image/jpeg' });
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!, foto);

    const [m] = await telefonDeposu.gidenKutusu.toArray();
    expect(m?.icerik).toEqual({ status: 'resolved', resolved_photo_path: 'otel-1/resolutions/w1.jpg' });
    expect(m?.fotografYollari).toEqual(['otel-1/resolutions/w1.jpg']);
    expect(await telefonDeposu.fotograflar.count()).toBe(1);
    expect(await acikIsler()).toEqual([]);
  });

  it('"Çözdüm" fotoğrafsız: yalnızca durum gider', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30, { assigned_to: 'ali', status: 'in_progress' }));
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!, null);
    const [m] = await telefonDeposu.gidenKutusu.toArray();
    expect(m?.icerik).toEqual({ status: 'resolved' });
    expect(m?.fotografYollari).toBeUndefined();
  });

  it('sunucudan eski liste inse bile bodrumda yapılan Aldım/Çözdüm ezilmez', async () => {
    await telefonDeposu.isEmirleri.bulkPut([isEmri('w1', 0, 30), isEmri('w2', 0, 120)]);
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!);

    // "sunucudan indi": w1 hâlâ sahipsiz görünüyor (mektuplar henüz gitmedi)
    await telefonDeposu.isEmirleri.clear();
    await telefonDeposu.isEmirleri.bulkPut([isEmri('w1', 0, 30), isEmri('w2', 0, 120)]);
    await bekleyenleriUygula();

    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: 'ali', status: 'resolved' });
    expect((await acikIsler()).map((i) => i.id)).toEqual(['w2']);
  });
});

describe('Postacı ve iş emirleri', () => {
  const gonderici = (kayit: string[], reddet?: (id: string) => boolean): Gonderici => async (m) => {
    const hedef = String(m.kosul?.id ?? m.id);
    if (reddet?.(hedef)) return { ok: false, kalici: true, hata: 'Çözülmüş iş emri değiştirilemez.' };
    kayit.push(`${m.islem ?? 'ekle'}:${hedef}:${String(m.icerik.status ?? '')}`);
    return { ok: true };
  };
  const yukleyici = (kayit: string[]): Yukleyici => async (yol) => {
    kayit.push(`foto:${yol}`);
    return { ok: true };
  };

  it('bodrum: Aldım + Çözdüm (fotoğraflı) offline yazılır; internet gelince önce Aldım, sonra fotoğraf, sonra Çözdüm', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30));
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!, new Blob([new Uint8Array(2)], { type: 'image/jpeg' }));

    const kayit: string[] = [];
    await mektuplariGonder(gonderici(kayit), yukleyici(kayit));
    expect(kayit).toEqual([]);                                   // uçak modu: hiçbir şey gitmedi
    expect(await telefonDeposu.gidenKutusu.count()).toBe(2);

    vi.stubGlobal('navigator', { onLine: true });
    await mektuplariGonder(gonderici(kayit), yukleyici(kayit));
    expect(kayit).toEqual(['guncelle:w1:in_progress', 'foto:otel-1/resolutions/w1.jpg', 'guncelle:w1:resolved']);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
    expect(await telefonDeposu.fotograflar.count()).toBe(0);
  });

  it('sunucu güncellemeyi kesin reddederse (iş çoktan kapanmış) mektup düşer, sonrakiler gider', async () => {
    await telefonDeposu.isEmirleri.bulkPut([isEmri('w1', 0, 30), isEmri('w2', 0, 30)]);
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);
    await isiAl((await telefonDeposu.isEmirleri.get('w2'))!);

    const kayit: string[] = [];
    await mektuplariGonder(gonderici(kayit, (id) => id === 'w1'), yukleyici(kayit));

    expect(kayit).toEqual(['guncelle:w2:in_progress']);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);      // reddedilen düştü, "gönderilemedi" uyarısı yok
  });
});
