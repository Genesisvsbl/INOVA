create table if not exists "5s".sububicaciones_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  bodega_id bigint not null references "5s".bodegas_5s(id) on delete cascade,
  nombre text not null,
  codigo text,
  descripcion text,
  zona text,
  estado text not null default 'Activa',
  activo boolean not null default true,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone,
  unique (empresa_id, bodega_id, nombre)
);

create unique index if not exists ux_sububicaciones_5s_codigo
  on "5s".sububicaciones_5s(empresa_id, codigo)
  where codigo is not null;

create index if not exists ix_sububicaciones_5s_bodega
  on "5s".sububicaciones_5s(empresa_id, bodega_id, activo);