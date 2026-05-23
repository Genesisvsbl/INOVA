alter table if exists "5s".cronograma_5s
  add column if not exists fecha_ejecucion date,
  add column if not exists inspeccion_id bigint references "5s".inspecciones_5s(id);

create index if not exists ix_cronograma_5s_empresa_ejecucion
  on "5s".cronograma_5s(empresa_id, fecha_ejecucion);

alter table if exists public.usuarios
  add column if not exists avatar_url text;

