-- =====================================================================
-- İLETİŞİM FORMU: VİTRİNDEN GELEN MESAJLAR  (Vitrin · Aşama 7)
--
-- Vitrindeki (oteldijital.com) iletişim formu buraya yazar. Bu, sistemin kimlik doğrulamasız
-- İKİNCİ yazma yoludur (ilki kayıt kapısı). Farkı: burada otel yok, kişi yok; yalnızca
-- "bize ulaşmak isteyen biri" var. Bu yüzden hotel_id sütunu YOKTUR — bu tablo bir otelin
-- verisi değil, satış öncesi bir posta kutusudur (supabase/README.md · "Yeni tablo eklerken"
-- kuralının bilinçli istisnası; gerekçe docs/security/007-iletisim-formu.md).
--
-- Kilit üç cümlede:
--   1. Ziyaretçi (anon) yalnızca YAZAR: altı alan. Kimlik, tarih ve adres özetini veritabanı koyar.
--   2. Kimse okuyamaz, değiştiremez, silemez. Mesajlar yalnızca Supabase panelinden (ana anahtar) okunur.
--   3. Sel kapısı: aynı adresten saatte 5, toplamda saatte 100 mesaj. Fazlası reddedilir.
--
-- Kaynak: docs/security/007-iletisim-formu.md
-- =====================================================================

create table public.iletisim_formu (
  id                  uuid primary key default gen_random_uuid(),
  ad_soyad            text not null check (length(btrim(ad_soyad)) between 2 and 80),
  otel_adi            text check (otel_adi is null or length(otel_adi) <= 80),
  telefon             text not null check (length(btrim(telefon)) between 6 and 24),
  eposta              text not null check (length(eposta) <= 120 and eposta ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  konu                text not null check (konu in ('Teknik Altyapı', 'OTA & Dijital Yönetim', 'Web Sitesi', 'SEO', 'Diğer')),
  mesaj               text check (mesaj is null or length(mesaj) <= 2000),
  -- Adresin özeti (hash). Adres açık yazılmaz; "aynı yerden mi?" sorusu için yeter (kayıt kapısıyla aynı yaklaşım).
  ip_ozeti            text,
  olusturulma_tarihi  timestamptz not null default now()
);

comment on table public.iletisim_formu is
  'Vitrindeki iletişim formundan gelen mesajlar. Ziyaretçi yalnızca yazar; okuma yalnızca Supabase panelinden.';

create index iletisim_formu_tarih_idx on public.iletisim_formu (olusturulma_tarihi desc);
create index iletisim_formu_adres_idx on public.iletisim_formu (ip_ozeti, olusturulma_tarihi desc);


-- ---------------------------------------------------------------------
-- 1. Yetkiler: en az yetki ilkesi
-- Supabase yeni tablolara anon ve authenticated için hazır yetki verir; önce hepsi geri alınır,
-- sonra yalnızca gereken verilir: anon, yalnızca altı sütuna, yalnızca ekleme.
-- Giriş yapmış personel (authenticated) bu tabloya hiç dokunamaz — otelin işi değil.
-- ---------------------------------------------------------------------
revoke all on table public.iletisim_formu from public, anon, authenticated;
grant insert (ad_soyad, otel_adi, telefon, eposta, konu, mesaj) on table public.iletisim_formu to anon;


-- ---------------------------------------------------------------------
-- 2. Kilit (RLS): anon yalnızca ekler; okuma, değiştirme, silme kuralı hiç kimseye yazılmadı.
-- Kural yoksa kilit kapalıdır. Ana anahtar (service_role) kilidi atlar — mesajlar panelden okunur.
-- ---------------------------------------------------------------------
alter table public.iletisim_formu enable row level security;

create policy "ziyaretci mesaj birakir" on public.iletisim_formu
  for insert to anon
  with check (true);


-- ---------------------------------------------------------------------
-- 3. Sel kapısı
-- Her ekleme öncesi çalışır. Ziyaretçinin adresini isteğin başlıklarından okur (PostgREST her
-- isteğin başlıklarını request.headers ayarına koyar), özetini satıra yazar ve sayar:
--   · aynı adresten son bir saatte 5 mesaj varsa altıncısı reddedilir
--   · adres bilinmese bile toplamda son bir saatte 100 mesaj varsa yenisi reddedilir
-- security definer: tabloda okuma yetkisi olmayan ziyaretçi adına sayabilmek için.
-- ---------------------------------------------------------------------
create function public.iletisim_sel_kapisi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_basliklar   json;
  v_adres       text;
  v_ayni_yerden integer;
  v_toplam      integer;
begin
  -- Başlıklar yoksa (ör. doğrudan SQL) sessizce boş kalır; sel kapısı yine toplamı sayar.
  begin
    v_basliklar := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_basliklar := null;
  end;

  v_adres := btrim(split_part(coalesce(v_basliklar ->> 'x-forwarded-for', v_basliklar ->> 'cf-connecting-ip', ''), ',', 1));
  new.ip_ozeti := case when v_adres <> '' then md5(v_adres) else null end;
  new.olusturulma_tarihi := now();

  if new.ip_ozeti is not null then
    select count(*) into v_ayni_yerden
    from public.iletisim_formu
    where ip_ozeti = new.ip_ozeti and olusturulma_tarihi > now() - interval '1 hour';

    if v_ayni_yerden >= 5 then
      raise exception 'Kısa sürede çok fazla mesaj gönderildi. Biraz sonra tekrar deneyin.';
    end if;
  end if;

  select count(*) into v_toplam
  from public.iletisim_formu
  where olusturulma_tarihi > now() - interval '1 hour';

  if v_toplam >= 100 then
    raise exception 'Şu an çok fazla mesaj geliyor. Biraz sonra tekrar deneyin.';
  end if;

  return new;
end;
$$;

-- Bu fonksiyonu kimse elle çağıramaz; yalnızca tetikleyici çalıştırır (staging dersi: anon ve
-- authenticated ayrı ayrı geri alınır, "public" tek başına yetmez).
revoke all on function public.iletisim_sel_kapisi() from public, anon, authenticated;

create trigger iletisim_formu_sel_kapisi
  before insert on public.iletisim_formu
  for each row execute function public.iletisim_sel_kapisi();
