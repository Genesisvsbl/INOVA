import {
  deleteById,
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
  updateById,
} from "../../supabaseRest";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  ""
).replace(/\/$/, "");
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

async function handle(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : null;
}

function apiFetch(path, options = {}) {
  if (!API_URL) {
    throw new Error("Supabase no está configurado. Crea WMS/frontend/.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  return fetch(`${API_URL}${path}`, options).then(handle);
}

function withEmpresa(payload) {
  return { ...payload, empresa_id: empresaId };
}

function addDaysISO(date, days) {
  const next = new Date(`${date || new Date().toISOString().slice(0, 10)}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function dataUrlToBlob(dataUrl) {
  const [header, content] = String(dataUrl || "").split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const binary = atob(content || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

async function uploadEvidenceToStorage(evidencia, inspeccionId, itemId) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !String(evidencia.url || evidencia.src || "").startsWith("data:")) {
    return null;
  }

  const bucket = evidencia.bucket || "evidencias-5s";
  const rawName = evidencia.nombre_archivo || evidencia.name || `evidencia-${Date.now()}.jpg`;
  const safeName = rawName.replace(/[^\w.\-]+/g, "_");
  const path = `${empresaId}/${inspeccionId}/${itemId}/${Date.now()}-${safeName}`;
  const blob = dataUrlToBlob(evidencia.url || evidencia.src);

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": blob.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: blob,
  });

  if (!res.ok) throw new Error(await res.text());

  return {
    bucket,
    storage_path: path,
    url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,
  };
}

export async function subirArchivo5S({ file, folder = "general", bucket = "evidencias-5s" }) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !file) return null;

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${empresaId}/${folder}/${Date.now()}-${safeName}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });

  if (!res.ok) throw new Error(await res.text());

  return {
    bucket,
    storage_path: path,
    url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,
  };
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
  if (supabaseEnabled && String(id).startsWith("user-")) {
    const userId = String(id).replace("user-", "");
    return updateById("public", "usuarios", userId, {
      nombre: payload.nombre,
      rol: payload.cargo,
      estado: payload.activo === false ? "INACTIVO" : "ACTIVO",
    });
  }
  if (supabaseEnabled) return updateById("5s", "responsables_5s", id, payload);
  return apiFetch(`/api/5s/responsables/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function eliminarResponsable5S(id) {
  if (supabaseEnabled && String(id).startsWith("user-")) {
    const userId = String(id).replace("user-", "");
    return updateById("public", "usuarios", userId, { estado: "INACTIVO" });
  }
  if (supabaseEnabled) return deleteById("5s", "responsables_5s", id);
  return apiFetch(`/api/5s/responsables/${id}`, { method: "DELETE" });
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
    bodega_id: payload.bodega_id || null,
    responsable: payload.responsable,
    area: payload.area,
    bodega: payload.bodega,
    cumplimiento: payload.cumplimiento || 0,
    meta_bodega: payload.meta_bodega || 90,
  }));

  const items = payload.items || payload.detalles || [];
  for (const item of items) {
    const [createdItem] = await insertRow("5s", "inspeccion_items_5s", withEmpresa({
      inspeccion_id: inspeccion.id,
      checklist_item_id: item.checklist_item_id || item.id || null,
      punto: item.punto || item.pregunta || "",
      pilar: item.pilar || "",
      peso: item.peso || 1,
      cumple: Boolean(item.cumple),
      severidad: item.severidad || null,
      observacion: item.observacion || null,
    }));

    const evidencias = item.evidencias || [];
    for (const evidencia of evidencias) {
      let uploaded = null;
      try {
        uploaded = await uploadEvidenceToStorage(evidencia, inspeccion.id, createdItem.id);
      } catch (uploadError) {
        console.warn("No se pudo subir evidencia a Storage, se conserva URL/base64:", uploadError);
      }

      await insertRow("5s", "evidencias_5s", withEmpresa({
        item_id: createdItem.id,
        bucket: uploaded?.bucket || evidencia.bucket || "evidencias-5s",
        storage_path: uploaded?.storage_path || evidencia.storage_path || null,
        nombre_archivo: evidencia.nombre_archivo || evidencia.name || null,
        url: uploaded?.url || evidencia.url || evidencia.src || null,
        metadata: evidencia.metadata || null,
      }));
    }

    if (!Boolean(item.cumple)) {
      try {
        await crearPlanAccion5S({
          inspeccion_id: inspeccion.id,
          inspeccion_item_id: createdItem.id,
          bodega_id: payload.bodega_id || null,
          bodega: payload.bodega,
          responsable: payload.responsable || "Sin responsable",
          punto: item.punto || item.pregunta || "",
          hallazgo: item.observacion || `Punto no conforme: ${item.punto || item.pregunta || ""}`,
          accion: "Definir, ejecutar y evidenciar acción correctiva para cerrar el hallazgo 5S.",
          severidad: item.severidad || "Media",
          estado: "Pendiente",
          fecha_compromiso: addDaysISO(payload.fecha, 7),
        });
      } catch (planError) {
        console.warn("No se pudo crear el plan de acción automático:", planError);
      }
    }
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

export async function getInspeccionItems5S(inspeccionId) {
  if (supabaseEnabled) {
    const items = await selectRows("5s", "inspeccion_items_5s", {
      empresa_id: `eq.${empresaId}`,
      inspeccion_id: `eq.${inspeccionId}`,
      select: "*",
      order: "id.asc",
    });

    if (!items.length) return [];

    const evidencias = await selectRows("5s", "evidencias_5s", {
      empresa_id: `eq.${empresaId}`,
      item_id: `in.(${items.map((item) => item.id).join(",")})`,
      select: "*",
      order: "id.asc",
    });

    const evidenciasByItem = new Map();
    evidencias.forEach((evidencia) => {
      const key = String(evidencia.item_id);
      if (!evidenciasByItem.has(key)) evidenciasByItem.set(key, []);
      evidenciasByItem.get(key).push(evidencia);
    });

    return items.map((item) => ({
      ...item,
      evidencias: evidenciasByItem.get(String(item.id)) || [],
    }));
  }

  return apiFetch(`/api/5s/inspecciones/${inspeccionId}/items`);
}

export async function eliminarInspeccion5S(id) {
  if (!supabaseEnabled) {
    return apiFetch(`/api/5s/inspecciones/${id}`, { method: "DELETE" });
  }

  const items = await selectRows("5s", "inspeccion_items_5s", {
    empresa_id: `eq.${empresaId}`,
    inspeccion_id: `eq.${id}`,
    select: "id",
  });

  if (items.length) {
    const itemIds = items.map((item) => item.id);
    const evidencias = await selectRows("5s", "evidencias_5s", {
      empresa_id: `eq.${empresaId}`,
      item_id: `in.(${itemIds.join(",")})`,
      select: "id",
    });

    for (const evidencia of evidencias) {
      await deleteById("5s", "evidencias_5s", evidencia.id);
    }
  }

  const planes = await selectRows("5s", "planes_accion_5s", {
    empresa_id: `eq.${empresaId}`,
    inspeccion_id: `eq.${id}`,
    select: "id",
  }).catch(() => []);

  for (const plan of planes) {
    await deleteById("5s", "planes_accion_5s", plan.id);
  }

  const cronogramas = await selectRows("5s", "cronograma_5s", {
    empresa_id: `eq.${empresaId}`,
    inspeccion_id: `eq.${id}`,
    select: "id",
  }).catch(() => []);

  for (const cronograma of cronogramas) {
    await updateById("5s", "cronograma_5s", cronograma.id, {
      inspeccion_id: null,
      fecha_ejecucion: null,
      estado: "Planificada",
    });
  }

  for (const item of items) {
    await deleteById("5s", "inspeccion_items_5s", item.id);
  }

  return deleteById("5s", "inspecciones_5s", id);
}

export async function getDashboard5S() {
  if (!supabaseEnabled) return apiFetch("/api/5s/dashboard");

  const [bodegas, inspecciones, config, planes] = await Promise.all([
    getBodegas5S(),
    getInspecciones5S(),
    getConfig5S(),
    getPlanesAccion5S().catch(() => []),
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
    planes_accion: planes,
  };
}

export function getPlanesAccion5S(params = {}) {
  if (supabaseEnabled) {
    return selectRows("5s", "planes_accion_5s", {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "fecha_compromiso.asc",
      ...(params.estado ? { estado: `eq.${params.estado}` } : {}),
      ...(params.bodega ? { bodega: `eq.${params.bodega}` } : {}),
      ...(params.responsable ? { responsable: `eq.${params.responsable}` } : {}),
    });
  }

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== null && value !== "" && query.set(key, value));
  return apiFetch(`/api/5s/planes-accion${query.toString() ? `?${query}` : ""}`);
}

export function crearPlanAccion5S(payload) {
  if (supabaseEnabled) return insertRow("5s", "planes_accion_5s", withEmpresa(payload));
  return apiFetch("/api/5s/planes-accion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function editarPlanAccion5S(id, payload) {
  if (supabaseEnabled) return updateById("5s", "planes_accion_5s", id, payload);
  return apiFetch(`/api/5s/planes-accion/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export async function getUsuario5S(id) {
  if (!supabaseEnabled || !id) return null;
  const rows = await selectRows("public", "usuarios", {
    id: `eq.${id}`,
    select: "*",
    limit: "1",
  });
  return rows[0] || null;
}

export function editarUsuario5S(id, payload) {
  if (!supabaseEnabled || !id) return Promise.resolve(null);
  return updateById("public", "usuarios", id, payload);
}

function scoreLevelLabel(score) {
  const value = Number(score || 0);
  if (value >= 90) return "Óptimo";
  if (value >= 80) return "Atención";
  if (value > 0) return "Crítico";
  return "Sin auditoría";
}
