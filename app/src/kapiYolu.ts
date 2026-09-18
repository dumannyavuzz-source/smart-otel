// Kapıdan içeri girerken nereye dönülür?
// Girişsiz kişi /oda/ABC gibi bir yola gelirse önce /giris'e gönderilir ve geldiği yol yanında taşınır.
// Giriş yapınca bu yol geri okunur. Yalnızca uygulamanın kendi yolları kabul edilir:
// başka bir siteye çıkan ("//kotu.site", "https://…") ya da kapının kendisine dönen yol ana ekrana düşer.
export function guvenliYol(yol: unknown): string {
  if (typeof yol !== 'string') return '/';
  // İkinci karakter / ya da \ ise tarayıcı bunu başka bir site sayar: dışarı çıkış yolu kapalı.
  if (!yol.startsWith('/') || yol.startsWith('//') || yol.startsWith('/\\')) return '/';
  if (yol === '/giris' || yol.startsWith('/giris/') || yol.startsWith('/giris?')) return '/';
  return yol;
}
