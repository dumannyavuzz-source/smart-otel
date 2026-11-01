// Gerçek gönderici/sorgulayıcı/yükleyici kimliksiz pencerede (karar 029): kayıt ve fotoğraf korunur.
//   * Kart yoksa ya da sunucu kartı reddederse hata GEÇİCİDİR: kayıt kuyrukta kalır, "reddedildi" olmaz.
//   * "Sunucuda var mı?" sorusu kimliksiz sorulmaz: kimliksiz boş cevap "kayıt yok" sanılmasın.
//   * Tamamlanmış ve reddedilmiş kayıtlara dokunulmaz. Fotoğrafın yerel kopyası korunur.
// Supabase istemcisi sahteBeyin ile taklit edilir. Bütün veriler deneme verisidir.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sahteBeyin, type SahteBeyin } from './testYardimcilari/sahteBeyin';
import { kayitDeposu, type Kayit } from './kayitDeposu';
import { telefonDeposu } from './telefonDeposu';
import { aktifKullaniciyiAyarla } from './kullanici';

const tutucu = vi.hoisted(() => ({ beyin: null as unknown as SahteBeyin }));
vi.mock('./ortakBeyin', () => ({ ortakBeyin: () => tutucu.beyin.istemci, ayarlarTamamMi: () => true }));

const { mektuplariGonder } = await import('./postaci');

let sira = 0;
function kayit(id: string, ek: Partial<Kayit> = {}): Kayit {
  return {
    id, sira: ++sira, yazanId: 'kat1', otelId: 'A', tablo: 'room_cleanings',
    icerik: { id, hotel_id: 'A', room_id: 'oda-1', checked_items: [] },
    ozet: id, olusturuldu: '2026-11-01T10:00:00.000Z', durum: 'bekliyor', deneme: 0, ...ek,
  };
}
const YOL = 'A/issues/f1.jpg';

beforeEach(async () => {
  tutucu.beyin = sahteBeyin();
  tutucu.beyin.uyelikler = [{ user_id: 'kat1', hotel_id: 'A' }];
  aktifKullaniciyiAyarla('kat1', 'A');
  await Promise.all([kayitDeposu.kayitlar.clear(), kayitDeposu.fotograflar.clear(), telefonDeposu.gidenKutusu.clear()]);
});

describe('Kimliksiz pencerede gönderim', () => {
  it('T12 · bekleyen kayıt: kart yokken gönderilmez, kuyrukta kalır', async () => {
    await kayitDeposu.kayitlar.put(kayit('k1'));
    tutucu.beyin.yenilemeBeklemesi = true;
    await mektuplariGonder();
    const k = await kayitDeposu.kayitlar.get('k1');
    expect(k?.durum).toBe('bekliyor');
    expect(tutucu.beyin.istekler.filter((i) => i.islem === 'yaz' && i.kimlik === 'anon')).toHaveLength(0);
  });

  it('T12 · fotoğraflı kayıt: kart yokken fotoğraf reddedilmiş sayılmaz; kayıt ve fotoğraf telefonda kalır', async () => {
    await kayitDeposu.kayitlar.put(kayit('k2', { tablo: 'issue_reports', fotografYollari: [YOL] }));
    await kayitDeposu.fotograflar.add({ yol: YOL, veri: new Blob([new Uint8Array([1, 2, 3])]), yazanId: 'kat1', olusturuldu: '' });
    tutucu.beyin.yenilemeBeklemesi = true;
    await mektuplariGonder();
    expect((await kayitDeposu.kayitlar.get('k2'))?.durum).toBe('bekliyor');
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeDefined();
  });

  it('belirsiz + eski sürümde reddedilmiş kayıt: kimliksiz "sunucuda yok" cevabıyla yeniden reddedilmez', async () => {
    await kayitDeposu.kayitlar.put(kayit('k3', { durum: 'belirsiz', eskiRet: true }));
    tutucu.beyin.yenilemeBeklemesi = true;
    await mektuplariGonder();
    expect((await kayitDeposu.kayitlar.get('k3'))?.durum).toBe('belirsiz');
  });

  it('kart sunucuda dolmuş (401): kayıt kuyrukta kalır', async () => {
    await kayitDeposu.kayitlar.put(kayit('k4'));
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'dolmus' };
    await mektuplariGonder();
    expect((await kayitDeposu.kayitlar.get('k4'))?.durum).toBe('bekliyor');
  });

  it('tamamlanmış ve reddedilmiş kayıtlara dokunulmaz', async () => {
    await kayitDeposu.kayitlar.bulkPut([
      kayit('t1', { durum: 'tamamlandi', icerik: {}, tamamlandi: '2026-11-01T10:05:00.000Z' }),
      kayit('r1', { durum: 'reddedildi', neden: 'deneme' }),
    ]);
    const once = await kayitDeposu.kayitlar.toArray();
    tutucu.beyin.yenilemeBeklemesi = true;
    await mektuplariGonder();
    expect(await kayitDeposu.kayitlar.toArray()).toEqual(once);
  });
});

describe('Geçerli kimlikle gönderim', () => {
  it('kart sorguya açıkça bağlanır ve kayıt tamamlanır', async () => {
    await kayitDeposu.kayitlar.put(kayit('k5'));
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    await mektuplariGonder();
    expect((await kayitDeposu.kayitlar.get('k5'))?.durum).toBe('tamamlandi');
    const yazma = tutucu.beyin.istekler.filter((i) => i.islem === 'yaz');
    expect(yazma).toHaveLength(1);
    expect(yazma[0]).toMatchObject({ kimlik: 'kat1', acikKart: true });
  });

  it('fotoğraflı kayıt: fotoğraf da açık kartla yüklenir, kayıt tamamlanınca yerel kopya silinir', async () => {
    await kayitDeposu.kayitlar.put(kayit('k6', { tablo: 'issue_reports', fotografYollari: [YOL] }));
    await kayitDeposu.fotograflar.add({ yol: YOL, veri: new Blob([new Uint8Array([1])]), yazanId: 'kat1', olusturuldu: '' });
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    await mektuplariGonder();
    expect((await kayitDeposu.kayitlar.get('k6'))?.durum).toBe('tamamlandi');
    expect(tutucu.beyin.istekler.find((i) => i.islem === 'yukle')).toMatchObject({ kimlik: 'kat1', acikKart: true });
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeUndefined();
  });
});
