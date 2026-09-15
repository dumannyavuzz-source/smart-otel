-- =====================================================================
-- 1 / 4 — TABLOLAR (kutular)
--
-- Kaynak: docs/decisions/002-database-architecture.md  (A.4 kutular, A.7 oda durumu)
--         docs/security/001-rls-and-maker-checker.md   (2.3 kilit tablosu)
--
-- Kurallar:
--   * Her tabloda hotel_id vardır. İstisnasız.
--   * 🔏 işaretli tablolar BEYAN tablosudur: bir kez yazılır, hiç değişmez.
--     (Kilit ve kurallar 2. ve 3. dosyada.)
--   * Bir kaydın işaret ettiği oda/ürün/talep AYNI OTELDEN olmak zorundadır.
--     Bunu veritabanı kendisi kontrol eder: (hotel_id, room_id) → rooms(hotel_id, id).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Oteller
-- ---------------------------------------------------------------------
create table public.hotels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 100),
  timezone   text not null default 'Europe/Istanbul',
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- Üyelikler: kim, hangi otelde, hangi rolde
-- ---------------------------------------------------------------------
create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('staff', 'manager', 'owner')),
  created_at timestamptz not null default now(),
  unique (hotel_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);


-- ---------------------------------------------------------------------
-- Tek yardımcı soru: "Kartın sahibi bu otelde üye mi? Rolü ne?"
-- Her kilit ve her kural bu soruyu sorar.
-- Üye değilse cevap boştur (null).
-- security definer: memberships tablosuna kendi kilidine takılmadan bakar,
-- ama YALNIZCA kartın sahibinin (auth.uid()) satırlarına bakar.
-- ---------------------------------------------------------------------
create function public.rol_nedir(p_hotel_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.memberships
  where hotel_id = p_hotel_id
    and user_id = auth.uid();
$$;

revoke all on function public.rol_nedir(uuid) from public;
grant execute on function public.rol_nedir(uuid) to anon, authenticated, service_role;


-- ---------------------------------------------------------------------
-- Odalar (her odanın iki QR kodu vardır: personel ve misafir)
-- Kodlar tahmin edilemez: rastgele 32 karakter.
-- ---------------------------------------------------------------------
create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id),
  number     text not null check (length(number) between 1 and 10),
  floor      text check (length(floor) <= 10),
  staff_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  guest_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hotel_id, number),
  unique (hotel_id, id)          -- "aynı otelden olmalı" kontrolleri için
);


-- ---------------------------------------------------------------------
-- Temizlik kontrol listesi şablonu (otel başına, en fazla 10 madde)
-- ---------------------------------------------------------------------
create table public.checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id),
  name       text not null check (length(name) between 1 and 60),
  items      text[] not null check (cardinality(items) between 1 and 10),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- Depo ürünleri ve tedarikçiler
-- ---------------------------------------------------------------------
create table public.products (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id),
  name       text not null check (length(name) between 1 and 60),
  unit       text not null default 'adet' check (length(unit) between 1 and 10),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hotel_id, id)
);

create table public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id),
  name       text not null check (length(name) between 1 and 60),
  phone      text check (length(phone) <= 20),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 🔏 Oda temizlik beyanı: "204'ü Ayşe 10:42'de hazır etti"
