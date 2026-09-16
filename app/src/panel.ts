// Müdür Paneli veri katmanı — Blueprint · 3.5
// Alarm saklanmaz, HESAPLANIR (002 · A.8): "gecikti mi?", "mutsuz misafir var mı?",
// "teslim onaylandığı gibi mi geldi?" — hepsi birer sorudur.
// Panel internet ister (002 · B.8); müdürün interneti vardır.
import { ortakBeyin } from './ortakBeyin';
import type { Gorev, Rol } from './kullanici';
import { teslimleriSor, uyusmazliklariAyikla, type Uyusmazlik } from './uyusmazliklar';

const MUTSUZ_PUAN = 3;                         // 1–3 → müdüre alarm (Blueprint · 3.4)
const PENCERE_SAAT = 24;                       // mutsuz misafir alarmı: son 24 saatin yorumları
const UYUSMAZLIK_GUN = 7;                      // teslimat uyuşmazlığı: para işidir, hafta sonunu atlamalı
                                               // (Cuma akşamı yazılan eksik teslim, Pazartesi hâlâ ekranda olmalı)

// Kullanıcıya gösterilebilir hata: kural mesajları (Türkçe, veritabanından) aynen; gerisi genel cümle.
export function hataMetni(hata: { code?: string; message?: string } | null | undefined): string {
  if (hata?.code === 'P0001' && hata.message) return hata.message;
  return 'Bu işlem yapılamadı.';
}

// ---------------------------------------------------------------------
// Alarmlar
// ---------------------------------------------------------------------
export interface GecikenIs {
  id: string;
  oda_no: string;
  aciklama: string;
  severity: 'urgent' | 'normal';
  due_at: string;
  assigned_to: string | null;
  kimde: string;                               // personel adı ya da "Sahipsiz"
}

