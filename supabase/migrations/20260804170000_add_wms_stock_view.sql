-- Vista ADITIVA de stock agregado (no modifica datos ni tablas existentes).
-- Devuelve el stock ALMACENADO ya sumado por material + ubicación + lote +
-- vencimiento, con las columnas ya unidas (código, descripción, zona, etc.).
-- Sirve para que, cuando se decida, Motor/Stock/Análisis consulten unos pocos
-- miles de filas en vez de traer TODOS los movimientos al navegador.
--
-- IMPORTANTE: crear la vista NO cambia el comportamiento actual de la app.
-- Solo queda disponible para conectarla más adelante, con pruebas.

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
  u.zona, u.bodega, m.lote_almacen, m.lote_proveedor, m.fecha_vencimiento
having sum(m.cantidad_r) > 0;

-- Respeta las mismas reglas de acceso que las tablas base (RLS del invocador).
alter view wms.stock_agregado set (security_invoker = true);
