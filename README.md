# INOVA

Plataforma SaaS multiempresa organizada por pilares.

## Pilares

- `WMS/`: gestion de almacen. Contiene backend FastAPI y frontend React/Vite en `WMS/frontend`.
- `5S/`: gestion visual y calidad 5S. Contiene fuentes frontend y assets del pilar; WMS conserva puentes para las rutas actuales.
- `ETO/`: ETO DIGITAL. Contiene la app completa en `ETO/app`.

## Compartido

- `supabase_schema_inova_multiempresa.sql`: esquema Supabase multiempresa por `empresa_id`, separado por schemas:
  - `public`: informacion transversal como empresas y usuarios.
  - `wms`: tablas propias de WMS.
  - `"5s"`: tablas propias de 5S.
  - `eto_digital`: tablas propias de ETO DIGITAL.
- `INOVA_CONTINUIDAD.md`: notas tecnicas y decisiones de continuidad.
- `DEPLOY.md`: instrucciones de despliegue.

## Nota de limpieza

La carpeta original `wms/` no se pudo retirar porque Windows reporto archivos en uso durante el movimiento. La copia organizada esta en `WMS/`; cuando ningun proceso este usando `wms/`, se puede eliminar o archivar tras confirmar que no contiene cambios nuevos.
