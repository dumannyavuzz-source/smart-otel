// İş emirleri (teknisyen) — Blueprint · 3.2
//   * Liste: yalnızca açık işler, en az süresi kalan en üstte.
//   * Trafik lambası: yeşil → sarı (sürenin yarısından azı kaldı) → kırmızı (süre geçti).
//   * "Aldım": sahipsiz işi üstüne alır. "Çözdüm": kendi işini kapatır (isteğe bağlı fotoğraf).
//   * Offline: liste telefonda durur; Aldım/Çözdüm önce telefona yazılır, postacı internet gelince gönderir.
//     Sunucu kuralları (yalnızca atanan çözer, çözülünce kilit) veritabanındadır; telefon sadece "der".
import { telefonDeposu, type IsEmri } from './telefonDeposu';
import { gidenKutusunaKoy } from './beyanlar';
import { aktifKullanici } from './kullanici';
import { ortakBeyin } from './ortakBeyin';
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

// "Aldım": önce telefon, sonra mektup. Sunucu "bu iş zaten başkasında" derse sunucu haklıdır (ilk alan kazanır).
export async function isiAl(is: IsEmri): Promise<void> {
  const benimId = aktifKullanici();
  if (!benimId) throw new Error('Giriş gerekli.');
  const degisiklik = { assigned_to: benimId, status: 'in_progress' as const };
  await telefonDeposu.isEmirleri.update(is.id, degisiklik);
  await gidenKutusunaKoy('work_orders', degisiklik, { islem: 'guncelle', kosul: { id: is.id } });
}

// "Çözdüm": kim + saat sunucuda yazılır (imza). Fotoğraf varsa önce o yüklenir.
export async function isiCoz(is: IsEmri, fotograf?: Blob | null): Promise<void> {
  const yol = `${is.hotel_id}/resolutions/${is.id}.jpg`;
  const degisiklik = { status: 'resolved' as const, ...(fotograf ? { resolved_photo_path: yol } : {}) };
  await telefonDeposu.isEmirleri.update(is.id, { status: 'resolved' });
  await gidenKutusunaKoy('work_orders', degisiklik, {
    islem: 'guncelle',
    kosul: { id: is.id },
    ...(fotograf ? { fotograf: { veri: fotograf, yol } } : {}),
  });
}

// Telefondaki listeye, henüz gönderilmemiş Aldım/Çözdüm'leri yeniden uygula.
// Böylece sunucudan inen eski liste, bodrumda yapılan işi ezmez.
export async function bekleyenleriUygula(): Promise<void> {
  const mektuplar = await telefonDeposu.gidenKutusu.orderBy('sira').toArray();
  for (const m of mektuplar) {
    if (m.tablo !== 'work_orders' || m.islem !== 'guncelle') continue;
    const id = m.kosul?.id;
    if (typeof id !== 'string') continue;
    const { assigned_to, status } = m.icerik as Partial<Pick<IsEmri, 'assigned_to' | 'status'>>;
    await telefonDeposu.isEmirleri.update(id, {
      ...(assigned_to !== undefined ? { assigned_to } : {}),
      ...(status !== undefined ? { status } : {}),
    });
  }
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
export async function isEmirleriniIndir(): Promise<void> {
  if (!cevrimici()) return;
  const { data, error } = await ortakBeyin()
    .from('work_orders')
    .select('id, hotel_id, room_id, severity, due_at, created_at, assigned_to, status, rooms(number), issue_reports(description)')
    .neq('status', 'resolved');
  if (error || !data) return;

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

  await telefonDeposu.transaction('rw', [telefonDeposu.isEmirleri, telefonDeposu.gidenKutusu], async () => {
    await telefonDeposu.isEmirleri.clear();
    await telefonDeposu.isEmirleri.bulkPut(isler);
    await bekleyenleriUygula();
  });
  haberVer(PAKET_OLAYI);
}
