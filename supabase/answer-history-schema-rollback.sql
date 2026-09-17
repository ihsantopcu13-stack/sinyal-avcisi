-- ============================================================
-- ROLLBACK — supabase/answer-history-schema.sql'in geri alınması
-- ============================================================
-- ÇALIŞTIRMA: SADECE answer-history-schema.sql migration'ı ÇALIŞTIRILDIYSA
-- ve geri alınması gerekiyorsa Supabase Dashboard → SQL Editor'de çalıştır.
--
-- Bu script SADECE o migration'ın oluşturduğu iki nesneyi geri alır:
--   - public.record_answer(...) fonksiyonu
--   - public.answer_history tablosu (ona bağlı index'ler ve RLS policy'si
--     CASCADE ile otomatik düşer — bunlar tablonun kendi bağımlı
--     nesneleridir, BAŞKA hiçbir tabloya dokunmaz)
-- Başka hiçbir tabloya/fonksiyona/veriye DOKUNMAZ (profiles, emails,
-- testimonials, push_subscriptions, user_activity, vb. ETKİLENMEZ).
--
-- VERİ KAYBI NOTU: answer_history tablosundaki TÜM SATIRLAR silinir.
-- Bu güvenlidir çünkü bu tablo sadece localStorage'ın (sa_cevap_gecmisi,
-- bkz. index.html cevapKaydet()) best-effort bir sunucu yedeğidir — ANA
-- KAYNAK değildir; öğrencinin ilerlemesi localStorage'da kalmaya devam
-- eder, bu rollback bir öğrenme verisi kaybına yol açmaz.

drop function if exists public.record_answer(
  text, text, text, text, text, boolean, text, text, int, text, text, text, text
);

drop table if exists public.answer_history cascade;
