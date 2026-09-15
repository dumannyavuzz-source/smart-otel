// Postacı (002 · B.2, B.3)
//   Giden kutusundaki mektupları eskiden yeniye Ortak Beyin'e taşır.
//   İnternet varken vardiya paketini (odalar, kontrol listesi, ürünler) telefona indirir.
//
// İlkeler:
//   * Sıra korunur: eskiden yeniye.
//   * Asla iki kez yazılmaz: aynı UUID zaten varsa sunucu sessizce yok sayar (ignoreDuplicates).
//   * Asla vazgeçilmez: gönderilemeyen mektup tepside kalır, sonra yeniden denenir.
//   * Ağ hatasında durur (boşuna denemez); sunucu reddederse mektubu işaretler, diğerlerine devam eder.
import { telefonDeposu, type KontrolListesi, type Mektup, type Oda, type Urun } from './telefonDeposu';
import { ortakBeyin } from './ortakBeyin';
import { KUTU_DEGISTI_OLAYI, YENI_MEKTUP_OLAYI, cevrimici, haberVer } from './olaylar';

export type GonderimSonucu =
  | { ok: true }
  | { ok: false; kalici: boolean; hata: string };

export type Gonderici = (mektup: Mektup) => Promise<GonderimSonucu>;

// Gerçek gönderici: Ortak Beyin'e yazar.
export const ortakBeyneGonder: Gonderici = async (mektup) => {
  const { error } = await ortakBeyin()
    .from(mektup.tablo)
    .upsert(mektup.icerik, { onConflict: 'id', ignoreDuplicates: true });

  if (!error) return { ok: true };

  // Sunucunun reddi (kilit/kural) bir "code" taşır → kalıcı. Kod yoksa internet kesilmiştir → geçici.
  return { ok: false, kalici: Boolean(error.code), hata: error.message };
};

let gonderiyor = false;

export async function mektuplariGonder(gonder: Gonderici = ortakBeyneGonder): Promise<void> {
  if (gonderiyor || !cevrimici()) return;
  gonderiyor = true;
  try {
    const mektuplar = await telefonDeposu.gidenKutusu.orderBy('olusturuldu').toArray();
    for (const mektup of mektuplar) {
      const sonuc = await gonder(mektup);
      if (sonuc.ok) {
        await telefonDeposu.gidenKutusu.delete(mektup.id);
        continue;
      }
      await telefonDeposu.gidenKutusu.update(mektup.id, { deneme: mektup.deneme + 1, sonHata: sonuc.hata });
      if (!sonuc.kalici) break;                       // internet yok: sonraki fırsatta
    }
  } finally {
    gonderiyor = false;
    haberVer(KUTU_DEGISTI_OLAYI);
  }
}

// Vardiya paketi: internet varken iner, telefonda saklanır. İnmezse eski paketle devam edilir.
export async function paketiIndir(): Promise<void> {
  if (!cevrimici()) return;
  const beyin = ortakBeyin();
  const [odalar, listeler, urunler] = await Promise.all([
    beyin.from('rooms').select('id, hotel_id, number, floor, staff_code').eq('is_active', true),
    beyin.from('checklist_templates').select('id, hotel_id, name, items').eq('is_active', true),
    beyin.from('products').select('id, hotel_id, name, unit').eq('is_active', true),
  ]);
  if (odalar.error || listeler.error || urunler.error) return;

  await telefonDeposu.transaction(
    'rw',
    [telefonDeposu.odalar, telefonDeposu.kontrolListeleri, telefonDeposu.urunler],
    async () => {
      await telefonDeposu.odalar.clear();
      await telefonDeposu.odalar.bulkPut(odalar.data as Oda[]);
      await telefonDeposu.kontrolListeleri.clear();
      await telefonDeposu.kontrolListeleri.bulkPut(listeler.data as KontrolListesi[]);
      await telefonDeposu.urunler.clear();
      await telefonDeposu.urunler.bulkPut(urunler.data as Urun[]);
    },
  );
}

// Postacıyı işe başlat: açılışta · internet gelince · yeni mektup konunca · açıkken her 30 saniyede
export function postaciyiBaslat(): () => void {
  const yolaCik = () => void mektuplariGonder();
  yolaCik();
  void paketiIndir();

  window.addEventListener('online', yolaCik);
  window.addEventListener(YENI_MEKTUP_OLAYI, yolaCik);
  const sayac = window.setInterval(yolaCik, 30_000);

  return () => {
    window.removeEventListener('online', yolaCik);
    window.removeEventListener(YENI_MEKTUP_OLAYI, yolaCik);
    window.clearInterval(sayac);
  };
}
