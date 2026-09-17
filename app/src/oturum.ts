// Oturum: personel giriş yapmış mı, kim, hangi otelde, hangi rolde?
// Şifreleri Supabase Auth saklar; biz şifre kodu yazmıyoruz (security · Bölüm 5).
// Oturum ve profil telefonda saklanır; internet yokken de "girişli" kalır — kartın süresi dolmuş olsa bile.
// (Gerçek kilit sunucudadır: süresi dolmuş kartla hiçbir şey yazılamaz; internet gelince kart yenilenir.)
import { useCallback, useEffect, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { ortakBeyin } from './ortakBeyin';
import { CIKIS_OLAYI, cevrimici, haberVer } from './olaylar';
import { aktifProfiliAyarla, type Gorev, type Profil, type Rol } from './kullanici';
import { hafizayiUnut } from './ses';

// 'baglantiYok': giriş var ama üyelikler sorulamadı. "Oteli yok" demek DEĞİLDİR — ikisi karıştırılmaz.
export type OturumDurumu = 'yukleniyor' | 'var' | 'yok' | 'otelSec' | 'otelsiz' | 'baglantiYok';

// Bir kişinin bir oteldeki üyeliği (sunucudan)
export interface Uyelik {
  hotel_id: string;
  role: Rol;
  name: string;
  job: Gorev | null;
  hotels: { name: string; demo_bitis_tarihi: string } | null;
}

const PROFIL_ANAHTARI = 'smartotel.uyelikler';   // { id, uyelikler } — internet yokken buradan
const OTEL_ANAHTARI = 'smartotel.otel';          // zincir sahibi hangi oteli seçti

export function useOturum(): { durum: OturumDurumu; uyelikler: Uyelik[]; otelSec: (hotelId: string) => void } {
  const [durum, setDurum] = useState<OturumDurumu>('yukleniyor');
  const [uyelikler, setUyelikler] = useState<Uyelik[]>([]);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);

  const profileGec = useCallback((id: string, liste: Uyelik[], secilenOtel: string | null) => {
    if (liste.length === 0) {
      aktifProfiliAyarla({ id, ad: '', otelId: '', otelAdi: '', rol: 'staff', gorev: null, demoBitis: null });
      setDurum('otelsiz');
      return;
    }
    const secili = liste.find((u) => u.hotel_id === secilenOtel) ?? (liste.length === 1 ? liste[0] : undefined);
    if (!secili) {
      setDurum('otelSec');
      return;
    }
    aktifProfiliAyarla({
      id,
      ad: secili.name,
      otelId: secili.hotel_id,
      otelAdi: secili.hotels?.name ?? '',
      rol: secili.role,
      gorev: secili.job,
      demoBitis: secili.hotels?.demo_bitis_tarihi ?? null,
    });
    setDurum('var');
  }, []);

  useEffect(() => {
    const beyin = ortakBeyin();

    const girisli = async (id: string) => {
      setKullaniciId(id);
      const liste = await uyelikleriYukle(id);
      if (liste === null) {
        setDurum('baglantiYok');        // soramadık: "oteli yok" demeyiz, yanlış olur
        return;
      }
      setUyelikler(liste);
      profileGec(id, liste, oku(OTEL_ANAHTARI));
    };
    const girissiz = () => {
      aktifProfiliAyarla(null);
      setDurum('yok');
    };

    void beyin.auth.getSession().then(({ data, error }) => {
      if (data.session) return girisli(data.session.user.id);
      // İnternet yok ve kart yenilenemedi: telefondaki kayıtlı oturum varsa girişli say
      const agSorunu = !cevrimici() || (error !== null && isAuthRetryableFetchError(error));
      const kayitli = agSorunu ? depodakiKullanici() : null;
      return kayitli ? girisli(kayitli) : girissiz();
    });

    const { data: abonelik } = beyin.auth.onAuthStateChange((olay, oturum) => {
      if (olay === 'SIGNED_OUT') girissiz();
      else if (olay === 'SIGNED_IN' && oturum) void girisli(oturum.user.id);
      // TOKEN_REFRESHED vb.: profil zaten yüklü
    });
    // Çıkış telefonda anında olur; sunucunun cevabı beklenmez (internet yokken de ekran hemen döner).
    window.addEventListener(CIKIS_OLAYI, girissiz);
    return () => {
      abonelik.subscription.unsubscribe();
      window.removeEventListener(CIKIS_OLAYI, girissiz);
    };
  }, [profileGec]);

  const otelSec = useCallback(
    (hotelId: string) => {
      if (!kullaniciId) return;
      yaz(OTEL_ANAHTARI, hotelId);
      profileGec(kullaniciId, uyelikler, hotelId);
    },
    [kullaniciId, uyelikler, profileGec],
  );

  return { durum, uyelikler, otelSec };
}

