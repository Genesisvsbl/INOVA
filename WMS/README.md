# WMS

Pilar de gestion de almacen.

El WMS opera directamente contra Supabase (schema `wms`) desde el frontend.
Ya no depende de un backend FastAPI propio.

## Estructura

- `frontend/` app React/Vite WMS. Lee y escribe en Supabase via REST (`src/supabaseRest.js` y `src/api.js`).

## Arranque local

```powershell
cd C:\Users\Cristian\Documents\INOVA\WMS\frontend
npm run dev
```

## Variables de entorno (frontend)

El frontend espera las claves de Supabase en `WMS/frontend/.env.local`:

```text
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clave-publica>
VITE_EMPRESA_ID=1
```
