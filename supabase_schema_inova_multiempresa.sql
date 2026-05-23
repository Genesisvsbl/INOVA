begin;

create schema if not exists wms;
create schema if not exists "5s";
create schema if not exists eto_digital;

create table if not exists public.empresas (
  id bigserial primary key,
  nombre text not null,
  nit text,
  slug text not null unique,
  estado text not null default 'ACTIVA',
  plan text not null default 'standard',
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone
);

create table if not exists public.usuarios (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  nombre text not null,
  email text,
  usuario text,
  rol text not null default 'usuario',
  avatar_url text,
  estado text not null default 'ACTIVO',
  fecha_creacion timestamp without time zone not null default now(),
  unique (empresa_id, email),
  unique (empresa_id, usuario)
);

create table if not exists wms.materiales (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  codigo text not null,
  descripcion text not null,
  unidad double precision,
  unidad_medida text not null,
  familia text,
  vigencia_meses integer,
  empaque text,
  unique (empresa_id, codigo)
);

create table if not exists wms.ubicaciones (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  ubicacion text not null,
  ubicacion_base text,
  posicion text,
  zona text,
  familias text,
  bodega text,
  unique (empresa_id, ubicacion)
);

create table if not exists wms.proveedores (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  nombre text not null,
  acreedor text not null,
  unique (empresa_id, nombre)
);

create table if not exists wms.movimientos (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  fecha timestamp without time zone not null,
  usuario_id bigint references public.usuarios(id),
  usuario text not null,
  documento text,
  codigo_cita text,
  proveedor_id bigint references wms.proveedores(id),
  proveedor text,
  remesa text,
  orden_compra text,
  um text,
  umb text,
  material_id bigint not null references wms.materiales(id),
  ubicacion_id bigint references wms.ubicaciones(id),
  estado text not null default 'ALMACENADO',
  lote_almacen text,
  lote_proveedor text,
  fecha_fabricacion date,
  fecha_vencimiento date,
  cantidad_r double precision not null
);

create table if not exists wms.rotulos (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  codigo_cita text not null,
  impresion text not null,
  fecha_recepcion date not null,
  numero_semana text,
  proveedor_id bigint references wms.proveedores(id),
  proveedor text,
  auxiliar_usuario_id bigint references public.usuarios(id),
  auxiliar text,
  documento text,
  remesa text,
  orden_compra text,
  cantidad double precision,
  material_id bigint references wms.materiales(id),
  sku text,
  texto_breve text,
  um text,
  umb text,
  fecha_fabricacion date,
  fecha_vencimiento date,
  lote_proveedor text,
  lote_almacen text
);

create table if not exists wms.despacho_cargas (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  usuario_id bigint references public.usuarios(id),
  fecha_carga timestamp without time zone not null default now(),
  archivo_nombre text not null
);

create table if not exists wms.despacho_detalles (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  carga_id bigint not null references wms.despacho_cargas(id),
  material_id bigint references wms.materiales(id),
  fecha_necesidad date,
  reserva text not null,
  sku text not null,
  texto_breve text,
  cantidad double precision not null,
  cantidad_retirada double precision default 0,
  diferencia double precision default 0,
  lineas_usadas integer default 0,
  pct_cumplimiento_sku double precision default 0,
  pct_cumplimiento_reserva double precision default 0,
  clasificacion_sku text default 'NO CUMPLIDA',
  clasificacion_final text default 'NO CUMPLIDA',
  estado_operativo text not null default 'ABIERTA',
  cerrada boolean not null default false,
  fecha_cierre timestamp without time zone
);

create table if not exists wms.picking_detalle (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  despacho_detalle_id bigint references wms.despacho_detalles(id),
  material_id bigint references wms.materiales(id),
  ubicacion_id bigint references wms.ubicaciones(id),
  reserva text not null,
  sku text not null,
  texto_breve text,
  cantidad_requerida double precision not null,
  cantidad_sugerida double precision not null default 0,
  cantidad_confirmada double precision not null default 0,
  ubicacion text,
  lote_almacen text,
  lote_proveedor text,
  fecha_vencimiento date,
  impreso boolean not null default false,
  confirmado boolean not null default false,
  motivo_rotacion text,
  ubicacion_alternativa_id bigint references wms.ubicaciones(id),
  ubicacion_alternativa text,
  lote_almacen_alternativo text,
  lote_proveedor_alternativo text,
  fecha_vencimiento_alternativa date
);

