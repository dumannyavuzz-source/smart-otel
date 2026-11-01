// İş emirleri (teknisyen) — Blueprint · 3.2
//   * Liste: yalnızca açık işler, en az süresi kalan en üstte.
//   * Trafik lambası: yeşil → sarı (sürenin yarısından azı kaldı) → kırmızı (süre geçti).
//   * "Aldım": sahipsiz işi üstüne alır. "Çözdüm": kendi işini kapatır (isteğe bağlı fotoğraf).
//   * Offline: liste telefonda durur; Aldım/Çözdüm önce telefona yazılır, postacı internet gelince gönderir.
//     Sunucuda doğrulanana kadar iş "onay bekliyor" diye görünür (karar 028).
//     Sunucu kuralları (yalnızca atanan çözer, çözülünce kilit) veritabanındadır; telefon sadece "der".
import { telefonDeposu, type IsEmri } from './telefonDeposu';
import { kuyruk, type Kayit } from './kayitDeposu';
import { gidenKutusunaKoy } from './beyanlar';
import { aktifBaglam, aktifKullanici, ayniBaglamMi } from './kullanici';
import { ortakBeyin } from './ortakBeyin';
import { kimlikliKart } from './kimlik';
import { PAKET_OLAYI, cevrimici, haberVer } from './olaylar';

export type Isik = 'yesil' | 'sari' | 'kirmizi';

export function kalanMs(is: IsEmri, simdi: number = Date.now()): number {
  return Date.parse(is.due_at) - simdi;
}

// Yeşil: sürenin yarısından fazlası var · Sarı: yarısından azı kaldı · Kırmızı: süre geçti
export function trafikIsigi(is: IsEmri, simdi: number = Date.now()): Isik {
  const kalan = kalanMs(is, simdi);
  if (kalan <= 0) return 'kirmizi';
  const toplam = Date.parse(is.due_at) - Date.parse(is.created_at);
  return kalan < toplam / 2 ? 'sari' : 'yesil';
}

// "12 dk kaldı" · "1 sa 20 dk kaldı" · "25 dk geçti"
export function sureMetni(ms: number): string {
  const dakika = Math.max(1, Math.round(Math.abs(ms) / 60_000));
  const saat = Math.floor(dakika / 60);
  const kalanDk = dakika % 60;
  const parca = saat > 0 ? `${saat} sa${kalanDk > 0 ? ` ${kalanDk} dk` : ''}` : `${dakika} dk`;
  return ms <= 0 ? `${parca} geçti` : `${parca} kaldı`;
}

export function sirala(isler: IsEmri[]): IsEmri[] {
  return [...isler].sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
}

export type Sahiplik = 'sahipsiz' | 'bende' | 'baskasinda';

export function sahiplik(is: IsEmri, benimId: string | null = aktifKullanici()): Sahiplik {
  if (!is.assigned_to) return 'sahipsiz';
  return is.assigned_to === benimId ? 'bende' : 'baskasinda';
}

// Telefondaki açık işler, en acil üstte
export async function acikIsler(): Promise<IsEmri[]> {
  const acik = await telefonDeposu.isEmirleri.filter((is) => is.status !== 'resolved').toArray();
  return sirala(acik);
}

export function isiGetir(id: string): Promise<IsEmri | undefined> {
  return telefonDeposu.isEmirleri.get(id);
}

// "Aldım": önce telefon, sonra kayıt kutusu. Telefondaki iş "onay bekliyor" diye işaretlenir; sunucu
// doğrulayınca işaret kalkar. Sunucu "bu iş başkasında" derse sunucu haklıdır: kayıt nedeniyle saklanır,
// liste sunucunun gerçeğine döner (karar 028).
export async function isiAl(is: IsEmri): Promise<string> {
  const benimId = aktifKullanici();
  if (!benimId) throw new Error('Giriş gerekli.');
  const degisiklik = { assigned_to: benimId, status: 'in_progress' as const };
  // Önce kayıt: yazılamazsa telefondaki iş, arkasında kayıt olmayan bir "onay bekliyor"la kalmasın.
  const id = await gidenKutusunaKoy('work_orders', degisiklik, {
    islem: 'guncelle',
    kosul: { id: is.id },
    otelId: is.hotel_id,
    ozet: `Oda ${is.oda_no} · İş emri: Aldım`,
  });
  await telefonDeposu.isEmirleri.update(is.id, { ...degisiklik, onayBekliyor: true });
  return id;
}

// "Çözdüm": kim + saat sunucuda yazılır (imza). Fotoğraf varsa önce o yüklenir.
export async function isiCoz(is: IsEmri, fotograf?: Blob | null): Promise<string> {
  const yol = `${is.hotel_id}/resolutions/${is.id}.jpg`;
  const degisiklik = { status: 'resolved' as const, ...(fotograf ? { resolved_photo_path: yol } : {}) };
  const id = await gidenKutusunaKoy('work_orders', degisiklik, {
    islem: 'guncelle',
    kosul: { id: is.id },
    otelId: is.hotel_id,
    ozet: `Oda ${is.oda_no} · İş emri: Çözdüm`,
    ...(fotograf ? { fotograf: { veri: fotograf, yol } } : {}),
  });
  await telefonDeposu.isEmirleri.update(is.id, { status: 'resolved', onayBekliyor: true });
  return id;
}

