// Kayıt: vitrindeki "Otelimi Ücretsiz Başlat" düğmesinin arkası (Blueprint · Aşama 20).
//
// Dört soru sorulur: otel adı, ad soyad, e-posta, şifre. Başka hiçbir şey sorulmaz.
// Kapı (otel-ac) hesabı, oteli ve ilk sahipliği birlikte açar; sonra kişi kendi şifresiyle
// normal yoldan giriş yapar — kayıt akışı özel bir giriş yolu icat etmez.
import { ortakBeyin } from './ortakBeyin';

export interface KayitBilgileri {
  otelAdi: string;
  ad: string;
  eposta: string;
  sifre: string;
}

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EN_KISA_SIFRE = 8;             // sunucu ve veritabanı da aynı sayıyı ister

// Ekran, sunucuya gitmeden önce aynı soruları sorar: hata varsa tek cümleyle söyler.
// Asıl denetim yine kapıdadır; bu yalnızca kolaylıktır.
export function kayitDenetle(bilgi: KayitBilgileri): string | null {
  if (bilgi.otelAdi.trim().length < 2) return 'Otel adını yazın.';
  if (bilgi.otelAdi.trim().length > 80) return 'Otel adı çok uzun.';
  if (bilgi.ad.trim().length < 1) return 'Adınızı yazın.';
  if (bilgi.ad.trim().length > 60) return 'Adınız çok uzun.';
  if (!EPOSTA.test(bilgi.eposta.trim())) return 'E-posta adresinizi kontrol edin.';
  if (bilgi.sifre.length < EN_KISA_SIFRE) return `Şifre en az ${EN_KISA_SIFRE} karakter olmalı.`;
  return null;
}

export async function otelAc(bilgi: KayitBilgileri): Promise<{ ok: true } | { ok: false; mesaj: string }> {
  const { data, error } = await ortakBeyin().functions.invoke<{ ok: boolean; mesaj?: string }>('otel-ac', {
    body: {
      otel_adi: bilgi.otelAdi.trim(),
      ad: bilgi.ad.trim(),
      eposta: bilgi.eposta.trim(),
      sifre: bilgi.sifre,
    },
  });

  if (error) {
    // Kapı 4xx dönünce gövdede Türkçe mesaj vardır (e-posta zaten kayıtlı, çok sık deneme…)
    const govde = await (error as { context?: Response }).context?.json?.().catch(() => null);
    return { ok: false, mesaj: (govde as { mesaj?: string } | null)?.mesaj ?? 'Kayıt yapılamadı. Tekrar deneyin.' };
  }
  return data?.ok ? { ok: true } : { ok: false, mesaj: data?.mesaj ?? 'Kayıt yapılamadı. Tekrar deneyin.' };
}