create table if not exists wms.inventario_tareas (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  tarea_origen_id bigint references wms.inventario_tareas(id),
  asignado_a_usuario_id bigint references public.usuarios(id),
  creado_por_usuario_id bigint references public.usuarios(id),
  tipo_conteo text not null,
  criterio text not null,
  zona text,
  familia text,
  codigo_material text,
  asignado_a text not null,
  creado_por text not null,
  observacion text,
  estado text not null default 'PENDIENTE',
  es_reconteo boolean not null default false,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_inicio timestamp without time zone,
  fecha_finalizacion timestamp without time zone,
  fecha_conciliacion timestamp without time zone,
  fecha_cierre timestamp without time zone,
  total_lineas integer not null default 0,
  total_coinciden integer not null default 0,
  total_no_coinciden integer not null default 0,
  porcentaje_exactitud double precision not null default 0
);

create table if not exists wms.inventario_tarea_detalles (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  tarea_id bigint not null references wms.inventario_tareas(id),
  ubicacion_id bigint references wms.ubicaciones(id),
  material_id bigint references wms.materiales(id),
  ubicacion text,
  ubicacion_base text,
  posicion text,
  zona text,
  bodega text,
  codigo_material text not null,
  descripcion_material text,
  familia text,
  unidad_medida text,
  lote_almacen text,
  lote_proveedor text,
  fecha_vencimiento date,
  cantidad_sistema double precision not null default 0,
  cantidad_contada double precision,
  diferencia double precision,
  coincide boolean,
  contado boolean not null default false,
  observacion text
);

create table if not exists "5s".configuracion_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  clave text not null,
  valor text,
  fecha_actualizacion timestamp without time zone,
  unique (empresa_id, clave)
);

create table if not exists "5s".catalogos_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  tipo text not null,
  nombre text not null,
  orden integer not null default 0,
  activo boolean not null default true,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone,
  unique (empresa_id, tipo, nombre)
);

create table if not exists "5s".bodegas_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  nombre text not null,
  puntos integer not null default 0,
  area text,
  estado text not null default 'Activa',
  activo boolean not null default true,
  meta_bodega double precision not null default 90.0,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone,
  unique (empresa_id, nombre)
);

create table if not exists "5s".subbodegas_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  bodega_id bigint not null references "5s".bodegas_5s(id) on delete cascade,
  nombre text not null,
  codigo text,
  descripcion text,
  zona text,
  estado text not null default 'Activa',
  activo boolean not null default true,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone,
  unique (empresa_id, bodega_id, nombre)
);

create table if not exists "5s".responsables_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  usuario_id bigint references public.usuarios(id),
  codigo text not null,
  nombre text not null,
  cargo text,
  area text,
  color text,
  activo boolean not null default true,
  fecha_creacion timestamp without time zone not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists "5s".cronograma_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  bodega_id bigint references "5s".bodegas_5s(id),
  responsable_id bigint references "5s".responsables_5s(id),
  bodega text not null,
  responsable text not null,
  actividad text not null default 'Auditoria 5S',
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'Programada',
  prioridad text not null default 'Media',
  meta_bodega double precision not null default 90.0,
  fecha_ejecucion date,
  inspeccion_id bigint,
  observacion text,
  fecha_creacion timestamp without time zone not null default now()
);

create table if not exists "5s".checklist_items_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  bodega_id bigint references "5s".bodegas_5s(id),
  bodega text not null,
  pilar text,
  pregunta text not null,
  orden integer not null default 0,
  peso double precision not null default 1.0,
  version integer not null default 1,
  vigente_desde date not null default current_date,
  requiere_evidencia boolean not null default false,
  activo boolean not null default true,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone
);

create table if not exists "5s".inspecciones_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  responsable_id bigint references "5s".responsables_5s(id),
  bodega_id bigint references "5s".bodegas_5s(id),
  fecha date not null,
  semana text,
  responsable text not null,
  area text,
  bodega text not null,
  cumplimiento double precision not null default 0,
  meta_bodega double precision not null default 90.0,
  fecha_creacion timestamp without time zone not null default now()
);

create table if not exists "5s".inspeccion_items_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  inspeccion_id bigint not null references "5s".inspecciones_5s(id),
  checklist_item_id bigint references "5s".checklist_items_5s(id),
  punto text not null,
  pilar text,
  peso double precision not null default 1.0,
  checklist_version integer,
  cumple boolean not null default false,
  severidad text,
  observacion text
);

create table if not exists "5s".planes_accion_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  inspeccion_id bigint references "5s".inspecciones_5s(id),
  inspeccion_item_id bigint references "5s".inspeccion_items_5s(id),
  bodega_id bigint references "5s".bodegas_5s(id),
  bodega text not null,
  responsable text not null,
  punto text not null,
  hallazgo text not null,
  accion text not null,
  severidad text,
  estado text not null default 'Pendiente',
  fecha_compromiso date not null,
  fecha_cierre date,
  evidencia_cierre_url text,
  comentario_cierre text,
  fecha_creacion timestamp without time zone not null default now(),
  fecha_actualizacion timestamp without time zone
);

