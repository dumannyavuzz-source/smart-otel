// Postacı (002 · B.2, B.3, B.6 · karar 028)
//   Kayıt kutusundaki işleri sırayla Ortak Beyin'e taşır. Fotoğrafı olan kayıtta önce fotoğraf yüklenir.
//   İnternet varken vardiya paketini (odalar, kontrol listesi, ürünler) telefona indirir.
//
// İlkeler:
//   * Sıra korunur: sıra numarasına göre (saate değil).
//   * Yalnızca giriş yapmış kişinin, AKTİF OTELDEKİ kayıtları gider. Başkasınınki ve diğer otelinki korunur.
//   * Her kayıttan önce bağlam (kişi + otel) yeniden kontrol edilir; değiştiyse postacı durur.
//   * "Tamamlandı" demek için sunucunun cevabı yetmez: sunucudaki satır kişi + otel + içerikle eşleşmelidir.
//   * Sunucu kesin reddederse kayıt silinmez, otomatik yeniden de gönderilmez: nedeniyle saklanır.
//   * Ağ hatasında durur (boşuna denemez); sonraki fırsatta kaldığı yerden devam eder.
import { telefonDeposu, type KontrolListesi, type Oda, type Urun } from './telefonDeposu';
import {
  kayitDeposu,
  kisininKayitlari,
  kutuOzeti,
  kuyruk,
  kuyruktaMi,
  type Kayit,
  type KutuOzeti,
} from './kayitDeposu';
import { eskiKutuyuTasi } from './tasima';
import { ortakBeyin } from './ortakBeyin';
import { KUTU_DEGISTI_OLAYI, YENI_MEKTUP_OLAYI, cevrimici, haberVer } from './olaylar';
import { aktifBaglam, aktifKullanici, aktifProfil, ayniBaglamMi, type Baglam } from './kullanici';
import { isEmirleriniIndir, isEmriniSunucuyaGoreDuzelt } from './isEmirleri';
import { teslimleriIndir } from './teslimler';

// Sunucudan dönen (ya da sorulan) satır
export type SunucuSatiri = Record<string, unknown>;

export type GonderimSonucu =
  | { ok: true; satir: SunucuSatiri | null }           // satir null: sunucu satırı geri vermedi (zaten var / görünmüyor)
  | { ok: false; kalici: boolean; hata: string; kod?: string };

export type YuklemeSonucu = { ok: true } | { ok: false; kalici: boolean; hata: string };

export type SorguSonucu = { ok: true; satir: SunucuSatiri | null } | { ok: false; hata: string };

export type Gonderici = (kayit: Kayit) => Promise<GonderimSonucu>;
export type Yukleyici = (yol: string, veri: Blob) => Promise<YuklemeSonucu>;
export type Sorgulayici = (kayit: Kayit) => Promise<SorguSonucu>;

// İş emrinde sunucunun gerçek hali bu sütunlardan okunur
export const IS_EMRI_SUTUNLARI = 'id, hotel_id, assigned_to, status, resolved_by, resolved_photo_path';

// Beyanda "kim imzaladı" sütunu: teslimde received_by, diğerlerinde created_by
function imzaSutunu(kayit: Kayit): string {
  return kayit.tablo === 'deliveries' ? 'received_by' : 'created_by';
}

function eklemeSutunlari(kayit: Kayit): string {
  return [...new Set(['id', 'hotel_id', imzaSutunu(kayit), ...Object.keys(kayit.icerik)])].join(', ');
}

// Sunucu cevabı geçici mi (bekle, yeniden dene) yoksa kesin mi (sakla, gösterme)?
//   Kodsuz hata = bağlantı yok. Oturum kartı (401 / PGRST3xx), zaman aşımı, yoğunluk ve sunucu hataları geçicidir.
export function kaliciMi(kod: string | undefined, durum?: number): boolean {
  if (!kod) return false;
  if (kod.startsWith('PGRST3')) return false;
  if (durum !== undefined && (durum === 0 || durum === 401 || durum === 408 || durum === 429 || durum >= 500)) {
    return false;
  }
  return true;
}

