// Teslim uyuşmazlığı — "onaylandığı gibi gelmedi" (Blueprint · 3.3, Aşama 17.1)
//
// Zincirin üç halkasında üç sayı vardır: istenen · onaylanan · gelen.
// Gelen, onaylanandan farklıysa ortada para vardır ve müdür bunu DERHAL bilmelidir:
//   * gelen < onaylanan → eksik/çürük geldi, yanında kanıt fotoğrafı durur.
//   * gelen > onaylanan → onaylanmayan mal girmiş, fatura fazla gelecek.
// Bu yüzden uyuşmazlık, müdür panelinde kırmızı alarmdır (çan da çalar).
//
// Alarm veritabanında SAKLANMAZ, hesaplanır (002 · A.8): "uyuşuyor mu?" bir sorudur.
import { ortakBeyin } from './ortakBeyin';
import { miktarMetni, yuvarla } from './miktar';

export interface Uyusmazlik {
  id: string;
  urun: string;
  birim: string;
  istenen: number;              // personelin istediği
  onaylanan: number;            // müdürün onayladığı
  gelen: number;                // depoya gerçekte gelen
  kanitYolu: string | null;     // eksik/hasar fotoğrafı (varsa)
  kimAldi: string;              // teslim alan kişinin adı
  ne_zaman: string;
}

// Sunucudan inen satırın biçimi (teslim → talep → ürün ve onay)
export interface TeslimSatiri {
  id: string;
  received_quantity: number;
  damage_photo_path: string | null;
  received_at: string;
  received_by: string;
  purchase_requests: {
    quantity: number;
    products: { name: string; unit: string } | null;
    approvals: { approved_quantity: number }[] | { approved_quantity: number } | null;
  } | null;
}

// Son 24 saatin teslimleri (müdür hepsini görür; kilit kuralı: manager/owner).
export async function teslimleriSor(otelId: string, pencere: string): Promise<TeslimSatiri[]> {
  const { data, error } = await ortakBeyin()
    .from('deliveries')
    .select(
      'id, received_quantity, damage_photo_path, received_at, received_by, ' +
        'purchase_requests(quantity, products(name, unit), approvals(approved_quantity))',
    )
    .eq('hotel_id', otelId)
    .gte('received_at', pencere)
    .order('received_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TeslimSatiri[];
}

// Uyuşan teslimler elenir; geriye yalnızca müdürün bakması gerekenler kalır.
// Talebi okunamayan satır da elenir: eksik veriden alarm üretilmez, müdür boşa koşturulmaz.
export function uyusmazliklariAyikla(satirlar: TeslimSatiri[], adlar: Map<string, string>): Uyusmazlik[] {
  return satirlar
    .filter((satir) => Boolean(satir.purchase_requests))
    .map((satir) => {
      const talep = satir.purchase_requests;
      const onay = Array.isArray(talep?.approvals) ? talep?.approvals[0] : talep?.approvals;
      const onaylanan = onay?.approved_quantity ?? talep?.quantity ?? 0;
      return {
        id: satir.id,
        urun: talep?.products?.name ?? 'Ürün',
        birim: talep?.products?.unit ?? '',
        istenen: talep?.quantity ?? onaylanan,
        onaylanan,
        gelen: satir.received_quantity,
        kanitYolu: satir.damage_photo_path,
        kimAldi: adlar.get(satir.received_by) ?? 'Personel',
        ne_zaman: satir.received_at,
      };
    })
    .filter((u) => yuvarla(u.gelen) !== yuvarla(u.onaylanan));   // iki ondalıktan küçük fark alarm değildir
}

// "3 Kg eksik geldi" · "2 Kg fazla geldi" — müdür tek bakışta ne olduğunu anlar.
export function uyusmazlikMetni(u: Uyusmazlik): string {
  const fark = Math.abs(u.onaylanan - u.gelen);
  return `${miktarMetni(fark, u.birim)} ${u.gelen < u.onaylanan ? 'eksik' : 'fazla'} geldi`;
}

// Kanıt fotoğrafı kilitli depodadır: müdüre kısa süreli (5 dakika), kendine özel bir adres verilir.
// Adres üretilemezse (yetki yok, fotoğraf yok, internet yok) null döner; ekran bunu açıkça söyler.
export async function kanitAdresi(yol: string): Promise<string | null> {
  const { data } = await ortakBeyin().storage.from('photos').createSignedUrl(yol, 300);
  return data?.signedUrl ?? null;
}
