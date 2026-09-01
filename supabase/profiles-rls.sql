-- ============================================================
-- Sinyal Avcısı — profiles tablosu RLS politikaları
-- ============================================================
--
-- NEDEN: Eski admin paneli, client tarafında publishable (anon) key ile
-- doğrudan `sb.from('profiles').select(...)` çağırıyordu ve çalışıyordu.
-- Bu, tabloda ya RLS'in tamamen kapalı olduğu ya da herkese SELECT izni
-- veren gevşek bir policy olduğu anlamına gelir — yani şu an her kim
-- publishable key'i bilse (ki o key zaten index.html'de açık), tarayıcı
-- konsolundan `fetch('.../rest/v1/profiles?select=*')` ile TÜM kullanıcı
-- e-postalarını çekebiliyor olabilir.
--
-- Admin paneli artık bu tabloyu client'tan hiç okumuyor — sadece
-- api/admin-users.mjs, sunucuda SERVICE_ROLE_KEY ile okuyor (service_role
-- RLS'i her zaman bypass eder, aşağıdaki kısıtlamalardan etkilenmez).
-- Kod tabanında `profiles` tablosuna başka hiçbir client-side insert/
-- update/select çağrısı yok. Dolayısıyla en güvenli varsayılan: anon ve
-- authenticated rollerine SIFIR erişim — tabloyu sadece service_role
-- okuyabilsin.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run.
-- Çalıştırmadan önce mutlaka önce sadece SELECT * FROM pg_policies ile
-- mevcut politikaları görüp neyin değiştiğini anla (aşağıdaki 0. adım).

-- 0) Mevcut durumu gör (bilgi amaçlı — hiçbir şeyi değiştirmez)
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where tablename = 'profiles';

-- 1) RLS'i kesin olarak aç (zaten açıksa no-op)
alter table public.profiles enable row level security;

-- 2) Bu tabloda anon/authenticated için önceden tanımlanmış TÜM
--    politikaları temizle — gevşek/eski bir "herkese açık SELECT"
--    policy'si varsa bu adımda kaldırılır.
--    (İsimlerini pg_policies çıktısından görüp aşağıya ekle; örnek isimler
--    aşağıda yaygın adlandırmalarla verildi, gerekirse düzenle.)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Enable read access for all users" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;

-- 3) Kullanıcının SADECE KENDİ satırını görebilmesi (opsiyonel).
--    Şu anki kodda client bunu hiç kullanmıyor; ileride "Hesabım" gibi bir
--    sayfa eklersen lazım olur. Kullanmıyorsan bu bloğu hiç çalıştırma —
--    o zaman anon/authenticated için sıfır SELECT erişimi kalır, en güvenli
--    durum budur.
-- create policy "profiles_select_own"
--   on public.profiles for select
--   to authenticated
--   using (auth.uid() = id);

-- 4) profiles tablosuna client'tan insert/update/delete YOK — bu yüzden
--    bu komutlar için policy eklenmiyor. auth.users trigger'ı (varsa)
--    SECURITY DEFINER ile çalıştığından RLS'ten etkilenmez.

-- 5) Doğrulama — service_role dışında hiçbir rolün profiles'ı okuyamadığını
--    Supabase Dashboard'da "Test policies" veya anon key ile aşağıdaki gibi
--    bir curl ile kontrol et (200 + [] ya da 401/403 bekleniyor, ASLA
--    kullanıcı listesi dönmemeli):
--
--    curl "https://scqczkyiyshmczzmlshl.supabase.co/rest/v1/profiles?select=*" \
--      -H "apikey: <ANON_PUBLISHABLE_KEY>"
