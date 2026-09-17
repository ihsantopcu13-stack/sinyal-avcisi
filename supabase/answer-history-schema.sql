-- ============================================================
-- Sinyal Avcısı — öğrenci cevap geçmişi (answer_history) tablosu, RLS
-- ve record_answer() RPC'si
-- ============================================================
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.
-- Bu dosya henüz HİÇ çalıştırılmadı — 2026-09-17'de DOĞRU + YANLIŞ
-- cevap alanlarını kapsayacak şekilde yeniden tasarlandı (eski sürüm
-- sadece yanlış cevapları, dar bir alan setiyle kapsıyordu).
--
-- AMAÇ: index.html'deki cevapKaydet()'in (bkz. "CEVAP GEÇMİŞİ" bölümü)
-- hem DOĞRU hem YANLIŞ cevapları, giriş yapmış kullanıcılar için
-- sunucu tarafında da (cihazlar arası kalıcı) tutması. localStorage
-- (sa_cevap_gecmisi) HER ZAMAN ana kaynaktır — bu tablo best-effort bir
-- kopyadır; migration çalıştırılmadan önce de/sonra da client hiçbir
-- şekilde bloklanmaz (bkz. cevapSunucuyaSenkronla()).
--
-- question_id: sadece Sinyal Lab modülünün canonical q001-q059 kimliği
-- var (bkz. SL_HAVUZ, api/data/sorular.json) — diğer 4 modülün (SAT,
-- Kelime Kartları, Günlük Tuzak, Paragraf) kendi ayrı soru havuzları
-- olduğu ve stable id taşımadığı için bu alan NULLABLE'dır.
--
-- attribution_* alanları window.SinyalAttribution.context()'ten
-- (bkz. assets/modules/attribution.js) gelir — kişisel veri İÇERMEZ,
-- sadece kampanya/sinyal etiketleri.

create table if not exists public.answer_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text,
  module text not null,
  soru text,
  selected_option text,
  correct_option text,
  is_correct boolean not null,
  topic text,
  signal text,
  attempt_count int not null default 1,
  response_time_ms int,
  attribution_source text,
  attribution_medium text,
  attribution_campaign text,
  attribution_signal text,
  answered_at timestamptz not null default now(),
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
-- RPC aşağıda SECURITY INVOKER olduğu için bu policy RPC üzerinden
-- yapılan yazmalarda da AYNEN uygulanır — iki katmanlı koruma.

create index if not exists answer_history_user_id_idx on public.answer_history(user_id);

-- question_id dolu olan satırlarda kullanıcı+soru başına TEK satır
-- (tekrar denemede attempt_count artar) — question_id NULL olan
-- satırlarda (4 modülde stable id yok, serbest metin üzerinde güvenilir
-- bir upsert anahtarı yok) her deneme kendi satırı olarak eklenir; bu
-- da veri modeline uygun idempotent bir davranıştır (her gerçek
-- kullanıcı eylemi tam olarak bir satır üretir, bug kaynaklı tekrar
-- denemede satır çoğalmaz çünkü RPC tek seferlik çağrılır).
create unique index if not exists answer_history_user_question_idx
  on public.answer_history(user_id, question_id)
  where question_id is not null;

-- 2026-09-17 KATMAN 4 hazırlığı: public.diagnostic_events (bkz.
-- supabase/diagnostic-events-schema.sql) answer_history'ye COMPOSITE
-- bir FK ile referans veriyor — (answer_history_id, user_id)
-- references answer_history(id, user_id). Postgres, çok-kolonlu bir
-- FK'nın referans verdiği kolonlar üzerinde AYRI bir UNIQUE/PK
-- gerektirir; id zaten primary key olduğu için (id,user_id) mantıken
-- ZATEN benzersizdir (id tek başına benzersizken bir üst kümesi de
-- benzersizdir) — ama Postgres bunu OTOMATİK çıkarsamaz, açık bir
-- unique index şart. Bu index SADECE bu amaç için var; mevcut hiçbir
-- sorguyu/RLS'i/RPC'yi (record_answer, upsert hedefi olan yukarıdaki
-- answer_history_user_question_idx dahil) DEĞİŞTİRMEZ — saf ekleme,
-- mevcut veride ihlal riski YOK (id zaten benzersiz olduğu için bu
-- constraint mevcut satırlarla otomatik sağlanır).
create unique index if not exists answer_history_id_user_id_key
  on public.answer_history(id, user_id);

