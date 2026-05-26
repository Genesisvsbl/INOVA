begin;

alter table if exists public.solicitudes_acceso
  add column if not exists clave_consulta text;

create index if not exists ix_solicitudes_acceso_lookup
  on public.solicitudes_acceso(email, documento, pilar);

commit;
