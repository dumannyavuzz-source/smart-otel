-- =====================================================================
-- GÜVENLİK DENEMELERİ
-- Kaynak: docs/security/001-rls-and-maker-checker.md · Bölüm 6 (22 madde)
--
-- Her madde bir SALDIRI denemesidir. Hepsi başarısız olmalıdır.
-- Biri başarılı olursa Security veto kullanır.
--
-- Çalıştırmak (Docker + Supabase CLI kuruluyken):
--   supabase start && supabase db reset && supabase test db
--
-- Deneme kadrosu:
--   Otel A: Ayşe (kat görevlisi), Ali (depo görevlisi), Mehmet (müdür), Sahip (owner)
--   Otel B: Burak (kat görevlisi)
-- Her şey bu dosyanın sonunda geri alınır (rollback); veritabanında iz kalmaz.
-- =====================================================================
begin;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'plan') then
    create extension if not exists pgtap with schema extensions;
  end if;
end
$$;

select plan(75);


-- ---------------------------------------------------------------------
-- Deneme yardımcıları: kart takma / çıkarma
-- ---------------------------------------------------------------------
create schema deneme;
grant usage on schema deneme to anon, authenticated, service_role;

-- Giriş yapmış bir kişi gibi davran (kart tak)
create function deneme.giris(p_kisi uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_kisi, 'role', 'authenticated')::text, true);
end;
$$;

-- Giriş yapmamış biri gibi davran (yalnızca kapı anahtarı)
create function deneme.anonim() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end;
$$;

-- Ana anahtar (service role) ile davran — kilitleri atlar, kuralları atlayamaz
create function deneme.ana_anahtar() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
end;
$$;

-- Kartı çıkar (yönetici bağlantısına dön)
create function deneme.cikis() returns void language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;


-- ---------------------------------------------------------------------
-- Kadro ve iki otel (yönetici bağlantısıyla kurulur — Smartotel ekibi gibi)
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-00000000a001', 'ayse@deneme.test'),
  ('a0000000-0000-4000-8000-00000000a002', 'ali@deneme.test'),
  ('a0000000-0000-4000-8000-00000000a003', 'mehmet@deneme.test'),
  ('a0000000-0000-4000-8000-00000000a004', 'sahip@deneme.test'),
  ('a0000000-0000-4000-8000-00000000a005', 'yeni@deneme.test'),
  ('b0000000-0000-4000-8000-00000000b001', 'burak@deneme.test');

insert into public.hotels (id, name) values
  ('a0000000-0000-4000-8000-000000000001', 'Deneme Otel A'),
  ('b0000000-0000-4000-8000-000000000001', 'Deneme Otel B');

insert into public.memberships (hotel_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a001', 'staff'),    -- Ayşe
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a002', 'staff'),    -- Ali
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a003', 'manager'),  -- Mehmet
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a004', 'owner'),    -- Sahip
  ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000b001', 'staff');    -- Burak

insert into public.rooms (id, hotel_id, number) values
  ('a0000000-0000-4000-8000-0000000a0101', 'a0000000-0000-4000-8000-000000000001', '101'),
  ('b0000000-0000-4000-8000-0000000b0201', 'b0000000-0000-4000-8000-000000000001', '201');

insert into public.products (id, hotel_id, name) values
  ('a0000000-0000-4000-8000-000000000a01', 'a0000000-0000-4000-8000-000000000001', 'Havlu');

-- Otel B'nin bir fotoğrafı var (16. deneme için)
insert into storage.objects (bucket_id, name, owner) values
  ('photos', 'b0000000-0000-4000-8000-000000000001/deliveries/b-fatura.jpg', 'b0000000-0000-4000-8000-00000000b001');

-- Otel A'ya bir misafir yorumu düşmüş (misafir kapısı yazmış gibi)
insert into public.guest_feedback (hotel_id, room_id, rating, comment) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000a0101', 2, 'Oda soğuktu');


-- =====================================================================
-- 1 – 2 · OTEL AYRIMI
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (A)

select is((select count(*)::int from public.rooms), 1,
  '1. Otel A görevlisi yalnızca Otel A''nın odalarını görür');

select is((select hotel_id from public.rooms limit 1), 'a0000000-0000-4000-8000-000000000001'::uuid,
  '1b. Görünen oda gerçekten Otel A''nındır');

select is_empty($$ select * from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201' $$,
  '2. Otel B''nin oda kimliğiyle sorgu BOŞ döner — hata bile değil');

select deneme.giris('b0000000-0000-4000-8000-00000000b001');   -- Burak (B)

select is_empty($$ select * from public.room_cleanings $$,
  '2b. Otel B görevlisi Otel A''nın beyanlarını göremez');


-- =====================================================================
-- 3 · "BU KAYIT OTEL B'NİN" YALANI
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (A)

select throws_ok(
  $$ insert into public.room_cleanings (hotel_id, room_id)
     values ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000b0201') $$,
  '42501', null,
  '3. Otel A görevlisi hotel_id = B ile beyan yazamaz');

select throws_ok(
  $$ insert into public.room_cleanings (hotel_id, room_id)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000b0201') $$,
  '23503', null,
  '3b. Otel A beyanı Otel B''nin odasını işaret edemez (oda aynı otelden olmalı)');


-- =====================================================================
-- 4 · BEYAN DEĞİŞTİRİLEMEZ, SİLİNEMEZ (görevli)
-- =====================================================================
select lives_ok(
  $$ insert into public.room_cleanings (id, hotel_id, room_id, note)
     values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-0000000a0101', 'ilk beyan') $$,
  '4-hazırlık. Ayşe "oda hazır" beyanı yazar');

update public.room_cleanings set note = 'degistirildi' where id = 'c0000000-0000-4000-8000-000000000001';
select is((select note from public.room_cleanings where id = 'c0000000-0000-4000-8000-000000000001'), 'ilk beyan',
  '4a. Görevli kendi beyanını değiştiremez');

delete from public.room_cleanings where id = 'c0000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.room_cleanings where id = 'c0000000-0000-4000-8000-000000000001'), 1,
  '4b. Görevli kendi beyanını silemez');


