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
import { gidenKutusunaKoy } from './beyanlar';
import { aktifKullanici, aktifProfil } from './kullanici';
import { ortakBeyin } from './ortakBeyin';
import { PAKET_OLAYI, cevrimici, haberVer } from './olaylar';

const EN_UZUN_NOT = 500;
const EN_FAZLA_MIKTAR = 999;

// Soru ürünün birimiyle sorulur: "Kaç Kg geldi?" · "Kaç Litre geldi?" · "Kaç adet geldi?"
export function birimSorusu(birim: string): string {
  return `Kaç ${birimAdi(birim)} geldi?`;
}

export function birimAdi(birim: string): string {
  return birim.trim() || 'adet';
}

// "10 Kg" gibi: sayı ve birim hep yan yana yazılır, çıplak sayı bırakılmaz.
export function miktarMetni(miktar: number, birim: string): string {
  return `${miktar} ${birimAdi(birim)}`;
}

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
): Promise<void> {
  if (gelen < 0 || gelen > EN_FAZLA_MIKTAR) throw new Error('Miktar hatalı.');
  if (hasarFotografiGerekli(gelen, teslimat.onaylanan) && !hasar) {
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
      received_quantity: gelen,
      invoice_photo_path: faturaYolu,
      ...(hasar ? { damage_photo_path: hasarYolu } : {}),
      ...(temizNot ? { note: temizNot } : {}),
    },
    {
      id,
      fotograflar: [
        { veri: fatura, yol: faturaYolu },
        ...(hasar ? [{ veri: hasar, yol: hasarYolu }] : []),
      ],
    },
  );

  await telefonDeposu.teslimler.delete(teslimat.id);   // liste anında kısalır; aynı sipariş iki kez alınmaz
  haberVer(PAKET_OLAYI);
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
export async function teslimleriIndir(): Promise<void> {
  const otelId = aktifProfil()?.otelId;
  if (!cevrimici() || !otelId) return;
  const { data, error } = await ortakBeyin()
    .from('purchase_requests')
    .select('id, hotel_id, quantity, created_by, created_at, products(name, unit), approvals(approved_quantity, created_by)')
    .eq('hotel_id', otelId)
    .eq('status', 'approved');
  if (error || !data) return;

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

  await telefonDeposu.transaction('rw', [telefonDeposu.teslimler, telefonDeposu.gidenKutusu], async () => {
    await telefonDeposu.teslimler.clear();
    await telefonDeposu.teslimler.bulkPut(teslimler);
    await gonderilmemisTeslimleriDus();
  });
  haberVer(PAKET_OLAYI);
}

// Bodrumda yazılmış ama henüz gönderilmemiş teslimler listeden düşer:
// sunucudan inen eski liste, depoda yapılmış işi geri getirmesin.
async function gonderilmemisTeslimleriDus(): Promise<void> {
  const mektuplar = await telefonDeposu.gidenKutusu.toArray();
  for (const mektup of mektuplar) {
    if (mektup.tablo !== 'deliveries') continue;
    const talepId = mektup.icerik.purchase_request_id;
    if (typeof talepId === 'string') await telefonDeposu.teslimler.delete(talepId);
  }
}
