// =====================================================================
// KAYIT KAPISI (OTEL AÇ) — saf mantık (test edilebilir; ağa dokunmaz)
//
// Vitrindeki "Otelimi Ücretsiz Başlat" düğmesinin arkası. Sistemin tek kimlik doğrulamasız
// yazma yoludur; bu yüzden sıra katıdır ve yarım iş bırakmaz:
//   1. Sayaç: aynı adresten saatte en fazla 3 deneme.
//   2. Denetim: otel adı, ad, e-posta, şifre — dışarıdan gelen her şey güvenilmezdir.
//   3. Hesap açılır. E-posta zaten kayıtlıysa burada durulur (otel oluşturulmaz).
//   4. Otel açılır. Olmazsa hesap geri silinir.
//   5. İlk üyelik "owner" olarak yazılır. Olmazsa otel de hesap da geri silinir.
// Geriye ya çalışan bir otel kalır ya da hiçbir şey. Yarım otel diye bir şey yoktur.
// =====================================================================

export interface KayitIstegi {
  otel_adi: string;
  ad: string;
  eposta: string;
  sifre: string;
}

export const MESAJ = {
  otelAdi: 'Otel adı 2–80 karakter olmalı.',
  ad: 'Adınız 1–60 karakter olmalı.',
  eposta: 'E-posta hatalı.',
  sifre: 'Şifre en az 8 karakter olmalı.',
  zatenKayitli: 'Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.',
  cokSik: 'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.',
  genel: 'Bu işlem yapılamadı.',
} as const;

export const SAATTE_EN_FAZLA = 3;

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Denetim = { ok: true; istek: KayitIstegi } | { ok: false; mesaj: string };

export function istegiDenetle(veri: unknown): Denetim {
  if (typeof veri !== 'object' || veri === null || Array.isArray(veri)) return { ok: false, mesaj: MESAJ.genel };
  const v = veri as Record<string, unknown>;

  const otelAdi = typeof v.otel_adi === 'string' ? v.otel_adi.trim() : '';
  if (otelAdi.length < 2 || otelAdi.length > 80) return { ok: false, mesaj: MESAJ.otelAdi };

  const ad = typeof v.ad === 'string' ? v.ad.trim() : '';
  if (ad.length < 1 || ad.length > 60) return { ok: false, mesaj: MESAJ.ad };

  const eposta = typeof v.eposta === 'string' ? v.eposta.trim().toLowerCase() : '';
  if (!EPOSTA.test(eposta) || eposta.length > 120) return { ok: false, mesaj: MESAJ.eposta };

  if (typeof v.sifre !== 'string' || v.sifre.length < 8 || v.sifre.length > 128) {
    return { ok: false, mesaj: MESAJ.sifre };
  }

  return { ok: true, istek: { otel_adi: otelAdi, ad, eposta, sifre: v.sifre } };
}

// Dış dünya ile konuşan parçalar (index.ts gerçeğini, testler sahtesini verir)
export interface Bagimliliklar {
  denemeyiSayVeYaz: (ipOzeti: string) => Promise<number>;   // bu denemeden ÖNCEki sayı
  hesapAc: (eposta: string, sifre: string) => Promise<{ ok: true; id: string } | { ok: false; zatenVar: boolean; hata: string }>;
  otelAc: (ad: string) => Promise<{ ok: true; id: string } | { ok: false; hata: string }>;
  uyelikYaz: (otelId: string, kullaniciId: string, ad: string) => Promise<{ ok: boolean; hata?: string }>;
  hesapSil: (id: string) => Promise<void>;
  oteliSil: (id: string) => Promise<void>;
}

export async function istegiIsle(
  istek: Request,
  dis: Bagimliliklar,
  ipOzeti: string,
  izinliKaynak = '*',
): Promise<Response> {
  const cevap = cevapHazirla(izinliKaynak);
  if (istek.method === 'OPTIONS') return cevap(204);
  if (istek.method !== 'POST') return cevap(405, { ok: false, mesaj: MESAJ.genel });

  let veri: unknown;
  try {
    veri = JSON.parse(await istek.text());
  } catch {
    return cevap(400, { ok: false, mesaj: MESAJ.genel });
  }

  const denetim = istegiDenetle(veri);
  if (!denetim.ok) return cevap(400, { ok: false, mesaj: denetim.mesaj });
  const { istek: k } = denetim;

  try {
    // Sayaç önce çalışır: bozuk isteklerle sayaç şişirilmesin diye denetimden hemen sonra.
    const onceki = await dis.denemeyiSayVeYaz(ipOzeti);
    if (onceki >= SAATTE_EN_FAZLA) {
      console.warn('[otel-ac] çok sık deneme');
      return cevap(429, { ok: false, mesaj: MESAJ.cokSik });
    }

    const hesap = await dis.hesapAc(k.eposta, k.sifre);
    if (!hesap.ok) {
      if (hesap.zatenVar) return cevap(409, { ok: false, mesaj: MESAJ.zatenKayitli });
      console.error('[otel-ac] hesap açılamadı:', hesap.hata);
      return cevap(500, { ok: false, mesaj: MESAJ.genel });
    }

    const otel = await dis.otelAc(k.otel_adi);
    if (!otel.ok) {
      await dis.hesapSil(hesap.id);                        // yarım iş kalmasın
      console.error('[otel-ac] otel açılamadı:', otel.hata);
      return cevap(500, { ok: false, mesaj: MESAJ.genel });
    }

    const uyelik = await dis.uyelikYaz(otel.id, hesap.id, k.ad);
    if (!uyelik.ok) {
      await dis.oteliSil(otel.id);
      await dis.hesapSil(hesap.id);
      console.error('[otel-ac] üyelik yazılamadı:', uyelik.hata);
      return cevap(500, { ok: false, mesaj: MESAJ.genel });
    }

    return cevap(200, { ok: true });
  } catch (hata) {
    console.error('[otel-ac] beklenmeyen hata:', hata instanceof Error ? hata.message : String(hata));
    return cevap(500, { ok: false, mesaj: MESAJ.genel });
  }
}

function cevapHazirla(izinliKaynak: string) {
  const basliklar = {
    'Access-Control-Allow-Origin': izinliKaynak,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  return (durum: number, govde?: unknown): Response =>
    new Response(govde === undefined ? null : JSON.stringify(govde), { status: durum, headers: basliklar });
}
