# ETO

Pilar ETO DIGITAL.

## Estructura

- `app/` contiene frontend Vite y backend FastAPI del pilar ETO.
- `app/backend/` API ETO.
- `app/src/` frontend principal.

## Arranque local

Backend:

```powershell
cd C:\Users\Cristian\Documents\INOVA\ETO\app\backend
$env:DATABASE_URL="postgresql://..."
uvicorn main:app --host 127.0.0.1 --port 8001
```

Frontend:

```powershell
cd C:\Users\Cristian\Documents\INOVA\ETO\app
npm run dev
```
