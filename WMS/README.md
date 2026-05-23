# WMS

Pilar de gestion de almacen.

## Estructura

- `backend/` API FastAPI WMS.
- `frontend/` app React/Vite WMS.

## Arranque local

Backend:

```powershell
cd C:\Users\Cristian\Documents\INOVA\WMS\backend
$env:DATABASE_URL="postgresql://..."
uvicorn main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd C:\Users\Cristian\Documents\INOVA\WMS\frontend
npm run dev
```
