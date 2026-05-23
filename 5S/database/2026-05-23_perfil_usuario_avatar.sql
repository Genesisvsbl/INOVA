alter table if exists public.usuarios
  add column if not exists avatar_url text;