-- =====================================================================
-- 5 · "KİM YAZDI"YI VERİTABANI DOLDURUR
-- =====================================================================
insert into public.room_cleanings (id, hotel_id, room_id, created_by, created_at)
values ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-0000000a0101', 'a0000000-0000-4000-8000-00000000a003', '2000-01-01');

select is((select created_by from public.room_cleanings where id = 'c0000000-0000-4000-8000-000000000002'),
  'a0000000-0000-4000-8000-00000000a001'::uuid,
  '5a. Telefon "Mehmet yazdı" dese de veritabanı Ayşe''yi yazar');

select ok((select created_at > now() - interval '1 minute'
           from public.room_cleanings where id = 'c0000000-0000-4000-8000-000000000002'),
  '5b. Saat sunucunun saatidir; telefonun yazdığı 2000 yılı sayılmaz');


-- =====================================================================
-- 6 · GÖREVLİ ONAY YAZAMAZ
-- =====================================================================
insert into public.purchase_requests (id, hotel_id, product_id, quantity)
values ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-000000000a01', 20);                      -- Ayşe'nin talebi: 20 havlu

select throws_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'approved', 20) $$,
  null, 'Yalnızca müdür veya sahip onaylayabilir.',
  '6. Görevli onay yazamaz');


-- =====================================================================
-- 7 · MÜDÜR KENDİ TALEBİNİ ONAYLAYAMAZ
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

insert into public.purchase_requests (id, hotel_id, product_id, quantity)
values ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-000000000a01', 5);                       -- Mehmet'in kendi talebi

select throws_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'approved', 5) $$,
  null, 'Talep eden kendi talebini onaylayamaz.',
  '7. Müdür kendi talebini onaylayamaz');


-- =====================================================================
-- 8 · TEK ONAY, SIRA BOZULMAZ
-- =====================================================================
select lives_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'approved', 18) $$,
  '8-hazırlık. Mehmet, Ayşe''nin talebini onaylar (18 adet)');

select is((select status from public.purchase_requests where id = 'd0000000-0000-4000-8000-000000000001'), 'approved',
  '8a. Talebin durumunu KURAL ilerletti: approved');

select throws_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'approved', 18) $$,
  null, 'Bu talep için karar zaten verildi.',
  '8b. Aynı talebe ikinci onay reddedilir');

update public.purchase_requests set status = 'delivered' where id = 'd0000000-0000-4000-8000-000000000001';
select is((select status from public.purchase_requests where id = 'd0000000-0000-4000-8000-000000000001'), 'approved',
  '8c. Talebin durumu elle değiştirilemez (müdür bile)');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali (depo)

select is((select count(*)::int from public.purchase_requests where id = 'd0000000-0000-4000-8000-000000000001'), 1,
  '8d. Depo görevlisi ONAYLANMIŞ talebi görür (teslim alabilmek için)');

select is_empty($$ select * from public.purchase_requests where id = 'd0000000-0000-4000-8000-000000000002' $$,
  '8e. Ama başkasının BEKLEYEN talebini göremez');


