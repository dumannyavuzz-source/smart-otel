// Beyanlar: personelin üç sözü. Hepsi ÖNCE telefona (giden kutusu) yazılır; ekran anında tepki verir.
// Sunucuya gitmek postacının işidir, personel bunu görmez (002 · B.1).
//
// "Kim yazdı" ve "sunucu saati" burada yazılmaz — veritabanı karttan kendisi doldurur (security · 2.8).
// Telefonun saati bilgi amaçlı ayrıca gider (created_at_device).
import { telefonDeposu, type BeyanTablosu, type Oda } from './telefonDeposu';
import { YENI_MEKTUP_OLAYI, haberVer } from './olaylar';

const EN_UZUN_ACIKLAMA = 500;

async function gidenKutusunaKoy(tablo: BeyanTablosu, icerik: Record<string, unknown>): Promise<string> {
  const id = crypto.randomUUID();                 // offline'da bile eşsiz; sunucu tekrarı yok sayar
  const simdi = new Date().toISOString();
  await telefonDeposu.gidenKutusu.add({
    id,
    tablo,
    icerik: { id, created_at_device: simdi, ...icerik },
    olusturuldu: simdi,
    deneme: 0,
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
//   Haşere → acil (misafir odada). Not istenmez, tek dokunuşla gider.
//   Arıza  → normal (müdür acile çevirebilir). "Ne bozuk?" kısa notu istenir; yoksa teknisyen bilemez.
export const SORUN_TURLERI = [
  { kod: 'ariza', ad: 'Bir şey bozuk', etiket: 'Arıza', ikon: '🔧', severity: 'normal', notIster: true },
  { kod: 'hasere', ad: 'Böcek var', etiket: 'Haşere', ikon: '🐜', severity: 'urgent', notIster: false },
] as const;

export type SorunTuru = (typeof SORUN_TURLERI)[number];

// Kayda geçen açıklama: "Arıza: TV açılmıyor" / "Haşere"
export function sorunAciklamasi(tur: SorunTuru, not: string): string {
  const temizNot = not.trim();
  const metin = temizNot ? `${tur.etiket}: ${temizNot}` : tur.etiket;
  return metin.slice(0, EN_UZUN_ACIKLAMA);
}

export function sorunBildirBeyani(oda: Oda, tur: SorunTuru, not: string): Promise<string> {
  return gidenKutusunaKoy('issue_reports', {
    hotel_id: oda.hotel_id,
    room_id: oda.id,
    description: sorunAciklamasi(tur, not),
    severity: tur.severity,
  });
}
