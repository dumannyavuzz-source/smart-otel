// =====================================================================
// KAYIT KAPISI (OTEL AÇ) — giriş noktası (Supabase Edge Function, Deno)
//
// Vitrin → Kayıt sayfası → BU FONKSİYON → hesap + otel + ilk üyelik (hepsi ana anahtarla).
// Burada ana anahtar üç iş yapar, çünkü ortada henüz giriş yapmış kimse yoktur:
// yeni hesap, yeni otel ve o otelin İLK sahibi. Bundan sonrası kullanıcının kendi kartıyla olur.
//
// Kapı kimlik doğrulaması istemez (kayıt olan kişinin kartı yoktur), bu yüzden
// önünde bir sayaç durur: aynı adresten saatte en fazla 3 deneme.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { istegiIsle, type Bagimliliklar } from './kapi.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const anaAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const yonetici = createClient(url, anaAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });

// İnternet adresi AÇIK saklanmaz: özeti alınır. Amaç kimliği bilmek değil, "aynı yer mi?" sorusu.
async function adresOzeti(istek: Request): Promise<string> {
  const ham = (istek.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'bilinmeyen';
  const veri = new TextEncoder().encode(`smartotel-kayit:${ham}`);
  const ozet = await crypto.subtle.digest('SHA-256', veri);
  return Array.from(new Uint8Array(ozet))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const dis: Bagimliliklar = {
  async denemeyiSayVeYaz(ipOzeti) {
    const { data, error } = await yonetici.rpc('kayit_denemesi_say_ve_yaz', { p_ip_ozeti: ipOzeti });
    // Sayaç çalışmıyorsa kapı açılmaz: bilinmezlik "sorun yok" sayılmaz.
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  },

  async hesapAc(eposta, sifre) {
    // E-posta doğrulaması yoktur (sistem hiç e-posta göndermez); hesap doğrudan açılır.
    const { data, error } = await yonetici.auth.admin.createUser({ email: eposta, password: sifre, email_confirm: true });
    if (error || !data.user) {
      const mesaj = error?.message ?? 'kullanıcı yok';
      return { ok: false, zatenVar: /already|exists|registered/i.test(mesaj), hata: mesaj };
    }
    return { ok: true, id: data.user.id };
  },

  async otelAc(ad) {
    const { data, error } = await yonetici.from('hotels').insert({ name: ad }).select('id').single();
    if (error || !data) return { ok: false, hata: error?.message ?? 'otel yok' };
    return { ok: true, id: (data as { id: string }).id };
  },

  async uyelikYaz(otelId, kullaniciId, ad) {
    const { error } = await yonetici
      .from('memberships')
      .insert({ hotel_id: otelId, user_id: kullaniciId, role: 'owner', name: ad, job: null });
    return error ? { ok: false, hata: error.message } : { ok: true };
  },

  async hesapSil(id) {
    await yonetici.auth.admin.deleteUser(id);
  },

  async oteliSil(id) {
    await yonetici.from('hotels').delete().eq('id', id);
  },
};

Deno.serve(async (istek) =>
  istegiIsle(istek, dis, await adresOzeti(istek), Deno.env.get('KAYIT_SAYFASI_ORIGIN') ?? '*'),
);
