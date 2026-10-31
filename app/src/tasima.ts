// Eski kutudan yeni kayıt kutusuna taşıma (karar 028).
//
// Kural tek cümle: eski kayıt, yenisi fotoğraflarıyla birlikte yazılıp GERİ OKUNARAK doğrulanmadan silinmez.
//   1. Kayıt ve fotoğrafları yeni kutuya TEK işlemde yazılır (ya hepsi ya hiçbiri — yer dolarsa hiçbiri).
//   2. Yeni kutudan geri okunur: kayıt orada mı, her fotoğraf aynı bayt sayısı ve içerikle mi?
//   3. Ancak o zaman eski kutudan silinir.
// Herhangi bir adım yarıda kalırsa eski kayıt yerinde durur; bir sonraki tur aynı işi baştan, güvenle yapar
// (kimlik aynı kaldığı için çift kayıt oluşmaz).
//
// Eski sürüm aynı anda başka bir sekmede açık olabilir ve bu dosyadaki kilidi TANIMAZ. Bu yüzden kilit yalnızca
// iki yeni sekmenin birbirini beklemesi içindir; eski sekmeye karşı güvence kilitte değil, şu iki gerçektedir:
//   * Eski sekme bir kaydı göndermiş ve silmiş olabilir — yeni kutudaki kopya yeniden gider, sunucu aynı kimliği
//     tanır, eşleştirme "tamamlandı" der (çift kayıt yok).
//   * Eski sekme bir fotoğrafı yükleyip tepsiden silmiş olabilir — eski sürümün kendi kuralıyla aynı:
//     tepside olmayan fotoğraf "yüklenmiş" sayılır.
// Kalan sınır: eski sekme, yeni sekme kopyalamadan ÖNCE reddedilen bir "Aldım/Çözdüm"ü silebilir. Kopyalandıktan
// sonra silmesi bir şey kaybettirmez.
import { telefonDeposu, type Mektup } from './telefonDeposu';
import { kayitDeposu, sonrakiSira, tabloAdi, type Kayit, type KayitFotografi } from './kayitDeposu';

export interface TasimaSonucu {
  tasinan: number;
  kalan: number;              // eski kutuda bırakılan (hata yüzünden) kayıt sayısı
  hatalar: string[];
}

export interface TasimaSecenekleri {
  // Testler için: silmeden hemen önce çağrılır (yarıda kesilmeyi taklit etmek için hata fırlatabilir)
  silmedenOnce?: (mektup: Mektup) => Promise<void> | void;
}

const KILIT_ADI = 'smartotel-tasima';

// Sunucu reddi mi, yoksa eski sürümün yanlışlıkla "kalıcı" saydığı bir bağlantı/oturum sorunu mu?
const GECICI_GORUNEN = /jwt|token|expired|fetch|network|timeout|abort|offline/i;

// Yeni sekmeler aynı anda taşımasın. Kilit yoksa (eski tarayıcı, test) doğrudan çalışır: iş zaten tekrarlanabilir.
async function tekBasina<T>(is: () => Promise<T>): Promise<T> {
  const kilitler = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (kilitler?.request) return kilitler.request(KILIT_ADI, is) as Promise<T>;
  return is();
}

export function eskiKutuyuTasi(secenek: TasimaSecenekleri = {}): Promise<TasimaSonucu> {
  return tekBasina(() => tasi(secenek));
}

async function tasi(secenek: TasimaSecenekleri): Promise<TasimaSonucu> {
  const sonuc: TasimaSonucu = { tasinan: 0, kalan: 0, hatalar: [] };
  const mektuplar = await telefonDeposu.gidenKutusu.orderBy('sira').toArray();

  for (const mektup of mektuplar) {
    try {
      await birini(mektup, secenek);
      sonuc.tasinan++;
    } catch (hata) {
      sonuc.kalan++;
      sonuc.hatalar.push(`${mektup.id}: ${hata instanceof Error ? hata.message : String(hata)}`);
    }
  }
  return sonuc;
}

function eskiYollar(mektup: Mektup): string[] {
  return mektup.fotografYollari ?? (mektup.fotografYolu ? [mektup.fotografYolu] : []);
}

