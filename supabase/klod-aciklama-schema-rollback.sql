-- klod-aciklama-schema.sql geri alma — tabloyu ve policy'sini kaldırır.
drop policy if exists "klod_aciklama_select_all" on public.klod_aciklama;
drop table if exists public.klod_aciklama;
