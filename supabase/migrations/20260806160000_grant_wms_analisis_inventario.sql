-- La tabla wms.analisis_inventario se creó sin los permisos (grants) que sí
-- tienen las demás tablas del esquema. Por eso PostgREST/Supabase respondía
-- 403 ("No tienes permiso para esta acción (analisis_inventario)") al guardar,
-- listar o generar el informe. Aquí se conceden los permisos que faltaban.
--
-- Se otorga sobre TODAS las secuencias del esquema wms para no depender del
-- nombre exacto de la secuencia de identidad (evita que una línea falle y
-- revierta todo el bloque).
grant usage on schema wms to anon, authenticated;
grant select, insert, update, delete on wms.analisis_inventario to anon, authenticated;
grant usage, select on all sequences in schema wms to anon, authenticated;
grant all on wms.analisis_inventario to service_role;
grant all on all sequences in schema wms to service_role;

-- Esta tabla se quedó con RLS activado (sin políticas), lo que bloqueaba TODO
-- insert/select desde la app (rol anon), con el error:
--   "new row violates row-level security policy for table analisis_inventario".
-- Las demás tablas del esquema wms operan con RLS desactivado (la seguridad la
-- maneja la app). Se desactiva aquí para dejarla igual que las otras.
alter table wms.analisis_inventario disable row level security;
