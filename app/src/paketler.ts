// Fiyat paketleri: oda sayısına göre dört basamak (Genel Müdür kararı, 2026-09-17).
// Vitrindeki fiyat bölümüyle (vitrin/index.html · #fiyat) AYNI olmak zorundadır:
// vitrinin uygulamayla ortak kodu yoktur, bu yüzden rakam iki yerde yazılıdır. Biri değişirse diğeri de değişir.
export interface Paket {
  ad: string;
  odalar: string;
  fiyat: string;
  donem?: string;        // "/ay" — özel teklifte yoktur
  iletisim?: boolean;    // fiyat yerine "İletişime Geçin" bağlantısı çıkar
}

export const PAKETLER: Paket[] = [
  { ad: 'Butik',    odalar: '1–25 oda',   fiyat: '$29', donem: '/ay' },
  { ad: 'Standart', odalar: '26–75 oda',  fiyat: '$59', donem: '/ay' },
  { ad: 'Büyük',    odalar: '76–150 oda', fiyat: '$99', donem: '/ay' },
  { ad: 'Kurumsal', odalar: '150+ oda',   fiyat: 'Özel Teklif', iletisim: true },
];

// Kurumsal plan için tek iletişim yolu bugün e-postadır (v1-1-notlari · B4).
export const KURUMSAL_ADRESI = 'mailto:merhaba@oteldijital.com';

// Yıllık ödeme vurgusu — vitrindeki cümlenin aynısı, iki yerde farklı söz verilmesin.
export const YILLIK_VURGU = 'Yıllık ödemede iki ay hediye. Fiyatlara KDV dahil değildir.';
