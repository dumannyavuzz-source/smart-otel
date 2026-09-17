-- =====================================================================
-- GÜVENLİK DENEMELERİ
-- Kaynak: docs/security/001-rls-and-maker-checker.md · Bölüm 6 (22 madde)
--         docs/decisions/005-demo-suresi-ve-odeme-duvari.md · 25. bölüm (demo kilidi)
--         docs/security/007-iletisim-formu.md · 26. bölüm (vitrin iletişim formu)
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

select plan(185);


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
-- Kadro ve iki otel (yönetici bağlantısıyla kurulur — OtelDijital ekibi gibi)
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

insert into public.memberships (hotel_id, user_id, role, name, job) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a001', 'staff',   'Ayşe',   'housekeeping'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a002', 'staff',   'Ali',    'warehouse'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a003', 'manager', 'Mehmet', null),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a004', 'owner',   'Sahip',  null),
  ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000b001', 'staff',   'Burak',  'housekeeping');

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

select is((select received_quantity from public.deliveries where id = 'e0000000-0000-4000-8000-000000000001'), 18::numeric,
  '11i. Eski kayıt (18) hâlâ durur; yenisi (19) onu işaret eder');


-- =====================================================================
-- 11j · EKSİK TESLİM KANIT İSTER (çürük/hasarlı ürün — Aşama 17)
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (talep eden)

select lives_ok(
  $$ insert into public.purchase_requests (id, hotel_id, product_id, quantity)
     values ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-000000000a01', 10) $$,
  '11j. Ayşe 10 ister');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select lives_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'approved', 10) $$,
  '11k. Mehmet 10 onaylar');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali (depo görevlisi)

select is((select approved_quantity from public.approvals
            where purchase_request_id = 'd0000000-0000-4000-8000-000000000003'), 10::numeric,
  '11l. Depo görevlisi onaylanan miktarı görür ("kaç bekliyoruz?")');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e3-fatura.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '11m. Ali fatura fotoğrafını yükler');

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 7,
             'a0000000-0000-4000-8000-000000000001/deliveries/e3-fatura.jpg') $$,
  null, 'Eksik teslimde eksik/hasar fotoğrafı da gerekir.',
  '11n. 10 onaylandı, 7 geldi: kanıt fotoğrafı olmadan yazılamaz');

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity,
                                    invoice_photo_path, damage_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 7,
             'a0000000-0000-4000-8000-000000000001/deliveries/e3-fatura.jpg',
             'a0000000-0000-4000-8000-000000000001/deliveries/e3-hasar.jpg') $$,
  null, 'Eksik/hasar fotoğrafı yüklenmeden teslim yazılamaz.',
  '11o. Yüklenmemiş bir hasar fotoğrafının yolunu yazmak yetmez');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e3-hasar.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '11p. Ali çürük/eksik ürünün fotoğrafını yükler');

select lives_ok(
  $$ insert into public.deliveries (id, hotel_id, purchase_request_id, received_quantity,
                                    invoice_photo_path, damage_photo_path)
     values ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
             'd0000000-0000-4000-8000-000000000003', 7,
             'a0000000-0000-4000-8000-000000000001/deliveries/e3-fatura.jpg',
             'a0000000-0000-4000-8000-000000000001/deliveries/e3-hasar.jpg') $$,
  '11q. Kanıtla birlikte eksik teslim yazılır');

select is((select damage_photo_path from public.deliveries where id = 'e0000000-0000-4000-8000-000000000003'),
  'a0000000-0000-4000-8000-000000000001/deliveries/e3-hasar.jpg',
  '11r. Kanıt kayıtta durur (beyan gibi: değişmez)');

-- Tam gelen teslim: kanıt istenmez
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe
select lives_ok(
  $$ insert into public.purchase_requests (id, hotel_id, product_id, quantity)
     values ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-000000000a01', 4) $$,
  '11s. Ayşe 4 ister');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet
select lives_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'approved', 4) $$,
  '11t. Mehmet 4 onaylar');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e4-fatura.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '11u. Ali fatura fotoğrafını yükler');

select lives_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 4,
             'a0000000-0000-4000-8000-000000000001/deliveries/e4-fatura.jpg') $$,
  '11v. Tam gelen teslimde hasar fotoğrafı istenmez');



-- =====================================================================
-- 11w · KESİRLİ MİKTAR (7,5 Kg domates — Aşama 17.1)
-- Zincirin üç halkası da ondalıklı sayıyı olduğu gibi saklamalı; yoksa
-- "2,5 Kg onaylandı, 1,5 Kg geldi" karşılaştırması yalan söyler.
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (talep eden)

select lives_ok(
  $$ insert into public.purchase_requests (id, hotel_id, product_id, quantity)
     values ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-000000000a01', 2.5) $$,
  '11w. Ayşe 2,5 Kg ister (kesirli talep)');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select lives_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 'approved', 2.5) $$,
  '11x. Mehmet 2,5 Kg onaylar');

