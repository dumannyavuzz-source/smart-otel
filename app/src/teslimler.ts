// Depo ve teslimat — Blueprint · 3.3 (Maker-Checker'ın son halkası)
//   1. Maker   : personel "Eksik Var" der           → talep
//   2. Checker : müdür onaylar, kaç tane onayladığı kayda geçer
//   3. Beyan   : DEPO GÖREVLİSİ ürün gelince teslim alır → burası
//
// Üç kural ekranda değil, VERİTABANINDA durur; ekran yalnızca aynı şeyi söyler:
//   * Teslim alan ≠ talep eden ve ≠ onaylayan (imza üç ayrı kişinin olmalı).
//   * Fatura fotoğrafı yüklenmeden teslim yazılamaz.
//   * Gelen miktar onaylanandan azsa eksik/hasar fotoğrafı da gerekir (çürük domatesin kanıtı).
//
// Offline: liste telefona iner, teslim önce telefona yazılır, fotoğraflar tepside bekler.
// Postacı internet gelince önce fotoğrafları, sonra kaydı gönderir (eksi kattaki depo için).
import { telefonDeposu, type Teslimat } from './telefonDeposu';
import { KUYRUK_DURUMLARI, kayitDeposu } from './kayitDeposu';
import { gidenKutusunaKoy } from './beyanlar';
import { aktifBaglam, aktifKullanici, aktifProfil, ayniBaglamMi } from './kullanici';
import { ortakBeyin } from './ortakBeyin';
import { kimlikliKart } from './kimlik';
import { PAKET_OLAYI, cevrimici, haberVer } from './olaylar';
import { birimAdi, miktarMetni, yuvarla } from './miktar';

const EN_UZUN_NOT = 500;
const EN_FAZLA_MIKTAR = 999;

// Gelen, onaylanandan az mı? O zaman kanıt gerekir.
export function hasarFotografiGerekli(gelen: number, onaylanan: number): boolean {
  return gelen < onaylanan;
}

// "3 Kg eksik geldi" — depo görevlisi neyi fotoğraflayacağını bilsin
export function eksikMetni(gelen: number, teslimat: Teslimat): string {
  return `${miktarMetni(teslimat.onaylanan - gelen, teslimat.birim)} eksik geldi`;
}

// Talep eden de onaylayan da kendi siparişini teslim alamaz (veritabanı da reddeder).
export function teslimAlabilirMi(teslimat: Teslimat, benimId: string | null = aktifKullanici()): boolean {
  return benimId !== null && teslimat.talepEdenId !== benimId && teslimat.onaylayanId !== benimId;
}