// Gerçek gönderici: Ortak Beyin'e yazar ve yazılan satırı GERİ İSTER.
//   Beyan      → yeni satır; aynı kimlik zaten varsa sunucu yok sayar ve satır dönmez (sonra sorulur).
//   Güncelleme → koşula uyan satır güncellenir; hiçbir satır değişmezse satır dönmez (sonra sorulur).
export const ortakBeyneGonder: Gonderici = async (kayit) => {
  const tablo = ortakBeyin().from(kayit.tablo);
  const yanit =
    kayit.islem === 'guncelle'
      ? await tablo.update(kayit.icerik).match(kayit.kosul ?? { id: kayit.id }).select(IS_EMRI_SUTUNLARI)
      : await tablo.upsert(kayit.icerik, { onConflict: 'id', ignoreDuplicates: true }).select(eklemeSutunlari(kayit));

  if (yanit.error) {
    return {
      ok: false,
      kalici: kaliciMi(yanit.error.code, yanit.status),
      hata: yanit.error.message,
      ...(yanit.error.code ? { kod: yanit.error.code } : {}),
    };
  }
  const satirlar = (yanit.data ?? []) as unknown as SunucuSatiri[];
  return { ok: true, satir: satirlar[0] ?? null };
};

// Gerçek sorgulayıcı: "bu kimlikli satır sunucuda var mı, nasıl?"
export const ortakBeyindenSor: Sorgulayici = async (kayit) => {
  const guncelleme = kayit.islem === 'guncelle';
  const hedef = guncelleme ? (kayit.kosul?.id ?? kayit.id) : kayit.id;
  const { data, error } = await ortakBeyin()
    .from(kayit.tablo)
    .select(guncelleme ? IS_EMRI_SUTUNLARI : eklemeSutunlari(kayit))
    .eq('id', hedef as string)
    .maybeSingle();
  if (error) return { ok: false, hata: error.message };
  return { ok: true, satir: (data as unknown as SunucuSatiri | null) ?? null };
};

// Gerçek yükleyici: kilitli "photos" deposuna, otelin klasörüne.
export const ortakBeyneYukle: Yukleyici = async (yol, veri) => {
  const { error } = await ortakBeyin()
    .storage.from('photos')
    .upload(yol, veri, { contentType: 'image/jpeg', upsert: false });

  if (!error) return { ok: true };

  // 409 = "zaten var": önceki denemede yüklenmiş, sorun değil.
  const { status, statusCode } = error as { status?: number; statusCode?: string | number };
  const durum = status ?? (statusCode !== undefined ? Number(statusCode) : undefined);
  if (durum === 409) return { ok: true };
  const gecici = durum === undefined || Number.isNaN(durum) || durum === 0 || durum === 401 || durum === 408 || durum === 429 || durum >= 500;
  return { ok: false, kalici: !gecici, hata: error.message };
};

// ---------------------------------------------------------------------
// Eşleştirme: sunucudaki satır, bu kişinin bu oteldeki bu işi mi?
// ---------------------------------------------------------------------
function normal(anahtar: string, deger: unknown): string | null {
  if (deger === null || deger === undefined) return null;
  if (anahtar === 'created_at_device' && typeof deger === 'string') {
    const ms = Date.parse(deger);
    return Number.isNaN(ms) ? deger : String(ms);
  }
  if (typeof deger === 'number') return String(Math.round(deger * 100) / 100);
  if (Array.isArray(deger)) return JSON.stringify(deger.map((d) => normal('', d)).sort());
  return String(deger);
}

export type Eslesme = 'eslesti' | 'uyusmadi';

export function eslestir(kayit: Kayit, satir: SunucuSatiri, benimId: string): Eslesme {
  if (satir.hotel_id !== kayit.otelId) return 'uyusmadi';

  if (kayit.islem === 'guncelle') {
    const istenen = kayit.icerik;
    if (istenen.status === 'resolved') {
      if (satir.status !== 'resolved' || satir.resolved_by !== benimId) return 'uyusmadi';
      if ('resolved_photo_path' in istenen && satir.resolved_photo_path !== istenen.resolved_photo_path) {
        return 'uyusmadi';
      }
      return 'eslesti';
    }
    // "Aldım": iş bende olmalı (sonradan benim tarafımdan çözülmüş olması da Aldım'ı doğrular)
    if (satir.assigned_to !== benimId) return 'uyusmadi';
    if (satir.status === 'in_progress') return 'eslesti';
    return satir.status === 'resolved' && satir.resolved_by === benimId ? 'eslesti' : 'uyusmadi';
  }

  if (satir[imzaSutunu(kayit)] !== benimId) return 'uyusmadi';
  for (const [anahtar, deger] of Object.entries(kayit.icerik)) {
    if (normal(anahtar, satir[anahtar]) !== normal(anahtar, deger)) return 'uyusmadi';
  }
  return 'eslesti';
}

