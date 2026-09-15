// QR'daki koddan odayı bulmak.
// Önce telefon (offline çalışır), oda telefonda yoksa ve internet varsa Ortak Beyin'e sorulur.
import { telefonDeposu, type KontrolListesi, type Oda, type Urun } from './telefonDeposu';
import { ortakBeyin } from './ortakBeyin';
import { cevrimici } from './olaylar';

export type UzaktanOdaGetirici = (kod: string) => Promise<Oda | null>;

const ortakBeyindenOda: UzaktanOdaGetirici = async (kod) => {
  const { data } = await ortakBeyin()
    .from('rooms')
    .select('id, hotel_id, number, floor, staff_code')
    .eq('staff_code', kod)
    .eq('is_active', true)
    .maybeSingle();
  return (data as Oda | null) ?? null;
};

export async function odayiBul(kod: string, uzaktanGetir: UzaktanOdaGetirici = ortakBeyindenOda): Promise<Oda | null> {
  const telefondaki = await telefonDeposu.odalar.where('staff_code').equals(kod).first();
  if (telefondaki) return telefondaki;

  if (!cevrimici()) return null;
  const uzaktaki = await uzaktanGetir(kod).catch(() => null);
  if (uzaktaki) await telefonDeposu.odalar.put(uzaktaki);
  return uzaktaki;
}

// Otelin temizlik kontrol listesi (telefondaki paketten). Yoksa boş liste: yine de "Oda Hazır" denebilir.
export async function kontrolListesiniGetir(otelId: string): Promise<KontrolListesi | undefined> {
  return telefonDeposu.kontrolListeleri.where('hotel_id').equals(otelId).first();
}

// Otelin depo ürünleri (telefondaki paketten), ada göre sıralı
export async function urunleriGetir(otelId: string): Promise<Urun[]> {
  const urunler = await telefonDeposu.urunler.where('hotel_id').equals(otelId).toArray();
  return urunler.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}
