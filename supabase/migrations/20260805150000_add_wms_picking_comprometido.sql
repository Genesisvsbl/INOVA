-- Estado "comprometido" para las líneas de picking.
-- Cuando el operario imprime la orden y le da "Comprometer", las ubicaciones /
-- cantidades sugeridas quedan RESERVADAS (sin descargar inventario todavía):
--  * No se vuelven a reasignar al regenerar el picking de la reserva.
--  * Otras reservas no pueden tomar esa cantidad en esa ubicación.
-- Al descargar (confirmar) se mantienen las ubicaciones de la orden impresa.
alter table wms.picking_detalle
  add column if not exists comprometido boolean not null default false;

alter table wms.picking_detalle
  add column if not exists fecha_comprometido timestamptz;

-- Índice para consultar rápido las líneas comprometidas sin confirmar.
create index if not exists idx_picking_detalle_comprometido
  on wms.picking_detalle (empresa_id, comprometido, confirmado);
