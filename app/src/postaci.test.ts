// Postacı: kayıt kutusu davranışı (002 · B.2 · karar 028). Ağa dokunmaz; sahte sunucu kullanır.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kayitDeposu, arsivle, gecmis, kisininKayitlari, kutuOzeti, kuyruk, type Kayit } from './kayitDeposu';
import { kaliciMi, mektuplariGonder, type Gonderici, type Yukleyici } from './postaci';
import { aktifKullaniciyiAyarla } from './kullanici';
import { sahteSunucu, satirEkle, tablodakiSatirSayisi } from './testYardimcilari/sahteSunucu';

afterEach(() => vi.useRealTimers());

let siraNo = 0;
function kayit(id: string, ek: Partial<Kayit> = {}): Kayit {
  const otel = ek.otelId === undefined ? 'otel-1' : ek.otelId;
  return {
    id,
    sira: ++siraNo,
    yazanId: 'ayse',
    otelId: otel,
    tablo: 'room_cleanings',
    icerik: { id, hotel_id: otel, room_id: 'oda-1', checked_items: ['Yatak'], created_at_device: '2026-10-23T10:00:00.000Z' },
    ozet: `Oda 204 · Temizlik (${id})`,
    olusturuldu: '2026-10-23T10:00:00.000Z',
    durum: 'bekliyor',
    deneme: 0,
    ...ek,
  };
}

beforeEach(async () => {
  siraNo = 0;
  aktifKullaniciyiAyarla('ayse', 'otel-1');
  await kayitDeposu.kayitlar.clear();
  await kayitDeposu.fotograflar.clear();
  await kayitDeposu.kayitlar.bulkAdd([kayit('eski'), kayit('yeni')]);
});

describe('Postacı', () => {
  it('kayıtları eskiden yeniye gönderir; eşleşince tamamlandı olur, kuyruktan çıkar, özet geçmişte kalır', async () => {
    const s = sahteSunucu();

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(s.olaylar).toEqual(['kayit:eski', 'kayit:yeni']);
    expect(await kuyruk('ayse', 'otel-1')).toEqual([]);
    const g = await gecmis('ayse');
    expect(g.map((k) => k.id).sort()).toEqual(['eski', 'yeni']);
    expect(g[0]).toMatchObject({ durum: 'tamamlandi', icerik: {} });             // içerik telefonda tutulmaz
    expect(g[0]?.tamamlandi).toBeDefined();
  });

  it('internet kesikse durur; kayıtlar bekler, deneme sayılır', async () => {
    const s = sahteSunucu();
    s.bagli = false;

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    const eski = await kayitDeposu.kayitlar.get('eski');
    expect(eski).toMatchObject({ durum: 'bekliyor', deneme: 1, sonHata: 'Failed to fetch' });
    expect((await kayitDeposu.kayitlar.get('yeni'))?.deneme).toBe(0);           // ona sıra gelmedi
  });

  it('sunucu bir kaydı kesin reddederse nedeniyle saklanır, diğerine devam edilir, OTOMATİK yeniden gönderilmez', async () => {
    const s = sahteSunucu();
    s.reddet = (k) => (k.id === 'eski' ? { hata: 'new row violates row-level security policy', kod: '42501' } : undefined);

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);                       // ikinci tur

    const eski = await kayitDeposu.kayitlar.get('eski');
    expect(eski).toMatchObject({ durum: 'reddedildi', sunucuKodu: '42501' });
    expect(eski?.neden).toContain('row-level security');
    expect(eski?.icerik).toMatchObject({ checked_items: ['Yatak'] });             // içerik korunur
    expect(s.olaylar.filter((o) => o === 'sorgu:eski')).toHaveLength(1);         // yalnızca ilk turda doğrulandı
    expect(s.olaylar).not.toContain('kayit:eski');
    expect(await kayitDeposu.kayitlar.get('yeni')).toMatchObject({ durum: 'tamamlandi' });
  });

  it('geçici hatadan sonra ikinci çağrıda gönderir (vazgeçmez)', async () => {
    const s = sahteSunucu();
    s.bagli = false;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    s.bagli = true;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kuyruk('ayse', 'otel-1')).toEqual([]);
  });

  it('başka kullanıcının kayıtlarına dokunmaz; sahibi girince onlar da gider', async () => {
    await kayitDeposu.kayitlar.add(kayit('mehmetin', { yazanId: 'mehmet' }));
    const s = sahteSunucu();

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(s.olaylar).toEqual(['kayit:eski', 'kayit:yeni']);
    expect(await kayitDeposu.kayitlar.get('mehmetin')).toMatchObject({ durum: 'bekliyor', deneme: 0 });
    expect(await kutuOzeti('ayse', 'otel-1')).toMatchObject({ bekleyen: 0, baskasinin: 1 });

    aktifKullaniciyiAyarla('mehmet', 'otel-1');
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('mehmetin')).toMatchObject({ durum: 'tamamlandi' });
  });

  it('kimse giriş yapmamışsa hiçbir şey gönderilmez', async () => {
    aktifKullaniciyiAyarla(null);
    const s = sahteSunucu();
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(s.olaylar).toEqual([]);
  });

  it('gönderici patlarsa postacı kilitlenmez, kayıt kaybolmaz, sonra yine dener', async () => {
    const s = sahteSunucu();
    let patla = true;
    const gonder: Gonderici = async (k) => {
      if (patla) throw new TypeError('network down');
      return s.gonder(k);
    };
    await mektuplariGonder(gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'bekliyor', sonHata: 'network down' });

    patla = false;
    await mektuplariGonder(gonder, s.yukle, s.sorgula);
    expect(await kuyruk('ayse', 'otel-1')).toEqual([]);
  });
});

