-- ============================================================
-- anon_profiles — tarayıcı erişimini kapat (güvenlik açığı düzeltmesi)
-- ============================================================
-- Sorun: herkese açık (publishable) anahtarla tüm satırlar ve recovery_code
-- okunabiliyor, herhangi bir satır güncellenebiliyor, satır eklenebiliyordu.
--
-- Sonra: anon ve authenticated rollerinin tabloda HİÇBİR yetkisi yok.
-- Erişim yalnızca sunucu fonksiyonlarından (api/anon-profile.mjs,
-- api/_costGuard.mjs) SUPABASE_SERVICE_ROLE_KEY ile — service_role RLS'yi atlar.
--
-- ÖNKOŞUL: yukarıdaki API'lerin service_role ile çalışan sürümü canlıda olmalı
-- (Vercel Logs: "[anon-profile] Supabase anahtarı: service_role").
-- GERİ ALMA: supabase/anon-profiles-rls-rollback.sql
-- ============================================================

begin;

alter table public.anon_profiles enable row level security;

-- Tablodaki tüm politikaları kaldır (adlar pg_policies'ten okunur)
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'anon_profiles'
  loop
    execute format('drop policy %I on public.anon_profiles', p.policyname);
  end loop;
end $$;

revoke all on table public.anon_profiles from anon, authenticated;

commit;

-- Kontrol (ikisi de boş dönmeli):
-- select policyname from pg_policies where schemaname = 'public' and tablename = 'anon_profiles';
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'anon_profiles' and grantee in ('anon', 'authenticated');
