// Çan sesi — müdür panelinin tek uyarısı.
// Genel Müdür kuralı: zarif, rahatsız etmeyen, TOK bir "ding". Siren yok, tekrar yok, telaş yok.
//
// Dosyada iki iş var:
//   1. "Yeni kırmızı alarm var mı?" — hafıza. Panel her 30 saniyede aynı listeyi görür; ses yalnızca
//      listede DAHA ÖNCE OLMAYAN bir alarm belirince çalar. Aynı alarm iki kez ses çıkarmaz.
//   2. "Çal" — sesi tarayıcının kendisi üretir. Ses dosyası indirilmez: dosya yok, gecikme yok.

// ---------------------------------------------------------------------
// 1. Hafıza: hangi alarmı daha önce gördük?
// ---------------------------------------------------------------------

// null → panel yeni açıldı. İlk liste sessizce öğrenilir; müdür ekranı açar açmaz ses duymaz.
let gorulenler: Set<string> | null = null;

interface Kirmizilar {
  gecikenler: { id: string }[];
  mutsuzMisafirler: { id: string }[];
  uyusmazliklar: { id: string }[];
}

// Üç tür kırmızı alarm vardır: süresi geçen iş, mutsuz misafir ve onaylandığı gibi gelmeyen teslim.
// Kimlikleri karışmasın diye önek konur.
export function alarmKimlikleri(veri: Kirmizilar): string[] {
  return [
    ...veri.gecikenler.map((g) => `is:${g.id}`),
    ...veri.mutsuzMisafirler.map((m) => `misafir:${m.id}`),
    ...veri.uyusmazliklar.map((u) => `teslim:${u.id}`),
  ];
}

// Listede yeni bir alarm var mı? (Soruyu sorarken hafızayı da tazeler.)
// Çözülen alarm hafızadan düşer: aynı oda yarın yine kırmızıya düşerse yeniden uyarılır.
export function yeniAlarmVarMi(kimlikler: string[]): boolean {
  const oncekiler = gorulenler;
  gorulenler = new Set(kimlikler);
  if (oncekiler === null) return false;
  return kimlikler.some((kimlik) => !oncekiler.has(kimlik));
}

// Çıkışta unutulur: sıradaki müdür, devraldığı alarmların sesiyle karşılanmaz.
export function hafizayiUnut(): void {
  gorulenler = null;
}

// ---------------------------------------------------------------------
// 2. Sesin kendisi
// ---------------------------------------------------------------------
const SURE_SN = 1.4;        // çan bu sürede yavaşça söner
const KISIKLIK = 0.18;      // %18 — odadaki konuşmayı bastırmaz, sadece başı kaldırtır
const SUZGEC_HZ = 1800;     // tizler süzülür: ses tok olur, keskin ve tırmalayıcı değil
const NOTALAR = [
  { hz: 660, guc: 1 },      // ana nota
  { hz: 990, guc: 0.25 },   // üstündeki hafif ton — çana gövde verir (beşli)
];

let motor: AudioContext | null = null;
let sesYok = false;         // tarayıcı ses üretemiyorsa bir daha denenmez

function motoruAc(): AudioContext | null {
  if (motor || sesYok) return motor;
  const pencere = typeof window === 'undefined' ? null : (window as typeof window & { webkitAudioContext?: typeof AudioContext });
  const Yapici = pencere?.AudioContext ?? pencere?.webkitAudioContext;
  if (!Yapici) {
    sesYok = true;
    return null;
  }
  try {
    motor = new Yapici();
  } catch {
    sesYok = true;          // ses aygıtı yok (eski tarayıcı, kısıtlı cihaz): sessiz devam ederiz
  }
  return motor;
}

// Tarayıcılar, kullanıcı ekrana dokunmadan ses çıkmasına izin vermez.
// Panel açılınca ilk dokunuşu bekleriz; o dokunuş sesin kilidini açar. Geri döndürdüğü işlev dinlemeyi bırakır.
export function sesiHazirla(): () => void {
  if (typeof window === 'undefined') return () => {};
  const kilidiAc = () => {
    const ses = motoruAc();
    if (ses?.state === 'suspended') void ses.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', kilidiAc, { once: true });
  window.addEventListener('keydown', kilidiAc, { once: true });
  return () => {
    window.removeEventListener('pointerdown', kilidiAc);
    window.removeEventListener('keydown', kilidiAc);
  };
}

export function canCal(): void {
  const ses = motoruAc();
  if (!ses) return;
  if (ses.state === 'running') {
    vur(ses);
    return;
  }
  void ses.resume().then(() => vur(ses)).catch(() => {});   // kilit açılmıyorsa sessiz kalır, hata vermez
}

// Çanın vuruşu: iki sinüs dalgası, yumuşak giriş, uzun sönüm.
function vur(ses: AudioContext): void {
  const simdi = ses.currentTime;

  const suzgec = ses.createBiquadFilter();
  suzgec.type = 'lowpass';
  suzgec.frequency.value = SUZGEC_HZ;

  const kisiklik = ses.createGain();
  kisiklik.gain.value = KISIKLIK;
  suzgec.connect(kisiklik).connect(ses.destination);

  for (const nota of NOTALAR) {
    const dalga = ses.createOscillator();
    dalga.type = 'sine';                                                  // sinüs: en yumuşak dalga
    dalga.frequency.value = nota.hz;

    const sonum = ses.createGain();
    sonum.gain.setValueAtTime(0.0001, simdi);
    sonum.gain.exponentialRampToValueAtTime(nota.guc, simdi + 0.02);      // yumuşak vuruş: "çat" diye başlamaz
    sonum.gain.exponentialRampToValueAtTime(0.0001, simdi + SURE_SN);     // çan gibi söner

    dalga.connect(sonum).connect(suzgec);
    dalga.start(simdi);
    dalga.stop(simdi + SURE_SN + 0.05);
  }
}
