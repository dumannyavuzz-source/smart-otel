// YALNIZCA TESTLER İÇİN — uygulama bu dosyayı kullanmaz.
// Ortak Beyin'in bu aşamada önemli olan davranışlarını bellekte taklit eder:
//   * Beyan: aynı kimlik zaten varsa yok sayar ve satır DÖNMEZ (upsert + ignoreDuplicates + select).
//   * İmzayı (created_by / received_by) karttaki kişiden yazar — telefonun sözünden değil.
//   * İş emri: Kural 5'in özü — çözülmüş iş değişmez, başkasındaki iş alınamaz, yalnızca atanan çözer.
//   * Fotoğraf deposu: aynı yol ikinci kez gelirse "zaten var" (409) → başarı.
import type { Kayit } from '../kayitDeposu';
import type { Gonderici, Sorgulayici, SunucuSatiri, Yukleyici } from '../postaci';
import { aktifKullanici } from '../kullanici';

export interface SahteSunucu {
  satirlar: Map<string, SunucuSatiri>;          // tablo:id → satır
  fotograflar: Set<string>;
  olaylar: string[];                            // "kayit:<id>" · "foto:<yol>" · "sorgu:<id>"
  bagli: boolean;
  kabloyuCekSonra: number;                      // bu kadar başarılı çağrıdan sonra bağlantı kopar
  cagri: number;
  // Kesin ret uydurmak için: dönerse o hata verilir
  reddet?: (kayit: Kayit) => { hata: string; kod?: string } | undefined;
  fotoReddet?: (yol: string) => string | undefined;
  // Sunucu yazar ama cevap telefona ulaşmaz (bağlantı cevapta koptu)
  cevabiKaybet?: (kayit: Kayit) => boolean;
  // Sunucu yazar ama satırı geri göndermez
  satirVermez?: (kayit: Kayit) => boolean;
  // Her gönderimden hemen önce (bağlam değişimini taklit etmek için)
  gonderimdenOnce?: (kayit: Kayit) => void | Promise<void>;
  gonder: Gonderici;
  yukle: Yukleyici;
  sorgula: Sorgulayici;
}

const anahtar = (tablo: string, id: unknown) => `${tablo}:${String(id)}`;

export function sahteSunucu(): SahteSunucu {
  const s: SahteSunucu = {
    satirlar: new Map(),
    fotograflar: new Set(),
    olaylar: [],
    bagli: true,
    kabloyuCekSonra: Infinity,
    cagri: 0,
    gonder: async () => ({ ok: false, kalici: false, hata: 'kurulmadı' }),
    yukle: async () => ({ ok: false, kalici: false, hata: 'kurulmadı' }),
    sorgula: async () => ({ ok: false, hata: 'kurulmadı' }),
  };

  const kopukMu = () => {
    if (!s.bagli) return true;
    if (s.cagri >= s.kabloyuCekSonra) {
      s.bagli = false;
      return true;
    }
    s.cagri++;
    return false;
  };

  const yaz = (kayit: Kayit): { satir: SunucuSatiri | null } | { hata: string; kod?: string } => {
    const ben = aktifKullanici();
    if (!ben) return { hata: 'Bu işlem için giriş gerekli.', kod: 'P0001' };
    const zorla = s.reddet?.(kayit);
    if (zorla) return zorla;

    if (kayit.islem === 'guncelle') {
      const k = anahtar(kayit.tablo, kayit.kosul?.id);
      const satir = s.satirlar.get(k);
      if (!satir) return { satir: null };                       // koşula uyan satır yok / görünmüyor
      if (satir.status === 'resolved') return { hata: 'Çözülmüş iş emri değiştirilemez.', kod: 'P0001' };
      const yeni = { ...satir };
      if ('assigned_to' in kayit.icerik && kayit.icerik.assigned_to !== satir.assigned_to) {
        if (satir.assigned_to !== null || kayit.icerik.assigned_to !== ben) {
          return { hata: 'Bu iş emrinde bu değişikliği yapma yetkiniz yok.', kod: 'P0001' };
        }
        yeni.assigned_to = ben;
      }
      if (kayit.icerik.status === 'resolved') {
        if (satir.assigned_to !== ben) return { hata: 'Yalnızca size atanmış iş emrini çözebilirsiniz.', kod: 'P0001' };
        yeni.status = 'resolved';
        yeni.resolved_by = ben;
        if ('resolved_photo_path' in kayit.icerik) yeni.resolved_photo_path = kayit.icerik.resolved_photo_path;
      } else if (kayit.icerik.status) {
        yeni.status = kayit.icerik.status;
      }
      s.satirlar.set(k, yeni);
      return { satir: yeni };
    }

    const k = anahtar(kayit.tablo, kayit.icerik.id);
    if (s.satirlar.has(k)) return { satir: null };              // aynı kimlik: yok sayıldı, satır dönmez
    const imza = kayit.tablo === 'deliveries' ? 'received_by' : 'created_by';
    const satir: SunucuSatiri = { ...kayit.icerik, [imza]: ben };
    s.satirlar.set(k, satir);
    return { satir };
  };

  s.gonder = async (kayit) => {
    await s.gonderimdenOnce?.(kayit);
    if (kopukMu()) return { ok: false, kalici: false, hata: 'Failed to fetch' };
    const sonuc = yaz(kayit);
    if ('hata' in sonuc) return { ok: false, kalici: true, hata: sonuc.hata, ...(sonuc.kod ? { kod: sonuc.kod } : {}) };
    s.olaylar.push(`kayit:${kayit.id}`);
    if (s.cevabiKaybet?.(kayit)) return { ok: false, kalici: false, hata: 'Failed to fetch' };
    if (s.satirVermez?.(kayit)) return { ok: true, satir: null };
    return { ok: true, satir: sonuc.satir };
  };

  s.yukle = async (yol) => {
    if (kopukMu()) return { ok: false, kalici: false, hata: 'Failed to fetch' };
    const ret = s.fotoReddet?.(yol);
    if (ret) return { ok: false, kalici: true, hata: ret };
    if (s.fotograflar.has(yol)) return { ok: true };             // 409 "zaten var" → başarı
    s.fotograflar.add(yol);
    s.olaylar.push(`foto:${yol}`);
    return { ok: true };
  };

  s.sorgula = async (kayit) => {
    if (!s.bagli) return { ok: false, hata: 'Failed to fetch' };
    const id = kayit.islem === 'guncelle' ? kayit.kosul?.id : kayit.id;
    s.olaylar.push(`sorgu:${String(id)}`);
    return { ok: true, satir: s.satirlar.get(anahtar(kayit.tablo, id)) ?? null };
  };

  return s;
}

// Sunucuda hazır bir iş emri satırı
export function isEmriSatiri(id: string, ek: Partial<SunucuSatiri> = {}): SunucuSatiri {
  return { id, hotel_id: 'otel-1', assigned_to: null, status: 'open', resolved_by: null, resolved_photo_path: null, ...ek };
}

export function satirEkle(s: SahteSunucu, tablo: string, satir: SunucuSatiri): void {
  s.satirlar.set(anahtar(tablo, satir.id), satir);
}

export function satirAl(s: SahteSunucu, tablo: string, id: string): SunucuSatiri | undefined {
  return s.satirlar.get(anahtar(tablo, id));
}

export function tablodakiSatirSayisi(s: SahteSunucu, tablo: string): number {
  return [...s.satirlar.keys()].filter((k) => k.startsWith(`${tablo}:`)).length;
}