--
-- Beyan tablolarında ortak alanlar:
--   id                : telefonda üretilir (offline'da da eşsiz), sunucu tekrarı yok sayar
--   created_by        : KİM — veritabanı karttan doldurur, telefonun sözü sayılmaz
--   created_at        : NE ZAMAN — sunucu saati, veritabanı doldurur
--   created_at_device : telefonun saati (bilgi amaçlı)
--   corrects_id       : "bu, şu kaydın düzeltmesidir" — eski kayıt yerinde durur
-- ---------------------------------------------------------------------
create table public.room_cleanings (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references public.hotels (id),
  room_id           uuid not null,
  checked_items     text[] not null default '{}' check (cardinality(checked_items) <= 10),
  note              text check (length(note) <= 500),
  created_by        uuid not null references auth.users (id),
  created_at        timestamptz not null default now(),
  created_at_device timestamptz,
  corrects_id       uuid,
  unique (hotel_id, id),
  foreign key (hotel_id, room_id)     references public.rooms (hotel_id, id),
  foreign key (hotel_id, corrects_id) references public.room_cleanings (hotel_id, id)
);
create index room_cleanings_room_idx on public.room_cleanings (room_id, created_at desc);


-- ---------------------------------------------------------------------
-- 🔏 Eksik malzeme beyanı: "204'te 2 havlu eksik"
-- ---------------------------------------------------------------------
create table public.supply_reports (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references public.hotels (id),
  room_id           uuid not null,
  product_id        uuid not null,
  quantity          integer not null check (quantity > 0),
  note              text check (length(note) <= 500),
  created_by        uuid not null references auth.users (id),
  created_at        timestamptz not null default now(),
  created_at_device timestamptz,
  corrects_id       uuid,
  unique (hotel_id, id),
  foreign key (hotel_id, room_id)     references public.rooms (hotel_id, id),
  foreign key (hotel_id, product_id)  references public.products (hotel_id, id),
  foreign key (hotel_id, corrects_id) references public.supply_reports (hotel_id, id)
);


-- ---------------------------------------------------------------------
-- 🔏 Arıza beyanı: "204'te musluk damlıyor" + fotoğraf
-- severity: 'urgent' (acil, 30 dk) / 'normal' (2 saat) — uygulama sorun tipine göre seçer
-- ---------------------------------------------------------------------
create table public.issue_reports (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references public.hotels (id),
  room_id           uuid not null,
  description       text not null check (length(description) between 1 and 500),
  photo_path        text check (length(photo_path) <= 200),
  severity          text not null default 'normal' check (severity in ('urgent', 'normal')),
  created_by        uuid not null references auth.users (id),
  created_at        timestamptz not null default now(),
  created_at_device timestamptz,
  corrects_id       uuid,
  unique (hotel_id, id),
  foreign key (hotel_id, room_id)     references public.rooms (hotel_id, id),
  foreign key (hotel_id, corrects_id) references public.issue_reports (hotel_id, id)
);


-- ---------------------------------------------------------------------
-- İş emri: her arıza için otomatik açılır (kural), müdür elle de açabilir.
-- Bu, "değişen" tek kutudur: kimde? durumu ne? (Kuralları 2. dosyada.)
-- "Çözdüm" denince resolved_by + resolved_at veritabanınca yazılır ve satır kilitlenir.
-- SLA: due_at saklanır. "Gecikti mi?" = now() > due_at and status <> 'resolved' (bir sorudur).
-- ---------------------------------------------------------------------
create table public.work_orders (
  id              uuid primary key default gen_random_uuid(),
  hotel_id        uuid not null references public.hotels (id),
  room_id         uuid not null,
  issue_report_id uuid unique,                       -- elle açılan iş emrinde boş
  severity        text not null check (severity in ('urgent', 'normal')),
  due_at          timestamptz not null,
  assigned_to     uuid references auth.users (id),
  status          text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  resolved_by     uuid references auth.users (id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  check ((status = 'resolved') = (resolved_at is not null and resolved_by is not null)),
  foreign key (hotel_id, room_id)         references public.rooms (hotel_id, id),
  foreign key (hotel_id, issue_report_id) references public.issue_reports (hotel_id, id)
);
create index work_orders_open_idx on public.work_orders (hotel_id, status) where status <> 'resolved';


-- ---------------------------------------------------------------------
-- Satın alma talebi (Maker). status yalnızca KURALLARLA ilerler:
--   pending → approved / rejected → delivered
-- ---------------------------------------------------------------------
create table public.purchase_requests (
  id                uuid primary key default gen_random_uuid(),
  hotel_id          uuid not null references public.hotels (id),
  product_id        uuid not null,
  quantity          integer not null check (quantity > 0),
  note              text check (length(note) <= 500),
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'delivered')),
  created_by        uuid not null references auth.users (id),
  created_at        timestamptz not null default now(),
  created_at_device timestamptz,
  unique (hotel_id, id),
  foreign key (hotel_id, product_id) references public.products (hotel_id, id)
);


