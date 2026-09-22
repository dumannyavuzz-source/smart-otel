-- =====================================================================
-- KAYIT KAPISI: ONAYSIZ OTEL AÇILMAZ  (karar 026 — 2/2)
--
-- Birinci dosya sütunu ekledi. Bu dosya kuralı koyar: onay kutusu işaretlenmeden gelen yeni
-- kayıt veritabanı tarafından reddedilir. Kural yalnızca ekranda değil SUNUCUDA da durur —
-- betiği değiştirip kapıyı doğrudan çağıran biri de geçemez.
--
-- NE ZAMAN ÇALIŞTIRILIR: uygulamanın yeni sürümü (onay kutusu olan sürüm) ve yeni kapı canlıya
-- çıktıktan sonra. Önce çalıştırılırsa eski sürümden gelen kayıtlar reddedilir (dağıtım listesi · 6.24).
--
-- NEDEN CHECK DEĞİL DE TETİKLEYİCİ (trigger)?
-- İletişim formunda bu kural bir "check" kuralıydı; orada satırlar bir daha hiç güncellenmez.
-- Oteller ise güncellenir: ödeme yapan otelin demo süresini biz uzatıyoruz, otel sahibi otel
-- adını değiştirebiliyor. "check" kuralı GÜNCELLEMEYE de bakar; eski otellerin onayı null
-- olduğu için o güncellemelerin hepsi reddedilirdi. Bu tetikleyici yalnızca YENİ KAYITTA çalışır:
-- eski oteller olduğu gibi durur ve güncellenmeye devam eder, geçmişe onay uydurulmaz.
-- =====================================================================

create function public.kayit_sartlar_onayi_zorunlu()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sartlar_onayi is not true then
    raise exception 'Kullanim Sartlari ve KVKK onayi olmadan otel acilamaz.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.kayit_sartlar_onayi_zorunlu() from public, anon, authenticated;

create trigger hotels_sartlar_onayi_zorunlu
  before insert on public.hotels
  for each row execute function public.kayit_sartlar_onayi_zorunlu();
