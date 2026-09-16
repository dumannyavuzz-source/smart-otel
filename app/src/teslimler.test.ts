// DEPO VE TESLİMAT — Blueprint · 3.3 (Maker-Checker'ın son halkası)
// Denenen üç şey: soru ürünün birimiyle mi soruluyor, eksik teslim kanıt istiyor mu,
// ve eksi kattaki depoda yazılan teslim internet gelince fotoğraflarıyla sırayla gidiyor mu?
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { telefonDeposu, type Teslimat } from './telefonDeposu';
import {
  birimSorusu,
  eksikMetni,
  hasarFotografiGerekli,
  miktarMetni,
  teslimAlabilirMi,
  teslimAldim,
  teslimBekleyenler,
} from './teslimler';
import { mektuplariGonder, type Gonderici, type Yukleyici } from './postaci';
import { aktifKullaniciyiAyarla } from './kullanici';

const ALI = 'ali';          // depo görevlisi: teslim alan
const AYSE = 'ayse';        // talep eden
const MEHMET = 'mehmet';    // onaylayan müdür

function siparis(ozel: Partial<Teslimat> = {}): Teslimat {
  return {
    id: 'talep-1',
    hotel_id: 'otel-1',
    urun: 'Domates',
    birim: 'Kg',
    istenen: 12,
    onaylanan: 10,
    talepEdenId: AYSE,
    onaylayanId: MEHMET,
    created_at: '2026-09-15T08:00:00.000Z',
    ...ozel,
  };
}

function sahteFoto(boyut = 8): Blob {
  return new Blob([new Uint8Array(boyut)], { type: 'image/jpeg' });
}

function sahteAg() {
  const olaylar: string[] = [];                       // sıra: "foto:<ad>" / "kayit:<id>"
  let bagli = true;

  const gonder: Gonderici = async (mektup) => {
    if (!bagli) return { ok: false, kalici: false, hata: 'Failed to fetch' };
    olaylar.push('kayit:' + mektup.id);
    return { ok: true };
  };
  const yukle: Yukleyici = async (yol) => {
    if (!bagli) return { ok: false, kalici: false, hata: 'Failed to fetch' };
    olaylar.push('foto:' + (yol.split('/').pop() ?? ''));
    return { ok: true };
  };
  return {
    olaylar,
    gonder,
    yukle,
    kabloyuCek: () => {
      bagli = false;
    },
    kabloyuTak: () => {
      bagli = true;
    },
  };
}

function ucakModu(acik: boolean) {
  vi.stubGlobal('navigator', { onLine: !acik });
}

beforeEach(async () => {
  aktifKullaniciyiAyarla(ALI);
  await telefonDeposu.gidenKutusu.clear();
  await telefonDeposu.fotograflar.clear();
  await telefonDeposu.teslimler.clear();
  ucakModu(false);
});

afterEach(() => vi.unstubAllGlobals());

describe('Soru ürünün birimiyle sorulur', () => {
  it('Kg, Litre, Koli, adet', () => {
    expect(birimSorusu('Kg')).toBe('Kaç Kg geldi?');
    expect(birimSorusu('Litre')).toBe('Kaç Litre geldi?');
    expect(birimSorusu('Koli')).toBe('Kaç Koli geldi?');
    expect(birimSorusu('adet')).toBe('Kaç adet geldi?');
  });

  it('birim boşsa "adet" denir — soru hiçbir zaman yarım kalmaz', () => {
    expect(birimSorusu('')).toBe('Kaç adet geldi?');
    expect(birimSorusu('   ')).toBe('Kaç adet geldi?');
  });

  it('miktar her yerde birimiyle yazılır, çıplak sayı bırakılmaz', () => {
    expect(miktarMetni(10, 'Kg')).toBe('10 Kg');
    expect(eksikMetni(7, siparis())).toBe('3 Kg eksik geldi');
  });
});

describe('Kanıt şartı', () => {
  it('gelen onaylanandan azsa hasar fotoğrafı gerekir', () => {
    expect(hasarFotografiGerekli(7, 10)).toBe(true);
    expect(hasarFotografiGerekli(0, 10)).toBe(true);    // hiç gelmedi: o da bir iddiadır
  });

  it('tam ya da fazla geldiyse gerekmez', () => {
    expect(hasarFotografiGerekli(10, 10)).toBe(false);
    expect(hasarFotografiGerekli(12, 10)).toBe(false);
  });

  it('eksik teslim, hasar fotoğrafı olmadan telefona bile yazılmaz', async () => {
    await expect(teslimAldim(siparis(), 7, sahteFoto(), null)).rejects.toThrow(/hasar fotoğrafı/i);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });
});

