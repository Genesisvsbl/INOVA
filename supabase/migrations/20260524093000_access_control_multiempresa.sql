begin;

alter table if exists public.usuarios
  add column if not exists documento text,
  add column if not exists telefono text,
  add column if not exists cargo text,
  add column if not exists clave_acceso text,
  add column if not exists debe_cambiar_clave boolean not null default false,
  add column if not exists fecha_cambio_clave timestamp without time zone,
  add column if not exists clave_temporal_generada_en timestamp without time zone,
  add column if not exists es_super_admin boolean not null default false,
  add column if not exists ultimo_acceso timestamp without time zone,
  add column if not exists fecha_actualizacion timestamp without time zone;

create table if not exists public.pilares (
  id bigserial primary key,
  codigo text not null unique,
  nombre text not null,
  estado text not null default 'ACTIVO',
  color_base text,
  fecha_creacion timestamp without time zone not null default now()
);

create table if not exists public.roles (
  id bigserial primary key,
  empresa_id bigint references public.empresas(id),
  codigo text not null,
  nombre text not null,
  descripcion text,
  alcance text not null default 'empresa',
  estado text not null default 'ACTIVO',
  es_sistema boolean not null default false,
  fecha_creacion timestamp without time zone not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.permisos (
  id bigserial primary key,
  codigo text not null unique,
  nombre text not null,
  pilar text not null,
  modulo text not null,
  accion text not null,
  descripcion text,
  fecha_creacion timestamp without time zone not null default now()
);

create table if not exists public.role_permisos (
  id bigserial primary key,
  rol_id bigint not null references public.roles(id) on delete cascade,
  permiso_id bigint not null references public.permisos(id) on delete cascade,
  fecha_creacion timestamp without time zone not null default now(),
  unique (rol_id, permiso_id)
);

create table if not exists public.usuario_pilares (
  id bigserial primary key,
  usuario_id bigint not null references public.usuarios(id) on delete cascade,
  empresa_id bigint not null references public.empresas(id),
  pilar text not null,
  rol_id bigint references public.roles(id),
  eto_nivel integer,
  estado text not null default 'ACTIVO',
  fecha_inicio date not null default current_date,
  fecha_fin date,
  fecha_creacion timestamp without time zone not null default now(),
  unique (usuario_id, empresa_id, pilar, eto_nivel)
);

create table if not exists public.solicitudes_acceso (
  id bigserial primary key,
  nombre_completo text not null,
  documento text not null,
  email text not null,
  telefono text,
  empresa_nombre text not null,
  empresa_id bigint references public.empresas(id),
  cargo text,
    pilar text not null,
    eto_nivel integer,
    motivo text,
    clave_consulta text,
    estado text not null default 'PENDIENTE',
  usuario_creado_id bigint references public.usuarios(id),
  aprobado_por bigint references public.usuarios(id),
  fecha_solicitud timestamp without time zone not null default now(),
  fecha_respuesta timestamp without time zone,
  observacion_admin text
);

create table if not exists public.planes_empresa (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  nombre_plan text not null,
  max_usuarios integer not null default 1,
  pilares_incluidos text[] not null default array['wms'],
  estado text not null default 'ACTIVO',
  fecha_inicio date not null default current_date,
  fecha_fin date,
  precio_mensual numeric(12,2),
  fecha_creacion timestamp without time zone not null default now()
);

create table if not exists public.licencias_usuario (
  id bigserial primary key,
  empresa_id bigint not null references public.empresas(id),
  usuario_id bigint not null references public.usuarios(id) on delete cascade,
  plan_id bigint references public.planes_empresa(id),
  estado text not null default 'ACTIVA',
  fecha_asignacion timestamp without time zone not null default now(),
  fecha_fin date,
  unique (empresa_id, usuario_id)
);

create table if not exists public.auditoria_admin (
  id bigserial primary key,
  empresa_id bigint references public.empresas(id),
  usuario_id bigint references public.usuarios(id),
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb,
  fecha timestamp without time zone not null default now()
);

insert into public.pilares (codigo, nombre, color_base) values
  ('wms', 'WMS', '#7c3aed'),
  ('5s', '5S', '#2563eb'),
  ('eto', 'ETO', '#16a34a')
on conflict (codigo) do update set nombre = excluded.nombre, color_base = excluded.color_base;

insert into public.permisos (codigo, nombre, pilar, modulo, accion) values
  ('admin.usuarios.ver', 'Ver usuarios', 'global', 'usuarios', 'ver'),
  ('admin.usuarios.gestionar', 'Gestionar usuarios', 'global', 'usuarios', 'gestionar'),
  ('admin.roles.gestionar', 'Gestionar roles', 'global', 'roles', 'gestionar'),
  ('admin.solicitudes.gestionar', 'Gestionar solicitudes', 'global', 'solicitudes', 'gestionar'),
  ('admin.empresas.gestionar', 'Gestionar empresas', 'global', 'empresas', 'gestionar'),
  ('wms.ver', 'Entrar a WMS', 'wms', 'portal', 'ver'),
  ('wms.operar', 'Operar WMS', 'wms', 'operacion', 'operar'),
  ('5s.ver', 'Entrar a 5S', '5s', 'portal', 'ver'),
  ('5s.operar', 'Operar 5S', '5s', 'operacion', 'operar'),
  ('eto.ver', 'Entrar a ETO', 'eto', 'portal', 'ver'),
  ('eto.nivel1', 'ETO Nivel 1', 'eto', 'niveles', 'nivel1'),
  ('eto.nivel2', 'ETO Nivel 2', 'eto', 'niveles', 'nivel2')
on conflict (codigo) do update set nombre = excluded.nombre, pilar = excluded.pilar, modulo = excluded.modulo, accion = excluded.accion;

insert into public.roles (empresa_id, codigo, nombre, descripcion, alcance, es_sistema)
select e.id, 'SUPER_ADMIN', 'Super administradora', 'Control total multiempresa y multipilar.', 'global', true
from public.empresas e
on conflict (empresa_id, codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, alcance = excluded.alcance, es_sistema = true;

insert into public.roles (empresa_id, codigo, nombre, descripcion, alcance, es_sistema)
select e.id, r.codigo, r.nombre, r.descripcion, 'empresa', true
from public.empresas e
cross join (values
  ('ADMIN_EMPRESA', 'Administrador empresa', 'Administra usuarios y operación de su empresa.'),
  ('OPERADOR_WMS', 'Operador WMS', 'Opera procesos del WMS.'),
  ('SUPERVISOR_5S', 'Supervisor 5S', 'Administra operación 5S.'),
  ('ETO_NIVEL_1', 'ETO Nivel 1', 'Acceso exclusivo al portal ETO nivel 1.'),
  ('ETO_NIVEL_2', 'ETO Nivel 2', 'Acceso exclusivo al portal ETO nivel 2.'),
  ('CONSULTA', 'Consulta', 'Acceso de solo consulta.')
) as r(codigo, nombre, descripcion)
on conflict (empresa_id, codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

insert into public.usuarios (empresa_id, nombre, email, usuario, rol, clave_acceso, documento, estado, es_super_admin)
select e.id, 'Gineth Visbal', 'admin@inova.local', 'Gvisbal', 'SUPER_ADMIN', '768', 'SUPERADMIN', 'ACTIVO', true
from public.empresas e
where e.id = 1
on conflict (empresa_id, usuario) do update
set rol = 'SUPER_ADMIN', clave_acceso = coalesce(public.usuarios.clave_acceso, '768'), es_super_admin = true, estado = 'ACTIVO';

insert into public.usuario_pilares (usuario_id, empresa_id, pilar, rol_id, eto_nivel, estado)
select u.id, u.empresa_id, p.pilar, r.id, p.eto_nivel, 'ACTIVO'
from public.usuarios u
join public.roles r on r.empresa_id = u.empresa_id and r.codigo = 'SUPER_ADMIN'
cross join (values ('wms', null::integer), ('5s', null::integer), ('eto', 1), ('eto', 2)) as p(pilar, eto_nivel)
where u.usuario = 'Gvisbal'
  and not exists (
    select 1
    from public.usuario_pilares up
    where up.usuario_id = u.id
      and up.empresa_id = u.empresa_id
      and up.pilar = p.pilar
      and coalesce(up.eto_nivel, 0) = coalesce(p.eto_nivel, 0)
  );

create index if not exists ix_solicitudes_acceso_estado on public.solicitudes_acceso(estado, fecha_solicitud);
create index if not exists ix_usuario_pilares_usuario on public.usuario_pilares(usuario_id, estado);
create unique index if not exists ux_usuario_pilares_scope
  on public.usuario_pilares(usuario_id, empresa_id, pilar, coalesce(eto_nivel, 0));
create index if not exists ix_roles_empresa_estado on public.roles(empresa_id, estado);
create index if not exists ix_licencias_empresa_estado on public.licencias_usuario(empresa_id, estado);

alter table if exists public.empresas disable row level security;
alter table if exists public.usuarios disable row level security;
alter table if exists public.pilares disable row level security;
alter table if exists public.roles disable row level security;
alter table if exists public.permisos disable row level security;
alter table if exists public.role_permisos disable row level security;
alter table if exists public.usuario_pilares disable row level security;
alter table if exists public.solicitudes_acceso disable row level security;
alter table if exists public.planes_empresa disable row level security;
alter table if exists public.licencias_usuario disable row level security;
alter table if exists public.auditoria_admin disable row level security;

grant select, insert, update, delete on table public.pilares, public.roles, public.permisos, public.role_permisos, public.usuario_pilares, public.solicitudes_acceso, public.planes_empresa, public.licencias_usuario, public.auditoria_admin to anon, authenticated;
grant select, insert, update on table public.usuarios, public.empresas to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

commit;
