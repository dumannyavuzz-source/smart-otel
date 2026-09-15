// Şu an giriş yapmış kişi (kimlik). Oturum yüklenince ayarlanır.
// Beyanlar bu kimlikle etiketlenir; postacı yalnızca bu kişinin mektuplarını gönderir.
// Böylece ortak telefonda Ayşe'nin beyanı Mehmet'in imzasıyla gitmez (security · 2.8).
let aktifId: string | null = null;

export function aktifKullanici(): string | null {
  return aktifId;
}

export function aktifKullaniciyiAyarla(id: string | null): void {
  aktifId = id;
}
