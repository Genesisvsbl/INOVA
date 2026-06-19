import {
  deleteById,
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
  updateById,
} from "./supabaseRest";

const HEADER_ALIASES = {
  codigo: ["codigo", "cod", "sku", "material", "codigo material", "codigo_material", "item"],
  descripcion: ["descripcion", "description", "texto breve material", "texto_breve", "texto breve", "nombre"],
  unidad: ["unidad", "und", "cantidad unidad"],
  unidad_medida: ["unidad medida", "unidad_medida", "um", "umb", "medida"],
  familia: ["familia", "family", "grupo"],
  vigencia_meses: ["vigencia meses", "vigencia_meses", "vigencia", "meses"],
  empaque: ["empaque", "packing", "embalaje"],
  acreedor: ["acreedor", "nit", "codigo proveedor", "codigo_proveedor", "proveedor codigo"],
  ubicacion: ["ubicacion", "ubicacion final", "ubicacion_final", "ubicacion completa"],
  ubicacion_base: ["ubicacion base", "ubicacion_base", "base"],
  posicion: ["posicion", "posiciones", "position"],
  zona: ["zona", "zone"],
  bodega: ["bodega", "warehouse"],
  familias: ["familias", "familia permitida", "familias permitidas"],
  reserva: ["reserva", "pedido", "documento reserva"],
  fecha_necesidad: ["fecha necesidad", "fecha de necesidad", "fecha_necesidad", "fecha necesidad entrega", "fecha requerida", "fecha despacho", "fecha entrega", "fecha de entrega", "fecha", "fechanecesidad", "necesidad"],
  cantidad: ["cantidad", "cant", "requerido", "cantidad requerida", "total requerido"],
};

function stripAccents(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(value) {
  return stripAccents(value).toLowerCase().replace(/[_\-./()#]+/g, " ").replace(/\s+/g, " ").trim();
}

function getImportValue(row, key) {
  const aliases = HEADER_ALIASES[key] || [key];
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    if (row[normalized] !== undefined && row[normalized] !== null && row[normalized] !== "") return row[normalized];
  }
  return "";
}

function excelDateToISO(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(value)));
    return date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const [, d, m, yRaw] = match;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return text.slice(0, 10) || null;
}

async function readSpreadsheetRows(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])))
    .filter((row) => Object.values(row).some((value) => String(value || "").trim()));
}

function importResult(inserted, skipped = 0) {
  return { mensaje: `Importacion completada: ${inserted} registros cargados${skipped ? `, ${skipped} omitidos` : ""}.`, inserted, skipped };
}

async function saveImportedRows(table, rows, keyField) {
  const saved = [];

  for (const row of rows) {
    const keyValue = row?.[keyField];
    const existing = keyValue
      ? await findOne(table, {
          empresa_id: `eq.${empresaId}`,
          [keyField]: `eq.${keyValue}`,
          select: "id",
        }).catch(() => null)
      : null;

    if (existing?.id) {
      const [updated] = await updateById(table === "usuarios" ? "public" : "wms", table, existing.id, row);
      saved.push(updated || { ...row, id: existing.id });
    } else {
      const created = await insertRow("wms", table, row);
      saved.push(...(Array.isArray(created) ? created : [created]));
    }
  }

  return saved;
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json();
  }

  return null;
}

function apiFetch(path, options = {}) {
  throw new Error(
    `Conexion legacy deshabilitada (${path}). WMS debe operar contra Supabase para conservar trazabilidad.`
  );
}

export { handle, apiFetch };

function compactObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== "")
  );
}

