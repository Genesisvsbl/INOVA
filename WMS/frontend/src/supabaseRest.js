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
    throw new Error(text || `Supabase HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
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

  // Primera página + total exacto.
  const firstRes = await fetch(buildUrl(schema, table, { ...base, limit: String(pageSize), offset: "0" }), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
      "Accept-Profile": schema,
    },
  });
  if (!firstRes.ok) {
    const text = await firstRes.text();
    throw new Error(text || `Supabase HTTP ${firstRes.status}`);
  }
  const first = await firstRes.json();
  if (!Array.isArray(first) || first.length < pageSize) return Array.isArray(first) ? first : [];

  const cr = firstRes.headers.get("content-range") || "";
  const totalStr = cr.split("/").pop();
  const total = totalStr && totalStr !== "*" ? Number(totalStr) : 0;
  if (!total || total <= pageSize) return first;

  // Offsets de las páginas restantes.
  const offsets = [];
  for (let off = pageSize; off < total; off += pageSize) offsets.push(off);

  // Descarga en paralelo con concurrencia limitada (no saturar).
  const CONCURRENCIA = 6;
  const results = new Array(offsets.length);
  let cursor = 0;
  async function worker() {
    while (cursor < offsets.length) {
      const my = cursor;
      cursor += 1;
      results[my] = await request(schema, table, {
        params: { ...base, limit: String(pageSize), offset: String(offsets[my]) },
      });
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCIA, offsets.length) }, () => worker())
  );

  let all = first;
  for (const page of results) if (Array.isArray(page)) all = all.concat(page);
  return all;
}

export function insertRow(schema, table, row) {
  return request(schema, table, { method: "POST", body: row });
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
