// Postacı (002 · B.2, B.3, B.6)
//   Giden kutusundaki mektupları sırayla Ortak Beyin'e taşır. Fotoğrafı olan mektupta önce fotoğraf yüklenir.
//   İnternet varken vardiya paketini (odalar, kontrol listesi, ürünler) telefona indirir.
//
// İlkeler:
//   * Sıra korunur: sıra numarasına göre (saate değil).
//   * Yalnızca giriş yapmış kişinin mektupları gider; başkasınınki sahibi girince gider.
//   * Asla iki kez yazılmaz: aynı UUID zaten varsa sunucu sessizce yok sayar (ignoreDuplicates).
//   * Asla vazgeçilmez: gönderilemeyen mektup tepside kalır. Ağ hatasında durur (boşuna denemez);
//     sunucu kesin reddederse mektubu işaretler, diğerlerine devam eder, onu seyrek (10 dk'da bir) yeniden dener.
import { telefonDeposu, type KontrolListesi, type Mektup, type Oda, type Urun } from './telefonDeposu';
import { ortakBeyin } from './ortakBeyin';
import { KUTU_DEGISTI_OLAYI, YENI_MEKTUP_OLAYI, cevrimici, haberVer } from './olaylar';
import { aktifKullanici } from './kullanici';
import { isEmirleriniIndir } from './isEmirleri';

export type GonderimSonucu =
  | { ok: true }
  | { ok: false; kalici: boolean; hata: string };

export type Gonderici = (mektup: Mektup) => Promise<GonderimSonucu>;
export type Yukleyici = (yol: string, veri: Blob) => Promise<GonderimSonucu>;

const KALICI_HATADA_BEKLEME_MS = 10 * 60 * 1000;
const KALICI_HATADA_ILK_DENEMELER = 3;             // ilk 3 deneme hemen, sonrası 10 dk arayla

// Gerçek gönderici: Ortak Beyin'e yazar.
//   Beyan      → yeni satır; aynı UUID varsa sunucu yok sayar (tekrar yok).
//   Güncelleme → koşula uyan satır güncellenir; uyan yoksa (iş çoktan kapanmış) sessizce geçer.
export const ortakBeyneGonder: Gonderici = async (mektup) => {
  const tablo = ortakBeyin().from(mektup.tablo);
  const { error } =
    mektup.islem === 'guncelle'
      ? await tablo.update(mektup.icerik).match(mektup.kosul ?? { id: mektup.id })
      : await tablo.upsert(mektup.icerik, { onConflict: 'id', ignoreDuplicates: true });

  if (!error) return { ok: true };

  // Sunucunun reddi (kilit/kural) bir "code" taşır → kalıcı. Kod yoksa internet kesilmiştir → geçici.
  return { ok: false, kalici: Boolean(error.code), hata: error.message };
};

// Gerçek yükleyici: kilitli "photos" deposuna, otelin klasörüne.
export const ortakBeyneYukle: Yukleyici = async (yol, veri) => {
  const { error } = await ortakBeyin()
    .storage.from('photos')
    .upload(yol, veri, { contentType: 'image/jpeg', upsert: false });

  if (!error) return { ok: true };

  // Sunucu cevabı sayısal bir durum taşır (status). 409 = "zaten var": önceki denemede yüklenmiş, sorun değil.
  const { status, statusCode } = error as { status?: number; statusCode?: string | number };
  if (status === 409 || String(statusCode) === '409') return { ok: true };
  return { ok: false, kalici: status !== undefined || statusCode !== undefined, hata: error.message };
};

let gonderiyor = false;

