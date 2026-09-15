-- =====================================================================
-- 7 — ÇÖZÜM FOTOĞRAFI (teknisyen "Çözdüm" derken isteğe bağlı fotoğraf — Blueprint · 3.2)
--
-- work_orders'a bir sütun: resolved_photo_path. Kural (KURAL 5'in güncellenmiş hali):
--   * Çözüm fotoğrafı yalnızca "Çözdüm" derken eklenir; sonradan değişmez (çözülen iş kilitlidir).
--   * Yol otelin klasörüyle başlar: <hotel_id>/resolutions/<is_emri_id>.jpg
--   * Fotoğraf depoda gerçekten olmalı (önce fotoğraf, sonra kayıt).
-- Kuralın geri kalanı olduğu gibi korunur.
-- =====================================================================

alter table public.work_orders
  add column resolved_photo_path text check (length(resolved_photo_path) <= 200);

create or replace function public.is_emri_kurali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ben uuid := auth.uid();
  v_rol text := public.rol_nedir(old.hotel_id);
begin
  if old.status = 'resolved' then
    raise exception 'Çözülmüş iş emri değiştirilemez.';
  end if;

  if new.id <> old.id
     or new.hotel_id <> old.hotel_id
     or new.room_id <> old.room_id
     or new.issue_report_id is distinct from old.issue_report_id
     or new.created_at <> old.created_at then
    raise exception 'İş emrinin kimliği, oteli, odası ve açılış saati değiştirilemez.';
  end if;

  -- "Çözdüm" imzası: yalnızca atanan kişi; kim + saat veritabanı yazar
  if new.status = 'resolved' then
    if v_ben is null or old.assigned_to is distinct from v_ben then
      raise exception 'Yalnızca size atanmış iş emrini çözebilirsiniz.';
    end if;
    new.resolved_by := v_ben;
    new.resolved_at := now();
  else
    new.resolved_by := null;
    new.resolved_at := null;
  end if;

  -- Çözüm fotoğrafı: yalnızca "Çözdüm" derken, otelin klasöründe, depoda var
  if new.resolved_photo_path is distinct from old.resolved_photo_path then
    if new.status <> 'resolved' then
      raise exception 'Çözüm fotoğrafı yalnızca "Çözdüm" derken eklenir.';
    end if;
    if new.resolved_photo_path is not null
       and (new.resolved_photo_path not like new.hotel_id::text || '/resolutions/%'
            or not exists (select 1 from storage.objects
                            where bucket_id = 'photos' and name = new.resolved_photo_path)) then
      raise exception 'Fotoğraf yüklenmeden çözüm yazılamaz.';
    end if;
  end if;

  -- Müdür / sahip
  if v_rol in ('manager', 'owner') then
    if new.assigned_to is not null
       and new.assigned_to is distinct from old.assigned_to
       and not exists (select 1 from public.memberships m
                        where m.hotel_id = new.hotel_id and m.user_id = new.assigned_to) then
      raise exception 'Atanan kişi bu otelin üyesi olmalı.';
    end if;
    return new;
  end if;

  -- Görevli: tür ve süreye dokunamaz
  if new.severity <> old.severity or new.due_at <> old.due_at then
    raise exception 'Bu iş emrinde bu değişikliği yapma yetkiniz yok.';
  end if;

  -- Görevli: "Aldım" = sahipsiz iş → kendisi. Başka atama yapamaz.
  if new.assigned_to is distinct from old.assigned_to then
    if old.assigned_to is not null or new.assigned_to is distinct from v_ben then
      raise exception 'Bu iş emrinde bu değişikliği yapma yetkiniz yok.';
    end if;
  end if;

  -- Görevli: durum yalnızca ileri gider (aldım → çözdüm)
  if new.status is distinct from old.status then
    if new.status = 'in_progress' and new.assigned_to = v_ben then
      null;
    elsif new.status = 'resolved' then
      null;   -- yukarıda kontrol edildi
    else
      raise exception 'Bu iş emrinde bu değişikliği yapma yetkiniz yok.';
    end if;
  end if;

  return new;
end;
$$;
