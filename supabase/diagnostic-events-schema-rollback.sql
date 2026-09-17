-- ============================================================
-- ROLLBACK — supabase/diagnostic-events-schema.sql'in geri alınması
-- ============================================================
-- ÇALIŞTIRMA: SADECE diagnostic-events-schema.sql migration'ı
-- ÇALIŞTIRILDIYSA ve geri alınması gerekiyorsa Supabase Dashboard →
-- SQL Editor'de çalıştır.
--
-- Bu script bu migration'ın oluşturduğu nesneleri SIRAYLA geri alır:
--   1) public.diagnostic_events tablosu (ona bağlı index'ler, RLS
--      policy'si VE composite FOREIGN KEY'i CASCADE ile otomatik
--      düşer — bunlar tablonun kendi bağımlı nesneleridir)
--   2) answer_history_id_user_id_key — answer_history'de bu migration
--      SIRASINDA composite FK'yı mümkün kılmak için eklenen TEK ek
--      unique index (bkz. 2026-09-17 merge-öncesi cross-user denetimi).
--      1. adım TAMAMLANMADAN bu index kaldırılmaya çalışılırsa
--      diagnostic_events'in FK'sı hâlâ ona bağımlı olduğu için Postgres
--      hata verir — bu yüzden sıra ÖNEMLİDİR ve aşağıda korunmuştur.
--
-- Başka hiçbir tabloya/fonksiyona/veriye DOKUNMAZ (profiles, emails,
-- testimonials, push_subscriptions, user_activity, vb. ETKİLENMEZ).
-- answer_history'nin KENDİSİ (satırları, RLS policy'si, record_answer
-- RPC'si) bu rollback'ten HİÇ etkilenmez — SADECE 2. adımda eklenen tek
-- ek index kaldırılır, o da answer_history'nin var olan davranışını
-- (id zaten primary key ile benzersizdi) hiçbir şekilde değiştirmez.
--
-- VERİ KAYBI NOTU: diagnostic_events tablosundaki TÜM SATIRLAR silinir.
-- Bu güvenlidir çünkü bu tablo answer_history'nin YANINDA, ayrı bir HAM
-- DAVRANIŞSAL KANIT günlüğüdür (Katman 4) — ana öğrenci geçmişi
-- (answer_history, localStorage, Katman 1-3) bu rollback'ten HİÇ
-- etkilenmez, sadece Katman 4'e özgü teşhis izleri kaybolur.

drop table if exists public.diagnostic_events cascade;

drop index if exists public.answer_history_id_user_id_key;