select is((select approved_quantity from public.approvals
            where purchase_request_id = 'd0000000-0000-4000-8000-000000000005'), 2.5::numeric,
  '11y. Onay 2,5 olarak durur — tam sayıya yuvarlanmaz');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali (depo görevlisi)

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e5-fatura.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '11z. Ali fatura fotoğrafını yükler');

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', 1.5,
             'a0000000-0000-4000-8000-000000000001/deliveries/e5-fatura.jpg') $$,
  null, 'Eksik teslimde eksik/hasar fotoğrafı da gerekir.',
  '11aa. 2,5 onaylandı, 1,5 geldi: kesirli eksik de kanıt ister');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e5-hasar.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '11ab. Ali eksiğin fotoğrafını yükler');

select lives_ok(
  $$ insert into public.deliveries (id, hotel_id, purchase_request_id, received_quantity,
                                    invoice_photo_path, damage_photo_path)
     values ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
             'd0000000-0000-4000-8000-000000000005', 1.5,
             'a0000000-0000-4000-8000-000000000001/deliveries/e5-fatura.jpg',
             'a0000000-0000-4000-8000-000000000001/deliveries/e5-hasar.jpg') $$,
  '11ac. Kanıtla birlikte kesirli teslim yazılır');

select is((select received_quantity from public.deliveries where id = 'e0000000-0000-4000-8000-000000000005'),
  1.5::numeric,
  '11ad. Teslim 1,5 olarak durur');

-- Uyuşmazlık alarmının veri yolu: müdür teslimi ve kanıtını görebilmeli, yoksa panele kırmızı kutu düşmez.
select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select is((select damage_photo_path from public.deliveries where id = 'e0000000-0000-4000-8000-000000000005'),
  'a0000000-0000-4000-8000-000000000001/deliveries/e5-hasar.jpg',
  '11ae. Müdür eksik teslimi ve kanıt fotoğrafını görür (panelde kırmızı alarm)');


-- =====================================================================
-- 11af · "SAYI OLMAYAN SAYI" VE DEVASA MİKTAR (Aşama 17.1 güvenlik denetimi)
--
-- Ondalıklı sayıya geçince tam sayıda imkânsız olan bir şey mümkün oldu: NaN.
-- PostgreSQL NaN'ı bütün sayılardan büyük sayar; üst sınır olmasaydı NaN yazan biri
-- "gelen < onaylanan mı?" sorusunu atlatır ve EKSİK TESLİMDE KANIT FOTOĞRAFI İSTENMEZDİ.
-- Aşağıdaki denemelerin hepsi reddedilmelidir.
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (talep eden)

select lives_ok(
  $$ insert into public.purchase_requests (id, hotel_id, product_id, quantity)
     values ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-000000000a01', 10) $$,
  '11af. Ayşe 10 ister');

select throws_ok(
  $$ insert into public.purchase_requests (hotel_id, product_id, quantity)
     values ('a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-000000000a01', 'NaN') $$,
  null, null,
  '11ag. "NaN" miktarlı talep reddedilir (satın alma defteri kirletilemez)');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select lives_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 'approved', 10) $$,
  '11ah. Mehmet 10 onaylar');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali (depo görevlisi)

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e6-fatura.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '11ai. Ali fatura fotoğrafını yükler');

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 'NaN',
             'a0000000-0000-4000-8000-000000000001/deliveries/e6-fatura.jpg') $$,
  null, null,
  '11aj. "NaN" miktarlı teslim reddedilir — kanıt şartı bu yolla atlatılamaz');

select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 10000,
             'a0000000-0000-4000-8000-000000000001/deliveries/e6-fatura.jpg') $$,
  null, null,
  '11ak. Devasa miktar (10000) reddedilir');

-- Tam gelen teslimde de hasar fotoğrafının yolu gerçek olmalı:
-- yoksa müdüre "kanıt" diye başka bir fotoğraf gösterilebilirdi.
select throws_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity,
                                    invoice_photo_path, damage_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 10,
             'a0000000-0000-4000-8000-000000000001/deliveries/e6-fatura.jpg',
             'a0000000-0000-4000-8000-000000000001/deliveries/olmayan.jpg') $$,
  null, 'Eksik/hasar fotoğrafı yüklenmeden teslim yazılamaz.',
  '11al. Tam gelen teslime uydurma kanıt fotoğrafı yolu yazılamaz');

select lives_ok(
  $$ insert into public.deliveries (hotel_id, purchase_request_id, received_quantity, invoice_photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000006', 10,
             'a0000000-0000-4000-8000-000000000001/deliveries/e6-fatura.jpg') $$,
  '11am. Kuralına uyan teslim yazılır');

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

-- Fatura gizliliği (Aşama 17.2): kat görevlisi tedarikçi fiyatını göremez.
select is_empty(
  $$ select * from storage.objects
     where name like 'a0000000-0000-4000-8000-000000000001/deliveries/%' $$,
  '16b. Kat görevlisi kendi otelinin fatura/kanıt fotoğraflarını GÖREMEZ (tedarikçi fiyatı gizlidir)');

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