// Kuyruktaki (henüz sunucuda doğrulanmamış) Aldım/Çözdüm'ler — yalnızca GİRİŞ YAPAN kişinin, AKTİF
// oteldeki kayıtları. Ortak telefonda başkasının ya da diğer otelin bekleyen işi bu listeyi değiştirmez;
// sahibi o otelde tekrar girince yine uygulanır (kayıt silinmez).
async function bekleyenGuncellemeler(): Promise<Kayit[]> {
  const { kullanici, otel } = aktifBaglam();
  return (await kuyruk(kullanici, otel)).filter((k) => k.tablo === 'work_orders' && k.islem === 'guncelle');
}

async function uygula(kayitlar: Kayit[]): Promise<void> {
  for (const k of kayitlar) {
    const id = k.kosul?.id;
    if (typeof id !== 'string') continue;
    const is = await telefonDeposu.isEmirleri.get(id);
    if (!is || is.hotel_id !== k.otelId) continue;            // iş başka otelin: dokunma
    const { assigned_to, status } = k.icerik as Partial<Pick<IsEmri, 'assigned_to' | 'status'>>;
    await telefonDeposu.isEmirleri.update(id, {
      ...(assigned_to !== undefined ? { assigned_to } : {}),
      ...(status !== undefined ? { status } : {}),
      onayBekliyor: true,
    });
  }
}

// Telefondaki listeye, henüz doğrulanmamış Aldım/Çözdüm'leri yeniden uygula.
// Böylece sunucudan inen eski liste, bodrumda yapılan işi ezmez. Reddedilenler uygulanmaz:
// onlarda sunucunun gerçeği geçerlidir.
export async function bekleyenleriUygula(): Promise<void> {
  await uygula(await bekleyenGuncellemeler());
}

// Postacı bir Aldım/Çözdüm'ün sonucunu (tamamlandı ya da reddedildi) öğrenince telefondaki işi
// sunucunun gerçek haline çeker. Hâlâ kuyrukta bekleyen başka bir güncelleme varsa o yine üstüne uygulanır.
export async function isEmriniSunucuyaGoreDuzelt(satir: Record<string, unknown>): Promise<void> {
  const id = satir.id;
  if (typeof id !== 'string' || !(await telefonDeposu.isEmirleri.get(id))) return;
  await telefonDeposu.isEmirleri.update(id, {
    assigned_to: typeof satir.assigned_to === 'string' ? satir.assigned_to : null,
    status: satir.status as IsEmri['status'],
    onayBekliyor: false,
  });
  await uygula((await bekleyenGuncellemeler()).filter((k) => k.kosul?.id === id));
  haberVer(PAKET_OLAYI);
}

interface SunucuSatiri {
  id: string;
  hotel_id: string;
  room_id: string;
  severity: 'urgent' | 'normal';
  due_at: string;
  created_at: string;
  assigned_to: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  rooms: { number: string } | null;
  issue_reports: { description: string } | null;
}

// Açık iş emirlerini sunucudan indir (internet varken). Bekleyen yerel değişiklikler korunur.
// Karar 029: kart yoksa liste hiç sorulmaz ve telefondaki liste SİLİNMEZ. Geçerli kartla gelen boş liste
// ("açık iş yok") gerçektir ve yazılır. Bağlam son yazma anında, işlemin içinde yeniden denetlenir.
let indirmeSirasi = 0;
export async function isEmirleriniIndir(): Promise<void> {
  if (!cevrimici()) return;
  const baglam = aktifBaglam();
  const kart = await kimlikliKart(baglam.kullanici);
  if (!kart) return;
  const benimSiram = ++indirmeSirasi;
  const { data, error } = await ortakBeyin()
    .from('work_orders')
    .select('id, hotel_id, room_id, severity, due_at, created_at, assigned_to, status, rooms(number), issue_reports(description)')
    .neq('status', 'resolved')
    .setHeader('Authorization', kart.yetki);
  if (error || !Array.isArray(data)) return;
  // Liste yoldayken kişi ya da otel değiştiyse bu cevap eski kişinindir: yeni kişinin listesine yazılmaz.
  if (!ayniBaglamMi(baglam)) return;

  const isler: IsEmri[] = (data as unknown as SunucuSatiri[]).map((s) => ({
    id: s.id,
    hotel_id: s.hotel_id,
    room_id: s.room_id,
    oda_no: s.rooms?.number ?? '?',
    aciklama: s.issue_reports?.description ?? 'Arıza',
    severity: s.severity,
    due_at: s.due_at,
    created_at: s.created_at,
    assigned_to: s.assigned_to,
    status: s.status,
  }));

  // Kayıt kutusu ayrı bir veritabanı: bekleyenler işlemden önce okunur, işlem içinde uygulanır.
  const bekleyenler = await bekleyenGuncellemeler();
  let yazildi = false;
  await telefonDeposu.transaction('rw', [telefonDeposu.isEmirleri], async () => {
    // Son yazma anı: bekleyenler okunurken de kişi/otel değişmiş ya da daha yeni bir indirme başlamış olabilir.
    if (!ayniBaglamMi(baglam) || benimSiram !== indirmeSirasi) return;
    await telefonDeposu.isEmirleri.clear();
    await telefonDeposu.isEmirleri.bulkPut(isler);
    await uygula(bekleyenler);
    yazildi = true;
  });
  if (yazildi) haberVer(PAKET_OLAYI);
}