export async function mektuplariGonder(
  gonder: Gonderici = ortakBeyneGonder,
  yukle: Yukleyici = ortakBeyneYukle,
): Promise<void> {
  const benimId = aktifKullanici();
  if (gonderiyor || !cevrimici() || !benimId) return;
  gonderiyor = true;
  try {
    const mektuplar = (await telefonDeposu.gidenKutusu.orderBy('sira').toArray())
      .filter((m) => m.yazanId === benimId);

    for (const mektup of mektuplar) {
      if (simdilikBekle(mektup)) continue;          // kesin reddedilmiş: seyrek dene, ağı yorma

      // 1) Önce fotoğraf (varsa ve hâlâ telefondaysa). Yüklenince telefondan silinir.
      if (mektup.fotografYolu) {
        const foto = await telefonDeposu.fotograflar.get(mektup.fotografYolu);
        if (foto) {
          const yukleme = await guvenle(() => yukle(foto.yol, foto.veri));
          if (!yukleme.ok) {
            await hataIsaretle(mektup, yukleme);
            if (!yukleme.kalici) break;
            continue;
          }
          await telefonDeposu.fotograflar.delete(foto.yol);
        }
      }

      // 2) Sonra kayıt (fotoğrafın yolunu taşır)
      const sonuc = await guvenle(() => gonder(mektup));
      if (sonuc.ok) {
        await telefonDeposu.gidenKutusu.delete(mektup.id);
        continue;
      }
      // Güncelleme kesin reddedildiyse (iş başkasında / çoktan çözülmüş) sunucu haklıdır: mektup düşer,
      // liste bir sonraki indirmede gerçeği gösterir. Beyanlar ise asla düşmez.
      if (sonuc.kalici && mektup.islem === 'guncelle') {
        console.warn('[postaci] güncelleme reddedildi, sunucu haklı:', sonuc.hata);
        await telefonDeposu.gidenKutusu.delete(mektup.id);
        continue;
      }
      await hataIsaretle(mektup, sonuc);
      if (!sonuc.kalici) break;                       // internet yok: sonraki fırsatta
    }
  } finally {
    gonderiyor = false;
    haberVer(KUTU_DEGISTI_OLAYI);
  }
}

// Gönderici/yükleyici beklenmedik biçimde patlarsa postacı kilitlenmesin: geçici hata say.
async function guvenle(is: () => Promise<GonderimSonucu>): Promise<GonderimSonucu> {
  try {
    return await is();
  } catch (hata) {
    return { ok: false, kalici: false, hata: hata instanceof Error ? hata.message : String(hata) };
  }
}

function simdilikBekle(mektup: Mektup): boolean {
  if (!mektup.kalici || mektup.deneme < KALICI_HATADA_ILK_DENEMELER || !mektup.sonDeneme) return false;
  return Date.now() - Date.parse(mektup.sonDeneme) < KALICI_HATADA_BEKLEME_MS;
}

function hataIsaretle(mektup: Mektup, sonuc: { kalici: boolean; hata: string }): Promise<number> {
  return telefonDeposu.gidenKutusu.update(mektup.id, {
    deneme: mektup.deneme + 1,
    sonHata: sonuc.hata,
    kalici: sonuc.kalici,
    sonDeneme: new Date().toISOString(),
  });
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
// İş emirleri listesi ise her 60 saniyede tazelenir (teknisyen yeni işi görsün).
export function postaciyiBaslat(): () => void {
  const yolaCik = () => void mektuplariGonder();
  const paketiAl = () => void paketiIndir().catch(() => undefined);
  const isleriAl = () => void isEmirleriniIndir().catch(() => undefined);
  yolaCik();
  paketiAl();
  isleriAl();

  const internetGeldi = () => {
    yolaCik();
    paketiAl();
    isleriAl();
  };
  window.addEventListener('online', internetGeldi);
  window.addEventListener(YENI_MEKTUP_OLAYI, yolaCik);
  const sayac = window.setInterval(yolaCik, 30_000);
  const isSayaci = window.setInterval(isleriAl, 60_000);

  return () => {
    window.removeEventListener('online', internetGeldi);
    window.removeEventListener(YENI_MEKTUP_OLAYI, yolaCik);
    window.clearInterval(sayac);
    window.clearInterval(isSayaci);
  };
}

// Ana ekran için: bu kişinin bekleyen / gönderilemeyen kayıtları ve başkalarının bekleyenleri
export async function kutuDurumu(): Promise<{ bekleyen: number; gonderilemeyen: number; baskasinin: number }> {
  const benimId = aktifKullanici();
  const hepsi = await telefonDeposu.gidenKutusu.toArray();
  const benim = hepsi.filter((m) => m.yazanId === benimId);
  return {
    bekleyen: benim.length,
    gonderilemeyen: benim.filter((m) => m.kalici).length,
    baskasinin: hepsi.length - benim.length,
  };
}
