// Beyanlar: personelin üç sözü. Hepsi ÖNCE telefona (giden kutusu) yazılır; ekran anında tepki verir.
// Sunucuya gitmek postacının işidir, personel bunu görmez (002 · B.1).
//
// "Kim yazdı" ve "sunucu saati" burada yazılmaz — veritabanı karttan kendisi doldurur (security · 2.8).
// Telefonun saati bilgi amaçlı ayrıca gider (created_at_device).
import { EN_FAZLA_BEKLEYEN_FOTOGRAF, telefonDeposu, type Mektup, type Oda } from './telefonDeposu';
import { YENI_MEKTUP_OLAYI, haberVer } from './olaylar';
import { aktifKullanici } from './kullanici';

const EN_UZUN_ACIKLAMA = 500;

export interface MektupEki {
  id?: string;                                   // beyanın kimliği (verilmezse üretilir)
  fotograf?: { veri: Blob; yol: string };        // mektubun yanında tepside bekler; postacı önce onu yükler
  islem?: 'guncelle';                            // var olan satırı güncelle (iş emri)
  kosul?: Record<string, unknown>;               // güncellemede hangi satır
}

// Her iş ÖNCE telefona yazılır. Beyanlarda satırın kimliği ve telefon saati içeriğe eklenir;
// güncellemelerde içerik olduğu gibi gider.
export async function gidenKutusunaKoy(
  tablo: Mektup['tablo'],
  icerik: Record<string, unknown>,
  ek: MektupEki = {},
): Promise<string> {
  const yazanId = aktifKullanici();
  if (!yazanId) throw new Error('Giriş gerekli.');

  const id = ek.id ?? crypto.randomUUID();       // offline'da bile eşsiz; sunucu tekrarı yok sayar
  const simdi = new Date().toISOString();
  const beyan = ek.islem !== 'guncelle';

  // Mektup ve fotoğrafı tek seferde yaz: ya ikisi de tepside, ya hiçbiri
  await telefonDeposu.transaction('rw', [telefonDeposu.gidenKutusu, telefonDeposu.fotograflar], async () => {
    if (ek.fotograf) {
      if ((await telefonDeposu.fotograflar.count()) >= EN_FAZLA_BEKLEYEN_FOTOGRAF) {
        throw new Error('Bekleyen fotoğraf çok. İnternete bağlanın.');
      }
      await telefonDeposu.fotograflar.add({ yol: ek.fotograf.yol, veri: ek.fotograf.veri, olusturuldu: simdi });
    }
    // Sıra numarası: tepsideki en büyük + 1. Saate güvenilmez (aynı milisaniye, geri alınan saat).
    const sonMektup = await telefonDeposu.gidenKutusu.orderBy('sira').last();
    await telefonDeposu.gidenKutusu.add({
      id,
      sira: (sonMektup?.sira ?? 0) + 1,
      yazanId,
      tablo,
      icerik: beyan ? { id, created_at_device: simdi, ...icerik } : icerik,
      ...(ek.islem ? { islem: ek.islem } : {}),
      ...(ek.kosul ? { kosul: ek.kosul } : {}),
      olusturuldu: simdi,
      deneme: 0,
      ...(ek.fotograf ? { fotografYolu: ek.fotograf.yol } : {}),
    });
  });

  haberVer(YENI_MEKTUP_OLAYI);
  return id;
}

// "Oda Hazır": hangi maddeler tiklendi
export function odaHazirBeyani(oda: Oda, tiklenenMaddeler: string[]): Promise<string> {
  return gidenKutusunaKoy('room_cleanings', {
    hotel_id: oda.hotel_id,
    room_id: oda.id,
    checked_items: tiklenenMaddeler,
  });
}

// "Eksik Var": hangi ürün, kaç adet
export function eksikVarBeyani(oda: Oda, urunId: string, adet: number): Promise<string> {
  return gidenKutusunaKoy('supply_reports', {
    hotel_id: oda.hotel_id,
    room_id: oda.id,
    product_id: urunId,
    quantity: adet,
  });
}

// "Sorun Bildir": iki tür (Blueprint · 3.1): Arıza / Haşere. Ekranda sade sözlerle sorulur.
// Personel "acil mi?" diye düşünmez; tür aciliyeti belirler, müdür isterse iş emrinde değiştirir.
//   Haşere → acil (misafir odada).  Arıza → normal (müdür acile çevirebilir).
// Ana yol fotoğraftır; not isteğe bağlıdır (Genel Müdür kararı, docs/ux/001).
export const SORUN_TURLERI = [
  { kod: 'ariza', ad: 'Bir şey bozuk', etiket: 'Arıza', ikon: '🔧', severity: 'normal' },
  { kod: 'hasere', ad: 'Böcek var', etiket: 'Haşere', ikon: '🐜', severity: 'urgent' },
] as const;

export type SorunTuru = (typeof SORUN_TURLERI)[number];

// Kayda geçen açıklama: "Arıza: TV açılmıyor" / "Haşere"
export function sorunAciklamasi(tur: SorunTuru, not: string): string {
  const temizNot = not.trim();
  const metin = temizNot ? `${tur.etiket}: ${temizNot}` : tur.etiket;
  return metin.slice(0, EN_UZUN_ACIKLAMA);
}

export function sorunBildirBeyani(oda: Oda, tur: SorunTuru, not: string, fotograf?: Blob | null): Promise<string> {
  const id = crypto.randomUUID();
  const yol = `${oda.hotel_id}/issues/${id}.jpg`;   // depo kuralı: yol otelin klasörüyle başlar
  return gidenKutusunaKoy(
    'issue_reports',
    {
      hotel_id: oda.hotel_id,
      room_id: oda.id,
      description: sorunAciklamasi(tur, not),
      severity: tur.severity,
      ...(fotograf ? { photo_path: yol } : {}),
    },
    { id, ...(fotograf ? { fotograf: { veri: fotograf, yol } } : {}) },
  );
}

// Tepside kaç fotoğraf bekliyor? (50'yi aşarsa ekran "İnternete bağlanın" der — 002 · B.6)
export function bekleyenFotografSayisi(): Promise<number> {
  return telefonDeposu.fotograflar.count();
}
