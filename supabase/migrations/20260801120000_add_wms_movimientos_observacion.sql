-- Observación del movimiento (usada al enviar material a EN TRÁNSITO:
-- indica dónde/en qué área queda el material). Opcional para el resto.
alter table wms.movimientos
  add column if not exists observacion text;
