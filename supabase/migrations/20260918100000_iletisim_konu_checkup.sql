-- =====================================================================
-- İLETİŞİM FORMU: KONU LİSTESİNE "DİJİTAL CHECK-UP / ANALİZ"  (Vitrin · Sakin Lüks, UX denetimi)
--
-- Vitrindeki iletişim bölümü "Dijital check-up, satış kanalları ya da teknik altyapı — konuyu seçin"
-- diyor; ama konu listesinde dijital check-up yoktu. "Bilgi Al" düğmesinden gelen ziyaretçi kendi
-- konusunu bulamıyordu. Genel Müdür kararı (2026-09-18): "Dijital Check-up / Analiz" seçeneği eklenir.
--
-- Eski göç dosyasına dokunulmaz (uygulanmış göçler değişmez); kural burada yenilenir.
-- Eski beş değer olduğu gibi kalır: mevcut kayıtlar yeni kuralı da geçer, hiçbir satır reddedilmez.
-- Kısıt adı Postgres'in kendi verdiği addır: <tablo>_<sütun>_check.
-- =====================================================================

alter table public.iletisim_formu
  drop constraint if exists iletisim_formu_konu_check;

alter table public.iletisim_formu
  add constraint iletisim_formu_konu_check
  check (konu in ('Dijital Check-up / Analiz', 'Teknik Altyapı', 'OTA & Dijital Yönetim', 'Web Sitesi', 'SEO', 'Diğer'));
