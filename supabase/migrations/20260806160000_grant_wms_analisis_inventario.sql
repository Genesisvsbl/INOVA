-- La tabla wms.analisis_inventario se creó sin los permisos (grants) que sí
-- tienen las demás tablas del esquema. Por eso PostgREST/Supabase respondía
-- 403 ("No tienes permiso para esta acción (analisis_inventario)") al guardar,
-- listar o generar el informe. Aquí se conceden los permisos que faltaban.
grant select, insert, update, delete on wms.analisis_inventario to anon, authenticated;
grant usage, select on sequence wms.analisis_inventario_id_seq to anon, authenticated;
grant all on wms.analisis_inventario to service_role;
grant all on sequence wms.analisis_inventario_id_seq to service_role;
