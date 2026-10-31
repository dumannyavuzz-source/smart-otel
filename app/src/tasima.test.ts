// Eski kutudan yeni kayıt kutusuna taşıma (karar 028).
// Gerçek Dexie kodu + sahte IndexedDB. Eski uygulama sürümü, aynı telefonda AYRI bir sekme gibi kendi
// bağlantısıyla çalışır (testYardimcilari/eskiSurum.ts) ve yeni sürümün kilidini tanımaz.
// Bütün veriler bu dosyada üretilen deneme verileridir; gerçek kullanıcı verisine dokunulmaz.
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { telefonDeposu, type IsEmri } from './telefonDeposu';
import { kayitDeposu, kutuOzeti } from './kayitDeposu';
import { eskiKutuyuTasi } from './tasima';
import { mektuplariGonder } from './postaci';
import { odaHazirBeyani } from './beyanlar';
import { aktifKullaniciyiAyarla } from './kullanici';
import { EskiSurumSekmesi, eskiDile } from './testYardimcilari/eskiSurum';
import { isEmriSatiri, sahteSunucu, satirAl, satirEkle, tablodakiSatirSayisi } from './testYardimcilari/sahteSunucu';

const ODA = { id: 'oda-1', hotel_id: 'otel-1', number: '204', floor: '2', staff_code: 'a'.repeat(32) };
const ISEMRI: IsEmri = {
  id: 'w1',
  hotel_id: 'otel-1',
  room_id: 'oda-1',
  oda_no: '204',
  aciklama: 'Arıza: musluk',
  severity: 'normal',
  due_at: '2026-10-23T14:00:00.000Z',
  created_at: '2026-10-23T12:00:00.000Z',
  assigned_to: null,
  status: 'open',
};

function foto(bayt: number, boyut = 16): Blob {
  return new Blob([new Uint8Array(boyut).fill(bayt)], { type: 'image/jpeg' });
}

async function baytlar(b: Blob): Promise<number[]> {
  return [...new Uint8Array(await b.arrayBuffer())];
}

let eski: EskiSurumSekmesi;

beforeEach(async () => {
  aktifKullaniciyiAyarla('ali', 'otel-1');
  eski = new EskiSurumSekmesi();
  await eski.open();
  await Promise.all([
    telefonDeposu.gidenKutusu.clear(),
    telefonDeposu.fotograflar.clear(),
    telefonDeposu.isEmirleri.clear(),
    telefonDeposu.odalar.clear(),
    kayitDeposu.kayitlar.clear(),
    kayitDeposu.fotograflar.clear(),
  ]);
  await telefonDeposu.odalar.put(ODA);
  await telefonDeposu.isEmirleri.put(ISEMRI);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  eski.close();
});

