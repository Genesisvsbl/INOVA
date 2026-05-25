begin;

alter table if exists public.usuarios
  add column if not exists es_admin_inova boolean not null default false;

insert into public.permisos (codigo, nombre, pilar, modulo, accion, descripcion) values
  ('admin.planes.gestionar', 'Gestionar planes comerciales', 'global', 'planes', 'gestionar', 'Permite vender y modificar cupos de usuarios por empresa.')
on conflict (codigo) do update
set nombre = excluded.nombre,
    pilar = excluded.pilar,
    modulo = excluded.modulo,
    accion = excluded.accion,
    descripcion = excluded.descripcion;

insert into public.roles (empresa_id, codigo, nombre, descripcion, alcance, es_sistema)
select e.id, 'ADMIN_INOVA', 'Administracion comercial INOVA',
       'Administra empresas, planes, licencias y asigna el super administrador de cada empresa sin acceso operativo a sus datos.',
       'comercial', true
from public.empresas e
where e.id = 1
on conflict (empresa_id, codigo) do update
set nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    alcance = excluded.alcance,
    es_sistema = true;

update public.roles
set nombre = 'Super administrador empresa',
    descripcion = 'Control total de usuarios, roles y operacion solo dentro de su empresa asignada.',
    alcance = 'empresa'
where codigo = 'SUPER_ADMIN';

update public.usuarios
set rol = 'ADMIN_INOVA',
    es_admin_inova = true,
    es_super_admin = false,
    fecha_actualizacion = now()
where lower(coalesce(usuario, '')) in ('gvisbal', 'genesis', 'admin')
   or lower(coalesce(email, '')) in ('genesisvsbl@outlook.com', 'admin@inova.local');

insert into public.auditoria_admin (empresa_id, usuario_id, accion, entidad, entidad_id, detalle)
select u.empresa_id, u.id, 'ACTIVACION_ADMIN_INOVA', 'usuarios', u.id::text,
       jsonb_build_object('rol', u.rol, 'es_admin_inova', u.es_admin_inova)
from public.usuarios u
where u.es_admin_inova = true
  and not exists (
    select 1
    from public.auditoria_admin a
    where a.usuario_id = u.id
      and a.accion = 'ACTIVACION_ADMIN_INOVA'
  );

commit;