-- Fatura gizliliği · kimler görür? (Aşama 17.2 · Genel Müdür talimatı)
select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/mudur-fatura.jpg',
             'a0000000-0000-4000-8000-00000000a003') $$,
  '16e. Müdür de teslim klasörüne fotoğraf yükleyebilir');

select isnt_empty(
  $$ select 1 from storage.objects
     where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg' $$,
  '16f. Müdür, başkasının yüklediği fatura fotoğrafını görür (panelde kanıta bakar)');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali (depo görevlisi)

select isnt_empty(
  $$ select 1 from storage.objects
     where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg' $$,
  '16g. Depo görevlisi KENDİ yüklediği fotoğrafı görür');

select is_empty(
  $$ select * from storage.objects
     where name = 'a0000000-0000-4000-8000-000000000001/deliveries/mudur-fatura.jpg' $$,
  '16h. Ama başkasının yüklediği teslim fotoğrafını göremez');

select deneme.giris('a0000000-0000-4000-8000-00000000a002');   -- Ali

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '23505', null,
  '17a. Aynı yola ikinci fotoğraf yüklenemez');

-- Fotoğraf değiştirilemez ve silinemez. İki ortamda iki farklı biçimde reddedilir:
--   * Supabase Cloud: storage koruma tetikleyicisi doğrudan istisna fırlatır.
--   * Yerel/eski kurulum: kural olmadığı için sessizce SIFIR satır etkilenir.
-- Sonuç ikisinde de aynı olmalı: fotoğraf yerinde ve değişmemiş durmalı.
-- Bu yüzden denemeyi yutup SONUCU denetliyoruz; nasıl reddedildiği değil, reddedildiği önemli.
do $$
begin
  begin
    update storage.objects set metadata = '{"degisti": true}'
    where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg';
  exception when others then null;
  end;
end
$$;

