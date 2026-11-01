// Oturum ve üyelikler (karar 029): "kimlik yoksa bilmiyorum" — kimliksiz bir sorgunun boş cevabı
// "bu kişinin oteli yok" sayılmaz; aynı kişinin bilinen üyelikleri korunur; gerçek iptal ise gizlenmez.
// Supabase istemcisi sahteBeyin ile taklit edilir; ağa dokunulmaz. Bütün veriler deneme verisidir.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bellekDeposu, sahteBeyin, type SahteBeyin, type Satir } from './testYardimcilari/sahteBeyin';
import { CIKIS_OLAYI } from './olaylar';
import { aktifProfil } from './kullanici';

const tutucu = vi.hoisted(() => ({ beyin: null as unknown as SahteBeyin }));
vi.mock('./ortakBeyin', () => ({ ortakBeyin: () => tutucu.beyin.istemci, ayarlarTamamMi: () => true }));

const { oturumuIzle } = await import('./oturum');
type Hal = Parameters<Parameters<typeof oturumuIzle>[0]>[0];

const PROFIL = 'smartotel.uyelikler';
const OTEL = 'smartotel.otel';

function uyelik(kisi: string, otel: string): Satir {
  return { user_id: kisi, hotel_id: otel, role: 'staff', name: `Prova ${kisi}`, job: 'housekeeping', hotels: { name: `Otel ${otel}`, demo_bitis_tarihi: null } };
}
function onbellegeYaz(kisi: string, oteller: string[]) {
  localStorage.setItem(PROFIL, JSON.stringify({ id: kisi, uyelikler: oteller.map((o) => uyelik(kisi, o)) }));
}
function onbellek(): { id: string; uyelikler: Satir[] } | null {
  return JSON.parse(localStorage.getItem(PROFIL) ?? 'null');
}
function kayitliOturum(kisi: string) {
  localStorage.setItem('sb-deneme-auth-token', JSON.stringify({ user: { id: kisi } }));
}
const anonUyelikSorgusu = () => tutucu.beyin.istekler.filter((i) => i.tablo === 'memberships' && i.kimlik === 'anon').length;
const uyelikSorgusu = () => tutucu.beyin.istekler.filter((i) => i.tablo === 'memberships').length;

let dur: (() => void) | null = null;
function izle() {
  const haller: Hal[] = [];
  dur = oturumuIzle((h) => haller.push(h));
  return { haller, son: () => haller.at(-1) };
}
const bekle = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function sakinlesmesiniBekle() {
  for (let i = 0; i < 20; i++) await bekle(0);
}

beforeEach(() => {
  tutucu.beyin = sahteBeyin();
  vi.stubGlobal('localStorage', bellekDeposu());
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => {
  dur?.();
  dur = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Geçerli kimlikle gelen cevap', () => {
  it('T1 · iki üyelik: otel seçimi istenir, önbellek 2 otel', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('kat1', 'B')];
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('otelSec'));
    expect(onbellek()?.uyelikler).toHaveLength(2);
    expect(anonUyelikSorgusu()).toBe(0);
  });

  it('T1 · seçili otel biliniyorsa doğrudan çalışma ekranı', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('kat1', 'B')];
    localStorage.setItem(OTEL, 'A');
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    expect(aktifProfil()?.otelId).toBe('A');
  });

  it('T2 · gerçek iptal: geçerli kimlikle boş liste → "Otel bulunamadı", önbellek boşalır', async () => {
    onbellegeYaz('kat1', ['A', 'B']);
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [];                              // müdür üyeliği kaldırdı
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('otelsiz'));
    expect(onbellek()).toEqual({ id: 'kat1', uyelikler: [] });
  });

  it('T11 · seçili otelin üyeliği kalktı, diğeri duruyor → kalan otele geçilir', async () => {
    onbellegeYaz('kat1', ['A', 'B']);
    localStorage.setItem(OTEL, 'A');
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'B')];
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    expect(aktifProfil()?.otelId).toBe('B');
  });
});

