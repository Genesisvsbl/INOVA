-- Índices de rendimiento para alto volumen de movimientos (operación Bavaria).
-- Aceleran los filtros y ordenamientos más usados: stock por estado, FEFO por
-- material, ubicaciones ocupadas, búsqueda/reescritura de recibos por documento
-- y por serial (codigo_cita), picking y catálogos.
--
-- Nota: si alguna tabla ya es MUY grande en producción, puedes crear estos
-- índices sin bloquear la tabla ejecutándolos manualmente con
-- CREATE INDEX CONCURRENTLY (fuera de una transacción). Aquí se usan
-- IF NOT EXISTS para que sea idempotente.

-- ===== wms.movimientos (tabla más consultada) =====
CREATE INDEX IF NOT EXISTS idx_mov_empresa_estado
  ON wms.movimientos (empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_mov_empresa_material
  ON wms.movimientos (empresa_id, material_id);
CREATE INDEX IF NOT EXISTS idx_mov_empresa_ubicacion
  ON wms.movimientos (empresa_id, ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_mov_empresa_documento
  ON wms.movimientos (empresa_id, documento);
CREATE INDEX IF NOT EXISTS idx_mov_empresa_codigocita
  ON wms.movimientos (empresa_id, codigo_cita);
CREATE INDEX IF NOT EXISTS idx_mov_empresa_fecha
  ON wms.movimientos (empresa_id, fecha DESC);
-- Stock disponible por ubicación (solo lo ALMACENADO): índice parcial liviano.
CREATE INDEX IF NOT EXISTS idx_mov_almacenado_ubic
  ON wms.movimientos (empresa_id, ubicacion_id)
  WHERE estado = 'ALMACENADO';

-- ===== wms.rotulos =====
CREATE INDEX IF NOT EXISTS idx_rot_empresa_documento
  ON wms.rotulos (empresa_id, documento);
CREATE INDEX IF NOT EXISTS idx_rot_empresa_codigocita
  ON wms.rotulos (empresa_id, codigo_cita);
CREATE INDEX IF NOT EXISTS idx_rot_empresa_impresion
  ON wms.rotulos (empresa_id, impresion);

-- ===== wms.picking_detalle =====
CREATE INDEX IF NOT EXISTS idx_pick_empresa_reserva
  ON wms.picking_detalle (empresa_id, reserva);

-- ===== wms.ubicaciones (toolbox de vacías por base/zona) =====
CREATE INDEX IF NOT EXISTS idx_ubic_empresa_base
  ON wms.ubicaciones (empresa_id, ubicacion_base);
CREATE INDEX IF NOT EXISTS idx_ubic_empresa_zona
  ON wms.ubicaciones (empresa_id, zona);

-- ===== wms.materiales (resolución por código) =====
CREATE INDEX IF NOT EXISTS idx_mat_empresa_codigo
  ON wms.materiales (empresa_id, codigo);

-- ===== wms.inventario_tarea_detalles / tareas =====
CREATE INDEX IF NOT EXISTS idx_invdet_empresa_tarea
  ON wms.inventario_tarea_detalles (empresa_id, tarea_id);
CREATE INDEX IF NOT EXISTS idx_invtar_empresa_asignado
  ON wms.inventario_tareas (empresa_id, asignado_a);

-- Actualiza estadísticas del planificador tras crear índices.
ANALYZE wms.movimientos;
ANALYZE wms.rotulos;
ANALYZE wms.ubicaciones;
ANALYZE wms.materiales;
