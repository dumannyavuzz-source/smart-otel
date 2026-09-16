-- =====================================================================
-- 9 — EKSİK/HASARLI TESLİM: KANIT ŞARTI  (Depo akışı — Aşama 17)
--
-- Depo görevlisi "10 Kg onaylandı ama 7 Kg geldi" diyorsa, aradaki fark bir iddiadır.
-- İddia kanıtsız kayda geçmez: fatura fotoğrafına EK OLARAK bir de eksik/hasar fotoğrafı ister
-- (çürük domatesin fotoğrafı). Tam gelen teslimde böyle bir şart yoktur.
--
-- Ayrıca: teslim ekranının "kaç bekliyoruz?" sorusunu sorabilmesi için depo görevlisi,
-- ONAYLANMIŞ talebin onay kaydını (kaç adet onaylandı) görebilmelidir.
--
-- Kaynak: docs/ux/004-depo-teslimat-akisi.md · PROJECT_BLUEPRINT.md · 3.3
-- =====================================================================

alter table public.deliveries
  add column damage_photo_path text check (length(damage_photo_path) between 1 and 200);


-- ---------------------------------------------------------------------
-- Teslim kuralı (KURAL 7'nin yenisi). Öncekilerin hepsi yerinde:
--   Kilit 3  Onaysız teslim olmaz
--   Kilit 4  Teslim alan ≠ Onaylayan  ve  Teslim alan ≠ Talep eden
--   4.4      Fatura fotoğrafı ÖNCE yüklenmiş olmalı
--   4.3      Düzeltme, aynı talebin bir teslimini işaret eder
-- YENİ:
--   Eksik teslimde (gelen < onaylanan) hasar fotoğrafı da ÖNCE yüklenmiş olmalı.
-- ---------------------------------------------------------------------
create or replace function public.teslim_kurali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ben        uuid := auth.uid();
  v_talep      record;
  v_onaylayan  uuid;
  v_onaylanan  integer;
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

  select created_by, approved_quantity into v_onaylayan, v_onaylanan
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

  -- Eksik geldiyse kanıt ister: eksiği/çürüğü gösteren fotoğraf.
  if new.received_quantity < coalesce(v_onaylanan, 0) then
    if new.damage_photo_path is null then
      raise exception 'Eksik teslimde eksik/hasar fotoğrafı da gerekir.';
    end if;
    if new.damage_photo_path not like new.hotel_id::text || '/deliveries/%'
       or not exists (select 1 from storage.objects
                       where bucket_id = 'photos' and name = new.damage_photo_path) then
      raise exception 'Eksik/hasar fotoğrafı yüklenmeden teslim yazılamaz.';
    end if;
  end if;

  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- Depo görevlisi, teslim alacağı talebin onay kaydını görür (kaç adet onaylandı?).
-- Yalnızca ONAYLANMIŞ/TESLİM EDİLMİŞ talepler için; bekleyen talebin kararı yine yalnızca müdürdedir.
-- ---------------------------------------------------------------------
create policy "uye onaylanmis talebin kararini gorur" on public.approvals
  for select to authenticated
  using (
    public.rol_nedir(hotel_id) is not null
    and exists (
      select 1 from public.purchase_requests t
      where t.id = approvals.purchase_request_id
        and t.hotel_id = approvals.hotel_id
        and t.status in ('approved', 'delivered')
    )
  );
