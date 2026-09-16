// Misafir Kapısı — misafirin telefonundan tek bir POST (Blueprint · 3.4).
//
// Misafir giriş YAPMAZ ve anahtar TAŞIMAZ: kapı (Edge Function) herkese açıktır.
// Koruma kapının içindedir: biçim denetimi, dakikada 3 yorum sınırı ve tek veritabanı fonksiyonu.
// Bu dosya yalnızca "gönder ve cevabı Türkçeye çevir" işini yapar; ekran mantık taşımaz.
const ODA_KODU_BICIMI = /^[0-9a-f]{32}$/;        // QR'daki kod: 32 karakter, tahmin edilemez
const ZAMAN_ASIMI_MS = 15_000;                   // misafir bekletilmez; ölü Wi-Fi'de istek asılı kalmaz

export const EN_UZUN_YORUM = 500;

export type GonderimSonucu = { ok: true } | { ok: false; mesaj: string };

// QR bozuksa ya da adres elle yazıldıysa sunucuya hiç gitmeyiz.
export function odaKoduGecerliMi(kod: string): boolean {
  return ODA_KODU_BICIMI.test(kod);
}

function kapiAdresi(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) throw new Error('VITE_SUPABASE_URL eksik');
  return `${url.replace(/\/$/, '')}/functions/v1/guest-feedback`;
}

export async function yorumGonder(
  odaKodu: string,
  puan: number,
  yorum: string,
  gonderici: typeof fetch = fetch,
): Promise<GonderimSonucu> {
  if (!odaKoduGecerliMi(odaKodu)) return { ok: false, mesaj: 'Bu bağlantı geçersiz.' };

  let cevap: Response;
  try {
    cevap = await gonderici(kapiAdresi(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oda_kodu: odaKodu, puan, yorum: yorum.trim() || null }),
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    });
  } catch {
    // İnternet yok, otel Wi-Fi'si kopuk, kapı cevap vermiyor: misafire suçlayıcı olmayan tek cümle.
    return { ok: false, mesaj: 'Gönderilemedi. İnternete bağlanıp tekrar deneyin.' };
  }

  if (cevap.ok) return { ok: true };

  // Kapı, misafire söylenebilir cümleyi kendisi yazar (teknik detay taşımaz). Okunamazsa genel cümle.
  const govde = (await cevap.json().catch(() => null)) as { mesaj?: string } | null;
  return { ok: false, mesaj: govde?.mesaj ?? 'Bu işlem yapılamadı.' };
}

// Adresten oda kodunu okur: "/yorum/<kod>" → "<kod>". Başka her yol için null (uygulama açılır).
export function misafirKodunuOku(yol: string): string | null {
  const parcalar = yol.split('/').filter(Boolean);
  return parcalar[0] === 'yorum' && parcalar.length === 2 ? (parcalar[1] ?? null) : null;
}
