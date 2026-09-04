-- ============================================================
-- Sinyal Avcısı — profiles.lesson_progress (KLOD-MOTION ders takibi)
-- ============================================================
--
-- AMAÇ: Passive Voice, BEBEK — Şık Avcısı ve STOP/REMEMBER/TRY gibi
-- KLOD-MOTION mikro derslerini giriş yapmış kullanıcının hesabına da
-- kaydetmek (cihaz değiştirince ilerleme kaybolmasın). Birincil kaynak
-- hâlâ localStorage'dır (sa_dilavcisi vb.) — bu sütun sadece giriş
-- yapmış kullanıcılar için best-effort bir yedek/senkron katmanıdır.
--
-- GÜVENLİK NOTU: profiles-rls.sql dosyası bilinçli olarak
-- authenticated/anon rollerine bu tabloda SIFIR erişim veriyor (client
-- hiçbir zaman profiles'a doğrudan insert/update yapmıyordu). Bu durumu
-- bozmadan sadece lesson_progress alanını güncelleyebilmek için düz bir
-- "authenticated kendi satırını UPDATE edebilir" policy YERİNE, sadece
-- bu tek sütunu güncelleyen SECURITY DEFINER bir RPC fonksiyonu
-- kullanıyoruz — böylece bir kullanıcı bu yolla email/ad gibi başka
-- alanları asla değiştiremez.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.

-- 1) Sütunu ekle (yoksa)
alter table public.profiles
  add column if not exists lesson_progress jsonb not null default '{}'::jsonb;

-- 2) Sadece lesson_progress'i güncelleyen, kullanıcının SADECE KENDİ
--    satırına yazabildiği güvenli RPC fonksiyonu.
create or replace function public.update_lesson_progress(progress jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set lesson_progress = progress
  where id = auth.uid();
end;
$$;

-- 3) Fonksiyonu sadece giriş yapmış kullanıcılar çağırabilsin.
revoke all on function public.update_lesson_progress(jsonb) from public;
grant execute on function public.update_lesson_progress(jsonb) to authenticated;

-- Doğrulama (bilgi amaçlı): sütun eklendi mi?
-- select column_name, data_type from information_schema.columns
-- where table_name = 'profiles' and column_name = 'lesson_progress';
