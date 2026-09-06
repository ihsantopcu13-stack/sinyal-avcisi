-- ============================================================
-- Sinyal Avcısı — gerçek liderlik tablosu (xp_toplam / xp_hafta)
-- ============================================================
--
-- AMAÇ: index.html'deki SAHTE_LB_KULLANICILAR sabit dizisini (5 uydurma
-- isim + uydurma XP) kaldırıp, liderlik tablosunu gerçek kullanıcıların
-- gerçek XP'siyle doldurmak.
--
-- NEDEN profiles'a yeni sütun: XP şu ana kadar sadece tarayıcıda
-- localStorage'da (sa_xp) tutuluyordu — cihaz değişince/tarayıcı
-- temizlenince kaybolur ve başka kullanıcılarla karşılaştırılamaz.
-- Bu dosya, giriş yapmış kullanıcılar için XP'yi profiles tablosunda da
-- (best-effort, profiles-lesson-progress.sql'deki lesson_progress
-- sütunuyla aynı mantıkla) tutar.
--
-- GÜVENLİK MODELİ (profiles-rls.sql ile aynı ilke — client'ın profiles'a
-- doğrudan erişimi YOK, sadece dar yetkili SECURITY DEFINER RPC'ler var):
--   - increment_xp(p_xp): SADECE auth.uid()'nin kendi satırını, SADECE
--     xp_toplam/xp_hafta alanlarını günceller. p_xp 1-500 aralığına
--     sınırlanır (tek çağrıda anlamsız büyük sahte XP enjekte edilmesin).
--   - get_leaderboard(p_limit): herkese (anon dahil) açık, ama SADECE
--     ad + xp_hafta + xp_toplam döndürür — email gibi PII asla dönmez.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.

-- 1) Sütunları ekle (yoksa)
alter table public.profiles
  add column if not exists xp_toplam bigint not null default 0,
  add column if not exists xp_hafta integer not null default 0,
  add column if not exists xp_hafta_baslangic date;

-- 2) Kullanıcının SADECE KENDİ satırındaki XP'yi artıran güvenli RPC.
--    Haftalık XP, o haftanın Pazartesi'sinden önceyse otomatik sıfırlanıp
--    yeniden başlatılır (client'ın "hangi hafta" olduğuna güvenmiyoruz,
--    hesap sunucu tarafında now() ile yapılıyor).
create or replace function public.increment_xp(p_xp integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hafta_baslangic date := date_trunc('week', now())::date;
  v_xp integer := greatest(1, least(p_xp, 500)); -- tek çağrıda 1-500 XP ile sınırla
begin
  update public.profiles
  set
    xp_toplam = xp_toplam + v_xp,
    xp_hafta = case
      when xp_hafta_baslangic is distinct from v_hafta_baslangic then v_xp
      else xp_hafta + v_xp
    end,
    xp_hafta_baslangic = v_hafta_baslangic
  where id = auth.uid();
end;
$$;

revoke all on function public.increment_xp(integer) from public;
grant execute on function public.increment_xp(integer) to authenticated;

-- 3) Herkese açık liderlik tablosu — SADECE ad + xp döner, email/id dönmez.
--    Haftalık XP'si 0 olanlar veya "ad" alanı boş olanlar listeye girmez
--    (yarım kalmış/anonim hesaplar leaderboard'u kirletmesin).
create or replace function public.get_leaderboard(p_limit integer default 10)
returns table(ad text, xp_hafta integer, xp_toplam bigint)
language sql
security definer
set search_path = public
stable
as $$
  select p.ad, p.xp_hafta, p.xp_toplam
  from public.profiles p
  where p.xp_hafta > 0
    and p.ad is not null
    and p.xp_hafta_baslangic is not distinct from date_trunc('week', now())::date
  order by p.xp_hafta desc
  limit greatest(1, least(p_limit, 50));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;

-- Doğrulama (bilgi amaçlı):
-- select ad, xp_hafta, xp_toplam from public.get_leaderboard(10);
