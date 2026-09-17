-- ============================================================
-- Sinyal Avcısı — AVCI Hata Kökü Motoru (Katman 4) davranışsal kanıt
-- tablosu: public.diagnostic_events
-- ============================================================
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.
-- Bu dosya henüz HİÇ çalıştırılmadı.
--
-- AMAÇ: Katman 4 tasarımında (2026-09-17, "Minimum Davranışsal Kanıt
-- Köprüsü") belirlenen köprünün HAM OLAYLARINI saklamak — yanlış
-- cevaptan sonra opsiyonel gösterilecek öz-bildirim (Seviye 2 —
-- hipotez) ve kontrollü mikro test (Seviye 3 — doğrulama) sonuçları.
-- GÖZLEM (Seviye 1: hangi buton/kelime/şık seçildi) burada HAM olarak
-- saklanır; hesaplanmış teşhis/yorum bu tabloda ASLA üretilmez — bu,
-- answer_history + Katman 3 ile AYNI ilke: ham veri kalıcıdır, yorum
-- gerektiğinde ham veriden yeniden hesaplanır, hiçbir zaman ham
-- olayın YERİNE geçmez.
--
-- KAPSAM (bilinçli sınır): Bu migration SADECE bu tabloyu oluşturur.
-- public.answer_history şemasına, RLS'ine veya record_answer() RPC'sine
-- HİÇBİR DOKUNUŞ YOK — MASTER mimari (PR #16-#22) tamamen korunuyor.
-- Client tarafı (dAns() değişikliği, mikro teşhis UI'sı, bu tabloya
-- yazacak bir RPC) bu PR'a DAHİL DEĞİL — ayrı, sonraki bir adımda ele
-- alınacak. Bu dosya SADECE şemayı hazırlar.
--
-- self_report_reason / micro_test_type: SERBEST METİN DEĞİL — sabit,
-- kontrollü değer listeleriyle sınırlı (aşağıdaki CHECK constraint'ler
-- — Postgres ENUM type YERİNE bilinçli olarak text+CHECK seçildi: ENUM
-- tipleri değer eklemeyi/çıkarmayı migration açısından daha külfetli
-- kılar; text+CHECK bu projenin idempotent migration deseniyle daha
-- uyumlu ve `drop constraint`/`add constraint` ile kolayca genişletilir).
-- Her iki alan da NULL olabilir — "atlandı" durumu için ayrı bir
-- 'SKIPPED' sentinel string DEĞİL, NULL kullanılıyor: NULL burada "bu
-- adım hiç yapılmadı/uygulanmadı" anlamına gelen doğru SQL karşılığı
-- (mevcut answer_history'deki topic/signal/response_time_ms ile AYNI
-- ilke — uygulanamayan/verilmeyen alanlar NULL, sahte bir "yok değeri"
-- DEĞİL, ve NULL, CHECK IN listesini "gerçek kategoriler" ile sınırlı
-- tutar, "atlandı" gibi bir sözde-kategoriyle kirletmez).
--
-- micro_test_correct: SADECE gerçek bir kontrollü mikro test canonical
-- ground-truth'a (örn. sinyal alanı, dogru_index) karşı değerlendirildiyse
-- true/false olur; test hiç yapılmadıysa NULL kalır — asla varsayılan
-- bir true/false ÜRETİLMEZ (Katman 4 tasarım ilkesi: "sahte veri yok").
--
-- answer_history_id: public.answer_history(id)'ye referans veriyor
-- (ON DELETE CASCADE — o cevap silinirse teşhis izi de anlamsızlaşır).
--
-- BİLİNEN SINIRLAMA (bu turda bilinçli olarak ÇÖZÜLMEDİ — raporda
-- ayrıca belirtildi): düz bir FK, referans verilen answer_history
-- satırının user_id'sinin BU diagnostic_events satırının user_id'siyle
-- AYNI olduğunu DB seviyesinde garanti ETMEZ (Postgres FK'ları CHECK
-- constraint içinde alt sorgu çalıştıramaz; bunu DB seviyesinde
-- garanti etmenin standart yolu ya composite FK — answer_history'de
-- UNIQUE(id,user_id) gerektirir, o tabloya dokunmak anlamına gelir —
-- ya da bir trigger'dır). answer_history tablosuna bu turda HİÇ
-- dokunmamak için bu iyileştirme bilinçli olarak ERTELENDİ.
--
-- Gerçek güvenlik sınırı — "başka kullanıcının diagnostic_events
-- SATIRINI okuyamama/yazamama" — zaten aşağıdaki RLS ile TAM olarak
-- sağlanıyor. Eksik olan SADECE "referans verilen answer_history
-- satırı gerçekten BENİM mi" çapraz-tutarlılığı; veri SIZINTISI değil,
-- olası bir YANLIŞ İLİŞKİLENDİRME riski (RLS answer_history'nin
-- İÇERİĞİNİ zaten koruyor). Bu, gelecekte bu tabloya yazacak RPC'nin —
-- record_answer'ın "user_id'yi asla client'tan almama, hep auth.uid()
-- kullanma" deseniyle AYNI şekilde — INSERT'ten önce sunucu tarafında
-- `exists(select 1 from answer_history where id=p_answer_history_id
-- and user_id=auth.uid())` kontrolü yapmasıyla kapatılacak; client bu
-- tabloya HİÇBİR ZAMAN doğrudan/güvenilir şekilde yazamayacak.

create table if not exists public.diagnostic_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_history_id uuid references public.answer_history(id) on delete cascade,
  question_id text,
  self_report_reason text check (
    self_report_reason is null or self_report_reason in (
      'VOCAB_BLOCK', 'SIGNAL_MISSED', 'RULE_UNKNOWN', 'TWO_OPTIONS', 'GUESSED'
    )
  ),
  micro_test_type text check (
    micro_test_type is null or micro_test_type in (
      'SIGNAL_SELECT', 'OPTION_ELIMINATION'
    )
  ),
  micro_test_selected text,
  micro_test_correct boolean,
  created_at timestamptz not null default now()
);

alter table public.diagnostic_events enable row level security;

-- answer_history/push_subscriptions/user_activity ile AYNI desen:
-- kullanıcı "for all" (select/insert/update/delete) ile SADECE kendi
-- satırını okuyabilir/yazabilir/silebilir. Başka bir kullanıcının
-- teşhis izini ne görebilir ne değiştirebilir.
drop policy if exists "diagnostic_events_own" on public.diagnostic_events;
create policy "diagnostic_events_own"
  on public.diagnostic_events for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- NOT: Anonim (sb.auth.signInAnonymously(), PR #20) kullanıcıların
-- JWT rolü de 'authenticated' olduğu için bu policy anonim kullanıcılar
-- için de AYNEN çalışır — ayrı bir "anon" policy'sine gerek yok.

-- Beklenen sorgu deseni: "kendi son teşhis olaylarım" (Katman 3/4 okuma
-- katmanı answer_history ile AYNI şekilde created_at'e göre sıralayıp
-- limit'leyecek) ve "bu cevaba ait teşhis olayları" (answer_history_id
-- ile join). question_id için AYRI bir index EKLENMEDİ — hiçbir
-- planlanan sorgu (hepsi RLS ile auth.uid()'e taraflı, tek-kullanıcı
-- kapsamlı) bunu tek başına kullanmıyor — gereksiz index üretilmedi.
create index if not exists diagnostic_events_user_id_created_at_idx
  on public.diagnostic_events(user_id, created_at desc);

create index if not exists diagnostic_events_answer_history_id_idx
  on public.diagnostic_events(answer_history_id);

-- GRANT/REVOKE YOK: Bu projede HİÇBİR tablo migration'ı açık grant/
-- revoke kullanmıyor (bkz. answer-history/testimonials/notifications
-- şemaları) — Supabase platformu anon/authenticated rollerine tablo
-- erişimini zaten varsayılan olarak veriyor, gerçek kısıtlama RLS ile
-- yapılıyor. record_answer() gibi FONKSİYONLARDA açık revoke/grant
-- kullanılmasının nedeni Postgres'in fonksiyonlara varsayılan PUBLIC
-- EXECUTE vermesidir (PR #16) — bu, tablolar için geçerli bir varsayılan
-- DEĞİLDİR, bu yüzden bu tabloda böyle bir ifadeye gerek yok.