describe('Maker-Checker: üç ayrı imza', () => {
  it('talep eden ve onaylayan kendi siparişini teslim alamaz', () => {
    const s = siparis();
    expect(teslimAlabilirMi(s, ALI)).toBe(true);
    expect(teslimAlabilirMi(s, AYSE)).toBe(false);      // isteyen
    expect(teslimAlabilirMi(s, MEHMET)).toBe(false);    // onaylayan
    expect(teslimAlabilirMi(s, null)).toBe(false);      // girişsiz
  });

  it('liste, kişinin teslim alamayacağı siparişleri hiç göstermez; en eski üstte', async () => {
    await telefonDeposu.teslimler.bulkPut([
      siparis({ id: 'yeni', created_at: '2026-09-15T10:00:00.000Z' }),
      siparis({ id: 'eski', created_at: '2026-09-15T06:00:00.000Z' }),
      siparis({ id: 'kendi-talebim', talepEdenId: ALI }),
      siparis({ id: 'kendi-onayim', onaylayanId: ALI }),
    ]);
    expect((await teslimBekleyenler()).map((t) => t.id)).toEqual(['eski', 'yeni']);
  });
});

describe('Teslim alma (beyan)', () => {
  it('tam teslim: tek fotoğraf, hasar alanı yok, sipariş listeden düşer', async () => {
    await telefonDeposu.teslimler.put(siparis());
    await teslimAldim(siparis(), 10, sahteFoto(), null, '  Hepsi geldi  ');

    const mektup = (await telefonDeposu.gidenKutusu.toArray())[0]!;
    expect(mektup.tablo).toBe('deliveries');
    expect(mektup.icerik.received_quantity).toBe(10);
    expect(mektup.icerik.purchase_request_id).toBe('talep-1');
    expect(mektup.icerik.damage_photo_path).toBeUndefined();
    expect(mektup.icerik.note).toBe('Hepsi geldi');
    expect(mektup.fotografYollari).toHaveLength(1);
    expect(await telefonDeposu.fotograflar.count()).toBe(1);
    expect(await telefonDeposu.teslimler.count()).toBe(0);      // aynı sipariş iki kez alınmaz
  });

  it('eksik teslim: iki fotoğraf ve kayıtta hasar fotoğrafının yolu', async () => {
    await teslimAldim(siparis(), 7, sahteFoto(), sahteFoto(), '3 Kg çürük çıktı');

    const mektup = (await telefonDeposu.gidenKutusu.toArray())[0]!;
    expect(mektup.icerik.received_quantity).toBe(7);
    expect(mektup.icerik.invoice_photo_path).toMatch(/^otel-1\/deliveries\/.*-fatura\.jpg$/);
    expect(mektup.icerik.damage_photo_path).toMatch(/^otel-1\/deliveries\/.*-hasar\.jpg$/);
    expect(mektup.fotografYollari).toHaveLength(2);
    expect(await telefonDeposu.fotograflar.count()).toBe(2);
  });
});

describe('Eksi kattaki depo (offline)', () => {
  it('internet yokken teslim telefonda bekler; gelince önce iki fotoğraf, sonra kayıt gider', async () => {
    ucakModu(true);
    const ag = sahteAg();
    ag.kabloyuCek();

    await teslimAldim(siparis(), 7, sahteFoto(), sahteFoto(), 'çürük');
    await mektuplariGonder(ag.gonder, ag.yukle);

    expect(ag.olaylar).toEqual([]);                              // uçak modunda ağa dokunulmaz
    expect(await telefonDeposu.gidenKutusu.count()).toBe(1);
    expect(await telefonDeposu.fotograflar.count()).toBe(2);

    ucakModu(false);                                             // depodan çıkıldı, internet geldi
    ag.kabloyuTak();
    await mektuplariGonder(ag.gonder, ag.yukle);

    expect(ag.olaylar).toHaveLength(3);
    expect(ag.olaylar[0]).toMatch(/^foto:.*-fatura\.jpg$/);      // önce fatura
    expect(ag.olaylar[1]).toMatch(/^foto:.*-hasar\.jpg$/);       // sonra kanıt
    expect(ag.olaylar[2]).toMatch(/^kayit:/);                    // en son kayıt (sunucu kuralı bunu ister)
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
    expect(await telefonDeposu.fotograflar.count()).toBe(0);     // telefon boşaldı
  });

  it('hasar fotoğrafında internet kesilirse kayıt GİTMEZ; yüklenen fotoğraf tekrar yüklenmez', async () => {
    const ag = sahteAg();
    await teslimAldim(siparis(), 7, sahteFoto(), sahteFoto(), '');

    const yollar = (await telefonDeposu.gidenKutusu.toArray())[0]?.fotografYollari ?? [];
    const yarimYukleyici: Yukleyici = async (yol, veri) => {
      if (yol === yollar[1]) return { ok: false, kalici: false, hata: 'Failed to fetch' };
      return ag.yukle(yol, veri);
    };

    await mektuplariGonder(ag.gonder, yarimYukleyici);
    expect(ag.olaylar).toEqual([expect.stringMatching(/^foto:.*-fatura\.jpg$/)]);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(1);     // kayıt hâlâ bekliyor
    expect(await telefonDeposu.fotograflar.count()).toBe(1);     // yalnızca hasar fotoğrafı kaldı

    await mektuplariGonder(ag.gonder, ag.yukle);                 // ikinci fırsat
    expect(ag.olaylar).toHaveLength(3);                          // fatura ikinci kez yüklenmedi
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });
});