export interface MutsuzMisafir {
  id: string;
  oda_no: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Alarmlar {
  gecikenler: GecikenIs[];
  mutsuzMisafirler: MutsuzMisafir[];
  uyusmazliklar: Uyusmazlik[];        // teslim onaylandığı gibi gelmedi (eksik ya da fazla)
  bekleyenOnay: number;
  acikIs: number;
}

interface IsSatiri {
  id: string;
  severity: 'urgent' | 'normal';
  due_at: string;
  assigned_to: string | null;
  rooms: { number: string } | null;
  issue_reports: { description: string } | null;
}

export async function alarmlar(otelId: string): Promise<Alarmlar> {
  const beyin = ortakBeyin();
  const simdi = new Date().toISOString();
  const pencere = new Date(Date.now() - PENCERE_SAAT * 3600_000).toISOString();
  const teslimPenceresi = new Date(Date.now() - UYUSMAZLIK_GUN * 24 * 3600_000).toISOString();

  const [acik, yorumlar, talepler, teslimler, adlar] = await Promise.all([
    beyin.from('work_orders')
      .select('id, severity, due_at, assigned_to, rooms(number), issue_reports(description)')
      .eq('hotel_id', otelId).neq('status', 'resolved').order('due_at'),
    beyin.from('guest_feedback')
      .select('id, rating, comment, created_at, rooms(number)')
      .eq('hotel_id', otelId).lte('rating', MUTSUZ_PUAN).gte('created_at', pencere).order('created_at', { ascending: false }),
    beyin.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('hotel_id', otelId).eq('status', 'pending'),
    teslimleriSor(otelId, teslimPenceresi),
    adDefteri(otelId),
  ]);
  if (acik.error) throw acik.error;
  if (yorumlar.error) throw yorumlar.error;
  if (talepler.error) throw talepler.error;

  const acikIsler = (acik.data as unknown as IsSatiri[]);
  const gecikenler = acikIsler
    .filter((i) => i.due_at < simdi)
    .map((i) => ({
      id: i.id,
      oda_no: i.rooms?.number ?? '?',
      aciklama: i.issue_reports?.description ?? 'Arıza',
      severity: i.severity,
      due_at: i.due_at,
      assigned_to: i.assigned_to,
      kimde: i.assigned_to ? adlar.get(i.assigned_to) ?? 'Personel' : 'Sahipsiz',
    }));

  const mutsuzMisafirler = (yorumlar.data as unknown as (MutsuzMisafir & { rooms: { number: string } | null })[])
    .map((y) => ({ id: y.id, oda_no: y.rooms?.number ?? '?', rating: y.rating, comment: y.comment, created_at: y.created_at }));

  // "Onaylandığı gibi geldi mi?" — cevap hesaplanır, saklanmaz.
  const uyusmazliklar = uyusmazliklariAyikla(teslimler, adlar);

  return { gecikenler, mutsuzMisafirler, uyusmazliklar, bekleyenOnay: talepler.count ?? 0, acikIs: acikIsler.length };
}

// Kullanıcı kimliği → ad (müdür otelin tüm personelini görür)
async function adDefteri(otelId: string): Promise<Map<string, string>> {
  const { data } = await ortakBeyin().from('memberships').select('user_id, name').eq('hotel_id', otelId);
  return new Map(((data ?? []) as { user_id: string; name: string }[]).map((p) => [p.user_id, p.name || 'Personel']));
}

// ---------------------------------------------------------------------
// Bekleyen onaylar (Maker-Checker)
// ---------------------------------------------------------------------
export interface Talep {
  id: string;
  hotel_id: string;
  urun: string;
  birim: string;
  quantity: number;
  note: string | null;
  created_by: string;
  talepEden: string;
  created_at: string;
}

export async function bekleyenTalepler(otelId: string): Promise<Talep[]> {
  const [talepler, adlar] = await Promise.all([
    ortakBeyin().from('purchase_requests')
      .select('id, hotel_id, quantity, note, created_by, created_at, products(name, unit)')
      .eq('hotel_id', otelId).eq('status', 'pending').order('created_at'),
    adDefteri(otelId),
  ]);
  if (talepler.error) throw talepler.error;
  type Satir = Omit<Talep, 'urun' | 'birim' | 'talepEden'> & { products: { name: string; unit: string } | null };
  return (talepler.data as unknown as Satir[]).map((t) => ({
    id: t.id,
    hotel_id: t.hotel_id,
    urun: t.products?.name ?? 'Ürün',
    birim: t.products?.unit ?? 'adet',
    quantity: t.quantity,
    note: t.note,
    created_by: t.created_by,
    talepEden: adlar.get(t.created_by) ?? 'Personel',
    created_at: t.created_at,
  }));
}

// Karar bir beyandır: kim + saat veritabanınca yazılır; talep eden kendi talebini onaylayamaz (kural).
export async function karar(talep: Talep, sonuc: 'approved' | 'rejected', adet: number): Promise<void> {
  const { error } = await ortakBeyin().from('approvals').insert({
    hotel_id: talep.hotel_id,
    purchase_request_id: talep.id,
    decision: sonuc,
    approved_quantity: sonuc === 'approved' ? adet : 0,
  });
  if (error) throw new Error(hataMetni(error));
}

// ---------------------------------------------------------------------
// Personel
// ---------------------------------------------------------------------
export interface Personel {
  id: string;
  user_id: string;
  name: string;
  role: Rol;
  job: Gorev | null;
}

export async function personelListesi(otelId: string): Promise<Personel[]> {
  const { data, error } = await ortakBeyin()
    .from('memberships').select('id, user_id, name, role, job').eq('hotel_id', otelId).order('name');
  if (error) throw error;
  return data as Personel[];
}

export interface YeniPersonel {
  hotel_id: string;
  name: string;
  email: string;
  password: string;
  role: 'staff' | 'manager';
  job: Gorev | null;
}

// Hesap açmak sunucuda olur (personel-ekle kapısı); üyelik bizim yetkimizle yazılır.
export async function personelEkle(yeni: YeniPersonel): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  const { data, error } = await ortakBeyin().functions.invoke<{ ok: boolean; mesaj?: string }>('personel-ekle', { body: yeni });
  if (error) {
    // Kapı 4xx dönünce gövdede mesaj vardır; onu göster
    const govde = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { ok: false, mesaj: (govde as { mesaj?: string } | null)?.mesaj ?? 'Bu işlem yapılamadı.' };
  }
  return data?.ok ? { ok: true } : { ok: false, mesaj: data?.mesaj ?? 'Bu işlem yapılamadı.' };
}

// Silinen satırı geri isteriz: kilide takılan bir silme hata vermez, sessizce SIFIR satır siler.
// O zaman müdür "çıkardım" sanır, kişi otelde kalır. Sessiz başarısızlık yok.
export async function personelCikar(uyelikId: string): Promise<void> {
  const { data, error } = await ortakBeyin().from('memberships').delete().eq('id', uyelikId).select('id');
  if (error) throw new Error(hataMetni(error));
  if (!data || data.length === 0) throw new Error('Bu kişiyi çıkarma yetkiniz yok.');
}

