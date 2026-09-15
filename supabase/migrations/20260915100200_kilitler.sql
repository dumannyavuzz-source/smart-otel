-- =====================================================================
-- 3 / 4 — KİLİTLER (Satır Seviyesinde Güvenlik — RLS)
--
-- Kilit = her tablo için veritabanının kendi sorduğu soru:
--   "Bu satırı BU KARTIN SAHİBİ görebilir mi, yazabilir mi?"
-- Cevap hep aynı yardımcıdan gelir: rol_nedir(hotel_id)
--   null      → üye değil → satır yokmuş gibi
--   'staff'   → görevli
--   'manager' → müdür
--   'owner'   → sahip
--
-- Varsayılan: KAPALI. Kilit yazılmamış işlem = kimse yapamaz.
-- Kilit yazılmayan işlemler ("—" olanlar) bilerek yazılmamıştır.
--
-- Kaynak: docs/security/001-rls-and-maker-checker.md (2.3 kilit tablosu)
-- =====================================================================


-- Her tabloda kilit sistemi AÇIK. (Görünüm room_status, altındaki tabloların kilitleriyle çalışır.)
alter table public.hotels              enable row level security;
alter table public.memberships         enable row level security;
alter table public.rooms               enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.products            enable row level security;
alter table public.suppliers           enable row level security;
alter table public.room_cleanings      enable row level security;
alter table public.supply_reports      enable row level security;
alter table public.issue_reports       enable row level security;
alter table public.work_orders         enable row level security;
alter table public.purchase_requests   enable row level security;
alter table public.approvals           enable row level security;
alter table public.deliveries          enable row level security;
alter table public.guest_feedback      enable row level security;


-- ---------------------------------------------------------------------
-- hotels — okuma: üye · değiştirme: owner (ad, saat dilimi) · ekleme/silme: —
-- (Otel açmak Smartotel ekibinin işidir; ana anahtarla, kayıt altında.)
-- ---------------------------------------------------------------------
create policy "uye kendi otelini gorur" on public.hotels
  for select to authenticated
  using (public.rol_nedir(id) is not null);

create policy "sahip otel bilgisini duzenler" on public.hotels
  for update to authenticated
  using (public.rol_nedir(id) = 'owner')
  with check (public.rol_nedir(id) = 'owner');


-- ---------------------------------------------------------------------
-- memberships — okuma: kendi satırı / müdür+sahip tümü
--               ekleme: owner → manager+staff · manager → yalnızca staff
--               silme : aynı kural, ama KENDİNİ KİMSE SİLEMEZ
--               değiştirme: — (rol değişikliği = sil + yeniden ekle; kendi rolünü kimse değiştiremez)
-- ---------------------------------------------------------------------
create policy "kendi uyeligini veya otelin uyelerini gorur" on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.rol_nedir(hotel_id) in ('manager', 'owner')
  );

create policy "sahip mudur ve gorevli ekler, mudur yalnizca gorevli ekler" on public.memberships
  for insert to authenticated
  with check (
    (public.rol_nedir(hotel_id) = 'owner'   and role in ('manager', 'staff'))
    or
    (public.rol_nedir(hotel_id) = 'manager' and role = 'staff')
  );

create policy "sahip mudur ve gorevli cikarir, mudur yalnizca gorevli cikarir" on public.memberships
  for delete to authenticated
  using (
    user_id <> (select auth.uid())
    and (
      (public.rol_nedir(hotel_id) = 'owner'   and role in ('manager', 'staff'))
      or
      (public.rol_nedir(hotel_id) = 'manager' and role = 'staff')
    )
  );


-- ---------------------------------------------------------------------
-- rooms, checklist_templates, products, suppliers
--   okuma: üye · ekleme/değiştirme: müdür+sahip · silme: — (pasif işaretlenir)
-- ---------------------------------------------------------------------
create policy "uye gorur" on public.rooms
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "mudur ekler" on public.rooms
  for insert to authenticated with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));
create policy "mudur duzenler" on public.rooms
  for update to authenticated
  using (public.rol_nedir(hotel_id) in ('manager', 'owner'))
  with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));

create policy "uye gorur" on public.checklist_templates
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "mudur ekler" on public.checklist_templates
  for insert to authenticated with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));
create policy "mudur duzenler" on public.checklist_templates
  for update to authenticated
  using (public.rol_nedir(hotel_id) in ('manager', 'owner'))
  with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));

