-- =====================================================================
-- KAYIT KAPISI: KULLANIM ŞARTLARI VE KVKK ONAYI SAKLANIYOR  (karar 026 — 1/2)
--
-- Genel Müdür kararı (2026-09-22): "Yasal onayın en kritik olduğu yer, kullanıcının sisteme
-- dahil olduğu hesap açılış anıdır." Vitrindeki iletişim formunda onay kutusu zaten vardı
-- (karar 021); artık otel hesabı açılırken de var ve işaret kaydediliyor.
-- Böylece elimizde "şu otel, şu tarihte, açık bir hareketle onay verdi" kaydı oluyor:
-- onayın kendisi bu sütun, zamanı ise satırın created_at değeridir.
--
-- Bu dosya İKİ ADIMIN BİRİNCİSİDİR ve bilerek YUMUŞAKTIR:
--   · Sütun eklenir, başka hiçbir şey değişmez. Onay ZORUNLU KILINMAZ.
--   · Sebebi sıra sorunudur: bu göç çalıştığında uygulamanın ESKİ sürümü hâlâ canlıda olabilir
--     ve o sürüm bu alanı göndermez. Zorunluluk şimdi konsaydı, yeni sürüm yayına girene kadar
--     kaydolmak isteyen herkes kapıda kalırdı.
--   · Zorunluluğu ikinci dosya koyar: …_kayit_sartlar_zorunlu.sql — o da uygulamanın yeni sürümü
--     canlıya çıktıktan SONRA çalıştırılır (dağıtım listesi · 6.24).
--
-- SIRA ÖNEMLİ: önce bu göç, sonra kapı (otel-ac) ve uygulama yayını, en son ikinci göç.
-- Kapı bu sütun yokken yayınlanırsa otel açılamaz — sütun bulunamaz.
--
-- Eski oteller: onay bilgisi yoktur, öyle de kalır (null = "bilinmiyor"). Geçmişe onay uydurmayız.
-- Uygulanmış göç dosyalarına dokunulmaz; değişiklik her zaman yeni dosyayla yapılır.
--
-- Kaynak: docs/decisions/026-kayit-ekraninda-onay-kutusu.md
-- =====================================================================

alter table public.hotels
  add column if not exists sartlar_onayi boolean;

comment on column public.hotels.sartlar_onayi is
  'Oteli açan kişi Kullanım Şartları ve KVKK Aydınlatma Metni kutusunu işaretledi mi? Onay anı = created_at. null = bu alan eklenmeden önce açılmış eski otel.';
