-- Vista de FÍSICO total por material (suma de todos los movimientos, todos los
-- estados: entradas - salidas). La usa el Análisis SAP vs físico para no bajar
-- TODA la tabla de movimientos al navegador. Aditivo, no cambia datos.
create or replace view wms.stock_total_material as
select
  m.empresa_id,
  m.material_id,
  mat.codigo        as codigo_material,
  sum(m.cantidad_r) as fisico
from wms.movimientos m
left join wms.materiales mat on mat.id = m.material_id
group by m.empresa_id, m.material_id, mat.codigo;

alter view wms.stock_total_material set (security_invoker = true);