-- =====================================================================
-- 9 · ONAYSIZ TESLİM OLMAZ
-- =====================================================================
select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 5,
             'a0000000-0000-4000-8000-000000000001/deliveries/x.jpg') $$,
  null, 'Onaylanmamış talep teslim alınamaz.',
  '9. Bekleyen (onaysız) talebe teslim yazılamaz');


-- =====================================================================
-- 10 · ONAYLAYAN TESLİM ALAMAZ
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (onaylayan)

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 18,
             'a0000000-0000-4000-8000-000000000001/deliveries/x.jpg') $$,
  null, 'Onaylayan kişi teslim alamaz.',
  '10. Onaylayan müdür aynı talebe "teslim aldım" diyemez');


-- =====================================================================
-- 11 · TALEP EDEN TESLİM ALAMAZ  (+ fotoğraf şartı ve doğru teslim)
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (talep eden)

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 18,
             'a0000000-0000-4000-8000-000000000001/deliveries/x.jpg') $$,
  null, 'Talep eden kişi teslim alamaz.',
  '11. Talep eden görevli aynı talebe "teslim aldım" diyemez');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali (üçüncü kişi)

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 18,
             'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg') $$,
  null, 'Fatura fotoğrafı yüklenmeden teslim yazılamaz.',
  '11b. Fotoğraf yüklenmeden teslim yazılamaz');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '11c. Ali fatura fotoğrafını kendi otelinin klasörüne yükler');

select lives_ok(
  $$ insert into public.deliveries (id, hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
             'd0000000-0000-4000-8000-000000000001', 18,
             'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg') $$,
  '11d. Üçüncü kişi (depo görevlisi Ali) teslim alır');

select is((select received_by from public.deliveries where id = 'e0000000-0000-4000-8000-000000000001'),
  'a0000000-0000-4000-8000-00000000a002'::uuid,
  '11e. İmza: teslim alan = Ali (veritabanı yazdı)');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür tümünü görür)

select is((select status from public.purchase_requests where id = 'd0000000-0000-4000-8000-000000000001'), 'delivered',
  '11f. Talebin durumunu KURAL ilerletti: delivered');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 18,
             'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg') $$,
  null, 'Bu talep zaten teslim alındı. Yanlışsa düzeltme kaydı yazın.',
  '11g. Aynı talebe ikinci asıl teslim yazılamaz');

select lives_ok(
  $$ insert into public.deliveries (id, hotel_id, purchase_request_id, received_quantity, invoice_photo_path, corrects_id)
     values ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
             'd0000000-0000-4000-8000-000000000001', 19,
             'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg',
             'e0000000-0000-4000-8000-000000000001') $$,
  '11h. Yanlış adet: DÜZELTME kaydı yazılır, eski kayıt yerinde kalır');

select is((select received_quantity from public.deliveries where id = 'e0000000-0000-4000-8000-000000000001'), 18,
  '11i. Eski kayıt (18) hâlâ durur; yenisi (19) onu işaret eder');


-- =====================================================================
-- 12 · SAHİP BİLE TESLİMİ SİLEMEZ
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a004');   -- Sahip (owner)

delete from public.deliveries where id = 'e0000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.deliveries where id = 'e0000000-0000-4000-8000-000000000001'), 1,
  '12. Sahip (owner) teslim kaydını silemez');


-- =====================================================================
-- 13 · ANA ANAHTAR BİLE BEYANI DEĞİŞTİREMEZ
-- =====================================================================
select deneme.ana_anahtar();

select throws_ok(
  $$ update public.deliveries set received_quantity = 99 where id = 'e0000000-0000-4000-8000-000000000001' $$,
  null, 'Beyanlar değiştirilemez veya silinemez.',
  '13a. Ana anahtar (service role) teslim kaydını değiştiremez');

select throws_ok(
  $$ delete from public.deliveries where id = 'e0000000-0000-4000-8000-000000000001' $$,
  null, 'Beyanlar değiştirilemez veya silinemez.',
  '13b. Ana anahtar teslim kaydını silemez');

select throws_ok(
  $$ delete from public.approvals where purchase_request_id = 'd0000000-0000-4000-8000-000000000001' $$,
  null, 'Beyanlar değiştirilemez veya silinemez.',
  '13c. Ana anahtar onay kaydını silemez');

select throws_ok(
  $$ update public.guest_feedback set rating = 5 $$,
  null, 'Beyanlar değiştirilemez veya silinemez.',
  '13d. Ana anahtar misafir yorumunu değiştiremez');


-- =====================================================================
-- 14 · AYNI UUID İKİ KEZ GELİRSE (offline tekrar)
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe

