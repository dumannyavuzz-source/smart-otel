// İş listesi ve bağlam (karar 028): ortak telefonda başkasının ya da diğer otelin bekleyen Aldım/Çözdüm'ü,
// giriş yapan kişinin aktif oteldeki iş listesini değiştirmez. Sunucu taklit edilir; ağa dokunulmaz.
// Bütün veriler bu dosyada üretilen deneme verileridir.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { telefonDeposu, type IsEmri } from './telefonDeposu';
import { kayitDeposu, type Kayit } from './kayitDeposu';
import { bekleyenleriUygula, isEmirleriniIndir, isiAl } from './isEmirleri';
import { aktifKullaniciyiAyarla } from './kullanici';

// Sunucudaki açık işler. "bekle" verilirse cevap o söz tutulana kadar yolda kalır.
const sunucu = vi.hoisted(() => ({
  satirlar: [] as Record<string, unknown>[],
  bekle: null as Promise<void> | null,
  istekGeldi: () => {},
}));

// Karar 029: liste yalnızca geçerli kartla sorulur ve kart sorgunun kendi başlığına konur (setHeader).
// Taklit, o anda giriş yapmış kişinin geçerli kartını verir.
vi.mock('./ortakBeyin', async () => {
  const { aktifKullanici } = await import('./kullanici');
  return {
    ortakBeyin: () => ({
      auth: {
        getSession: async () => ({
          data: { session: { access_token: 'deneme-karti', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: aktifKullanici() } } },
          error: null,
        }),
      },
      from: () => ({
        select: () => ({
          neq: () => ({
            setHeader: async () => {
              sunucu.istekGeldi();
              if (sunucu.bekle) await sunucu.bekle;
              return { data: sunucu.satirlar, error: null };
            },
          }),
        }),
      }),
    }),
  };
});

function satir(id: string, otel: string, ek: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    hotel_id: otel,
    room_id: 'oda-1',
    severity: 'normal',
    due_at: '2026-10-24T14:00:00.000Z',
    created_at: '2026-10-24T12:00:00.000Z',
    assigned_to: null,
    status: 'open',
    rooms: { number: '204' },
    issue_reports: { description: 'Arıza: musluk' },
    ...ek,
  };
}

function isEmri(id: string, otel: string): IsEmri {
  return {
    id,
    hotel_id: otel,
    room_id: 'oda-1',
    oda_no: '204',
    aciklama: 'Arıza: musluk',
    severity: 'normal',
    due_at: '2026-10-24T14:00:00.000Z',
    created_at: '2026-10-24T12:00:00.000Z',
    assigned_to: null,
    status: 'open',
  };
}

beforeEach(async () => {
  sunucu.satirlar = [];
  sunucu.bekle = null;
  sunucu.istekGeldi = () => {};
  aktifKullaniciyiAyarla('ali', 'otel-1');
  await kayitDeposu.kayitlar.clear();
  await kayitDeposu.fotograflar.clear();
  await telefonDeposu.isEmirleri.clear();
});

describe('İş listesi: kimin bekleyen işi uygulanır?', () => {
  it('ortak telefon: Ali\'nin bekleyen Aldım\'ı Mehmet girişliyken listeyi değiştirmez; Ali dönünce yine uygulanır', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 'otel-1'));
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);              // internet yok: yalnızca telefonda

    aktifKullaniciyiAyarla('mehmet', 'otel-1');
    sunucu.satirlar = [satir('w1', 'otel-1')];                             // sunucuda iş hâlâ sahipsiz
    await isEmirleriniIndir();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: null, status: 'open' });
    expect((await telefonDeposu.isEmirleri.get('w1'))?.onayBekliyor).toBeUndefined();

    await bekleyenleriUygula();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: null });
    expect(await kayitDeposu.kayitlar.count()).toBe(1);                   // Ali'nin kaydı silinmedi
    expect((await kayitDeposu.kayitlar.toArray())[0]).toMatchObject({ yazanId: 'ali', durum: 'bekliyor' });

    aktifKullaniciyiAyarla('ali', 'otel-1');
    await isEmirleriniIndir();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: 'ali', status: 'in_progress', onayBekliyor: true });
  });

  it('otel değişimi: otel-1\'deki bekleyen Aldım, otel-2 aktifken listeye uygulanmaz; otel-1\'e dönünce uygulanır', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('w1', 'otel-1'));
    await isiAl((await telefonDeposu.isEmirleri.get('w1'))!);

    aktifKullaniciyiAyarla('ali', 'otel-2');
    sunucu.satirlar = [satir('w1', 'otel-1'), satir('w9', 'otel-2')];     // iki otelin üyesi: ikisi de iner
    await isEmirleriniIndir();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: null });
    await bekleyenleriUygula();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: null });

    aktifKullaniciyiAyarla('ali', 'otel-1');
    await bekleyenleriUygula();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: 'ali', onayBekliyor: true });
  });

  it('kaydın oteli ile işin oteli uyuşmuyorsa uygulanmaz', async () => {
    aktifKullaniciyiAyarla('ali', 'otel-2');
    await telefonDeposu.isEmirleri.put(isEmri('w1', 'otel-1'));
    const kayit: Kayit = {
      id: 'k1',
      sira: 1,
      yazanId: 'ali',
      otelId: 'otel-2',                                                     // kayıt otel-2'nin, iş otel-1'in
      tablo: 'work_orders',
      icerik: { assigned_to: 'ali', status: 'in_progress' },
      islem: 'guncelle',
      kosul: { id: 'w1' },
      ozet: 'Oda 204 · İş emri: Aldım',
      olusturuldu: '2026-10-24T12:00:00.000Z',
      durum: 'bekliyor',
      deneme: 0,
    };
    await kayitDeposu.kayitlar.add(kayit);

    await bekleyenleriUygula();
    expect(await telefonDeposu.isEmirleri.get('w1')).toMatchObject({ assigned_to: null });
  });

  it('liste yoldayken kişi değişirse: geç gelen liste yeni kişinin telefondaki listesine yazılmaz', async () => {
    await telefonDeposu.isEmirleri.put(isEmri('yerel', 'otel-1'));
    sunucu.satirlar = [satir('alininIsi', 'otel-1', { assigned_to: 'ali', status: 'in_progress' })];
    let birak!: () => void;
    sunucu.bekle = new Promise<void>((r) => (birak = r));
    const istekte = new Promise<void>((r) => (sunucu.istekGeldi = r));

    const indirme = isEmirleriniIndir();                                  // Ali'nin kartıyla istek gitti
    await istekte;
    aktifKullaniciyiAyarla('mehmet', 'otel-1');                            // cevap yoldayken kişi değişti
    birak();
    await indirme;

    expect(await telefonDeposu.isEmirleri.get('alininIsi')).toBeUndefined();
    expect(await telefonDeposu.isEmirleri.get('yerel')).toBeDefined();     // liste olduğu gibi kaldı
  });
});
