// Demo süresi: her otel kayıt anında 30 gün alır (docs/decisions/005-demo-suresi-ve-odeme-duvari.md).
//
// Buradaki hesap saftır: bitiş tarihi girer, "kaç gün kaldı" ve "süre doldu mu" çıkar.
// Asıl kilit sunucudadır (…_demo_suresi.sql). Bu dosya yalnızca ekranın ne göstereceğini bilir;
// birisi bu kodu kandırsa bile sunucu yine yazdırmaz.
export const DEMO_GUN = 30;
export const UYARI_GUNU = 7;               // 7 gün ve altında sayaç renk değiştirir

// Paketlerin durduğu yer: vitrinin fiyat bölümü. Ödeme sağlayıcısı henüz yoktur (v1-1-notlari · B3),
// bu yüzden "paketinizi seçin" bugün fiyat sayfasına götürür.
export const PAKETLER_ADRESI = 'https://oteldijital.com/#fiyat';

const GUN_MS = 24 * 60 * 60 * 1000;

// Tarih bilinmiyorsa (eski telefon önbelleği, sunucu sorulamadı) cevap "bilmiyorum"dur: null.
// "Bilmiyorum" ile "süresi doldu" asla aynı şey değildir — kimse bilinmezlik yüzünden kilitlenmez.
function an(bitis: string | null | undefined): number | null {
  if (!bitis) return null;
  const zaman = Date.parse(bitis);
  return Number.isNaN(zaman) ? null : zaman;
}

// Kaç gün kaldı? Başlamış gün, kalan gün sayılır: 2 gün 3 saat kaldıysa cevap 3'tür.
// Süre dolduysa 0, bilinmiyorsa null.
export function kalanGun(bitis: string | null | undefined, simdi: Date = new Date()): number | null {
  const bitisAni = an(bitis);
  if (bitisAni === null) return null;
  const fark = bitisAni - simdi.getTime();
  return fark <= 0 ? 0 : Math.ceil(fark / GUN_MS);
}

// Süre doldu mu? Yalnızca tarih biliniyorsa ve geçmişse "evet".
export function demoBitti(bitis: string | null | undefined, simdi: Date = new Date()): boolean {
  const bitisAni = an(bitis);
  return bitisAni !== null && bitisAni <= simdi.getTime();
}

// Son günler mi? (renk değişir, "paketinizi seçin" uyarısı çıkar)
export function sonGunlerMi(kalan: number): boolean {
  return kalan > 0 && kalan <= UYARI_GUNU;
}

// Sayaç yalnızca demo penceresindeyken görünür. Süreyi biz uzattıysak (parasını ödemiş otel)
// kalan gün 30'u aşar ve çubuk kendiliğinden kaybolur: ödeyen müdür her gün sayaç görmez.
export function sayacGorunsunMu(kalan: number): boolean {
  return kalan <= DEMO_GUN;
}
