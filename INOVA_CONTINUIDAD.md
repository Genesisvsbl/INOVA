# INOVA - continuidad

Fecha de corte: 2026-05-23

## Estado general

La app se esta consolidando como una sola experiencia con tres pilares:

- `WMS`: inventarios, materiales, proveedores, ubicaciones, movimientos y dashboard.
- `5S`: calidad 5S, responsables, bodegas, subbodegas, cronograma, checklist, inspecciones y dashboard.
- `ETO`: pilar de gestion/procesos ETO Digital.

La base de datos principal es Supabase. Ya no se debe depender de Render para estos flujos.

## Supabase

Proyecto usado:

- `https://sfaeibrombcmycvsnpgt.supabase.co`

Schemas definidos:

- `public`: informacion transversal multiempresa, como empresas y usuarios.
- `wms`: datos propios de WMS.
- `"5s"`: datos propios del pilar 5S.
- `eto_digital`: datos propios de ETO Digital.

Regla multiempresa:

- Todas las tablas operativas deben trabajar por `empresa_id`.
- Siempre relacionar por `id` cuando aplique.
- No duplicar datos entre pilares si pertenecen a otro dominio.

## Tablas y datos cargados

WMS:

- `wms.materiales`: cargado desde Excel.
- `wms.proveedores`: cargado desde Excel, depurado por duplicados.
- `wms.ubicaciones`: cargado desde Excel.

5S:

- `5s.bodegas_5s`: contiene bodegas principales como `BODEGA GENERAL` y `BODEGAS EXTERNAS`.
- `5s.responsables_5s`: contiene responsables 5S activos.
- `5s.catalogos_5s`: contiene estados, prioridades, severidades y pilares.
- `5s.configuracion_5s`: contiene metas generales.
- `5s.subbodegas_5s`: creada para manejar subbodegas dentro de una bodega principal 5S.

Importante:

- Las subbodegas quedan solo en el schema `"5s"`, tabla `subbodegas_5s`.
- WMS no debe manejar subbodegas 5S.

## Cambios recientes en frontend

App unificada:

- Se mantiene el servidor local en `http://127.0.0.1:5173`.
- El build se valida desde `WMS/frontend` con `npm run build`.

5S:

- Se mejoro el diseno visual del modulo.
- Se corrigio el acceso de usuario global/admin al pilar 5S.
- Se conectaron responsables y bodegas a Supabase.
- Se agrego seccion de `Subbodegas por bodega` en Responsables.
- Se corrigio el error `MapPin is not defined` importando `MapPin` desde `lucide-react`.

WMS:

- Dashboard y conteos leen Supabase.
- Tablas tienen filtros y ordenamiento global.
- Se mejoraron estilos de tablas.

## Verificaciones hechas

- `npm run build` pasa correctamente en `WMS/frontend`.
- `5s.responsables_5s` responde por REST con registros.
- `5s.subbodegas_5s` responde por REST, actualmente sin datos.
- Se aplicaron permisos para que `subbodegas_5s` pueda leerse y escribirse desde la app.

## Pendientes para seguir

- Probar visualmente en navegador la pantalla `5S > Responsables` despues de recargar con `Ctrl + F5`.
- Crear subbodegas reales para `BODEGA GENERAL` y `BODEGAS EXTERNAS`.
- Decidir si cronograma, checklist e inspecciones deben seleccionar bodega principal o subbodega especifica.
- Si deben seleccionar subbodega, agregar `subbodega_id` y `subbodega` a:
  - `5s.cronograma_5s`
  - `5s.checklist_items_5s`
  - `5s.inspecciones_5s`
- Revisar responsive completo de 5S.
- Revisar textos con caracteres raros o mojibake en toda la app.
- Optimizar bundle: Vite avisa que el JS queda grande.

## Notas de seguridad

- No subir `.env.local`, `.env.production`, `.env.txt` ni claves reales.
- Solo subir `.env.example`.
- Las claves de Supabase deben ir en variables de entorno locales o Vercel.

