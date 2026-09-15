// QA — UÇAK MODU SENARYOLARI
// Gerçek Dexie kodu + sahte IndexedDB + sahte ağ. Amaç: internet kesildiğinde beyanlar ve fotoğraflar
// telefonda güvenle bekliyor mu, internet gelince postacı çökmeden, sırayla, tekrar etmeden gönderiyor mu?
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { telefonDeposu, type Oda } from './telefonDeposu';
import { SORUN_TURLERI, eksikVarBeyani, odaHazirBeyani, sorunBildirBeyani } from './beyanlar';
import { mektuplariGonder, type Gonderici, type Yukleyici } from './postaci';
import { aktifKullaniciyiAyarla } from './kullanici';

const ODA: Oda = { id: 'oda-1', hotel_id: 'otel-1', number: '204', floor: '2', staff_code: 'a'.repeat(32) };
const [ARIZA, HASERE] = SORUN_TURLERI;

function sahteFoto(boyut = 8): Blob {
  return new Blob([new Uint8Array(boyut)], { type: 'image/jpeg' });
}

// Sahte ağ: bağlantı açılıp kapanabilir, N. çağrıdan sonra "kablo çekilebilir"
function sahteAg() {
  const ag = {
    bagli: true,
    kabloyuCekSonra: Infinity,              // bu kadar başarılı çağrıdan sonra bağlantı kopar
    cagri: 0,
    gidenKayitlar: [] as string[],          // gönderilen mektup id'leri, sırayla
    yuklenenler: [] as string[],            // yüklenen fotoğraf yolları, sırayla
    sunucudakiFotograflar: new Set<string>(),
    olaylar: [] as string[],                // her şeyin sırası: "foto:<yol>" / "kayit:<id>"
  };
  const kopukMu = () => {
    if (!ag.bagli) return true;
    if (ag.cagri >= ag.kabloyuCekSonra) {
      ag.bagli = false;
      return true;
    }
    ag.cagri++;
    return false;
  };
  const gonder: Gonderici = async (m) => {
    if (kopukMu()) return { ok: false, kalici: false, hata: 'Failed to fetch' };
    ag.gidenKayitlar.push(m.id);
    ag.olaylar.push(`kayit:${m.id}`);
    return { ok: true };
  };
  const yukle: Yukleyici = async (yol) => {
    if (kopukMu()) return { ok: false, kalici: false, hata: 'Failed to fetch' };
    if (ag.sunucudakiFotograflar.has(yol)) return { ok: true };   // 409 "zaten var" → başarı sayılır
    ag.sunucudakiFotograflar.add(yol);
    ag.yuklenenler.push(yol);
    ag.olaylar.push(`foto:${yol}`);
    return { ok: true };
  };
  return { ag, gonder, yukle };
}

function ucakModu(acik: boolean) {
  vi.stubGlobal('navigator', { onLine: !acik });
}