select is((select metadata is null from storage.objects
           where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg'), true,
  '17b. Fotoğrafın üzerine yazılamaz');

do $$
begin
  begin
    delete from storage.objects
    where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg';
  exception when others then null;
  end;
end
$$;

select is((select count(*)::int from storage.objects
           where name = 'a0000000-0000-4000-8000-000000000001/deliveries/e0000000-0000-4000-8000-000000000001.jpg'), 1,
  '17c. Fotoğraf silinemez');


-- =====================================================================
-- 18 – 19 · MİSAFİR KAPISI (veritabanı tarafı: misafir_yorumu_yaz)
-- Kabuğun (HTTP) denemeleri: supabase/functions/guest-feedback/kapi_test.ts
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe

select throws_ok(
  $$ select public.misafir_yorumu_yaz('0123456789abcdef0123456789abcdef', 5, 'deneme') $$,
  '42501', null,
  '18-hazırlık. Giriş yapmış personel bile misafir kapısını doğrudan çağıramaz (yalnızca ana anahtar)');

select deneme.anonim();

select throws_ok(
  $$ select public.misafir_yorumu_yaz('0123456789abcdef0123456789abcdef', 5, 'deneme') $$,
  '42501', null,
  '18-hazırlık. Girişsiz (anon) misafir kapısını doğrudan çağıramaz');

select deneme.ana_anahtar();   -- Edge Function gibi davran

select throws_ok(
  $$ select public.misafir_yorumu_yaz('00000000000000000000000000000000', 4, 'deneme') $$,
  null, 'Bu bağlantı geçersiz.',
  '18. Uydurma oda kodu → "Bu bağlantı geçersiz." — başka bilgi yok');

select throws_ok(
  $$ select public.misafir_yorumu_yaz('kisa-kod', 4, 'deneme') $$,
  null, 'Bu bağlantı geçersiz.',
  '18b. Bozuk biçimli kod → aynı cevap (kodun var olup olmadığı belli olmaz)');

select throws_ok(
  $$ select public.misafir_yorumu_yaz(
       (select guest_code from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201'), 9, 'x') $$,
  null, 'Puan 1 ile 5 arasında olmalı.',
  '18c. Puan 1–5 dışında reddedilir');

select throws_ok(
  $$ select public.misafir_yorumu_yaz(
       (select guest_code from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201'), 3, repeat('a', 501)) $$,
  null, 'Yorum en fazla 500 karakter olabilir.',
  '18d. 500 karakterden uzun yorum reddedilir');

-- 19: aynı odadan 3 yorum olur, 4. olmaz
select lives_ok(
  $$ select public.misafir_yorumu_yaz(
       (select guest_code from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201'), 5, '  Harika  ') $$,
  '19-hazırlık. 1. yorum yazıldı');

select lives_ok(
  $$ select public.misafir_yorumu_yaz(
       (select guest_code from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201'), 4, null) $$,
  '19-hazırlık. 2. yorum yazıldı (yalnızca puan)');

select lives_ok(
  $$ select public.misafir_yorumu_yaz(
       (select guest_code from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201'), 1, 'Oda kirliydi') $$,
  '19-hazırlık. 3. yorum yazıldı');

select throws_ok(
  $$ select public.misafir_yorumu_yaz(
       (select guest_code from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201'), 2, 'spam') $$,
  null, 'Lütfen biraz sonra tekrar deneyin.',
  '19. Aynı odadan 1 dakikada 4. yorum reddedilir');

select is((select count(*)::int from public.guest_feedback where room_id = 'b0000000-0000-4000-8000-0000000b0201'), 3,
  '19b. Odada tam 3 yorum var');

select is((select hotel_id from public.guest_feedback where room_id = 'b0000000-0000-4000-8000-0000000b0201' limit 1),
  'b0000000-0000-4000-8000-000000000001'::uuid,
  '19c. Yorum doğru otele yazıldı (otel KODDAN bulunur, telefonun sözüyle değil)');

select is((select comment from public.guest_feedback where room_id = 'b0000000-0000-4000-8000-0000000b0201' and rating = 5), 'Harika',
  '19d. Yorum kırpılmış düz metin olarak saklandı');

-- Kapalı oda ve kod yenileme (002 · A.10: "Kod sızarsa müdür tek dokunuşla yeniler")
select deneme.cikis();
update public.rooms set is_active = false where id = 'b0000000-0000-4000-8000-0000000b0201';
create temp table eski_kod as select guest_code from public.rooms where id = 'a0000000-0000-4000-8000-0000000a0101';
grant select on eski_kod to public;

select deneme.ana_anahtar();

select throws_ok(
  $$ select public.misafir_yorumu_yaz(
       (select guest_code from public.rooms where id = 'b0000000-0000-4000-8000-0000000b0201'), 5, 'x') $$,
  null, 'Bu bağlantı geçersiz.',
  '18e. Kapalı odanın kodu geçersiz sayılır');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select lives_ok(
  $$ update public.rooms set guest_code = replace(gen_random_uuid()::text, '-', '')
     where id = 'a0000000-0000-4000-8000-0000000a0101' $$,
  '18f. Müdür odanın misafir kodunu yeniler');

select deneme.ana_anahtar();

select throws_ok(
  $$ select public.misafir_yorumu_yaz((select guest_code from eski_kod), 5, 'x') $$,
  null, 'Bu bağlantı geçersiz.',
  '18g. Eski (sızmış) kod artık geçersiz');


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

-- Çözüm fotoğrafı (teknisyen "Çözdüm" + isteğe bağlı fotoğraf)
select throws_ok(
  $$ update public.work_orders
     set resolved_photo_path = 'a0000000-0000-4000-8000-000000000001/resolutions/x.jpg'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000002' $$,
  null, 'Çözüm fotoğrafı yalnızca "Çözdüm" derken eklenir.',
  '20g. Çözmeden çözüm fotoğrafı eklenemez');

select throws_ok(
  $$ update public.work_orders
     set status = 'resolved', resolved_photo_path = 'a0000000-0000-4000-8000-000000000001/resolutions/yok.jpg'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000002' $$,
  null, 'Fotoğraf yüklenmeden çözüm yazılamaz.',
  '20h. Depoda olmayan fotoğrafla çözüm yazılamaz');

select throws_ok(
  $$ update public.work_orders
     set status = 'resolved', resolved_photo_path = 'b0000000-0000-4000-8000-000000000001/deliveries/b-fatura.jpg'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000002' $$,
  null, 'Fotoğraf yüklenmeden çözüm yazılamaz.',
  '20i. Başka otelin fotoğrafıyla çözüm yazılamaz');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/resolutions/cozum-w2.jpg',
             'a0000000-0000-4000-8000-00000000a002') $$,
  '20j. Ali çözüm fotoğrafını yükler');

select lives_ok(
  $$ update public.work_orders
     set status = 'resolved', resolved_photo_path = 'a0000000-0000-4000-8000-000000000001/resolutions/cozum-w2.jpg'
     where issue_report_id = 'f0000000-0000-4000-8000-000000000002' $$,
  '20k. Fotoğraf yüklendikten sonra "Çözdüm" + fotoğraf yazılır');

select is((select resolved_by from public.work_orders where issue_report_id = 'f0000000-0000-4000-8000-000000000002'),
  'a0000000-0000-4000-8000-00000000a002'::uuid,
  '20l. İmza: çözen = Ali');


-- =====================================================================
-- 4.4 · ARIZA FOTOĞRAFI: önce fotoğraf, sonra kayıt; yol otelin klasöründe
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe

select throws_ok(
  $$ insert into public.issue_reports (hotel_id, room_id, description, photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000a0101', 'Lamba',
             'a0000000-0000-4000-8000-000000000001/issues/yok.jpg') $$,
  null, 'Fotoğraf yüklenmeden arıza kaydı yazılamaz.',
  '4.4a. Depoda olmayan fotoğrafı işaret eden arıza kaydı reddedilir');

select throws_ok(
  $$ insert into public.issue_reports (hotel_id, room_id, description, photo_path)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000a0101', 'Lamba',
             'b0000000-0000-4000-8000-000000000001/deliveries/b-fatura.jpg') $$,
  null, 'Fotoğraf yüklenmeden arıza kaydı yazılamaz.',
  '4.4b. Başka otelin fotoğrafını işaret eden arıza kaydı reddedilir');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('photos', 'a0000000-0000-4000-8000-000000000001/issues/f0000000-0000-4000-8000-000000000009.jpg',
             'a0000000-0000-4000-8000-00000000a001') $$,
  '4.4c. Ayşe arıza fotoğrafını kendi otelinin klasörüne yükler');

select lives_ok(
  $$ insert into public.issue_reports (id, hotel_id, room_id, description, photo_path)
     values ('f0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-0000000a0101', 'Lamba',
             'a0000000-0000-4000-8000-000000000001/issues/f0000000-0000-4000-8000-000000000009.jpg') $$,
  '4.4d. Fotoğraf yüklendikten sonra arıza kaydı yazılır');


-- =====================================================================
-- 2.3 – 2.4 · KAT GÖREVLİSİ İLE MÜDÜRÜN SINIRI (kilit tablosu)
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe

select is_empty($$ select * from public.guest_feedback $$,
  '2.4a. Görevli misafir yorumlarını göremez');

-- Aşama 17'de bilerek gevşetildi: depo görevlisi, teslim alacağı ONAYLANMIŞ talebin
-- kaç adet onaylandığını görebilmelidir ("kaç bekliyoruz?"). Bekleyen talebin kararı yoktur,
-- reddedilen talebin kararı ise görevliye kapalıdır. Karar YAZMAK yine yalnızca müdürdedir.
select isnt_empty($$ select * from public.approvals $$,
  '2.4b. Görevli, onaylanmış talebin kararını görür (teslim alabilmek için — Aşama 17 kararı)');

select throws_ok(
  $$ insert into public.approvals (hotel_id, purchase_request_id, decision, approved_quantity)
     values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'approved', 5) $$,
  null, null,
  '2.4b2. Ama görevli karar YAZAMAZ');

select throws_ok(
  $$ insert into public.rooms (hotel_id, number)
     values ('a0000000-0000-4000-8000-000000000001', '999') $$,
  '42501', null,
  '2.4c. Görevli oda ekleyemez');

select throws_ok(
  $$ insert into public.memberships (hotel_id, user_id, role, name, job)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a005', 'staff', 'Yeni', 'technician') $$,
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
  $$ insert into public.memberships (hotel_id, user_id, role, name)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a005', 'manager', 'Yeni') $$,
  '42501', null,
  '2.4g. Müdür, müdür ekleyemez (yalnızca sahip ekler)');

select lives_ok(
  $$ insert into public.memberships (hotel_id, user_id, role, name, job)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000a005', 'staff', 'Yeni', 'technician') $$,
  '2.4h. Müdür görevli (teknisyen) ekler');

select throws_ok(
  $$ insert into public.memberships (hotel_id, user_id, role, name)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000b001', 'staff', 'Burak') $$,
  '23514', null,
  '2.4h2. Görevsiz görevli eklenemez (kat görevlisi mi, teknisyen mi?)');

select is((select count(*)::int from public.memberships where hotel_id = 'a0000000-0000-4000-8000-000000000001'), 5,
  '2.4h3. Müdür otelin tüm personelini adlarıyla görür');

delete from public.memberships where user_id = 'a0000000-0000-4000-8000-00000000a003';
select is((select count(*)::int from public.memberships where user_id = 'a0000000-0000-4000-8000-00000000a003'), 1,
  '2.4i. Kimse kendini silemez');

select throws_ok(
  $$ update public.rooms set hotel_id = 'b0000000-0000-4000-8000-000000000001'
     where id = 'a0000000-0000-4000-8000-0000000a0101' $$,
  null, null,
  '2.4j. Bir odanın oteli değiştirilemez');

-- Ürün sınırı: en fazla 8 açık ürün (ekran değil, veritabanı sayar)
select lives_ok(
  $$ insert into public.products (hotel_id, name)
     select 'a0000000-0000-4000-8000-000000000001', 'Ürün ' || g from generate_series(2, 8) g $$,
  '2.4k. Müdür 8. ürüne kadar ekler');

select throws_ok(
  $$ insert into public.products (hotel_id, name) values ('a0000000-0000-4000-8000-000000000001', 'Dokuzuncu') $$,
  null, 'Listede en fazla 8 ürün olabilir. Önce birini listeden çıkarın.',
  '2.4l. 9. ürün reddedilir');

select lives_ok(
  $$ update public.products set is_active = false where name = 'Ürün 8' $$,
  '2.4m. Müdür bir ürünü kapatır');

select lives_ok(
  $$ insert into public.products (hotel_id, name) values ('a0000000-0000-4000-8000-000000000001', 'Dokuzuncu') $$,
  '2.4n. Bir ürün kapanınca yeni ürün eklenebilir');

select throws_ok(
  $$ update public.products set is_active = true where name = 'Ürün 8' $$,
  null, 'Listede en fazla 8 ürün olabilir. Önce birini listeden çıkarın.',
  '2.4o. Kapalı ürünü açmak da sınıra takılır');



-- =====================================================================
-- 23 · "BAŞKA OTELDE DE ÇALIŞIYOR MU?" SORUSU (Aşama 19.1)
--
-- Şifre yenileme kapısı bu soruyu sorar: bir kişi iki otelde çalışıyorsa, bir otelin müdürü
-- onun şifresini yenileyerek DİĞER otelin kapısını da açmış olurdu. Soru bile yetki ister.
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (kat görevlisi)

select throws_ok(
  $$ select public.baska_otelde_calisiyor_mu('a0000000-0000-4000-8000-00000000a002',
                                             'a0000000-0000-4000-8000-000000000001') $$,
  null, 'Yetkiniz yok.',
  '23a. Görevli bu soruyu soramaz');

select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select is(
  (select public.baska_otelde_calisiyor_mu('a0000000-0000-4000-8000-00000000a002',
                                           'a0000000-0000-4000-8000-000000000001')),
  false,
  '23b. Müdür sorabilir: tek otelde çalışan için cevap "hayır"');

select throws_ok(
  $$ select public.baska_otelde_calisiyor_mu('b0000000-0000-4000-8000-00000000b001',
                                            'a0000000-0000-4000-8000-000000000001') $$,
  null, 'Yetkiniz yok.',
  '23c. Otelde çalışmayan biri hakkında soru sorulamaz (müdür tanımadığı hesabı yoklayamaz)');

-- Burak iki otelde birden çalışmaya başlarsa:
select lives_ok(
  $$ insert into public.memberships (hotel_id, user_id, role, name, job)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000b001',
             'staff', 'Burak', 'housekeeping') $$,
  '23d. Müdür, Burak''ı kendi oteline de görevli olarak ekler');

select is(
  (select public.baska_otelde_calisiyor_mu('b0000000-0000-4000-8000-00000000b001',
                                           'a0000000-0000-4000-8000-000000000001')),
  true,
  '23e. İki otelde çalışan için cevap "evet" — şifresine dokunulmaz (yetki sıçraması kapalı)');


-- =====================================================================
-- 24 · KAYIT KAPISI (Aşama 20)
--
-- Otel açmak, sistemin tek kimlik doğrulamasız yazma yoludur ve YALNIZCA kapıdan geçer.
-- Girişli bir kullanıcı ne yeni otel açabilir ne de kayıt sayacına dokunabilir.
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür)

select throws_ok(
  $$ insert into public.hotels (name) values ('Korsan Otel') $$,
  '42501', null,
  '24a. Girişli bir müdür bile yeni otel açamaz (otel yalnızca kayıt kapısından doğar)');

select is_empty(
  $$ select * from public.kayit_denemeleri $$,
  '24b. Kayıt sayacı kimseye görünmez');

select throws_ok(
  $$ insert into public.kayit_denemeleri (ip_ozeti) values ('aaaaaaaaaaaaaaaa') $$,
  '42501', null,
  '24c. Kayıt sayacına kimse satır yazamaz');

select throws_ok(
  $$ select public.kayit_denemesi_say_ve_yaz('aaaaaaaaaaaaaaaa') $$,
  '42501', null,
  '24d. Sayaç fonksiyonunu yalnızca kayıt kapısı çağırabilir');


-- =====================================================================
-- 25 · DEMO SÜRESİ ve ÖDEME DUVARI
-- Bu bölüm bilerek EN SONDA durur: Otel A'nın demo süresini geçmişe alır.
-- =====================================================================
select deneme.giris('a0000000-0000-4000-8000-00000000a004');   -- Sahip (A)

select throws_ok(
  $$ update public.hotels set demo_bitis_tarihi = now() + interval '365 days'
     where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  '25a. Otelin sahibi bile kendi demo süresini uzatamaz');

select deneme.cikis();

-- Süreyi geçmişe alıyoruz. Bunu yalnızca biz yapabiliriz (kartsız, ana anahtarla).
update public.hotels set demo_bitis_tarihi = now() - interval '1 day'
where id = 'a0000000-0000-4000-8000-000000000001';

select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (A)

select throws_ok(
  $$ insert into public.room_cleanings (hotel_id, room_id)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000a0101') $$,
  '42501', null,
  '25b. Demo süresi dolunca görevli yeni beyan yazamaz');

select isnt_empty(
  $$ select * from public.rooms where hotel_id = 'a0000000-0000-4000-8000-000000000001' $$,
  '25c. Demo süresi dolsa da kayıtlar okunmaya devam eder — veri silinmez, gizlenmez');

select deneme.cikis();
select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür, A)

select throws_ok(
  $$ insert into public.rooms (hotel_id, number) values ('a0000000-0000-4000-8000-000000000001', '999') $$,
  '42501', null,
  '25d. Demo süresi dolunca müdür yeni oda ekleyemez');

select deneme.cikis();
select deneme.giris('b0000000-0000-4000-8000-00000000b001');   -- Burak (B)

select lives_ok(
  $$ insert into public.room_cleanings (hotel_id, room_id)
     values ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000b0201') $$,
  '25e. Bir otelin süresi dolunca komşu otel etkilenmez');

select deneme.cikis();


-- =====================================================================
-- 26 · İLETİŞİM FORMU (Vitrin · Aşama 7)
-- Vitrindeki form, kimlik doğrulamasız İKİNCİ yazma yoludur. Ziyaretçi yalnızca yazar;
-- kimse okuyamaz, değiştiremez, silemez. Sel kapısı: aynı adresten saatte 5, toplamda 300.
-- Otel verisine dokunmaz; 25. bölümün demo süresinden etkilenmez.
-- Adres: önce cf-connecting-ip, yoksa x-forwarded-for'un SON parçası (ilk parça istemcinindir).
-- =====================================================================
select deneme.anonim();
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.5, 10.0.0.1"}', true);

select lives_ok(
  $$ insert into public.iletisim_formu (ad_soyad, otel_adi, telefon, eposta, konu, mesaj)
     values ('Ayşe Yılmaz', 'Deniz Otel', '+90 532 000 00 00', 'ayse@ornek.com', 'SEO', 'Merhaba') $$,
  '26a. Ziyaretçi (anon) geçerli bir mesaj bırakabilir');

select throws_ok(
  $$ select * from public.iletisim_formu $$,
  '42501', null,
  '26b. Ziyaretçi mesajları okuyamaz (yetki yok)');

select throws_ok(
  $$ update public.iletisim_formu set mesaj = 'x' $$,
  '42501', null,
  '26c. Ziyaretçi mesaj değiştiremez');

select throws_ok(
  $$ delete from public.iletisim_formu $$,
  '42501', null,
  '26d. Ziyaretçi mesaj silemez');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu, olusturulma_tarihi)
     values ('Ayşe Yılmaz', '+90 532 000 00 00', 'ayse@ornek.com', 'SEO', '2000-01-01') $$,
  '42501', null,
  '26e. Ziyaretçi tarihi kendisi yazamaz (sütun yetkisi yok)');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Ayşe Yılmaz', '+90 532 000 00 00', 'ayse@ornek.com', 'Uydurma Konu') $$,
  '23514', null,
  '26f. Listede olmayan konu reddedilir');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Ayşe Yılmaz', '+90 532 000 00 00', 'bu-eposta-degil', 'SEO') $$,
  '23514', null,
  '26g. Biçimsiz e-posta reddedilir');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu, mesaj)
     values ('Ayşe Yılmaz', '+90 532 000 00 00', 'ayse@ornek.com', 'SEO', repeat('a', 2001)) $$,
  '23514', null,
  '26h. 2000 karakterden uzun mesaj reddedilir');

