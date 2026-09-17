-- ============================================================
-- Sinyal Avcısı — öğrenci cevap geçmişi (answer_history) tablosu ve RLS
-- ============================================================
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.
--
-- AMAÇ: Hata defterine (bkz. index.html hataEkle()) düşen YANLIŞ
-- cevapların, giriş yapmış kullanıcılar için sunucu tarafında da
-- (cihazlar arası kalıcı) tutulması. localStorage (sa_hatalar) HER ZAMAN
-- ana kaynaktır — bu tablo best-effort bir kopyadır; migration
-- çalıştırılmadan önce de/sonra da client hiçbir şekilde bloklanmaz
-- (bkz. index.html hataSunucuyaSenkronla()).
--
-- attribution_* alanları, hangi kanaldan (Instagram/YouTube/UTM
-- kampanyası) gelen bir ziyaretçinin hangi soruları yanlış yaptığını
-- görebilmek için window.SinyalAttribution.context()'ten (bkz.
-- assets/modules/attribution.js) alınır — kişisel veri İÇERMEZ, sadece
-- kampanya/sinyal etiketleri.

create table if not exists public.answer_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  soru text not null,
  verilen_cevap text,
  dogru_cevap text,
  tip text,
  attribution_source text,
  attribution_medium text,
  attribution_campaign text,
  attribution_signal text,
  created_at timestamptz not null default now()
);

alter table public.answer_history enable row level security;

drop policy if exists "answer_history_own" on public.answer_history;
create policy "answer_history_own"
  on public.answer_history for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- NOT: push_subscriptions/user_activity ile AYNI desen — "for all"
-- (select/insert/update/delete) sadece KENDİ satırına uygulanıyor.
-- Başka bir kullanıcının cevap geçmişini ne görebilir ne değiştirebilir.

create index if not exists answer_history_user_id_idx on public.answer_history(user_id);
