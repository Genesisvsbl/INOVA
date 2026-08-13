const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const DEFAULT_EMPRESA_ID = Number(import.meta.env.VITE_EMPRESA_ID || 1);

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const empresaId = DEFAULT_EMPRESA_ID;
export const supabaseUrl = SUPABASE_URL;
export const supabaseKey = SUPABASE_KEY;

function buildUrl(schema, table, params = {}) {
  const url = new URL(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

async function request(schema, table, { method = "GET", params, body, prefer = "return=representation" } = {}) {
  if (!supabaseEnabled) {
    throw new Error("Supabase no esta configurado en VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  const res = await fetch(buildUrl(schema, table, params), {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer,
      ...(method === "GET" ? { "Accept-Profile": schema } : { "Content-Profile": schema }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* no json */ }
    const err = new Error(mensajeErrorAmigable(text, res.status, table));
    err.raw = text; // texto técnico original (para chequeos internos)
    err.code = data?.code || "";
    err.status = res.status;
    err.details = data?.details || "";
    throw err;
  }

  if (res.status === 204) return null;
  // Con Prefer: return=minimal el cuerpo viene VACÍO (aunque el status sea 201).
  // res.json() sobre un cuerpo vacío lanza "Unexpected end of JSON input", por
  // eso leemos el texto y solo parseamos si hay contenido.
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Convierte los errores técnicos de PostgREST/Supabase en mensajes claros.
function mensajeErrorAmigable(text, status, table) {
  let data = null;
  try { data = JSON.parse(text); } catch { /* no era JSON */ }
  const code = data?.code || "";
  const msg = data?.message || text || "";
  const det = data?.details || "";
  const t = table ? ` (${table})` : "";

  if (code === "PGRST102" || /all object keys must match/i.test(msg))
    return `El archivo tiene filas con columnas distintas${t}. Revisa que todas las filas tengan las mismas columnas y vuelve a intentar.`;
  if (code === "23505" || /duplicate key|already exists/i.test(msg))
    return `Hay registros duplicados${t}: ${det || "ya existe una fila con esa clave"}.`;
  if (code === "23502" || /null value in column/i.test(msg))
    return `Falta un dato obligatorio${t}: ${det || msg}.`;
  if (code === "23503" || /foreign key/i.test(msg))
    return `No se puede completar por una relación con otros datos${t}: ${det || msg}.`;
  if (code === "PGRST205" || /could not find the table|schema cache/i.test(msg))
    return `No se encontró la tabla${t}. Puede faltar una migración en la base de datos.`;
  if (code === "PGRST301" || status === 401 || status === 403)
    return `No tienes permiso para esta acción${t}. Revisa tu sesión o rol.`;
  if (status === 413 || /payload too large/i.test(msg))
    return `El archivo es demasiado grande para una sola carga${t}. Intenta dividirlo.`;

  return msg || `Error del servidor (HTTP ${status})${t}.`;
}

export async function countRows(schema, table, params = {}) {
  if (!supabaseEnabled) {
    throw new Error("Supabase no esta configurado en VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  const res = await fetch(buildUrl(schema, table, { ...params, select: params.select || "id" }), {
    method: "HEAD",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
      "Accept-Profile": schema,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Supabase HTTP ${res.status}`);
  }

  const contentRange = res.headers.get("content-range") || "";
  const total = contentRange.split("/").pop();
  return total && total !== "*" ? Number(total) : 0;
}
export function selectRows(schema, table, params = {}) {
  return request(schema, table, { params });
}

// Trae TODOS los registros que cumplen el filtro, SIN límite. Pide la primera
// página junto con el total exacto (header content-range) y luego descarga las
// páginas restantes EN PARALELO (concurrencia limitada) para que sea rápido
// aunque haya muchísima información. Todas las pantallas pasan por aquí.
export async function selectAllRows(schema, table, params = {}) {
  if (!supabaseEnabled) {
    throw new Error("Supabase no esta configurado en VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  const pageSize = 1000;
  const base = { ...params };
  delete base.limit;
  delete base.offset;

  // Trae TODO (sin límite), pero SIN pedir "count=exact" (que obliga a Postgres a
  // contar exacto en cada carga → lento con millones). Se paginan tandas en
  // paralelo hasta que una página venga incompleta (ya no hay más datos).
  const fetchPage = (offset) =>
    request(schema, table, { params: { ...base, limit: String(pageSize), offset: String(offset) } });

  const first = await fetchPage(0);
  if (!Array.isArray(first) || first.length < pageSize) {
    return Array.isArray(first) ? first : [];
  }

  let all = first.slice();
  let offset = pageSize;
  const BATCH = 6; // páginas en paralelo por tanda
  // Límite de seguridad muy alto solo para no hacer un bucle infinito por error.
  for (let vuelta = 0; vuelta < 100000; vuelta++) {
    const offsets = [];
    for (let k = 0; k < BATCH; k++) offsets.push(offset + k * pageSize);
    const pages = await Promise.all(offsets.map(fetchPage));
    let hayMas = true;
    for (const page of pages) {
      if (Array.isArray(page) && page.length) all = all.concat(page);
      if (!Array.isArray(page) || page.length < pageSize) hayMas = false;
    }
    if (!hayMas) break;
    offset += BATCH * pageSize;
  }
  return all;
}

export function insertRow(schema, table, row, opts = {}) {
  let body = row;
  // En una inserción por lotes, PostgREST exige que TODOS los objetos tengan
  // exactamente las mismas claves (si no: PGRST102 "All object keys must match").
  // Normalizamos: unimos todas las claves y rellenamos las faltantes con null.
  if (Array.isArray(row) && row.length > 1) {
    const keys = new Set();
    for (const r of row) {
      if (r && typeof r === "object") for (const k of Object.keys(r)) keys.add(k);
    }
    body = row.map((r) => {
      const o = {};
      for (const k of keys) o[k] = r && r[k] !== undefined ? r[k] : null;
      return o;
    });
  }
  // Con { minimal: true } el servidor NO devuelve las filas insertadas: mucho
  // más rápido cuando se insertan muchos registros (no serializa ni parsea la
  // respuesta). Se usa cuando no necesitamos los IDs de vuelta.
  const prefer = opts.minimal ? "return=minimal" : "return=representation";
  return request(schema, table, { method: "POST", body, prefer });
}

export function upsertRows(schema, table, rows, onConflict) {
  return request(schema, table, {
    method: "POST",
    params: onConflict ? { on_conflict: onConflict } : {},
    body: rows,
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

export function updateById(schema, table, id, payload) {
  return request(schema, table, {
    method: "PATCH",
    params: { id: `eq.${id}` },
    body: payload,
  });
}

export function deleteById(schema, table, id) {
  return request(schema, table, {
    method: "DELETE",
    params: { id: `eq.${id}` },
  });
}

// Borra TODOS los registros que cumplen el filtro en una sola llamada
// (sin límite de página). params debe traer al menos un filtro.
export function deleteWhere(schema, table, params = {}) {
  return request(schema, table, {
    method: "DELETE",
    params,
    prefer: "return=minimal",
  });
}
