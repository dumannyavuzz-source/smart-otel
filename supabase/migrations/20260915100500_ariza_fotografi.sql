-- =====================================================================
-- 6 — ARIZA FOTOĞRAFI KURALI
--
-- Arıza beyanında fotoğraf varsa (photo_path dolu):
--   * yol otelin klasörüyle başlamalı:  <hotel_id>/issues/…
--   * fotoğraf depoda gerçekten olmalı (önce fotoğraf yüklenir, sonra kayıt — 002 · B.6)
-- Teslim beyanındaki kuralın aynısı (kurallar.sql · KURAL 7 / 4.4). Kurcalanmış bir uygulama
-- başka otelin yolunu ya da var olmayan bir dosyayı yazamaz.
-- =====================================================================

create function public.ariza_fotografi_kurali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.photo_path is null then
    return new;
  end if;

  if new.photo_path not like new.hotel_id::text || '/issues/%'
     or not exists (select 1 from storage.objects
                     where bucket_id = 'photos' and name = new.photo_path) then
    raise exception 'Fotoğraf yüklenmeden arıza kaydı yazılamaz.';
  end if;

  return new;
end;
$$;

create trigger ariza_fotografi_kurali before insert on public.issue_reports
  for each row execute function public.ariza_fotografi_kurali();
