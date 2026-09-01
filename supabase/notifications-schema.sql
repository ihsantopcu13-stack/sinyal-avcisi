-- ============================================================
-- Sinyal Avcısı — Push bildirim sistemi: tablolar ve RLS
-- ============================================================
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.

-- ── push_subscriptions ────────────────────────────────────────
-- Tarayıcının PushManager.subscribe() ile ürettiği abonelik bilgisi.
-- Client bunu doğrudan (RLS ile korunarak) kendi adına ekler/siler —
-- ayrı bir API endpoint'ine gerek yok.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- NOT: "for all" (select/insert/update/delete) sadece KENDİ satırına
-- uygulanıyor (using + with check ikisi de auth.uid()=user_id). Başka
-- bir kullanıcının abonelik satırını ne görebilir ne değiştirebilir.
-- Toplu okuma/gönderim sadece api/*.mjs içinde service_role ile olur.

-- ── user_activity ─────────────────────────────────────────────
-- "Streak kırılma riski" bildirimi için gereken minimum sunucu-taraflı
-- veri. Streak/XP'nin tamamı localStorage'da tutulduğundan (bkz.
-- streakSoruEkle), sunucunun kimin bugün çalışmadığını bilmesi için
-- client her doğru cevapta bu tabloyu kendi satırıyla günceller.
create table if not exists public.user_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_active_date date not null default current_date,
  current_streak int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_activity enable row level security;

drop policy if exists "user_activity_own" on public.user_activity;
create policy "user_activity_own"
  on public.user_activity for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
