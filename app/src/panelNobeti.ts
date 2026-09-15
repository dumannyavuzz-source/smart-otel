// Panel nöbeti — müdür panelin HANGİ ekranında olursa olsun, 30 saniyede bir "her şey yolunda mı?" diye sorar.
//
// Neden tek nöbetçi? Üç sebep:
//   1. Çan, müdür "Onaylar" ya da "Ürünler" ekranındayken de çalmalı (yeni alarm ekrandan bağımsızdır).
//   2. İki ekran aynı anda açıksa sunucuya iki kez sorulmasın.
//   3. "Bu alarmı duyurmuş muyduk?" hafızası tek yerde dursun.
// Panel internet ister (002 · B.8): bağlantı yoksa ekran bunu söyler ve bilginin ne kadar bayat olduğunu yazar.
import { useSyncExternalStore } from 'react';
import { alarmlar, type Alarmlar } from './panel';
import { cevrimici } from './olaylar';
import { alarmKimlikleri, canCal, yeniAlarmVarMi } from './ses';

const TAZELEME_MS = 30_000;

export interface PanelDurumu {
  veri: Alarmlar | null;
  hata: string | null;
  sonBakis: Date | null;      // en son ne zaman doğru bilgi aldık?
}

const BOS: PanelDurumu = { veri: null, hata: null, sonBakis: null };

let durum: PanelDurumu = BOS;
const dinleyiciler = new Set<() => void>();

function yaz(yeni: Partial<PanelDurumu>): void {
  durum = { ...durum, ...yeni };
  dinleyiciler.forEach((haberVer) => haberVer());
}

function saat(an: Date): string {
  return an.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Hata cümlesi ekrandaki bilginin bayatlığını da söyler: yeşil kutu yalan söylemesin.
function hataCumlesi(bas: string): string {
  return durum.sonBakis
    ? `${bas} Ekrandaki bilgi saat ${saat(durum.sonBakis)} itibarıyla.`
    : `${bas} Bağlanınca kendiliğinden gelecek.`;
}

// Nöbeti başlatır, durdurma işlevini döndürür. Müdür girişteyken App bir kez çağırır.
export function panelNobetiniBaslat(otelId: string): () => void {
  let durduruldu = false;

  const sor = async () => {
    if (durduruldu) return;
    if (!cevrimici()) {
      yaz({ hata: hataCumlesi('İnternet yok.') });
      return;
    }
    try {
      const yeniVeri = await alarmlar(otelId);
      if (durduruldu) return;
      yaz({ veri: yeniVeri, hata: null, sonBakis: new Date() });
      if (yeniAlarmVarMi(alarmKimlikleri(yeniVeri))) canCal();     // yeni kırmızı alarm: çan çalar
    } catch {
      if (!durduruldu) yaz({ hata: hataCumlesi('Bilgi alınamadı.') });
    }
  };

  const tazele = () => void sor();
  const kopdu = () => yaz({ hata: hataCumlesi('İnternet yok.') });   // beklemeden söyle

  tazele();
  const sayac = window.setInterval(tazele, TAZELEME_MS);
  window.addEventListener('online', tazele);
  window.addEventListener('offline', kopdu);

  return () => {
    durduruldu = true;
    window.clearInterval(sayac);
    window.removeEventListener('online', tazele);
    window.removeEventListener('offline', kopdu);
    durum = BOS;                                                    // sıradaki müdür temiz ekranla başlar
    dinleyiciler.forEach((haberVer) => haberVer());
  };
}

function abone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => {
    dinleyiciler.delete(dinleyici);
  };
}

// Ekranlar nöbetçinin son cevabını buradan okur.
export function usePanelVerisi(): PanelDurumu {
  return useSyncExternalStore(abone, () => durum, () => durum);
}