// İş emri neden "tamamlanmadı"? Sunucudaki gerçek durumdan kişiye bir cümle.
export function isEmriDurumu(satir: SunucuSatiri, benimId: string): string {
  if (satir.status === 'resolved') {
    return satir.resolved_by === benimId ? 'Bu iş sizin tarafınızdan çözülmüş.' : 'Bu iş başka biri tarafından çözülmüş.';
  }
  if (satir.assigned_to && satir.assigned_to !== benimId) return 'Bu iş başkasında.';
  if (!satir.assigned_to) return 'Bu iş sunucuda hâlâ sahipsiz görünüyor.';
  return 'Sunucudaki durum bu işlemle uyuşmuyor.';
}

type Dogrulama =
  | { tur: 'eslesti'; satir: SunucuSatiri }
  | { tur: 'uyusmadi'; satir: SunucuSatiri }
  | { tur: 'yok' }
  | { tur: 'bilinmiyor'; hata: string };

async function dogrula(kayit: Kayit, benimId: string, sorgula: Sorgulayici): Promise<Dogrulama> {
  let sonuc: SorguSonucu;
  try {
    sonuc = await sorgula(kayit);
  } catch (hata) {
    return { tur: 'bilinmiyor', hata: hata instanceof Error ? hata.message : String(hata) };
  }
  if (!sonuc.ok) return { tur: 'bilinmiyor', hata: sonuc.hata };
  if (!sonuc.satir) return { tur: 'yok' };
  return { tur: eslestir(kayit, sonuc.satir, benimId), satir: sonuc.satir };
}

// ---------------------------------------------------------------------
// Durum yazıcıları — her biri yalnızca KENDİ kaydını değiştirir
// ---------------------------------------------------------------------
const simdi = () => new Date().toISOString();

async function tamamla(kayit: Kayit): Promise<void> {
  // Geçmişte yalnızca özet kalır: içerik ve fotoğraflar telefondan silinir (ortak telefon gizliliği).
  await kayitDeposu.transaction('rw', [kayitDeposu.kayitlar, kayitDeposu.fotograflar], async () => {
    await kayitDeposu.kayitlar.update(kayit.id, {
      durum: 'tamamlandi',
      tamamlandi: simdi(),
      icerik: {},
      neden: undefined,
      sonHata: undefined,
      sunucuKodu: undefined,
      eskiRet: undefined,
      yuklenenFotograflar: undefined,
    });
    // Fotoğrafların yerel kopyası ancak burada, kayıt sunucuda doğrulanınca silinir.
    if (kayit.fotografYollari?.length) await kayitDeposu.fotograflar.bulkDelete(kayit.fotografYollari);
  });
}

function reddet(kayit: Kayit, neden: string, kod?: string): Promise<number> {
  return kayitDeposu.kayitlar.update(kayit.id, {
    durum: 'reddedildi',
    neden,
    sunucuKodu: kod,
    deneme: kayit.deneme + 1,
    sonDeneme: simdi(),
  });
}

function cakistir(kayit: Kayit): Promise<number> {
  return kayitDeposu.kayitlar.update(kayit.id, {
    durum: 'cakisma',
    neden: 'Sunucuda aynı kimlikle başka bir kayıt var (kişi, otel ya da içerik farklı). Kayıt saklandı; yöneticinize haber verin.',
    deneme: kayit.deneme + 1,
    sonDeneme: simdi(),
  });
}

function belirsizBirak(kayit: Kayit, neden: string): Promise<number> {
  return kayitDeposu.kayitlar.update(kayit.id, { durum: 'belirsiz', neden, deneme: kayit.deneme + 1, sonDeneme: simdi() });
}

function geciciHata(kayit: Kayit, hata: string): Promise<number> {
  return kayitDeposu.kayitlar.update(kayit.id, { deneme: kayit.deneme + 1, sonHata: hata, sonDeneme: simdi() });
}

// Sonuç kaydedildikten sonra telefondaki iş listesi sunucuya göre düzeltilir — ama yalnızca bağlam aynıysa.
async function isListesiniDuzelt(kayit: Kayit, satir: SunucuSatiri | undefined, baglam: Baglam): Promise<void> {
  if (kayit.tablo !== 'work_orders' || !satir || !ayniBaglamMi(baglam)) return;
  await isEmriniSunucuyaGoreDuzelt(satir);
}

// ---------------------------------------------------------------------
// Gönderim
// ---------------------------------------------------------------------
let gonderiyor = false;

