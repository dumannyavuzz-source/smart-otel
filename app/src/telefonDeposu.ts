// Telefonun kendi çekmecesi (IndexedDB, Dexie ile).
// İki iş görür (002 · Bölüm B):
//   1. Gelen paket: vardiya boyunca lazım olan oda/liste/ürün bilgisi burada saklanır.
//   2. Giden kutusu: personelin her beyanı ÖNCE buraya yazılır; postacı internet gelince gönderir.
import Dexie, { type EntityTable } from 'dexie';

export interface Oda {
  id: string;
  hotel_id: string;
  number: string;
  floor: string | null;
  staff_code: string;          // personel QR'ındaki kod
}

export interface KontrolListesi {
  id: string;
  hotel_id: string;
  name: string;
  items: string[];             // en fazla 10 madde
}

export interface Urun {
  id: string;
  hotel_id: string;
  name: string;
  unit: string;
}

export type BeyanTablosu = 'room_cleanings' | 'supply_reports' | 'issue_reports';

// İş emri (teknisyen): arızadan otomatik açılır. "Değişen" tek kutu: kimde? durumu ne?
export interface IsEmri {
  id: string;
  hotel_id: string;
  room_id: string;
  oda_no: string;                      // rooms.number (listede göstermek için)
  aciklama: string;                    // issue_reports.description ("Arıza: TV açılmıyor")
  severity: 'urgent' | 'normal';
  due_at: string;                      // son süre (ISO)
  created_at: string;
  assigned_to: string | null;          // kimde? (kullanıcı kimliği)
  status: 'open' | 'in_progress' | 'resolved';
}

// Giden kutusundaki bir "mektup" = sunucuya gidecek bir iş
//   islem yoksa   → yeni satır eklenir (beyan). Aynı UUID varsa sunucu yok sayar.
//   'guncelle'    → var olan satır güncellenir (iş emri: Aldım / Çözdüm). Koşul tutmazsa sunucu neyse o kalır.
export interface Mektup {
  id: string;                          // mektubun UUID'si — telefonda üretilir; beyanda satırın kimliğidir
  sira: number;                        // sıra numarası — gönderim sırası bununla korunur (saate güvenilmez)
  yazanId: string;                     // mektubu yazan kişi — yalnızca o giriş yapmışken gönderilir
  tablo: BeyanTablosu | 'work_orders';
  icerik: Record<string, unknown>;     // sunucuya yazılacak alanlar
  islem?: 'guncelle';
  kosul?: Record<string, unknown>;     // güncellemede hangi satır (örn. { id })
  olusturuldu: string;                 // ISO saat (bilgi amaçlı)
  deneme: number;
  sonHata?: string;
  kalici?: boolean;                    // sunucu kesin reddetti (kilit/kural); seyrek yeniden denenir
  sonDeneme?: string;                  // ISO saat — son deneme ne zaman yapıldı
  fotografYolu?: string;               // mektubun yanında bekleyen fotoğraf (önce o yüklenir)
}

// Tepside bekleyen fotoğraf: küçültülmüş, yüklenince silinir (002 · B.6)
export interface Fotograf {
  yol: string;                         // depodaki yolu: <hotel_id>/issues/<id>.jpg
  veri: Blob;
  olusturuldu: string;
}

export const EN_FAZLA_BEKLEYEN_FOTOGRAF = 50;

class TelefonDeposu extends Dexie {
  odalar!: EntityTable<Oda, 'id'>;
  kontrolListeleri!: EntityTable<KontrolListesi, 'id'>;
  urunler!: EntityTable<Urun, 'id'>;
  gidenKutusu!: EntityTable<Mektup, 'id'>;
  fotograflar!: EntityTable<Fotograf, 'yol'>;
  isEmirleri!: EntityTable<IsEmri, 'id'>;

  constructor() {
    super('smartotel');
    this.version(1).stores({
      odalar: 'id, staff_code, hotel_id',
      kontrolListeleri: 'id, hotel_id',
      urunler: 'id, hotel_id',
      gidenKutusu: 'id, olusturuldu',
    });
    this.version(2).stores({
      fotograflar: 'yol',
    });
    this.version(3).stores({
      gidenKutusu: 'id, sira',
    });
    this.version(4).stores({
      isEmirleri: 'id, hotel_id, due_at',
    });
  }
}

export const telefonDeposu = new TelefonDeposu();
