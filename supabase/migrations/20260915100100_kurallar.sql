-- =====================================================================
-- 2 / 4 — KURALLAR (trigger'lar)
--
-- Kural = bir kayıt yazılırken/değiştirilirken veritabanının OTOMATİK yaptığı
-- kontrol. Tutmazsa kaydı reddeder. Ekran ne derse desin.
--
-- Kaynak: docs/security/001-rls-and-maker-checker.md
--   Kural 1  Beyanlar değiştirilemez, silinemez ................ (4.2)
--   Kural 2  "Kim" ve "ne zaman"ı veritabanı yazar ............. (2.8, 4.1)
--   Kural 3  Bir kaydın oteli değiştirilemez .................... (2.7)
--   Kural 4  Arıza bildirilince iş emri açılır (SLA) ............ (002 · A.8, B.5)
--   Kural 5  İş emrinde kim neyi değiştirebilir ................. (2.5)
--   Kural 6  Onay: Maker-Checker ................................ (3.2, 3.3, 3.4)
--   Kural 7  Teslim: üç adım, üç kişi + fotoğraf şart ........... (3.4, 3.5, 4.4)
--
-- Not: Kural fonksiyonları "security definer"dır — başka tablolara (talep, onay,
-- fotoğraf) kilide takılmadan bakabilsinler diye. Kim olduğunu yine karttan okurlar.
-- =====================================================================


-- ---------------------------------------------------------------------
-- KURAL 1 — Beyanlar değiştirilemez, silinemez. Hiçbir rol için istisna yok.
-- Ana anahtar (service role) kilitleri atlar ama bu kuralı atlayamaz.
-- ---------------------------------------------------------------------
create function public.beyan_kilidi()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Beyanlar değiştirilemez veya silinemez.';
end;
$$;

create trigger beyan_kilidi before update or delete on public.room_cleanings for each row execute function public.beyan_kilidi();
create trigger beyan_kilidi before update or delete on public.supply_reports for each row execute function public.beyan_kilidi();
create trigger beyan_kilidi before update or delete on public.issue_reports  for each row execute function public.beyan_kilidi();
create trigger beyan_kilidi before update or delete on public.approvals      for each row execute function public.beyan_kilidi();
create trigger beyan_kilidi before update or delete on public.deliveries     for each row execute function public.beyan_kilidi();
create trigger beyan_kilidi before update or delete on public.guest_feedback for each row execute function public.beyan_kilidi();


-- ---------------------------------------------------------------------
-- KURAL 2 — "Kim yazdı" ve "ne zaman"ı telefon değil, veritabanı yazar.
-- Telefon bir değer gönderse bile üzerine yazılır. Giriş yoksa yazılamaz.
-- ---------------------------------------------------------------------
create function public.yazani_doldur()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş gerekli.';
  end if;
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

create trigger yazani_doldur before insert on public.room_cleanings    for each row execute function public.yazani_doldur();
create trigger yazani_doldur before insert on public.supply_reports    for each row execute function public.yazani_doldur();
create trigger yazani_doldur before insert on public.issue_reports     for each row execute function public.yazani_doldur();
create trigger yazani_doldur before insert on public.purchase_requests for each row execute function public.yazani_doldur();
create trigger yazani_doldur before insert on public.approvals         for each row execute function public.yazani_doldur();

-- Teslim beyanında imza alanlarının adı farklıdır: received_by / received_at
create function public.teslim_alani_doldur()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'Bu işlem için giriş gerekli.';
  end if;
  new.received_by := auth.uid();
  new.received_at := now();
  return new;
end;
$$;

create trigger teslim_alani_doldur before insert on public.deliveries for each row execute function public.teslim_alani_doldur();


-- ---------------------------------------------------------------------
-- KURAL 3 — Bir kaydın oteli değiştirilemez (değişebilen tablolar için).
-- ---------------------------------------------------------------------
create function public.otel_degismez()
returns trigger
language plpgsql
as $$
begin
  if new.hotel_id <> old.hotel_id then
    raise exception 'Bir kaydın oteli değiştirilemez.';
  end if;
  return new;
end;
$$;

create trigger otel_degismez before update on public.rooms               for each row execute function public.otel_degismez();
create trigger otel_degismez before update on public.checklist_templates for each row execute function public.otel_degismez();
create trigger otel_degismez before update on public.products            for each row execute function public.otel_degismez();
create trigger otel_degismez before update on public.suppliers           for each row execute function public.otel_degismez();


-- ---------------------------------------------------------------------
-- KURAL 4 — Arıza bildirilince iş emri açılır. Son süre:
--   acil → +30 dakika, normal → +2 saat.
-- Süre, arızanın BİLDİRİLDİĞİ saatten sayar (telefon saati). Telefonun saati
-- saçmaysa (24 saatten eski veya gelecekte) sunucu saati kullanılır. (002 · B.5)
-- Düzeltme kayıtları (corrects_id dolu) yeni iş emri açmaz.
-- ---------------------------------------------------------------------
create function public.ariza_is_emri_acar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bildirim_saati timestamptz;
begin
  if new.corrects_id is not null then
    return new;
  end if;

  v_bildirim_saati := new.created_at;
  if new.created_at_device is not null
     and new.created_at_device between now() - interval '24 hours' and now() + interval '5 minutes' then
    v_bildirim_saati := new.created_at_device;
  end if;

  insert into public.work_orders (hotel_id, room_id, issue_report_id, severity, due_at)
  values (
    new.hotel_id,
    new.room_id,
    new.id,
    new.severity,
    v_bildirim_saati + case when new.severity = 'urgent' then interval '30 minutes' else interval '2 hours' end
  );
  return new;
end;
$$;

create trigger ariza_is_emri_acar after insert on public.issue_reports for each row execute function public.ariza_is_emri_acar();


-- ---------------------------------------------------------------------
-- KURAL 5 — İş emrinde kim neyi değiştirebilir?
--   * Çözülmüş iş emri: kimse, hiçbir şey.
--   * Kimlik, otel, oda, bağlı arıza, açılış saati: kimse.
--   * "Çözdüm": yalnızca işin ATANDIĞI kişi. Kim + saat veritabanınca yazılır.
--   * Görevli (staff): yalnızca "Aldım" (sahipsiz iş → kendisi) ve "Çözdüm".
--   * Müdür/sahip: iş açıkken tür, son süre, atanan (atanan otelin üyesi olmalı).
-- ---------------------------------------------------------------------
create function public.is_emri_kurali()
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

create trigger is_emri_kurali before update on public.work_orders for each row execute function public.is_emri_kurali();


-- ---------------------------------------------------------------------
-- KURAL 6 — ONAY (Maker-Checker)
--   Kilit 1  Onaylayan ≠ Talep eden
--   Kilit 2  Onaylayan bu otelde müdür veya sahip
--   Kilit 3  Talep hâlâ "pending" (tek karar, sıra bozulmaz)
-- Onaylayanın kim olduğu KARTTAN okunur; telefonun sözü sayılmaz.
-- ---------------------------------------------------------------------
create function public.onay_kurali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ben   uuid := auth.uid();
  v_talep record;
begin
  if v_ben is null then
    raise exception 'Bu işlem için giriş gerekli.';
  end if;

  select created_by, status into v_talep
  from public.purchase_requests
  where id = new.purchase_request_id and hotel_id = new.hotel_id;

  if not found then
    raise exception 'Talep bulunamadı.';
  end if;

  if coalesce(public.rol_nedir(new.hotel_id), '') not in ('manager', 'owner') then
    raise exception 'Yalnızca müdür veya sahip onaylayabilir.';
  end if;

  if v_talep.created_by = v_ben then
    raise exception 'Talep eden kendi talebini onaylayamaz.';
  end if;

  if v_talep.status <> 'pending' then
    raise exception 'Bu talep için karar zaten verildi.';
  end if;

  return new;
end;
$$;

create trigger onay_kurali before insert on public.approvals for each row execute function public.onay_kurali();

-- Onay yazılınca talebin durumunu KURAL ilerletir (el değmez)
create function public.onay_sonrasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.purchase_requests
  set status = new.decision            -- 'approved' veya 'rejected'
  where id = new.purchase_request_id;
  return new;
end;
$$;

create trigger onay_sonrasi after insert on public.approvals for each row execute function public.onay_sonrasi();


-- ---------------------------------------------------------------------
-- KURAL 7 — TESLİM (imza)
--   Kilit 3  Onaysız teslim olmaz
--   Kilit 4  Teslim alan ≠ Onaylayan  ve  Teslim alan ≠ Talep eden
--   4.4      Fatura fotoğrafı ÖNCE yüklenmiş olmalı (kayıt varsa fotoğrafı da vardır)
--   4.3      Düzeltme, aynı talebin bir teslimini işaret eder
-- ---------------------------------------------------------------------
create function public.teslim_kurali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ben        uuid := auth.uid();
  v_talep      record;
  v_onaylayan  uuid;
  v_eski_talep uuid;
begin
  if v_ben is null then
    raise exception 'Bu işlem için giriş gerekli.';
  end if;

  select created_by, status into v_talep
  from public.purchase_requests
  where id = new.purchase_request_id and hotel_id = new.hotel_id;

  if not found then
    raise exception 'Talep bulunamadı.';
  end if;

  if v_talep.status not in ('approved', 'delivered') then
    raise exception 'Onaylanmamış talep teslim alınamaz.';
  end if;

  if v_talep.status = 'delivered' and new.corrects_id is null then
    raise exception 'Bu talep zaten teslim alındı. Yanlışsa düzeltme kaydı yazın.';
  end if;

  select created_by into v_onaylayan
  from public.approvals
  where purchase_request_id = new.purchase_request_id;

  if v_onaylayan = v_ben then
    raise exception 'Onaylayan kişi teslim alamaz.';
  end if;

  if v_talep.created_by = v_ben then
    raise exception 'Talep eden kişi teslim alamaz.';
  end if;

  if new.corrects_id is not null then
    select purchase_request_id into v_eski_talep
    from public.deliveries
    where id = new.corrects_id;
    if v_eski_talep is distinct from new.purchase_request_id then
      raise exception 'Düzeltme, aynı talebin teslimini işaret etmeli.';
    end if;
  end if;

  if new.invoice_photo_path not like new.hotel_id::text || '/deliveries/%'
     or not exists (select 1 from storage.objects
                     where bucket_id = 'photos' and name = new.invoice_photo_path) then
    raise exception 'Fatura fotoğrafı yüklenmeden teslim yazılamaz.';
  end if;

  return new;
end;
$$;

create trigger teslim_kurali before insert on public.deliveries for each row execute function public.teslim_kurali();

-- Teslim yazılınca talebin durumunu KURAL ilerletir
create function public.teslim_sonrasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.purchase_requests
  set status = 'delivered'
  where id = new.purchase_request_id;
  return new;
end;
$$;

create trigger teslim_sonrasi after insert on public.deliveries for each row execute function public.teslim_sonrasi();
