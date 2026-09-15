// Çan sesi ne zaman çalar, ne zaman susar?
// Sesin kendisi tarayıcıya aittir (testte tarayıcı yok); burada denenen kural şudur:
// "Panel her 30 saniyede aynı listeyi görüyor; ses YALNIZCA yeni bir alarm düşünce çalmalı."
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alarmKimlikleri, canCal, hafizayiUnut, sesiHazirla, yeniAlarmVarMi } from './ses';

const gecikenIs = (id: string) => ({ id });

describe('Yeni alarm var mı?', () => {
  beforeEach(() => hafizayiUnut());

  it('panel ilk açıldığında susar — ekrandaki alarmlar zaten biliniyor', () => {
    expect(yeniAlarmVarMi(['is:1', 'misafir:2'])).toBe(false);
  });

  it('aynı liste tekrar tekrar gelince susar (30 saniyelik tazelemeler)', () => {
    yeniAlarmVarMi(['is:1']);
    expect(yeniAlarmVarMi(['is:1'])).toBe(false);
    expect(yeniAlarmVarMi(['is:1'])).toBe(false);
  });

  it('listeye yeni bir alarm düşünce çalar', () => {
    yeniAlarmVarMi(['is:1']);
    expect(yeniAlarmVarMi(['is:1', 'is:2'])).toBe(true);
  });

  it('bir alarm çözülüp listeden düşünce çalmaz', () => {
    yeniAlarmVarMi(['is:1', 'is:2']);
    expect(yeniAlarmVarMi(['is:1'])).toBe(false);
  });

  it('çözülen alarm yeniden düşerse yeniden uyarır', () => {
    yeniAlarmVarMi(['is:1']);
    yeniAlarmVarMi([]);                          // çözüldü
    expect(yeniAlarmVarMi(['is:1'])).toBe(true); // yarın yine kırmızı: müdür yine duymalı
  });

  it('çıkıştan sonra sıradaki müdür devraldığı alarmlarla karşılanmaz', () => {
    yeniAlarmVarMi(['is:1']);
    hafizayiUnut();                              // çıkış yapıldı
    expect(yeniAlarmVarMi(['is:1', 'is:9'])).toBe(false);
  });
});

describe('Alarm kimlikleri', () => {
  it('işi ve misafiri ayırır — aynı numara iki kez sayılmaz', () => {
    const kimlikler = alarmKimlikleri({ gecikenler: [gecikenIs('abc')], mutsuzMisafirler: [{ id: 'abc' }] });
    expect(kimlikler).toEqual(['is:abc', 'misafir:abc']);
  });

  it('alarm yoksa liste boştur', () => {
    expect(alarmKimlikleri({ gecikenler: [], mutsuzMisafirler: [] })).toEqual([]);
  });
});

describe('Ses aygıtı olmayan yerde', () => {
  it('çalmaya çalışmak uygulamayı çökertmez', () => {
    expect(() => canCal()).not.toThrow();        // tarayıcı yok: sessizce vazgeçer
    expect(() => sesiHazirla()()).not.toThrow();
  });
});

// ---------------------------------------------------------------------
// Sesin kendisi: tarayıcı yerine sahte bir ses motoru koyup çanın NASIL kurulduğuna bakarız.
// Korunan kural: iki yumuşak nota, tizleri süzülmüş, kısık ve sönerek biten TEK vuruş. Siren değil.
// ---------------------------------------------------------------------
interface SahteNota {
  type: string;
  frequency: { value: number };
  basladi: number;
  durdu: number;
  sonum: number[];        // sesin gücü nereden nereye gitti
  sonumAni: number[];     // ve hangi saniyelerde
}

function sahteMotor() {
  const notalar: SahteNota[] = [];
  const kazanclar: number[] = [];
  const suzgecler: { type: string; hz: number }[] = [];

  const bagla = { connect: (hedef: unknown) => hedef };

  class SahteMotor {
    state = 'running';
    currentTime = 0;
    async resume() {
      this.state = 'running';
    }
    createOscillator() {
      const nota: SahteNota = { type: '', frequency: { value: 0 }, basladi: -1, durdu: -1, sonum: [], sonumAni: [] };
      notalar.push(nota);
      return {
        ...bagla,
        set type(t: string) { nota.type = t; },
        frequency: nota.frequency,
        start: (an: number) => { nota.basladi = an; },
        stop: (an: number) => { nota.durdu = an; },
      };
    }
    createGain() {
      const sonNota = () => notalar[notalar.length - 1];
      return {
        ...bagla,
        gain: {
          set value(v: number) { kazanclar.push(v); },
          setValueAtTime: (v: number, an: number) => { sonNota()?.sonum.push(v); sonNota()?.sonumAni.push(an); },
          exponentialRampToValueAtTime: (v: number, an: number) => { sonNota()?.sonum.push(v); sonNota()?.sonumAni.push(an); },
        },
      };
    }
    createBiquadFilter() {
      const suzgec = { type: '', hz: 0 };
      suzgecler.push(suzgec);
      return {
        ...bagla,
        set type(t: string) { suzgec.type = t; },
        frequency: { set value(hz: number) { suzgec.hz = hz; } },
      };
    }
    destination = {};
  }

  return { Yapici: SahteMotor as unknown as typeof AudioContext, notalar, kazanclar, suzgecler };
}

describe('Çanın vuruşu', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function cal() {
    const motor = sahteMotor();
    vi.stubGlobal('window', { AudioContext: motor.Yapici, addEventListener() {}, removeEventListener() {} });
    vi.resetModules();
    const { canCal } = await import('./ses');
    canCal();
    return motor;
  }

  it('iki yumuşak sinüs notası çalar — çan gibi, siren gibi değil', async () => {
    const motor = await cal();
    expect(motor.notalar.map((n) => n.frequency.value)).toEqual([660, 990]);
    expect(motor.notalar.every((n) => n.type === 'sine')).toBe(true);
  });

  it('tizleri süzer (tok ses) ve kısık çalar', async () => {
    const motor = await cal();
    expect(motor.suzgecler).toEqual([{ type: 'lowpass', hz: 1800 }]);
    expect(motor.kazanclar).toContain(0.18);              // %18 — konuşmayı bastırmaz
    expect(Math.max(...motor.kazanclar)).toBeLessThan(0.3);
  });

  it('yumuşak başlar ve iki saniyeden önce söner — tek vuruş, tekrar yok', async () => {
    const motor = await cal();
    for (const nota of motor.notalar) {
      expect(nota.sonum[0]).toBeLessThan(0.001);          // sessizlikten açılır: "çat" diye başlamaz
      expect(nota.sonumAni[1]).toBeCloseTo(0.02, 3);      // 20 ms'lik yumuşak vuruş
      expect(nota.sonum[nota.sonum.length - 1]).toBeLessThan(0.001);
      expect(nota.durdu).toBeLessThan(2);
    }
    expect(motor.notalar).toHaveLength(2);                // tek vuruş: iki nota, tekrarlayan bir ses yok
  });
});
