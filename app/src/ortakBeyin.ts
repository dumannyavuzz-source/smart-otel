// Ortak Beyin (Supabase) bağlantısı.
// Buradaki anahtar "kapı anahtarı"dır (anon key): herkese açıktır, tek başına hiçbir çekmeceyi açmaz.
// Kilitler veritabanındadır (docs/security/001 · 2.9).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const kapiAnahtari = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Ölü Wi-Fi'de istek sonsuza dek asılı kalmasın; postacı kilitlenmesin (security checklist · 7)
const ZAMAN_ASIMI_MS = 60_000;

export function ayarlarTamamMi(): boolean {
  return Boolean(url && kapiAnahtari);
}

let istemci: SupabaseClient | undefined;

// Tembel: ilk kullanımda oluşturulur. Böylece testler ağa hiç dokunmadan çalışır.
export function ortakBeyin(): SupabaseClient {
  if (!istemci) {
    if (!url || !kapiAnahtari) {
      throw new Error('Ortak Beyin ayarları eksik: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY');
    }
    istemci = createClient(url, kapiAnahtari, {
      global: {
        fetch: (girdi, ayarlar) => fetch(girdi, { ...ayarlar, signal: ayarlar?.signal ?? AbortSignal.timeout(ZAMAN_ASIMI_MS) }),
      },
    });
  }
  return istemci;
}
