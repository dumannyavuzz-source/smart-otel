// Telefona inen listeler (karar 029): oda/kontrol listesi/ürün paketi, açık iş emirleri ve teslimler.
//   * Kimlik yoksa (kart yenilenemedi) indirme yapılmaz ve telefondaki liste SİLİNMEZ.
//   * Geçerli kimlikle gelen boş liste geçerli bilgidir ve yazılır.
//   * Cevap yoldayken kişi/otel değiştiyse (A→B, A→B→A) cevap son yazma anında reddedilir.
//   * Paket kişinin bütün otellerini kapsar (çok otelli çevrimdışı çalışma daralmaz).
// Supabase istemcisi sahteBeyin ile taklit edilir. Bütün veriler deneme verisidir.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sahteBeyin, type SahteBeyin, type Satir } from './testYardimcilari/sahteBeyin';
import { telefonDeposu, type IsEmri, type Oda, type Teslimat } from './telefonDeposu';
import { kayitDeposu } from './kayitDeposu';
import { aktifKullaniciyiAyarla } from './kullanici';

const tutucu = vi.hoisted(() => ({ beyin: null as unknown as SahteBeyin }));
vi.mock('./ortakBeyin', () => ({ ortakBeyin: () => tutucu.beyin.istemci, ayarlarTamamMi: () => true }));

const { paketiIndir } = await import('./postaci');
const { isEmirleriniIndir } = await import('./isEmirleri');
const { teslimleriIndir } = await import('./teslimler');

const oda = (id: string, otel: string): Oda => ({ id, hotel_id: otel, number: id, floor: '1', staff_code: `kod-${id}` });
const isEmri = (id: string, otel: string): IsEmri => ({
  id, hotel_id: otel, room_id: 'oda-1', oda_no: '101', aciklama: 'Arıza', severity: 'normal',
  due_at: '2026-11-01T12:00:00.000Z', created_at: '2026-11-01T10:00:00.000Z', assigned_to: null, status: 'open',
});
const teslimat = (id: string, otel: string): Teslimat => ({
  id, hotel_id: otel, urun: 'Havlu', birim: 'adet', istenen: 5, onaylanan: 5, talepEdenId: 'x', onaylayanId: 'y', created_at: '2026-11-01T10:00:00.000Z',
});
const uyelik = (kisi: string, otel: string): Satir => ({ user_id: kisi, hotel_id: otel });
const anonIstek = () => tutucu.beyin.istekler.filter((i) => i.kimlik === 'anon').length;
const sunucuOdasi = (id: string, otel: string): Satir => ({ ...oda(id, otel), is_active: true });
const sunucuIsi = (id: string, otel: string): Satir => ({ ...isEmri(id, otel), rooms: { number: '101' }, issue_reports: { description: 'Arıza' } });
const sunucuTalebi = (id: string, otel: string): Satir => ({
  id, hotel_id: otel, quantity: 5, created_by: 'x', created_at: '2026-11-01T10:00:00.000Z', status: 'approved',
  products: { name: 'Havlu', unit: 'adet' }, approvals: [{ approved_quantity: 5, created_by: 'y' }],
});
const tick = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0)); };

beforeEach(async () => {
  tutucu.beyin = sahteBeyin();
  tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('kat1', 'B'), uyelik('tek1', 'C')];
  tutucu.beyin.tablolar = {
    rooms: [sunucuOdasi('101', 'A'), sunucuOdasi('201', 'B'), sunucuOdasi('301', 'C')],
    checklist_templates: [{ id: 'l1', hotel_id: 'A', name: 'Liste', items: ['Yatak'], is_active: true }],
    products: [{ id: 'u1', hotel_id: 'A', name: 'Havlu', unit: 'adet', is_active: true }],
    work_orders: [sunucuIsi('w1', 'A')],
    purchase_requests: [sunucuTalebi('t1', 'A'), sunucuTalebi('t2', 'B')],
  };
  aktifKullaniciyiAyarla('kat1', 'A');
  await Promise.all([telefonDeposu.odalar.clear(), telefonDeposu.kontrolListeleri.clear(), telefonDeposu.urunler.clear(),
    telefonDeposu.isEmirleri.clear(), telefonDeposu.teslimler.clear(), kayitDeposu.kayitlar.clear(), kayitDeposu.fotograflar.clear()]);
});

