begin;

insert into public.roles (empresa_id, codigo, nombre, descripcion, alcance, es_sistema, estado)
select e.id,
       'OPERADOR_5S',
       'Operador 5S',
       'Opera inspecciones 5S sin acceso a responsables ni configuracion.',
       'empresa',
       true,
       'ACTIVO'
from public.empresas e
on conflict (empresa_id, codigo) do update
set nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    alcance = excluded.alcance,
    es_sistema = true,
    estado = 'ACTIVO';

commit;
