-- =====================================================================
-- DEMO SÜRESİ (30 GÜN) ve ÖDEME DUVARI — kilit tarafı
--
-- Kaynak: docs/decisions/005-demo-suresi-ve-odeme-duvari.md (Genel Müdür kararı, 2026-09-17)
--
-- Kural üç cümlede:
--   1. Her otelin bir demo bitiş tarihi vardır; kayıt anında otomatik olarak 30 gün sonrasıdır.
--   2. Süre dolunca otel HİÇBİR ŞEY YAZAMAZ. Ama her şeyi OKUYABİLİR: veri silinmez, kaybolmaz.
--   3. Tarihi yalnızca biz (ana anahtarla) uzatabiliriz. Otelin sahibi bile kendi süresini uzatamaz.
--
-- Not: Ekrandaki ödeme duvarı yalnızca nezakettir; asıl kilit buradadır.
--      Uygulamayı atlayıp doğrudan sunucuya yazmaya çalışan da aynı duvara çarpar.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Tarih sütunu
-- Varsayılan değeri işi kendiliğinden halleder: kayıt kapısı oteli açtığı an
-- (yani hesap oluştuğu an) sayaç başlar. Kapının ayrıca bir şey yazmasına gerek yoktur.
-- Bugün var olan oteller de bu göçün çalıştığı andan itibaren 30 gün alır.
-- ---------------------------------------------------------------------
alter table public.hotels
  add column demo_bitis_tarihi timestamptz not null default (now() + interval '30 days');

comment on column public.hotels.demo_bitis_tarihi is
  'Demo bitiş anı. Kayıtta otomatik 30 gün. Yalnızca ana anahtarla uzatılır (bkz. hotels_demo_tarihi_korumasi).';


-- ---------------------------------------------------------------------
-- 2. "Süre doldu mu?" — tek yardımcı soru
-- Kilitler bu soruyu sorar. security definer: hotels tablosunun kendi kilidine takılmadan bakar.
-- Otel bulunamazsa cevap boştur (null) ve kilit KAPALI kalır: bilinmezlik "sorun yok" sayılmaz.
-- ---------------------------------------------------------------------
create function public.demo_bitti_mi(p_hotel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select h.demo_bitis_tarihi <= now()
  from public.hotels h
  where h.id = p_hotel_id;
$$;

-- Yetkiler açıkça yazılır (docs/security/005 · staging dersi):
-- kilitler bu soruyu giriş yapmış kişinin adına sorar, bu yüzden authenticated çağırabilmelidir.
revoke all on function public.demo_bitti_mi(uuid) from public, anon;
grant execute on function public.demo_bitti_mi(uuid) to authenticated, service_role;


-- ---------------------------------------------------------------------
-- 3. Tarihi kimse kendi kendine uzatamaz
-- Otelin sahibi otel adını değiştirebilir (mevcut kilit), ama bu sütuna dokunamaz.
-- Ana anahtarla gelen bizim işlemimizin kartı yoktur (auth.uid() boştur) — biz uzatabiliriz.
-- ---------------------------------------------------------------------
create function public.demo_tarihi_korumasi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.demo_bitis_tarihi is distinct from old.demo_bitis_tarihi
     and (select auth.uid()) is not null then
    raise exception 'Demo bitis tarihi uygulamadan degistirilemez.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.demo_tarihi_korumasi() from public, anon, authenticated;

create trigger hotels_demo_tarihi_korumasi
  before update on public.hotels
  for each row execute function public.demo_tarihi_korumasi();


-- ---------------------------------------------------------------------
-- 4. Süre dolunca yazma durur — okuma durmaz
--
-- Bunlar KISITLAYICI (restrictive) kilitlerdir: mevcut kilitlerin yerine geçmezler,
-- onların ÜSTÜNE eklenirler. Yani eski kural da geçerlidir, bu da. Hiçbir eski kilit
-- silinmedi veya değiştirilmedi — yalnızca bir şart daha eklendi.
--
-- Okuma (select) kilitlerine dokunulmaz: süresi dolmuş otel kayıtlarını görmeye devam eder.
-- ---------------------------------------------------------------------

-- hotels: sahip otel adını değiştirebiliyordu; süre dolunca o da durur.
create policy "demo bitince degistirilemez" on public.hotels
  as restrictive for update to authenticated
  using (not public.demo_bitti_mi(id))
  with check (not public.demo_bitti_mi(id));

-- memberships: personel eklenemez, çıkarılamaz.
create policy "demo bitince eklenemez" on public.memberships
  as restrictive for insert to authenticated
  with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince cikarilamaz" on public.memberships
  as restrictive for delete to authenticated
  using (not public.demo_bitti_mi(hotel_id));

-- Tanım tabloları: oda, kontrol listesi, ürün, tedarikçi
create policy "demo bitince eklenemez" on public.rooms
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince degistirilemez" on public.rooms
  as restrictive for update to authenticated
  using (not public.demo_bitti_mi(hotel_id)) with check (not public.demo_bitti_mi(hotel_id));

create policy "demo bitince eklenemez" on public.checklist_templates
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince degistirilemez" on public.checklist_templates
  as restrictive for update to authenticated
  using (not public.demo_bitti_mi(hotel_id)) with check (not public.demo_bitti_mi(hotel_id));

create policy "demo bitince eklenemez" on public.products
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince degistirilemez" on public.products
  as restrictive for update to authenticated
  using (not public.demo_bitti_mi(hotel_id)) with check (not public.demo_bitti_mi(hotel_id));

create policy "demo bitince eklenemez" on public.suppliers
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince degistirilemez" on public.suppliers
  as restrictive for update to authenticated
  using (not public.demo_bitti_mi(hotel_id)) with check (not public.demo_bitti_mi(hotel_id));

-- 🔏 Beyan tabloları: yeni beyan yazılamaz (eskiler durur, okunur)
create policy "demo bitince yazilamaz" on public.room_cleanings
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince yazilamaz" on public.supply_reports
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince yazilamaz" on public.issue_reports
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince yazilamaz" on public.approvals
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince yazilamaz" on public.deliveries
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince yazilamaz" on public.purchase_requests
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));

-- İş emirleri: açılamaz ve ilerletilemez
create policy "demo bitince acilamaz" on public.work_orders
  as restrictive for insert to authenticated with check (not public.demo_bitti_mi(hotel_id));
create policy "demo bitince ilerletilemez" on public.work_orders
  as restrictive for update to authenticated
  using (not public.demo_bitti_mi(hotel_id)) with check (not public.demo_bitti_mi(hotel_id));

-- Misafir yorumları (guest_feedback) bilerek dışarıda bırakıldı: o kapı ana anahtarla çalışır,
-- misafirin yıldız vermesi otelin ödeme durumuna bağlı değildir.
