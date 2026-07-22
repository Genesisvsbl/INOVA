import {
  deleteById,
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
  updateById,
} from "../../../WMS/frontend/src/supabaseRest";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8002"
).replace(/\/$/, "");

async function handle(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : null;
}

function apiFetch(path, options = {}) {
  return fetch(`${API_URL}${path}`, options).then(handle);
}

function withEmpresa(payload) {
  return { ...payload, empresa_id: empresaId };
}

function activeParam(activeOnly) {
  return activeOnly ? { activo: "eq.true" } : {};
}

const CATALOG_TYPES_5S = [
  { tipo: "estados_bodega", nombre: "Estados de bodega" },
  { tipo: "estados_cronograma", nombre: "Estados de cronograma" },
  { tipo: "prioridades_cronograma", nombre: "Prioridades de cronograma" },
  { tipo: "severidades", nombre: "Severidades" },
  { tipo: "pilares", nombre: "Pilares 5S" },
];

function valuesByType(catalogos, tipo) {
  return catalogos
    .filter((item) => item.tipo === tipo && item.activo !== false)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
    .map((item) => item.nombre);
}

async function getConfigFromSupabase() {
  const [rows, catalogos, bodegas] = await Promise.all([
    selectRows("5s", "configuracion_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "clave,valor",
    }),
    selectRows("5s", "catalogos_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "orden.asc",
    }),
    selectRows("5s", "bodegas_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "nombre.asc",
    }),
  ]);

  const config = {
    meta_general: 90,
    meta_bodega: 90,
    catalog_types: CATALOG_TYPES_5S,
    catalogos: catalogos || [],
    bodegas: bodegas || [],
  };

  rows.forEach((row) => {
    const raw = row.valor;
    const numeric = Number(raw);
    config[row.clave] = Number.isFinite(numeric) && raw !== "" ? numeric : raw;
  });

  CATALOG_TYPES_5S.forEach(({ tipo }) => {
    config[tipo] = valuesByType(config.catalogos, tipo);
  });

  return config;
}

export { API_URL, handle, apiFetch };

export async function getBodegas5S({ activeOnly = false } = {}) {
  if (supabaseEnabled) {
    const bodegas5S = await selectRows("5s", "bodegas_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "nombre.asc",
      ...activeParam(activeOnly),
    });

    if (bodegas5S.length) return bodegas5S;

    const ubicaciones = await selectRows("wms", "ubicaciones", {
      empresa_id: `eq.${empresaId}`,
      select: "bodega,zona",
      order: "bodega.asc",
      limit: "5000",
    });

    const byName = new Map();
    ubicaciones.forEach((row) => {
      const nombre = String(row.bodega || "").trim();
      if (!nombre || byName.has(nombre)) return;
      byName.set(nombre, {
        id: `wms-${nombre}`,
        nombre,
        area: row.zona || "",
        estado: "Activa",
        activo: true,
        meta_bodega: 90,
        puntos: 0,
      });
    });

    return [...byName.values()];
  }

  const params = new URLSearchParams();
  if (activeOnly) params.set("active_only", "true");
  return apiFetch(`/api/5s/bodegas${params.toString() ? `?${params}` : ""}`);
}

