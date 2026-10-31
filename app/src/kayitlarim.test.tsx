// Kayıtlarım ve Tamam ekranı (karar 028): kim neyi görür, ekran neyi iddia eder?
// Tarayıcı yok; ekranın ilk hali sunucu tarafı çizimle (react-dom/server) okunur.
import { beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { kayitDeposu, kaydinFotograflari, kayitlariGrupla, kisininKayitlari, type Kayit } from './kayitDeposu';
import { TamamEkrani, sahibineDurum } from './ekranlar/TamamEkrani';
import { aktifKullaniciyiAyarla } from './kullanici';

let sira = 0;
function kayit(id: string, ek: Partial<Kayit> = {}): Kayit {
  return {
    id,
    sira: ++sira,
    yazanId: 'ayse',
    otelId: 'otel-1',
    tablo: 'room_cleanings',
    icerik: { id },
    ozet: id,
    olusturuldu: '2026-10-23T10:00:00.000Z',
    durum: 'bekliyor',
    deneme: 0,
    ...ek,
  };
}

beforeEach(async () => {
  sira = 0;
  aktifKullaniciyiAyarla('ayse', 'otel-1');
  await kayitDeposu.kayitlar.clear();
  await kayitDeposu.fotograflar.clear();
});

describe('Kayıtlarım', () => {
  it('yalnızca kişinin kendi kayıtları gelir; bölümlere doğru ayrılır', async () => {
    await kayitDeposu.kayitlar.bulkAdd([
      kayit('bekleyen'),
      kayit('belirsiz', { durum: 'belirsiz' }),
      kayit('digerOtel', { otelId: 'otel-2' }),
      kayit('otelsiz', { otelId: null }),
      kayit('ret', { durum: 'reddedildi', neden: 'Bu iş başkasında.' }),
      kayit('cakisma', { durum: 'cakisma' }),
      kayit('arsiv', { durum: 'reddedildi', arsivlendi: '2026-10-23T11:00:00.000Z' }),
      kayit('eskiTamam', { durum: 'tamamlandi', tamamlandi: '2026-10-22T10:00:00.000Z' }),
      kayit('yeniTamam', { durum: 'tamamlandi', tamamlandi: '2026-10-23T10:00:00.000Z' }),
      kayit('tamerin', { yazanId: 'tamer', durum: 'reddedildi' }),
    ]);

    const benim = await kisininKayitlari('ayse');
    expect(benim.map((k) => k.id)).not.toContain('tamerin');
    const g = kayitlariGrupla(benim, 'otel-1');
    expect(g.bekleyen.map((k) => k.id)).toEqual(['bekleyen', 'belirsiz']);
    expect(g.digerOtel.map((k) => k.id)).toEqual(['digerOtel', 'otelsiz']);
    expect(g.dikkat.map((k) => k.id)).toEqual(['ret', 'cakisma']);
    expect(g.arsiv.map((k) => k.id)).toEqual(['arsiv']);
    expect(g.tamamlanan.map((k) => k.id)).toEqual(['yeniTamam', 'eskiTamam']);
    expect(await kisininKayitlari(null)).toEqual([]);
  });

  it('fotoğraf önizlemesi yalnızca kaydın sahibine verilir', async () => {
    const k = kayit('ret', { durum: 'reddedildi', fotografYollari: ['otel-1/issues/ret.jpg'] });
    await kayitDeposu.kayitlar.add(k);
    await kayitDeposu.fotograflar.add({ yol: 'otel-1/issues/ret.jpg', veri: new Blob([new Uint8Array(2)]), yazanId: 'ayse', olusturuldu: '' });

    expect(await kaydinFotograflari(k, 'ayse')).toHaveLength(1);
    expect(await kaydinFotograflari(k, 'tamer')).toEqual([]);
    expect(await kaydinFotograflari(k, null)).toEqual([]);
  });
});

describe('Tamam ekranı', () => {
  function ciz(mesaj: string): string {
    return renderToString(
      <MemoryRouter initialEntries={[{ pathname: '/tamam', state: { mesaj, kayitId: 'x' } }]}>
        <Routes>
          <Route path="/tamam" element={<TamamEkrani />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('kayıt yeni yazıldığında "telefona kaydedildi" der; sunucuda tamamlandı İDDİA ETMEZ', () => {
    const html = ciz('Oda 204: temizlik kaydedildi');
    expect(html).toContain('Oda 204: temizlik kaydedildi');
    expect(html).toContain('Telefona kaydedildi');
    expect(html).not.toContain('Sunucuda tamamlandı');
    expect(html).not.toContain('✓');
  });

  it('ortak telefonda kişi değiştiyse kaydın geç gelen sonucu yeni kişiye gösterilmez', () => {
    const tamamlanan = kayit('x', { durum: 'tamamlandi' });
    const reddedilen = kayit('y', { durum: 'reddedildi' });
    expect(sahibineDurum(tamamlanan, 'ayse')).toBe('tamamlandi');
    expect(sahibineDurum(tamamlanan, 'mehmet')).toBeNull();
    expect(sahibineDurum(reddedilen, 'mehmet')).toBeNull();
    expect(sahibineDurum(tamamlanan, null)).toBeNull();
    expect(sahibineDurum(undefined, 'ayse')).toBeNull();
  });
});
