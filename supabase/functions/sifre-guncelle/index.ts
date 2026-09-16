// =====================================================================
// ŞİFRE GÜNCELLE — giriş noktası (Supabase Edge Function, Deno)
//
// Müdür paneli → BU FONKSİYON → (1) çağıranın kim olduğu ve rolü, çağıranın kendi kartıyla
//                              (2) hedefin bu otelde çalışıp çalışmadığı, yine kendi kartıyla
//                              (3) "başka otelde de çalışıyor mu?" sorusu, veritabanına
//                              (4) şifrenin yazılması, ana anahtarla (TEK iş)
// Ana anahtarla tablolara dokunulmaz; yalnızca hesabın şifresi değiştirilir.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { istegiIsle, type Bagimliliklar } from './kapi.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const kapiAnahtari = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const anaAnahtar = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Çağıranın kendi kartıyla konuşan istemci: ne görüyorsa onu görür (kilitler geçerli)
function cagiranIstemcisi(kart: string) {
  return createClient(url, kapiAnahtari, {
    global: { headers: { Authorization: `Bearer ${kart}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const yonetici = createClient(url, anaAnahtar, { auth: { persistSession: false, autoRefreshToken: false } });

const dis: Bagimliliklar = {
  async cagiran(hotelId, kart) {
    const istemci = cagiranIstemcisi(kart);
    const { data: kullanici } = await istemci.auth.getUser();
    if (!kullanici.user) return null;
    const { data } = await istemci
      .from('memberships')
      .select('role')
      .eq('hotel_id', hotelId)
      .eq('user_id', kullanici.user.id)
      .maybeSingle();
    return { id: kullanici.user.id, rol: (data as { role: string } | null)?.role ?? null };
  },

  async hedefRolu(hotelId, userId, kart) {
    const { data } = await cagiranIstemcisi(kart)
      .from('memberships')
      .select('role')
      .eq('hotel_id', hotelId)
      .eq('user_id', userId)
      .maybeSingle();
    return (data as { role: string } | null)?.role ?? null;
  },

  async baskaOteldeMi(hotelId, userId, kart) {
    const { data, error } = await cagiranIstemcisi(kart).rpc('baska_otelde_calisiyor_mu', {
      p_user_id: userId,
      p_hotel_id: hotelId,
    });
    // Soru cevaplanamadıysa şifre değiştirilmez: bilinmezlik "hayır" sayılmaz.
    if (error) throw new Error(error.message);
    return data === true;
  },

  async sifreyiYaz(userId, password) {
    const { error } = await yonetici.auth.admin.updateUserById(userId, { password });
    return error ? { ok: false, hata: error.message } : { ok: true };
  },
};

Deno.serve((istek) => istegiIsle(istek, dis, Deno.env.get('PANEL_ORIGIN') ?? '*'));
