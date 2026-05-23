drop index if exists wms.ix_ubicaciones_empresa_parent;
drop index if exists wms.ix_ubicaciones_empresa_tipo;
drop index if exists wms.ux_ubicaciones_empresa_codigo;

alter table wms.ubicaciones
  drop column if exists parent_id,
  drop column if exists tipo,
  drop column if exists codigo;