export function crearBodega5S(payload) {
  if (supabaseEnabled) return insertRow("5s", "bodegas_5s", withEmpresa(payload));
  return apiFetch("/api/5s/bodegas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function editarBodega5S(id, payload) {
  if (supabaseEnabled) return updateById("5s", "bodegas_5s", id, payload);
  return apiFetch(`/api/5s/bodegas/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function eliminarBodega5S(id) {
  if (supabaseEnabled) return deleteById("5s", "bodegas_5s", id);
  return apiFetch(`/api/5s/bodegas/${id}`, { method: "DELETE" });
}

export function getSububicaciones5S({ bodegaId, activeOnly = false } = {}) {
  if (supabaseEnabled) {
    return selectRows("5s", "subbodegas_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "nombre.asc",
      ...(bodegaId ? { bodega_id: `eq.${bodegaId}` } : {}),
      ...activeParam(activeOnly),
    });
  }

  const params = new URLSearchParams();
  if (bodegaId) params.set("bodega_id", String(bodegaId));
  if (activeOnly) params.set("active_only", "true");
  return apiFetch(`/api/5s/sububicaciones${params.toString() ? `?${params}` : ""}`);
}

export function crearSububicacion5S(payload) {
  if (supabaseEnabled) return insertRow("5s", "subbodegas_5s", withEmpresa(payload));
  return apiFetch("/api/5s/sububicaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function editarSububicacion5S(id, payload) {
  if (supabaseEnabled) return updateById("5s", "subbodegas_5s", id, payload);
  return apiFetch(`/api/5s/sububicaciones/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function eliminarSububicacion5S(id) {
  if (supabaseEnabled) return deleteById("5s", "subbodegas_5s", id);
  return apiFetch(`/api/5s/sububicaciones/${id}`, { method: "DELETE" });
}

export function getConfig5S() {
  if (supabaseEnabled) return getConfigFromSupabase();
  return apiFetch("/api/5s/config");
}

export async function guardarConfig5S(payload) {
  if (supabaseEnabled) {
    await Promise.all(Object.entries(payload).map(([clave, valor]) =>
      insertRow("5s", "configuracion_5s", withEmpresa({ clave, valor: valor == null ? "" : String(valor) }))
    ));
    return getConfigFromSupabase();
  }

  return apiFetch("/api/5s/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function getCatalogos5S({ tipo, activeOnly = false } = {}) {
  if (supabaseEnabled) {
    return selectRows("5s", "catalogos_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "orden.asc",
      ...(tipo ? { tipo: `eq.${tipo}` } : {}),
      ...activeParam(activeOnly),
    });
  }

  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);
  if (activeOnly) params.set("active_only", "true");
  return apiFetch(`/api/5s/catalogos${params.toString() ? `?${params}` : ""}`);
}

export function crearCatalogo5S(payload) {
  if (supabaseEnabled) return insertRow("5s", "catalogos_5s", withEmpresa(payload));
  return apiFetch("/api/5s/catalogos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function editarCatalogo5S(id, payload) {
  if (supabaseEnabled) return updateById("5s", "catalogos_5s", id, payload);
  return apiFetch(`/api/5s/catalogos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function eliminarCatalogo5S(id) {
  if (supabaseEnabled) return deleteById("5s", "catalogos_5s", id);
  return apiFetch(`/api/5s/catalogos/${id}`, { method: "DELETE" });
}

export async function getResponsables5S({ activo } = {}) {
  if (supabaseEnabled) {
    const responsables5S = await selectRows("5s", "responsables_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "nombre.asc",
      ...(activo !== undefined ? { activo: `eq.${activo}` } : {}),
    });

    if (responsables5S.length) return responsables5S;

    const usuarios = await selectRows("public", "usuarios", {
      empresa_id: `eq.${empresaId}`,
      select: "id,nombre,usuario,rol,estado",
      order: "nombre.asc",
      limit: "1000",
    });

    return usuarios
      .filter((user) => activo === undefined || (activo ? user.estado !== "INACTIVO" : user.estado === "INACTIVO"))
      .map((user) => ({
        id: `user-${user.id}`,
        usuario_id: user.id,
        codigo: user.usuario || String(user.id),
        nombre: user.nombre,
        cargo: user.rol || "Usuario",
        area: "INOVA",
        color: "#1d8fe3",
        activo: user.estado !== "INACTIVO",
      }));
  }

  const params = new URLSearchParams();
  if (activo !== undefined) params.set("activo", String(activo));
  return apiFetch(`/api/5s/responsables${params.toString() ? `?${params}` : ""}`);
}

export function crearResponsable5S(payload) {
  if (supabaseEnabled) return insertRow("5s", "responsables_5s", withEmpresa(payload));
  return apiFetch("/api/5s/responsables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function editarResponsable5S(id, payload) {
  if (supabaseEnabled) return updateById("5s", "responsables_5s", id, payload);
  return apiFetch(`/api/5s/responsables/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function desactivarResponsable5S(id) {
  if (supabaseEnabled) return updateById("5s", "responsables_5s", id, { activo: false });
  return apiFetch(`/api/5s/responsables/${id}`, { method: "DELETE" });
}

export function getCronograma5S(params = {}) {
  if (supabaseEnabled) {
    return selectRows("5s", "cronograma_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "fecha_inicio.asc",
      ...(params.estado ? { estado: `eq.${params.estado}` } : {}),
      ...(params.bodega ? { bodega: `eq.${params.bodega}` } : {}),
    });
  }

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== null && value !== "" && query.set(key, value));
  return apiFetch(`/api/5s/cronograma${query.toString() ? `?${query}` : ""}`);
}

export function crearCronograma5S(payload) {
  if (supabaseEnabled) return insertRow("5s", "cronograma_5s", withEmpresa(payload));
  return apiFetch("/api/5s/cronograma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function editarCronograma5S(id, payload) {
  if (supabaseEnabled) return updateById("5s", "cronograma_5s", id, payload);
  return apiFetch(`/api/5s/cronograma/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function eliminarCronograma5S(id) {
  if (supabaseEnabled) return deleteById("5s", "cronograma_5s", id);
  return apiFetch(`/api/5s/cronograma/${id}`, { method: "DELETE" });
}

export function getChecklist5S({ bodega, activeOnly = true } = {}) {
  if (supabaseEnabled) {
    return selectRows("5s", "checklist_items_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "orden.asc",
      ...(bodega ? { bodega: `eq.${bodega}` } : {}),
      ...activeParam(activeOnly),
    });
  }

  const params = new URLSearchParams();
  if (bodega) params.set("bodega", bodega);
  if (activeOnly) params.set("active_only", "true");
  return apiFetch(`/api/5s/checklist${params.toString() ? `?${params}` : ""}`);
}

export function crearChecklistItem5S(payload) {
  if (supabaseEnabled) return insertRow("5s", "checklist_items_5s", withEmpresa(payload));
  return apiFetch("/api/5s/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function editarChecklistItem5S(id, payload) {
  if (supabaseEnabled) return updateById("5s", "checklist_items_5s", id, payload);
  return apiFetch(`/api/5s/checklist/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function eliminarChecklistItem5S(id) {
  if (supabaseEnabled) return deleteById("5s", "checklist_items_5s", id);
  return apiFetch(`/api/5s/checklist/${id}`, { method: "DELETE" });
}

export async function crearInspeccion5S(payload) {
  if (!supabaseEnabled) {
    return apiFetch("/api/5s/inspecciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }

  const [inspeccion] = await insertRow("5s", "inspecciones_5s", withEmpresa({
    fecha: payload.fecha,
    semana: payload.semana,
    responsable: payload.responsable,
    area: payload.area,
    bodega: payload.bodega,
    cumplimiento: payload.cumplimiento || 0,
    meta_bodega: payload.meta_bodega || 90,
  }));

  const items = payload.items || payload.detalles || [];
  if (items.length) {
    await Promise.all(items.map((item) => insertRow("5s", "inspeccion_items_5s", withEmpresa({
      inspeccion_id: inspeccion.id,
      checklist_item_id: item.checklist_item_id || item.id || null,
      punto: item.punto || item.pregunta || "",
      pilar: item.pilar || "",
      peso: item.peso || 1,
      cumple: Boolean(item.cumple),
      severidad: item.severidad || null,
      observacion: item.observacion || null,
    }))));
  }

  return inspeccion;
}

export function getInspecciones5S(params = {}) {
  if (supabaseEnabled) {
    return selectRows("5s", "inspecciones_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "fecha.desc",
      ...(params.bodega ? { bodega: `eq.${params.bodega}` } : {}),
    });
  }

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== null && value !== "" && query.set(key, value));
  return apiFetch(`/api/5s/inspecciones${query.toString() ? `?${query}` : ""}`);
}

export async function getDashboard5S() {
  if (!supabaseEnabled) return apiFetch("/api/5s/dashboard");

  const [bodegas, inspecciones, config] = await Promise.all([
    getBodegas5S(),
    getInspecciones5S(),
    getConfig5S(),
  ]);

  const metaGeneral = Number(config?.meta_general || 90);
  const metaBodega = Number(config?.meta_bodega || 90);
  const promedio =
    inspecciones.length > 0
      ? inspecciones.reduce((acc, item) => acc + Number(item.cumplimiento || 0), 0) / inspecciones.length
      : 0;

  const porBodega = bodegas.map((bodega) => {
    const rows = inspecciones.filter((item) => item.bodega === bodega.nombre);
    const score = rows.length
      ? rows.reduce((acc, item) => acc + Number(item.cumplimiento || 0), 0) / rows.length
      : 0;
    return {
      bodega: bodega.nombre,
      auditorias: rows.length,
      promedio: score,
      meta: Number(bodega.meta_bodega || metaBodega),
      estado: scoreLevelLabel(score),
    };
  });

  const responsableMap = new Map();
  inspecciones.forEach((item) => {
    const key = item.responsable || "Sin responsable";
    if (!responsableMap.has(key)) responsableMap.set(key, []);
    responsableMap.get(key).push(item);
  });

  const porResponsable = [...responsableMap.entries()].map(([responsable, rows]) => {
    const score = rows.length
      ? rows.reduce((acc, item) => acc + Number(item.cumplimiento || 0), 0) / rows.length
      : 0;
    return {
      responsable,
      auditorias: rows.length,
      promedio: score,
      estado: scoreLevelLabel(score),
    };
  });

  return {
    total_bodegas: bodegas.length,
    bodegas_activas: bodegas.filter((item) => item.activo !== false).length,
    total_inspecciones: inspecciones.length,
    cumplimiento_promedio: promedio,
    promedio_general: promedio,
    meta_general: metaGeneral,
    meta_bodega: metaBodega,
    estado_general: scoreLevelLabel(promedio),
    bajo_meta: porBodega.filter((item) => item.promedio > 0 && item.promedio < item.meta).length,
    por_bodega: porBodega,
    por_responsable: porResponsable,
    inspecciones,
  };
}

function scoreLevelLabel(score) {
  const value = Number(score || 0);
  if (value >= 90) return "Óptimo";
  if (value >= 80) return "Atención";
  if (value > 0) return "Crítico";
  return "Sin auditoría";
}


