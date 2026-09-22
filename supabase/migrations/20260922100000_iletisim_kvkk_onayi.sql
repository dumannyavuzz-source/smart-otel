-- =====================================================================
-- İLETİŞİM FORMU: KVKK ONAYI ARTIK SAKLANIYOR  (denetim · Madde 13 — 1/2)
--
-- Eskiden vitrindeki form "göndererek kabul etmiş olursunuz" diyordu: kimse bir şey işaretlemiyordu,
-- yani ZIMNİ onaydı. Artık ziyaretçi bir kutuyu işaretliyor ve bu işaret mesajla birlikte saklanıyor.
-- Böylece elimizde "şu kişi, şu tarihte, açık bir hareketle onay verdi" kaydı oluyor.
--
-- Bu dosya İKİ ADIMIN BİRİNCİSİDİR ve bilerek YUMUŞAKTIR:
--   · Sütun eklenir, ziyaretçiye bu sütuna yazma yetkisi verilir. Başka hiçbir yetki değişmez.
--   · Onay ZORUNLU KILINMAZ. Sebebi sıra sorunudur: bu göç çalıştığında vitrinin ESKİ sürümü hâlâ
--     canlıda olabilir ve o sürüm bu alanı göndermez. Zorunluluk şimdi konsaydı, yeni sürüm yayına
--     girene kadar gelen her mesaj reddedilirdi.
--   · Zorunluluğu ikinci dosya koyar: …_iletisim_kvkk_zorunlu.sql — o da vitrin canlıya çıktıktan
--     SONRA çalıştırılır (dağıtım listesi · 6.19).
--
-- Eski satırlar: onay bilgisi yoktur, öyle de kalır (null = "bilinmiyor"). Geçmişe onay uydurmayız.
-- Uygulanmış göç dosyalarına dokunulmaz; değişiklik her zaman yeni dosyayla yapılır.
--
-- Kaynak: docs/security/007-iletisim-formu.md · docs/decisions/021-iletisim-formu-kvkk-onayi.md
-- =====================================================================

alter table public.iletisim_formu
  add column if not exists kvkk_onay boolean;

comment on column public.iletisim_formu.kvkk_onay is
  'Ziyaretçi KVKK aydınlatma metni onay kutusunu işaretledi mi? null = bu alan eklenmeden önce gelen eski mesaj.';

-- Ziyaretçi (anon) yalnızca bu sütuna yazma yetkisi kazanır. Okuma, değiştirme, silme yine yok.
grant insert (kvkk_onay) on table public.iletisim_formu to anon;
