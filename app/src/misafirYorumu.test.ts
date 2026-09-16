// MİSAFİR YORUMU — odadaki QR'ın açtığı tek sayfanın arkasındaki iş.
// Denenen üç şey: bozuk bağlantı sunucuya hiç gitmiyor mu, gönderilen paket doğru mu,
// ve otel Wi-Fi'si koparsa misafir suçlanmadan anlaşılır bir cümle görüyor mu?
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { misafirKodunuOku, odaKoduGecerliMi, yorumGonder } from './misafir/yorumGonder';

const KOD = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';        // 32 karakter, QR'daki gibi

beforeEach(() => vi.stubEnv('VITE_SUPABASE_URL', 'https://ornek.supabase.co'));
afterEach(() => vi.unstubAllEnvs());

describe('QR bağlantısı', () => {
  it('yalnızca 32 karakterlik kod kabul edilir', () => {
    expect(odaKoduGecerliMi(KOD)).toBe(true);
    expect(odaKoduGecerliMi('kisa')).toBe(false);
    expect(odaKoduGecerliMi('')).toBe(false);
    expect(odaKoduGecerliMi(KOD.toUpperCase())).toBe(false);
  });

  it('adresten oda kodunu okur; başka yollar uygulamayı açar', () => {
    expect(misafirKodunuOku(`/yorum/${KOD}`)).toBe(KOD);
    expect(misafirKodunuOku('/yorum/')).toBeNull();
    expect(misafirKodunuOku('/oda/abc')).toBeNull();
    expect(misafirKodunuOku('/')).toBeNull();
  });
});

describe('Yorumu gönderme', () => {
  it('kapıya doğru paketi yollar: oda kodu, puan ve yorum', async () => {
    let gidenAdres = '';
    let gidenGovde: Record<string, unknown> = {};
    const sahteAg = (async (adres: string | URL | Request, ayar?: RequestInit) => {
      gidenAdres = String(adres);
      gidenGovde = JSON.parse(String(ayar?.body));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;

    expect(await yorumGonder(KOD, 5, '  Her şey harikaydı  ', sahteAg)).toEqual({ ok: true });
    expect(gidenAdres).toBe('https://ornek.supabase.co/functions/v1/guest-feedback');
    expect(gidenGovde).toEqual({ oda_kodu: KOD, puan: 5, yorum: 'Her şey harikaydı' });
  });

  it('boş yorum null gider — misafir yazı yazmak zorunda değildir', async () => {
    let gidenGovde: Record<string, unknown> = {};
    const sahteAg = (async (_adres: unknown, ayar?: RequestInit) => {
      gidenGovde = JSON.parse(String(ayar?.body));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;

    await yorumGonder(KOD, 4, '   ', sahteAg);
    expect(gidenGovde.yorum).toBeNull();
  });

  it('bozuk bağlantı sunucuya hiç gitmez', async () => {
    const sahteAg = vi.fn() as unknown as typeof fetch;
    expect(await yorumGonder('bozuk', 5, '', sahteAg)).toEqual({ ok: false, mesaj: 'Bu bağlantı geçersiz.' });
    expect(sahteAg).not.toHaveBeenCalled();
  });

  it('kapının Türkçe cevabı aynen gösterilir (spam sınırı, geçersiz kod…)', async () => {
    const sahteAg = (async () =>
      new Response(JSON.stringify({ ok: false, mesaj: 'Lütfen biraz sonra tekrar deneyin.' }), {
        status: 429,
      })) as unknown as typeof fetch;

    expect(await yorumGonder(KOD, 3, 'yine ben', sahteAg)).toEqual({
      ok: false,
      mesaj: 'Lütfen biraz sonra tekrar deneyin.',
    });
  });

  it('otel Wi-Fi\'si koparsa misafir suçlanmaz, ne yapacağı söylenir', async () => {
    const sahteAg = (async () => {
      throw new Error('Failed to fetch');
    }) as unknown as typeof fetch;

    expect(await yorumGonder(KOD, 2, 'Oda soğuktu', sahteAg)).toEqual({
      ok: false,
      mesaj: 'Gönderilemedi. İnternete bağlanıp tekrar deneyin.',
    });
  });

  it('kapı anlaşılmaz bir cevap verirse genel cümle gösterilir', async () => {
    const sahteAg = (async () => new Response('<html>hata</html>', { status: 500 })) as unknown as typeof fetch;
    expect(await yorumGonder(KOD, 1, '', sahteAg)).toEqual({ ok: false, mesaj: 'Bu işlem yapılamadı.' });
  });
});
