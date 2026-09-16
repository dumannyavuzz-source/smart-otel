-- =====================================================================
-- 10 — KESİRLİ MİKTAR  (Aşama 17.1)
--
-- Otel mutfağına "7,5 Kg domates" ya da "1,2 Litre süt" gelir. Miktar artık tam sayı değildir.
-- Zincirin ÜÇ halkası da birden değişir — yoksa 7,5 Kg istenir, 7 Kg onaylanır, karşılaştırma yalan söyler:
--   talep (purchase_requests.quantity) · onay (approvals.approved_quantity) · teslim (deliveries.received_quantity)
-- Personelin "eksik var" beyanı (supply_reports.quantity) da aynı sayıdır, o da değişir.
--
-- numeric(8,2) niçin? En çok 999999,99 yazılabilir ve iki ondalık tutulur.
-- "7,456 Kg" diye bir şey yoktur: veritabanı onu 7,46'ya yuvarlar. Tartı da zaten o kadarını gösterir.
--
-- Kaynak: docs/decisions/004-kesirli-miktar.md · PROJECT_BLUEPRINT.md · 3.3
-- =====================================================================

alter table public.supply_reports    alter column quantity          type numeric(8,2);
alter table public.purchase_requests alter column quantity          type numeric(8,2);
alter table public.approvals         alter column approved_quantity type numeric(8,2);
alter table public.deliveries        alter column received_quantity type numeric(8,2);

-- Eski kurallar yerinde kalır: quantity > 0, approved_quantity >= 0,
-- "onaylandıysa > 0 · reddedildiyse = 0". Hepsi kesirli sayıyla da aynı şeyi söyler.


-- ---------------------------------------------------------------------
-- ÜST SINIR — ondalıklı sayının getirdiği açığı kapatır (Güvenlik denetimi, Aşama 17.1)
--
-- Tam sayıda imkânsız olan bir şey ondalıklı sayıda mümkündür: "sayı olmayan sayı" (NaN).
-- PostgreSQL NaN'ı BÜTÜN sayılardan büyük sayar. Yani üst sınır koymazsak:
--   * "miktar 0'dan büyük olmalı" kuralını NaN geçer,
--   * "gelen < onaylanan mı?" sorusu NaN için HAYIR der → eksik teslimde kanıt fotoğrafı istenmez.
-- Uygulamayı değil, doğrudan sunucu adresini kullanan bir personel bu yolla kanıt şartını atlatabilirdi.
--
-- Üst sınır ikisini birden keser: NaN ve sonsuz, "9999'dan küçük mü?" sorusunda kalır.
-- Sınır iş kuralı değildir, akıl sınırıdır: ekranlar zaten 999'da durur.
-- ---------------------------------------------------------------------
alter table public.supply_reports
  add constraint supply_reports_quantity_makul check (quantity <= 9999);

alter table public.purchase_requests
  add constraint purchase_requests_quantity_makul check (quantity <= 9999);

alter table public.approvals
  add constraint approvals_approved_quantity_makul check (approved_quantity <= 9999);

alter table public.deliveries
  add constraint deliveries_received_quantity_makul check (received_quantity <= 9999);


-- ---------------------------------------------------------------------
-- Teslim kuralı yeniden yazılır: karşılaştırılan miktar artık kesirli olabilir.
-- Kuralın kendisi değişmedi; yalnızca "onaylanan miktar" kutusunun tipi tam sayıdan
-- ondalıklıya çevrildi (integer → numeric). Aksi halde 7,5 Kg onay 7'ye yuvarlanır
-- ve "eksik geldi" kararı yanlış verilirdi.
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
  v_onaylanan  numeric;                      -- YENİ: kesirli olabilir (7,5 Kg)
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

  -- Hasar fotoğrafının yolu yazılmışsa GERÇEK olmalı — teslim eksik olsun olmasın.
  -- (Önceki sürüm bunu yalnızca eksik teslimde denetliyordu: "fazla geldi" kaydına
  --  bambaşka bir fotoğrafın yolu yazılabiliyor ve müdüre "kanıt" diye gösteriliyordu.)
  if new.damage_photo_path is not null
     and (new.damage_photo_path not like new.hotel_id::text || '/deliveries/%'
          or not exists (select 1 from storage.objects
                          where bucket_id = 'photos' and name = new.damage_photo_path)) then
    raise exception 'Eksik/hasar fotoğrafı yüklenmeden teslim yazılamaz.';
  end if;

  -- Eksik geldiyse kanıt ZORUNLUDUR: eksiği/çürüğü gösteren fotoğraf.
  if new.received_quantity < coalesce(v_onaylanan, 0) and new.damage_photo_path is null then
    raise exception 'Eksik teslimde eksik/hasar fotoğrafı da gerekir.';
  end if;

  return new;
end;
$$;