function normalizeText(value) {
  return String(value || "").trim().toUpperCase();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const CERTIFICADOS_CACHE_KEY = "wms_certificados_calidad_cache";

function readCertificadosCache() {
  try {
    const raw = localStorage.getItem(CERTIFICADOS_CACHE_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeCertificadosCache(rows) {
  localStorage.setItem(CERTIFICADOS_CACHE_KEY, JSON.stringify(rows || []));
}

function certificadoEstado(row) {
  if (row?.certificado_data_url || row?.certificado_nombre) return "COMPLETO";
  if (row?.vence_gestion_at && new Date(row.vence_gestion_at).getTime() < Date.now()) return "VENCIDO";
  return "PENDIENTE";
}

function add24HoursISO(date = new Date()) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function normalizeCertificadoRow(row) {
  const normalized = {
    ...row,
    empresa_id: row.empresa_id ?? empresaId,
    estado_certificado: certificadoEstado(row),
  };
  return normalized;
}

export async function guardarCertificadosCalidad(payload = {}) {
  const createdAt = payload.created_at || new Date().toISOString();
  const header = payload.header || {};
  const reciboDocumentoHtml = payload.recibo_documento_html || "";
  const rows = (payload.items || []).map((item, index) =>
    normalizeCertificadoRow({
      empresa_id: empresaId,
      fecha_recibo: item.fecha_recibo || header.fecha_recepcion || todayISO(),
      codigo_material: item.codigo_material || item.codigo || "",
      descripcion_material: item.descripcion_material || item.descripcion || "",
      unidad_medida: item.unidad_medida || item.um || "",
      lote_proveedor: item.lote_proveedor || "",
      fecha_fabricacion: item.fecha_fabricacion || null,
      fecha_vencimiento: item.fecha_vencimiento || null,
      cantidad: Number(item.cantidad ?? item.total ?? 0),
      proveedor: item.proveedor || header.proveedor || "",
      documento: item.documento || header.documento || "",
      orden_compra: item.orden_compra || header.orden_compra || "",
      recibo_serial: item.recibo_serial || header.serial || "",
      recibo_item: item.recibo_item || String(index + 1).padStart(2, "0"),
      certificado_nombre: item.certificado_nombre || "",
      certificado_tipo: item.certificado_tipo || "",
      certificado_data_url: item.certificado_data_url || "",
      recibo_documento_html: reciboDocumentoHtml,
      vence_gestion_at: item.vence_gestion_at || add24HoursISO(new Date(createdAt)),
      created_at: createdAt,
      updated_at: createdAt,
    })
  );

  if (!rows.length) return { saved: [], fallback: false };

  try {
    const saved = await insertRow("wms", "certificados_calidad", rows);
    return { saved: Array.isArray(saved) ? saved : [saved], fallback: false };
  } catch (error) {
    const current = readCertificadosCache();
    const localRows = rows.map((row) => ({
      ...row,
      id: row.id || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      origen_local: true,
    }));
    writeCertificadosCache([...localRows, ...current]);
    return { saved: localRows, fallback: true, error };
  }
}

export async function getCertificadosCalidad(params = {}) {
  try {
    const rows = await selectRows("wms", "certificados_calidad", {
      empresa_id: `eq.${empresaId}`,
      order: "created_at.desc",
      select: "*",
      ...params,
    });
    return (Array.isArray(rows) ? rows : []).map(normalizeCertificadoRow);
  } catch {
    return readCertificadosCache().map(normalizeCertificadoRow);
  }
}

export async function actualizarCertificadoCalidad(id, certificado = {}) {
  const updatedAt = new Date().toISOString();
  const payload = normalizeCertificadoRow({
    certificado_nombre: certificado.certificado_nombre || "",
    certificado_tipo: certificado.certificado_tipo || "",
    certificado_data_url: certificado.certificado_data_url || "",
    estado_certificado: "COMPLETO",
    updated_at: updatedAt,
  });

  if (String(id || "").startsWith("local-")) {
    const rows = readCertificadosCache();
    const next = rows.map((row) => (String(row.id) === String(id) ? { ...row, ...payload } : row));
    writeCertificadosCache(next);
    return next.find((row) => String(row.id) === String(id)) || payload;
  }

  try {
    const saved = await updateById("wms", "certificados_calidad", id, payload);
    return Array.isArray(saved) ? saved[0] : saved;
  } catch (error) {
    const rows = readCertificadosCache();
    const exists = rows.some((row) => String(row.id) === String(id));
    const next = exists
      ? rows.map((row) => (String(row.id) === String(id) ? { ...row, ...payload } : row))
      : [{ id: `local-${id || Date.now()}`, ...payload, origen_local: true }, ...rows];
    writeCertificadosCache(next);
    return next.find((row) => String(row.id) === String(id)) || next[0];
  }
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function stockKey(item) {
  return [
    normalizeText(item.codigo_material || item.sku),
    normalizeText(item.ubicacion),
    normalizeText(item.lote_almacen),
    normalizeText(item.lote_proveedor),
    String(item.fecha_vencimiento || ""),
  ].join("|");
}

function groupStock(rows) {
  const map = new Map();

  rows.forEach((item) => {
    const cantidad = toNumber(item.cantidad_r ?? item.cantidad);
    const estado = normalizeText(item.estado);
    const ubicacion = normalizeText(item.ubicacion);

    if (estado !== "ALMACENADO" || !ubicacion || ubicacion === "EN TRANSITO") return;

    const key = stockKey(item);
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        cantidad_disponible: 0,
      });
    }

    map.get(key).cantidad_disponible += cantidad;
  });

  return Array.from(map.values()).filter((item) => toNumber(item.cantidad_disponible) > 0);
}

async function getAllStockRows() {
  const rows = await getMovimientos();
  return groupStock(rows);
}

function classifyFulfillment(required, withdrawn) {
  const req = toNumber(required);
  const ret = toNumber(withdrawn);
  if (req <= 0 || ret <= 0) return "NO CUMPLIDA";
  if (ret >= req) return "CUMPLIDA";
  return "PARCIAL";
}

async function recalcReserva(reserva) {
  const detalles = await getDespachos({ reserva });
  const picks = await verPicking(reserva);
  const pickBySku = new Map();

  picks.forEach((pick) => {
    if (!pick.confirmado && !toNumber(pick.cantidad_confirmada)) return;
    const sku = normalizeText(pick.sku);
    pickBySku.set(sku, (pickBySku.get(sku) || 0) + toNumber(pick.cantidad_confirmada));
  });

  const totalRequeridoReserva = detalles.reduce((acc, row) => acc + toNumber(row.cantidad), 0);
  const totalRetiradoReserva = detalles.reduce(
    (acc, row) => acc + (pickBySku.get(normalizeText(row.sku)) || 0),
    0
  );
  const pctReserva =
    totalRequeridoReserva > 0 ? (totalRetiradoReserva / totalRequeridoReserva) * 100 : 0;
  const estadoReserva = classifyFulfillment(totalRequeridoReserva, totalRetiradoReserva);

  await Promise.all(
    detalles.map((row) => {
      const retirado = pickBySku.get(normalizeText(row.sku)) || 0;
      const requerido = toNumber(row.cantidad);
      const pctSku = requerido > 0 ? (retirado / requerido) * 100 : 0;
      const estadoSku = classifyFulfillment(requerido, retirado);
      return updateById("wms", "despacho_detalles", row.id, {
        cantidad_retirada: retirado,
        diferencia: Math.max(requerido - retirado, 0),
        lineas_usadas: picks.filter((p) => normalizeText(p.sku) === normalizeText(row.sku)).length,
        pct_cumplimiento_sku: pctSku,
        pct_cumplimiento_reserva: pctReserva,
        clasificacion_sku: estadoSku,
        clasificacion_final: estadoReserva,
        estado_operativo: estadoReserva,
      });
    })
  );

  return {
    reserva,
    total_requerido: totalRequeridoReserva,
    total_retirado: totalRetiradoReserva,
    pct_cumplimiento_reserva: Number(pctReserva.toFixed(2)),
    clasificacion_final: estadoReserva,
    lineas_picking: picks.length,
  };
}

async function findOne(table, params) {
  const rows = await selectRows("wms", table, { ...params, limit: "1" });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function resolveMaterialId(codigo) {
  const value = String(codigo || "").trim();
  if (!value) throw new Error("Material obligatorio.");
  const row = await findOne("materiales", {
    empresa_id: `eq.${empresaId}`,
    codigo: `eq.${value}`,
    select: "id,codigo",
  });
  if (!row) throw new Error(`No existe material ${value} en Supabase.`);
  return row.id;
}

async function resolveUbicacionId(codigo) {
  const value = String(codigo || "").trim();
  if (!value) return null;
  const row = await findOne("ubicaciones", {
    empresa_id: `eq.${empresaId}`,
    ubicacion: `eq.${value}`,
    select: "id,ubicacion",
  });
  if (!row) throw new Error(`No existe ubicacion ${value} en Supabase.`);
  return row.id;
}

function mapMovimientoRow(row) {
  const material = row.material || {};
  const ubicacion = row.ubicacion || {};
  const cantidad = Number(row.cantidad_r || 0);

  return {
    id: row.id,
    fecha: row.fecha,
    tipo: cantidad >= 0 ? "ENTRADA" : "SALIDA",
    usuario: row.usuario,
    documento: row.documento,
    codigo_cita: row.codigo_cita,
    proveedor: row.proveedor,
    remesa: row.remesa,
    orden_compra: row.orden_compra,
    sku: material.codigo || row.codigo_material || "",
    um: row.um || material.unidad_medida || "",
    umb: row.umb,
    codigo_material: material.codigo || row.codigo_material || "",
    descripcion_material: material.descripcion || "",
    unidad_medida: material.unidad_medida || row.um || "",
    familia: material.familia || "",
    estado: row.estado,
    ubicacion: ubicacion.ubicacion || "EN TRANSITO",
    ubicacion_base: ubicacion.ubicacion_base || null,
    posicion: ubicacion.posicion || null,
    zona: ubicacion.zona || null,
    familias: ubicacion.familias || null,
    bodega: ubicacion.bodega || null,
    lote_almacen: row.lote_almacen,
    lote_proveedor: row.lote_proveedor,
    fecha_fabricacion: row.fecha_fabricacion,
    fecha_vencimiento: row.fecha_vencimiento,
    cantidad,
    cantidad_r: cantidad,
  };
}

async function buildMovimientoInsert(payload) {
  const materialId = await resolveMaterialId(payload.codigo_material || payload.sku);
  const ubicacionId = await resolveUbicacionId(payload.codigo_ubicacion || payload.ubicacion);

  return compactObject({
    empresa_id: empresaId,
    fecha: payload.fecha,
    usuario: payload.usuario,
    documento: payload.documento,
    codigo_cita: payload.codigo_cita,
    proveedor: payload.proveedor,
    remesa: payload.remesa,
    orden_compra: payload.orden_compra,
    um: payload.um,
    umb: payload.umb,
    material_id: materialId,
    ubicacion_id: ubicacionId,
    estado: payload.estado || (ubicacionId ? "ALMACENADO" : "EN_TRANSITO"),
    lote_almacen: payload.lote_almacen,
    lote_proveedor: payload.lote_proveedor,
    fecha_fabricacion: payload.fecha_fabricacion || null,
    fecha_vencimiento: payload.fecha_vencimiento || null,
    cantidad_r: Number(payload.cantidad_r ?? payload.cantidad ?? 0),
  });
}

async function buildRotuloInsert(payload) {
  const sku = String(payload.sku || payload.codigo_material || "").trim();
  const material = sku
    ? await findOne("materiales", {
        empresa_id: `eq.${empresaId}`,
        codigo: `eq.${sku}`,
        select: "id,codigo",
      })
    : null;

  return compactObject({
    ...payload,
    empresa_id: empresaId,
    material_id: material?.id || null,
    sku,
    fecha_recepcion: payload.fecha_recepcion || new Date().toISOString().slice(0, 10),
  });
}

export function getMateriales(search = "") {
  if (supabaseEnabled) {
    const params = {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "codigo.asc",
      limit: "1000",
    };
    if (search) params.or = `(codigo.ilike.*${search}*,descripcion.ilike.*${search}*)`;
    return selectRows("wms", "materiales", params);
  }

  return apiFetch("/materiales");
}

export function crearMaterial(payload) {
  if (supabaseEnabled) return insertRow("wms", "materiales", { ...payload, empresa_id: empresaId });
  return apiFetch("/materiales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function editarMaterial(id, payload) {
  if (supabaseEnabled) return updateById("wms", "materiales", id, payload);
  return apiFetch(`/materiales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function eliminarMaterial(id) {
  if (supabaseEnabled) return deleteById("wms", "materiales", id);
  return apiFetch(`/materiales/${id}`, {
    method: "DELETE",
  });
}

export function importarMaterialesExcel(file) {
  if (!supabaseEnabled) return Promise.reject(new Error("Supabase no esta configurado."));
  return readSpreadsheetRows(file).then((rows) => {
    const mapped = rows
      .map((row) => {
        const codigo = String(getImportValue(row, "codigo") || "").trim();
        const descripcion = String(getImportValue(row, "descripcion") || "").trim();
        if (!codigo || !descripcion) return null;
        return compactObject({
          empresa_id: empresaId,
          codigo,
          descripcion,
          unidad: toNumber(getImportValue(row, "unidad")) || 1,
          unidad_medida: String(getImportValue(row, "unidad_medida") || "KG").trim(),
          familia: String(getImportValue(row, "familia") || "").trim(),
          vigencia_meses: Number(getImportValue(row, "vigencia_meses") || 0) || null,
          empaque: String(getImportValue(row, "empaque") || "").trim(),
        });
      })
      .filter(Boolean);

    if (!mapped.length) throw new Error("El archivo no tiene materiales validos. Requiere codigo y descripcion.");
    return saveImportedRows("materiales", mapped, "codigo").then(() => importResult(mapped.length, rows.length - mapped.length));
  });
}

export function crearMovimiento(payload) {
  if (supabaseEnabled) {
    return buildMovimientoInsert(payload).then((row) => insertRow("wms", "movimientos", row));
  }

  return Promise.reject(new Error("Supabase no esta configurado para guardar movimientos WMS."));
}

export function crearMovimientosBulk(payload) {
  if (supabaseEnabled) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return Promise.all(items.map(buildMovimientoInsert)).then((rows) =>
      insertRow("wms", "movimientos", rows)
    );
  }

  return Promise.reject(new Error("Supabase no esta configurado para guardar movimientos WMS."));
}

export function getMovimientos() {
  if (supabaseEnabled) {
    return selectRows("wms", "movimientos", {
      empresa_id: `eq.${empresaId}`,
      select: "*,material:materiales(codigo,descripcion,unidad_medida,familia),ubicacion:ubicaciones(ubicacion,ubicacion_base,posicion,zona,familias,bodega)",
      order: "fecha.desc",
      limit: "3000",
    }).then((rows) => rows.map(mapMovimientoRow));
  }

  return Promise.resolve([]);
}


export function getMovimientosLayoutStock() {
  if (supabaseEnabled) {
    return selectRows("wms", "movimientos", {
      empresa_id: `eq.${empresaId}`,
      estado: "eq.ALMACENADO",
      select: "id,estado,cantidad_r,ubicacion_id,proveedor,lote_almacen,lote_proveedor,fecha_vencimiento,material:materiales(codigo,descripcion,unidad_medida,familia),ubicacion:ubicaciones(ubicacion,ubicacion_base,posicion,zona,familias,bodega)",
      order: "id.desc",
      limit: "5000",
    }).then((rows) =>
      (rows || []).map((row) => {
        const cantidad = Number(row.cantidad_r ?? 0);
        const ubicacion = row.ubicacion?.ubicacion || "";
        const material = row.material || {};
        return {
          id: row.id,
          tipo: cantidad >= 0 ? "ENTRADA" : "SALIDA",
          estado: row.estado,
          ubicacion,
          ubicacion_final: ubicacion,
          ubicacion_codigo: ubicacion,
          ubicacion_id: row.ubicacion_id,
          ubicacion_final_id: row.ubicacion_id,
          codigo_material: material.codigo || "",
          descripcion_material: material.descripcion || "",
          unidad_medida: material.unidad_medida || "",
          familia: material.familia || "",
          proveedor: row.proveedor || "",
          lote_almacen: row.lote_almacen || "",
          lote_proveedor: row.lote_proveedor || "",
          fecha_vencimiento: row.fecha_vencimiento || "",
          cantidad,
          cantidad_r: cantidad,
        };
      })
    );
  }

  return Promise.resolve([]);
}
export function getEnTransito(q = "") {
  if (supabaseEnabled) {
    const params = {
      empresa_id: `eq.${empresaId}`,
      estado: "eq.EN_TRANSITO",
      select: "*,material:materiales(codigo,descripcion,unidad_medida,familia)",
      order: "fecha.desc",
      limit: "3000",
    };
    if (q) params.or = `(documento.ilike.*${q}*,codigo_cita.ilike.*${q}*,lote_almacen.ilike.*${q}*,lote_proveedor.ilike.*${q}*)`;
    return selectRows("wms", "movimientos", params).then((rows) => rows.map(mapMovimientoRow));
  }

  return Promise.resolve([]);
}

export function asignarUbicacionDesdeTransito(movimientoId, codigoUbicacion) {
  if (supabaseEnabled) {
    return resolveUbicacionId(codigoUbicacion).then((ubicacionId) =>
      updateById("wms", "movimientos", movimientoId, {
        ubicacion_id: ubicacionId,
        estado: "ALMACENADO",
      })
    );
  }

  return Promise.reject(new Error("Supabase no esta configurado para actualizar transito WMS."));
}

export function getStock(codigo) {
  const sku = normalizeText(codigo);
  if (!sku) return Promise.reject(new Error("Codigo de material obligatorio."));

  return Promise.all([getMateriales(sku), getMovimientos()]).then(([materiales, movimientos]) => {
    const material =
      (materiales || []).find((m) => normalizeText(m.codigo) === sku) ||
      (materiales || [])[0] ||
      {};
    const rows = movimientos.filter((m) => normalizeText(m.codigo_material || m.sku) === sku);
    const almacenado = rows
      .filter((m) => normalizeText(m.estado) === "ALMACENADO")
      .reduce((acc, m) => acc + toNumber(m.cantidad_r ?? m.cantidad), 0);
    const transito = rows
      .filter((m) => normalizeText(m.estado) === "EN_TRANSITO")
      .reduce((acc, m) => acc + toNumber(m.cantidad_r ?? m.cantidad), 0);

    return {
      codigo: material.codigo || codigo,
      descripcion: material.descripcion || "",
      unidad_medida: material.unidad_medida || "",
      familia: material.familia || "",
      stock_actual: almacenado + transito,
      stock_almacenado: almacenado,
      stock_en_transito: transito,
      lotes: groupStock(rows),
    };
  });
}

export function getProveedores(search = "") {
  if (supabaseEnabled) {
    const params = {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "nombre.asc",
      limit: "3000",
    };
    if (search) params.or = `(nombre.ilike.*${search}*,acreedor.ilike.*${search}*)`;
    return selectRows("wms", "proveedores", params);
  }

  return apiFetch("/proveedores");
}

export function crearProveedor(payload) {
  if (supabaseEnabled) return insertRow("wms", "proveedores", { ...payload, empresa_id: empresaId });
  return apiFetch("/proveedores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function editarProveedor(id, payload) {
  if (supabaseEnabled) return updateById("wms", "proveedores", id, payload);
  return apiFetch(`/proveedores/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function eliminarProveedor(id) {
  if (supabaseEnabled) return deleteById("wms", "proveedores", id);
  return apiFetch(`/proveedores/${id}`, {
    method: "DELETE",
  });
}

export function importarProveedoresExcel(file) {
  if (!supabaseEnabled) return Promise.reject(new Error("Supabase no esta configurado."));
  return readSpreadsheetRows(file).then((rows) => {
    const mapped = rows
      .map((row) => {
        const nombre = String(getImportValue(row, "descripcion") || getImportValue(row, "nombre") || "").trim();
        const acreedor = String(getImportValue(row, "acreedor") || nombre).trim();
        if (!nombre) return null;
        return compactObject({ empresa_id: empresaId, nombre, acreedor });
      })
      .filter(Boolean);

    if (!mapped.length) throw new Error("El archivo no tiene proveedores validos. Requiere nombre.");
    return saveImportedRows("proveedores", mapped, "acreedor").then(() => importResult(mapped.length, rows.length - mapped.length));
  });
}

export function getUbicaciones(search = "") {
  if (supabaseEnabled) {
    if (!search) {
      const loadAll = async () => {
        const all = [];
        let lastId = 0;
        const pageSize = 1000;

        while (true) {
          const rows = await selectRows("wms", "ubicaciones", {
            empresa_id: `eq.${empresaId}`,
            id: `gt.${lastId}`,
            select: "*",
            order: "id.asc",
            limit: String(pageSize),
          });

          if (!Array.isArray(rows) || rows.length === 0) break;
          all.push(...rows);
          lastId = Number(rows[rows.length - 1]?.id || lastId);
          if (rows.length < pageSize) break;
        }

        return all.sort((a, b) => String(a.ubicacion || "").localeCompare(String(b.ubicacion || "")));
      };

      return loadAll();
    }

    const params = {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "ubicacion.asc",
      limit: "1000",
    };
    params.or = `(ubicacion.ilike.*${search}*,ubicacion_base.ilike.*${search}*,zona.ilike.*${search}*,bodega.ilike.*${search}*)`;
    return selectRows("wms", "ubicaciones", params);
  }

  return apiFetch("/ubicaciones");
}

export function crearUbicacion(payload) {
  if (supabaseEnabled) return insertRow("wms", "ubicaciones", { ...payload, empresa_id: empresaId });
  return apiFetch("/ubicaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function editarUbicacion(id, payload) {
  if (supabaseEnabled) return updateById("wms", "ubicaciones", id, payload);
  return apiFetch(`/ubicaciones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function eliminarUbicacion(id) {
  if (supabaseEnabled) return deleteById("wms", "ubicaciones", id);
  return apiFetch(`/ubicaciones/${id}`, {
    method: "DELETE",
  });
}

export function importarUbicacionesExcel(file) {
  if (!supabaseEnabled) return Promise.reject(new Error("Supabase no esta configurado."));
  return readSpreadsheetRows(file).then((rows) => {
    const mapped = rows
      .map((row) => {
        const ubicacionBase = String(getImportValue(row, "ubicacion_base") || "").trim();
        const posicion = String(getImportValue(row, "posicion") || "").trim();
        const ubicacion = String(getImportValue(row, "ubicacion") || `${ubicacionBase}${posicion}`).trim();
        if (!ubicacion) return null;
        return compactObject({
          empresa_id: empresaId,
          ubicacion,
          ubicacion_base: ubicacionBase || null,
          posicion: posicion || null,
          zona: String(getImportValue(row, "zona") || "").trim(),
          familias: String(getImportValue(row, "familias") || "").trim(),
          bodega: String(getImportValue(row, "bodega") || "").trim(),
        });
      })
      .filter(Boolean);

    if (!mapped.length) throw new Error("El archivo no tiene ubicaciones validas.");
    return saveImportedRows("ubicaciones", mapped, "ubicacion").then(() => importResult(mapped.length, rows.length - mapped.length));
  });
}

export function getMotor() {
  if (supabaseEnabled) return getMovimientos();
  return Promise.resolve([]);
}

export function getRotulos(params = {}) {
  if (supabaseEnabled) {
    const query = {
      empresa_id: `eq.${empresaId}`,
      select: "*",
      order: "id.desc",
      limit: params.limit || "2000",
    };
    if (params.codigo_cita) query.codigo_cita = `eq.${params.codigo_cita}`;
    if (params.impresion) query.impresion = `eq.${params.impresion}`;
    if (params.q) {
      const q = params.q;
      query.or = `(codigo_cita.ilike.*${q}*,impresion.ilike.*${q}*,documento.ilike.*${q}*,sku.ilike.*${q}*,texto_breve.ilike.*${q}*,lote_almacen.ilike.*${q}*,lote_proveedor.ilike.*${q}*,remesa.ilike.*${q}*,orden_compra.ilike.*${q}*,proveedor.ilike.*${q}*,auxiliar.ilike.*${q}*)`;
    }
    return selectRows("wms", "rotulos", query);
  }

  return Promise.resolve([]);
}

export function crearRotulo(payload) {
  if (supabaseEnabled) {
    return buildRotuloInsert(payload).then((row) => insertRow("wms", "rotulos", row));
  }

  return Promise.reject(new Error("Supabase no esta configurado para guardar rotulos WMS."));
}

export function crearRotulosBulk(payload) {
  if (supabaseEnabled) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return Promise.all(items.map(buildRotuloInsert)).then((rows) =>
      insertRow("wms", "rotulos", rows).then((created) => ({
        mensaje: "Rotulos guardados",
        total_guardados: created?.length || rows.length,
        ids: (created || []).map((row) => row.id),
      }))
    );
  }

  return Promise.reject(new Error("Supabase no esta configurado para guardar rotulos WMS."));
}

export function eliminarRotulo(id) {
  if (supabaseEnabled) return deleteById("wms", "rotulos", id);

  return Promise.reject(new Error("Supabase no esta configurado para eliminar rotulos WMS."));
}

export function imprimirRotulo(rotuloId, copias = 1) {
  return Promise.reject(new Error("Impresion por backend legacy deshabilitada. Usa la vista/export frontend."));
}

export function importarInventarioInicial(file) {
  if (!supabaseEnabled) return Promise.reject(new Error("Supabase no esta configurado."));
  return readSpreadsheetRows(file).then(async (rows) => {
    const items = rows.map((row) => ({
      usuario: "IMPORTACION",
      documento: "INVENTARIO_INICIAL",
      codigo_material: getImportValue(row, "codigo"),
      ubicacion: getImportValue(row, "ubicacion"),
      estado: "ALMACENADO",
      cantidad_r: toNumber(getImportValue(row, "cantidad")),
    })).filter((row) => row.codigo_material && row.ubicacion && row.cantidad_r);
    if (!items.length) throw new Error("El archivo no tiene inventario valido. Requiere codigo, ubicacion y cantidad.");
    await crearMovimientosBulk({ items });
    return importResult(items.length, rows.length - items.length);
  });
}

export function importarDespachos(file) {
  if (!supabaseEnabled) return Promise.reject(new Error("Supabase no esta configurado."));
  return readSpreadsheetRows(file).then(async (rows) => {
    const cargaRows = await insertRow("wms", "despacho_cargas", {
      empresa_id: empresaId,
      archivo_nombre: file?.name || "despachos.xlsx",
    });
    const carga = Array.isArray(cargaRows) ? cargaRows[0] : cargaRows;
    const materiales = await getMateriales();
    const materialByCodigo = new Map(materiales.map((m) => [normalizeText(m.codigo), m]));
    const mapped = rows
      .map((row) => {
        const reserva = String(getImportValue(row, "reserva") || "").trim();
        const sku = String(getImportValue(row, "codigo") || "").trim();
        const cantidad = toNumber(getImportValue(row, "cantidad"));
        if (!reserva || !sku || !cantidad) return null;
        const material = materialByCodigo.get(normalizeText(sku));
        return compactObject({
          empresa_id: empresaId,
          carga_id: carga?.id,
          material_id: material?.id || null,
          fecha_necesidad: excelDateToISO(getImportValue(row, "fecha_necesidad")),
          reserva,
          sku,
          texto_breve: String(getImportValue(row, "descripcion") || material?.descripcion || "").trim(),
          cantidad,
          cantidad_retirada: 0,
          diferencia: cantidad,
          lineas_usadas: 0,
          pct_cumplimiento_sku: 0,
          pct_cumplimiento_reserva: 0,
          clasificacion_sku: "NO CUMPLIDA",
          clasificacion_final: "NO CUMPLIDA",
          estado_operativo: "ABIERTA",
          cerrada: false,
        });
      })
      .filter(Boolean);

    if (!mapped.length) throw new Error("El archivo no tiene reservas validas. Requiere reserva, SKU/codigo y cantidad.");

    const reservas = Array.from(new Set(mapped.map((row) => row.reserva).filter(Boolean)));
    await Promise.all(
      reservas.map(async (reserva) => {
        const [existentes, picks] = await Promise.all([
          getDespachos({ reserva }).catch(() => []),
          verPicking(reserva).catch(() => []),
        ]);
        await Promise.all((picks || []).map((row) => deleteById("wms", "picking_detalle", row.id)));
        await Promise.all((existentes || []).map((row) => deleteById("wms", "despacho_detalles", row.id)));
      })
    );

    await insertRow("wms", "despacho_detalles", mapped);
    return { ...importResult(mapped.length, rows.length - mapped.length), reservas };
  });
}

export async function crearReservaAdicionalDespacho(payload = {}) {
  if (!supabaseEnabled) throw new Error("Supabase no esta configurado.");

  const reserva = String(payload.reserva || "").trim();
  const sku = String(payload.sku || "").trim();
  const cantidad = toNumber(payload.cantidad);
  if (!reserva) throw new Error("Numero de reserva obligatorio.");
  if (!sku) throw new Error("SKU obligatorio.");
  if (cantidad <= 0) throw new Error("Cantidad requerida debe ser mayor a cero.");

  const material =
    (await findOne("materiales", {
      empresa_id: `eq.${empresaId}`,
      codigo: `eq.${sku}`,
      select: "*",
    }).catch(() => null)) || null;

  const cargaRows = await insertRow("wms", "despacho_cargas", {
    empresa_id: empresaId,
    archivo_nombre: `reserva_adicional_${reserva}.manual`,
  });
  const carga = Array.isArray(cargaRows) ? cargaRows[0] : cargaRows;

  const baseRow = compactObject({
    empresa_id: empresaId,
    carga_id: carga?.id,
    material_id: material?.id || null,
    fecha_necesidad: payload.fecha_necesidad || todayISO(),
    reserva,
    sku,
    texto_breve: String(payload.texto_breve || material?.descripcion || "Reserva adicional").trim(),
    cantidad,
    cantidad_retirada: 0,
    diferencia: cantidad,
    lineas_usadas: 0,
    pct_cumplimiento_sku: 0,
    pct_cumplimiento_reserva: 0,
    clasificacion_sku: "NO CUMPLIDA",
    clasificacion_final: "NO CUMPLIDA",
    estado_operativo: "ABIERTA",
    cerrada: false,
  });

  try {
    const saved = await insertRow("wms", "despacho_detalles", {
      ...baseRow,
      origen: "ADICIONAL",
      observacion: "Reserva adicional creada manualmente desde despacho.",
    });
    return Array.isArray(saved) ? saved[0] : saved;
  } catch (error) {
    const message = String(error?.message || error || "");
    if (!/origen|observacion|column|schema cache/i.test(message)) throw error;
    const saved = await insertRow("wms", "despacho_detalles", baseRow);
    return Array.isArray(saved) ? saved[0] : saved;
  }
}

export function getDespachos(params = {}) {
  const query = {
    empresa_id: `eq.${empresaId}`,
    select: "*",
    order: "reserva.asc,sku.asc,id.asc",
    limit: params.limit || "5000",
  };
  if (params.reserva) query.reserva = `eq.${params.reserva}`;
  if (params.carga_id) query.carga_id = `eq.${params.carga_id}`;
  return selectRows("wms", "despacho_detalles", query);
}

export function generarPicking(reserva) {
  const reservaValue = String(reserva || "").trim();
  if (!reservaValue) return Promise.reject(new Error("Reserva obligatoria."));

  return Promise.all([
    getDespachos({ reserva: reservaValue }),
    verPicking(reservaValue),
    getAllStockRows(),
  ]).then(async ([detalles, picksActuales, stockRows]) => {
    const pendientes = (detalles || []).filter((d) => !d.cerrada);
    if (!pendientes.length) throw new Error(`No hay despacho cargado para la reserva ${reservaValue}.`);

    await Promise.all(
      (picksActuales || [])
        .filter((p) => !p.confirmado && !toNumber(p.cantidad_confirmada))
        .map((p) => deleteById("wms", "picking_detalle", p.id))
    );

    const nuevos = [];
    pendientes.forEach((detalle) => {
      const sku = normalizeText(detalle.sku);
      const yaConfirmado = (picksActuales || [])
        .filter((p) => p.confirmado && normalizeText(p.sku) === sku)
        .reduce((acc, p) => acc + toNumber(p.cantidad_confirmada), 0);
      let restante = Math.max(toNumber(detalle.cantidad) - yaConfirmado, 0);
      if (restante <= 0) return;

      const disponibles = stockRows
        .filter((s) => normalizeText(s.codigo_material || s.sku) === sku)
        .filter((s) => !s.fecha_vencimiento || String(s.fecha_vencimiento).slice(0, 10) >= todayISO())
        .sort((a, b) =>
          String(a.fecha_vencimiento || "9999-99-99").localeCompare(
            String(b.fecha_vencimiento || "9999-99-99")
          )
        );

      disponibles.forEach((stock) => {
        if (restante <= 0) return;
        const sugerida = Math.min(restante, toNumber(stock.cantidad_disponible));
        if (sugerida <= 0) return;
        nuevos.push({
          empresa_id: empresaId,
          reserva: reservaValue,
          sku: detalle.sku,
          texto_breve: detalle.texto_breve,
          cantidad_requerida: toNumber(detalle.cantidad),
          cantidad_sugerida: sugerida,
          cantidad_confirmada: 0,
          ubicacion: stock.ubicacion,
          lote_almacen: stock.lote_almacen,
          lote_proveedor: stock.lote_proveedor,
          fecha_vencimiento: stock.fecha_vencimiento || null,
          impreso: false,
          confirmado: false,
          despacho_detalle_id: detalle.id,
        });
        restante -= sugerida;
      });
    });

    if (nuevos.length) await insertRow("wms", "picking_detalle", nuevos);
    return recalcReserva(reservaValue);
  });
}

export function verPicking(reserva) {
  const reservaValue = String(reserva || "").trim();
  if (!reservaValue) return Promise.resolve([]);
  return selectRows("wms", "picking_detalle", {
    empresa_id: `eq.${empresaId}`,
    reserva: `eq.${reservaValue}`,
    select: "*",
    order: "confirmado.asc,fecha_vencimiento.asc,id.asc",
    limit: "5000",
  });
}

export function confirmarPicking(reserva, payload) {
  const reservaValue = String(reserva || "").trim();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const usuario = payload?.usuario || "DESPACHO";
  const documento = payload?.documento || reservaValue;

  return Promise.all(
    items.map(async (item) => {
      const cantidad = toNumber(item.cantidad_confirmada ?? item.cantidad ?? item.cantidad_retirada);
      if (cantidad <= 0) return null;

      const pick = item.id ? (await findOne("picking_detalle", {
        empresa_id: `eq.${empresaId}`,
        id: `eq.${item.id}`,
        select: "*",
      })) : item;

      const ubicacionTomada =
        item.ubicacion_alternativa || item.ubicacion_tomada || pick?.ubicacion_alternativa || pick?.ubicacion;
      const loteAlmacen = item.lote_almacen_alternativo || item.lote_almacen || pick?.lote_almacen;
      const loteProveedor = item.lote_proveedor_alternativo || item.lote_proveedor || pick?.lote_proveedor;
      const fechaVencimiento =
        item.fecha_vencimiento_alternativa || item.fecha_vencimiento || pick?.fecha_vencimiento;

      await updateById("wms", "picking_detalle", pick.id, {
        cantidad_confirmada: cantidad,
        confirmado: true,
        impreso: true,
        motivo_rotacion: item.motivo_rotacion || pick?.motivo_rotacion || null,
        ubicacion_alternativa: item.ubicacion_alternativa || pick?.ubicacion_alternativa || null,
        lote_almacen_alternativo: item.lote_almacen_alternativo || pick?.lote_almacen_alternativo || null,
        lote_proveedor_alternativo: item.lote_proveedor_alternativo || pick?.lote_proveedor_alternativo || null,
        fecha_vencimiento_alternativa:
          item.fecha_vencimiento_alternativa || pick?.fecha_vencimiento_alternativa || null,
      });

      await crearMovimiento({
        fecha: new Date().toISOString(),
        usuario,
        documento,
        codigo_material: pick.sku,
        ubicacion: ubicacionTomada,
        estado: "ALMACENADO",
        lote_almacen: loteAlmacen,
        lote_proveedor: loteProveedor,
        fecha_vencimiento: fechaVencimiento,
        cantidad_r: -Math.abs(cantidad),
      });

      return pick.id;
    })
  ).then(() => recalcReserva(reservaValue));
}

export function marcarPickingImpreso(reserva) {
  return verPicking(reserva).then((rows) =>
    Promise.all(rows.map((row) => updateById("wms", "picking_detalle", row.id, { impreso: true })))
  );
}

export function eliminarReserva(reserva) {
  const reservaValue = String(reserva || "").trim();
  return Promise.all([getDespachos({ reserva: reservaValue }), verPicking(reservaValue)]).then(
    ([detalles, picks]) =>
      Promise.all([
        ...detalles.map((row) => deleteById("wms", "despacho_detalles", row.id)),
        ...picks.map((row) => deleteById("wms", "picking_detalle", row.id)),
      ])
  );
}

export function getMotorPorUbicacion(ubicacionCodigo) {
  const ubicacion = normalizeText(ubicacionCodigo);
  if (!ubicacion) return Promise.reject(new Error("Ubicacion obligatoria."));

  return getAllStockRows().then(async (stockRows) => {
    const ubicInfo = await findOne("ubicaciones", {
      empresa_id: `eq.${empresaId}`,
      ubicacion: `eq.${ubicacion}`,
      select: "*",
    });
    const items = stockRows.filter((row) => normalizeText(row.ubicacion) === ubicacion);

    return {
      ...(ubicInfo || {}),
      ubicacion,
      total_lineas: items.length,
      items,
    };
  });
}

export function sugerirUbicaciones(payload = {}) {
  const base = normalizeText(payload.ubicacion_base || payload.base || payload.ubicacion);
  const cantidad = Math.max(1, Number(payload.cantidad_pallets || payload.cantidad || 1));
  const tipoMaterial = normalizeText(stripAccents(payload.tipo_material || payload.material_tipo || "").toLowerCase());
  const usaZonasLataAzucar = tipoMaterial === "lata" || tipoMaterial === "azucar" || base.startsWith("400") || base.startsWith("600");
  const usaZonaPreforma = tipoMaterial === "preforma" || base.startsWith("200");
  const zonasLataAzucar = ["400", "600"];

  const parsePosicion = (value) => {
    const raw = String(value || "");
    const [pasillo = "", columna = ""] = raw.split("'");
    return {
      pasilloNum: Number(pasillo.replace(/\D/g, "")) || 0,
      columnaNum: Number(columna.replace(/\D/g, "")) || 0,
      raw,
    };
  };

  const baseNumero = (item) => String(item?.ubicacion_base || item?.ubicacion || "").replace(/\D/g, "");
  const estaEnZonaLataAzucar = (u) => {
    const baseValue = normalizeText(u.ubicacion_base || "");
    const ubicacionValue = normalizeText(u.ubicacion || "");
    const zonaValue = normalizeText(u.zona || "");
    return zonasLataAzucar.some(
      (zona) => baseValue.startsWith(zona) || ubicacionValue.startsWith(zona) || zonaValue.includes(zona)
    );
  };

  const coincideBase = (u) => {
    if (!base) return true;
    const baseValue = normalizeText(u.ubicacion_base || "");
    const ubicacionValue = normalizeText(u.ubicacion || "");
    return baseValue.startsWith(base) || ubicacionValue.startsWith(base);
  };

  const sortUbicaciones = (a, b) => {
    const pa = parsePosicion(a.posicion || a.ubicacion);
    const pb = parsePosicion(b.posicion || b.ubicacion);
    const baseA = Number(baseNumero(a)) || 0;
    const baseB = Number(baseNumero(b)) || 0;

    if (usaZonasLataAzucar) {
      return (
        pb.pasilloNum - pa.pasilloNum ||
        pb.columnaNum - pa.columnaNum ||
        baseB - baseA ||
        String(a.ubicacion || "").localeCompare(String(b.ubicacion || ""))
      );
    }

    if (usaZonaPreforma) {
      return (
        baseA - baseB ||
        pa.pasilloNum - pb.pasilloNum ||
        pa.columnaNum - pb.columnaNum ||
        String(a.ubicacion || "").localeCompare(String(b.ubicacion || ""))
      );
    }

    return (
      pa.pasilloNum - pb.pasilloNum ||
      pa.columnaNum - pb.columnaNum ||
      baseA - baseB ||
      String(a.ubicacion || "").localeCompare(String(b.ubicacion || ""))
    );
  };

  return Promise.all([getUbicaciones(), getAllStockRows()]).then(([ubicaciones, stockRows]) => {
    const excluirUbicaciones = Array.isArray(payload.excluir_ubicaciones)
      ? payload.excluir_ubicaciones
      : Array.isArray(payload.ubicaciones_ocupadas)
      ? payload.ubicaciones_ocupadas
      : [];
    const ocupadas = new Set([
      ...stockRows.map((row) => normalizeText(row.ubicacion)),
      ...excluirUbicaciones.map((ubicacion) => normalizeText(ubicacion)),
    ].filter(Boolean));
    const libres = (ubicaciones || []).filter((u) => !ocupadas.has(normalizeText(u.ubicacion)));
    const candidatasBase = libres.filter(coincideBase);
    const candidatasZona = usaZonasLataAzucar ? candidatasBase.filter(estaEnZonaLataAzucar) : candidatasBase;
    const candidatasFinales = usaZonasLataAzucar && candidatasZona.length === 0
      ? libres.filter(estaEnZonaLataAzucar)
      : candidatasZona;

    const candidatas = candidatasFinales
      .sort(sortUbicaciones)
      .slice(0, cantidad)
      .map((u) => ({
        ...u,
        disponible: true,
      }));

    return { ubicaciones: candidatas, sugerencias: candidatas };
  });
}
export function registrarAjusteInterno(payload) {
  const tipo = normalizeText(payload.tipo || "TRASLADO");
  const cantidad = Math.abs(toNumber(payload.cantidad));
  if (!cantidad) return Promise.reject(new Error("Cantidad invalida."));

  const comun = {
    fecha: new Date().toISOString(),
    usuario: payload.usuario,
    documento: payload.motivo || tipo,
    codigo_material: payload.codigo_material,
    lote_almacen: payload.lote_almacen,
    lote_proveedor: payload.lote_proveedor,
    fecha_vencimiento: payload.fecha_vencimiento,
  };

  if (tipo === "TRASLADO") {
    return crearMovimientosBulk({
      items: [
        { ...comun, ubicacion: payload.ubicacion_origen, estado: "ALMACENADO", cantidad_r: -cantidad },
        { ...comun, ubicacion: payload.ubicacion_destino, estado: "ALMACENADO", cantidad_r: cantidad },
      ],
    }).then(() => ({ mensaje: "Traslado registrado en Supabase" }));
  }

  const sign = tipo === "AJUSTE_POSITIVO" ? 1 : -1;
  return crearMovimiento({
    ...comun,
    ubicacion: payload.ubicacion_origen,
    estado: "ALMACENADO",
    cantidad_r: sign * cantidad,
  }).then(() => ({ mensaje: "Ajuste registrado en Supabase" }));
}

function buildInventarioCriterio(payload) {
  if (payload.tipo_conteo === "zona") return `ZONA:${payload.zona || ""}`;
  if (payload.tipo_conteo === "familia") return `FAMILIA:${payload.familia || ""}`;
  return `MATERIAL:${payload.codigo_material || ""}`;
}

function filterInventarioStock(stockRows, payload) {
  if (payload.tipo_conteo === "zona") {
    return stockRows.filter((row) => normalizeText(row.zona) === normalizeText(payload.zona));
  }
  if (payload.tipo_conteo === "familia") {
    return stockRows.filter((row) => normalizeText(row.familia) === normalizeText(payload.familia));
  }
  return stockRows.filter(
    (row) => normalizeText(row.codigo_material || row.sku) === normalizeText(payload.codigo_material)
  );
}

export function crearTareaInventario(payload) {
  return getAllStockRows().then(async (stockRows) => {
    const items = filterInventarioStock(stockRows, payload);
    if (!items.length) throw new Error("No hay stock almacenado en Supabase para ese criterio.");

    const tarea = (
      await insertRow("wms", "inventario_tareas", {
        empresa_id: empresaId,
        tipo_conteo: payload.tipo_conteo,
        criterio: buildInventarioCriterio(payload),
        zona: payload.zona || null,
        familia: payload.familia || null,
        codigo_material: payload.codigo_material || null,
        asignado_a: payload.asignado_a,
        creado_por: payload.creado_por,
        observacion: payload.observacion || null,
        estado: "PENDIENTE",
        es_reconteo: false,
        fecha_creacion: new Date().toISOString(),
        total_lineas: items.length,
        total_contadas: 0,
        total_coinciden: 0,
        total_no_coinciden: 0,
        porcentaje_exactitud: 0,
      })
    )[0];

    const detalles = items.map((item) => ({
      empresa_id: empresaId,
      tarea_id: tarea.id,
      ubicacion: item.ubicacion,
      ubicacion_base: item.ubicacion_base,
      posicion: item.posicion,
      zona: item.zona,
      bodega: item.bodega,
      codigo_material: item.codigo_material,
      descripcion_material: item.descripcion_material,
      familia: item.familia,
      unidad_medida: item.unidad_medida,
      lote_almacen: item.lote_almacen,
      lote_proveedor: item.lote_proveedor,
      fecha_vencimiento: item.fecha_vencimiento || null,
      cantidad_sistema: toNumber(item.cantidad_disponible),
      contado: false,
    }));
    const createdDetails = await insertRow("wms", "inventario_tarea_detalles", detalles);
    return { ...tarea, detalles: createdDetails };
  });
}

export function getInventarioTareas(params = {}) {
  const query = {
    empresa_id: `eq.${empresaId}`,
    select: "*",
    order: "fecha_creacion.desc",
    limit: "1000",
  };
  if (params.asignado_a) query.asignado_a = `eq.${params.asignado_a}`;
  if (params.estado) query.estado = `eq.${params.estado}`;
  return selectRows("wms", "inventario_tareas", query);
}

export function getInventarioTarea(id) {
  return findOne("inventario_tareas", {
    empresa_id: `eq.${empresaId}`,
    id: `eq.${id}`,
    select: "*",
  });
}

export function getInventarioDetalles(tareaId, { ciego = false } = {}) {
  const select = ciego
    ? "id,tarea_id,ubicacion,zona,codigo_material,descripcion_material,lote_almacen,lote_proveedor,fecha_vencimiento,cantidad_contada,contado,observacion"
    : "*";
  return selectRows("wms", "inventario_tarea_detalles", {
    empresa_id: `eq.${empresaId}`,
    tarea_id: `eq.${tareaId}`,
    select,
    order: "ubicacion.asc,codigo_material.asc,id.asc",
    limit: "5000",
  });
}

export function registrarConteoInventario(tareaId, payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  return Promise.all(
    items.map((item) =>
      updateById("wms", "inventario_tarea_detalles", item.detalle_id, {
        cantidad_contada: toNumber(item.cantidad_contada),
        diferencia: toNumber(item.cantidad_contada) - toNumber(item.cantidad_sistema),
        coincide: null,
        contado: true,
        observacion: item.observacion || null,
        fecha_conteo: new Date().toISOString(),
      })
    )
  ).then(() => recalcularTareaInventario(tareaId, "EN_PROCESO"));
}

export function recalcularTareaInventario(tareaId, estado = null) {
  return getInventarioDetalles(tareaId).then(async (rows) => {
    const total = rows.length;
    const contadas = rows.filter((r) => r.contado).length;
    const coinciden = rows.filter(
      (r) => r.contado && toNumber(r.cantidad_contada) === toNumber(r.cantidad_sistema)
    ).length;
    const noCoinciden = contadas - coinciden;
    const exactitud = contadas > 0 ? (coinciden / contadas) * 100 : 0;
    const payload = {
      total_lineas: total,
      total_contadas: contadas,
      total_coinciden: coinciden,
      total_no_coinciden: noCoinciden,
      porcentaje_exactitud: Number(exactitud.toFixed(2)),
    };
    if (estado) payload.estado = estado;
    await updateById("wms", "inventario_tareas", tareaId, payload);
    return getInventarioTarea(tareaId);
  });
}

export function getInventarioConciliacion(tareaId) {
  return getInventarioDetalles(tareaId).then((rows) =>
    rows.map((row) => ({
      ...row,
      diferencia: toNumber(row.cantidad_contada) - toNumber(row.cantidad_sistema),
      coincide: toNumber(row.cantidad_contada) === toNumber(row.cantidad_sistema),
    }))
  );
}

export function finalizarInventarioTarea(tareaId) {
  return recalcularTareaInventario(tareaId, "CERRADA");
}




