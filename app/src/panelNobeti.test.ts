// Panel nöbetçisi: müdür panelin hangi ekranında olursa olsun 30 saniyede bir sorar ve
// YENİ bir kırmızı alarm düşerse çan çalar. Burada sunucu ve ses kartı sahtedir; denenen kural budur.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface SahteAlarm {
  gecikenler: { id: string }[];
  mutsuzMisafirler: { id: string }[];
  uyusmazliklar: { id: string }[];
  bekleyenOnay: number;
  acikIs: number;
}

// Sunucunun vereceği cevap: testler bunu değiştirerek "yeni alarm düştü" der.
const sunucu = vi.hoisted(() => ({
  cevap: { gecikenler: [], mutsuzMisafirler: [], uyusmazliklar: [], bekleyenOnay: 0, acikIs: 0 } as SahteAlarm,
}));
vi.mock('./panel', () => ({ alarmlar: async () => sunucu.cevap }));

// Sahte ses kartı: yalnızca kaç nota çalındığını sayar (bir çan vuruşu = iki nota).
function sahteSesKarti() {
  const sayac = { nota: 0 };
  const bagla = { connect: (hedef: unknown) => hedef };
  class Motor {
    state = 'running';
    currentTime = 0;
    async resume() {}
    createOscillator() {
      sayac.nota++;
      return { ...bagla, type: '', frequency: { value: 0 }, start() {}, stop() {} };
    }
    createGain() {
      return { ...bagla, gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } };
    }
    createBiquadFilter() {
      return { ...bagla, type: '', frequency: { value: 0 } };
    }
    destination = {};
  }
  return { Yapici: Motor as unknown as typeof AudioContext, sayac };
}

async function nobetKur() {
  const ses = sahteSesKarti();
  vi.stubGlobal('window', {
    AudioContext: ses.Yapici,
    setInterval: (isle: () => void, ms: number) => globalThis.setInterval(isle, ms),
    clearInterval: (sayac: number) => globalThis.clearInterval(sayac),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.resetModules();
  const { panelNobetiniBaslat } = await import('./panelNobeti');
  return { ses, panelNobetiniBaslat };
}

const gecikenler = (...idler: string[]): SahteAlarm => ({
  gecikenler: idler.map((id) => ({ id })),
  mutsuzMisafirler: [],
  uyusmazliklar: [],
  bekleyenOnay: 0,
  acikIs: idler.length,
});

describe('Panel nöbetçisi ve çan', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('panel ilk açıldığında çalmaz — oradaki alarmları müdür zaten görüyor', async () => {
    sunucu.cevap = gecikenler('1', '2');
    const { ses, panelNobetiniBaslat } = await nobetKur();
    const durdur = panelNobetiniBaslat('otel-1');
    await vi.advanceTimersByTimeAsync(0);

    expect(ses.sayac.nota).toBe(0);
    durdur();
  });

  it('yeni bir kırmızı alarm düşünce bir kez çalar, aynı alarm için bir daha çalmaz', async () => {
    sunucu.cevap = gecikenler('1');
    const { ses, panelNobetiniBaslat } = await nobetKur();
    const durdur = panelNobetiniBaslat('otel-1');
    await vi.advanceTimersByTimeAsync(0);

    sunucu.cevap = gecikenler('1', '2');                 // 30 saniye sonra yeni bir iş gecikti
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ses.sayac.nota).toBe(2);                      // tek vuruş = iki nota

    await vi.advanceTimersByTimeAsync(30_000);           // aynı liste tekrar geldi
    expect(ses.sayac.nota).toBe(2);                      // sessiz kalır
    durdur();
  });

  it('onaylandığı gibi gelmeyen teslim de çan çaldırır — Genel Müdür talebi', async () => {
    sunucu.cevap = gecikenler();
    const { ses, panelNobetiniBaslat } = await nobetKur();
    const durdur = panelNobetiniBaslat('otel-1');
    await vi.advanceTimersByTimeAsync(0);

    sunucu.cevap = { gecikenler: [], mutsuzMisafirler: [], uyusmazliklar: [{ id: 'teslim-1' }], bekleyenOnay: 0, acikIs: 0 };
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ses.sayac.nota).toBe(2);
    durdur();
  });

  it('mutsuz misafir yorumu da çan çaldırır', async () => {
    sunucu.cevap = gecikenler();
    const { ses, panelNobetiniBaslat } = await nobetKur();
    const durdur = panelNobetiniBaslat('otel-1');
    await vi.advanceTimersByTimeAsync(0);

    sunucu.cevap = { gecikenler: [], mutsuzMisafirler: [{ id: 'yorum-1' }], uyusmazliklar: [], bekleyenOnay: 0, acikIs: 0 };
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ses.sayac.nota).toBe(2);
    durdur();
  });

  it('bekleyen onay (sarı) çan çaldırmaz — çan yalnızca kırmızı içindir', async () => {
    sunucu.cevap = gecikenler();
    const { ses, panelNobetiniBaslat } = await nobetKur();
    const durdur = panelNobetiniBaslat('otel-1');
    await vi.advanceTimersByTimeAsync(0);

    sunucu.cevap = { gecikenler: [], mutsuzMisafirler: [], uyusmazliklar: [], bekleyenOnay: 5, acikIs: 3 };
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ses.sayac.nota).toBe(0);
    durdur();
  });

  it('nöbet durunca sorular da durur', async () => {
    sunucu.cevap = gecikenler('1');
    const { ses, panelNobetiniBaslat } = await nobetKur();
    const durdur = panelNobetiniBaslat('otel-1');
    await vi.advanceTimersByTimeAsync(0);
    durdur();

    sunucu.cevap = gecikenler('1', '2');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(ses.sayac.nota).toBe(0);                      // çıkış yapıldı: ses yok
  });
});