describe('Paket (odalar · kontrol listeleri · ürünler)', () => {
  it('T13 · kimlik yok (yenileme bekleme süresi): telefondaki odalar SİLİNMEZ, kimliksiz istek gitmez', async () => {
    await telefonDeposu.odalar.bulkPut([oda('101', 'A'), oda('201', 'B')]);
    tutucu.beyin.yenilemeBeklemesi = true;
    await paketiIndir();
    expect(await telefonDeposu.odalar.count()).toBe(2);
    expect(anonIstek()).toBe(0);
  });

  it('kart sunucuda dolmuş (401): telefondaki odalar silinmez', async () => {
    await telefonDeposu.odalar.bulkPut([oda('101', 'A')]);
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'dolmus' };
    await paketiIndir();
    expect(await telefonDeposu.odalar.count()).toBe(1);
  });

  it('geçerli kimlik: kişinin İKİ otelinin odaları da iner (aktif otel A olsa bile); başka otel inmez', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    await paketiIndir();
    expect((await telefonDeposu.odalar.toArray()).map((o) => o.hotel_id).sort()).toEqual(['A', 'B']);
    expect(tutucu.beyin.istekler.every((i) => i.acikKart)).toBe(true);
  });

  it('A → B: paket yoldayken kişi değişti; A\'nın paketi B\'nin telefonuna yazılmaz', async () => {
    await telefonDeposu.odalar.bulkPut([oda('301', 'C')]);   // B (tek1) için zaten inmiş paket
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    let birak!: () => void;
    tutucu.beyin.bekle.rooms = new Promise<void>((r) => (birak = r));
    const yolda = paketiIndir();
    await tick();
    aktifKullaniciyiAyarla('tek1', 'C');
    birak();
    await yolda;
    expect((await telefonDeposu.odalar.toArray()).map((o) => o.id)).toEqual(['301']);
  });

  it('A → B → A: ilk (eski) paket, sonradan dönen A\'nın yerine yazılmaz', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    let birak!: () => void;
    tutucu.beyin.bekle.rooms = new Promise<void>((r) => (birak = r));
    const eski = paketiIndir();
    await tick();
    aktifKullaniciyiAyarla('tek1', 'C');
    aktifKullaniciyiAyarla('kat1', 'A');
    tutucu.beyin.bekle.rooms = undefined;
    tutucu.beyin.tablolar.rooms = [sunucuOdasi('102', 'A')];   // sunucuda güncel paket
    await paketiIndir();                                         // A için yeni indirme
    birak();
    await eski;
    expect((await telefonDeposu.odalar.toArray()).map((o) => o.id)).toEqual(['102']);
  });
});

describe('Açık iş emirleri', () => {
  it('T14 · kimlik yok: telefondaki iş listesi silinmez', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 'A'));
    tutucu.beyin.yenilemeBeklemesi = true;
    await isEmirleriniIndir();
    expect(await telefonDeposu.isEmirleri.count()).toBe(1);
    expect(anonIstek()).toBe(0);
  });

  it('geçerli kimlikle gerçekten boş liste (açık iş yok) yazılır', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 'A'));
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.tablolar.work_orders = [];
    await isEmirleriniIndir();
    expect(await telefonDeposu.isEmirleri.count()).toBe(0);
  });

  it('A → B: liste yoldayken kişi değişti; yazılmaz', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    let birak!: () => void;
    tutucu.beyin.bekle.work_orders = new Promise<void>((r) => (birak = r));
    const yolda = isEmirleriniIndir();
    await tick();
    aktifKullaniciyiAyarla('tek1', 'C');
    birak();
    await yolda;
    expect(await telefonDeposu.isEmirleri.count()).toBe(0);
  });
});

describe('Teslimler', () => {
  it('T14 · kimlik yok: telefondaki teslim listesi silinmez', async () => {
    await telefonDeposu.teslimler.put(teslimat('t1', 'A'));
    tutucu.beyin.yenilemeBeklemesi = true;
    await teslimleriIndir();
    expect(await telefonDeposu.teslimler.count()).toBe(1);
    expect(anonIstek()).toBe(0);
  });

  it('otel değişimi: A\'nın listesi yoldayken B\'ye geçildi; A\'nın teslimleri B\'nin listesine yazılmaz', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    let birak!: () => void;
    tutucu.beyin.bekle.purchase_requests = new Promise<void>((r) => (birak = r));
    const yolda = teslimleriIndir();
    await tick();
    aktifKullaniciyiAyarla('kat1', 'B');
    birak();
    await yolda;
    expect(await telefonDeposu.teslimler.count()).toBe(0);
  });

  it('geçerli kimlik: yalnız aktif otelin teslimleri iner', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    await teslimleriIndir();
    expect((await telefonDeposu.teslimler.toArray()).map((t) => t.id)).toEqual(['t1']);
  });
});
