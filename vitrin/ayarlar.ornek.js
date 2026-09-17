// Vitrinin tek ayarı: Ortak Beyin'in (Supabase) adresi ve ZİYARETÇİ anahtarı.
//
// Bu dosya bir ÖRNEKTİR. Gerçeği (ayarlar.js) git'e girmez (.gitignore):
//   · Bilgisayarda: bu dosyayı ayarlar.js adıyla kopyalayın, iki değeri doldurun.
//   · Vercel'de: SUPABASE_URL ve SUPABASE_ANON_KEY ortam değişkenlerini girin;
//     depo kökündeki derleme komutu (sh ayarlar-uret.sh) dosyayı her dağıtımda kendisi üretir.
//
// Ziyaretçi anahtarı iletişim tablosuna yalnızca YAZABİLİR, okuyamaz, silemez
// (docs/security/007-iletisim-formu.md). Dosya yoksa form "gönderilemedi" der ve
// e-posta adresini gösterir; sayfa bozulmaz.
window.OTELDIJITAL_AYARLAR = {
  url: 'https://PROJE-KIMLIGI.supabase.co',
  anahtar: 'ZIYARETCI-ANAHTARI'
};