-- Aynı adresten 4 mesaj daha (toplam 5) sorunsuz; 6.sı sel kapısına çarpar.
select lives_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     select 'Ayşe Yılmaz', '+90 532 000 00 00', 'ayse@ornek.com', 'SEO' from generate_series(1, 4) $$,
  '26i. Aynı adresten saatte 5 mesaja kadar izin verilir');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Ayşe Yılmaz', '+90 532 000 00 00', 'ayse@ornek.com', 'SEO') $$,
  'P0001', null,
  '26j. Aynı adresten altıncı mesaj reddedilir (sel kapısı)');

select set_config('request.headers', '{"x-forwarded-for":"198.51.100.7"}', true);

select lives_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Ali Kaya', '+90 533 111 11 11', 'ali@ornek.com', 'Web Sitesi') $$,
  '26k. Başka bir adres sel kapısından etkilenmez');

select set_config('request.headers', '', true);
select deneme.cikis();
select deneme.giris('a0000000-0000-4000-8000-00000000a001');   -- Ayşe (kat görevlisi, A)

select throws_ok(
  $$ select * from public.iletisim_formu $$,
  '42501', null,
  '26l. Giriş yapmış personel bile mesajları okuyamaz — otelin işi değil');

select deneme.cikis();
select deneme.ana_anahtar();

