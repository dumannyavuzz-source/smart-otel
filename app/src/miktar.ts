// Miktar — sayı ve birimi bir arada tutan tek yer (Aşama 17.1).
//
// Otel mutfağına "7,5 Kg domates" ya da "1,2 Litre süt" gelir; ama "2,5 havlu" diye bir şey yoktur.
// Bu yüzden kararı BİRİM verir:
//   * Bölünebilen birim (Kg, Litre, gram…) → ondalık serbest, − + tuşu yarımşar gider.
//   * Sayılabilen birim (adet, Koli, Paket…) → yalnızca tam sayı, − + tuşu birer birer gider.
//
// Sayı hiçbir yerde çıplak bırakılmaz: her yazıldığı yerde birimiyle birlikte yazılır ("7,5 Kg").

const ONDALIK = 2;                 // veritabanı da iki ondalık saklar: numeric(8,2)

// Yarısı, çeyreği olan birimler. Müdür ürünü eklerken bu kelimelerden birini yazarsa ondalık açılır.
const BOLUNEBILIR = ['kg', 'kilo', 'kilogram', 'g', 'gr', 'gram', 'l', 'lt', 'litre', 'ml', 'm', 'metre'];

// Birim yazılmamışsa "adet" denir: soru hiçbir zaman yarım kalmaz.
export function birimAdi(birim: string): string {
  return birim.trim() || 'adet';
}

// Müdür birimi elle yazar: "Kg", "KİLO", "Lt.", "litre"… Hepsi aynı kelimeye indirilir.
// Türkçe tuzağı: "LİTRE".toLowerCase() noktalı i üretir ("li̇tre") ve listede bulunamaz.
// Bu yüzden harflerin üstündeki işaretler ayrılıp atılır, ı da i sayılır, nokta/boşluk silinir.
function sadelestir(birim: string): string {
  return birimAdi(birim)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z]/g, '');
}

export function bolunebilirMi(birim: string): boolean {
  return BOLUNEBILIR.includes(sadelestir(birim));
}

// − + tuşunun adımı: yarım kilo mantıklıdır, yarım koli değildir.
export function adim(birim: string): number {
  return bolunebilirMi(birim) ? 0.5 : 1;
}

// 0,1 + 0,2 bilgisayarda 0,30000000000000004 eder. Bu gürültü ne ekrana ne veritabanına sızsın.
export function yuvarla(sayi: number): number {
  const carpan = 10 ** ONDALIK;
  return Math.round(sayi * carpan) / carpan;
}

// Türkçe yazılır: "7,5" · "10". Gereksiz sıfır yazılmaz ("7,50" değil).
export function sayiYaz(sayi: number): string {
  return String(yuvarla(sayi)).replace('.', ',');
}

// Kullanıcının yazdığı: "7,5" de olur "7.5" de. Anlaşılmazsa null döner (ekran eski sayıyı korur).
export function sayiOku(metin: string): number | null {
  const temiz = metin.trim().replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(temiz)) return null;   // "7" · "7,5" · "7," · ",5" olur; "" · "," · "abc" olmaz
  const sayi = Number(temiz);
  return Number.isFinite(sayi) ? yuvarla(sayi) : null;
}

// "10 Kg" — sayı ve birim hep yan yana.
export function miktarMetni(miktar: number, birim: string): string {
  return `${sayiYaz(miktar)} ${birimAdi(birim)}`;
}

// Soru ürünün birimiyle sorulur: "Kaç Kg geldi?" · "Kaç adet geldi?"
export function birimSorusu(birim: string): string {
  return `Kaç ${birimAdi(birim)} geldi?`;
}

// ---------------------------------------------------------------------
// Sayacın kalbi: kullanıcının yazdığını temizler ve sayıyı kurallara sokar.
// Ekrandan ayrı durur ki tek başına denenebilsin (bu iki kural sahada para hatası önler).
// ---------------------------------------------------------------------

// Sayılabilen birimde virgül ve SONRASI atılır: "2,5 Koli" → "2".
// Yalnızca virgülü silmek "25" ederdi; on kat hata olurdu.
export function yaziyiTemizle(metin: string, birim: string): string {
  const rakamlar = metin.replace(/[^0-9.,]/g, '');
  return bolunebilirMi(birim) ? rakamlar : (rakamlar.split(/[.,]/)[0] ?? '');
}

// Sayı önce birime uydurulur (bölünmeyen birimde tam sayıya), sonra alt/üst sınıra çekilir.
export function miktariSinirla(sayi: number, birim: string, enAz: number, enFazla: number): number {
  const birimeUygun = bolunebilirMi(birim) ? sayi : Math.round(sayi);
  return Math.min(enFazla, Math.max(enAz, yuvarla(birimeUygun)));
}
