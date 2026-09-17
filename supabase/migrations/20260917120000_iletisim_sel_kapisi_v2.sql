-- =====================================================================
-- İLETİŞİM FORMU — SEL KAPISININ İKİNCİ SÜRÜMÜ  (güvenlik incelemesi, 2026-09-17)
--
-- İlk sürüm (…_iletisim_formu.sql) canlıya çıktıktan sonra Güvenlik Denetçisi dört açık buldu.
-- Uygulanmış göç değiştirilmez; düzeltme bu dosyayla gelir.
--
--   1. Yanlış adres: x-forwarded-for'un İLK parçası istemcinin kendi yazdığı değerdir; her istekte
--      farklı bir sahte adres yazan biri "aynı adresten saatte 5" kuralını hiç görmüyordu.
--      Şimdi önce Cloudflare'in koyduğu cf-connecting-ip okunur; yoksa x-forwarded-for'un
--      SON parçası (vekil sunucunun eklediği gerçek adres) alınır.
--   2. Yarış: aynı anda gelen 50 istek sayacı 0 görüp hepsi geçiyordu. Şimdi eklemeler bir
--      danışma kilidiyle (advisory lock) sıraya girer; sayım doğru olur. Trafik küçük, bedeli yok.
--   3. Boşluk açığı: 'Ali' + beş milyon boşluk kısıtı geçiyordu (kısıt kırpılmış uzunluğa
--      bakıyordu). Şimdi tetikleyici alanları kırpar, kısıt HAM uzunluğu ölçer; telefon yalnızca
--      rakam ve + ( ) . - boşluk içerebilir.
--   4. Özet algoritması: kayıt kapısıyla aynı olsun diye md5 yerine SHA-256. (Tuzsuz özet adresi
--      gizlemez — 4 milyar adres saniyeler içinde denenir; bu yüzden ip_ozeti kişisel veri sayılır,
--      docs/security/007.) Amacı gizlemek değil, "aynı yerden mi?" sorusuna cevap vermektir.
--
-- Toplam sınır saatte 100'den 300'e çıktı: asıl savunma adres sınırıdır; toplam sınır yalnızca
-- veritabanını selden korur. Bilinçli tercih: tek bir saldırgan 60 adresle formu bir saat
-- kapatabilir — bu kabul edilen bir hizmet engelleme sınırıdır (docs/security/007 · Açık kalan).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;


-- ---------------------------------------------------------------------
-- 1. Kısıtlar: ham uzunluk, telefon biçimi
-- Kısıtlar tetikleyiciden SONRA denetlenir; tetikleyici önce kırpar, kısıt sonra ölçer.
-- ---------------------------------------------------------------------
alter table public.iletisim_formu
  drop constraint iletisim_formu_ad_soyad_check,
  add  constraint iletisim_formu_ad_soyad_check check (length(ad_soyad) between 2 and 80),
  drop constraint iletisim_formu_telefon_check,
  add  constraint iletisim_formu_telefon_check  check (telefon ~ '^[0-9+() .-]{6,24}$');


-- ---------------------------------------------------------------------
-- 2. Sel kapısı v2
-- ---------------------------------------------------------------------
create or replace function public.iletisim_sel_kapisi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_basliklar   json;
  v_xff         text;
  v_adres       text;
  v_ayni_yerden integer;
  v_toplam      integer;
begin
  -- Eş zamanlı eklemeler sıraya girsin: sayım her zaman doğru olsun.
  perform pg_advisory_xact_lock(hashtext('iletisim_sel_kapisi'));

  -- Alanları kırp: baştaki/sondaki boşluk, sekme ve satır sonu atılır; boş kalan isteğe bağlı alan null olur.
  new.ad_soyad := btrim(new.ad_soyad, E' \t\r\n');
  new.telefon  := btrim(new.telefon,  E' \t\r\n');
  new.eposta   := lower(btrim(new.eposta, E' \t\r\n'));
  new.otel_adi := nullif(btrim(coalesce(new.otel_adi, ''), E' \t\r\n'), '');
  new.mesaj    := nullif(btrim(coalesce(new.mesaj, ''),    E' \t\r\n'), '');

  -- Ziyaretçinin adresi. Başlıklar yoksa (ör. doğrudan SQL) sessizce boş kalır.
  begin
    v_basliklar := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_basliklar := null;
  end;

  v_xff   := coalesce(v_basliklar ->> 'x-forwarded-for', '');
  v_adres := coalesce(
    nullif(btrim(v_basliklar ->> 'cf-connecting-ip'), ''),                              -- Cloudflare'in koyduğu: güvenilir
    nullif(btrim(split_part(v_xff, ',', -1)), '')                                       -- yoksa XFF'in SON parçası
  );
  new.ip_ozeti := case when v_adres is not null then encode(extensions.digest(v_adres, 'sha256'), 'hex') else null end;
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

  if v_toplam >= 300 then
    raise exception 'Şu an çok fazla mesaj geliyor. Biraz sonra tekrar deneyin.';
  end if;

  return new;
end;
$$;

-- create or replace yetkileri korur; yine de açıkça yazılır (staging dersi).
revoke all on function public.iletisim_sel_kapisi() from public, anon, authenticated;