beforeEach(async () => {
  aktifKullaniciyiAyarla('ayse');
  await telefonDeposu.gidenKutusu.clear();
  await telefonDeposu.fotograflar.clear();
  ucakModu(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Uçak modu', () => {
  it('internet yokken 3 beyan + 1 fotoğraf telefonda bekler; postacı hiçbir şey göndermez, çökmez', async () => {
    ucakModu(true);
    const { ag, gonder, yukle } = sahteAg();

    const temizlik = await odaHazirBeyani(ODA, ['Yatak']);
    const sorun = await sorunBildirBeyani(ODA, ARIZA, 'TV açılmıyor', sahteFoto());
    const eksik = await eksikVarBeyani(ODA, 'urun-havlu', 2);

    await mektuplariGonder(gonder, yukle);          // uçak modunda çağrıldı

    expect(ag.cagri).toBe(0);                       // ağa hiç dokunmadı
    expect(await telefonDeposu.gidenKutusu.count()).toBe(3);
    expect(await telefonDeposu.fotograflar.count()).toBe(1);
    expect((await telefonDeposu.gidenKutusu.orderBy('sira').primaryKeys())).toEqual([temizlik, sorun, eksik]);
  });

  it('internet gelince: önce fotoğraf, sonra kaydı; sıra eskiden yeniye; telefon boşalır', async () => {
    ucakModu(true);
    const { ag, gonder, yukle } = sahteAg();
    const temizlik = await odaHazirBeyani(ODA, ['Yatak']);
    const sorun = await sorunBildirBeyani(ODA, HASERE, '', sahteFoto());
    const eksik = await eksikVarBeyani(ODA, 'urun-havlu', 2);
    const fotoYolu = `otel-1/issues/${sorun}.jpg`;

    ucakModu(false);
    await mektuplariGonder(gonder, yukle);

    expect(ag.olaylar).toEqual([`kayit:${temizlik}`, `foto:${fotoYolu}`, `kayit:${sorun}`, `kayit:${eksik}`]);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
    expect(await telefonDeposu.fotograflar.count()).toBe(0);   // yüklenen fotoğraf telefondan silindi
  });

  it('bağlantı yarı yolda koparsa: gidenler gitti, kalanlar bekler; ikinci turda kimse iki kez gitmez', async () => {
    ucakModu(true);
    const { ag, gonder, yukle } = sahteAg();
    const a = await odaHazirBeyani(ODA, ['Yatak']);
    const b = await sorunBildirBeyani(ODA, ARIZA, 'lamba', sahteFoto());
    const c = await eksikVarBeyani(ODA, 'urun-sabun', 1);
    ucakModu(false);

    ag.kabloyuCekSonra = 2;                          // 1. kayıt + fotoğraf gider, sonra kablo çekilir
    await mektuplariGonder(gonder, yukle);

    expect(ag.olaylar).toEqual([`kayit:${a}`, `foto:otel-1/issues/${b}.jpg`]);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(2);           // b ve c bekliyor
    expect(await telefonDeposu.fotograflar.count()).toBe(0);           // fotoğraf yüklendi, silindi
    expect((await telefonDeposu.gidenKutusu.get(b))?.deneme).toBe(1);
    expect((await telefonDeposu.gidenKutusu.get(c))?.deneme).toBe(0);  // ona sıra gelmedi

    // internet geri geldi
    ag.bagli = true;
    ag.kabloyuCekSonra = Infinity;
    await mektuplariGonder(gonder, yukle);

    expect(ag.gidenKayitlar).toEqual([a, b, c]);                       // her biri tam bir kez
    expect(ag.yuklenenler.length).toBe(1);                             // fotoğraf yeniden yüklenmedi
    expect(await telefonDeposu.gidenKutusu.count()).toBe(0);
  });

  it('fotoğraf yüklenirken kablo çekilirse fotoğraf telefonda kalır, sonra yüklenir; sunucuda tek kopya', async () => {
    ucakModu(true);
    const { ag, gonder, yukle } = sahteAg();
    const sorun = await sorunBildirBeyani(ODA, ARIZA, 'musluk', sahteFoto());
    ucakModu(false);

    ag.kabloyuCekSonra = 0;                          // ilk çağrı (fotoğraf) kopar
    await mektuplariGonder(gonder, yukle);
    expect(await telefonDeposu.fotograflar.count()).toBe(1);
    expect(await telefonDeposu.gidenKutusu.count()).toBe(1);

    ag.bagli = true;
    ag.kabloyuCekSonra = Infinity;
    await mektuplariGonder(gonder, yukle);
    expect(ag.sunucudakiFotograflar.size).toBe(1);
    expect(ag.gidenKayitlar).toEqual([sorun]);
    expect(await telefonDeposu.fotograflar.count()).toBe(0);
  });

  it('fotoğraf sunucuda zaten varsa (önceki yarım deneme) yeniden yüklenmez, kayıt yine gider', async () => {
    const { ag, gonder, yukle } = sahteAg();
    const sorun = await sorunBildirBeyani(ODA, HASERE, '', sahteFoto());
    ag.sunucudakiFotograflar.add(`otel-1/issues/${sorun}.jpg`);       // sanki daha önce yüklenmiş

    await mektuplariGonder(gonder, yukle);

    expect(ag.yuklenenler).toEqual([]);
    expect(ag.gidenKayitlar).toEqual([sorun]);
    expect(await telefonDeposu.fotograflar.count()).toBe(0);
  });

  it('sunucu fotoğrafı kalıcı olarak reddederse (kilit) mektup işaretlenir, diğerleri yine gider', async () => {
    const { ag, gonder } = sahteAg();
    const sorun = await sorunBildirBeyani(ODA, ARIZA, 'kapı', sahteFoto());
    const temizlik = await odaHazirBeyani(ODA, []);
    const reddeden: Yukleyici = async () => ({ ok: false, kalici: true, hata: 'new row violates row-level security policy' });

    await mektuplariGonder(gonder, reddeden);

    expect(ag.gidenKayitlar).toEqual([temizlik]);                      // sorun kaydı fotoğrafsız GİTMEDİ
    expect((await telefonDeposu.gidenKutusu.get(sorun))?.sonHata).toContain('row-level security');
    expect(await telefonDeposu.fotograflar.count()).toBe(1);           // fotoğraf hâlâ telefonda, kanıt kaybolmaz
  });

  it('postacı aynı anda iki kez çağrılsa da mektuplar bir kez gider', async () => {
    const { ag, gonder, yukle } = sahteAg();
    const a = await odaHazirBeyani(ODA, []);
    const b = await odaHazirBeyani(ODA, []);

    await Promise.all([mektuplariGonder(gonder, yukle), mektuplariGonder(gonder, yukle)]);

    expect(ag.gidenKayitlar.sort()).toEqual([a, b].sort());
    expect(ag.gidenKayitlar.length).toBe(2);
  });

  it('kalıcı reddedilen fotoğraf sonraki turda yeniden denenir (deneme artar), asla silinmez', async () => {
    const { gonder } = sahteAg();
    const sorun = await sorunBildirBeyani(ODA, ARIZA, 'kapı', sahteFoto());
    let yuklemeDenemesi = 0;
    const reddeden: Yukleyici = async () => {
      yuklemeDenemesi++;
      return { ok: false, kalici: true, hata: 'Payload too large' };
    };

    await mektuplariGonder(gonder, reddeden);
    await mektuplariGonder(gonder, reddeden);
    expect(yuklemeDenemesi).toBe(2);
    expect((await telefonDeposu.gidenKutusu.get(sorun))?.deneme).toBe(2);
    expect(await telefonDeposu.fotograflar.count()).toBe(1);
  });
});
