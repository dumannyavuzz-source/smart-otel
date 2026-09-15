// =====================================================================
// PERSONEL EKLE — saf mantık (test edilebilir; ağa dokunmaz)
//
// Müdür/sahip yeni bir personel hesabı açar. Hesap açmak ana anahtar ister; bu yüzden
// bu iş sunucuda yapılır. Ama sıra ve yetki bellidir:
//   1. Çağıran kim? (kartından)  2. O otelde müdür/sahip mi?  3. Neyi ekleyebilir?
//      sahip → müdür + görevli · müdür → yalnızca görevli · görevli → hiçbir şey
//   4. Hesap açılır (ana anahtar)  5. Üyelik ÇAĞIRANIN KENDİ yetkisiyle yazılır (kilitler geçerli)
//   6. Üyelik yazılamazsa hesap geri silinir (yarım iş kalmaz)
// =====================================================================

export type Gorev = 'housekeeping' | 'technician' | 'warehouse';
export type Rol = 'staff' | 'manager';

export interface PersonelIstegi {
  hotel_id: string;
  name: string;
  email: string;
  password: string;
  role: Rol;
  job: Gorev | null;      // görevlide zorunlu, müdürde boş
}

export const MESAJ = {
  yetki: 'Yetkiniz yok.',
  ad: 'Ad 1–60 karakter olmalı.',
  eposta: 'E-posta hatalı.',
  sifre: 'Şifre en az 8 karakter olmalı.',
  gorev: 'Görev seçin: kat görevlisi, teknisyen veya depo.',
  rol: 'Rol hatalı.',
  otel: 'Otel bilgisi eksik.',
  zatenKayitli: 'Bu e-posta zaten kayıtlı.',
  genel: 'Bu işlem yapılamadı.',
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOREVLER: Gorev[] = ['housekeeping', 'technician', 'warehouse'];

type Denetim = { ok: true; istek: PersonelIstegi } | { ok: false; mesaj: string };

export function istegiDenetle(veri: unknown): Denetim {
  if (typeof veri !== 'object' || veri === null || Array.isArray(veri)) return { ok: false, mesaj: MESAJ.genel };
  const v = veri as Record<string, unknown>;

  if (typeof v.hotel_id !== 'string' || !UUID.test(v.hotel_id)) return { ok: false, mesaj: MESAJ.otel };
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  if (name.length < 1 || name.length > 60) return { ok: false, mesaj: MESAJ.ad };
  const email = typeof v.email === 'string' ? v.email.trim().toLowerCase() : '';
  if (!EPOSTA.test(email) || email.length > 120) return { ok: false, mesaj: MESAJ.eposta };
  if (typeof v.password !== 'string' || v.password.length < 8 || v.password.length > 128) return { ok: false, mesaj: MESAJ.sifre };
  if (v.role !== 'staff' && v.role !== 'manager') return { ok: false, mesaj: MESAJ.rol };

  let job: Gorev | null = null;
  if (v.role === 'staff') {
    if (typeof v.job !== 'string' || !GOREVLER.includes(v.job as Gorev)) return { ok: false, mesaj: MESAJ.gorev };
    job = v.job as Gorev;
  }

  return { ok: true, istek: { hotel_id: v.hotel_id, name, email, password: v.password, role: v.role, job } };
}

// Kim kimi ekleyebilir?
export function ekleyebilirMi(cagiranRol: string | null, hedefRol: Rol): boolean {
  if (cagiranRol === 'owner') return true;
  if (cagiranRol === 'manager') return hedefRol === 'staff';
  return false;
}

// Dış dünya ile konuşan parçalar (index.ts gerçeğini, testler sahtesini verir)
export interface Bagimliliklar {
  cagiranRolu: (hotelId: string, kart: string) => Promise<string | null>;
  hesapAc: (email: string, password: string) => Promise<{ ok: true; id: string } | { ok: false; zatenVar: boolean; hata: string }>;
  uyelikYaz: (kart: string, uyelik: { hotel_id: string; user_id: string; role: Rol; name: string; job: Gorev | null }) => Promise<{ ok: boolean; hata?: string }>;
  hesapSil: (id: string) => Promise<void>;
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
    const rol = await dis.cagiranRolu(p.hotel_id, kart);
    if (!ekleyebilirMi(rol, p.role)) {
      console.warn('[personel-ekle] yetkisiz deneme, otel:', p.hotel_id.slice(0, 8));
      return cevap(403, { ok: false, mesaj: MESAJ.yetki });
    }

    const hesap = await dis.hesapAc(p.email, p.password);
    if (!hesap.ok) {
      if (hesap.zatenVar) return cevap(409, { ok: false, mesaj: MESAJ.zatenKayitli });
      console.error('[personel-ekle] hesap açılamadı:', hesap.hata);
      return cevap(500, { ok: false, mesaj: MESAJ.genel });
    }

    const uyelik = await dis.uyelikYaz(kart, { hotel_id: p.hotel_id, user_id: hesap.id, role: p.role, name: p.name, job: p.job });
    if (!uyelik.ok) {
      await dis.hesapSil(hesap.id);                       // yarım iş kalmasın
      console.error('[personel-ekle] üyelik yazılamadı:', uyelik.hata);
      return cevap(403, { ok: false, mesaj: MESAJ.yetki });
    }

    return cevap(200, { ok: true });
  } catch (hata) {
    console.error('[personel-ekle] beklenmeyen hata:', hata instanceof Error ? hata.message : String(hata));
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