create policy "uye gorur" on public.products
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "mudur ekler" on public.products
  for insert to authenticated with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));
create policy "mudur duzenler" on public.products
  for update to authenticated
  using (public.rol_nedir(hotel_id) in ('manager', 'owner'))
  with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));

create policy "uye gorur" on public.suppliers
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "mudur ekler" on public.suppliers
  for insert to authenticated with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));
create policy "mudur duzenler" on public.suppliers
  for update to authenticated
  using (public.rol_nedir(hotel_id) in ('manager', 'owner'))
  with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));


-- ---------------------------------------------------------------------
-- 🔏 room_cleanings, supply_reports, issue_reports
--   okuma: üye · ekleme: üye · değiştirme/silme: — (ayrıca Kural 1 reddeder)
-- ---------------------------------------------------------------------
create policy "uye gorur" on public.room_cleanings
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "uye beyan yazar" on public.room_cleanings
  for insert to authenticated with check (public.rol_nedir(hotel_id) is not null);

create policy "uye gorur" on public.supply_reports
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "uye beyan yazar" on public.supply_reports
  for insert to authenticated with check (public.rol_nedir(hotel_id) is not null);

create policy "uye gorur" on public.issue_reports
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "uye beyan yazar" on public.issue_reports
  for insert to authenticated with check (public.rol_nedir(hotel_id) is not null);


-- ---------------------------------------------------------------------
-- work_orders — okuma: üye · ekleme: müdür+sahip (arızadan otomatik açılan, kuralla gelir)
--               değiştirme: üye — ama NEYİ değiştirebileceğini Kural 5 belirler
-- ---------------------------------------------------------------------
create policy "uye gorur" on public.work_orders
  for select to authenticated using (public.rol_nedir(hotel_id) is not null);
create policy "mudur elle is emri acar" on public.work_orders
  for insert to authenticated with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));
create policy "uye is emrini ilerletir" on public.work_orders
  for update to authenticated
  using (public.rol_nedir(hotel_id) is not null)
  with check (public.rol_nedir(hotel_id) is not null);


-- ---------------------------------------------------------------------
-- purchase_requests — okuma: görevli kendi talepleri + ONAYLANMIŞ talepler (teslim alabilmek için)
--                             müdür+sahip tümü
--                     ekleme: üye · değiştirme: — (durumu Kural 6-7 ilerletir) · silme: —
-- ---------------------------------------------------------------------
create policy "kendi talebini, onaylanmis talepleri veya mudurse tumunu gorur" on public.purchase_requests
  for select to authenticated
  using (
    public.rol_nedir(hotel_id) is not null
    and (
      created_by = (select auth.uid())
      or status = 'approved'
      or public.rol_nedir(hotel_id) in ('manager', 'owner')
    )
  );
create policy "uye talep acar" on public.purchase_requests
  for insert to authenticated with check (public.rol_nedir(hotel_id) is not null);


-- ---------------------------------------------------------------------
-- 🔏 approvals — okuma: müdür+sahip · ekleme: müdür+sahip (+ Kural 6) · değiştirme/silme: —
-- ---------------------------------------------------------------------
create policy "mudur gorur" on public.approvals
  for select to authenticated using (public.rol_nedir(hotel_id) in ('manager', 'owner'));
create policy "mudur karar yazar" on public.approvals
  for insert to authenticated with check (public.rol_nedir(hotel_id) in ('manager', 'owner'));


-- ---------------------------------------------------------------------
-- 🔏 deliveries — okuma: görevli kendi teslimleri / müdür+sahip tümü
--                 ekleme: üye (+ Kural 7) · değiştirme/silme: —
-- ---------------------------------------------------------------------
create policy "kendi teslimini veya mudurse tumunu gorur" on public.deliveries
  for select to authenticated
  using (
    received_by = (select auth.uid())
    or public.rol_nedir(hotel_id) in ('manager', 'owner')
  );
create policy "uye teslim beyani yazar" on public.deliveries
  for insert to authenticated with check (public.rol_nedir(hotel_id) is not null);


-- ---------------------------------------------------------------------
-- 🔏 guest_feedback — okuma: müdür+sahip · ekleme: — (yalnızca misafir kapısı, ana anahtarla)
-- ---------------------------------------------------------------------
create policy "mudur misafir yorumlarini gorur" on public.guest_feedback
  for select to authenticated using (public.rol_nedir(hotel_id) in ('manager', 'owner'));