// Eski sürümün bıraktığı dört tür kayıt
async function eskiKayitlar() {
  const temizlik = await eski.mektupYaz('ali', 'room_cleanings', { hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Yatak'] });
  const sorunId = crypto.randomUUID();
  const sorunYolu = `otel-1/issues/${sorunId}.jpg`;
  const sorun = await eski.mektupYaz(
    'ali',
    'issue_reports',
    { hotel_id: 'otel-1', room_id: 'oda-1', description: 'Arıza', severity: 'normal', photo_path: sorunYolu },
    { id: sorunId, fotograflar: [{ veri: foto(7), yol: sorunYolu }] },
  );
  const aldim = await eski.mektupYaz('ali', 'work_orders', { assigned_to: 'ali', status: 'in_progress' }, { islem: 'guncelle', kosul: { id: 'w1' } });
  const teslimId = crypto.randomUUID();
  const fatura = `otel-1/deliveries/${teslimId}-fatura.jpg`;
  const hasar = `otel-1/deliveries/${teslimId}-hasar.jpg`;
  const teslim = await eski.mektupYaz(
    'ali',
    'deliveries',
    { hotel_id: 'otel-1', purchase_request_id: 'talep-1', received_quantity: 7, invoice_photo_path: fatura, damage_photo_path: hasar },
    { id: teslimId, fotograflar: [{ veri: foto(1), yol: fatura }, { veri: foto(2), yol: hasar }] },
  );
  return { temizlik, sorun, sorunYolu, aldim, teslim, fatura, hasar };
}

describe('Taşıma: eski kutudan yeni kayıt kutusuna', () => {
  it('dört tür kayıt fotoğraflarıyla, sırasıyla ve oteliyle taşınır; eski kutu ancak doğrulamadan sonra boşalır', async () => {
    const e = await eskiKayitlar();

    const sonuc = await eskiKutuyuTasi();

    expect(sonuc).toMatchObject({ tasinan: 4, kalan: 0, hatalar: [] });
    const yeni = await kayitDeposu.kayitlar.orderBy('sira').toArray();
    expect(yeni.map((k) => k.id)).toEqual([e.temizlik, e.sorun, e.aldim, e.teslim]);
    expect(yeni.every((k) => k.otelId === 'otel-1' && k.durum === 'bekliyor' && k.eskiSurumden)).toBe(true);
    expect(yeni[0]?.ozet).toBe('Oda 204 · Temizlik');
    expect(yeni[2]?.ozet).toBe('Oda 204 · İş emri: Aldım');     // otel ve oda telefondaki işten
    expect(await kayitDeposu.fotograflar.count()).toBe(3);
    expect(await baytlar((await kayitDeposu.fotograflar.get(e.hasar))!.veri)).toEqual(new Array(16).fill(2));
    expect((await kayitDeposu.fotograflar.get(e.sorunYolu))?.yazanId).toBe('ali');
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
    expect(await telefonDeposu.fotograflar.count()).toBe(0);
  });

  it('iki kez çalışırsa çift kayıt olmaz', async () => {
    await eskiKayitlar();
    await eskiKutuyuTasi();
    const ikinci = await eskiKutuyuTasi();
    expect(ikinci.tasinan).toBe(0);
    expect(await kayitDeposu.kayitlar.count()).toBe(4);
    expect(await kayitDeposu.fotograflar.count()).toBe(3);
  });

  it('silmeden hemen önce yarıda kesilirse eski kayıt ve fotoğrafı yerinde kalır; sonraki tur çift yapmadan bitirir', async () => {
    const e = await eskiKayitlar();

    const sonuc = await eskiKutuyuTasi({
      silmedenOnce: (m) => {
        if (m.id === e.sorun) throw new Error('telefon kapandı');
      },
    });

    expect(sonuc.kalan).toBe(1);
    expect(await telefonDeposu.gidenKutusu.get(e.sorun)).toBeDefined();          // eski silinmedi
    expect(await telefonDeposu.fotograflar.get(e.sorunYolu)).toBeDefined();
    expect(await kayitDeposu.kayitlar.get(e.sorun)).toBeDefined();               // kopya da var

    const ikinci = await eskiKutuyuTasi();
    expect(ikinci).toMatchObject({ tasinan: 1, kalan: 0 });
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
    expect(await kayitDeposu.kayitlar.count()).toBe(4);
    expect(await kayitDeposu.fotograflar.count()).toBe(3);
  });

  it('yarıda kalmış eski kopya, yeni kutuda tamamlanmışsa: fotoğrafı geri kopyalanmaz, eski kopya silinir', async () => {
    const e = await eskiKayitlar();
    await eskiKutuyuTasi({
      silmedenOnce: (m) => {
        if (m.id === e.sorun) throw new Error('telefon kapandı');
      },
    });
    // Yeni kutu bu arada kaydı sunucuda doğruladı: içerik ve fotoğraf telefondan silindi
    await kayitDeposu.kayitlar.update(e.sorun, { durum: 'tamamlandi', tamamlandi: new Date().toISOString(), icerik: {} });
    await kayitDeposu.fotograflar.delete(e.sorunYolu);

    const ikinci = await eskiKutuyuTasi();

    expect(ikinci).toMatchObject({ tasinan: 1, kalan: 0 });
    expect(await kayitDeposu.fotograflar.get(e.sorunYolu)).toBeUndefined();      // sahipsiz fotoğraf yok
    expect(await kayitDeposu.kayitlar.get(e.sorun)).toMatchObject({ durum: 'tamamlandi' });
    expect(await telefonDeposu.gidenKutusu.get(e.sorun)).toBeUndefined();
    expect(await telefonDeposu.fotograflar.get(e.sorunYolu)).toBeUndefined();
  });

  it('depolama alanı dolarsa (fotoğraf yazılamaz) hiçbir şey yarım yazılmaz, eski kayıt ve fotoğrafı silinmez', async () => {
    const e = await eskiKayitlar();
    vi.spyOn(kayitDeposu.fotograflar, 'bulkPut').mockRejectedValue(new DOMException('Alan doldu', 'QuotaExceededError'));

    const sonuc = await eskiKutuyuTasi();

    expect(sonuc.tasinan).toBe(2);                                             // fotoğrafsızlar geçti
    expect(sonuc.kalan).toBe(2);
    expect(sonuc.hatalar.join(' ')).toMatch(/Alan doldu/);
    expect(await kayitDeposu.kayitlar.get(e.sorun)).toBeUndefined();          // tek işlem: kayıt da yazılmadı
    expect(await kayitDeposu.kayitlar.get(e.teslim)).toBeUndefined();
    expect(await telefonDeposu.gidenKutusu.get(e.sorun)).toBeDefined();
    expect(await telefonDeposu.gidenKutusu.get(e.teslim)).toBeDefined();
    expect(await telefonDeposu.fotograflar.count()).toBe(3);

    vi.restoreAllMocks();                                                      // yer açıldı
    await eskiKutuyuTasi();
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
    expect(await kayitDeposu.fotograflar.count()).toBe(3);
  });

  it('fotoğrafın kopyası doğrulanamazsa (bayt farkı) eski kayıt silinmez', async () => {
    const e = await eskiKayitlar();
    const gercekGet = kayitDeposu.fotograflar.get.bind(kayitDeposu.fotograflar);
    vi.spyOn(kayitDeposu.fotograflar, 'get').mockImplementation((async (yol: string) => {
      const f = await gercekGet(yol);
      return yol === e.fatura && f ? { ...f, veri: foto(9) } : f;              // bozuk kopya
    }) as never);

    const sonuc = await eskiKutuyuTasi();

    expect(sonuc.kalan).toBe(1);
    expect(sonuc.hatalar.join(' ')).toMatch(/Fotoğraf doğrulanamadı/);
    expect(await telefonDeposu.gidenKutusu.get(e.teslim)).toBeDefined();
    expect(await telefonDeposu.fotograflar.get(e.fatura)).toBeDefined();
    expect(await telefonDeposu.fotograflar.get(e.hasar)).toBeDefined();
  });

  it('eski sürümde "kalıcı" sayılmış kayıt: sunucu reddi ise yeniden gönderilmez, önce doğrulanır; oturum/bağlantı sorunuysa bekler', async () => {
    const ret = await eski.mektupYaz('ali', 'room_cleanings', { hotel_id: 'otel-1', room_id: 'oda-1', checked_items: [] });
    await eski.gidenKutusu.update(ret, { kalici: true, sonHata: 'new row violates row-level security policy', deneme: 3 });
    const jwt = await eski.mektupYaz('ali', 'room_cleanings', { hotel_id: 'otel-1', room_id: 'oda-1', checked_items: [] });
    await eski.gidenKutusu.update(jwt, { kalici: true, sonHata: 'JWT expired', deneme: 1 });

    await eskiKutuyuTasi();
    expect(await kayitDeposu.kayitlar.get(ret)).toMatchObject({ durum: 'belirsiz', eskiRet: true });
    expect(await kayitDeposu.kayitlar.get(jwt)).toMatchObject({ durum: 'bekliyor' });

    const s = sahteSunucu();
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(s.olaylar).toEqual([`sorgu:${ret}`, `kayit:${jwt}`]);              // reddedilmiş olan GÖNDERİLMEDİ
    expect(await kayitDeposu.kayitlar.get(ret)).toMatchObject({ durum: 'reddedildi' });
    expect((await kayitDeposu.kayitlar.get(ret))?.neden).toMatch(/Eski sürümde sunucu reddetmişti.*row-level/);
    expect(await kayitDeposu.kayitlar.get(jwt)).toMatchObject({ durum: 'tamamlandi' });
  });

  it('oteli bilinmeyen eski Aldım: tahmin edilmez, gönderilmez; otel sunucudan öğrenilince aktif otelse gider', async () => {
    await telefonDeposu.isEmirleri.clear();                                     // iş telefonda yok
    const id = await eski.mektupYaz('ali', 'work_orders', { assigned_to: 'ali', status: 'in_progress' }, { islem: 'guncelle', kosul: { id: 'w1' } });
    await eskiKutuyuTasi();
    expect(await kayitDeposu.kayitlar.get(id)).toMatchObject({ otelId: null, durum: 'bekliyor' });

    const s = sahteSunucu();
    s.bagli = false;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);                       // sunucuya sorulamadı
    expect(await kayitDeposu.kayitlar.get(id)).toMatchObject({ otelId: null });
    expect(await kutuOzeti('ali', 'otel-1')).toMatchObject({ bekleyen: 0, digerOtelde: 1 });

    s.bagli = true;
    satirEkle(s, 'work_orders', isEmriSatiri('w1'));
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get(id)).toMatchObject({ otelId: 'otel-1', durum: 'tamamlandi' });
  });
});