-- Client doğrudan INSERT/UPDATE yerine bu RPC'yi çağırır (bkz.
-- index.html cevapSunucuyaSenkronla() → sb.rpc('record_answer', {...})) —
-- update_lesson_progress RPC'siyle AYNI desen. SECURITY INVOKER: RLS
-- normal şekilde uygulanır, user_id parametre olarak ALINMAZ (spoofing
-- imkansız) — her zaman auth.uid() kullanılır.
create or replace function public.record_answer(
  p_question_id text,
  p_module text,
  p_soru text,
  p_selected_option text,
  p_correct_option text,
  p_is_correct boolean,
  p_topic text,
  p_signal text,
  p_response_time_ms int,
  p_attribution_source text,
  p_attribution_medium text,
  p_attribution_campaign text,
  p_attribution_signal text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_question_id is not null then
    insert into public.answer_history (
      user_id, question_id, module, soru, selected_option, correct_option,
      is_correct, topic, signal, attempt_count, response_time_ms,
      attribution_source, attribution_medium, attribution_campaign, attribution_signal
    ) values (
      auth.uid(), p_question_id, p_module, p_soru, p_selected_option, p_correct_option,
      p_is_correct, p_topic, p_signal, 1, p_response_time_ms,
      p_attribution_source, p_attribution_medium, p_attribution_campaign, p_attribution_signal
    )
    on conflict (user_id, question_id) where question_id is not null
    do update set
      selected_option = excluded.selected_option,
      correct_option = excluded.correct_option,
      is_correct = excluded.is_correct,
      attempt_count = public.answer_history.attempt_count + 1,
      response_time_ms = coalesce(excluded.response_time_ms, public.answer_history.response_time_ms),
      attribution_source = excluded.attribution_source,
      attribution_medium = excluded.attribution_medium,
      attribution_campaign = excluded.attribution_campaign,
      attribution_signal = excluded.attribution_signal,
      answered_at = now();
  else
    insert into public.answer_history (
      user_id, question_id, module, soru, selected_option, correct_option,
      is_correct, topic, signal, attempt_count, response_time_ms,
      attribution_source, attribution_medium, attribution_campaign, attribution_signal
    ) values (
      auth.uid(), null, p_module, p_soru, p_selected_option, p_correct_option,
      p_is_correct, p_topic, p_signal, 1, p_response_time_ms,
      p_attribution_source, p_attribution_medium, p_attribution_campaign, p_attribution_signal
    );
  end if;
end;
$$;

-- Savunma derinliği: PostgreSQL yeni fonksiyonlara varsayılan olarak
-- PUBLIC'e EXECUTE veriyor (dolayısıyla anon da çağırabilirdi — gerçek
-- veri riski yoktu çünkü auth.uid() NULL döner, NOT NULL user_id kısıtı
-- ve RLS zaten engellerdi, ama bu fazladan bir katmanı gereksiz yere
-- açık bırakıyordu). update_lesson_progress RPC'siyle AYNI desen:
-- önce PUBLIC'ten tamamen kaldır, sonra SADECE authenticated'e ver.
revoke execute on function public.record_answer(
  text, text, text, text, text, boolean, text, text, int, text, text, text, text
) from public;

grant execute on function public.record_answer(
  text, text, text, text, text, boolean, text, text, int, text, text, text, text
) to authenticated;
