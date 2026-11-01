import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bellekDeposu, sahteBeyin, type SahteBeyin } from './testYardimcilari/sahteBeyin';
import { CIKIS_OLAYI } from './olaylar';
import { aktifProfil, aktifProfiliAyarla } from './kullanici';
import { telefonDeposu } from './telefonDeposu';

const holder = vi.hoisted(() => ({ beyin: null as unknown as SahteBeyin }));
vi.mock('./ortakBeyin', () => ({ ortakBeyin: () => holder.beyin.istemci, ayarlarTamamMi: () => true }));
const { oturumuIzle } = await import('./oturum');
const { paketiIndir } = await import('./postaci');
type Hal = Parameters<Parameters<typeof oturumuIzle>[0]>[0];
let stop: (() => void) | undefined;
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0)); };
const membership = (user: string, hotel: string) => ({ user_id: user, hotel_id: hotel, role: 'staff', name: user, job: 'housekeeping', hotels: { name: hotel, demo_bitis_tarihi: null } });

beforeEach(async () => {
  holder.beyin = sahteBeyin();
  vi.stubGlobal('localStorage', bellekDeposu());
  vi.stubGlobal('window', new EventTarget());
  aktifProfiliAyarla(null);
  holder.beyin.oturum = { kisi: 'A', kart: 'gecerli' };
  holder.beyin.uyelikler = [membership('A', 'otel-A'), membership('B', 'otel-B'), membership('B', 'otel-C')];
  localStorage.setItem('smartotel.otel', 'otel-A');
  await telefonDeposu.odalar.clear();
});
afterEach(() => { stop?.(); stop = undefined; vi.unstubAllGlobals(); });

it('Kullanıcı B otel seçerken A için yoldaki paket yeni önbelleği ezmemeli', async () => {
  let state: Hal | undefined;
  stop = oturumuIzle(h => { state = h; });
  await vi.waitFor(() => expect(state?.durum).toBe('var'));
  expect(aktifProfil()?.id).toBe('A');
  await telefonDeposu.odalar.put({ id: 'korunacak', hotel_id: 'otel-B', number: '201', floor: '2', staff_code: 'deneme-B' });
  holder.beyin.tablolar = { rooms: [{ id: 'eski-A', hotel_id: 'otel-A', is_active: true, number: '101', floor: '1', staff_code: 'deneme-A' }], checklist_templates: [], products: [] };
  let release!: () => void;
  holder.beyin.bekle.rooms = new Promise<void>(r => { release = r; });
  const pending = paketiIndir();
  await vi.waitFor(() => expect(holder.beyin.istekler.some(x => x.tablo === 'rooms')).toBe(true));
  holder.beyin.oturum = { kisi: 'B', kart: 'gecerli' };
  holder.beyin.olayYay('SIGNED_IN');
  await vi.waitFor(() => expect(state?.kullaniciId).toBe('B'));
  await vi.waitFor(() => expect(state?.durum).toBe('otelSec'));
  release();
  await pending;
  expect((await telefonDeposu.odalar.toArray()).map(x => x.id)).toEqual(['korunacak']);
  expect(aktifProfil()?.id).not.toBe('A');
});

it('Kuyruktaki SIGNED_IN bildirimi daha sonra yapılan açık çıkışı geri almamalı', async () => {
  let state: Hal | undefined;
  stop = oturumuIzle(h => { state = h; });
  await vi.waitFor(() => expect(state?.durum).toBe('var'));
  holder.beyin.olayYay('SIGNED_IN');
  holder.beyin.oturum = null;
  localStorage.clear();
  window.dispatchEvent(new Event(CIKIS_OLAYI));
  expect(state?.durum).toBe('yok');
  await settle();
  expect({ durum: state?.durum, user: state?.kullaniciId, profile: aktifProfil() }).toEqual({ durum: 'yok', user: null, profile: null });
});
