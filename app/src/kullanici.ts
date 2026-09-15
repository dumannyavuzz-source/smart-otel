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

export function aktifKullanici(): string | null {
  return aktif?.id ?? null;
}

export function aktifProfil(): Profil | null {
  return aktif;
}

export function yoneticiMi(profil: Profil | null = aktif): boolean {
  return profil?.rol === 'manager' || profil?.rol === 'owner';
}

export function aktifProfiliAyarla(profil: Profil | null): void {
  aktif = profil;
}

// Yalnızca kimlik bilinen durumlar (testler, oturum yüklenirken)
export function aktifKullaniciyiAyarla(id: string | null): void {
  aktif = id ? { id, ad: '', otelId: '', otelAdi: '', rol: 'staff', gorev: null } : null;
}
