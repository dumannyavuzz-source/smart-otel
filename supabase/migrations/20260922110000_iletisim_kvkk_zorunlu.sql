-- =====================================================================
-- İLETİŞİM FORMU: ONAYSIZ MESAJ KABUL EDİLMEZ  (denetim · Madde 13 — 2/2)
--
-- Birinci dosya sütunu ekledi. Bu dosya kuralı koyar: onay kutusu işaretlenmeden gelen yeni mesaj
-- veritabanı tarafından reddedilir. Böylece kural yalnızca tarayıcıda değil, SUNUCUDA da durur —
-- betiği değiştirip formu atlatan biri de geçemez.
--
-- NE ZAMAN ÇALIŞTIRILIR: vitrinin yeni sürümü (onay kutusu olan sürüm) canlıya çıktıktan sonra.
-- Önce çalıştırılırsa eski sürümden gelen mesajlar reddedilir (dağıtım listesi · 6.19).
--
-- "not valid" ne demek: kural YALNIZCA bundan sonra eklenecek satırlara bakar. Geçmişteki mesajlar
-- (kvkk_onay = null) olduğu gibi kalır, tablo yeniden taranmaz. Geçmişe onay uydurmuyoruz.
-- =====================================================================

alter table public.iletisim_formu
  drop constraint if exists iletisim_formu_kvkk_onay_check;

alter table public.iletisim_formu
  add constraint iletisim_formu_kvkk_onay_check
  check (kvkk_onay is true)
  not valid;