async function birini(mektup: Mektup, secenek: TasimaSecenekleri): Promise<void> {
  const yollar = eskiYollar(mektup);
  // Tepsideki fotoğraflar (olmayan, eski sürümün kuralına göre zaten yüklenmiştir)
  const eskiFotolar = (await telefonDeposu.fotograflar.bulkGet(yollar)).filter(
    (f): f is NonNullable<typeof f> => Boolean(f),
  );

  const zatenVar = await kayitDeposu.kayitlar.get(mektup.id);
  // Yeni kutuda zaten tamamlanmış: fotoğraflar sunucuda, yeni kutu onları bilerek sildi. Geri kopyalanmaz;
  // eski kopya yalnızca silinir (ortak telefonda sahipsiz fotoğraf kalmasın).
  const kopyalanacak = zatenVar?.durum === 'tamamlandi' ? [] : eskiFotolar;
  if (!zatenVar) {
    const kayit = await yeniKayit(mektup);
    const fotolar: KayitFotografi[] = eskiFotolar.map((f) => ({
      yol: f.yol,
      veri: f.veri,
      yazanId: mektup.yazanId,
      olusturuldu: f.olusturuldu,
    }));
    // Tek işlem: yer dolarsa ya da biri yazılamazsa hiçbiri yazılmaz.
    await kayitDeposu.transaction('rw', [kayitDeposu.kayitlar, kayitDeposu.fotograflar], async () => {
      if (await kayitDeposu.kayitlar.get(mektup.id)) return;   // başka bir yeni sekme az önce yazdı
      await kayitDeposu.kayitlar.add({ ...kayit, sira: await sonrakiSira() });
      if (fotolar.length > 0) await kayitDeposu.fotograflar.bulkPut(fotolar);
    });
  } else {
    // Kayıt daha önce kopyalanmış (önceki tur yarıda kaldı). Eksik fotoğraf varsa tamamla.
    const eksikler = [];
    for (const f of kopyalanacak) {
      if (!(await kayitDeposu.fotograflar.get(f.yol))) {
        eksikler.push({ yol: f.yol, veri: f.veri, yazanId: mektup.yazanId, olusturuldu: f.olusturuldu });
      }
    }
    if (eksikler.length > 0) await kayitDeposu.fotograflar.bulkPut(eksikler);
  }

  // Geri okuyarak doğrula — doğrulanmayan silinmez
  const yazilan = await kayitDeposu.kayitlar.get(mektup.id);
  if (!yazilan) throw new Error('Kayıt yeni kutuda bulunamadı.');
  for (const f of kopyalanacak) {
    const kopya = await kayitDeposu.fotograflar.get(f.yol);
    if (!kopya || !(await ayniBlobMu(kopya.veri, f.veri))) {
      throw new Error(`Fotoğraf doğrulanamadı: ${f.yol}`);
    }
  }

  await secenek.silmedenOnce?.(mektup);

  await telefonDeposu.transaction('rw', [telefonDeposu.gidenKutusu, telefonDeposu.fotograflar], async () => {
    await telefonDeposu.gidenKutusu.delete(mektup.id);
    if (eskiFotolar.length > 0) await telefonDeposu.fotograflar.bulkDelete(eskiFotolar.map((f) => f.yol));
  });
}

async function ayniBlobMu(a: Blob, b: Blob): Promise<boolean> {
  if (a.size !== b.size) return false;
  const [x, y] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  const ux = new Uint8Array(x);
  const uy = new Uint8Array(y);
  for (let i = 0; i < ux.length; i++) if (ux[i] !== uy[i]) return false;
  return true;
}

// Eski mektuptan yeni kayıt. Otel kayıttan okunur, tahmin edilmez; bilinemiyorsa null kalır (gönderilmez, görünür).
async function yeniKayit(m: Mektup): Promise<Omit<Kayit, 'sira'>> {
  const isEmri =
    m.tablo === 'work_orders' && typeof m.kosul?.id === 'string'
      ? await telefonDeposu.isEmirleri.get(m.kosul.id)
      : undefined;
  const otelId = typeof m.icerik.hotel_id === 'string' ? m.icerik.hotel_id : isEmri?.hotel_id ?? null;
  const oda = typeof m.icerik.room_id === 'string' ? await telefonDeposu.odalar.get(m.icerik.room_id) : undefined;
  const odaNo = oda?.number ?? isEmri?.oda_no;

  const eskiRet = Boolean(m.kalici) && !GECICI_GORUNEN.test(m.sonHata ?? '');
  const yollar = eskiYollar(m);
  return {
    id: m.id,
    yazanId: m.yazanId,
    otelId,
    tablo: m.tablo,
    icerik: m.icerik,
    ...(m.islem ? { islem: m.islem } : {}),
    ...(m.kosul ? { kosul: m.kosul } : {}),
    ozet: `${odaNo ? `Oda ${odaNo} · ` : ''}${tabloAdi(m.tablo, m.icerik)}`,
    olusturuldu: m.olusturuldu,
    // Eski sürümde reddedilmiş kayıt yeniden GÖNDERİLMEZ; önce sunucuda var mı diye bakılır.
    durum: eskiRet ? 'belirsiz' : 'bekliyor',
    deneme: m.deneme,
    ...(m.sonDeneme ? { sonDeneme: m.sonDeneme } : {}),
    ...(m.sonHata ? { sonHata: m.sonHata } : {}),
    ...(eskiRet ? { eskiRet: true } : {}),
    eskiSurumden: true,
    ...(yollar.length > 0 ? { fotografYollari: yollar } : {}),
  };
}
