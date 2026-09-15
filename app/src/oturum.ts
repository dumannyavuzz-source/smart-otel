// Oturum: personel giriş yapmış mı?
// Şifreleri Supabase Auth saklar; biz şifre kodu yazmıyoruz (security · Bölüm 5).
// Oturum telefonda saklanır; internet yokken de "girişli" kalır.
import { useEffect, useState } from 'react';
import { ortakBeyin } from './ortakBeyin';
import { cevrimici } from './olaylar';

export type OturumDurumu = 'yukleniyor' | 'var' | 'yok';

export function useOturum(): OturumDurumu {
  const [durum, setDurum] = useState<OturumDurumu>('yukleniyor');

  useEffect(() => {
    const beyin = ortakBeyin();
    void beyin.auth.getSession().then(({ data }) => setDurum(data.session ? 'var' : 'yok'));
    const { data: abonelik } = beyin.auth.onAuthStateChange((_olay, oturum) => {
      setDurum(oturum ? 'var' : 'yok');
    });
    return () => abonelik.subscription.unsubscribe();
  }, []);

  return durum;
}

export type GirisSonucu = 'tamam' | 'hatali' | 'internetYok';

// Hesabın var olup olmadığı ele verilmez: şifre/e-posta hatasında hep aynı cevap.
// İnternet yoksa bunu ayrıca söyleriz; görevli şifresini yanlış sanmasın.
export async function girisYap(eposta: string, sifre: string): Promise<GirisSonucu> {
  if (!cevrimici()) return 'internetYok';
  const { error } = await ortakBeyin().auth.signInWithPassword({ email: eposta.trim(), password: sifre });
  if (!error) return 'tamam';
  const agHatasi = error.status === undefined || error.status === 0 || /fetch/i.test(error.message);
  return agHatasi ? 'internetYok' : 'hatali';
}
