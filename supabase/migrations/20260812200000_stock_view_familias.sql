-- Agrega la columna "familias" de la ubicación a la vista de stock agregado,
-- para que al conectarla en picking/despacho no falte ningún dato que hoy sí
-- trae el cálculo por movimientos. Sigue siendo ADITIVO (no cambia datos).
create or replace view wms.stock_agregado as
select
  m.empresa_id,
  m.material_id,
  mat.codigo               as codigo_material,
  mat.descripcion          as descripcion_material,
  mat.unidad_medida,
  mat.familia,
  m.ubicacion_id,
  u.ubicacion,
  u.ubicacion_base,
  u.posicion,
  u.zona,
  u.familias,
  u.bodega,
  m.lote_almacen,
  m.lote_proveedor,
  m.fecha_vencimiento,
  sum(m.cantidad_r)        as cantidad_disponible
from wms.movimientos m
left join wms.materiales  mat on mat.id = m.material_id
left join wms.ubicaciones u   on u.id  = m.ubicacion_id
where m.estado = 'ALMACENADO'
group by
  m.empresa_id, m.material_id, mat.codigo, mat.descripcion, mat.unidad_medida,
  mat.familia, m.ubicacion_id, u.ubicacion, u.ubicacion_base, u.posicion,
  u.zona, u.familias, u.bodega, m.lote_almacen, m.lote_proveedor, m.fecha_vencimiento
having sum(m.cantidad_r) > 0;

alter view wms.stock_agregado set (security_invoker = true);
