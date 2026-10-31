// YALNIZCA TESTLER İÇİN — uygulama bu dosyayı kullanmaz.
// Eski uygulama sürümünü (bu aşamadan önceki kod) aynı telefonda AYRI BİR SEKME gibi taklit eder:
//   * "smartotel" veritabanına kendi bağlantısıyla, eski şemayla (sürüm 5) bağlanır.
//   * Eski gönderim kurallarını aynen uygular — özellikle: reddedilen "Aldım/Çözdüm"ü SİLER,
//     yüklediği fotoğrafı tepsiden siler, gönderdiği mektubu siler.
//   * Yeni sürümün kilidini (navigator.locks) hiç tanımaz.
// Kaynak: git'teki eski app/src/postaci.ts ve app/src/beyanlar.ts (karar 028 öncesi).
import Dexie, { type EntityTable } from 'dexie';
import type { Fotograf, Mektup } from '../telefonDeposu';

export type EskiGonderimSonucu = { ok: true } | { ok: false; kalici: boolean; hata: string };
export type EskiGonderici = (mektup: Mektup) => Promise<EskiGonderimSonucu>;
export type EskiYukleyici = (yol: string, veri: Blob) => Promise<EskiGonderimSonucu>;

export class EskiSurumSekmesi extends Dexie {
  gidenKutusu!: EntityTable<Mektup, 'id'>;
  fotograflar!: EntityTable<Fotograf, 'yol'>;

  constructor() {
    super('smartotel');
    // Eski sürümün şeması — birebir (sürüm 1–5). Yeni sürüm bu numarayı yükseltirse bu sekme açılamaz.
    this.version(1).stores({
      odalar: 'id, staff_code, hotel_id',
      kontrolListeleri: 'id, hotel_id',
      urunler: 'id, hotel_id',
      gidenKutusu: 'id, olusturuldu',
    });
    this.version(2).stores({ fotograflar: 'yol' });
    this.version(3).stores({ gidenKutusu: 'id, sira' });
    this.version(4).stores({ isEmirleri: 'id, hotel_id, due_at' });
    this.version(5).stores({ teslimler: 'id, hotel_id, created_at' });
  }

  // Eski gidenKutusunaKoy'un aynısı: mektup + fotoğraflar tek işlemde, eski kutuya
  async mektupYaz(
    yazanId: string,
    tablo: Mektup['tablo'],
    icerik: Record<string, unknown>,
    ek: { id?: string; fotograflar?: { veri: Blob; yol: string }[]; islem?: 'guncelle'; kosul?: Record<string, unknown> } = {},
  ): Promise<string> {
    const id = ek.id ?? crypto.randomUUID();
    const simdi = new Date().toISOString();
    const beyan = ek.islem !== 'guncelle';
    const fotograflar = ek.fotograflar ?? [];
    await this.transaction('rw', [this.gidenKutusu, this.fotograflar], async () => {
      for (const foto of fotograflar) {
        await this.fotograflar.add({ yol: foto.yol, veri: foto.veri, olusturuldu: simdi });
      }
      const son = await this.gidenKutusu.orderBy('sira').last();
      await this.gidenKutusu.add({
        id,
        sira: (son?.sira ?? 0) + 1,
        yazanId,
        tablo,
        icerik: beyan ? { id, created_at_device: simdi, ...icerik } : icerik,
        ...(ek.islem ? { islem: ek.islem } : {}),
        ...(ek.kosul ? { kosul: ek.kosul } : {}),
        olusturuldu: simdi,
        deneme: 0,
        ...(fotograflar.length > 0 ? { fotografYollari: fotograflar.map((f) => f.yol) } : {}),
      });
    });
    return id;
  }

  // Eski postacının TEK mektup için yaptığı (sırayı testte biz belirleriz — iki sekmenin araya girmesi için)
  async mektubuGonder(id: string, gonder: EskiGonderici, yukle: EskiYukleyici): Promise<'gitti' | 'silindi' | 'kaldi' | 'yok'> {
    const mektup = await this.gidenKutusu.get(id);
    if (!mektup) return 'yok';
    for (const yol of mektup.fotografYollari ?? (mektup.fotografYolu ? [mektup.fotografYolu] : [])) {
      const foto = await this.fotograflar.get(yol);
      if (!foto) continue;                                       // eski kural: tepside yoksa yüklenmiş say
      const y = await yukle(foto.yol, foto.veri);
      if (!y.ok) {
        await this.gidenKutusu.update(id, { deneme: mektup.deneme + 1, sonHata: y.hata, kalici: y.kalici });
        return 'kaldi';
      }
      await this.fotograflar.delete(foto.yol);
    }
    const sonuc = await gonder(mektup);
    if (sonuc.ok) {
      await this.gidenKutusu.delete(id);
      return 'gitti';
    }
    if (sonuc.kalici && mektup.islem === 'guncelle') {
      await this.gidenKutusu.delete(id);                         // eski sürümün kayıp noktası
      return 'silindi';
    }
    await this.gidenKutusu.update(id, { deneme: mektup.deneme + 1, sonHata: sonuc.hata, kalici: sonuc.kalici });
    return 'kaldi';
  }

  async hepsiniGonder(yazanId: string, gonder: EskiGonderici, yukle: EskiYukleyici): Promise<void> {
    const mektuplar = (await this.gidenKutusu.orderBy('sira').toArray()).filter((m) => m.yazanId === yazanId);
    for (const m of mektuplar) {
      const r = await this.mektubuGonder(m.id, gonder, yukle);
      if (r === 'kaldi') break;
    }
  }
}

// Yeni sürümün sahte sunucusunu eski sürümün diline çevirir (eski gönderici satır beklemez)
export function eskiDile(
  gonder: (kayit: never) => Promise<{ ok: true } | { ok: false; kalici: boolean; hata: string }>,
): EskiGonderici {
  return async (mektup) => {
    const kayit = { ...mektup, otelId: null, ozet: '', durum: 'bekliyor' } as never;
    const r = await gonder(kayit);
    return r.ok ? { ok: true } : { ok: false, kalici: r.kalici, hata: r.hata };
  };
}
