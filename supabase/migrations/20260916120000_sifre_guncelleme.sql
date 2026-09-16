-- =====================================================================
-- 12 — ŞİFRE GÜNCELLEME İÇİN TEK SORU  (Aşama 19.1)
--
-- Müdür, şifresini unutan personelin şifresini panelden yeniler. Şifre değiştirmek ana anahtar
-- ister; o iş sunucudaki "sifre-guncelle" kapısında yapılır. Ama kapının sorması gereken
-- bir soru vardır ve cevabı yalnızca veritabanı bilir:
--
--   "Bu kişi BAŞKA bir otelde de çalışıyor mu?"
--
-- Neden önemli: Ayşe hem A otelinde görevli hem B otelinde müdür olabilir. A otelinin müdürü
-- Ayşe'nin şifresini yenilerse, B otelinin kapısını da açmış olur. Bu bir yetki sıçramasıdır.
-- Bu yüzden kapı, birden fazla otelde çalışan kişinin şifresini DEĞİŞTİRMEZ.
--
-- Soruyu soran da yetkili olmalıdır: yalnızca o otelin müdürü/sahibi sorabilir. Yetkisiz soru
-- "hayır" diye cevaplanmaz, reddedilir — yoksa yanlış cevapla kapı açılırdı.
-- Cevap yalnızca evet/hayırdır; hangi otel olduğu söylenmez.
--
-- Kaynak: docs/security/002-personel-kapisi-ve-panel.md · Açık 1
-- =====================================================================

create function public.baska_otelde_calisiyor_mu(p_user_id uuid, p_hotel_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Soran yetkili mi?
  if coalesce(public.rol_nedir(p_hotel_id), '') not in ('manager', 'owner') then
    raise exception 'Yetkiniz yok.';
  end if;

  -- Sorulan kişi bu otelde çalışıyor mu? Çalışmıyorsa soru sorulamaz:
  -- yoksa müdür, tanımadığı bir hesabın başka otelde çalışıp çalışmadığını sistemin ağzından öğrenirdi.
  if not exists (
    select 1 from public.memberships
    where user_id = p_user_id and hotel_id = p_hotel_id
  ) then
    raise exception 'Yetkiniz yok.';
  end if;

  return exists (
    select 1 from public.memberships
    where user_id = p_user_id and hotel_id <> p_hotel_id
  );
end;
$$;

revoke all on function public.baska_otelde_calisiyor_mu(uuid, uuid) from public;
grant execute on function public.baska_otelde_calisiyor_mu(uuid, uuid) to authenticated, service_role;