describe('Kimlik yok / bağlantı yok / 401: bilinen veri korunur', () => {
  it('T3 · yenileme bekleme süresi (oturum yok), önbellek 2 → çalışmaya devam; kimliksiz sorgu YOK', async () => {
    onbellegeYaz('kat1', ['A', 'B']);
    localStorage.setItem(OTEL, 'A');
    kayitliOturum('kat1');
    tutucu.beyin.yenilemeBeklemesi = true;
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('kat1', 'B')];
    const { haller, son } = izle();
    await vi.waitFor(() => expect(son()).toBeDefined());
    await sakinlesmesiniBekle();
    expect(haller.map((h) => h.durum)).not.toContain('otelsiz');
    expect(son()?.durum).toBe('var');
    expect(onbellek()?.uyelikler).toHaveLength(2);
    expect(anonUyelikSorgusu()).toBe(0);
  });

  it('T4 · oturum yok ve önbellek yok → "Bağlantı yok" (asla "Otel bulunamadı" değil)', async () => {
    kayitliOturum('kat1');
    tutucu.beyin.yenilemeBeklemesi = true;
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];
    const { haller, son } = izle();
    await vi.waitFor(() => expect(son()).toBeDefined());
    await sakinlesmesiniBekle();
    expect(haller.map((h) => h.durum)).not.toContain('otelsiz');
    expect(son()?.durum).toBe('baglantiYok');
    expect(anonUyelikSorgusu()).toBe(0);
  });

  it('T5 · kart istemcide geçerli ama sunucuda dolmuş (401) → önbellek korunur', async () => {
    onbellegeYaz('kat1', ['A']);
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'dolmus' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    expect(onbellek()?.uyelikler).toHaveLength(1);
  });

  it('T6 · ağ hatası → önbellek korunur', async () => {
    onbellegeYaz('kat1', ['A']);
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.agYok = true;
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    expect(onbellek()?.uyelikler).toHaveLength(1);
  });

  it('başka kişinin önbelleği hiç kullanılmaz', async () => {
    onbellegeYaz('tek1', ['A']);
    kayitliOturum('kat1');
    tutucu.beyin.yenilemeBeklemesi = true;
    const { son } = izle();
    await vi.waitFor(() => expect(son()).toBeDefined());
    await sakinlesmesiniBekle();
    expect(son()?.durum).toBe('baglantiYok');
    expect(onbellek()?.id).toBe('tek1');                      // tek1'in önbelleğine dokunulmadı
  });
});

describe('Toparlanma, kilitlenme ve sınırsız tekrar', () => {
  it('T8 · kimliksiz açılıştan sonra kart yenilenince (TOKEN_REFRESHED) üyelikler sunucudan yeniden sorulur', async () => {
    onbellegeYaz('kat1', ['A', 'B']);
    localStorage.setItem(OTEL, 'A');
    kayitliOturum('kat1');
    tutucu.beyin.yenilemeBeklemesi = true;
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];        // sunucuda artık yalnız A
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    tutucu.beyin.yenilemeBeklemesi = false;
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.olayYay('TOKEN_REFRESHED');
    await vi.waitFor(() => expect(son()?.uyelikler).toHaveLength(1));
    expect(onbellek()?.uyelikler).toHaveLength(1);
  });

  it('oturum olayı dinleyicisi beklenmez: dinleyici bir söz döndürmez (kütüphane kilidinde takılma olmaz)', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    const donusler = tutucu.beyin.dinleyiciler.map((d) => d('TOKEN_REFRESHED', null));
    for (const d of tutucu.beyin.dinleyiciler) void d('SIGNED_IN', { user: { id: 'kat1' } });
    expect(donusler.every((d) => d === undefined)).toBe(true);
  });

  it('bekleme süresi sürdükçe sınırlı sayıda yeniden deneme (sınırsız döngü yok); olay fırtınası birleşir', async () => {
    vi.useFakeTimers();
    onbellegeYaz('kat1', ['A']);
    kayitliOturum('kat1');
    tutucu.beyin.yenilemeBeklemesi = true;
    izle();
    await vi.advanceTimersByTimeAsync(10);
    for (let i = 0; i < 20; i++) {
      tutucu.beyin.olayYay('TOKEN_REFRESHED');
      window.dispatchEvent(new Event('online'));
    }
    await vi.advanceTimersByTimeAsync(30 * 60_000);         // yarım saat
    // Bekleme süresinde istek hiç sunucuya gitmez; getSession çağrısı da sınırlı kalır
    expect(uyelikSorgusu()).toBe(0);
    expect(tutucu.beyin.getSessionSayisi).toBeLessThan(60);
  });
});

