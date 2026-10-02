-- ============================================================
-- GERİ ALMA — supabase/anon-profiles-rls.sql öncesine dön
-- ============================================================
-- YALNIZCA sıkılaştırmadan sonra site bozulursa çalıştırın. Bu, güvenlik
-- açığını (herkese açık anahtarla okuma/ekleme/güncelleme) GERİ AÇAR.
--
-- Sıkılaştırma öncesinin BİREBİR kopyası:
--   Yetkiler: information_schema.role_table_grants çıktısı — anon ve
--   authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE.
--   Politikalar: pg_policies çıktısı — aynı ad, komut, rol (public) ve koşullar.
--   Silme politikası yoktu (silme kapalıydı).
-- ============================================================

begin;

grant delete, insert, references, select, trigger, truncate, update
  on table public.anon_profiles to anon, authenticated;

alter table public.anon_profiles enable row level security;

drop policy if exists "anon insert" on public.anon_profiles;
drop policy if exists "anon recovery read" on public.anon_profiles;
drop policy if exists "anon update own" on public.anon_profiles;

-- anon insert         | INSERT | {public} | qual: NULL | with_check: true
create policy "anon insert" on public.anon_profiles
  for insert to public with check (true);

-- anon recovery read  | SELECT | {public} | qual: true | with_check: NULL
create policy "anon recovery read" on public.anon_profiles
  for select to public using (true);

-- anon update own     | UPDATE | {public} | qual: true | with_check: NULL
create policy "anon update own" on public.anon_profiles
  for update to public using (true);

commit;
