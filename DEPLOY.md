# INOVA deploy

La base de datos activa sera Supabase PostgreSQL con esquema multiempresa por
`empresa_id`. El SQL inicial esta en `supabase_schema_inova_multiempresa.sql`.

Schemas:

- `public`: empresas, usuarios y datos transversales.
- `wms`: WMS.
- `"5s"`: 5S.
- `eto_digital`: ETO DIGITAL.

## Variables de base de datos

WMS ya no tiene backend propio: opera directamente contra Supabase desde el
frontend. Los backends que siguen vivos (5S y ETO) reciben una URL PostgreSQL
de Supabase:

```text
DATABASE_URL=postgresql+psycopg2://...
```

Tambien se aceptan `SUPABASE_DATABASE_URL` o `SUPABASE_DB_URL`.

## Frontends

Cada pilar tiene su frontend separado:

- WMS: `WMS/frontend` (Supabase directo, sin backend)
- 5S: `5S/frontend`
- ETO: `ETO/app`

Variables esperadas:

```text
# WMS -> Supabase directo
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clave-publica>
VITE_EMPRESA_ID=1

# Backends que siguen activos
VITE_API_URL=http://127.0.0.1:8000   # 5S
VITE_ETO_API_URL=http://127.0.0.1:8001
```

Para produccion, cambia esas variables por la URL real de la API que se use.
Render queda fuera del flujo activo.