describe('Geç gelen cevaplar ve kişi değişimi', () => {
  it('T9 · A\'nın sorgusu yoldayken B girer; A\'nın geç cevabı B\'nin ekranını ve önbelleğini ezmez', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('tek1', 'B')];
    let birak!: () => void;
    tutucu.beyin.bekle.memberships = new Promise<void>((r) => (birak = r));
    const { son } = izle();
    await vi.waitFor(() => expect(uyelikSorgusu()).toBe(1));
    tutucu.beyin.bekle.memberships = undefined;
    tutucu.beyin.oturum = { kisi: 'tek1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');
    await vi.waitFor(() => expect(son()?.kullaniciId).toBe('tek1'));
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    birak();
    await sakinlesmesiniBekle();
    expect(son()?.kullaniciId).toBe('tek1');
    expect(son()?.uyelikler.map((u) => u.hotel_id)).toEqual(['B']);
    expect(onbellek()?.id).toBe('tek1');
    expect(aktifProfil()?.id).toBe('tek1');
  });

  it('A → B → A: A\'nın ilk (eski) cevabı, A\'nın yeni cevabını ezmez', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('tek1', 'B')];
    let birak!: () => void;
    tutucu.beyin.bekle.memberships = new Promise<void>((r) => (birak = r));
    const { son } = izle();
    await vi.waitFor(() => expect(uyelikSorgusu()).toBe(1));
    tutucu.beyin.bekle.memberships = undefined;
    tutucu.beyin.oturum = { kisi: 'tek1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');
    await vi.waitFor(() => expect(son()?.kullaniciId).toBe('tek1'));
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('kat1', 'B'), uyelik('tek1', 'B')];   // kat1'e B eklendi
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');
    await vi.waitFor(() => expect(son()?.uyelikler).toHaveLength(2));
    birak();                                                 // ilk sorgu artık cevap veriyor
    await sakinlesmesiniBekle();
    expect(son()?.kullaniciId).toBe('kat1');
    expect(son()?.uyelikler).toHaveLength(2);
    expect(onbellek()?.uyelikler).toHaveLength(2);
  });

  it('T10 · aynı kişide üst üste iki sorgu: eskisi sonra gelirse yenisini ezmez', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];
    let birak!: () => void;
    tutucu.beyin.bekle.memberships = new Promise<void>((r) => (birak = r));
    const { son } = izle();
    await vi.waitFor(() => expect(uyelikSorgusu()).toBe(1));
    tutucu.beyin.bekle.memberships = undefined;
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('kat1', 'B')];
    tutucu.beyin.olayYay('SIGNED_IN');                      // ör. sekme yeniden odaklandı
    await bekle(20);
    birak();
    await vi.waitFor(() => expect(son()?.uyelikler).toHaveLength(2));
    await sakinlesmesiniBekle();
    expect(son()?.uyelikler).toHaveLength(2);
    expect(onbellek()?.uyelikler).toHaveLength(2);
  });

  it('T16 · çıkış: ekran giriş ekranına döner; geç gelen cevap girişsiz ekranı değiştirmez', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];
    let birak!: () => void;
    tutucu.beyin.bekle.memberships = new Promise<void>((r) => (birak = r));
    const { son } = izle();
    await vi.waitFor(() => expect(uyelikSorgusu()).toBe(1));
    window.dispatchEvent(new Event(CIKIS_OLAYI));
    await vi.waitFor(() => expect(son()?.durum).toBe('yok'));
    birak();
    await sakinlesmesiniBekle();
    expect(son()?.durum).toBe('yok');
    expect(aktifProfil()).toBeNull();
  });
});

