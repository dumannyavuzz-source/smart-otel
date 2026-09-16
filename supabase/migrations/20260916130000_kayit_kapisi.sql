-- =====================================================================
-- 13 — KAYIT KAPISI: OTELİNİ KENDİ AÇAN MÜŞTERİ  (Aşama 20)
--
-- Bugüne kadar otel açmak Smartotel ekibinin işiydi. Vitrindeki "Otelimi Ücretsiz Başlat"
-- düğmesiyle birlikte müşteri kendi otelini açabiliyor. Bu, sistemin İLK kimlik doğrulamasız
-- yazma yoludur; bu yüzden kapının önüne bir sayaç konur.
--
-- Kural: aynı internet adresinden saatte en fazla 3 kayıt denemesi. Dördüncüsü reddedilir.
-- Adres AÇIK YAZILMAZ, özeti (hash) saklanır: kim olduğu değil, "aynı yer mi?" bilgisi yeter.
-- Bir günden eski satırlar her denemede silinir; bu tablo bir defter değil, bir sayaçtır.
--
-- Not: otel satırını ve ilk üyeliği yalnızca kayıt kapısı (ana anahtar) yazar. `hotels` tablosuna
-- ekleme kuralı hiç kimseye açılmadı — yeni bir otel ancak bu kapıdan doğar.
--
-- Kaynak: docs/ux/006-kayit-akisi.md · docs/security/005-kayit-kapisi.md
-- =====================================================================

create table public.kayit_denemeleri (
  id         uuid primary key default gen_random_uuid(),
  ip_ozeti   text not null check (length(ip_ozeti) between 16 and 128),
  created_at timestamptz not null default now()
);

create index kayit_denemeleri_adres_idx on public.kayit_denemeleri (ip_ozeti, created_at desc);

-- Kilit açık, kural YOK: kimse okuyamaz, kimse yazamaz.
-- Yalnızca kayıt kapısı (ana anahtar) dokunabilir.
alter table public.kayit_denemeleri enable row level security;


-- ---------------------------------------------------------------------
-- Sayaç: "bu adresten son bir saatte kaç deneme yapılmış?" — sorar, sayar ve bu denemeyi yazar.
-- Cevap, BU deneme hariç olan sayıdır; kapı 3'e ulaşmışsa reddeder.
-- ---------------------------------------------------------------------
create function public.kayit_denemesi_say_ve_yaz(p_ip_ozeti text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kac integer;
begin
  delete from public.kayit_denemeleri where created_at < now() - interval '1 day';

  select count(*) into v_kac
  from public.kayit_denemeleri
  where ip_ozeti = p_ip_ozeti and created_at > now() - interval '1 hour';

  insert into public.kayit_denemeleri (ip_ozeti) values (p_ip_ozeti);

  return v_kac;
end;
$$;

-- Bu sayacı yalnızca kayıt kapısı çağırabilir; personel uygulaması ya da misafir çağıramaz.
revoke all on function public.kayit_denemesi_say_ve_yaz(text) from public;
grant execute on function public.kayit_denemesi_say_ve_yaz(text) to service_role;
