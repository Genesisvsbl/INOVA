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

// Trae TODOS los registros que cumplen el filtro, paginando de a 1000,
// para que los catalogos (materiales, ubicaciones, proveedores) no se corten.
export async function selectAllRows(schema, table, params = {}) {
  const pageSize = 1000;
  const base = { ...params };
  delete base.limit;
  delete base.offset;

  let all = [];
  let offset = 0;
  for (let i = 0; i < 500; i += 1) {
    const page = await request(schema, table, {
      params: { ...base, limit: String(pageSize), offset: String(offset) },
    });
    if (!Array.isArray(page) || page.length === 0) break;
    all = all.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
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