// Telefondaki, benim teslim alabileceğim siparişler — en eski sipariş en üstte
export async function teslimBekleyenler(): Promise<Teslimat[]> {
  const hepsi = await telefonDeposu.teslimler.toArray();
  return hepsi
    .filter((teslimat) => teslimAlabilirMi(teslimat))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

export function teslimatGetir(id: string): Promise<Teslimat | undefined> {
  return telefonDeposu.teslimler.get(id);
}

// "Teslim Aldım": bir imzadır. Kim ve saat kaçta — onu veritabanı yazar (security · 2.8).
export async function teslimAldim(
  teslimat: Teslimat,
  gelen: number,
  fatura: Blob,
  hasar: Blob | null,
  not = '',
): Promise<string> {
  const temizGelen = yuvarla(gelen);            // "7,456 Kg" diye bir şey yok: en çok iki ondalık
  if (!Number.isFinite(temizGelen) || temizGelen < 0 || temizGelen > EN_FAZLA_MIKTAR) {
    throw new Error('Miktar hatalı.');
  }
  if (hasarFotografiGerekli(temizGelen, teslimat.onaylanan) && !hasar) {
    throw new Error('Eksik teslimde eksik/hasar fotoğrafı da gerekir.');
  }

  const id = crypto.randomUUID();
  const faturaYolu = `${teslimat.hotel_id}/deliveries/${id}-fatura.jpg`;   // yol otelin klasörüyle başlar
  const hasarYolu = `${teslimat.hotel_id}/deliveries/${id}-hasar.jpg`;
  const temizNot = not.trim().slice(0, EN_UZUN_NOT);

  await gidenKutusunaKoy(
    'deliveries',
    {
      hotel_id: teslimat.hotel_id,
      purchase_request_id: teslimat.id,
      received_quantity: temizGelen,
      invoice_photo_path: faturaYolu,
      ...(hasar ? { damage_photo_path: hasarYolu } : {}),
      ...(temizNot ? { note: temizNot } : {}),
    },
    {
      id,
      ozet: `Teslim · ${miktarMetni(temizGelen, teslimat.birim)} ${teslimat.urun}`,
      fotograflar: [
        { veri: fatura, yol: faturaYolu },
        ...(hasar ? [{ veri: hasar, yol: hasarYolu }] : []),
      ],
    },
  );

  await telefonDeposu.teslimler.delete(teslimat.id);   // liste anında kısalır; aynı sipariş iki kez alınmaz
  haberVer(PAKET_OLAYI);
  return id;
}

interface SunucuTalebi {
  id: string;
  hotel_id: string;
  quantity: number;
  created_by: string;
  created_at: string;
  products: { name: string; unit: string } | null;
  approvals: { approved_quantity: number; created_by: string }[] | { approved_quantity: number; created_by: string } | null;
}

// Onaylanmış ama henüz teslim alınmamış siparişleri telefona indir (internet varken).
// Yalnızca çalışılan otelin siparişleri: zincir sahibi iki otelin listesini bir arada görmesin.
// Karar 029: kart yoksa liste hiç sorulmaz ve telefondaki liste SİLİNMEZ. Cevap yoldayken kişi ya da otel
// değiştiyse (zincir sahibi otel değiştirdi) ya da daha yeni bir indirme başladıysa son yazma anında reddedilir.
let indirmeSirasi = 0;
export async function teslimleriIndir(): Promise<void> {
  const baglam = aktifBaglam();
  const otelId = baglam.otel;
  if (!cevrimici() || !otelId) return;
  const kart = await kimlikliKart(baglam.kullanici);
  if (!kart) return;
  const benimSiram = ++indirmeSirasi;
  const { data, error } = await ortakBeyin()
    .from('purchase_requests')
    .select('id, hotel_id, quantity, created_by, created_at, products(name, unit), approvals(approved_quantity, created_by)')
    .eq('hotel_id', otelId)
    .eq('status', 'approved')
    .setHeader('Authorization', kart.yetki);
  if (error || !Array.isArray(data)) return;

  const teslimler: Teslimat[] = (data as unknown as SunucuTalebi[]).map((talep) => {
    const onay = Array.isArray(talep.approvals) ? talep.approvals[0] : talep.approvals;
    return {
      id: talep.id,
      hotel_id: talep.hotel_id,
      urun: talep.products?.name ?? 'Ürün',
      birim: birimAdi(talep.products?.unit ?? ''),
      istenen: talep.quantity,
      onaylanan: onay?.approved_quantity ?? talep.quantity,
      talepEdenId: talep.created_by,
      onaylayanId: onay?.created_by ?? '',
      created_at: talep.created_at,
    };
  });

  // Kayıt kutusu ayrı bir veritabanı: gönderilmemiş teslimler işlemden önce okunur.
  const gonderilmemis = await gonderilmemisTalepler();
  let yazildi = false;
  await telefonDeposu.transaction('rw', [telefonDeposu.teslimler], async () => {
    if (!ayniBaglamMi(baglam) || benimSiram !== indirmeSirasi) return;   // son yazma anı denetimi
    await telefonDeposu.teslimler.clear();
    await telefonDeposu.teslimler.bulkPut(teslimler.filter((t) => !gonderilmemis.has(t.id)));
    yazildi = true;
  });
  if (yazildi) haberVer(PAKET_OLAYI);
}

// Bodrumda yazılmış ama henüz sunucuda doğrulanmamış teslimler listeden düşer:
// sunucudan inen eski liste, depoda yapılmış işi geri getirmesin. Eski sürümün kutusunda taşınmayı
// bekleyenler de sayılır. Reddedilen teslim düşmez: sipariş listede yeniden görünür.
async function gonderilmemisTalepler(): Promise<Set<string>> {
  const yeni = await kayitDeposu.kayitlar.where('durum').anyOf(KUYRUK_DURUMLARI).toArray();
  const eski = await telefonDeposu.gidenKutusu.toArray();
  const talepler = new Set<string>();
  for (const kayit of [...yeni, ...eski]) {
    const talepId = kayit.icerik.purchase_request_id;
    if (kayit.tablo === 'deliveries' && typeof talepId === 'string') talepler.add(talepId);
  }
  return talepler;
}
