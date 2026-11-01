// YALNIZCA TESTLER İÇİN — uygulama bu dosyayı kullanmaz.
// Supabase istemcisinin, "Otel bulunamadı" hatasıyla ilgili davranışlarını bellekte taklit eder (karar 029):
//   * Oturum: getSession() geçerli kart, kart yok ya da "yenileme bekleme süresi" (session: null + ağ hatası) döner.
//   * Kart seçimi gerçek kütüphane gibidir: sorguya açıkça Authorization konmadıysa oturumdaki kart, o da yoksa
//     herkese açık (anon) anahtar kullanılır.
//   * Sunucu kuralları (RLS): anon hiçbir personel satırı görmez → 200 + boş liste. Süresi dolmuş kart → 401.
//     Geçerli kart yalnızca üyesi olduğu otellerin satırlarını görür. Yazma: anon/dolmuş kart → 401.
//   * Fotoğraf deposu: anon yükleme kural ihlaliyle reddedilir (status 400, statusCode "403") — taklittir.
//   * Gecikme: "bekle" sözü verilen tablo, söz tutulana kadar cevap vermez (geç gelen cevap denemeleri).
import { AuthRetryableFetchError } from '@supabase/supabase-js';

export type Satir = Record<string, unknown>;
export type KartDurumu = 'gecerli' | 'dolmus';

export interface IstekKaydi {
  tablo: string;
  islem: 'oku' | 'yaz' | 'yukle';
  kimlik: string;          // 'anon' · '<kişi>' · '<kişi>:dolmus'
  acikKart: boolean;       // Authorization sorguya açıkça mı kondu?
}

export interface SahteBeyin {
  oturum: { kisi: string; kart: KartDurumu } | null;
  yenilemeBeklemesi: boolean;               // true: getSession → session null + yeniden denenebilir hata
  agYok: boolean;                           // true: her istek ağ hatası
  uyelikler: Satir[];                       // memberships satırları (user_id, hotel_id, …)
  tablolar: Record<string, Satir[]>;        // diğer tablolar (hotel_id taşır)
  bekle: Record<string, Promise<void> | undefined>;
  istekler: IstekKaydi[];
  dinleyiciler: Array<(olay: string, oturum: unknown) => void>;
  getSessionSayisi: number;
  oturumBekle: Promise<void> | undefined;   // verilirse bir SONRAKİ getSession, o anki cevabı bu söz tutulunca verir (tek sefer)
  olayYay(olay: string): void;
  istemci: unknown;
}

const ANON = 'anon-anahtar';
const kartMetni = (kisi: string, kart: KartDurumu) => `kart:${kisi}:${kart}`;