describe('Sunucudaki kayıtla eşleştirme', () => {
  it('kayıt gitti ama cevap kayboldu: tekrar gönderilir, sunucu aynı kimliği tanır, eşleşir; sunucuda tek satır', async () => {
    const s = sahteSunucu();
    let kaybet = true;
    s.cevabiKaybet = (k) => k.id === 'eski' && kaybet;

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'bekliyor' });   // başarılı GÖSTERİLMEZ

    kaybet = false;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'tamamlandi' });
    expect(tablodakiSatirSayisi(s, 'room_cleanings')).toBe(2);
  });

  it('sunucuda aynı kimlikle BAŞKA KİŞİNİN kaydı varsa: çakışma; silinmez, tamamlandı sayılmaz, yeniden gönderilmez', async () => {
    const s = sahteSunucu();
    const ayni = (await kayitDeposu.kayitlar.get('eski'))!.icerik;
    satirEkle(s, 'room_cleanings', { ...ayni, created_by: 'tamer' });

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    const k = await kayitDeposu.kayitlar.get('eski');
    expect(k).toMatchObject({ durum: 'cakisma' });
    expect(k?.icerik).toMatchObject({ room_id: 'oda-1' });
    expect(s.olaylar.filter((o) => o === 'kayit:eski')).toHaveLength(1);
  });

  it('aynı kimlik ama farklı otel ya da farklı içerik: çakışma', async () => {
    const s = sahteSunucu();
    const eskiIcerik = (await kayitDeposu.kayitlar.get('eski'))!.icerik;
    const yeniIcerik = (await kayitDeposu.kayitlar.get('yeni'))!.icerik;
    satirEkle(s, 'room_cleanings', { ...eskiIcerik, hotel_id: 'otel-2', created_by: 'ayse' });
    satirEkle(s, 'room_cleanings', { ...yeniIcerik, checked_items: ['Banyo'], created_by: 'ayse' });

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'cakisma' });
    expect(await kayitDeposu.kayitlar.get('yeni')).toMatchObject({ durum: 'cakisma' });
  });

  it('içerik eşleşmesi miktarı, saati ve madde sırasını sunucunun yazımına göre karşılaştırır', async () => {
    await kayitDeposu.kayitlar.clear();
    await kayitDeposu.kayitlar.add(
      kayit('eksik', {
        tablo: 'supply_reports',
        icerik: { id: 'eksik', hotel_id: 'otel-1', room_id: 'oda-1', product_id: 'p1', quantity: 1.5, created_at_device: '2026-10-23T10:00:00.000Z' },
      }),
    );
    await kayitDeposu.kayitlar.add(
      kayit('temiz', { icerik: { id: 'temiz', hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Yatak', 'Banyo'] } }),
    );
    const s = sahteSunucu();
    satirEkle(s, 'supply_reports', {
      id: 'eksik', hotel_id: 'otel-1', room_id: 'oda-1', product_id: 'p1', quantity: 1.5,
      created_at_device: '2026-10-23T13:00:00+03:00', created_by: 'ayse',             // aynı an, farklı yazım
    });
    satirEkle(s, 'room_cleanings', { id: 'temiz', hotel_id: 'otel-1', room_id: 'oda-1', checked_items: ['Banyo', 'Yatak'], created_by: 'ayse' });

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eksik')).toMatchObject({ durum: 'tamamlandi' });
    expect(await kayitDeposu.kayitlar.get('temiz')).toMatchObject({ durum: 'tamamlandi' });
  });

  it('sunucu satırı vermez ve sorgu da yapılamazsa: belirsiz; bağlantı gelince doğrulanır', async () => {
    const s = sahteSunucu();
    s.satirVermez = () => true;
    const sorgula = s.sorgula;
    s.sorgula = async () => ({ ok: false, hata: 'Failed to fetch' });

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'belirsiz' });
    expect(await kuyruk('ayse', 'otel-1')).toHaveLength(2);                     // belirsiz kuyrukta kalır

    s.sorgula = sorgula;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'tamamlandi' });
    expect(s.olaylar.filter((o) => o === 'kayit:eski')).toHaveLength(1);         // yeniden yazılmadı, yalnızca bakıldı
  });
});

