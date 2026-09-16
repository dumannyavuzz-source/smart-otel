-- =====================================================================
-- 11 — FATURA GİZLİLİĞİ  (Aşama 17.2 · Genel Müdür talimatı)
--
-- Sorun: fotoğraf deposunun kilidi "bu otelin üyesi mi?" diye soruyordu, "kim?" diye sormuyordu.
-- Yani kat görevlisi de otelin BÜTÜN fatura fotoğraflarını açabiliyordu.
-- Fatura fotoğrafı tedarikçi fiyatı demektir; ayrıca 17.1'den beri bu fotoğraflar birer DENETİM KANITIDIR.
-- Kanıtı, denetlenen herkesin görmesi doğru değildir.
--
-- Yeni kural (yalnızca `<otel>/deliveries/` klasörü için):
--   * Müdür ve sahip: otelin bütün fatura ve kanıt fotoğraflarını görür (panelde uyuşmazlığa bakar).
--   * Depo görevlisi: YALNIZCA kendi yüklediğini görür — başkasının teslimini göremez.
--   * Diğer personel (kat görevlisi, teknisyen): hiçbirini göremez.
--
-- Arıza fotoğrafları (`<otel>/issues/`) eskisi gibi kalır: teknisyenin arızayı görmesi gerekir.
-- Yükleme kuralı da değişmez: otelin her üyesi kendi otelinin klasörüne yükleyebilir
-- (depo görevlisi teslim alırken fatura fotoğrafı yükleyebilmelidir).
--
-- Kaynak: docs/security/003-kesirli-miktar-ve-uyusmazlik.md · Açık 1
-- =====================================================================

-- Yolun ikinci parçası: "<otel>/deliveries/<dosya>" → "deliveries"
create function public.yol_klasoru(p_name text)
returns text
language sql
immutable
as $$
  select split_part(p_name, '/', 2);
$$;

revoke all on function public.yol_klasoru(text) from public;
grant execute on function public.yol_klasoru(text) to anon, authenticated, service_role;


-- Eski geniş kural kaldırılır. (Kurallar birbirine EKLENİR: eskisi kalsaydı yenisi hiçbir şeyi
-- kapatmazdı — kat görevlisi yine eski kuraldan geçip fotoğrafı görürdü.)
drop policy "uye kendi otelinin fotografini gorur" on storage.objects;

-- 1) Fatura/kanıt dışındaki fotoğraflar: eskisi gibi, otelin her üyesi görür (arıza fotoğrafı).
create policy "uye otelinin fotografini gorur" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.rol_nedir(public.yol_oteli(name)) is not null
    and public.yol_klasoru(name) <> 'deliveries'
  );

-- 2) Fatura ve kanıt fotoğrafları: müdür, sahip ve fotoğrafı yükleyen kişi.
create policy "teslim fotografini mudur ve yukleyen gorur" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.yol_klasoru(name) = 'deliveries'
    and (
      public.rol_nedir(public.yol_oteli(name)) in ('manager', 'owner')
      or owner = (select auth.uid())
    )
  );
