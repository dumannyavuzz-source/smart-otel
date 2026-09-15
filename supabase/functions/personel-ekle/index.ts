// =====================================================================
// PERSONEL EKLE — giriş noktası (Supabase Edge Function, Deno)
//
// Müdür paneli → BU FONKSİYON → (1) çağıranın rolü, çağıranın kendi kartıyla
//                              (2) hesap açma, ana anahtarla (tek iş)
//                              (3) üyelik, yine çağıranın kendi kartıyla (kilitler geçerli)
// Ana anahtarla yapılan TEK iş: hesap açmak (ve yarım kalırsa silmek). Tablolara ana anahtarla dokunulmaz.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { istegiIsle, type Bagimliliklar } from './kapi.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const kapiAnahtari = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const anaAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Çağıranın kendi kartıyla konuşan istemci: ne görüyorsa onu görür, ne yazabiliyorsa onu yazar
function cagiranIstemcisi(kart: string) {
  return createClient(url, kapiAnahtari, {
    global: { headers: { Authorization: `Bearer ${kart}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const yonetici = createClient(url, anaAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });

const dis: Bagimliliklar = {
  async cagiranRolu(hotelId, kart) {
    const istemci = cagiranIstemcisi(kart);
    const { data: kullanici } = await istemci.auth.getUser();
    if (!kullanici.user) return null;
    const { data } = await istemci
      .from('memberships')
      .select('role')
      .eq('hotel_id', hotelId)
      .eq('user_id', kullanici.user.id)
      .maybeSingle();
    return (data as { role: string } | null)?.role ?? null;
  },

  async hesapAc(email, password) {
    const { data, error } = await yonetici.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) {
      const mesaj = error?.message ?? 'kullanıcı yok';
      return { ok: false, zatenVar: /already|exists|registered/i.test(mesaj), hata: mesaj };
    }
    return { ok: true, id: data.user.id };
  },

  async uyelikYaz(kart, uyelik) {
    const { error } = await cagiranIstemcisi(kart).from('memberships').insert(uyelik);
    return error ? { ok: false, hata: error.message } : { ok: true };
  },

  async hesapSil(id) {
    await yonetici.auth.admin.deleteUser(id);
  },
};

Deno.serve((istek) => istegiIsle(istek, dis, Deno.env.get('PANEL_ORIGIN') ?? '*'));
