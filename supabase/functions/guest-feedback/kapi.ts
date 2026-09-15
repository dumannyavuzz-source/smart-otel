// =====================================================================
// MİSAFİR KAPISI — HTTP kabuğu (saf mantık)
//
// Bu dosya ağa ve veritabanına dokunmaz; sadece isteği okur, denetler,
// "yorum yazıcı"ya verir ve cevabı hazırlar. Bu yüzden tek başına test edilir.
//
// Dışarıdan gelen her şey güvenilmezdir: biçim, tip, uzunluk burada denetlenir.
// Veritabanı (misafir_yorumu_yaz) aynı denetimleri bir kez daha yapar — çift kilit.
//
// Kaynak: docs/security/001-rls-and-maker-checker.md (Bölüm 5 · Misafir yorumu)
// =====================================================================

export interface MisafirYorumu {
  oda_kodu: string;        // QR'daki tahmin edilemez kod (rooms.guest_code)
  puan: number;            // 1–5
  yorum: string | null;    // en fazla 500 karakter, boşsa null
}

// Veritabanına yazan taraf. index.ts gerçek olanı verir; testler sahtesini.
export type YorumYazici = (yorum: MisafirYorumu) => Promise<void>;

// Misafirin görebileceği mesajlar. Teknik detay yok. Kodun var olup olmadığı söylenmez.
export const MESAJ = {
  gecersizBaglanti: 'Bu bağlantı geçersiz.',
  puan: 'Puan 1 ile 5 arasında olmalı.',
  yorumUzun: 'Yorum en fazla 500 karakter olabilir.',
  cokSik: 'Lütfen biraz sonra tekrar deneyin.',
  genel: 'Bu işlem yapılamadı.',
} as const;

const EN_BUYUK_GOVDE = 4096;            // bayt — bir yorum için fazlasıyla yeter
const ODA_KODU_BICIMI = /^[0-9a-f]{32}$/;
const EN_UZUN_YORUM = 500;

export async function istegiIsle(
  istek: Request,
  yorumYaz: YorumYazici,
  izinliKaynak = '*',
): Promise<Response> {
  const cevap = cevapHazirla(izinliKaynak);

  // Tarayıcının ön kontrolü (CORS)
  if (istek.method === 'OPTIONS') {
    return cevap(204);
  }

  if (istek.method !== 'POST') {
    return cevap(405, { ok: false, mesaj: MESAJ.genel });
  }

  // Gövde boyutu
  const uzunlukBasligi = Number(istek.headers.get('content-length') ?? '0');
  if (uzunlukBasligi > EN_BUYUK_GOVDE) {
    return cevap(413, { ok: false, mesaj: MESAJ.genel });
  }
  const govde = await istek.text();
  if (govde.length > EN_BUYUK_GOVDE) {
    return cevap(413, { ok: false, mesaj: MESAJ.genel });
  }

  // JSON
  let veri: unknown;
  try {
    veri = JSON.parse(govde);
  } catch {
    return cevap(400, { ok: false, mesaj: MESAJ.genel });
  }

  // Denetim
  const sonuc = yorumuDenetle(veri);
  if (!sonuc.ok) {
    reddiKaydet(sonuc.mesaj, veri);
    return cevap(400, { ok: false, mesaj: sonuc.mesaj });
  }

  // Yaz
  try {
    await yorumYaz(sonuc.yorum);
    return cevap(200, { ok: true });
  } catch (hata) {
    const mesaj = hata instanceof Error ? hata.message : String(hata);

    // Veritabanının misafire söylenebilir cevapları
    if (mesaj === MESAJ.gecersizBaglanti || mesaj === MESAJ.puan || mesaj === MESAJ.yorumUzun) {
      reddiKaydet(mesaj, veri);
      return cevap(400, { ok: false, mesaj });
    }
    if (mesaj === MESAJ.cokSik) {
      reddiKaydet(mesaj, veri);
      return cevap(429, { ok: false, mesaj });
    }

    // Beklenmeyen her şey: detay yalnızca sunucu kaydına, misafire genel mesaj
    console.error('[misafir-kapisi] beklenmeyen hata:', mesaj);
    return cevap(500, { ok: false, mesaj: MESAJ.genel });
  }
}

// ---------------------------------------------------------------------
// Denetim: dışarıdan gelen veri → temiz MisafirYorumu, ya da tek cümlelik ret
// ---------------------------------------------------------------------
type Denetim =
  | { ok: true; yorum: MisafirYorumu }
  | { ok: false; mesaj: string };

export function yorumuDenetle(veri: unknown): Denetim {
  if (typeof veri !== 'object' || veri === null || Array.isArray(veri)) {
    return { ok: false, mesaj: MESAJ.gecersizBaglanti };
  }
  const v = veri as Record<string, unknown>;

  if (typeof v.oda_kodu !== 'string' || !ODA_KODU_BICIMI.test(v.oda_kodu)) {
    return { ok: false, mesaj: MESAJ.gecersizBaglanti };
  }

  if (typeof v.puan !== 'number' || !Number.isInteger(v.puan) || v.puan < 1 || v.puan > 5) {
    return { ok: false, mesaj: MESAJ.puan };
  }

  let yorum: string | null = null;
  if (v.yorum !== undefined && v.yorum !== null) {
    if (typeof v.yorum !== 'string') {
      return { ok: false, mesaj: MESAJ.yorumUzun };
    }
    const temiz = v.yorum.trim();
    if (temiz.length > EN_UZUN_YORUM) {
      return { ok: false, mesaj: MESAJ.yorumUzun };
    }
    yorum = temiz === '' ? null : temiz;
  }

  return { ok: true, yorum: { oda_kodu: v.oda_kodu, puan: v.puan, yorum } };
}

// ---------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------
function cevapHazirla(izinliKaynak: string) {
  const basliklar = {
    'Access-Control-Allow-Origin': izinliKaynak,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  return (durum: number, govde?: unknown): Response =>
    new Response(govde === undefined ? null : JSON.stringify(govde), { status: durum, headers: basliklar });
}

// Reddedilen denemeler sunucu kaydına düşer. Kodun tamamı yazılmaz (gizli sayılır), ilk 4 karakteri yeter.
function reddiKaydet(neden: string, veri: unknown): void {
  const kod = (veri as Record<string, unknown> | null)?.oda_kodu;
  const onEk = typeof kod === 'string' ? kod.slice(0, 4) + '…' : '(yok)';
  console.warn('[misafir-kapisi] reddedildi:', neden, 'kod:', onEk);
}
