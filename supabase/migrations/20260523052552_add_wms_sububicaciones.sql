alter table wms.ubicaciones
  add column if not exists parent_id bigint references wms.ubicaciones(id) on delete set null,
  add column if not exists tipo text not null default 'UBICACION',
  add column if not exists codigo text;

create index if not exists ix_ubicaciones_empresa_parent
  on wms.ubicaciones(empresa_id, parent_id);

create index if not exists ix_ubicaciones_empresa_tipo
  on wms.ubicaciones(empresa_id, tipo);

create unique index if not exists ux_ubicaciones_empresa_codigo
  on wms.ubicaciones(empresa_id, codigo)
  where codigo is not null;

update wms.ubicaciones
set tipo = 'UBICACION'
where parent_id is null and tipo is distinct from 'UBICACION';

update wms.ubicaciones
set tipo = 'SUBUBICACION'
where parent_id is not null and tipo is distinct from 'SUBUBICACION';