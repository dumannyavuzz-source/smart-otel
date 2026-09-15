// Uygulama içi küçük haberleşme (iki haber, karışmasın):
//   YENI_MEKTUP  → giden kutusuna yeni beyan kondu. Postacı hemen yola çıkar, ekran sayıyı günceller.
//   KUTU_DEGISTI → postacı işini bitirdi, kutu değişti. Yalnızca ekran sayıyı günceller.
//   PAKET_GELDI  → sunucudan yeni veri indi (odalar, iş emirleri…). Ekranlar listeyi tazeler.
//   CIKIS_OLAYI  → kullanıcı çıktı. Ekran beklemeden giriş ekranına döner (internet yokken de).
export const YENI_MEKTUP_OLAYI = 'smartotel:yeni-mektup';
export const KUTU_DEGISTI_OLAYI = 'smartotel:kutu-degisti';
export const PAKET_OLAYI = 'smartotel:paket-geldi';
export const CIKIS_OLAYI = 'smartotel:cikis';

export function haberVer(olay: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(olay));
  }
}

// İnternet var mı? (Tarayıcı dışında — testlerde — "var" sayılır.)
export function cevrimici(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}