insert into public.room_cleanings (id, hotel_id, room_id, note)
values ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-0000000a0101', 'ilk gonderim')
on conflict (id) do nothing;

insert into public.room_cleanings (id, hotel_id, room_id, note)
values ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-0000000a0101', 'ikinci gonderim')
on conflict (id) do nothing;

select is((select count(*)::int from public.room_cleanings where id = 'c0000000-0000-4000-8000-000000000003'), 1,
  '14a. Aynı UUID iki kez gelince TEK kayıt kalır');

select is((select note from public.room_cleanings where id = 'c0000000-0000-4000-8000-000000000003'), 'ilk gonderim',
  '14b. Kalan kayıt İLKİNİN içeriğidir');

select throws_ok(
  $$ insert into public.room_cleanings (id, hotel_id, room_id, note)
     values ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-0000000a0101', 'uzerine yaz')
     on conflict (id) do update set note = excluded.note $$,
  null, null,
  '14c. "Üzerine yaz" (upsert) denemesi reddedilir');


-- =====================================================================
-- 15 · GİRİŞ YAPMADAN HİÇBİR ŞEY
-- =====================================================================
select deneme.anonim();

select is_empty($$ select * from public.rooms $$,
  '15a. Girişsiz (anon) oda listesi boş döner');

select is_empty($$ select * from public.room_cleanings $$,
  '15b. Girişsiz beyanlar boş döner');

select is_empty($$ select * from public.guest_feedback $$,
  '15c. Girişsiz misafir yorumları boş döner');

select is_empty($$ select * from storage.objects $$,
  '15d. Girişsiz fotoğraf listesi boş döner');

select throws_ok(
  $$ insert into public.room_cleanings (hotel_id, room_id)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000a0101') $$,
  null, null,
  '15e. Girişsiz beyan yazılamaz');


-- =====================================================================
-- 16 – 17 · FOTOĞRAFLAR
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (A)

select is_empty($$ select * from storage.objects where name like 'b0000000-0000-4000-8000-000000000001/%' $$,
  '16. Otel A üyesi Otel B''nin fotoğraf klasörünü göremez');

select is((select count(*)::int from storage.objects where name like 'a0000000-0000-4000-8000-000000000001/%'), 1,
  '16b. Ama kendi otelinin fotoğrafını görür');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'b0000000-0000-4000-8000-000000000001/deliveries/sizma.jpg',
             'a0000000-0000-4000-8000-00000000a001') $$,
  '42501', null,
  '16c. Otel A üyesi Otel B''nin klasörüne yükleyemez');

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'bozuk-yol/sizma.jpg', 'a0000000-0000-4000-8000-00000000a001') $$,
  '42501', null,
  '16d. Otel kimliğiyle başlamayan yola yüklenemez');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '23505', null,
  '17a. Aynı yola ikinci fotoğraf yüklenemez');