describe('Sunucu cevabının sınıfı', () => {
  it('bağlantı, oturum kartı, zaman aşımı ve sunucu hataları geçicidir; kural ve kilit retleri kesindir', () => {
    expect(kaliciMi(undefined)).toBe(false);
    expect(kaliciMi('', 0)).toBe(false);
    expect(kaliciMi('PGRST301', 401)).toBe(false);          // oturum kartının süresi doldu
    expect(kaliciMi('XX000', 503)).toBe(false);
    expect(kaliciMi('XX000', 429)).toBe(false);
    expect(kaliciMi('42501', 403)).toBe(true);              // kilit (RLS)
    expect(kaliciMi('P0001', 400)).toBe(true);              // kural: "Çözülmüş iş emri değiştirilemez."
    expect(kaliciMi('23514', 400)).toBe(true);
  });

  it('oturum kartı süresi dolduysa kayıt reddedildi OLMAZ, bekler', async () => {
    const gonder: Gonderici = async () => ({ ok: false, kalici: kaliciMi('PGRST301', 401), hata: 'JWT expired' });
    const s = sahteSunucu();
    await mektuplariGonder(gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'bekliyor', sonHata: 'JWT expired' });
  });
});

describe('Bağlam: kişi ve aktif otel', () => {
  it('yalnızca aktif oteldeki kayıtlar gider; diğer otelinki korunur ve o otele geçince gider', async () => {
    await kayitDeposu.kayitlar.add(kayit('ikinciOtel', { otelId: 'otel-2' }));
    const s = sahteSunucu();

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(s.olaylar).not.toContain('kayit:ikinciOtel');
    expect(await kutuOzeti('ayse', 'otel-1')).toMatchObject({ bekleyen: 0, digerOtelde: 1 });

    aktifKullaniciyiAyarla('ayse', 'otel-2');
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('ikinciOtel')).toMatchObject({ durum: 'tamamlandi', otelId: 'otel-2' });
  });

  it('gönderim sırasında kişi değişirse: o anki kaydın sonucu SAHİBİNİN kaydına yazılır, sonrakiler gönderilmez, yeni kişi görmez', async () => {
    const s = sahteSunucu();
    // İstek Ayşe'nin kartıyla gitti; cevap yoldayken ortak telefonda çıkış + Mehmet girişi oldu
    const gonder: Gonderici = async (k) => {
      const cevap = await s.gonder(k);
      if (k.id === 'eski') aktifKullaniciyiAyarla('mehmet', 'otel-1');
      return cevap;
    };

    await mektuplariGonder(gonder, s.yukle, s.sorgula);

    expect(s.olaylar).not.toContain('kayit:yeni');
    const eski = await kayitDeposu.kayitlar.get('eski');
    expect(eski).toMatchObject({ yazanId: 'ayse', durum: 'tamamlandi' });        // sonucu Ayşe'nin kaydında
    expect(await kayitDeposu.kayitlar.get('yeni')).toMatchObject({ durum: 'bekliyor', deneme: 0 });
    expect(await kisininKayitlari('mehmet')).toEqual([]);                      // geç gelen sonuç Mehmet'e gösterilmez
    expect(await kutuOzeti('mehmet', 'otel-1')).toMatchObject({ bekleyen: 0, dikkat: 0, digerOtelde: 0 });
  });

  it('gönderim sırasında otel değişip geri dönse bile (A→B→A) o tur durur; sonraki tur kaldığı yerden devam eder', async () => {
    const s = sahteSunucu();
    s.gonderimdenOnce = (k) => {
      if (k.id === 'eski') {
        aktifKullaniciyiAyarla('ayse', 'otel-2');
        aktifKullaniciyiAyarla('ayse', 'otel-1');
      }
    };
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(s.olaylar).not.toContain('kayit:yeni');

    s.gonderimdenOnce = undefined;
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(await kuyruk('ayse', 'otel-1')).toEqual([]);
  });
});

