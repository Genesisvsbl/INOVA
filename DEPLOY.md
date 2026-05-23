# INOVA deploy

La base de datos activa sera Supabase PostgreSQL con esquema multiempresa por
`empresa_id`. El SQL inicial esta en `supabase_schema_inova_multiempresa.sql`.

Schemas:

- `public`: empresas, usuarios y datos transversales.
- `wms`: WMS.
- `"5s"`: 5S.
- `eto_digital`: ETO DIGITAL.

## Variables de base de datos

Cada backend debe recibir una URL PostgreSQL de Supabase:

```text
DATABASE_URL=postgresql+psycopg2://...
```

Tambien se aceptan `SUPABASE_DATABASE_URL` o `SUPABASE_DB_URL`.

## Frontends

Cada pilar tiene su frontend separado:

- WMS: `WMS/frontend`
- 5S: `5S/frontend`
- ETO: `ETO/app`

Variables esperadas:

```text
VITE_API_URL=http://127.0.0.1:8000
VITE_ETO_API_URL=http://127.0.0.1:8001
```

Para produccion, cambia esas variables por la URL real de la API que se use.
Render queda fuera del flujo activo.
