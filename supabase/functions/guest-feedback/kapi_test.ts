// =====================================================================
// MİSAFİR KAPISI — kabuk testleri
// Çalıştırmak: deno test supabase/functions/guest-feedback/
//
// Veritabanına dokunmaz: "yorum yazıcı"nın sahtesi verilir.
// Veritabanı tarafındaki denemeler: supabase/tests/guvenlik_denemeleri.sql (18–19)
// =====================================================================
import { assertEquals, assertStringIncludes, assert } from 'jsr:@std/assert@1';
import { istegiIsle, MESAJ, type MisafirYorumu } from './kapi.ts';

const KAPI = 'http://kapi/guest-feedback';
const GECERLI_KOD = '0123456789abcdef0123456789abcdef';

// Sahte yazıcı: neyle çağrıldığını hatırlar; istenirse belirli bir mesajla patlar
function sahteYazici(patlat?: string) {
  const cagrilar: MisafirYorumu[] = [];
  const yaz = async (y: MisafirYorumu) => {
    if (patlat) throw new Error(patlat);
    cagrilar.push(y);
  };
  return { yaz, cagrilar };
}

function postIstegi(govde: unknown, basliklar: Record<string, string> = {}): Request {
  const metin = typeof govde === 'string' ? govde : JSON.stringify(govde);
  return new Request(KAPI, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...basliklar },
    body: metin,
  });
}

Deno.test('CORS ön kontrolü (OPTIONS) 204 döner ve başlıkları taşır', async () => {
  const { yaz } = sahteYazici();
  const c = await istegiIsle(new Request(KAPI, { method: 'OPTIONS' }), yaz, 'https://app.smartotel.test');
  assertEquals(c.status, 204);
  assertEquals(c.headers.get('access-control-allow-origin'), 'https://app.smartotel.test');
  assertEquals(c.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
});

Deno.test('POST dışındaki yöntemler 405', async () => {
  const { yaz, cagrilar } = sahteYazici();
  const c = await istegiIsle(new Request(KAPI, { method: 'GET' }), yaz);
  assertEquals(c.status, 405);
  assertEquals(cagrilar.length, 0);
});

Deno.test('Bozuk JSON 400 + genel mesaj', async () => {
  const { yaz, cagrilar } = sahteYazici();
  const c = await istegiIsle(postIstegi('{bozuk'), yaz);
  assertEquals(c.status, 400);
  assertEquals(await c.json(), { ok: false, mesaj: MESAJ.genel });
  assertEquals(cagrilar.length, 0);
});

Deno.test('Çok büyük gövde 413 (başlıkla ve gerçek boyutla)', async () => {
  const { yaz, cagrilar } = sahteYazici();
  const c1 = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 5 }, { 'content-length': '99999' }), yaz);
  assertEquals(c1.status, 413);
  const c2 = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 5, yorum: 'a'.repeat(5000) }), yaz);
  assertEquals(c2.status, 413);
  assertEquals(cagrilar.length, 0);
});

Deno.test('Uydurma / bozuk oda kodu → "Bu bağlantı geçersiz." — yazıcı hiç çağrılmaz', async () => {
  const { yaz, cagrilar } = sahteYazici();
  for (const kod of [undefined, null, 42, '', 'kisa', 'ABCDEF0123456789ABCDEF0123456789', GECERLI_KOD + 'x', "'; drop table rooms; --"]) {
    const c = await istegiIsle(postIstegi({ oda_kodu: kod, puan: 5 }), yaz);
    assertEquals(c.status, 400, `kod: ${String(kod)}`);
    assertEquals(await c.json(), { ok: false, mesaj: MESAJ.gecersizBaglanti });
  }
  assertEquals(cagrilar.length, 0);
});

Deno.test('Puan 1–5 tam sayı değilse reddedilir', async () => {
  const { yaz, cagrilar } = sahteYazici();
  for (const puan of [0, 6, 2.5, '3', null, undefined, -1]) {
    const c = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan }), yaz);
    assertEquals(c.status, 400, `puan: ${String(puan)}`);
    assertEquals(await c.json(), { ok: false, mesaj: MESAJ.puan });
  }
  assertEquals(cagrilar.length, 0);
});

Deno.test('500 karakterden uzun veya metin olmayan yorum reddedilir', async () => {
  const { yaz, cagrilar } = sahteYazici();
  const c1 = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 4, yorum: 'a'.repeat(501) }), yaz);
  assertEquals(c1.status, 400);
  assertEquals(await c1.json(), { ok: false, mesaj: MESAJ.yorumUzun });
  const c2 = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 4, yorum: { x: 1 } }), yaz);
  assertEquals(c2.status, 400);
  assertEquals(cagrilar.length, 0);
});

Deno.test('Geçerli yorum yazılır; yorum kırpılır, boş yorum null olur, fazla alanlar atılır', async () => {
  const { yaz, cagrilar } = sahteYazici();
  const c1 = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 2, yorum: '  Oda soğuktu  ', hotel_id: 'sahte', role: 'owner' }), yaz);
  assertEquals(c1.status, 200);
  assertEquals(await c1.json(), { ok: true });
  assertEquals(cagrilar[0], { oda_kodu: GECERLI_KOD, puan: 2, yorum: 'Oda soğuktu' });

  const c2 = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 5, yorum: '   ' }), yaz);
  assertEquals(c2.status, 200);
  assertEquals(cagrilar[1], { oda_kodu: GECERLI_KOD, puan: 5, yorum: null });

  const c3 = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 3 }), yaz);
  assertEquals(c3.status, 200);
  assertEquals(cagrilar[2].yorum, null);
});

Deno.test('Veritabanı "Bu bağlantı geçersiz." derse misafire aynı cümle, 400', async () => {
  const { yaz } = sahteYazici(MESAJ.gecersizBaglanti);
  const c = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 4 }), yaz);
  assertEquals(c.status, 400);
  assertEquals(await c.json(), { ok: false, mesaj: MESAJ.gecersizBaglanti });
});

Deno.test('Veritabanı "çok sık" derse 429', async () => {
  const { yaz } = sahteYazici(MESAJ.cokSik);
  const c = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 4 }), yaz);
  assertEquals(c.status, 429);
  assertEquals(await c.json(), { ok: false, mesaj: MESAJ.cokSik });
});

Deno.test('Beklenmeyen hata: misafire teknik detay SIZMAZ, 500 + genel mesaj', async () => {
  const { yaz } = sahteYazici('permission denied for table guest_feedback (relation public.guest_feedback)');
  const c = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 4 }), yaz);
  assertEquals(c.status, 500);
  const metin = await c.text();
  assertStringIncludes(metin, MESAJ.genel);
  assert(!metin.includes('permission'), 'teknik detay sızdı');
  assert(!metin.includes('guest_feedback'), 'tablo adı sızdı');
});

Deno.test('Her cevap JSON ve önbelleğe alınmaz', async () => {
  const { yaz } = sahteYazici();
  const c = await istegiIsle(postIstegi({ oda_kodu: GECERLI_KOD, puan: 1 }), yaz);
  assertStringIncludes(c.headers.get('content-type') ?? '', 'application/json');
  assertEquals(c.headers.get('cache-control'), 'no-store');
});
