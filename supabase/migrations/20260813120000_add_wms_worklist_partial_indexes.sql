-- Blindaje de las "colas de trabajo" (Tránsito y PNC) para alto volumen.
--
-- getEnTransito() filtra estado='EN_TRANSITO' y ordena por fecha DESC.
-- getPncBloqueado() filtra estado='PNC_BLOQUEADO' y ordena por id DESC.
--
-- Ya existe idx_mov_empresa_estado (empresa_id, estado), que evita escanear
-- toda la tabla. Estos índices PARCIALES agregan la columna de orden, así el
-- planificador entrega las filas ya ordenadas (sin paso de sort) y el índice
-- es diminuto porque solo cubre esos dos estados de trabajo. No corta datos:
-- se sigue viendo TODO lo que esté en tránsito / bloqueado, pero instantáneo
-- por más que crezca movimientos.
--
-- Nota: en producción con la tabla ya grande, puedes ejecutarlos manualmente
-- con CREATE INDEX CONCURRENTLY (fuera de transacción) para no bloquear.

-- Cola de material EN TRÁNSITO (pendiente por ubicar), ordenada por fecha.
CREATE INDEX IF NOT EXISTS idx_mov_transito_fecha
  ON wms.movimientos (empresa_id, fecha DESC)
  WHERE estado = 'EN_TRANSITO';

-- Cola de material PNC BLOQUEADO, ordenada por id (más recientes primero).
CREATE INDEX IF NOT EXISTS idx_mov_pnc_id
  ON wms.movimientos (empresa_id, id DESC)
  WHERE estado = 'PNC_BLOQUEADO';

ANALYZE wms.movimientos;
