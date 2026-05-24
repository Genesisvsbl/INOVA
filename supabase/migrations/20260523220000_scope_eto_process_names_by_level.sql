do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'eto_digital'
    and t.relname = 'processes'
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) = 'UNIQUE (empresa_id, name)';

  if constraint_name is not null then
    execute format('alter table eto_digital.processes drop constraint %I', constraint_name);
  end if;
end $$;

create unique index if not exists ux_eto_processes_empresa_level_name
  on eto_digital.processes (empresa_id, level, name);