// Üyelikler: internet varsa sunucudan (ve telefona yaz), yoksa telefondan.
// null döner = "soramadık". Boş liste ile karıştırılmaz: boş liste "bu kişinin oteli yok" demektir.
async function uyelikleriYukle(id: string): Promise<Uyelik[] | null> {
  if (cevrimici()) {
    const { data, error } = await ortakBeyin()
      .from('memberships')
      .select('hotel_id, role, name, job, hotels(name, demo_bitis_tarihi)')
      .eq('user_id', id);
    if (!error && data) {
      const liste = data as unknown as Uyelik[];
      yaz(PROFIL_ANAHTARI, JSON.stringify({ id, uyelikler: liste }));
      return liste;
    }
  }
  try {
    const kayit = JSON.parse(oku(PROFIL_ANAHTARI) ?? 'null') as { id: string; uyelikler: Uyelik[] } | null;
    if (kayit?.id === id) return kayit.uyelikler;
  } catch {
    // bozuk kayıt
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

// Çıkış ÖNCE telefonda olur: kart ve profil silinir, ekran hemen giriş ekranına döner.
// Sunucuya haber vermek internet ister; beklemeyiz — bodrumdaki görevlinin çıkışı askıda kalmasın.
// Giden kutusundaki mektuplar kalır; sahibi tekrar girince gider.
export async function cikisYap(): Promise<void> {
  aktifProfiliAyarla(null);
  hafizayiUnut();                                // sıradaki müdür, devraldığı alarmların sesiyle karşılanmasın
  sil(PROFIL_ANAHTARI);
  sil(OTEL_ANAHTARI);
  oturumKartiniSil();
  haberVer(CIKIS_OLAYI);
  try {
    await ortakBeyin().auth.signOut({ scope: 'local' });
  } catch {
    // İnternet yok: kart zaten telefondan silindi, çıkış geçerlidir.
  }
}

// Supabase'in telefondaki kartı ("sb-…-auth-token"). Kendimiz sileriz ki internet yokken de çıkış gerçek olsun.
function oturumKartiniSil(): void {
  try {
    const anahtarlar: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const anahtar = localStorage.key(i);
      if (anahtar?.startsWith('sb-') && anahtar.endsWith('-auth-token')) anahtarlar.push(anahtar);
    }
    anahtarlar.forEach((anahtar) => localStorage.removeItem(anahtar));
  } catch {
    // depo yok
  }
}

// Supabase, oturumu telefonda "sb-…-auth-token" anahtarıyla saklar. Kullanıcı kimliğini oradan okuruz.
function depodakiKullanici(): string | null {
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

function oku(anahtar: string): string | null {
  try {
    return localStorage.getItem(anahtar);
  } catch {
    return null;
  }
}
function yaz(anahtar: string, deger: string): void {
  try {
    localStorage.setItem(anahtar, deger);
  } catch {
    // depo yazılamıyor
  }
}
function sil(anahtar: string): void {
  try {
    localStorage.removeItem(anahtar);
  } catch {
    // depo yok
  }
}