export function sahteBeyin(): SahteBeyin {
  const s: SahteBeyin = {
    oturum: null,
    yenilemeBeklemesi: false,
    agYok: false,
    uyelikler: [],
    tablolar: {},
    bekle: {},
    istekler: [],
    dinleyiciler: [],
    getSessionSayisi: 0,
    oturumBekle: undefined,
    olayYay(olay) {
      const oturum = s.oturum ? oturumNesnesi(s.oturum.kisi, s.oturum.kart) : null;
      for (const d of [...s.dinleyiciler]) d(olay, oturum);
    },
    istemci: null,
  };

  function oturumNesnesi(kisi: string, kart: KartDurumu) {
    return {
      access_token: kartMetni(kisi, kart),
      refresh_token: 'yenileme',
      expires_at: Math.floor(Date.now() / 1000) + 3600,   // istemci geçerli sanır; sunucu "dolmus"u reddeder
      user: { id: kisi },
    };
  }

  async function getSession() {
    s.getSessionSayisi++;
    const cevap = oturumCevabi();                          // cevap SORULDUĞU andaki oturumu taşır
    const bekle = s.oturumBekle;
    s.oturumBekle = undefined;
    if (bekle) await bekle;
    return cevap;
  }
  function oturumCevabi() {
    if (s.yenilemeBeklemesi) {
      return { data: { session: null }, error: new AuthRetryableFetchError('Failed to fetch', 0) };
    }
    if (!s.oturum) return { data: { session: null }, error: null };
    return { data: { session: oturumNesnesi(s.oturum.kisi, s.oturum.kart) }, error: null };
  }

  // Kart → kimlik. Gerçek kütüphane: açık başlık yoksa oturum kartı, o da yoksa anon anahtar.
  async function kimligiBul(acik: string | undefined): Promise<{ kimlik: string; kisi: string | null; dolmus: boolean }> {
    const bearer = acik ?? (await getSession()).data.session?.access_token ?? ANON;
    const deger = bearer.replace(/^Bearer\s+/i, '');
    const m = deger.match(/^kart:([^:]+):(gecerli|dolmus)$/);
    if (!m) return { kimlik: 'anon', kisi: null, dolmus: false };
    const [, kisi = '', tur] = m;
    return { kimlik: tur === 'dolmus' ? `${kisi}:dolmus` : kisi, kisi, dolmus: tur === 'dolmus' };
  }

  function gorunen(tablo: string, kisi: string): Satir[] {
    const oteller = new Set(s.uyelikler.filter((u) => u.user_id === kisi).map((u) => u.hotel_id));
    if (tablo === 'memberships') return s.uyelikler.filter((u) => u.user_id === kisi);
    return (s.tablolar[tablo] ?? []).filter((r) => oteller.has(r.hotel_id));
  }

  function sorgu(tablo: string) {
    const filtreler: Array<(r: Satir) => boolean> = [];
    let basliklar: Record<string, string> = {};
    let yazilacak: Satir | null = null;
    let tek = false;
    const b = {
      select: () => b,
      eq: (alan: string, deger: unknown) => (filtreler.push((r) => r[alan] === deger), b),
      neq: (alan: string, deger: unknown) => (filtreler.push((r) => r[alan] !== deger), b),
      match: (kosul: Satir) => (filtreler.push((r) => Object.entries(kosul).every(([k, v]) => r[k] === v)), b),
      upsert: (satir: Satir) => ((yazilacak = satir), b),
      update: (satir: Satir) => ((yazilacak = satir), b),
      maybeSingle: () => ((tek = true), b),
      setHeader: (ad: string, deger: string) => ((basliklar = { ...basliklar, [ad]: deger }), b),
      then: (tamam: (v: unknown) => unknown, hata?: (e: unknown) => unknown) => calistir().then(tamam, hata),
    };
    // Cevap istek anında hesaplanır; "bekle" yalnızca teslimi geciktirir (geç gelen cevap eski veriyi taşır).
    async function calistir() {
      const k = await kimligiBul(basliklar.Authorization);
      s.istekler.push({ tablo, islem: yazilacak ? 'yaz' : 'oku', kimlik: k.kimlik, acikKart: 'Authorization' in basliklar });
      const gecikme = s.bekle[tablo];
      const cevap = hesapla(k);
      if (gecikme) await gecikme;
      return cevap;
    }
    function hesapla(k: { kimlik: string; kisi: string | null; dolmus: boolean }) {
      if (s.agYok) return { data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 };
      if (k.dolmus) return { data: null, error: { message: 'JWT expired', code: 'PGRST303' }, status: 401 };
      if (yazilacak) {
        if (!k.kisi) return { data: null, error: { message: 'permission denied', code: '42501' }, status: 401 };
        const satir = { ...yazilacak, created_by: k.kisi };
        (s.tablolar[tablo] ??= []).push(satir);
        return { data: [satir], error: null, status: 201 };
      }
      const satirlar = k.kisi ? gorunen(tablo, k.kisi).filter((r) => filtreler.every((f) => f(r))) : [];
      return { data: tek ? (satirlar[0] ?? null) : satirlar, error: null, status: 200 };
    }
    return b;
  }

  s.istemci = {
    auth: {
      getSession,
      onAuthStateChange: (dinleyici: (olay: string, oturum: unknown) => void) => {
        s.dinleyiciler.push(dinleyici);
        return { data: { subscription: { unsubscribe: () => { s.dinleyiciler = s.dinleyiciler.filter((d) => d !== dinleyici); } } } };
      },
      signOut: async () => ({ error: null }),
    },
    from: (tablo: string) => sorgu(tablo),
    storage: {
      from: () => ({
        upload: async (_yol: string, _veri: unknown, secenek?: { headers?: Record<string, string> }) => {
          const k = await kimligiBul(secenek?.headers?.Authorization);
          s.istekler.push({ tablo: 'photos', islem: 'yukle', kimlik: k.kimlik, acikKart: Boolean(secenek?.headers?.Authorization) });
          if (s.agYok) return { data: null, error: { message: 'Failed to fetch' } };
          if (k.dolmus) return { data: null, error: { message: 'jwt expired', status: 401, statusCode: '401' } };
          if (!k.kisi) return { data: null, error: { message: 'new row violates row-level security policy', status: 400, statusCode: '403' } };
          return { data: {}, error: null };
        },
      }),
    },
  };
  return s;
}

// Testlerde localStorage yoktur (node). Basit bir bellek deposu.
export function bellekDeposu(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
  };
}