describe('Kuyruk, geçmiş ve arşiv ayrımı', () => {
  it('tamamlanan geçmişe, reddedilen dikkat listesine gider; ikisi de kuyrukta değildir; arşiv silmez', async () => {
    await kayitDeposu.fotograflar.add({ yol: 'otel-1/issues/x.jpg', veri: new Blob([new Uint8Array(3)]), yazanId: 'ayse', olusturuldu: '' });
    await kayitDeposu.kayitlar.update('eski', { fotografYollari: ['otel-1/issues/x.jpg'] });
    const s = sahteSunucu();
    s.fotoReddet = () => 'Payload too large';

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(await kuyruk('ayse', 'otel-1')).toEqual([]);
    expect((await gecmis('ayse')).map((k) => k.id)).toEqual(['yeni']);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'reddedildi' });
    expect(await kutuOzeti('ayse', 'otel-1')).toMatchObject({ dikkat: 1 });
    expect(await kayitDeposu.fotograflar.count()).toBe(1);                      // fotoğraf telefonda kalır

    expect(await arsivle('eski', 'mehmet')).toBe(false);                        // başkası arşivleyemez
    expect(await arsivle('yeni', 'ayse')).toBe(false);                          // tamamlanan arşivlenmez
    expect(await arsivle('eski', 'ayse')).toBe(true);
    expect(await kutuOzeti('ayse', 'otel-1')).toMatchObject({ dikkat: 0 });
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'reddedildi' });
    expect(await kayitDeposu.fotograflar.count()).toBe(1);

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    expect(s.olaylar.filter((o) => o.startsWith('foto:') || o === 'kayit:eski')).toEqual([]);   // arşiv de gönderilmez
  });

  // Beklenti değişti (Genel Müdür, 2026-10-24): 30 günlük otomatik budama kaldırıldı; saklama süresi
  // ayrıca kararlaştırılacak. Eski beklenti: "30 günden eski tamamlanmış özetler budanır".
  it('tamamlanmış özetler kendiliğinden silinmez — çok eski olsalar da', async () => {
    await kayitDeposu.kayitlar.bulkAdd([
      kayit('cokEskiTamam', { durum: 'tamamlandi', tamamlandi: '2025-01-01T00:00:00.000Z', icerik: {} }),
      kayit('cokEskiRet', { durum: 'reddedildi', olusturuldu: '2025-01-01T00:00:00.000Z' }),
    ]);
    const s = sahteSunucu();

    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);
    await mektuplariGonder(s.gonder, s.yukle, s.sorgula);

    expect(await kayitDeposu.kayitlar.get('cokEskiTamam')).toMatchObject({ durum: 'tamamlandi' });
    expect(await kayitDeposu.kayitlar.get('cokEskiRet')).toMatchObject({ durum: 'reddedildi' });
    expect((await gecmis('ayse')).map((k) => k.id).sort()).toEqual(['cokEskiTamam', 'eski', 'yeni']);
  });
});

