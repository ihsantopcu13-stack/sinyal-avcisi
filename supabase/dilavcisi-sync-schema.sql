-- ============================================================
-- Sinyal Avcısı — Dil Avcısı modülü streak/XP senkronu
-- ============================================================
--
-- AMAÇ: Dil Avcısı modülünün streak/xp/tamamlanan-ders verisi
-- (localStorage 'sa_dilavcisi') sadece tarayıcıda tutuluyordu — cihaz
-- değiştirince veya tarayıcı verisi silinince kaybolur. Bu dosya,
-- profiles-lesson-progress.sql'deki KLOD-MOTION senkronuyla BİREBİR AYNI
-- deseni (best-effort, tek sütun, dar yetkili SECURITY DEFINER RPC)
-- Dil Avcısı için de uygular.
--
-- ÖNEMLİ: Bu, tek yönlü (yaz-ama-okuma) bir senkrondur — localStorage
-- hâlâ birincil kaynaktır. Giriş yapıldığında Supabase'deki veriden geri
-- yükleme YAPILMAZ (iki cihaz arası çakışma çözümü kapsam dışı bırakıldı,
-- profiles-lesson-progress.sql'deki mevcut yaklaşımla tutarlı).
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.

-- 1) Sütunu ekle (yoksa)
alter table public.profiles
  add column if not exists dilavcisi_state jsonb not null default '{}'::jsonb;

-- 2) Sadece dilavcisi_state'i güncelleyen, kullanıcının SADECE KENDİ
--    satırına yazabildiği güvenli RPC fonksiyonu.
create or replace function public.update_dilavcisi_state(state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set dilavcisi_state = state
  where id = auth.uid();
end;
$$;

revoke all on function public.update_dilavcisi_state(jsonb) from public;
grant execute on function public.update_dilavcisi_state(jsonb) to authenticated;
