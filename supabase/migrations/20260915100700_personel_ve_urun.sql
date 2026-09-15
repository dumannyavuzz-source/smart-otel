-- =====================================================================
-- 8 — PERSONEL (ad + görev) ve ÜRÜN SINIRI  (Müdür Paneli — Aşama 16)
--
-- memberships:
--   name  → personelin adı (panelde ve listelerde göstermek için)
--   job   → görevlinin işi: housekeeping (kat görevlisi) / technician (teknisyen) / warehouse (depo)
--           Görevlide zorunlu, müdür/sahipte boş. Kural veritabanında.
-- products:
--   Personel ekranında en fazla 8 ürün (Genel Müdür kararı, docs/ux/001). Ekran değil, veritabanı sayar.
-- =====================================================================

alter table public.memberships
  add column name text not null default '' check (length(name) <= 60),
  add column job  text check (job in ('housekeeping', 'technician', 'warehouse'));

-- Görevlinin görevi olur; müdürün/sahibin olmaz.
-- DİKKAT: Bu kural boş bir veritabanı varsayar. İçinde zaten görevli satırı olan bir veritabanında
-- bu satır hata verir; önce her görevlinin `job` sütunu doldurulmalıdır.
alter table public.memberships
  add constraint memberships_gorev_kurali check ((role = 'staff') = (job is not null));


-- Ürün sınırı: otelde en fazla 8 açık ürün.
-- Ekstra yetki (security definer) YOK: sayılan tablo (products) zaten müdürün görebildiği tablodur.
create function public.urun_siniri()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_active
     and (select count(*) from public.products
           where hotel_id = new.hotel_id and is_active and id <> new.id) >= 8 then
    raise exception 'Listede en fazla 8 ürün olabilir. Önce birini listeden çıkarın.';
  end if;
  return new;
end;
$$;

create trigger urun_siniri before insert or update on public.products
  for each row execute function public.urun_siniri();