create table if not exists "5s".evidencias_5s (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  item_id bigint not null references "5s".inspeccion_items_5s(id),
  bucket text not null default 'evidencias-5s',
  storage_path text,
  nombre_archivo text,
  url text,
  metadata jsonb,
  fecha_creacion timestamp without time zone not null default now()
);

create table if not exists eto_digital.processes (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  name text not null,
  level integer not null,
  unique (empresa_id, name)
);

create table if not exists eto_digital.indicators (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  process_id bigint not null references eto_digital.processes(id),
  code text not null,
  name text not null,
  meeting_level integer not null,
  unit text not null default '%',
  target_operator text not null default '>=',
  target_value double precision not null default 0,
  warning_operator text,
  warning_value double precision,
  critical_operator text,
  critical_value double precision,
  frequency text not null default 'day',
  capture_mode text not null default 'shifts',
  shifts text not null default 'A,B,C',
  scope_type text not null default 'standard',
  unique (empresa_id, code)
);

create table if not exists eto_digital.daily_records (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  indicator_id bigint not null references eto_digital.indicators(id),
  record_date date not null,
  single_value double precision,
  shift_a double precision,
  shift_b double precision,
  shift_c double precision,
  general double precision not null default 0,
  status text not null default 'ok',
  observation text,
  unique (empresa_id, indicator_id, record_date)
);

create table if not exists eto_digital.entities (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  code text not null,
  name text not null,
  entity_type text not null default 'persona',
  document text,
  position text,
  area text,
  is_active boolean not null default true,
  unique (empresa_id, code),
  unique (empresa_id, document)
);

create table if not exists eto_digital.entity_indicator_targets (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  indicator_id bigint not null references eto_digital.indicators(id),
  entity_id bigint not null references eto_digital.entities(id),
  target_value double precision not null default 0,
  is_active boolean not null default true,
  unique (empresa_id, indicator_id, entity_id)
);

create table if not exists eto_digital.entity_records (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  indicator_id bigint not null references eto_digital.indicators(id),
  entity_id bigint not null references eto_digital.entities(id),
  record_date date not null,
  value double precision not null default 0,
  observation text,
  unique (empresa_id, indicator_id, entity_id, record_date)
);

create index if not exists ix_usuarios_empresa_id on public.usuarios(empresa_id);
create index if not exists ix_materiales_empresa_codigo on wms.materiales(empresa_id, codigo);
create index if not exists ix_ubicaciones_empresa_ubicacion on wms.ubicaciones(empresa_id, ubicacion);
create index if not exists ix_movimientos_empresa_estado on wms.movimientos(empresa_id, estado);
create index if not exists ix_movimientos_empresa_fecha on wms.movimientos(empresa_id, fecha);
create index if not exists ix_rotulos_empresa_codigo_cita on wms.rotulos(empresa_id, codigo_cita);
create index if not exists ix_despacho_detalles_empresa_reserva on wms.despacho_detalles(empresa_id, reserva);
create index if not exists ix_picking_detalle_empresa_reserva on wms.picking_detalle(empresa_id, reserva);
create index if not exists ix_inventario_tareas_empresa_estado on wms.inventario_tareas(empresa_id, estado);
create index if not exists ix_inventario_detalles_empresa_tarea on wms.inventario_tarea_detalles(empresa_id, tarea_id);
create index if not exists ix_bodegas_5s_empresa_nombre on "5s".bodegas_5s(empresa_id, nombre);
create index if not exists ix_cronograma_5s_empresa_fecha on "5s".cronograma_5s(empresa_id, fecha_inicio);
create index if not exists ix_inspecciones_5s_empresa_fecha on "5s".inspecciones_5s(empresa_id, fecha);
create index if not exists ix_indicators_empresa_code on eto_digital.indicators(empresa_id, code);
create index if not exists ix_daily_records_empresa_date on eto_digital.daily_records(empresa_id, record_date);

insert into storage.buckets (id, name, public)
values
  ('evidencias-5s', 'evidencias-5s', false),
  ('wms-documentos', 'wms-documentos', false),
  ('eto-evidencias', 'eto-evidencias', false)
on conflict (id) do nothing;

insert into public.empresas (nombre, nit, slug, estado, plan)
values ('Bavaria', null, 'bavaria', 'ACTIVA', 'standard')
on conflict (slug) do nothing;

grant usage on schema public, wms, "5s", eto_digital to anon, authenticated, service_role;
grant all on all tables in schema public, wms, "5s", eto_digital to service_role;
grant all on all sequences in schema public, wms, "5s", eto_digital to service_role;
grant select, insert, update, delete on all tables in schema public, wms, "5s", eto_digital to authenticated;
grant select, insert, update, delete on table "5s".subbodegas_5s to anon, authenticated;
grant usage, select on all sequences in schema public, wms, "5s", eto_digital to authenticated;
grant usage, select on all sequences in schema "5s" to anon, authenticated;

commit;
