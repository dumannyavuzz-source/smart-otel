// PERSONEL EKLE — kabuk ve yetki testleri. Çalıştırmak: deno test supabase/functions/personel-ekle/
import { assertEquals } from 'jsr:@std/assert@1';
import { ekleyebilirMi, istegiDenetle, istegiIsle, MESAJ, type Bagimliliklar } from './kapi.ts';

const OTEL = 'a0000000-0000-4000-8000-000000000001';
const GECERLI = { hotel_id: OTEL, name: 'Ayşe Yılmaz', email: 'Ayse@Otel.test', password: 'gizli1234', role: 'staff', job: 'housekeeping' };

function sahteDunya(ayar: { rol?: string | null; zatenVar?: boolean; uyelikOlmaz?: boolean } = {}) {
  const izler: string[] = [];
  const dis: Bagimliliklar = {
    cagiranRolu: async () => ayar.rol ?? 'manager',
    hesapAc: async (email) => {
      izler.push(`hesap:${email}`);
      return ayar.zatenVar ? { ok: false, zatenVar: true, hata: 'User already registered' } : { ok: true, id: 'yeni-kisi' };
    },
    uyelikYaz: async (_kart, u) => {
      izler.push(`uyelik:${u.role}:${u.job ?? '-'}:${u.name}`);
      return ayar.uyelikOlmaz ? { ok: false, hata: 'row-level security' } : { ok: true };
    },
    hesapSil: async (id) => {
      izler.push(`sil:${id}`);
    },
  };
  return { dis, izler };
}

function istek(govde: unknown, kart: string | null = 'kart-123'): Request {
  return new Request('http://kapi/personel-ekle', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(kart ? { authorization: `Bearer ${kart}` } : {}) },
    body: JSON.stringify(govde),
  });
}

Deno.test('Denetim: temiz istek kabul, e-posta küçük harfe, ad kırpılır', () => {
  const d = istegiDenetle({ ...GECERLI, name: '  Ayşe Yılmaz  ' });
  assertEquals(d.ok, true);
  if (d.ok) {
    assertEquals(d.istek.email, 'ayse@otel.test');
    assertEquals(d.istek.name, 'Ayşe Yılmaz');
    assertEquals(d.istek.job, 'housekeeping');
  }
});

Deno.test('Denetim: eksik/hatalı alanlar tek cümleyle reddedilir', () => {
  const beklenen: [unknown, string][] = [
    [{ ...GECERLI, hotel_id: 'x' }, MESAJ.otel],
    [{ ...GECERLI, name: '' }, MESAJ.ad],
    [{ ...GECERLI, email: 'ayse' }, MESAJ.eposta],
    [{ ...GECERLI, password: 'kisa' }, MESAJ.sifre],
    [{ ...GECERLI, role: 'owner' }, MESAJ.rol],                  // sahip uygulamadan eklenmez
    [{ ...GECERLI, job: 'ceo' }, MESAJ.gorev],
    [{ ...GECERLI, job: undefined }, MESAJ.gorev],
    ['dizi degil', MESAJ.genel],
  ];
  for (const [veri, mesaj] of beklenen) {
    const d = istegiDenetle(veri);
    assertEquals(d.ok, false, JSON.stringify(veri));
    if (!d.ok) assertEquals(d.mesaj, mesaj);
  }
});

Deno.test('Denetim: müdür eklenirken görev boş kalır', () => {
  const d = istegiDenetle({ ...GECERLI, role: 'manager', job: 'technician' });
  assertEquals(d.ok, true);
  if (d.ok) assertEquals(d.istek.job, null);
});

Deno.test('Yetki: sahip müdür+görevli, müdür yalnızca görevli, görevli/yabancı hiçbir şey', () => {
  assertEquals(ekleyebilirMi('owner', 'manager'), true);
  assertEquals(ekleyebilirMi('owner', 'staff'), true);
  assertEquals(ekleyebilirMi('manager', 'staff'), true);
  assertEquals(ekleyebilirMi('manager', 'manager'), false);
  assertEquals(ekleyebilirMi('staff', 'staff'), false);
  assertEquals(ekleyebilirMi(null, 'staff'), false);
});

Deno.test('Akış: müdür görevli ekler → hesap açılır, üyelik çağıranın kartıyla yazılır', async () => {
  const { dis, izler } = sahteDunya({ rol: 'manager' });
  const c = await istegiIsle(istek(GECERLI), dis);
  assertEquals(c.status, 200);
  assertEquals(izler, ['hesap:ayse@otel.test', 'uyelik:staff:housekeeping:Ayşe Yılmaz']);
});

Deno.test('Akış: kartsız istek 401, hesap açılmaz', async () => {
  const { dis, izler } = sahteDunya();
  const c = await istegiIsle(istek(GECERLI, null), dis);
  assertEquals(c.status, 401);
  assertEquals(izler, []);
});

Deno.test('Akış: görevli personel ekleyemez (403), hesap açılmaz', async () => {
  const { dis, izler } = sahteDunya({ rol: 'staff' });
  const c = await istegiIsle(istek(GECERLI), dis);
  assertEquals(c.status, 403);
  assertEquals(await c.json(), { ok: false, mesaj: MESAJ.yetki });
  assertEquals(izler, []);
});

Deno.test('Akış: müdür müdür ekleyemez (403); sahip ekler', async () => {
  const mudur = sahteDunya({ rol: 'manager' });
  assertEquals((await istegiIsle(istek({ ...GECERLI, role: 'manager' }), mudur.dis)).status, 403);
  assertEquals(mudur.izler, []);

  const sahip = sahteDunya({ rol: 'owner' });
  assertEquals((await istegiIsle(istek({ ...GECERLI, role: 'manager' }), sahip.dis)).status, 200);
  assertEquals(sahip.izler[1], 'uyelik:manager:-:Ayşe Yılmaz');
});

Deno.test('Akış: e-posta zaten kayıtlıysa 409, üyelik yazılmaz', async () => {
  const { dis, izler } = sahteDunya({ zatenVar: true });
  const c = await istegiIsle(istek(GECERLI), dis);
  assertEquals(c.status, 409);
  assertEquals(await c.json(), { ok: false, mesaj: MESAJ.zatenKayitli });
  assertEquals(izler, ['hesap:ayse@otel.test']);
});

Deno.test('Akış: üyelik yazılamazsa (kilit) açılan hesap geri silinir — yarım iş kalmaz', async () => {
  const { dis, izler } = sahteDunya({ uyelikOlmaz: true });
  const c = await istegiIsle(istek(GECERLI), dis);
  assertEquals(c.status, 403);
  assertEquals(izler, ['hesap:ayse@otel.test', 'uyelik:staff:housekeeping:Ayşe Yılmaz', 'sil:yeni-kisi']);
});

Deno.test('Akış: beklenmeyen hata misafire sızmaz', async () => {
  const { dis } = sahteDunya();
  dis.cagiranRolu = async () => {
    throw new Error('connection refused to db-internal-host');
  };
  const c = await istegiIsle(istek(GECERLI), dis);
  assertEquals(c.status, 500);
  const metin = await c.text();
  assertEquals(metin.includes('db-internal'), false);
});
