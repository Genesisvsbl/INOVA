// Traductor central de mensajes: convierte errores técnicos (en inglés o
// crudos) en mensajes claros en español. Si el texto NO coincide con un patrón
// técnico conocido, se devuelve igual (para no dañar mensajes ya redactados).
export function humanizarMensaje(msg) {
  const s = String(msg ?? "");
  if (!s.trim()) return s;
  const low = s.toLowerCase();
  const has = (...w) => w.some((x) => low.includes(x));

  if (has("exceeded the quota", "quotaexceeded", "quota_exceeded", "quota"))
    return "El navegador se quedó sin espacio de almacenamiento. Cierra otras pestañas o borra los datos del sitio y vuelve a intentar. Tu información sigue guardada en la base.";

  if (has("failed to fetch", "networkerror", "network error", "err_internet", "load failed", "err_connection", "net::"))
    return "Sin conexión con el servidor. Revisa tu internet y vuelve a intentar.";

  if (has("timeout", "timed out", "etimedout", "504"))
    return "La operación tardó demasiado. Revisa tu conexión y vuelve a intentar.";

  if (has("permission denied", "row-level security", "pgrst301", "401", "403"))
    return "No tienes permiso para esta acción. Revisa tu sesión o tu rol.";

  if (has("duplicate key", "already exists", "23505"))
    return "Ese registro ya existe (dato duplicado). Verifica antes de guardar.";

  if (has("null value in column", "23502"))
    return "Falta un dato obligatorio. Completa los campos requeridos y vuelve a intentar.";

  if (has("foreign key", "23503"))
    return "No se puede completar por una relación con otros datos. Verifica la información.";

  if (has("payload too large", "413", "request entity too large"))
    return "El archivo es demasiado grande. Intenta con uno más pequeño o divídelo.";

  if (has("could not find the table", "schema cache", "pgrst205", "pgrst204", "42703"))
    return "Falta una actualización en la base de datos. Avisa al administrador del sistema.";

  if (has("all object keys must match", "pgrst102"))
    return "El archivo tiene filas con columnas distintas. Revisa que todas tengan las mismas columnas.";

  if (has("unexpected token", "is not valid json", "json.parse", "<!doctype", "unexpected end of json"))
    return "El servidor devolvió una respuesta inesperada. Vuelve a intentar en un momento.";

  if (has("setitem", "storage"))
    return "El navegador no pudo guardar datos temporales (almacenamiento lleno). Borra los datos del sitio y vuelve a intentar.";

  if (has("500", "internal server error"))
    return "Ocurrió un error en el servidor. Intenta de nuevo; si persiste, avisa al administrador.";

  return s;
}