update storage.objects set metadata = '{"degisti": true}'
where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg';
select is((select metadata is null from storage.objects
           where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg'), true,
  '17b. Fotoğrafın üzerine yazılamaz');

delete from storage.objects
where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg';
select is((select count(*)::int from storage.objects
           where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg'), 1,
  '17c. Fotoğraf silinemez');


-- =====================================================================
-- 18 – 19 · MİSAFİR KAPISI (Edge Function) — henüz yazılmadı
-- =====================================================================
select skip('18-19. Misafir kapısı (Edge Function) bir sonraki aşamada yazılacak; bu iki deneme o zaman eklenecek', 2);


-- =====================================================================
-- 20 – 21 · İŞ EMİRLERİ
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe

insert into public.issue_reports (id, hotel_id, room_id, description, severity)
values ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-0000000a0101', 'Musluk damlıyor', 'urgent');

select is((select count(*)::int from public.work_orders where issue_report_id = 'f0000000-0000-4000-8000-000000000001'), 1,
  '20-hazırlık. Arıza bildirilince iş emri OTOMATİK açılır');

select is((select due_at - created_at from public.work_orders where issue_report_id = 'f0000000-0000-4000-8000-000000000001'),
  interval '30 minutes',
  '20-hazırlık. Acil arızanın son süresi +30 dakika');

select is((select status from public.room_status where room_id = 'a0000000-0000-4000-8000-0000000a0101'), 'arizali',
  '20-hazırlık. Oda durumu HESAPLANDI: arizali');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet

select lives_ok(
  $$ update public.work_orders set assigned_to = 'a0000000-0000-4000-8000-00000000a002'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000001' $$,
  '20-hazırlık. Müdür işi Ali''ye atar');

select throws_ok(
  $$ update public.work_orders set assigned_to = 'b0000000-0000-4000-8000-00000000b001'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000001' $$,
  null, 'Atanan kişi bu otelin üyesi olmalı.',
  '20a. Müdür işi başka otelin personeline atayamaz');

select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (atanmamış)

select throws_ok(
  $$ update public.work_orders set status = 'resolved'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000001' $$,
  null, 'Yalnızca size atanmış iş emrini çözebilirsiniz.',
  '20. Görevli, başkasına atanmış iş emrini çözemez');

select throws_ok(
  $$ update public.work_orders set severity = 'normal'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000001' $$,
  null, 'Bu iş emrinde bu değişikliği yapma yetkiniz yok.',
  '20b. Görevli iş emrinin türünü değiştiremez');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali (atanan)

select lives_ok(
  $$ update public.work_orders set status = 'resolved'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000001' $$,
  '20c. Atanan kişi (Ali) "Çözdüm" der');

select is((select resolved_by from public.work_orders where issue_report_id = 'f0000000-0000-4000-8000-000000000001'),
  'a0000000-0000-4000-8000-00000000a002'::uuid,
  '20d. İmza: çözen = Ali (veritabanı yazdı)');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet

select throws_ok(
  $$ update public.work_orders set assigned_to = 'a0000000-0000-4000-8000-00000000a001'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000001' $$,
  null, 'Çözülmüş iş emri değiştirilemez.',
  '21. Çözülmüş iş emri müdür tarafından bile değiştirilemez');

select is((select status from public.room_status where room_id = 'a0000000-0000-4000-8000-0000000a0101'), 'satisa_hazir',
  '21b. Arıza çözülünce oda durumu: satisa_hazir (bugün temiz + açık iş emri yok)');

-- "Aldım": sahipsiz işi görevli kendine alır
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe

insert into public.issue_reports (id, hotel_id, room_id, description)
values ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-0000000a0101', 'Lamba yanmıyor');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali

select lives_ok(
  $$ update public.work_orders set assigned_to = 'a0000000-0000-4000-8000-00000000a002', status = 'in_progress'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000002' $$,
  '20e. Görevli sahipsiz işi "Aldım" der');

select throws_ok(
  $$ update public.work_orders set assigned_to = 'a0000000-0000-4000-8000-00000000a001'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000002' $$,
  null, 'Bu iş emrinde bu değişikliği yapma yetkiniz yok.',
  '20f. Görevli işi başkasına devredemez');


-- =====================================================================
-- 2.3 – 2.4 · KAT GÖREVLİSİ İLE MÜDÜRÜN SINIRI (kilit tablosu)
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe

select is_empty($$ select * from public.guest_feedback $$,
  '2.4a. Görevli misafir yorumlarını göremez');

select is_empty($$ select * from public.approvals $$,
  '2.4b. Görevli onay kayıtlarını göremez');

select throws_ok(
  $$ insert into public.rooms (hotel_id, number)
     values ('a0000000-0000-4000-8000-000000000001', '999') $$,
  '42501', null,
  '2.4c. Görevli oda ekleyemez');

select throws_ok(
  $$ insert into public.memberships (hotel_id, user_id, role)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a005', 'staff') $$,
  '42501', null,
  '2.4d. Görevli personel ekleyemez');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet

select is((select count(*)::int from public.guest_feedback), 1,
  '2.4e. Müdür misafir yorumlarını görür');

select throws_ok(
  $$ insert into public.guest_feedback (hotel_id, room_id, rating)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000a0101', 5) $$,
  '42501', null,
  '2.4f. Uygulamadan misafir yorumu yazılamaz (yalnızca misafir kapısı)');

select throws_ok(
  $$ insert into public.memberships (hotel_id, user_id, role)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a005', 'manager') $$,
  '42501', null,
  '2.4g. Müdür, müdür ekleyemez (yalnızca sahip ekler)');

select lives_ok(
  $$ insert into public.memberships (hotel_id, user_id, role)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a005', 'staff') $$,
  '2.4h. Müdür görevli ekler');

delete from public.memberships where user_id = 'a0000000-0000-4000-8000-00000000a003';
select is((select count(*)::int from public.memberships where user_id = 'a0000000-0000-4000-8000-00000000a003'), 1,
  '2.4i. Kimse kendini silemez');

select throws_ok(
  $$ update public.rooms set hotel_id = 'b0000000-0000-4000-8000-000000000001'
     where id = 'a0000000-0000-4000-8000-0000000a0101' $$,
  null, null,
  '2.4j. Bir odanın oteli değiştirilemez');


select deneme.cikis();
select * from finish();
rollback;