describe('Fotoğrafın yerel kopyası', () => {
  const YOL = 'otel-1/issues/eski.jpg';

  beforeEach(async () => {
    await kayitDeposu.kayitlar.delete('yeni');
    await kayitDeposu.fotograflar.add({ yol: YOL, veri: new Blob([new Uint8Array([1, 2, 3])]), yazanId: 'ayse', olusturuldu: '' });
    await kayitDeposu.kayitlar.update('eski', { fotografYollari: [YOL] });
  });

  // Kaç kez yüklemeye çalışıldı? (sahte sunucu "zaten var"ı sessizce başarı sayar)
  function sayanYukleyici(asil: Yukleyici): { yukle: Yukleyici; sayi: () => number } {
    let n = 0;
    return { yukle: async (yol, veri) => (n++, asil(yol, veri)), sayi: () => n };
  }

  it('fotoğraf yüklendi ama asıl kayıt reddedildi: yerel kopya kalır, arşivde de korunur, yeniden yüklenmez', async () => {
    const s = sahteSunucu();
    s.reddet = () => ({ hata: 'new row violates row-level security policy', kod: '42501' });
    const y = sayanYukleyici(s.yukle);

    await mektuplariGonder(s.gonder, y.yukle, s.sorgula);

    expect(s.fotograflar.has(YOL)).toBe(true);                                // sunucuya gitti
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'reddedildi', yuklenenFotograflar: [YOL] });
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeDefined();             // kanıt telefonda

    expect(await arsivle('eski', 'ayse')).toBe(true);
    await mektuplariGonder(s.gonder, y.yukle, s.sorgula);
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeDefined();             // arşiv fotoğrafı silmez
    expect(y.sayi()).toBe(1);                                                 // yeniden yüklenmedi
  });

  it('fotoğraf yüklendi ama kayıt doğrulanamadı (belirsiz): yerel kopya kalır; doğrulanınca silinir, ikinci kez yüklenmez', async () => {
    const s = sahteSunucu();
    s.satirVermez = () => true;
    const sorgula = s.sorgula;
    s.sorgula = async () => ({ ok: false, hata: 'Failed to fetch' });
    const y = sayanYukleyici(s.yukle);

    await mektuplariGonder(s.gonder, y.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'belirsiz', yuklenenFotograflar: [YOL] });
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeDefined();

    s.sorgula = sorgula;
    await mektuplariGonder(s.gonder, y.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'tamamlandi' });
    expect((await kayitDeposu.kayitlar.get('eski'))?.yuklenenFotograflar).toBeUndefined();
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeUndefined();           // temizlik: doğrulanınca
    expect(y.sayi()).toBe(1);
  });

  it('fotoğraf yüklendi, kayıt gönderilirken bağlantı koptu: kopya kalır; sonraki turda kayıt gider, fotoğraf tekrar yüklenmez', async () => {
    const s = sahteSunucu();
    s.kabloyuCekSonra = 1;                                                    // fotoğraf geçer, kayıt kopar
    const y = sayanYukleyici(s.yukle);

    await mektuplariGonder(s.gonder, y.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'bekliyor', yuklenenFotograflar: [YOL] });
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeDefined();

    s.bagli = true;
    s.kabloyuCekSonra = Infinity;
    await mektuplariGonder(s.gonder, y.yukle, s.sorgula);
    expect(await kayitDeposu.kayitlar.get('eski')).toMatchObject({ durum: 'tamamlandi' });
    expect(await kayitDeposu.fotograflar.get(YOL)).toBeUndefined();
    expect(y.sayi()).toBe(1);
  });
});
