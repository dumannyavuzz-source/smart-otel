// =====================================================================
// ŞİFRE GÜNCELLE — saf mantık (test edilebilir; ağa dokunmaz)
//
// Müdür, şifresini unutan personelin şifresini panelden yeniler. Mail linki yoktur:
// müdür yeni şifreyi yazar ve kişiye kendisi söyler.
//
// Şifre değiştirmek ana anahtar ister; bu yüzden iş sunucuda yapılır. Sıra bellidir:
//   1. Çağıran kim ve bu otelde rolü ne? (kendi kartıyla sorulur)
//   2. Kendi şifresi mi? → hayır, bu kapı başkası içindir.
//   3. Hedef bu otelde çalışıyor mu? (yine çağıranın kartıyla; kilitler geçerli)
//   4. Kim kimin şifresini değiştirebilir?
//        sahip → müdür + görevli · müdür → yalnızca görevli · görevli → hiç kimse
//        sahibin şifresini kimse değiştiremez.
//   5. Hedef BAŞKA bir otelde de çalışıyor mu? → çalışıyorsa DEĞİŞTİRİLMEZ.
//        (Yoksa A otelinin müdürü, kişinin B otelindeki kapısını da açmış olurdu.)
//   6. Şifre yazılır (ana anahtarla yapılan TEK iş).
// =====================================================================

export interface SifreIstegi {
  hotel_id: string;
  user_id: string;        // şifresi yenilenecek kişi
  password: string;       // yeni şifre
}

export const MESAJ = {
  yetki: 'Yetkiniz yok.',
  sifre: 'Şifre en az 8 karakter olmalı.',
  kisi: 'Bu kişi otelinizde çalışmıyor.',
  kendisi: 'Kendi şifrenizi buradan değiştiremezsiniz.',
  cokOtel: 'Bu kişi birden fazla otelde çalışıyor. Şifresini Smartotel ekibi güncelleyebilir.',
  genel: 'Bu işlem yapılamadı.',
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Denetim = { ok: true; istek: SifreIstegi } | { ok: false; mesaj: string };

export function istegiDenetle(veri: unknown): Denetim {
  if (typeof veri !== 'object' || veri === null || Array.isArray(veri)) return { ok: false, mesaj: MESAJ.genel };
  const v = veri as Record<string, unknown>;

  if (typeof v.hotel_id !== 'string' || !UUID.test(v.hotel_id)) return { ok: false, mesaj: MESAJ.genel };
  if (typeof v.user_id !== 'string' || !UUID.test(v.user_id)) return { ok: false, mesaj: MESAJ.genel };
  if (typeof v.password !== 'string' || v.password.length < 8 || v.password.length > 128) {
    return { ok: false, mesaj: MESAJ.sifre };
  }

  return { ok: true, istek: { hotel_id: v.hotel_id, user_id: v.user_id, password: v.password } };
}

// Kim kimin şifresini değiştirebilir? (Ekranda da aynı kural durur; asıl kilit buradadır.)
export function degistirebilirMi(cagiranRol: string | null, hedefRol: string): boolean {
  // Varsayılan KAPALI: yalnızca bilinen iki rolün şifresi değiştirilebilir.
  // (Yarın "denetçi" diye yeni bir rol eklenirse bu satır onu kendiliğinden içeri almaz.)
  if (hedefRol !== 'staff' && hedefRol !== 'manager') return false;   // sahip de buraya takılır
  if (cagiranRol === 'owner') return true;                            // müdür ve görevli
  if (cagiranRol === 'manager') return hedefRol === 'staff';          // müdür yalnızca görevli
  return false;
}

// Dış dünya ile konuşan parçalar (index.ts gerçeğini, testler sahtesini verir)
export interface Bagimliliklar {
  cagiran: (hotelId: string, kart: string) => Promise<{ id: string; rol: string | null } | null>;
  hedefRolu: (hotelId: string, userId: string, kart: string) => Promise<string | null>;
  baskaOteldeMi: (hotelId: string, userId: string, kart: string) => Promise<boolean>;
  sifreyiYaz: (userId: string, password: string) => Promise<{ ok: boolean; hata?: string }>;
}

export async function istegiIsle(istek: Request, dis: Bagimliliklar, izinliKaynak = '*'): Promise<Response> {
  const cevap = cevapHazirla(izinliKaynak);
  if (istek.method === 'OPTIONS') return cevap(204);
  if (istek.method !== 'POST') return cevap(405, { ok: false, mesaj: MESAJ.genel });

  const kart = (istek.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!kart) return cevap(401, { ok: false, mesaj: MESAJ.yetki });

  let veri: unknown;
  try {
    veri = JSON.parse(await istek.text());
  } catch {
    return cevap(400, { ok: false, mesaj: MESAJ.genel });
  }

  const denetim = istegiDenetle(veri);
  if (!denetim.ok) return cevap(400, { ok: false, mesaj: denetim.mesaj });
  const { istek: p } = denetim;

  try {
    const cagiran = await dis.cagiran(p.hotel_id, kart);
    if (!cagiran) return cevap(401, { ok: false, mesaj: MESAJ.yetki });

    if (cagiran.id === p.user_id) return cevap(400, { ok: false, mesaj: MESAJ.kendisi });

    const hedefRol = await dis.hedefRolu(p.hotel_id, p.user_id, kart);
    if (!hedefRol) return cevap(404, { ok: false, mesaj: MESAJ.kisi });

    if (!degistirebilirMi(cagiran.rol, hedefRol)) {
      console.warn('[sifre-guncelle] yetkisiz deneme, otel:', p.hotel_id.slice(0, 8));
      return cevap(403, { ok: false, mesaj: MESAJ.yetki });
    }

    // Bir kişi iki otelde çalışıyorsa, bir otelin müdürü diğerinin kapısını açamaz.
    if (await dis.baskaOteldeMi(p.hotel_id, p.user_id, kart)) {
      return cevap(409, { ok: false, mesaj: MESAJ.cokOtel });
    }

    const yazma = await dis.sifreyiYaz(p.user_id, p.password);
    if (!yazma.ok) {
      console.error('[sifre-guncelle] şifre yazılamadı:', yazma.hata);
      return cevap(500, { ok: false, mesaj: MESAJ.genel });
    }

    return cevap(200, { ok: true });
  } catch (hata) {
    console.error('[sifre-guncelle] beklenmeyen hata:', hata instanceof Error ? hata.message : String(hata));
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
