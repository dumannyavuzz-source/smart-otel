// =====================================================================
// MİSAFİR KAPISI — giriş noktası (Supabase Edge Function, Deno)
//
// Misafir sayfası → BU FONKSİYON → misafir_yorumu_yaz (veritabanı) → guest_feedback
//
// Ana anahtar (SUPABASE_SERVICE_ROLE_KEY) yalnızca burada, yalnızca sunucuda yaşar.
// Onunla yapılan TEK iş: misafir_yorumu_yaz kapısını çağırmak. Başka sorgu yok.
// (Ana anahtar her kilidi açar; onu bu tek kapıya bağlayan şey bu dosyanın küçüklüğüdür.)
//
// Ortam değişkenleri (Supabase kendisi verir): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// İsteğe bağlı: GUEST_PAGE_ORIGIN — misafir sayfasının adresi (CORS); yoksa "*"
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { istegiIsle, type MisafirYorumu } from './kapi.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function yorumYaz(yorum: MisafirYorumu): Promise<void> {
  const { error } = await supabase.rpc('misafir_yorumu_yaz', {
    p_oda_kodu: yorum.oda_kodu,
    p_puan: yorum.puan,
    p_yorum: yorum.yorum,
  });
  if (error) {
    throw new Error(error.message);
  }
}

Deno.serve((istek) => istegiIsle(istek, yorumYaz, Deno.env.get('GUEST_PAGE_ORIGIN') ?? '*'));
