-- =====================================================================
-- 5 / 5 — MİSAFİR KAPISI (veritabanı tarafı)
--
-- Misafir giriş yapmaz. Odadaki QR'da tahmin edilemez bir kod vardır (rooms.guest_code).
-- Yorum şu yoldan gelir:
--   Misafir sayfası → Edge Function (guest-feedback) → BU FONKSİYON → guest_feedback tablosu
--
-- Bu fonksiyon tek bir iş yapar: kodu doğrular, oteli/odayı bulur, yorumu yazar.
-- Başka hiçbir tabloya dokunmaz, hiçbir şey okutmaz, hiçbir şey döndürmez.
--
-- Kim çağırabilir? YALNIZCA ana anahtar (service_role) — yani yalnızca Edge Function.
-- Giriş yapmış personel de, girişsiz biri de doğrudan çağıramaz.
--
-- Kaynak: docs/decisions/002-database-architecture.md (A.10)
--         docs/security/001-rls-and-maker-checker.md (Bölüm 5 · Misafir yorumu)
-- =====================================================================

create function public.misafir_yorumu_yaz(p_oda_kodu text, p_puan integer, p_yorum text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oda record;
begin
  -- 1) Kod biçimi: izin listesi (32 karakter, küçük harf hex). Bozuksa cevap hep aynı.
  if p_oda_kodu is null or p_oda_kodu !~ '^[0-9a-f]{32}$' then
    raise exception 'Bu bağlantı geçersiz.';
  end if;

  -- 2) Puan 1–5 tam sayı
  if p_puan is null or p_puan not between 1 and 5 then
    raise exception 'Puan 1 ile 5 arasında olmalı.';
  end if;

  -- 3) Yorum en fazla 500 karakter (düz metin saklanır; ekrana basılırken kaçış uygulanır)
  if length(coalesce(p_yorum, '')) > 500 then
    raise exception 'Yorum en fazla 500 karakter olabilir.';
  end if;

  -- 4) Kod hangi otelin hangi odası? Kapalı oda = yok sayılır. Cevap yine aynı: var mı yok mu söylenmez.
  select id, hotel_id into v_oda
  from public.rooms
  where guest_code = p_oda_kodu and is_active;

  if not found then
    raise exception 'Bu bağlantı geçersiz.';
  end if;

  -- 5) Spam engeli: aynı odadan dakikada en fazla 3 yorum
  if (select count(*) from public.guest_feedback
       where room_id = v_oda.id and created_at > now() - interval '1 minute') >= 3 then
    raise exception 'Lütfen biraz sonra tekrar deneyin.';
  end if;

  -- 6) Yaz. Beyan tablosudur: bir kez yazılır, hiç değişmez.
  insert into public.guest_feedback (hotel_id, room_id, rating, comment)
  values (v_oda.hotel_id, v_oda.id, p_puan, nullif(trim(p_yorum), ''));
end;
$$;

-- Tek kapı: yalnızca ana anahtar çağırabilir.
revoke all on function public.misafir_yorumu_yaz(text, integer, text) from public, anon, authenticated;
grant execute on function public.misafir_yorumu_yaz(text, integer, text) to service_role;
