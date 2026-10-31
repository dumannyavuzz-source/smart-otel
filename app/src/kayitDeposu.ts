// Kayıt kutusu: personelin sunucuya gidecek her işi burada durur (karar 028).
//
// Neden ayrı bir telefon veritabanı? Eski uygulama sürümü kendi kutusundaki ("smartotel" · gidenKutusu)
// reddedilen "Aldım/Çözdüm"ü siler. Bu kutuyu ise hiç tanımaz: ne okur, ne siler.
// Eski veritabanının sürümüne de dokunulmaz — eski sürüme dönülürse uygulama yine açılır.
//
// Bir kaydın beş durumu vardır:
//   bekliyor    → telefonda; sırası gelince gönderilir                         (kuyrukta)
//   belirsiz    → cevap geldi ama sonucu net değil; sunucuya bakılarak doğrulanır (kuyrukta)
//   tamamlandi  → sunucuda kişi + otel + içerikle eşleşti                       (geçmişte)
//   reddedildi  → sunucu kesin "hayır" dedi; nedeni saklanır, otomatik tekrar gönderilmez
//   cakisma     → sunucuda aynı kimlikle BAŞKA bir kayıt var; dokunulmaz, gösterilir
//
// Kuyruktan çıkmak silinmek demek değildir:
//   * tamamlandi: kuyruktan çıkar, kısa bir özet olarak geçmişte kalır (içerik ve fotoğraf telefondan silinir).
//   * reddedildi / cakisma: kuyruktan çıkar, içeriği ve fotoğrafıyla saklanır; kişi "Arşivle" diyebilir.
//   Kayıtlar telefondan kendiliğinden silinmez — tamamlanmış özetler de. Saklama süresi ayrıca
//   kararlaştırılacak; o zamana kadar budama yok.
import Dexie, { type EntityTable } from 'dexie';
import type { BeyanTablosu } from './telefonDeposu';

export type KayitDurumu = 'bekliyor' | 'belirsiz' | 'tamamlandi' | 'reddedildi' | 'cakisma';

export const KUYRUK_DURUMLARI: KayitDurumu[] = ['bekliyor', 'belirsiz'];
export const DIKKAT_DURUMLARI: KayitDurumu[] = ['reddedildi', 'cakisma'];

export interface Kayit {
  id: string;                          // beyanda satırın kimliği; güncellemede yalnızca kaydın kimliği
  sira: number;                        // gönderim sırası (saate güvenilmez)
  yazanId: string;                     // yalnızca o kişi girişliyken gönderilir ve görünür
  otelId: string | null;               // kayıt yazıldığı andaki otel; hiç değiştirilmez. null = bilinmiyor
  tablo: BeyanTablosu | 'work_orders';
  icerik: Record<string, unknown>;     // sunucuya yazılacak alanlar (tamamlanınca boşaltılır)
  islem?: 'guncelle';
  kosul?: Record<string, unknown>;
  ozet: string;                        // "Oda 204 · Temizlik" — listede gösterilir
  olusturuldu: string;
  durum: KayitDurumu;
  deneme: number;
  sonDeneme?: string;
  sonHata?: string;                    // teknik ileti (geçici hatalar dahil)
  neden?: string;                      // kişiye gösterilen ret / çakışma nedeni
  sunucuKodu?: string;
  tamamlandi?: string;                 // ISO — sunucuda doğrulandığı an
  arsivlendi?: string;                 // ISO — kişi "gördüm" dedi
  eskiRet?: boolean;                   // eski sürümde reddedilmişti: önce doğrulanır, kendiliğinden yeniden gönderilmez
  eskiSurumden?: boolean;              // eski kutudan taşındı
  fotografYollari?: string[];
  yuklenenFotograflar?: string[];      // sunucuya yüklendi ama kopyası telefonda kalır; kayıt doğrulanınca silinir
}

export interface KayitFotografi {
  yol: string;                         // depodaki yolu: <hotel_id>/issues/<id>.jpg
  veri: Blob;
  yazanId: string;                     // önizlemeyi yalnızca sahibi görür
  olusturuldu: string;
}

class KayitDeposu extends Dexie {
  kayitlar!: EntityTable<Kayit, 'id'>;
  fotograflar!: EntityTable<KayitFotografi, 'yol'>;

  constructor() {
    super('smartotel-kayitlar');
    this.version(1).stores({
      kayitlar: 'id, sira, yazanId, durum',
      fotograflar: 'yol',
    });
  }
}

export const kayitDeposu = new KayitDeposu();

export function kuyruktaMi(kayit: Pick<Kayit, 'durum'>): boolean {
  return KUYRUK_DURUMLARI.includes(kayit.durum);
}

export function dikkatIsterMi(kayit: Pick<Kayit, 'durum' | 'arsivlendi'>): boolean {
  return DIKKAT_DURUMLARI.includes(kayit.durum) && !kayit.arsivlendi;
}

// Kişinin kayıtları, sıralı. Başkasınınki hiç dönmez (ortak telefon).
export async function kisininKayitlari(yazanId: string | null): Promise<Kayit[]> {
  if (!yazanId) return [];
  const liste = await kayitDeposu.kayitlar.where('yazanId').equals(yazanId).toArray();
  return liste.sort((a, b) => a.sira - b.sira);
}