describe('Eski ve yeni sürüm aynı anda açık (iki sekme)', () => {
  // Yeni sürümün kilidi: gerçek bir kilit gibi davranır ama eski sekme onu hiç sormaz
  function kilitliTarayici() {
    const kilitAlindi: string[] = [];
    vi.stubGlobal('navigator', {
      onLine: true,
      locks: {
        request: async (ad: string, is: () => Promise<unknown>) => {
          kilitAlindi.push(ad);
          return is();
        },
      },
    });
    return kilitAlindi;
  }

  it('yeni sekme kilit altında kopyalarken eski sekme aynı beyanı gönderip silerse: kopya yeniden gider, sunucu tanır, tek satır, tamamlandı', async () => {
    const kilitler = kilitliTarayici();
    const s = sahteSunucu();
    const id = await eski.mektupYaz('ali', 'room_cleanings', { hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Yatak'] });

    await eskiKutuyuTasi({
      // Yeni sekme kopyaladı, doğruladı; silmeden hemen önce eski sekme araya girer (kilit onu durdurmaz)
      silmedenOnce: async () => {
        expect(await eski.mektubuGonder(id, eskiDile(s.gonder), s.yukle)).toBe('gitti');
      },
    });
    expect(kilitler).toContain('smartotel-tasima');
    expect(await eski.gidenKutusu.count()).toBe(0);

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(tablodakiSatirSayisi(s, 'room_cleanings')).toBe(1);
    expect(await kayitDeposu.kayitlar.get(id)).toMatchObject({ durum: 'tamamlandi' });
  });

  it('eski sekme kopyalanmış bir Aldım\'ı ret alınca kendi kutusundan siler; yeni kutudaki kopya nedeniyle saklanır', async () => {
    kilitliTarayici();
    const s = sahteSunucu();
    satirEkle(s, 'work_orders', isEmriSatiri('w1', { assigned_to: 'tamer', status: 'in_progress' }));
    const id = await eski.mektupYaz('ali', 'work_orders', { assigned_to: 'ali', status: 'in_progress' }, { islem: 'guncelle', kosul: { id: 'w1' } });

    await eskiKutuyuTasi({
      silmedenOnce: async () => {
        expect(await eski.mektubuGonder(id, eskiDile(s.gonder), s.yukle)).toBe('silindi');   // eski davranış
      },
    });
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    const kayit = await kayitDeposu.kayitlar.get(id);
    expect(kayit).toMatchObject({ durum: 'reddedildi' });
    expect(kayit?.neden).toMatch(/başkasında/);
    expect(satirAl(s, 'work_orders', 'w1')).toMatchObject({ assigned_to: 'tamer' });
  });

  it('eski sekme fotoğrafı yükleyip tepsiden silmiş, kaydı gönderememişse: yeni sekme fotoğrafsız taşır, kayıt sunucuda eşleşir', async () => {
    const s = sahteSunucu();
    const sorunId = crypto.randomUUID();
    const yol = `otel-1/issues/${sorunId}.jpg`;
    await eski.mektupYaz(
      'ali',
      'issue_reports',
      { hotel_id: 'otel-1', room_id: 'oda-1', description: 'Haşere', severity: 'urgent', photo_path: yol },
      { id: sorunId, fotograflar: [{ veri: foto(5), yol }] },
    );
    // Eski sekme: fotoğraf gitti, kayıtta bağlantı koptu
    s.kabloyuCekSonra = 1;
    expect(await eski.mektubuGonder(sorunId, eskiDile(s.gonder), s.yukle)).toBe('kaldi');
    expect(await eski.fotograflar.count()).toBe(0);
    s.bagli = true;
    s.kabloyuCekSonra = Infinity;

    await eskiKutuyuTasi();
    expect(await kayitDeposu.fotograflar.count()).toBe(0);
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(await kayitDeposu.kayitlar.get(sorunId)).toMatchObject({ durum: 'tamamlandi' });
    expect(s.fotograflar.has(yol)).toBe(true);
  });

  it('iki yeni sekme aynı anda taşırsa (kilit yoksa da) çift kayıt olmaz', async () => {
    await eskiKayitlar();
    await Promise.all([eskiKutuyuTasi(), eskiKutuyuTasi(), eskiKutuyuTasi()]);
    expect(await kayitDeposu.kayitlar.count()).toBe(4);
    expect(await kayitDeposu.fotograflar.count()).toBe(3);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });
});

describe('Eski sürüme dönüş ve yeniden yükseltme (ayrılmış deneme verileriyle)', () => {
  it('dönüşte eski sürüm açılır ve yeni kutuya dokunmaz; yeniden yükseltmede eski sürümün yazdıkları da taşınır, hepsi bir kez gider', async () => {
    const s = sahteSunucu();
    // Yeni sürüm: bir yeni kayıt + taşınmış bir eski kayıt, internet yok
    const yeniKayit = await odaHazirBeyani(ODA, ['Yatak']);
    const tasinan = await eski.mektupYaz('ali', 'room_cleanings', { hotel_id: 'otel-1', room_id: 'oda-1', checked_items: [] });
    await eskiKutuyuTasi();
    expect(await kayitDeposu.kayitlar.count()).toBe(2);

    // DÖNÜŞ: eski sürüm yeniden açılır (yeni sürüm "smartotel" sürümünü değiştirmediği için açılabilir)
    eski.close();
    const geriDonen = new EskiSurumSekmesi();
    await geriDonen.open();
    expect(geriDonen.verno).toBe(5);
    const eskininGonderdigi = await geriDonen.mektupYaz('ali', 'room_cleanings', { hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Banyo'] });
    await geriDonen.hepsiniGonder('ali', eskiDile(s.gonder), s.yukle);
    s.bagli = false;
    const eskininBekleyeni = await geriDonen.mektupYaz('ali', 'room_cleanings', { hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Kapı'] });
    await geriDonen.hepsiniGonder('ali', eskiDile(s.gonder), s.yukle);
    expect(await geriDonen.gidenKutusu.count()).toBe(1);
    // Yeni kutudaki kayıtlar korunur, gönderilmez
    expect((await kayitDeposu.kayitlar.toArray()).map((k) => k.durum)).toEqual(['bekliyor', 'bekliyor']);
    geriDonen.close();

    // YENİDEN YÜKSELTME
    s.bagli = true;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
    for (const id of [yeniKayit, tasinan, eskininBekleyeni]) {
      expect(await kayitDeposu.kayitlar.get(id)).toMatchObject({ durum: 'tamamlandi' });
    }
    expect(await kayitDeposu.kayitlar.get(eskininGonderdigi)).toBeUndefined();   // onu eski sürüm göndermişti
    expect(tablodakiSatirSayisi(s, 'room_cleanings')).toBe(4);                    // dört farklı kayıt, her biri bir kez
  });

  it('yeni sürüm "smartotel" veritabanının sürümünü yükseltmez', async () => {
    await odaHazirBeyani(ODA, []);
    await eskiKutuyuTasi();
    await telefonDeposu.isEmirleri.update('w1', { onayBekliyor: true });       // dizinsiz yeni alan
    const bakan = new Dexie('smartotel');
    await bakan.open();                                                          // şemasız açılış: mevcut sürümü okur
    expect(bakan.verno).toBe(5);
    bakan.close();
  });
});
