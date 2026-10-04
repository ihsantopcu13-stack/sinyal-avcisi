-- ============================================================
-- Sinyal Avcısı — klod_aciklama (yanlış cevap KLOD açıklaması önbelleği)
-- ============================================================
--
-- AMAÇ: Sinyal Lab'da yanlış cevaptan sonra "KLOD'la açıkla" ile üretilen
-- yapılandırılmış açıklamayı soru başına BİR KEZ saklamak. Aynı soru
-- tekrar istendiğinde api/klod.mjs (mode:'aciklama') buradan döner,
-- model çağrısı yapılmaz.
--
-- aciklama jsonb: {dogru, yapi, sinyal, eleme[], avci_ipucu, emin, kaynak_hash}
-- kaynak_hash, sorular.json'daki soru metni/şıklar/doğru cevaptan üretilir;
-- soru değişirse hash tutmaz ve açıklama yeniden üretilip üzerine yazılır.
--
-- GÜVENLİK MODELİ:
--   - Herkes (anon dahil) okuyabilir — içerik herkese açık ders materyali.
--   - INSERT/UPDATE/DELETE için bilinçli olarak HİÇBİR policy yok: yalnızca
--     service_role (RLS'i atlar) ile api/_klodAciklama.mjs yazabilir.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.
-- GERİ ALMA: klod-aciklama-schema-rollback.sql

create table if not exists public.klod_aciklama (
  soru_id text primary key,
  aciklama jsonb not null,
  olusturma timestamptz not null default now()
);

alter table public.klod_aciklama enable row level security;

drop policy if exists "klod_aciklama_select_all" on public.klod_aciklama;
create policy "klod_aciklama_select_all"
  on public.klod_aciklama for select
  to anon, authenticated
  using (true);

-- Yazma yetkileri istemci rollerinden açıkça geri alınır (policy olmasa da
-- RLS zaten engeller; bu ikinci kat).
revoke insert, update, delete on public.klod_aciklama from anon, authenticated;
