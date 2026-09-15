-- =====================================================================
-- 4 / 4 — FOTOĞRAFLAR (Supabase Storage)
--
-- Tek bir depo: "photos". Özel (public değil).
-- Her dosyanın yolu otelin kimliğiyle başlar:  <hotel_id>/deliveries/<id>.jpg
--                                               <hotel_id>/issues/<id>.jpg
-- Kilit aynı mantık: yalnızca o otelin üyeleri görür ve yükler.
-- Üzerine yazma ve silme YOK — fatura fotoğrafı da bir imzadır.
--
-- Kaynak: docs/security/001-rls-and-maker-checker.md (2.3 son satır, 4.4)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;


-- Yolun ilk parçasından oteli bulur. Yol bozuksa boş (null) döner → kilit kapalı kalır.
create function public.yol_oteli(p_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception
  when others then
    return null;
end;
$$;


create policy "uye kendi otelinin fotografini gorur" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.rol_nedir(public.yol_oteli(name)) is not null
  );

create policy "uye kendi otelinin klasorune yukler" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.rol_nedir(public.yol_oteli(name)) is not null
  );

-- update / delete kilidi bilerek yok: fotoğraf değiştirilemez, silinemez.
