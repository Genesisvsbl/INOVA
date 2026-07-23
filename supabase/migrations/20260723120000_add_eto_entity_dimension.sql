-- ETO: soporte de indicador por entidad con dos condiciones (dimensiones).
-- Permite un mismo indicador con personas (entidades) Y una condicion
-- (ej. Ambiental / Seguridad), guardando un valor por entidad, fecha y dimension.

-- 1) Configuracion de condiciones en el indicador (CSV, ej. "Ambiental,Seguridad").
--    Vacio = indicador normal (sin division por condicion).
alter table eto_digital.indicators
  add column if not exists dimensions text not null default '';

-- 2) Dimension en los registros por entidad.
alter table eto_digital.entity_records
  add column if not exists dimension text not null default '';

-- 3) Reemplazar la unique para que incluya la dimension
--    (asi una persona puede tener Ambiental y Seguridad en la misma fecha).
do $$
declare c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'eto_digital.entity_records'::regclass
      and contype = 'u'
      and conname <> 'entity_records_dim_uniq'
  loop
    execute format('alter table eto_digital.entity_records drop constraint %I', c);
  end loop;
end $$;

alter table eto_digital.entity_records
  drop constraint if exists entity_records_dim_uniq;

alter table eto_digital.entity_records
  add constraint entity_records_dim_uniq
  unique (empresa_id, indicator_id, entity_id, record_date, dimension);

-- 4) Refrescar el cache de PostgREST para que reconozca las columnas nuevas.
notify pgrst, 'reload schema';
