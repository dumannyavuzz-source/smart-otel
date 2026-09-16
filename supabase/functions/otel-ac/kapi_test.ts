// KAYIT KAPISI — kabuk, sayaç ve "yarım iş kalmaz" testleri.
// Çalıştırmak: deno test supabase/functions/otel-ac/
import { assertEquals } from 'jsr:@std/assert@1';
import { istegiDenetle, istegiIsle, MESAJ, type Bagimliliklar } from './kapi.ts';

const GECERLI = { otel_adi: '  Deniz Otel  ', ad: '  Yavuz Duman  ', eposta: 'Yavuz@Otel.TEST', sifre: 'gizli1234' };
const OZET = 'a'.repeat(64);

function sahteDunya(
  ayar: { onceki?: number; zatenVar?: boolean; otelOlmaz?: boolean; uyelikOlmaz?: boolean; sayacBozuk?: boolean } = {},
) {
  const izler: string[] = [];
  const dis: Bagimliliklar = {
    denemeyiSayVeYaz: async (ozet) => {
      if (ayar.sayacBozuk) throw new Error('sayaç yok');
      izler.push(`sayac:${ozet.slice(0, 4)}`);
      return ayar.onceki ?? 0;
    },
    hesapAc: async (eposta) => {
      izler.push(`hesap:${eposta}`);
      return ayar.zatenVar
        ? { ok: false, zatenVar: true, hata: 'User already registered' }
        : { ok: true, id: 'yeni-kisi' };
    },
    otelAc: async (ad) => {
      izler.push(`otel:${ad}`);
      return ayar.otelOlmaz ? { ok: false, hata: 'olmadı' } : { ok: true, id: 'yeni-otel' };
    },
    uyelikYaz: async (otelId, kullaniciId, ad) => {
      izler.push(`uyelik:${otelId}:${kullaniciId}:${ad}`);
      return ayar.uyelikOlmaz ? { ok: false, hata: 'row-level security' } : { ok: true };
    },
    hesapSil: async (id) => {
      izler.push(`hesapSil:${id}`);
    },
    oteliSil: async (id) => {
      izler.push(`otelSil:${id}`);
    },
  };
  return { dis, izler };
}

function istek(govde: unknown): Request {
  return new Request('http://kapi/otel-ac', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(govde),
  });
}

Deno.test('Denetim: boşluklar kırpılır, e-posta küçük harfe iner', () => {
  const d = istegiDenetle(GECERLI);
  assertEquals(d.ok, true);
  if (d.ok) {
    assertEquals(d.istek.otel_adi, 'Deniz Otel');
    assertEquals(d.istek.ad, 'Yavuz Duman');
    assertEquals(d.istek.eposta, 'yavuz@otel.test');
  }
});

Deno.test('Denetim: eksik alanlar tek cümleyle reddedilir', () => {
  const dene = (ozel: Record<string, unknown>) => istegiDenetle({ ...GECERLI, ...ozel });
  assertEquals((dene({ otel_adi: 'A' }) as { mesaj: string }).mesaj, MESAJ.otelAdi);
  assertEquals((dene({ ad: '   ' }) as { mesaj: string }).mesaj, MESAJ.ad);
  assertEquals((dene({ eposta: 'bozuk' }) as { mesaj: string }).mesaj, MESAJ.eposta);
  assertEquals((dene({ sifre: 'kisa' }) as { mesaj: string }).mesaj, MESAJ.sifre);
  assertEquals(istegiDenetle(null).ok, false);
});

Deno.test('Temiz kayıt: hesap, otel ve ilk sahiplik sırayla yazılır', async () => {
  const { dis, izler } = sahteDunya();
  const cevap = await istegiIsle(istek(GECERLI), dis, OZET);
  assertEquals(cevap.status, 200);
  assertEquals(izler, [
    'sayac:aaaa',
    'hesap:yavuz@otel.test',
    'otel:Deniz Otel',
    'uyelik:yeni-otel:yeni-kisi:Yavuz Duman',
  ]);
});

Deno.test('Sayaç: saatte üçüncüden sonrası reddedilir, hiçbir şey açılmaz', async () => {
  const { dis, izler } = sahteDunya({ onceki: 3 });
  const cevap = await istegiIsle(istek(GECERLI), dis, OZET);
  assertEquals(cevap.status, 429);
  assertEquals((await cevap.json()).mesaj, MESAJ.cokSik);
  assertEquals(izler, ['sayac:aaaa']);
});

Deno.test('Sayaç çalışmıyorsa kapı açılmaz (bilinmezlik "sorun yok" değildir)', async () => {
  const { dis, izler } = sahteDunya({ sayacBozuk: true });
  assertEquals((await istegiIsle(istek(GECERLI), dis, OZET)).status, 500);
  assertEquals(izler.length, 0);
});

Deno.test('E-posta zaten kayıtlıysa otel HİÇ açılmaz', async () => {
  const { dis, izler } = sahteDunya({ zatenVar: true });
  const cevap = await istegiIsle(istek(GECERLI), dis, OZET);
  assertEquals(cevap.status, 409);
  assertEquals((await cevap.json()).mesaj, MESAJ.zatenKayitli);
  assertEquals(izler.includes('otel:Deniz Otel'), false);
});

Deno.test('Otel açılamazsa hesap geri silinir', async () => {
  const { dis, izler } = sahteDunya({ otelOlmaz: true });
  assertEquals((await istegiIsle(istek(GECERLI), dis, OZET)).status, 500);
  assertEquals(izler.includes('hesapSil:yeni-kisi'), true);
});

Deno.test('İlk sahiplik yazılamazsa otel de hesap da geri silinir (yarım otel kalmaz)', async () => {
  const { dis, izler } = sahteDunya({ uyelikOlmaz: true });
  assertEquals((await istegiIsle(istek(GECERLI), dis, OZET)).status, 500);
  assertEquals(izler.includes('otelSil:yeni-otel'), true);
  assertEquals(izler.includes('hesapSil:yeni-kisi'), true);
});

Deno.test('POST olmayan istek reddedilir, sayaç bile çalışmaz', async () => {
  const { dis, izler } = sahteDunya();
  const cevap = await istegiIsle(new Request('http://kapi/otel-ac', { method: 'GET' }), dis, OZET);
  assertEquals(cevap.status, 405);
  assertEquals(izler.length, 0);
});