select is(
  (select ip_ozeti from public.iletisim_formu where eposta = 'ali@ornek.com'),
  encode(extensions.digest('198.51.100.7', 'sha256'), 'hex'),
  '26m. Adres açık yazılmaz; yalnızca özeti (SHA-256) saklanır');

-- ---- Sahte başlık: istemcinin yazdığı ilk parça değil, vekilin eklediği gerçek adres sayılır ----
select deneme.cikis();
select deneme.anonim();
select set_config('request.headers', '{"x-forwarded-for":"1.1.1.1, 203.0.113.9","cf-connecting-ip":"203.0.113.9"}', true);

select lives_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Sahte Deneme', '+90 534 222 22 22', 'sahte1@ornek.com', 'Diğer') $$,
  '26n-hazırlık. cf-connecting-ip varken mesaj yazılır');

select set_config('request.headers', '{"x-forwarded-for":"9.9.9.9, 203.0.113.10"}', true);

select lives_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Sahte Deneme', '+90 534 333 33 33', 'sahte2@ornek.com', 'Diğer') $$,
  '26o-hazırlık. Yalnızca x-forwarded-for varken mesaj yazılır');

select set_config('request.headers', '', true);
select deneme.cikis();
select deneme.ana_anahtar();

select is(
  (select ip_ozeti from public.iletisim_formu where eposta = 'sahte1@ornek.com'),
  encode(extensions.digest('203.0.113.9', 'sha256'), 'hex'),
  '26n. cf-connecting-ip varsa o sayılır; istemcinin yazdığı x-forwarded-for değil');

