-- Índices de BÚSQUEDA por texto (trigram). Las búsquedas con comodín a la
-- izquierda ("%texto%") NO usan los índices B-tree normales y hacen recorrido
-- secuencial (lento con muchas filas). Con pg_trgm + GIN, buscar por documento,
-- lote, código, descripción, etc. es rápido aunque haya millones de filas.
--
-- Es ADITIVO: no cambia datos ni comportamiento, solo acelera las búsquedas.

create extension if not exists pg_trgm;

-- Movimientos: buscador del Motor.
create index if not exists idx_mov_documento_trgm      on wms.movimientos using gin (documento gin_trgm_ops);
create index if not exists idx_mov_lote_almacen_trgm   on wms.movimientos using gin (lote_almacen gin_trgm_ops);
create index if not exists idx_mov_lote_proveedor_trgm on wms.movimientos using gin (lote_proveedor gin_trgm_ops);
create index if not exists idx_mov_codigo_cita_trgm    on wms.movimientos using gin (codigo_cita gin_trgm_ops);

-- Materiales: búsqueda por código y descripción.
create index if not exists idx_mat_codigo_trgm         on wms.materiales using gin (codigo gin_trgm_ops);
create index if not exists idx_mat_descripcion_trgm    on wms.materiales using gin (descripcion gin_trgm_ops);

-- Rótulos: consulta de recibos guardados.
create index if not exists idx_rot_documento_trgm      on wms.rotulos using gin (documento gin_trgm_ops);
create index if not exists idx_rot_codigo_cita_trgm    on wms.rotulos using gin (codigo_cita gin_trgm_ops);
create index if not exists idx_rot_lote_almacen_trgm   on wms.rotulos using gin (lote_almacen gin_trgm_ops);
create index if not exists idx_rot_lote_proveedor_trgm on wms.rotulos using gin (lote_proveedor gin_trgm_ops);
create index if not exists idx_rot_sku_trgm            on wms.rotulos using gin (sku gin_trgm_ops);
