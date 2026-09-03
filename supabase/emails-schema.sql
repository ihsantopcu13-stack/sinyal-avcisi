-- ============================================================
-- Sinyal Avcısı — emails (e-posta yakalama) tablosu ve RLS
-- ============================================================
--
-- AMAÇ: "Ücretsiz E-Kitap" formundan gelen e-posta adreslerini
-- kalıcı olarak yakalamak. Resend API'si domain doğrulaması
-- yapılana kadar (veya herhangi bir nedenle) e-posta gönderimi
-- başarısız olsa bile, bırakılan e-posta adresi kaybolmasın —
-- api/mail.mjs önce bu tabloya kaydeder, sonra Resend ile
-- göndermeyi dener.
--
-- GÜVENLİK MODELİ:
--   - Hiçbir rol (anon, authenticated) bu tabloyu OKUYAMAZ veya
--     YAZAMAZ — bilinçli olarak hiçbir SELECT/INSERT policy yok.
--   - Tek yazma yolu api/mail.mjs üzerinden SUPABASE_SERVICE_ROLE_KEY
--     ile yapılan sunucu taraflı istek (service_role RLS'i bypass eder).
--   - Bu, formun spam/kötüye kullanım amacıyla doğrudan tarayıcıdan
--     (anon key ile) bombalanmasını da engeller.
--
-- ÇALIŞTIRMA: Supabase Dashboard → SQL Editor → bu dosyayı çalıştır.

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  tip text not null default 'ekitap',
  created_at timestamptz not null default now()
);

create index if not exists emails_email_idx on public.emails (email);
create index if not exists emails_created_at_idx on public.emails (created_at desc);

alter table public.emails enable row level security;

-- Bilinçli olarak HİÇBİR policy yok — anon/authenticated hiçbir
-- şekilde okuyamaz/yazamaz. Sadece service_role (api/mail.mjs)
-- erişebilir.
