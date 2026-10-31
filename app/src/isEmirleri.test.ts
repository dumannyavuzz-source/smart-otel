// İş emirleri (teknisyen): trafik lambası, sıra, Aldım/Çözdüm ve bodrum (offline) senaryosu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { telefonDeposu, type IsEmri } from './telefonDeposu';
import { kayitDeposu } from './kayitDeposu';
import { acikIsler, bekleyenleriUygula, isiAl, isiCoz, kalanMs, sahiplik, sirala, sureMetni, trafikIsigi } from './isEmirleri';
import { mektuplariGonder } from './postaci';
import { isEmriSatiri, sahteSunucu, satirAl, satirEkle } from './testYardimcilari/sahteSunucu';
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
  aktifKullaniciyiAyarla('ali', 'otel-1');
  await kayitDeposu.kayitlar.clear();
  await kayitDeposu.fotograflar.clear();
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
  it('"Aldım": telefondaki kayıt anında güncellenir ve "onay bekliyor" olur, güncelleme kaydı kutuya konur', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30));
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);

    const yerel = await telefonDeposu.isEmirleri.get('w1');
    expect(yerel).toMatchObject({ assigned_to: 'ali', status: 'in_progress', onayBekliyor: true });

    const [m] = await kayitDeposu.kayitlar.toArray();
    expect(m).toMatchObject({
      tablo: 'work_orders', islem: 'guncelle', kosul: { id: 'w1' }, yazanId: 'ali',
      otelId: 'otel-1', durum: 'bekliyor', ozet: 'Oda 204 · İş emri: Aldım',
    });
    expect(m?.icerik).toEqual({ assigned_to: 'ali', status: 'in_progress' });   // id / created_at_device eklenmez
  });

  it('"Çözdüm" fotoğrafla: fotoğraf tepside, yol otelin resolutions klasöründe; iş listeden düşer', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30, { assigned_to: 'ali', status: 'in_progress' }));
    const foto = new Blob([new Uint8Array(3)], { type: 'image/jpeg' });
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!, foto);

    const [m] = await kayitDeposu.kayitlar.toArray();
    expect(m?.icerik).toEqual({ status: 'resolved', resolved_photo_path: 'otel-1/resolutions/w1.jpg' });
    expect(m?.fotografYollari).toEqual(['otel-1/resolutions/w1.jpg']);
    expect(await kayitDeposu.fotograflar.count()).toBe(1);
    expect(await acikIsler()).toEqual([]);
  });

  it('"Çözdüm" fotoğrafsız: yalnızca durum gider', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30, { assigned_to: 'ali', status: 'in_progress' }));
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!, null);
    const [m] = await kayitDeposu.kayitlar.toArray();
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
  const durumlar = async () => (await kayitDeposu.kayitlar.orderBy('sira').toArray()).map((k) => k.durum);

  it('bodrum: Aldım + Çözdüm (fotoğraflı) offline yazılır; internet gelince önce Aldım, sonra fotoğraf, sonra Çözdüm', async () => {
    const s = sahteSunucu();
    satirEkle(s, 'work_orders', isEmriSatiri('w1'));
    vi.stubGlobal('navigator', { onLine: false });
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30));
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!, new Blob([new Uint8Array(2)], { type: 'image/jpeg' }));

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(s.olaylar).toEqual([]);                                // uçak modu: hiçbir şey gitmedi
    expect(await durumlar()).toEqual(['bekliyor', 'bekliyor']);

    vi.stubGlobal('navigator', { onLine: true });
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    const [aldim, cozdum] = await kayitDeposu.kayitlar.orderBy('sira').toArray();
    expect(s.olaylar).toEqual([`kayit:${aldim!.id}`, 'foto:otel-1/resolutions/w1.jpg', `kayit:${cozdum!.id}`]);
    expect(await durumlar()).toEqual(['tamamlandi', 'tamamlandi']);
    expect(satirAl(s, 'work_orders', 'w1')).toMatchObject({ status: 'resolved', resolved_by: 'ali' });
    expect(await kayitDeposu.fotograflar.count()).toBe(0);
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ status: 'resolved', onayBekliyor: false });
  });

  // Beklenti değişti (karar 028, Genel Müdür onayı). Eski beklenti: "kesin reddedilen güncelleme düşer,
  // 'gönderilemedi' uyarısı yok". Yeni: düşmez, nedeniyle saklanır; telefondaki iş sunucunun gerçeğine döner.
  it('sunucu Aldım\'ı kesin reddederse (iş başkasında) kayıt nedeniyle saklanır, liste sunucuya döner, sonrakiler gider', async () => {
    const s = sahteSunucu();
    satirEkle(s, 'work_orders', isEmriSatiri('w1', { assigned_to: 'tamer', status: 'in_progress' }));
    satirEkle(s, 'work_orders', isEmriSatiri('w2'));
    await telefonDeposu.isEmirleri.bulkPut([isEmri('w1', 0, 30), isEmri('w2', 0, 30)]);
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);
    await isiAl((await telefonDeposu.isEmirleri.get('w2'))!);

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(await durumlar()).toEqual(['reddedildi', 'tamamlandi']);
    const [ret] = await kayitDeposu.kayitlar.orderBy('sira').toArray();
    expect(ret?.neden).toMatch(/başkasında/);
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: 'tamer', onayBekliyor: false });
    expect(await telefonDeposu.isEmirleri.get('w2')).toMatchObject({ assigned_to: 'ali', onayBekliyor: false });

    // Sunucudan liste yeniden indiğinde reddedilen Aldım tekrar uygulanmaz
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30, { assigned_to: 'tamer', status: 'in_progress' }));
    await bekleyenleriUygula();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: 'tamer' });
  });

  it('Çözdüm\'ün cevabı kaybolur, tekrarında "çözülmüş" ret gelir: çözen bensem tamamlandı, değilsem reddedildi', async () => {
    const s = sahteSunucu();
    satirEkle(s, 'work_orders', isEmriSatiri('w1', { assigned_to: 'ali', status: 'in_progress' }));
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30, { assigned_to: 'ali', status: 'in_progress' }));
    await isiCoz((await telefonDeposu.isEmirleri.get('w1'))!, null);
    let kaybet = true;
    s.cevabiKaybet = () => kaybet;

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await durumlar()).toEqual(['bekliyor']);              // sunucuda çözüldü ama telefon BİLMİYOR: başarılı denmez

    kaybet = false;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);        // ikinci deneme: "Çözülmüş iş emri değiştirilemez."
    expect(await durumlar()).toEqual(['tamamlandi']);            // ama çözen benim → doğrulandı

    // Başkası çözmüşse: reddedildi
    satirEkle(s, 'work_orders', isEmriSatiri('w2', { assigned_to: 'ali', status: 'resolved', resolved_by: 'tamer' }));
    await telefonDeposu.isEmirleri.put(isEmri('w2', 0, 30, { assigned_to: 'ali', status: 'in_progress' }));
    await isiCoz((await telefonDeposu.isEmirleri.get('w2'))!, null);
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    const ikinci = (await kayitDeposu.kayitlar.orderBy('sira').toArray())[1];
    expect(ikinci).toMatchObject({ durum: 'reddedildi' });
    expect(ikinci?.neden).toMatch(/Çözülmüş iş emri değiştirilemez.*başka biri tarafından çözülmüş/);
  });

  it('güncelleme hiçbir satırı değiştirmezse (iş sunucuda görünmüyor) başarılı gösterilmez: belirsiz kalır', async () => {
    const s = sahteSunucu();                                     // w1 sunucuda yok / görünmüyor
    await telefonDeposu.isEmirleri.put(isEmri('w1', 0, 30));
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(await durumlar()).toEqual(['belirsiz']);
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ onayBekliyor: true });
  });
});
