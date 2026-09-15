// Oturum: personel giriş yapmış mı?
// Şifreleri Supabase Auth saklar; biz şifre kodu yazmıyoruz (security · Bölüm 5).
// Oturum telefonda saklanır; internet yokken de "girişli" kalır — kartın süresi dolmuş olsa bile.
// (Gerçek kilit sunucudadır: süresi dolmuş kartla hiçbir şey yazılamaz; internet gelince kart yenilenir.)
import { useEffect, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { ortakBeyin } from './ortakBeyin';
import { cevrimici } from './olaylar';
import { aktifKullaniciyiAyarla } from './kullanici';

export type OturumDurumu = 'yukleniyor' | 'var' | 'yok';

export function useOturum(): OturumDurumu {
  const [durum, setDurum] = useState<OturumDurumu>('yukleniyor');

  useEffect(() => {
    const beyin = ortakBeyin();

    const girisli = (kullaniciId: string) => {
      aktifKullaniciyiAyarla(kullaniciId);
      setDurum('var');
    };
    const girissiz = () => {
      aktifKullaniciyiAyarla(null);
      setDurum('yok');
    };

    void beyin.auth.getSession().then(({ data, error }) => {
      if (data.session) return girisli(data.session.user.id);
      // İnternet yok ve kart yenilenemedi: telefondaki kayıtlı oturum varsa girişli say
      const agSorunu = !cevrimici() || (error !== null && isAuthRetryableFetchError(error));
      const kayitli = agSorunu ? depodakiOturum() : null;
      return kayitli ? girisli(kayitli) : girissiz();
    });

    const { data: abonelik } = beyin.auth.onAuthStateChange((olay, oturum) => {
      if (olay === 'SIGNED_OUT') girissiz();
      else if (oturum) girisli(oturum.user.id);
      // oturum null ama çıkış değilse (ör. INITIAL_SESSION offline'da): yukarıdaki karar geçerli
    });
    return () => abonelik.subscription.unsubscribe();
  }, []);

  return durum;
}

// Supabase, oturumu telefonda "sb-…-auth-token" anahtarıyla saklar. Kullanıcı kimliğini oradan okuruz.
function depodakiOturum(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const anahtar = localStorage.key(i);
      if (!anahtar?.startsWith('sb-') || !anahtar.endsWith('-auth-token')) continue;
      const kayit = JSON.parse(localStorage.getItem(anahtar) ?? 'null') as { user?: { id?: string } } | null;
      if (kayit?.user?.id) return kayit.user.id;
    }
  } catch {
    // depo okunamıyor (özel mod vb.)
  }
  return null;
}

export type GirisSonucu = 'tamam' | 'hatali' | 'internetYok';

// Hesabın var olup olmadığı ele verilmez: şifre/e-posta hatasında hep aynı cevap.
// İnternet yoksa bunu ayrıca söyleriz; görevli şifresini yanlış sanmasın.
export async function girisYap(eposta: string, sifre: string): Promise<GirisSonucu> {
  if (!cevrimici()) return 'internetYok';
  const { error } = await ortakBeyin().auth.signInWithPassword({ email: eposta.trim(), password: sifre });
  if (!error) return 'tamam';
  return isAuthRetryableFetchError(error) ? 'internetYok' : 'hatali';
}
