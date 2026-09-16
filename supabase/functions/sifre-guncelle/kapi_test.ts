// ŞİFRE GÜNCELLE — kabuk ve yetki testleri. Çalıştırmak: deno test supabase/functions/sifre-guncelle/
import { assertEquals } from 'jsr:@std/assert@1';
import { degistirebilirMi, istegiDenetle, istegiIsle, MESAJ, type Bagimliliklar } from './kapi.ts';

const OTEL = 'a0000000-0000-4000-8000-000000000001';
const MUDUR = 'a0000000-0000-4000-8000-00000000a003';
const GOREVLI = 'a0000000-0000-4000-8000-00000000a001';
const GECERLI = { hotel_id: OTEL, user_id: GOREVLI, password: 'yeni1234' };

function sahteDunya(
  ayar: { cagiranRol?: string | null; cagiranId?: string; hedefRol?: string | null; baskaOtel?: boolean; yazmaHatasi?: boolean } = {},
) {
  const izler: string[] = [];
  const dis: Bagimliliklar = {
    cagiran: async () => ({ id: ayar.cagiranId ?? MUDUR, rol: ayar.cagiranRol === undefined ? 'manager' : ayar.cagiranRol }),
    hedefRolu: async () => (ayar.hedefRol === undefined ? 'staff' : ayar.hedefRol),
    baskaOteldeMi: async () => ayar.baskaOtel === true,
    sifreyiYaz: async (id, sifre) => {
      izler.push(`yaz:${id}:${sifre}`);
      return ayar.yazmaHatasi ? { ok: false, hata: 'olmadı' } : { ok: true };
    },
  };
  return { dis, izler };
}

function istek(govde: unknown, kart: string | null = 'kart-123'): Request {
  return new Request('http://kapi/sifre-guncelle', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(kart ? { authorization: `Bearer ${kart}` } : {}) },
    body: JSON.stringify(govde),
  });
}

Deno.test('Denetim: temiz istek kabul edilir', () => {
  const d = istegiDenetle(GECERLI);
  assertEquals(d.ok, true);
});

Deno.test('Denetim: kısa şifre reddedilir, sebebi tek cümle', () => {
  const d = istegiDenetle({ ...GECERLI, password: 'kisa' });
  assertEquals(d.ok, false);
  if (!d.ok) assertEquals(d.mesaj, MESAJ.sifre);
});

Deno.test('Denetim: bozuk kimlikler reddedilir', () => {
  assertEquals(istegiDenetle({ ...GECERLI, user_id: 'kim' }).ok, false);
  assertEquals(istegiDenetle({ ...GECERLI, hotel_id: 'otel' }).ok, false);
  assertEquals(istegiDenetle(null).ok, false);
});

Deno.test('Yetki: sahip müdürün ve görevlinin, müdür yalnızca görevlinin şifresini değiştirir', () => {
  assertEquals(degistirebilirMi('owner', 'manager'), true);
  assertEquals(degistirebilirMi('owner', 'staff'), true);
  assertEquals(degistirebilirMi('manager', 'staff'), true);
  assertEquals(degistirebilirMi('manager', 'manager'), false);
  assertEquals(degistirebilirMi('staff', 'staff'), false);
  assertEquals(degistirebilirMi(null, 'staff'), false);
});

Deno.test('Yetki: sahibin şifresine kimse dokunamaz', () => {
  assertEquals(degistirebilirMi('owner', 'owner'), false);
  assertEquals(degistirebilirMi('manager', 'owner'), false);
});

Deno.test('Kartsız istek reddedilir', async () => {
  const { dis, izler } = sahteDunya();
  const cevap = await istegiIsle(istek(GECERLI, null), dis);
  assertEquals(cevap.status, 401);
  assertEquals(izler.length, 0);
});

Deno.test('Müdür görevlinin şifresini yeniler', async () => {
  const { dis, izler } = sahteDunya();
  const cevap = await istegiIsle(istek(GECERLI), dis);
  assertEquals(cevap.status, 200);
  assertEquals(izler, [`yaz:${GOREVLI}:yeni1234`]);
});

Deno.test('Müdür başka bir müdürün şifresini değiştiremez', async () => {
  const { dis, izler } = sahteDunya({ hedefRol: 'manager' });
  const cevap = await istegiIsle(istek(GECERLI), dis);
  assertEquals(cevap.status, 403);
  assertEquals(izler.length, 0);
});

Deno.test('Görevli hiç kimsenin şifresini değiştiremez', async () => {
  const { dis, izler } = sahteDunya({ cagiranRol: 'staff' });
  assertEquals((await istegiIsle(istek(GECERLI), dis)).status, 403);
  assertEquals(izler.length, 0);
});

Deno.test('Başka otelin müdürü dokunamaz (bu otelde rolü yok)', async () => {
  const { dis, izler } = sahteDunya({ cagiranRol: null });
  assertEquals((await istegiIsle(istek(GECERLI), dis)).status, 403);
  assertEquals(izler.length, 0);
});

Deno.test('Otelde çalışmayan kişinin şifresi değiştirilemez', async () => {
  const { dis, izler } = sahteDunya({ hedefRol: null });
  const cevap = await istegiIsle(istek(GECERLI), dis);
  assertEquals(cevap.status, 404);
  assertEquals(izler.length, 0);
});

Deno.test('Kendi şifresi bu kapıdan değiştirilmez', async () => {
  const { dis, izler } = sahteDunya({ cagiranId: GOREVLI });
  const cevap = await istegiIsle(istek(GECERLI), dis);
  assertEquals(cevap.status, 400);
  assertEquals((await cevap.json()).mesaj, MESAJ.kendisi);
  assertEquals(izler.length, 0);
});

Deno.test('İki otelde çalışan kişinin şifresi değiştirilmez (yetki sıçraması)', async () => {
  const { dis, izler } = sahteDunya({ baskaOtel: true });
  const cevap = await istegiIsle(istek(GECERLI), dis);
  assertEquals(cevap.status, 409);
  assertEquals((await cevap.json()).mesaj, MESAJ.cokOtel);
  assertEquals(izler.length, 0);            // ana anahtara hiç gidilmez
});

Deno.test('"Başka otelde mi?" sorusu cevaplanamazsa şifre değişmez', async () => {
  const { dis, izler } = sahteDunya();
  dis.baskaOteldeMi = () => Promise.reject(new Error('bağlantı yok'));
  const cevap = await istegiIsle(istek(GECERLI), dis);
  assertEquals(cevap.status, 500);
  assertEquals(izler.length, 0);            // bilinmezlik "hayır" sayılmaz
});

Deno.test('Şifre yazılamazsa misafire teknik detay sızmaz', async () => {
  const { dis } = sahteDunya({ yazmaHatasi: true });
  const cevap = await istegiIsle(istek(GECERLI), dis);
  assertEquals(cevap.status, 500);
  assertEquals((await cevap.json()).mesaj, MESAJ.genel);
});