-- ---------------------------------------------------------------------
-- 🔏 Onay beyanı (Checker): "Müdür Mehmet 11:05'te onayladı"
-- Bir talebe tek karar yazılır (purchase_request_id unique).
-- ---------------------------------------------------------------------
create table public.approvals (
  id                  uuid primary key default gen_random_uuid(),
  hotel_id            uuid not null references public.hotels (id),
  purchase_request_id uuid not null unique,
  decision            text not null check (decision in ('approved', 'rejected')),
  approved_quantity   integer not null check (approved_quantity >= 0),
  note                text check (length(note) <= 500),
  created_by          uuid not null references auth.users (id),
  created_at          timestamptz not null default now(),
  created_at_device   timestamptz,
  check (
    (decision = 'approved' and approved_quantity > 0) or
    (decision = 'rejected' and approved_quantity = 0)
  ),
  foreign key (hotel_id, purchase_request_id) references public.purchase_requests (hotel_id, id)
);


-- ---------------------------------------------------------------------
-- 🔏 Teslim beyanı = dijital imza: "Depo görevlisi Ali 15 adet teslim aldı" + fatura fotoğrafı
--   received_by / received_at : veritabanı doldurur (imza)
--   invoice_photo_path        : önce fotoğraf yüklenir, sonra bu kayıt yazılır
-- Bir talebe tek asıl teslim yazılır; düzeltmeler (corrects_id dolu) eklenebilir.
-- ---------------------------------------------------------------------
create table public.deliveries (
  id                  uuid primary key default gen_random_uuid(),
  hotel_id            uuid not null references public.hotels (id),
  purchase_request_id uuid not null,
  received_quantity   integer not null check (received_quantity >= 0),
  invoice_photo_path  text not null check (length(invoice_photo_path) between 1 and 200),
  note                text check (length(note) <= 500),
  received_by         uuid not null references auth.users (id),
  received_at         timestamptz not null default now(),
  created_at_device   timestamptz,
  corrects_id         uuid,
  unique (hotel_id, id),
  foreign key (hotel_id, purchase_request_id) references public.purchase_requests (hotel_id, id),
  foreign key (hotel_id, corrects_id)         references public.deliveries (hotel_id, id)
);
create unique index deliveries_one_original_idx
  on public.deliveries (purchase_request_id) where corrects_id is null;


-- ---------------------------------------------------------------------
-- 🔏 Misafir yorumu: oda, puan (1–5), yorum. Giriş yok; yalnızca misafir kapısı
-- (Edge Function, ana anahtarla) yazar. Uygulamadan ekleme yolu YOKTUR.
-- ---------------------------------------------------------------------
create table public.guest_feedback (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id),
  room_id    uuid not null,
  rating     integer not null check (rating between 1 and 5),
  comment    text check (length(comment) <= 500),
  created_at timestamptz not null default now(),
  foreign key (hotel_id, room_id) references public.rooms (hotel_id, id)
);
create index guest_feedback_hotel_idx on public.guest_feedback (hotel_id, created_at desc);


-- ---------------------------------------------------------------------
-- Oda durumu HESAPLANIR, elle değiştirilmez (002 · A.7):
--   açık iş emri var          → 'arizali'
--   bugün temizlenmemiş       → 'kirli'
--   bugün temiz + iş emri yok → 'satisa_hazir'
-- "Bugün", otelin kendi saat dilimine göredir.
-- security_invoker: görünüm, bakan kişinin kilitleriyle çalışır (otel ayrımı korunur).
-- ---------------------------------------------------------------------
create view public.room_status
with (security_invoker = true)
as
select
  r.id        as room_id,
  r.hotel_id,
  r.number,
  r.floor,
  lc.created_at as last_cleaned_at,
  (select count(*) from public.work_orders w
    where w.room_id = r.id and w.status <> 'resolved') as open_work_orders,
  case
    when exists (select 1 from public.work_orders w
                  where w.room_id = r.id and w.status <> 'resolved') then 'arizali'
    when lc.created_at is null
      or (lc.created_at at time zone h.timezone)::date <> (now() at time zone h.timezone)::date then 'kirli'
    else 'satisa_hazir'
  end as status
from public.rooms r
join public.hotels h on h.id = r.hotel_id
left join lateral (
  select c.created_at
  from public.room_cleanings c
  where c.room_id = r.id
  order by c.created_at desc
  limit 1
) lc on true
where r.is_active;
