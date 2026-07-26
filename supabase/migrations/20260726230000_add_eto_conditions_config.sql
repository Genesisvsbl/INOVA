-- ETO: indicador por entidad con condiciones parametrizadas una a una.
-- Guarda por condición: nombre, operador de meta, meta, warning y critical.
-- Formato JSON, ej:
-- [{"name":"Diario","op":">=","meta":2,"warn":1,"crit":0}, ...]

alter table eto_digital.indicators
  add column if not exists conditions_config text not null default '';

notify pgrst, 'reload schema';