select is(
  (select ip_ozeti from public.iletisim_formu where eposta = 'sahte2@ornek.com'),
  encode(extensions.digest('203.0.113.10', 'sha256'), 'hex'),
  '26o. cf-connecting-ip yoksa x-forwarded-for''un SON parçası sayılır (ilk parça istemcinindir)');

-- ---- Giriş yapmış personel: ne ekler, ne değiştirir, ne siler ----
select deneme.cikis();
select deneme.giris('a0000000-0000-4000-8000-00000000a003');   -- Mehmet (müdür, A)

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Mehmet', '+90 532 000 00 00', 'mehmet@ornek.com', 'SEO') $$,
  '42501', null,
  '26p. Giriş yapmış müdür bile bu tabloya mesaj yazamaz — form yalnızca vitrindeki ziyaretçi içindir');

select throws_ok(
  $$ update public.iletisim_formu set mesaj = 'x' $$,
  '42501', null,
  '26q. Giriş yapmış müdür mesaj değiştiremez');

select throws_ok(
  $$ delete from public.iletisim_formu $$,
  '42501', null,
  '26r. Giriş yapmış müdür mesaj silemez');

select throws_ok(
  $$ select public.iletisim_sel_kapisi() $$,
  null, null,
  '26t. Sel kapısı fonksiyonu elle çağrılamaz (giriş yapmış kullanıcı)');

