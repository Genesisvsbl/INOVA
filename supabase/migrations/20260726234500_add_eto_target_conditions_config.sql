-- ETO: metas por condición A NIVEL DE ENTIDAD (override por persona).
-- Guarda un JSON con la meta de cada condición para esa entidad, ej:
-- [{"name":"Diario","op":">=","meta":2,"warn":1,"crit":0}, ...]
-- Si está vacío, la entidad usa las metas por defecto del indicador.

alter table eto_digital.entity_indicator_targets
  add column if not exists conditions_config text not null default '';

notify pgrst, 'reload schema';
