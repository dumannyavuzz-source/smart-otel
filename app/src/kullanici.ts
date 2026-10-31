// Şu an giriş yapmış kişi: kimliği, adı, oteli, rolü, görevi. Oturum yüklenince ayarlanır.
// Beyanlar bu kimlikle etiketlenir; postacı yalnızca bu kişinin mektuplarını gönderir.
// Böylece ortak telefonda Ayşe'nin beyanı Mehmet'in imzasıyla gitmez (security · 2.8).
export type Rol = 'staff' | 'manager' | 'owner';
export type Gorev = 'housekeeping' | 'technician' | 'warehouse';

export interface Profil {
  id: string;
  ad: string;
  otelId: string;
  otelAdi: string;
  rol: Rol;
  gorev: Gorev | null;      // görevlide var, müdürde yok
  demoBitis: string | null;  // demo bitiş anı — bilinmiyorsa null (kimse bilinmezlik yüzünden kilitlenmez)
}

export const GOREV_ADI: Record<Gorev, string> = {
  housekeeping: 'Kat Görevlisi',
  technician: 'Teknisyen',
  warehouse: 'Depo',
};

export const ROL_ADI: Record<Rol, string> = {
  staff: 'Görevli',
  manager: 'Müdür',
  owner: 'Sahip',
};

let aktif: Profil | null = null;
// Bağlam sürümü: kişi ya da otel her değiştiğinde bir artar. Uzun süren bir iş (gönderim) başlarken
// sürümü not eder; arada değiştiyse durur — eski kişinin işi yeni kişinin ekranına taşınmaz.
let surum = 0;

export function aktifKullanici(): string | null {
  return aktif?.id ?? null;
}

export function aktifProfil(): Profil | null {
  return aktif;
}

// Kim, hangi otelde, hangi sürümde? Yalnızca karşılaştırmak için.
export interface Baglam {
  kullanici: string | null;
  otel: string | null;
  surum: number;
}

export function aktifBaglam(): Baglam {
  return { kullanici: aktif?.id ?? null, otel: aktif?.otelId || null, surum };
}

export function ayniBaglamMi(a: Baglam, b: Baglam = aktifBaglam()): boolean {
  return a.kullanici === b.kullanici && a.otel === b.otel && a.surum === b.surum;
}

export function yoneticiMi(profil: Profil | null = aktif): boolean {
  return profil?.rol === 'manager' || profil?.rol === 'owner';
}

export function aktifProfiliAyarla(profil: Profil | null): void {
  // Aynı kişi aynı otelde yeniden yüklenirse (oturum tazelendi) bağlam değişmiş sayılmaz.
  if (aktif?.id !== profil?.id || aktif?.otelId !== profil?.otelId) surum++;
  aktif = profil;
}

// Yalnızca kimlik bilinen durumlar (testler, oturum yüklenirken)
export function aktifKullaniciyiAyarla(id: string | null, otelId = ''): void {
  aktifProfiliAyarla(id ? { id, ad: '', otelId, otelAdi: '', rol: 'staff', gorev: null, demoBitis: null } : null);
}
