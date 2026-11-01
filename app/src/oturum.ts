// Oturum: personel giriş yapmış mı, kim, hangi otelde, hangi rolde?
// Şifreleri Supabase Auth saklar; biz şifre kodu yazmıyoruz (security · Bölüm 5).
// Oturum ve profil telefonda saklanır; internet yokken de "girişli" kalır — kartın süresi dolmuş olsa bile.
// (Gerçek kilit sunucudadır: süresi dolmuş kartla hiçbir şey yazılamaz; internet gelince kart yenilenir.)
import { useCallback, useEffect, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { ortakBeyin } from './ortakBeyin';
import { kimlikliKart } from './kimlik';
import { CIKIS_OLAYI, cevrimici, haberVer } from './olaylar';
import { aktifKullanici, aktifProfiliAyarla, type Gorev, type Profil, type Rol } from './kullanici';
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

export interface OturumHali {
  durum: OturumDurumu;
  uyelikler: Uyelik[];
  kullaniciId: string | null;
}

// Seçilen otele göre profil: telefonda etkin profili ayarlar, ekranın durumunu döner.
export function profilDurumu(id: string, liste: Uyelik[], secilenOtel: string | null = oku(OTEL_ANAHTARI)): OturumDurumu {
  if (liste.length === 0) {
    aktifProfiliAyarla({ id, ad: '', otelId: '', otelAdi: '', rol: 'staff', gorev: null, demoBitis: null });
    return 'otelsiz';
  }
  const secili = liste.find((u) => u.hotel_id === secilenOtel) ?? (liste.length === 1 ? liste[0] : undefined);
  if (!secili) {
    // Seçim bekleniyor: hiçbir otel etkin değildir. Önceki kişinin (ya da artık geçersiz otelin) profili
    // kullanılmaya devam etmez; yoldaki eski indirmeler bağlam değiştiği için telefona yazılmaz.
    aktifProfiliAyarla(null);
    return 'otelSec';
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
  return 'var';
}

// Oturumu izler; her değişiklikte ekrana yeni hali bildirir. Durdurmak için dönen işlev çağrılır.
// (React'tan bağımsızdır: testler doğrudan çağırır.)
//
// Karar 029 — "kimlik yoksa bilmiyorum":
//   * Üyelikler yalnızca geçerli kartla sorulur. Kart yoksa / sunucu kartı reddederse / ağ yoksa cevap
//     "soramadık"tır: aynı kişinin telefondaki bilinen üyelikleriyle devam edilir, o da yoksa "Bağlantı yok".
//   * Geçerli kartla gelen boş liste gerçektir (yetki iptali): "Otel bulunamadı" gösterilir, önbellek boşalır.
//   * Her yükleme sıra numarası alır. Cevap geldiğinde kişi değişmişse ya da daha yeni bir yükleme başlamışsa
//     cevap ne ekrana ne önbelleğe yazılır (A→B, A→B→A, çıkış).
//   * Toparlanma: "soramadık"tan sonra kart yenilenince (TOKEN_REFRESHED / SIGNED_IN), internet gelince ve
//     sınırlı sayıda zamanlayıcıyla yeniden sorulur. Oturum olayı dinleyicisi işi hemen bir sonraki tura
//     bırakır: Supabase kütüphanesinin kendi kilidi içindeyken oturum sorulmaz (takılma olmaz).
export const YENIDEN_SORMA_MS = 65_000;              // kütüphanenin "başarısız yenilemeyi hatırlama" süresinden uzun
export const EN_FAZLA_OTOMATIK_DENEME = 3;

export function oturumuIzle(bildir: (hal: OturumHali) => void): () => void {
  const beyin = ortakBeyin();
  let kapandi = false;
  let kisi: string | null = null;
  let uyelikler: Uyelik[] = [];
  let sira = 0;                                        // kişi değişimi ve her yükleme bir artırır
  let suruyor: { sira: number; kisi: string } | null = null;
  let tekrarIstendi = false;
  let eksik = false;                                   // son bilgi sunucudan doğrulanamadı
  let otomatikDeneme = 0;
  let zamanlayici: ReturnType<typeof setTimeout> | null = null;

  const yay = (durum: OturumDurumu) => {
    if (!kapandi) bildir({ durum, uyelikler, kullaniciId: kisi });
  };
  const zamanlayiciyiKapat = () => {
    if (zamanlayici) clearTimeout(zamanlayici);
    zamanlayici = null;
  };
  const zamanla = () => {
    if (kapandi || zamanlayici || otomatikDeneme >= EN_FAZLA_OTOMATIK_DENEME) return;
    otomatikDeneme++;
    zamanlayici = setTimeout(() => {
      zamanlayici = null;
      void yukle();
    }, YENIDEN_SORMA_MS);
  };

  const yukle = async (): Promise<void> => {
    if (kapandi || !kisi) return;
    if (suruyor && suruyor.kisi === kisi) {            // aynı kişi için zaten soruluyor: bitince bir kez daha
      tekrarIstendi = true;
      return;
    }
    const benim = { sira: ++sira, kisi };
    suruyor = benim;
    tekrarIstendi = false;
    try {
      const cevap = await uyelikleriSor(benim.kisi);
      if (kapandi || benim.sira !== sira || kisi !== benim.kisi) return;   // geç gelen cevap: yok say
      if (cevap.tur === 'sunucu') {
        eksik = false;
        otomatikDeneme = 0;
        zamanlayiciyiKapat();
        uyelikler = cevap.uyelikler;
        uyelikleriSakla(benim.kisi, uyelikler);
        yay(profilDurumu(benim.kisi, uyelikler));
        return;
      }
      eksik = true;
      const telefondaki = telefondakiUyelikler(benim.kisi);
      if (telefondaki) {
        uyelikler = telefondaki;
        yay(profilDurumu(benim.kisi, telefondaki));
      } else {
        uyelikler = [];
        yay('baglantiYok');                              // soramadık: "oteli yok" demeyiz, yanlış olur
      }
      if (cevap.neden !== 'internet') zamanla();       // internet yokken 'online' olayı beklenir
    } finally {
      if (suruyor === benim) {
        suruyor = null;
        if (tekrarIstendi && !kapandi) {
          tekrarIstendi = false;
          void yukle();
        }
      }
    }
  };

  // Kimlik olaylarının sırası: her oturum olayı, başlangıç sorgusu ve çıkış GELDİĞİ ANDA bir numara alır.
  // İş bir sonraki tura bırakıldığı için, uygulanmadan önce daha yeni bir kimlik değişikliği (çıkış, başka
  // kişinin girişi) olduysa eski olay yok sayılır. Çıkıştan SONRA gelen gerçek yeni giriş daha büyük numara
  // alır ve normal çalışır.
  let olaySayaci = 0;
  let sonKimlikOlayi = 0;
  const kimlikOlayiGecerliMi = (no: number): boolean => {
    if (no <= sonKimlikOlayi) return false;
    sonKimlikOlayi = no;
    return true;
  };

  const kisiyeGec = (id: string) => {
    if (kisi !== id) {
      kisi = id;
      sira++;                                            // önceki kişinin yoldaki cevabı artık geçersiz
      // Önceki kişinin etkin profili hemen bırakılır (bağlam sürümü artar): yeni kişi otelini seçene ya da
      // üyelikleri gelene kadar eski profil kullanılamaz, eski kişinin yoldaki indirmesi telefona yazılmaz.
      if (aktifKullanici() !== id) aktifProfiliAyarla(null);
      uyelikler = [];
      yay('yukleniyor');                                 // eski kişinin ekranı (ve postacısı) hemen kapanır
      uyelikler = [];
      eksik = false;
      otomatikDeneme = 0;
      tekrarIstendi = false;
      zamanlayiciyiKapat();
    }
    void yukle();
  };
  const girissiz = () => {
    kisi = null;
    sira++;
    uyelikler = [];
    eksik = false;
    tekrarIstendi = false;
    zamanlayiciyiKapat();
    aktifProfiliAyarla(null);
    yay('yok');
  };

  const baslangicNo = ++olaySayaci;
  void beyin.auth.getSession().then(({ data, error }) => {
    if (kapandi) return;
    if (!kimlikOlayiGecerliMi(baslangicNo)) return;     // bu arada çıkış ya da yeni giriş oldu: eski bilgi
    if (data.session) return kisiyeGec(data.session.user.id);
    // İnternet yok ya da kart yenilenemedi: telefondaki kayıtlı oturum varsa girişli say
    const agSorunu = !cevrimici() || (error !== null && isAuthRetryableFetchError(error));
    const kayitli = agSorunu ? depodakiKullanici() : null;
    return kayitli ? kisiyeGec(kayitli) : girissiz();
  });

  const { data: abonelik } = beyin.auth.onAuthStateChange((olay, oturum) => {
    // Kütüphanenin kilidi içindeyiz: burada beklenmez, oturum sorulmaz. İş bir sonraki tura bırakılır.
    const oturumSahibi = oturum?.user?.id ?? null;
    const no = ++olaySayaci;                             // numara olay GELDİĞİ anda alınır
    setTimeout(() => {
      if (kapandi) return;
      if (olay === 'SIGNED_OUT') {
        if (kimlikOlayiGecerliMi(no)) girissiz();
      } else if (olay === 'SIGNED_IN' && oturumSahibi) {
        if (kimlikOlayiGecerliMi(no)) kisiyeGec(oturumSahibi);
      } else if (olay === 'TOKEN_REFRESHED' && no > sonKimlikOlayi && eksik && oturumSahibi && oturumSahibi === kisi) {
        void yukle();
      }
    }, 0);
  });
  const internetGeldi = () => {
    if (eksik) void yukle();
  };
  // Çıkış telefonda anında olur; sunucunun cevabı beklenmez (internet yokken de ekran hemen döner).
  // Daha önce gelmiş ama henüz işlenmemiş oturum olayları bu çıkışı geri alamaz.
  const cikisGeldi = () => {
    sonKimlikOlayi = ++olaySayaci;
    girissiz();
  };
  const pencere = typeof window !== 'undefined' ? window : undefined;
  pencere?.addEventListener(CIKIS_OLAYI, cikisGeldi);
  pencere?.addEventListener('online', internetGeldi);
  return () => {
    kapandi = true;
    zamanlayiciyiKapat();
    abonelik.subscription.unsubscribe();
    pencere?.removeEventListener(CIKIS_OLAYI, cikisGeldi);
    pencere?.removeEventListener('online', internetGeldi);
  };
}

export function useOturum(): { durum: OturumDurumu; uyelikler: Uyelik[]; otelSec: (hotelId: string) => void } {
  const [hal, setHal] = useState<OturumHali>({ durum: 'yukleniyor', uyelikler: [], kullaniciId: null });
  useEffect(() => oturumuIzle(setHal), []);

  const otelSec = useCallback(
    (hotelId: string) => {
      if (!hal.kullaniciId) return;
      yaz(OTEL_ANAHTARI, hotelId);
      setHal({ ...hal, durum: profilDurumu(hal.kullaniciId, hal.uyelikler, hotelId) });
    },
    [hal],
  );

  return { durum: hal.durum, uyelikler: hal.uyelikler, otelSec };
}

// Üyelikleri sunucuya sor. "sunucu" yalnızca geçerli kartla gelen cevaptır (boş liste dahil: gerçek iptal).
// Kart yok, sunucu kartı reddetti (401 / PGRST3xx) ya da ağ yok → "soramadık"; önbelleğe dokunulmaz.
export type UyelikCevabi =
  | { tur: 'sunucu'; uyelikler: Uyelik[] }
  | { tur: 'soramadik'; neden: 'internet' | 'oturum' | 'sunucu' };

export async function uyelikleriSor(id: string): Promise<UyelikCevabi> {
  if (!cevrimici()) return { tur: 'soramadik', neden: 'internet' };
  const kart = await kimlikliKart(id);
  if (!kart) return { tur: 'soramadik', neden: 'oturum' };
  try {
    const { data, error } = await ortakBeyin()
      .from('memberships')
      .select('hotel_id, role, name, job, hotels(name, demo_bitis_tarihi)')
      .eq('user_id', id)
      .setHeader('Authorization', kart.yetki);
    if (error || !Array.isArray(data)) return { tur: 'soramadik', neden: 'sunucu' };
    return { tur: 'sunucu', uyelikler: data as unknown as Uyelik[] };
  } catch {
    return { tur: 'soramadik', neden: 'internet' };
  }
}

// Telefondaki son bilinen üyelikler — yalnızca aynı kişinin. Başka kişinin önbelleği hiç okunmaz.
function telefondakiUyelikler(id: string): Uyelik[] | null {
  try {
    const kayit = JSON.parse(oku(PROFIL_ANAHTARI) ?? 'null') as { id: string; uyelikler: Uyelik[] } | null;
    if (kayit?.id === id && Array.isArray(kayit.uyelikler)) return kayit.uyelikler;
  } catch {
    // bozuk kayıt
  }
  return null;
}

function uyelikleriSakla(id: string, liste: Uyelik[]): void {
  yaz(PROFIL_ANAHTARI, JSON.stringify({ id, uyelikler: liste }));
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