export async function mektuplariGonder(
  gonder: Gonderici = ortakBeyneGonder,
  yukle: Yukleyici = ortakBeyneYukle,
  sorgula: Sorgulayici = ortakBeyindenSor,
): Promise<void> {
  const baglam = aktifBaglam();
  if (gonderiyor || !cevrimici() || !baglam.kullanici) return;
  gonderiyor = true;
  try {
    // Eski sürümün kutusunda kalan (ya da eski bir sekmenin az önce yazdığı) kayıtlar önce taşınır.
    await eskiKutuyuTasi().catch(() => undefined);
    await otelleriTamamla(baglam, sorgula);
    if (!baglam.otel) return;

    for (const kayit of await kuyruk(baglam.kullanici, baglam.otel)) {
      if (!ayniBaglamMi(baglam)) break;                          // kişi ya da otel değişti: dur
      const guncel = await kayitDeposu.kayitlar.get(kayit.id);  // başka bir sekme bitirmiş olabilir
      if (!guncel || !kuyruktaMi(guncel)) continue;
      const devam = await birKaydiIsle(guncel, baglam, gonder, yukle, sorgula);
      if (!devam) break;                                        // bağlantı yok: sonraki fırsatta
    }
  } finally {
    gonderiyor = false;
    haberVer(KUTU_DEGISTI_OLAYI);
  }
}

// Oteli bilinmeyen (eski sürümden taşınmış) iş emri kayıtları: otel sunucudan öğrenilir, tahmin edilmez.
async function otelleriTamamla(baglam: Baglam, sorgula: Sorgulayici): Promise<void> {
  const bilinmeyenler = (await kisininKayitlari(baglam.kullanici)).filter(
    (k) => k.otelId === null && kuyruktaMi(k) && k.tablo === 'work_orders',
  );
  for (const kayit of bilinmeyenler) {
    if (!ayniBaglamMi(baglam)) return;
    const sonuc = await sorgula(kayit).catch(() => null);
    const otel = sonuc?.ok ? sonuc.satir?.hotel_id : undefined;
    if (typeof otel === 'string') await kayitDeposu.kayitlar.update(kayit.id, { otelId: otel });
  }
}