-- ---- Ziyaretçi: ip_ozeti sütununa yazamaz, fonksiyonu çağıramaz, boşluk ve biçim kısıtları ----
select deneme.cikis();
select deneme.anonim();

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu, ip_ozeti)
     values ('Ayşe Yılmaz', '+90 532 000 00 00', 'ayse2@ornek.com', 'SEO', 'sahte-ozet') $$,
  '42501', null,
  '26s. Ziyaretçi adres özetini kendisi yazamaz (sütun yetkisi yok)');

select throws_ok(
  $$ select public.iletisim_sel_kapisi() $$,
  null, null,
  '26t2. Sel kapısı fonksiyonu elle çağrılamaz (ziyaretçi)');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('        ', '+90 532 000 00 00', 'bos@ornek.com', 'SEO') $$,
  '23514', null,
  '26u. Yalnızca boşluktan oluşan ad reddedilir (kırpılınca boş kalır)');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('A' || repeat(' ', 200) || 'B', '+90 532 000 00 00', 'ic-bosluk@ornek.com', 'SEO') $$,
  '23514', null,
  '26v. İçi boşlukla şişirilmiş ad reddedilir (kısıt ham uzunluğu ölçer)');

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Ayşe Yılmaz', 'beni ara lütfen', 'tel@ornek.com', 'SEO') $$,
  '23514', null,
  '26w. Telefon alanına rakam dışı metin yazılamaz');

select lives_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('  Ali  ' || repeat(' ', 100000), ' +90 (532) 123 45 67 ', 'KIRP@Ornek.com', 'Diğer') $$,
  '26x-hazırlık. Baştaki/sondaki boşluklar kırpılır, kayıt geçer');

select deneme.cikis();
select deneme.ana_anahtar();

select is(
  (select ad_soyad || '|' || telefon || '|' || eposta from public.iletisim_formu where eposta = 'kirp@ornek.com'),
  'Ali|+90 (532) 123 45 67|kirp@ornek.com',
  '26x. Depoya kırpılmış hâli yazılır; yüz bin boşluk saklanmaz, e-posta küçük harfe iner');

-- ---- Toplam sınır: saatte 300'e ulaşınca yenisi reddedilir (adres bilinmese bile) ----
select lives_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     select 'Sel Denemesi', '+90 500 000 00 00', 'sel@ornek.com', 'Diğer'
     from generate_series(1, 300 - (select count(*) from public.iletisim_formu
                                     where olusturulma_tarihi > now() - interval '1 hour')) $$,
  '26y-hazırlık. Son bir saatteki mesaj sayısı 300''e tamamlanır');

select deneme.cikis();
select deneme.anonim();

select throws_ok(
  $$ insert into public.iletisim_formu (ad_soyad, telefon, eposta, konu)
     values ('Son Damla', '+90 532 000 00 00', 'son@ornek.com', 'SEO') $$,
  'P0001', null,
  '26y. 301. mesaj reddedilir — toplam sel kapısı');

select deneme.cikis();
select * from finish();
rollback;
