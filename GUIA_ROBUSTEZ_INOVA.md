# Guía de robustez INOVA (Bavaria) — pasos seguros

Este documento reúne las mejoras recomendadas. Las de **código** ya están hechas de forma
**aditiva** (no cambian lo que ya opera). Las **delicadas** (seguridad) van como plan para
aplicar **primero en un ambiente de pruebas**, nunca directo sobre producción.

---

## 1. Backups y recuperación (Supabase — solo configuración, sin tocar la app)

En el panel de Supabase del proyecto:

1. **Database → Backups**: confirma que los backups diarios estén activos.
2. Activa el add-on **Point-in-Time Recovery (PITR)** (Settings → Add-ons). Permite
   restaurar a un **minuto exacto** (ej. justo antes de un borrado).
3. **Respaldo propio semanal**: una vez por semana exporta la base con `pg_dump`
   (Database → Connection string) y guarda el archivo fuera de Supabase.
4. **Cómputo**: si el flujo es alto, sube la instancia de cómputo (Settings → Compute)
   a Small/Medium según pico, y usa la **cadena de conexión con pooler** (Supavisor).

Riesgo para la app: **cero** (nada de esto toca el código).

---

## 2. Vista de stock agregada (velocidad) — migración aditiva

Archivo: `supabase/migrations/20260804170000_add_wms_stock_view.sql`.

- Crea la vista `wms.stock_agregado` (stock ALMACENADO ya sumado por
  material/ubicación/lote/vencimiento).
- **No cambia el comportamiento actual**: solo queda disponible.
- Cuando quieras acelerar Motor/Stock/Análisis, se conecta esa vista en lugar de
  traer todos los movimientos al navegador. Se hace **con pruebas** y dejando el
  modo actual como respaldo.

Cómo aplicarla: `supabase db push` (o pegar el SQL en el SQL Editor de Supabase).

---

## 3. Alertas de vencimiento (nueva pantalla — aditiva)

- Nuevo menú **"Vencimientos"** en la barra lateral.
- Lista **vencidos**, **próximos a vencer** (15/30/60/90/180 días configurable) y
  **PNC bloqueado sin gestionar**.
- No toca ningún flujo existente; es solo consulta.

---

## 4. Seguridad (RLS + claves) — PLAN para staging, NO aplicar en producción sin probar

Esto es lo más delicado: mal aplicado puede **bloquear logins o lecturas**. Recomendación:

### 4.1 Ambiente de pruebas (staging)
1. Crea un **segundo proyecto Supabase** (o branch) con una copia de la base.
2. Apunta una **preview de Vercel** a ese proyecto (variables de entorno propias).
3. Prueba TODO ahí antes de tocar producción.

### 4.2 RLS (Row Level Security)
- Hoy el frontend usa la llave pública; sin RLS correcta, esa llave podría leer/escribir todo.
- Plan: activar RLS por tabla con políticas por `empresa_id` (cada empresa ve solo lo suyo).
- **Se prueba en staging** que todos los flujos (login, recibo, picking, inventarios,
  5S, ETO, admin) sigan funcionando ANTES de pasar a producción.

### 4.3 Claves de acceso
- Hoy la clave = cédula, en texto. Plan: **hashear** las claves y forzar cambio en el
  primer ingreso (ya existe `debe_cambiar_clave`).
- Requiere ajustar el login y **migrar** las claves existentes. Se hace en staging con
  un plan de migración reversible.

> Mientras tanto, medida rápida y segura: exigir cambio de clave temporal en el primer
> ingreso y usar claves más fuertes que la cédula.

---

## 5. Otras recomendaciones (cuando haya espacio)
- **Concurrencia** al confirmar picking/despacho: validar stock al confirmar (evita
  sobre-descuento si dos operarios confirman a la vez).
- **Códigos de barras offline**: empaquetar la librería (hoy usa CDN) y probar que las
  pistolas/PDAs de Bavaria escaneen el Code128 generado.
- **Auditoría**: registrar quién edita/borra (especialmente en "Zona segura").
- **KPIs gerenciales**: cumplimiento de reservas, ocupación de bodega, rotación,
  tiempos de despacho.
