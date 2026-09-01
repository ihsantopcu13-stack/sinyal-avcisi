-- ============================================================
-- Sinyal Avcısı — testimonials (yorumlar) tablosu ve RLS
-- ============================================================
--
-- AMAÇ: Ana sayfadaki "yorumlar" bölümüne gerçek kullanıcıların
-- bıraktığı testimonial'ları eklemek. Uydurma/sahte isimlere
-- atfedilmiş yorumlar YERİNE, giriş yapmış gerçek kullanıcıların
-- kendi deneyimlerini gönderebildiği ve bir admin onayından
-- geçtikten sonra herkese görünen bir sistem.
--
-- GÜVENLİK MODELİ:
--   - Herkes (anon dahil) SADECE onaylanmış (onaylandi=true) satırları
--     okuyabilir — bekleyen/reddedilmiş yorumlar asla public'e sızmaz.
--   - Sadece giriş yapmış kullanıcı, SADECE kendi user_id'siyle yeni
--     bir yorum ekleyebilir (başkası adına yorum yazılamaz).
--   - UPDATE/DELETE (onaylama/reddetme) yalnızca service_role ile
--     (api/admin-testimonials.mjs üzerinden, admin allowlist'i
--     doğrulandıktan sonra) yapılabilir — normal kullanıcı ne kendi
--     yorumunu ne başkasının yorumunu onaylayabilir/silebilir.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  isim text not null,
  unvan text not null,
  yorum text not null,
  yildiz smallint not null default 5 check (yildiz between 1 and 5),
  onaylandi boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

-- Herkes SADECE onaylanmış yorumları okuyabilir
drop policy if exists "testimonials_select_approved" on public.testimonials;
create policy "testimonials_select_approved"
  on public.testimonials for select
  to anon, authenticated
  using (onaylandi = true);

-- Giriş yapmış kullanıcı sadece kendi adına yeni yorum ekleyebilir
drop policy if exists "testimonials_insert_own" on public.testimonials;
create policy "testimonials_insert_own"
  on public.testimonials for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE/DELETE için bilinçli olarak HİÇBİR policy yok —
-- authenticated/anon rolleri onay/red/silme yapamaz. Bu işlemler
-- sadece api/admin-testimonials.mjs üzerinden, service_role ile
-- (RLS'i bypass ederek) ve ADMIN_EMAILS allowlist kontrolünden
-- sonra yapılabilir.

-- Basit kötüye kullanım freni: bir kullanıcı en fazla 3 yorum bıraksın
-- (opsiyonel, istersen kaldır)
drop policy if exists "testimonials_insert_own" on public.testimonials;
create policy "testimonials_insert_own"
  on public.testimonials for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (select count(*) from public.testimonials t where t.user_id = auth.uid()) < 3
  );