describe('Kimlik olaylarının sırası (Codex incelemesi)', () => {
  it('çıkıştan SONRA gelen gerçek yeni giriş çalışır', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('tek1', 'B')];
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    tutucu.beyin.oturum = null;
    window.dispatchEvent(new Event(CIKIS_OLAYI));
    expect(son()?.durum).toBe('yok');
    await sakinlesmesiniBekle();
    tutucu.beyin.oturum = { kisi: 'tek1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    expect(son()?.kullaniciId).toBe('tek1');
    expect(aktifProfil()?.id).toBe('tek1');
  });

  it('aynı kişi çıkıp hemen yeniden girerse (çıkış → giriş olayı) giriş geçerlidir', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    tutucu.beyin.oturum = null;
    window.dispatchEvent(new Event(CIKIS_OLAYI));
    tutucu.beyin.olayYay('SIGNED_OUT');                    // kütüphanenin kendi çıkış bildirimi
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');                     // ardından gerçek yeni giriş
    await sakinlesmesiniBekle();
    expect(son()?.durum).toBe('var');
    expect(son()?.kullaniciId).toBe('kat1');
  });

  it('başlangıçtaki oturum sorgusu yoldayken çıkış: geç gelen cevap çıkışı geri almaz', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A')];
    let birak!: () => void;
    tutucu.beyin.oturumBekle = new Promise<void>((r) => (birak = r));
    const { son } = izle();                                // başlangıç sorgusu kat1'in kartıyla yolda
    tutucu.beyin.oturum = null;
    window.dispatchEvent(new Event(CIKIS_OLAYI));
    expect(son()?.durum).toBe('yok');
    birak();
    await sakinlesmesiniBekle();
    expect(son()?.durum).toBe('yok');
    expect(son()?.kullaniciId).toBeNull();
    expect(aktifProfil()).toBeNull();
    expect(uyelikSorgusu()).toBe(0);
  });

  it('başlangıç sorgusu yoldayken başka kişi girer: geç gelen başlangıç cevabı eski kişiye döndürmez', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('tek1', 'B')];
    let birak!: () => void;
    tutucu.beyin.oturumBekle = new Promise<void>((r) => (birak = r));
    const { son } = izle();
    tutucu.beyin.oturum = { kisi: 'tek1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');
    await vi.waitFor(() => expect(son()?.kullaniciId).toBe('tek1'));
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    birak();
    await sakinlesmesiniBekle();
    expect(son()?.kullaniciId).toBe('tek1');
    expect(aktifProfil()?.id).toBe('tek1');
  });

  it('kuyrukta iki giriş olayı (A sonra B): son gelen B geçerlidir', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('tek1', 'B')];
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    tutucu.beyin.olayYay('SIGNED_IN');                     // kat1
    tutucu.beyin.oturum = { kisi: 'tek1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');                     // tek1 — ikisi de henüz işlenmedi
    await sakinlesmesiniBekle();
    expect(son()?.kullaniciId).toBe('tek1');
    expect(aktifProfil()?.id).toBe('tek1');
  });

  it('kişi değişince eski kişinin profili HEMEN bırakılır; aynı kişinin oturum tazelemesi profili bozmaz', async () => {
    tutucu.beyin.oturum = { kisi: 'kat1', kart: 'gecerli' };
    tutucu.beyin.uyelikler = [uyelik('kat1', 'A'), uyelik('tek1', 'B'), uyelik('tek1', 'C')];
    localStorage.setItem(OTEL, 'A');
    const { son } = izle();
    await vi.waitFor(() => expect(son()?.durum).toBe('var'));
    const { aktifBaglam } = await import('./kullanici');
    const once = aktifBaglam();
    tutucu.beyin.olayYay('SIGNED_IN');                     // aynı kişi (ör. sekme yeniden odaklandı)
    await sakinlesmesiniBekle();
    expect(aktifBaglam()).toEqual(once);                   // bağlam değişmedi: yoldaki işleri boşa çıkmaz

    let birak!: () => void;
    tutucu.beyin.bekle.memberships = new Promise<void>((r) => (birak = r));
    tutucu.beyin.oturum = { kisi: 'tek1', kart: 'gecerli' };
    tutucu.beyin.olayYay('SIGNED_IN');
    await vi.waitFor(() => expect(son()?.kullaniciId).toBe('tek1'));
    expect(son()?.durum).toBe('yukleniyor');               // kat1'in çalışma ekranı hemen kapandı
    expect(aktifProfil()).toBeNull();                      // üyelikler daha gelmeden kat1'in profili kullanılamaz
    birak();
    await vi.waitFor(() => expect(son()?.durum).toBe('otelSec'));
    expect(aktifProfil()).toBeNull();                      // tek1 iki otelli: seçim yapılana kadar etkin otel yok
  });
});