// Tek kaydı işle. false dönerse bağlantı yoktur: postacı durur.
async function birKaydiIsle(
  kayit: Kayit,
  baglam: Baglam,
  gonder: Gonderici,
  yukle: Yukleyici,
  sorgula: Sorgulayici,
): Promise<boolean> {
  const ben = baglam.kullanici!;
  const guncelleme = kayit.islem === 'guncelle';

  // 1) Belirsiz kayıt: önce sunucuya bakılır.
  if (kayit.durum === 'belirsiz') {
    const d = await dogrula(kayit, ben, sorgula);
    if (d.tur === 'eslesti') {
      await tamamla(kayit);
      await isListesiniDuzelt(kayit, d.satir, baglam);
      return true;
    }
    if (d.tur === 'uyusmadi') {
      if (guncelleme) {
        await reddet(kayit, isEmriDurumu(d.satir, ben));
        await isListesiniDuzelt(kayit, d.satir, baglam);
      } else {
        await cakistir(kayit);
      }
      return true;
    }
    if (d.tur === 'bilinmiyor') return true;                   // soramadık: kayıt belirsiz kalır
    // d.tur === 'yok'
    if (kayit.eskiRet) {
      await reddet(kayit, `Eski sürümde sunucu reddetmişti${kayit.sonHata ? `: ${kayit.sonHata}` : ''}.`);
      return true;
    }
    await kayitDeposu.kayitlar.update(kayit.id, { durum: 'bekliyor', neden: undefined });
    kayit = { ...kayit, durum: 'bekliyor' };
  }

  // 2) Fotoğraflar (varsa), sırayla. Yüklenen fotoğraf telefondan SİLİNMEZ, yalnızca "yüklendi" diye not
  //    edilir: asıl kayıt reddedilir ya da doğrulanamazsa kanıt telefonda kalır. Yerel kopya, kayıt sunucuda
  //    doğrulanınca silinir (tamamla).
  for (const yol of kayit.fotografYollari ?? []) {
    if (!ayniBaglamMi(baglam)) return false;
    if (kayit.yuklenenFotograflar?.includes(yol)) continue;   // önceki denemede yüklendi
    const foto = await kayitDeposu.fotograflar.get(yol);
    if (!foto) continue;                                       // eski sürümün kuralı: tepside yoksa yüklenmiş
    const y = await guvenle<YuklemeSonucu>(() => yukle(yol, foto.veri));
    if (!y.ok) {
      if (y.kalici) {
        await reddet(kayit, `Fotoğraf sunucuya kabul edilmedi: ${y.hata}`);
        return true;                                           // fotoğraf telefonda kalır, kanıt kaybolmaz
      }
      await geciciHata(kayit, y.hata);
      return false;
    }
    const yuklenenler = [...(kayit.yuklenenFotograflar ?? []), yol];
    await kayitDeposu.kayitlar.update(kayit.id, { yuklenenFotograflar: yuklenenler });
    kayit = { ...kayit, yuklenenFotograflar: yuklenenler };
  }

  // 3) Kayıt
  if (!ayniBaglamMi(baglam)) return false;
  const g = await guvenle<GonderimSonucu>(() => gonder(kayit));

  if (!g.ok) {
    if (!g.kalici) {
      await geciciHata(kayit, g.hata);
      return false;
    }
    // Kesin ret. Belki önceki bir deneme zaten yazmıştı (cevabı kaybolmuştu): sunucuya bakılır.
    const d = await dogrula(kayit, ben, sorgula);
    if (d.tur === 'eslesti') {
      await tamamla(kayit);
      await isListesiniDuzelt(kayit, d.satir, baglam);
    } else if (d.tur === 'uyusmadi' && !guncelleme) {
      await cakistir(kayit);
    } else {
      const durum = d.tur === 'uyusmadi' ? ` ${isEmriDurumu(d.satir, ben)}` : '';
      await reddet(kayit, `${g.hata}${durum}`, g.kod);
      if (d.tur === 'uyusmadi') await isListesiniDuzelt(kayit, d.satir, baglam);
    }
    return true;
  }

  // Sunucu yazdığı satırı verdiyse onunla, vermediyse sorarak eşleştir.
  const d: Dogrulama = g.satir
    ? { tur: eslestir(kayit, g.satir, ben), satir: g.satir }
    : await dogrula(kayit, ben, sorgula);

  if (d.tur === 'eslesti') {
    await tamamla(kayit);
    await isListesiniDuzelt(kayit, d.satir, baglam);
  } else if (d.tur === 'uyusmadi') {
    if (guncelleme) {
      await reddet(kayit, isEmriDurumu(d.satir, ben));
      await isListesiniDuzelt(kayit, d.satir, baglam);
    } else {
      await cakistir(kayit);
    }
  } else {
    await belirsizBirak(kayit, 'Sunucu cevap verdi ama kayıt doğrulanamadı; yeniden bakılacak.');
  }
  return true;
}

// Gönderici/yükleyici beklenmedik biçimde patlarsa postacı kilitlenmesin: geçici hata say.
async function guvenle<T extends { ok: boolean }>(is: () => Promise<T>): Promise<T | { ok: false; kalici: false; hata: string }> {
  try {
    return await is();
  } catch (hata) {
    return { ok: false, kalici: false, hata: hata instanceof Error ? hata.message : String(hata) };
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

// Postacıyı işe başlat: açılışta · internet gelince · yeni kayıt konunca · açıkken her 30 saniyede
// İş emirleri listesi ise her 60 saniyede tazelenir (teknisyen yeni işi görsün).
export function postaciyiBaslat(): () => void {
  const yolaCik = () => void mektuplariGonder();
  const paketiAl = () => void paketiIndir().catch(() => undefined);
  const isleriAl = () => void isEmirleriniIndir().catch(() => undefined);
  const teslimleriAl = () => void teslimleriIndir().catch(() => undefined);
  const listeleriAl = () => {
    isleriAl();
    teslimleriAl();
  };
  yolaCik();
  paketiAl();
  listeleriAl();

  const internetGeldi = () => {
    yolaCik();
    paketiAl();
    listeleriAl();
  };
  window.addEventListener('online', internetGeldi);
  window.addEventListener(YENI_MEKTUP_OLAYI, yolaCik);
  const sayac = window.setInterval(yolaCik, 30_000);
  const isSayaci = window.setInterval(listeleriAl, 60_000);

  return () => {
    window.removeEventListener('online', internetGeldi);
    window.removeEventListener(YENI_MEKTUP_OLAYI, yolaCik);
    window.clearInterval(sayac);
    window.clearInterval(isSayaci);
  };
}

// Ana ekran için: bu kişinin bu oteldeki / diğer otellerdeki bekleyenleri, dikkat isteyenleri, başkalarınınki
export function benimKutuOzetim(): Promise<KutuOzeti> {
  return kutuOzeti(aktifKullanici(), aktifProfil()?.otelId || null);
}
