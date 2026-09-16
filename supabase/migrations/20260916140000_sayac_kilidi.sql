-- =====================================================================
-- 14 — SAYAÇ KİLİDİ: EKSİK KALAN İKİ "REVOKE"  (Staging kurulumunda bulundu)
--
-- Bulgu: `revoke all ... from public` tek başına YETMİYOR.
-- Supabase, `public` şemasında açılan her yeni fonksiyona `anon` ve `authenticated`
-- rollerine AYRI AYRI çalıştırma yetkisi veriyor (varsayılan yetkiler). `public` rolünden
-- yetki almak, bu iki role verilmiş açık yetkiyi geri almıyor.
--
-- Sonuç: giriş yapmış herhangi bir personel kayıt sayacını (`kayit_denemesi_say_ve_yaz`)
-- doğrudan çağırabiliyordu. Sayaç tablosunu çöple doldurabilir, kayıt kapısının önündeki
-- tek korumayı yıpratabilirdi.
--
-- Doğru desen zaten projede vardı (misafir kapısı, `misafir_yorumu_yaz`):
--   revoke all ... from public, anon, authenticated;
--   grant execute ... to service_role;
-- Bu göç, aynı deseni eksik kalmış iki fonksiyona uygular.
--
-- Bu açığı canlı veritabanında çalıştırılan 24d numaralı güvenlik denemesi yakaladı.
-- Kaynak: docs/security/005-kayit-kapisi.md
-- =====================================================================

-- 1. Kayıt sayacı: YALNIZCA kayıt kapısı (ana anahtar) çağırabilir.
revoke all on function public.kayit_denemesi_say_ve_yaz(text) from public, anon, authenticated;
grant execute on function public.kayit_denemesi_say_ve_yaz(text) to service_role;

-- 2. "Başka otelde çalışıyor mu?" sorusu: girişli kullanıcı çağırabilir (kendi içinde
--    ayrıca müdür/sahip denetimi yapar), ama giriş yapmamış kimse çağıramaz.
revoke all on function public.baska_otelde_calisiyor_mu(uuid, uuid) from public, anon;
grant execute on function public.baska_otelde_calisiyor_mu(uuid, uuid) to authenticated, service_role;
