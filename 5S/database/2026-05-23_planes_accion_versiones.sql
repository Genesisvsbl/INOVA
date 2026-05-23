create table if not exists "5s".planes_accion_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  inspeccion_id bigint references "5s".inspecciones_5s(id),
  inspeccion_item_id bigint references "5s".inspeccion_items_5s(id),
  bodega_id bigint references "5s".bodegas_5s(id),
  bodega text not null,
  responsable text not null,
  punto text not null,
  hallazgo text not null,
  accion text not null,
  severidad text,
  estado text not null default 'Pendiente',
  fecha_compromiso date not null,
  fecha_cierre date,
  evidencia_cierre_url text,
  comentario_cierre text,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone
);

create index if not exists ix_planes_accion_5s_empresa_estado
  on "5s".planes_accion_5s(empresa_id, estado);

create index if not exists ix_planes_accion_5s_empresa_compromiso
  on "5s".planes_accion_5s(empresa_id, fecha_compromiso);

alter table if exists "5s".checklist_items_5s
  add column if not exists version integer not null default 1,
  add column if not exists vigente_desde date not null default current_date;

alter table if exists "5s".inspeccion_items_5s
  add column if not exists checklist_version integer;

grant select, insert, update, delete on table "5s".planes_accion_5s to anon, authenticated;
grant usage, select on sequence "5s".planes_accion_5s_id_seq to anon, authenticated;

