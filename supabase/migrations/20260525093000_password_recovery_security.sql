begin;

alter table if exists public.usuarios
  add column if not exists login_intentos_fallidos integer not null default 0,
  add column if not exists login_bloqueado_hasta timestamptz,
  add column if not exists reset_token text,
  add column if not exists reset_token_expira_en timestamptz,
  add column if not exists reset_solicitado_en timestamptz,
  add column if not exists fecha_cambio_clave timestamptz;

create index if not exists usuarios_reset_token_idx on public.usuarios (reset_token);
create index if not exists usuarios_email_idx on public.usuarios (lower(email));
create index if not exists usuarios_usuario_idx on public.usuarios (lower(usuario));

commit;