// ---------------------------------------------------------------------
// Ürünler (en fazla 8 açık ürün — kural veritabanında)
// ---------------------------------------------------------------------
export const EN_FAZLA_URUN = 8;

export interface UrunKaydi {
  id: string;
  name: string;
  unit: string;
  is_active: boolean;
}

export async function urunListesi(otelId: string): Promise<UrunKaydi[]> {
  const { data, error } = await ortakBeyin()
    .from('products').select('id, name, unit, is_active').eq('hotel_id', otelId).order('name');
  if (error) throw error;
  return data as UrunKaydi[];
}

export async function urunEkle(otelId: string, name: string, unit: string): Promise<void> {
  const { error } = await ortakBeyin().from('products').insert({ hotel_id: otelId, name: name.trim(), unit: unit.trim() || 'adet' });
  if (error) throw new Error(hataMetni(error));
}

export async function urunKapatAc(id: string, acik: boolean): Promise<void> {
  const { error } = await ortakBeyin().from('products').update({ is_active: acik }).eq('id', id);
  if (error) throw new Error(hataMetni(error));
}

// ---------------------------------------------------------------------
// Şifre yenileme (Genel Müdür talebi, Aşama 19.1)
// Mail linki yok: müdür yeni şifreyi yazar ve kişiye kendisi söyler. Beş saniyelik iş.
// Yetki kuralı sunucudadır (sifre-guncelle kapısı):
//   sahip → müdür + görevli · müdür → yalnızca görevli · kimse kendi şifresini buradan değiştiremez
//   ve iki otelde çalışan kişinin şifresine hiç dokunulmaz.
// ---------------------------------------------------------------------
export const EN_KISA_SIFRE = 8;

export function sifreGecerliMi(sifre: string): boolean {
  return sifre.length >= EN_KISA_SIFRE && sifre.length <= 128;
}

// Müdürün telefonda okuyabileceği kadar kolay bir öneri: "kule-zeytin-4821".
// Türkçe harf yoktur: personel hangi klavyeyle yazarsa yazsın aynı tuşlara basar.
//
// Neden İKİ kelime? Bu şifre kalıcıdır (personelin kendi şifresini değiştirme yolu henüz yok),
// üstelik kelime listesi herkesin tarayıcısında durur. Tek kelime + dört rakam yalnızca
// 90 bin ihtimal ederdi; sabırlı biri deneye deneye bulurdu. İki ayrı kelime bunu 20 milyona çıkarır.
const SIFRE_KELIMELERI = [
  'kule', 'deniz', 'kaya', 'ceviz', 'fener', 'zeytin', 'bulut', 'pamuk',
  'limon', 'kiraz', 'badem', 'marul', 'biber', 'elma', 'armut', 'kavun',
  'karpuz', 'domates', 'salata', 'ekmek', 'peynir', 'bardak', 'tabak', 'havlu',
  'yastik', 'perde', 'lamba', 'pencere', 'balkon', 'teras', 'bahce', 'cicek',
  'orman', 'nehir', 'dalga', 'kumsal', 'midye', 'levrek', 'palmiye', 'portakal',
  'mandalina', 'kestane', 'defne', 'lale', 'menekse', 'papatya', 'sardunya', 'karanfil',
];

export function sifreOner(): string {
  const rastgele = new Uint32Array(3);
  crypto.getRandomValues(rastgele);
  const kac = SIFRE_KELIMELERI.length;
  const birinci = rastgele[0]! % kac;
  const ikinci = (birinci + 1 + (rastgele[1]! % (kac - 1))) % kac;   // iki kelime hep farklı
  const sayi = 1000 + (rastgele[2]! % 9000);                          // dört basamak: kısa şifre çıkmaz
  return `${SIFRE_KELIMELERI[birinci]}-${SIFRE_KELIMELERI[ikinci]}-${sayi}`;
}

export async function sifreGuncelle(
  otelId: string,
  userId: string,
  yeniSifre: string,
): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  const { data, error } = await ortakBeyin().functions.invoke<{ ok: boolean; mesaj?: string }>('sifre-guncelle', {
    body: { hotel_id: otelId, user_id: userId, password: yeniSifre },
  });
  if (error) {
    // Kapı 4xx dönünce gövdede Türkçe mesaj vardır; onu göster
    const govde = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { ok: false, mesaj: (govde as { mesaj?: string } | null)?.mesaj ?? 'Bu işlem yapılamadı.' };
  }
  return data?.ok ? { ok: true } : { ok: false, mesaj: data?.mesaj ?? 'Bu işlem yapılamadı.' };
}
