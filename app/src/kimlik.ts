// Kimlikli sorgu (karar 029): personel verisi yalnızca GEÇERLİ kullanıcı kartıyla sorulur.
//
// Neden? Supabase istemcisi oturumu bulamazsa (ör. kart yenilenemedi ve kütüphane kısa bir süre yeniden
// denemiyor) sorguyu herkese açık anahtarla gönderir. Sunucu kimliksiz soruya kural gereği BOŞ liste verir;
// bu boş liste "bu kişinin oteli / odası / işi yok" sanılırsa telefondaki bilgi silinir.
//
// Kural: kart yoksa sorgu hiç gönderilmez ("bilmiyorum"). Kart varsa sorgunun KENDİ başlığına konur
// (ortak istemcinin kalıcı ayarı değişmez). Kart arada dolarsa sunucu 401 der — "boş" demez.
// Misafir sayfası, kayıt ve iletişim formu bu yardımcıyı kullanmaz: onlar kimliksiz çalışmak zorundadır.
import { ortakBeyin } from './ortakBeyin';

export interface KimlikliKart {
  kisi: string;
  yetki: string;            // "Bearer …" — yalnızca tek bir isteğin başlığına konur, hiçbir yere yazılmaz
}

// Beklenen kişinin geçerli kartı; yoksa null. Kart sahibi başka biriyse (ortak telefonda kişi değişti) null.
export async function kimlikliKart(beklenenKisi: string | null | undefined): Promise<KimlikliKart | null> {
  if (!beklenenKisi) return null;
  let oturum: { access_token?: string; expires_at?: number; user?: { id?: string } } | null = null;
  try {
    const { data } = await ortakBeyin().auth.getSession();
    oturum = data.session;
  } catch {
    return null;
  }
  if (!oturum?.access_token || oturum.user?.id !== beklenenKisi) return null;
  if (typeof oturum.expires_at === 'number' && oturum.expires_at * 1000 <= Date.now()) return null;
  return { kisi: beklenenKisi, yetki: `Bearer ${oturum.access_token}` };
}