// Kayıtlarım ekranının bölümleri. Girdi zaten tek kişinin kayıtlarıdır (kisininKayitlari).
export interface KayitGruplari {
  dikkat: Kayit[];        // reddedildi / çakışma, arşivlenmemiş
  bekleyen: Kayit[];      // bu otelde kuyrukta
  digerOtel: Kayit[];     // başka otelde ya da oteli bilinmeyen, kuyrukta
  tamamlanan: Kayit[];    // en yeni üstte
  arsiv: Kayit[];
}

export function kayitlariGrupla(kayitlar: Kayit[], otelId: string | null): KayitGruplari {
  return {
    dikkat: kayitlar.filter(dikkatIsterMi),
    bekleyen: kayitlar.filter((k) => kuyruktaMi(k) && otelId !== null && k.otelId === otelId),
    digerOtel: kayitlar.filter((k) => kuyruktaMi(k) && (otelId === null || k.otelId !== otelId)),
    tamamlanan: kayitlar
      .filter((k) => k.durum === 'tamamlandi')
      .sort((a, b) => (b.tamamlandi ?? '').localeCompare(a.tamamlandi ?? '')),
    arsiv: kayitlar.filter((k) => DIKKAT_DURUMLARI.includes(k.durum) && Boolean(k.arsivlendi)),
  };
}

// Gönderim kuyruğu: bu kişinin, bu oteldeki, bekleyen ya da doğrulanacak kayıtları
export async function kuyruk(yazanId: string | null, otelId: string | null): Promise<Kayit[]> {
  if (!yazanId || !otelId) return [];
  return (await kisininKayitlari(yazanId)).filter((k) => kuyruktaMi(k) && k.otelId === otelId);
}

// Tamamlanan işlem geçmişi (en yeni üstte)
export async function gecmis(yazanId: string | null): Promise<Kayit[]> {
  return (await kisininKayitlari(yazanId))
    .filter((k) => k.durum === 'tamamlandi')
    .sort((a, b) => (b.tamamlandi ?? '').localeCompare(a.tamamlandi ?? ''));
}

export interface KutuOzeti {
  bekleyen: number;          // bu otelde gönderilecek
  digerOtelde: number;       // başka otelde (ya da oteli bilinmeyen) bekleyen — korunur, o otele geçince gider
  dikkat: number;            // reddedilen / çakışan, arşivlenmemiş
  baskasinin: number;        // ortak telefondaki diğer kişilerin bekleyenleri (yalnızca sayı)
}

export async function kutuOzeti(yazanId: string | null, otelId: string | null): Promise<KutuOzeti> {
  const hepsi = await kayitDeposu.kayitlar.toArray();
  const benim = yazanId ? hepsi.filter((k) => k.yazanId === yazanId) : [];
  const bekleyenler = benim.filter(kuyruktaMi);
  return {
    bekleyen: bekleyenler.filter((k) => otelId !== null && k.otelId === otelId).length,
    digerOtelde: bekleyenler.filter((k) => otelId === null || k.otelId !== otelId).length,
    dikkat: benim.filter(dikkatIsterMi).length,
    baskasinin: hepsi.filter((k) => k.yazanId !== yazanId && kuyruktaMi(k)).length,
  };
}

// "Gördüm": reddedilen ya da çakışan kayıt arşive kalkar. Silinmez; yalnızca sahibi yapabilir.
export async function arsivle(id: string, yazanId: string | null): Promise<boolean> {
  const kayit = await kayitDeposu.kayitlar.get(id);
  if (!kayit || !yazanId || kayit.yazanId !== yazanId || !DIKKAT_DURUMLARI.includes(kayit.durum)) return false;
  await kayitDeposu.kayitlar.update(id, { arsivlendi: new Date().toISOString() });
  return true;
}

// Kaydın fotoğrafları — yalnızca sahibine
export async function kaydinFotograflari(kayit: Kayit, yazanId: string | null): Promise<KayitFotografi[]> {
  if (!yazanId || kayit.yazanId !== yazanId) return [];
  const bulunan = await kayitDeposu.fotograflar.bulkGet(kayit.fotografYollari ?? []);
  return bulunan.filter((f): f is KayitFotografi => Boolean(f) && f!.yazanId === yazanId);
}

// Sıradaki sıra numarası: kutudaki en büyük + 1. Taşınan eski kayıtlar da kendi aralarındaki
// sırayı koruyarak buradan numara alır.
export async function sonrakiSira(): Promise<number> {
  const son = await kayitDeposu.kayitlar.orderBy('sira').last();
  return (son?.sira ?? 0) + 1;
}

const TABLO_ADI: Record<Kayit['tablo'], string> = {
  room_cleanings: 'Temizlik',
  supply_reports: 'Eksik bildirimi',
  issue_reports: 'Sorun bildirimi',
  deliveries: 'Teslim',
  work_orders: 'İş emri',
};

export function tabloAdi(tablo: Kayit['tablo'], icerik: Record<string, unknown> = {}): string {
  if (tablo === 'work_orders') return icerik.status === 'resolved' ? 'İş emri: Çözdüm' : 'İş emri: Aldım';
  return TABLO_ADI[tablo];
}
