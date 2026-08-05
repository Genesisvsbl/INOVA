import {
  deleteById,
  deleteWhere,
  empresaId,
  insertRow,
  selectAllRows,
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
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(value)));
    return date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (!text) return null;
  // ISO ya formateado: 2027-07-23
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  // aaaa/mm/dd o aaaa-mm-dd (año primero, 4 dígitos): 2028/02/03
  let m = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // dd/mm/aaaa o dd-mm-aaaa (día primero): 23/07/2027
  m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null; // formato no reconocido -> no rompe el insert (queda sin fecha)
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
    `Conexion operativa no disponible (${path}). WMS debe operar contra sistema para conservar trazabilidad.`
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

export function limpiarCertificadosCacheLocal() {
  try {
    localStorage.removeItem(CERTIFICADOS_CACHE_KEY);
  } catch {
    /* ignore */
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
      cantidad: toNumber(item.cantidad ?? item.total ?? 0),
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
  if (!row) throw new Error(`No existe material ${value}.`);
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
  if (!row) throw new Error(`No existe ubicacion ${value}.`);
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
    observacion: row.observacion || "",
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
    cantidad_r: toNumber(payload.cantidad_r ?? payload.cantidad ?? 0),
    // Solo se incluye si viene con valor (tránsito). compactObject NO quita null,
    // por eso usamos undefined para no exigir la columna en recibos normales.
    observacion: payload.observacion ? String(payload.observacion).trim() : undefined,
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
    };
    if (search) {
      params.or = `(codigo.ilike.*${search}*,descripcion.ilike.*${search}*)`;
      params.limit = "1000";
      return selectRows("wms", "materiales", params);
    }
    return selectAllRows("wms", "materiales", params);
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
  if (!supabaseEnabled) return Promise.reject(new Error("Servicio operativo no configurado."));
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

  return Promise.reject(new Error("No se pudo guardar el movimiento."));
}

export function crearMovimientosBulk(payload) {
  if (supabaseEnabled) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    return Promise.all(items.map(buildMovimientoInsert)).then((rows) =>
      insertRow("wms", "movimientos", rows)
    );
  }

  return Promise.reject(new Error("No se pudo guardar el movimiento."));
}

// Borra los movimientos y rótulos de un recibo (por su serial = codigo_cita).
// Sirve para REESCRIBIR una corrección sin duplicar.
export async function borrarRecetaPorSerial(serial) {
  const s = String(serial || "").trim();
  if (!supabaseEnabled || !s) return { ok: false };
  await deleteWhere("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    codigo_cita: `eq.${s}`,
  });
  await deleteWhere("wms", "rotulos", {
    empresa_id: `eq.${empresaId}`,
    codigo_cita: `eq.${s}`,
  });
  return { ok: true };
}

// Borra los movimientos y rótulos de un recibo por su NÚMERO DE DOCUMENTO.
// El serial (cita) puede repetirse entre recibos ciegos distintos, por eso la
// reescritura de un recibo debe identificarse por documento, no por serial.
export async function borrarRecetaPorDocumento(documento) {
  const d = String(documento || "").trim();
  if (!supabaseEnabled || !d) return { ok: false };
  await deleteWhere("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    documento: `eq.${d}`,
  });
  await deleteWhere("wms", "rotulos", {
    empresa_id: `eq.${empresaId}`,
    documento: `eq.${d}`,
  });
  return { ok: true };
}

// Devuelve la fecha del primer movimiento existente con ese documento (o null
// si no existe = recibo nuevo). Sirve para saber si es una corrección y con qué
// fecha original.
export async function fechaReciboPorDocumento(documento) {
  const d = String(documento || "").trim();
  if (!supabaseEnabled || !d) return null;
  const rows = await selectRows("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    documento: `eq.${d}`,
    select: "fecha",
    order: "fecha.asc",
    limit: "1",
  }).catch(() => []);
  return Array.isArray(rows) && rows[0]?.fecha ? rows[0].fecha : null;
}

export function getMovimientos() {
  if (supabaseEnabled) {
    return selectAllRows("wms", "movimientos", {
      empresa_id: `eq.${empresaId}`,
      select: "*,material:materiales(codigo,descripcion,unidad_medida,familia),ubicacion:ubicaciones(ubicacion,ubicacion_base,posicion,zona,familias,bodega)",
      order: "fecha.desc",
    }).then((rows) => rows.map(mapMovimientoRow));
  }

  return Promise.resolve([]);
}


// ---- Corrección de recibo ya guardado (por serial) ----
function excelSerial5FromISO(iso) {
  const s = String(iso || "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return "";
  const base = Date.UTC(1899, 11, 30);
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const diff = Math.round((target - base) / 86400000);
  if (!Number.isFinite(diff) || diff <= 0) return "";
  return String(diff).padStart(5, "0").slice(-5);
}
function buildLoteAlmacen15(loteProv, fechaVencISO) {
  const lp = String(loteProv || "").trim().slice(0, 10);
  const s5 = excelSerial5FromISO(fechaVencISO);
  if (lp.length !== 10 || s5.length !== 5) return "";
  return lp + s5;
}

// Carga los movimientos guardados de un recibo (por su serial). codigo_cita = serial-item.
export function getMovimientosPorSerial(serial) {
  const s = String(serial || "").trim();
  if (!supabaseEnabled || !s) return Promise.resolve([]);
  // Los movimientos guardan codigo_cita = serial (ej. "40463"), no "40463-01".
  // Usamos like para cubrir ambos formatos.
  return selectRows("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    codigo_cita: `like.${s}*`,
    select:
      "id,codigo_cita,estado,cantidad_r,umb,um,lote_almacen,lote_proveedor,fecha_fabricacion,fecha_vencimiento,proveedor,documento,material:materiales(codigo,descripcion),ubicacion:ubicaciones(ubicacion)",
    order: "id.asc",
  }).then((rows) =>
    (rows || []).map((r) => ({
      id: r.id,
      codigo_cita: r.codigo_cita,
      estado: r.estado,
      cantidad: Number(r.cantidad_r || 0),
      umb: r.umb != null ? r.umb : "",
      um: r.um || "",
      lote_almacen: r.lote_almacen || "",
      lote_proveedor: r.lote_proveedor || "",
      fecha_fabricacion: (r.fecha_fabricacion || "").slice(0, 10),
      fecha_vencimiento: (r.fecha_vencimiento || "").slice(0, 10),
      sku: r.material?.codigo || "",
      descripcion: r.material?.descripcion || "",
      proveedor: r.proveedor || "",
      documento: r.documento || "",
      ubicacion:
        r.ubicacion?.ubicacion ||
        (r.estado === "EN_TRANSITO" ? "EN TRANSITO" : ""),
    }))
  );
}

// Busca un recibo YA guardado por cualquier dato (serial, documento, remesa,
// orden de compra, lote o sku) y reconstruye la cabecera + líneas desde los rótulos.
export async function buscarReciboGuardado(query) {
  const q = String(query || "").trim();
  if (!supabaseEnabled || !q) return null;
  const rows = await selectAllRows("wms", "rotulos", {
    empresa_id: `eq.${empresaId}`,
    or: `(codigo_cita.ilike.*${q}*,documento.ilike.*${q}*,remesa.ilike.*${q}*,orden_compra.ilike.*${q}*,lote_proveedor.ilike.*${q}*,lote_almacen.ilike.*${q}*,sku.ilike.*${q}*)`,
    select: "*",
    order: "impresion.asc",
  });
  if (!rows || !rows.length) return null;

  const serial = String(rows[0].codigo_cita || "").trim();
  const delRecibo = rows.filter(
    (r) => String(r.codigo_cita || "").trim() === serial
  );
  const first = delRecibo[0] || {};

  const header = {
    serial,
    proveedor_id: "",
    proveedor: first.proveedor || "",
    acreedor: "",
    remesa_transp: first.remesa || "",
    documento: first.documento || "",
    orden_compra: first.orden_compra || "",
    auxiliar: first.auxiliar || "",
    fecha_recepcion: (first.fecha_recepcion || "").slice(0, 10) || undefined,
  };

  // AMCOR: en rótulos se guarda agrupado (un lote por grupo), pero los
  // movimientos guardan TODOS los lotes individuales. Para poder re-imprimir
  // el rango correcto, reconstruimos las líneas desde los movimientos.
  if (/amcor/i.test(header.proveedor)) {
    const movs = await getMovimientosPorSerial(serial);
    // Cada movimiento es un lote individual (todos con codigo_cita = serial).
    const lineasAmcor = (movs || [])
      .filter((m) => (m.lote_proveedor || "").trim())
      .map((m) => {
        const umb = Number(m.umb || 0);
        return {
          fecha_recepcion: header.fecha_recepcion || "",
          codigo: m.sku || "",
          descripcion: m.descripcion || "",
          empaque: "",
          umb: m.umb != null && m.umb !== "" ? String(m.umb) : "",
          um: m.um || "",
          cantidad: "1",
          total: umb,
          lote_proveedor: m.lote_proveedor || "",
          fecha_fabricacion: (m.fecha_fabricacion || "").slice(0, 10),
          fecha_vencimiento: (m.fecha_vencimiento || "").slice(0, 10),
          impresion: m.codigo_cita || "",
        };
      });
    if (lineasAmcor.length) {
      return { serial, header, lineas: lineasAmcor };
    }
  }

  const lineas = [...delRecibo]
    .sort((a, b) =>
      String(a.impresion || "").localeCompare(String(b.impresion || ""), "es", {
        numeric: true,
      })
    )
    .map((r) => {
      // OJO: en rótulos, el campo "cantidad" guarda el TOTAL de la línea
      // (umb × cantidad). La cantidad real = total ÷ umb.
      const umb = r.umb != null && r.umb !== "" ? Number(r.umb) : 0;
      const total = Number(r.cantidad || 0);
      const cantReal = umb > 0 ? total / umb : total;
      const cantRedondeada = Number.isFinite(cantReal)
        ? Math.round(cantReal * 1e6) / 1e6
        : "";
      return {
        fecha_recepcion: (r.fecha_recepcion || "").slice(0, 10),
        codigo: r.sku || "",
        descripcion: r.texto_breve || "",
        empaque: "",
        umb: r.umb != null ? String(r.umb) : "",
        um: r.um || "",
        cantidad: cantRedondeada === "" ? "" : String(cantRedondeada),
        total: total,
        lote_proveedor: r.lote_proveedor || "",
        fecha_fabricacion: (r.fecha_fabricacion || "").slice(0, 10),
        fecha_vencimiento: (r.fecha_vencimiento || "").slice(0, 10),
        impresion: r.impresion || "",
      };
    });

  return { serial, header, lineas };
}

// Corrige lote_proveedor / fechas (y recalcula lote_almacen) en movimientos Y rotulos
// de un recibo ya guardado, por item (codigo_cita). NO toca cantidad ni ubicacion.
export async function corregirTrazabilidadPorSerial(serial, correcciones) {
  const s = String(serial || "").trim();
  if (!supabaseEnabled) throw new Error("Sin conexión con la base.");
  if (!s) throw new Error("Serial vacío.");

  const [movs, rots] = await Promise.all([
    selectRows("wms", "movimientos", {
      empresa_id: `eq.${empresaId}`,
      codigo_cita: `like.${s}-*`,
      select: "id,codigo_cita",
    }),
    selectRows("wms", "rotulos", {
      empresa_id: `eq.${empresaId}`,
      codigo_cita: `eq.${s}`,
      select: "id,impresion",
    }),
  ]);

  let movActualizados = 0;
  let rotActualizados = 0;

  for (const c of correcciones || []) {
    const la = buildLoteAlmacen15(c.lote_proveedor, c.fecha_vencimiento);
    const campos = {
      lote_proveedor: String(c.lote_proveedor || "").trim(),
      fecha_fabricacion: c.fecha_fabricacion || null,
      fecha_vencimiento: c.fecha_vencimiento || null,
      ...(la ? { lote_almacen: la } : {}),
    };
    for (const mv of (movs || []).filter((m) => m.codigo_cita === c.codigo_cita)) {
      await updateById("wms", "movimientos", mv.id, campos);
      movActualizados += 1;
    }
    for (const rt of (rots || []).filter((r) => r.impresion === c.codigo_cita)) {
      await updateById("wms", "rotulos", rt.id, campos);
      rotActualizados += 1;
    }
  }

  return { movActualizados, rotActualizados };
}

export function getMovimientosLayoutStock() {
  if (supabaseEnabled) {
    return selectAllRows("wms", "movimientos", {
      empresa_id: `eq.${empresaId}`,
      estado: "eq.ALMACENADO",
      select: "id,estado,cantidad_r,ubicacion_id,proveedor,lote_almacen,lote_proveedor,fecha_vencimiento,material:materiales(codigo,descripcion,unidad_medida,familia),ubicacion:ubicaciones(ubicacion,ubicacion_base,posicion,zona,familias,bodega)",
      order: "id.desc",
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
    };
    if (q) params.or = `(documento.ilike.*${q}*,codigo_cita.ilike.*${q}*,lote_almacen.ilike.*${q}*,lote_proveedor.ilike.*${q}*)`;
    return selectAllRows("wms", "movimientos", params).then((rows) => rows.map(mapMovimientoRow));
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

  return Promise.reject(new Error("No se pudo actualizar el transito."));
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
    const bloqueado = rows
      .filter((m) => normalizeText(m.estado) === "PNC_BLOQUEADO")
      .reduce((acc, m) => acc + toNumber(m.cantidad_r ?? m.cantidad), 0);

    return {
      codigo: material.codigo || codigo,
      descripcion: material.descripcion || "",
      unidad_medida: material.unidad_medida || "",
      familia: material.familia || "",
      stock_actual: almacenado + transito,
      stock_almacenado: almacenado,
      stock_en_transito: transito,
      stock_bloqueado_pnc: bloqueado,
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
    };
    if (search) {
      params.or = `(nombre.ilike.*${search}*,acreedor.ilike.*${search}*)`;
      params.limit = "1000";
      return selectRows("wms", "proveedores", params);
    }
    return selectAllRows("wms", "proveedores", params);
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
  if (!supabaseEnabled) return Promise.reject(new Error("Servicio operativo no configurado."));
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
    };
    params.or = `(ubicacion.ilike.*${search}*,ubicacion_base.ilike.*${search}*,zona.ilike.*${search}*,bodega.ilike.*${search}*)`;
    return selectAllRows("wms", "ubicaciones", params);
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
  if (!supabaseEnabled) return Promise.reject(new Error("Servicio operativo no configurado."));
  return readSpreadsheetRows(file).then(async (rows) => {
    // Mapea cada fila. Si hay columna de POSICIÓN, la columna "UBICACIÓN" se
    // trata como la BASE y el código completo = base + posición. Si no hay
    // posición, "UBICACIÓN" ya es el código completo.
    const byUbic = new Map(); // clave normalizada -> payload (dedupe)
    for (const row of rows) {
      const posicion = String(getImportValue(row, "posicion") || "").trim();
      const ubiCol = String(getImportValue(row, "ubicacion") || "").trim();
      let base = String(getImportValue(row, "ubicacion_base") || "").trim();
      let ubicacion;
      if (posicion) {
        if (!base) base = ubiCol; // la columna UBICACIÓN es la base
        ubicacion = `${base}${posicion}`.trim();
      } else {
        ubicacion = (ubiCol || `${base}${posicion}`).trim();
      }
      if (!ubicacion) continue;
      byUbic.set(ubicacion.toUpperCase(), compactObject({
        empresa_id: empresaId,
        ubicacion,
        ubicacion_base: base || null,
        posicion: posicion || null,
        zona: String(getImportValue(row, "zona") || "").trim(),
        familias: String(getImportValue(row, "familias") || "").trim(),
        bodega: String(getImportValue(row, "bodega") || "").trim(),
      }));
    }
    const mapped = Array.from(byUbic.values());
    if (!mapped.length) throw new Error("El archivo no tiene ubicaciones validas.");

    // Precarga lo existente UNA vez (rápido) para decidir insertar vs actualizar.
    const existentes = await getUbicaciones();
    const exByUbic = new Map((existentes || []).map((u) => [String(u.ubicacion || "").trim().toUpperCase(), u]));

    const nuevos = [];
    const cambios = [];
    let sinCambio = 0;
    for (const m of mapped) {
      const ex = exByUbic.get(String(m.ubicacion).toUpperCase());
      if (!ex) { nuevos.push(m); continue; }
      const diff =
        String(ex.ubicacion_base || "") !== String(m.ubicacion_base || "") ||
        String(ex.posicion || "") !== String(m.posicion || "") ||
        String(ex.zona || "") !== String(m.zona || "") ||
        String(ex.familias || "") !== String(m.familias || "") ||
        String(ex.bodega || "") !== String(m.bodega || "");
      if (diff) cambios.push({ id: ex.id, payload: m });
      else sinCambio += 1;
    }

    // Inserción masiva de los nuevos (en lotes).
    for (let i = 0; i < nuevos.length; i += 500) {
      await insertRow("wms", "ubicaciones", nuevos.slice(i, i + 500));
    }
    // Actualiza solo lo que cambió, en paralelo con concurrencia limitada.
    let cursor = 0;
    async function worker() {
      while (cursor < cambios.length) {
        const c = cambios[cursor++];
        await updateById("wms", "ubicaciones", c.id, c.payload).catch(() => {});
      }
    }
    await Promise.all(Array.from({ length: Math.min(8, cambios.length) }, () => worker()));

    return {
      inserted: nuevos.length,
      actualizadas: cambios.length,
      sinCambio,
      mensaje:
        `Ubicaciones: ${nuevos.length} nueva(s), ${cambios.length} actualizada(s)` +
        (sinCambio ? `, ${sinCambio} sin cambios` : "") + `. Total en archivo: ${mapped.length}.`,
    };
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

  return Promise.reject(new Error("No se pudo guardar el rotulo."));
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

  return Promise.reject(new Error("No se pudo guardar el rotulo."));
}

export function eliminarRotulo(id) {
  if (supabaseEnabled) return deleteById("wms", "rotulos", id);

  return Promise.reject(new Error("No se pudo eliminar el rotulo."));
}

export function imprimirRotulo(rotuloId, copias = 1) {
  return Promise.reject(new Error("La impresion debe realizarse desde la vista previa disponible."));
}

// Importa el inventario inicial (formato completo tipo MOTOR). Detecta PNC:
// filas con ubicacion_base = "PNC" (o codigo_ubicacion PNCBLOQUEO / posicion
// BLOQUEO) se guardan como PNC_BLOQUEADO (no cuentan para picking hasta
// desbloquearlas). Precarga maestros para resolver rápido, sin una consulta
// por fila.
export function importarInventarioInicial(file) {
  if (!supabaseEnabled) return Promise.reject(new Error("Servicio operativo no configurado."));
  return readSpreadsheetRows(file).then(async (rows) => {
    const [materiales, ubicaciones] = await Promise.all([getMateriales(), getUbicaciones()]);
    const matByCod = new Map((materiales || []).map((m) => [normalizeText(m.codigo), m.id]));
    const ubByCod = new Map((ubicaciones || []).map((u) => [normalizeText(u.ubicacion), u.id]));

    const val = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
      }
      return "";
    };

    // 1er paso: detectar ubicaciones que no existen (no-PNC, con código) y crearlas.
    const nuevasUbic = new Map(); // normCod -> payload
    for (const row of rows) {
      const codUb = String(val(row, "codigo ubicacion") || getImportValue(row, "ubicacion")).trim();
      if (!codUb) continue;
      const ubBase = String(val(row, "ubicacion base")).trim();
      const posicion = String(val(row, "posicion")).trim();
      const estadoXls = String(val(row, "estado")).trim();
      const esPnc =
        /pnc/i.test(ubBase) || /pnc/i.test(codUb) || /bloqueo/i.test(posicion) || /pnc/i.test(estadoXls);
      if (esPnc) continue;
      const norm = normalizeText(codUb);
      if (ubByCod.has(norm) || nuevasUbic.has(norm)) continue;
      nuevasUbic.set(
        norm,
        compactObject({
          empresa_id: empresaId,
          ubicacion: codUb,
          ubicacion_base: ubBase || null,
          posicion: posicion || null,
          zona: String(val(row, "zona")).trim(),
          familias: String(val(row, "familias", "familia")).trim(),
          bodega: String(val(row, "bodega")).trim(),
        })
      );
    }

    let ubicacionesCreadas = 0;
    if (nuevasUbic.size) {
      const nuevas = Array.from(nuevasUbic.values());
      for (let i = 0; i < nuevas.length; i += 200) {
        await insertRow("wms", "ubicaciones", nuevas.slice(i, i + 200));
      }
      ubicacionesCreadas = nuevas.length;
      // Recarga el mapa con las ubicaciones recién creadas.
      const ubActual = await getUbicaciones();
      ubByCod.clear();
      (ubActual || []).forEach((u) => ubByCod.set(normalizeText(u.ubicacion), u.id));
    }

    // Detectar materiales que no existen y crearlos con la info del archivo.
    const nuevosMat = new Map(); // normCod -> payload
    for (const row of rows) {
      const codigo = String(getImportValue(row, "codigo") || val(row, "codigo material", "material")).trim();
      if (!codigo) continue;
      const norm = normalizeText(codigo);
      if (matByCod.has(norm) || nuevosMat.has(norm)) continue;
      const descripcion = String(val(row, "descripcion material", "descripcion")).trim();
      if (!descripcion) continue; // sin descripción no se puede crear
      nuevosMat.set(
        norm,
        compactObject({
          empresa_id: empresaId,
          codigo,
          descripcion,
          unidad: 1,
          unidad_medida: String(val(row, "unidad medida", "um")).trim() || "UN",
          familia: String(val(row, "familia")).trim(),
        })
      );
    }

    let materialesCreados = 0;
    if (nuevosMat.size) {
      const nuevos = Array.from(nuevosMat.values());
      for (let i = 0; i < nuevos.length; i += 200) {
        await insertRow("wms", "materiales", nuevos.slice(i, i + 200));
      }
      materialesCreados = nuevos.length;
      const matActual = await getMateriales();
      matByCod.clear();
      (matActual || []).forEach((m) => matByCod.set(normalizeText(m.codigo), m.id));
    }

    const items = [];
    let omit = 0;
    let sinMaterial = 0;
    let pnc = 0;

    for (const row of rows) {
      const codigo = String(getImportValue(row, "codigo") || val(row, "codigo material", "material")).trim();
      const cantidad = toNumber(val(row, "cantidad r", "cantidad", "cantidad_r"));
      if (!codigo || !cantidad) {
        omit += 1;
        continue;
      }
      const materialId = matByCod.get(normalizeText(codigo));
      if (!materialId) {
        sinMaterial += 1;
        continue;
      }

      const ubBase = String(val(row, "ubicacion base")).trim();
      const codUb = String(val(row, "codigo ubicacion") || getImportValue(row, "ubicacion")).trim();
      const posicion = String(val(row, "posicion")).trim();
      const estadoXls = String(val(row, "estado")).trim();
      const esPnc =
        /pnc/i.test(ubBase) || /pnc/i.test(codUb) || /bloqueo/i.test(posicion) || /pnc/i.test(estadoXls);
      if (esPnc) pnc += 1;

      const ubicacionId = esPnc ? null : ubByCod.get(normalizeText(codUb)) || null;

      items.push(
        compactObject({
          empresa_id: empresaId,
          fecha: excelDateToISO(val(row, "fecha"))
            ? new Date(`${excelDateToISO(val(row, "fecha"))}T00:00:00`).toISOString()
            : new Date().toISOString(),
          usuario: String(val(row, "usuario") || "IMPORTACION").trim(),
          documento: String(val(row, "documento") || "INVENTARIO_INICIAL").trim(),
          material_id: materialId,
          ubicacion_id: ubicacionId,
          um: String(val(row, "unidad medida", "um")).trim() || undefined,
          estado: esPnc ? "PNC_BLOQUEADO" : ubicacionId ? "ALMACENADO" : "EN_TRANSITO",
          lote_almacen: String(val(row, "lote almacen")).trim() || undefined,
          lote_proveedor: String(val(row, "lote proveedor")).trim() || undefined,
          fecha_vencimiento: excelDateToISO(val(row, "fecha vencimiento")) || undefined,
          cantidad_r: cantidad,
        })
      );
    }

    if (!items.length) throw new Error("El archivo no tiene inventario válido. Requiere código y cantidad.");

    // Inserta en lotes para no exceder límites.
    const chunk = 500;
    for (let i = 0; i < items.length; i += chunk) {
      await insertRow("wms", "movimientos", items.slice(i, i + chunk));
    }

    return {
      inserted: items.length,
      pnc,
      ubicacionesCreadas,
      materialesCreados,
      mensaje:
        `Inventario importado: ${items.length} registro(s)` +
        (pnc ? `, ${pnc} en PNC bloqueado` : "") +
        (materialesCreados ? `; ${materialesCreados} material(es) nuevo(s) creado(s)` : "") +
        (ubicacionesCreadas ? `; ${ubicacionesCreadas} ubicación(es) nueva(s) creada(s)` : "") +
        (sinMaterial ? `; ${sinMaterial} fila(s) sin material (falta descripción en el Excel)` : "") +
        (omit ? `; ${omit} fila(s) sin código/cantidad` : "") +
        ".",
    };
  });
}

// ---- PNC (Producto No Conforme / bloqueado) ----
// Lista los movimientos en estado PNC_BLOQUEADO (para Reasignación).
export async function getPncBloqueado() {
  if (!supabaseEnabled) return [];
  const rows = await selectAllRows("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    estado: "eq.PNC_BLOQUEADO",
    select: "*,material:materiales(codigo,descripcion,unidad_medida,familia),ubicacion:ubicaciones(ubicacion,zona,bodega)",
    order: "id.desc",
  });
  return (rows || [])
    .map((r) => ({
      id: r.id,
      codigo_material: r.material?.codigo || "",
      descripcion_material: r.material?.descripcion || "",
      um: r.um || r.material?.unidad_medida || "",
      familia: r.material?.familia || "",
      lote_almacen: r.lote_almacen || "",
      lote_proveedor: r.lote_proveedor || "",
      fecha_vencimiento: r.fecha_vencimiento || "",
      zona: r.ubicacion?.zona || "",
      cantidad: Number(r.cantidad_r || 0),
    }))
    .filter((r) => r.cantidad > 0);
}

// Desbloquea un PNC: le asigna una ubicación real y pasa a ALMACENADO.
export async function desbloquearPnc(movimientoId, codigoUbicacion) {
  if (!supabaseEnabled) throw new Error("Servicio operativo no configurado.");
  const ubicacionId = await resolveUbicacionId(codigoUbicacion);
  return updateById("wms", "movimientos", movimientoId, {
    ubicacion_id: ubicacionId,
    estado: "ALMACENADO",
  });
}

// Da de baja un PNC: deja el positivo como BAJA_PNC y registra una SALIDA
// negativa (documento "BAJA PNC") para conservar el rastro. Neto = 0.
export async function darDeBajaPnc(movimiento) {
  if (!supabaseEnabled) throw new Error("Servicio operativo no configurado.");
  const materialId = await resolveMaterialId(movimiento.codigo_material);
  await insertRow("wms", "movimientos", {
    empresa_id: empresaId,
    fecha: new Date().toISOString(),
    usuario: String(sessionStorage.getItem("usuario") || "SISTEMA"),
    documento: "BAJA PNC",
    material_id: materialId,
    ubicacion_id: null,
    um: movimiento.um || null,
    estado: "BAJA_PNC",
    lote_almacen: movimiento.lote_almacen || null,
    lote_proveedor: movimiento.lote_proveedor || null,
    fecha_vencimiento: movimiento.fecha_vencimiento || null,
    cantidad_r: -Math.abs(Number(movimiento.cantidad || 0)),
  });
  return updateById("wms", "movimientos", movimiento.id, { estado: "BAJA_PNC" });
}

// Categorías de datos transaccionales que el administrador puede borrar.
// NO incluye maestros (materiales, proveedores, ubicaciones).
export const WMS_DATA_GROUPS = [
  {
    key: "movimientos",
    grupo: "movimientos",
    label: "Movimientos (entradas, salidas, tránsito y stock)",
    tablas: ["movimientos"],
  },
  {
    key: "rotulos",
    grupo: "bases",
    label: "Rótulos",
    tablas: ["rotulos"],
  },
  {
    key: "despachos",
    grupo: "bases",
    label: "Despachos y picking",
    // Orden importante por llaves foráneas: primero picking_detalle (hijo),
    // luego despacho_detalles, y al final despacho_cargas (padre).
    tablas: ["picking_detalle", "despacho_detalles", "despacho_cargas"],
  },
  {
    key: "inventarios",
    grupo: "bases",
    label: "Inventarios / conteos físicos",
    tablas: ["inventario_tarea_detalles", "inventario_tareas"],
  },
  {
    key: "certificados",
    grupo: "bases",
    label: "Certificados de calidad",
    tablas: ["certificados_calidad"],
  },
  // Maestros: van al FINAL para que, si se borra todo junto, primero se
  // eliminen los movimientos/bases que los referencian (llaves foráneas).
  {
    key: "materiales",
    grupo: "maestros",
    label: "Materiales",
    tablas: ["materiales"],
  },
  {
    key: "proveedores",
    grupo: "maestros",
    label: "Proveedores",
    tablas: ["proveedores"],
  },
  {
    key: "ubicaciones",
    grupo: "maestros",
    label: "Ubicaciones",
    tablas: ["ubicaciones"],
  },
];

// Borra por empresa las categorías seleccionadas. `seleccion` es un objeto
// { movimientos:true, rotulos:false, ... }. Devuelve el detalle de lo borrado.
export async function borrarDatosWms(seleccion = {}) {
  if (!supabaseEnabled) throw new Error("Servicio operativo no configurado.");
  const grupos = WMS_DATA_GROUPS.filter((g) => seleccion[g.key]);
  if (!grupos.length) throw new Error("No seleccionaste ninguna categoría para borrar.");

  const borradas = [];
  const omitidas = [];
  for (const grupo of grupos) {
    for (const tabla of grupo.tablas) {
      try {
        await deleteWhere("wms", tabla, { empresa_id: `eq.${empresaId}` });
        borradas.push(tabla);
      } catch (e) {
        const msg = String(e?.raw || e?.message || e);
        // Si la tabla no existe en la base (migración no aplicada), la
        // omitimos y seguimos con el resto.
        if (
          e?.code === "PGRST205" ||
          msg.includes("PGRST205") ||
          /Could not find the table/i.test(msg) ||
          /does not exist/i.test(msg) ||
          /schema cache/i.test(msg)
        ) {
          omitidas.push(tabla);
          continue;
        }
        throw e; // otros errores (ej. llave foránea) sí se reportan
      }
    }
  }
  // Los certificados de calidad viven también en un caché local (localStorage)
  // cuando la tabla no existe; lo limpiamos para que la vista quede vacía.
  if (seleccion.certificados) {
    try {
      localStorage.removeItem(CERTIFICADOS_CACHE_KEY);
      if (!borradas.includes("certificados_calidad")) borradas.push("certificados_calidad (caché)");
    } catch {
      /* ignore */
    }
  }
  return { grupos: grupos.map((g) => g.key), tablas: borradas, omitidas };
}

// Genera el análisis de inventario: sube el LX02 de SAP (teórico) y lo cruza
// contra el físico real del WMS (stock por material). El teórico se agrupa por
// material (sumando lotes) y la "familia" sale de la Ubicación de SAP.
export async function generarAnalisisInventario(file) {
  if (!supabaseEnabled) throw new Error("Servicio operativo no configurado.");
  const rows = await readSpreadsheetRows(file);

  const sap = new Map();
  for (const r of rows) {
    const material = String(getImportValue(r, "codigo") || r["material"] || "").trim();
    if (!material) continue;
    const teorico = toNumber(
      r["stock disponible"] ?? r["stock"] ?? r["teorico"] ?? getImportValue(r, "cantidad")
    );
    const texto = String(
      r["texto breve de material"] || r["texto breve del material"] || r["descripcion"] || ""
    ).trim();
    const familia = String(r["ubicacion"] || r["familia"] || r["tipo almacen"] || "").trim();
    if (!sap.has(material)) sap.set(material, { material, familia, texto, teorico: 0 });
    const it = sap.get(material);
    it.teorico += teorico;
    if (!it.familia && familia) it.familia = familia;
    if (!it.texto && texto) it.texto = texto;
  }

  if (!sap.size) throw new Error("El archivo no tiene datos válidos. Requiere Material y Stock disponible.");

  // Físico real del WMS: stock neto por material. Trae TODOS los movimientos
  // (sin límite, paginado) con una consulta liviana (solo código + cantidad)
  // para que sea rápido aunque haya mucha información.
  const movs = await selectAllRows("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    select: "cantidad_r,material:materiales(codigo)",
  });
  const fisico = new Map();
  for (const m of Array.isArray(movs) ? movs : []) {
    const cod = String(m.material?.codigo || "").trim();
    if (!cod) continue;
    fisico.set(cod, (fisico.get(cod) || 0) + Number(m.cantidad_r ?? 0));
  }

  return Array.from(sap.values())
    .map((s) => ({ ...s, fisico: fisico.get(s.material) || 0 }))
    .sort(
      (a, b) =>
        String(a.familia).localeCompare(String(b.familia)) ||
        String(a.material).localeCompare(String(b.material))
    );
}

// Guardar / listar / abrir análisis de inventario (snapshot con fecha y hora).
export function guardarAnalisisInventario(payload) {
  if (!supabaseEnabled) return Promise.reject(new Error("Servicio operativo no configurado."));
  return insertRow("wms", "analisis_inventario", {
    empresa_id: empresaId,
    nombre: payload.nombre || null,
    archivo: payload.archivo || null,
    creado_por: payload.creado_por || null,
    total_materiales: Number(payload.total_materiales || 0),
    total_faltantes: Number(payload.total_faltantes || 0),
    total_sobrantes: Number(payload.total_sobrantes || 0),
    total_cuadrados: Number(payload.total_cuadrados || 0),
    datos: Array.isArray(payload.datos) ? payload.datos : [],
  }).then((r) => (Array.isArray(r) ? r[0] : r));
}

export function listarAnalisisInventario() {
  if (!supabaseEnabled) return Promise.resolve([]);
  return selectAllRows("wms", "analisis_inventario", {
    empresa_id: `eq.${empresaId}`,
    select:
      "id,nombre,archivo,creado_por,fecha,total_materiales,total_faltantes,total_sobrantes,total_cuadrados",
    order: "fecha.desc",
  });
}

export function getAnalisisInventario(id) {
  if (!supabaseEnabled) return Promise.resolve(null);
  return selectRows("wms", "analisis_inventario", {
    id: `eq.${id}`,
    empresa_id: `eq.${empresaId}`,
    select: "*",
    limit: "1",
  }).then((r) => (Array.isArray(r) ? r[0] : r));
}

export function eliminarAnalisisInventario(id) {
  if (!supabaseEnabled) return Promise.reject(new Error("Servicio operativo no configurado."));
  return deleteById("wms", "analisis_inventario", id);
}

// Para control de rotación (FEFO): por cada código, el vencimiento MÁS LEJANO
// que ya se recibió antes (stock/entradas). Si lo que llega ahora vence antes,
// el proveedor está incumpliendo la rotación.
export async function getMaxVencimientoPorCodigos(codigos) {
  const list = [...new Set((codigos || []).map((c) => String(c || "").trim()).filter(Boolean))];
  if (!supabaseEnabled || !list.length) return {};
  const materiales = await selectRows("wms", "materiales", {
    empresa_id: `eq.${empresaId}`,
    codigo: `in.(${list.join(",")})`,
    select: "id,codigo",
  });
  const idToCodigo = new Map((materiales || []).map((m) => [m.id, String(m.codigo)]));
  const ids = (materiales || []).map((m) => m.id);
  if (!ids.length) return {};
  const movs = await selectAllRows("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    material_id: `in.(${ids.join(",")})`,
    select: "material_id,fecha_vencimiento,cantidad_r",
  });
  const maxByCodigo = {};
  for (const m of movs || []) {
    if (Number(m.cantidad_r || 0) <= 0) continue; // solo entradas/stock
    const cod = idToCodigo.get(m.material_id);
    const fv = String(m.fecha_vencimiento || "").slice(0, 10);
    if (!cod || !fv) continue;
    if (!maxByCodigo[cod] || fv > maxByCodigo[cod]) maxByCodigo[cod] = fv;
  }
  return maxByCodigo;
}

// Para la evidencia de rotación: por cada código, TODOS los lotes/vencimientos
// que ya se RECIBIERON antes (entradas históricas, cantidad > 0), agrupados por
// lote+vencimiento y ordenados por vencimiento ascendente. Sirve para mostrar el
// histórico recibido vs la fecha que llega ahora.
export async function getLotesRecibidosPorCodigos(codigos) {
  const list = [...new Set((codigos || []).map((c) => String(c || "").trim()).filter(Boolean))];
  if (!supabaseEnabled || !list.length) return {};
  const materiales = await selectRows("wms", "materiales", {
    empresa_id: `eq.${empresaId}`,
    codigo: `in.(${list.join(",")})`,
    select: "id,codigo",
  });
  const idToCodigo = new Map((materiales || []).map((m) => [m.id, String(m.codigo)]));
  const ids = (materiales || []).map((m) => m.id);
  if (!ids.length) return {};
  const movs = await selectAllRows("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    material_id: `in.(${ids.join(",")})`,
    select: "material_id,fecha,fecha_vencimiento,lote_almacen,lote_proveedor,cantidad_r",
  });
  const byCod = {};
  for (const m of movs || []) {
    if (Number(m.cantidad_r || 0) <= 0) continue; // solo entradas (recibido)
    const cod = idToCodigo.get(m.material_id);
    if (!cod) continue;
    const fv = String(m.fecha_vencimiento || "").slice(0, 10);
    if (!fv) continue;
    const lote = String(m.lote_almacen || m.lote_proveedor || "").trim();
    const key = `${lote}|${fv}`;
    if (!byCod[cod]) byCod[cod] = new Map();
    const cur = byCod[cod].get(key) || { lote, fv, cantidad: 0, fechaRec: String(m.fecha || "").slice(0, 10) };
    cur.cantidad += Number(m.cantidad_r || 0);
    if (String(m.fecha || "").slice(0, 10) < cur.fechaRec || !cur.fechaRec) cur.fechaRec = String(m.fecha || "").slice(0, 10);
    byCod[cod].set(key, cur);
  }
  const out = {};
  for (const cod of Object.keys(byCod)) {
    out[cod] = Array.from(byCod[cod].values())
      .filter((x) => x.cantidad > 0)
      .sort((a, b) => String(a.fv).localeCompare(String(b.fv)));
  }
  return out;
}

// Ubicaciones VACÍAS (sin stock ALMACENADO) filtradas por base y/o zona.
// Sirve para sugerir dónde ubicar un material desde tránsito.
export async function getUbicacionesVacias(base, zona) {
  if (!supabaseEnabled) return [];
  const params = {
    empresa_id: `eq.${empresaId}`,
    select: "id,ubicacion,ubicacion_base,posicion,zona,familias,bodega",
    order: "ubicacion.asc",
  };
  if (base) params.ubicacion_base = `eq.${base}`;
  if (zona) params.zona = `eq.${zona}`;
  const ubic = await selectAllRows("wms", "ubicaciones", params);
  const movs = await selectAllRows("wms", "movimientos", {
    empresa_id: `eq.${empresaId}`,
    estado: "eq.ALMACENADO",
    select: "ubicacion_id,cantidad_r",
  });
  const sum = new Map();
  for (const m of movs || []) {
    if (m.ubicacion_id == null) continue;
    sum.set(m.ubicacion_id, (sum.get(m.ubicacion_id) || 0) + Number(m.cantidad_r || 0));
  }
  return (ubic || []).filter((u) => (sum.get(u.id) || 0) <= 0);
}

export function importarDespachos(file) {
  if (!supabaseEnabled) return Promise.reject(new Error("Servicio operativo no configurado."));
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
  if (!supabaseEnabled) throw new Error("Servicio operativo no configurado.");

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
    const message = String(error?.raw || error?.message || error || "");
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

    // Borra los picks NO confirmados de ESTA reserva (se van a regenerar).
    await Promise.all(
      (picksActuales || [])
        .filter((p) => !p.confirmado && !toNumber(p.cantidad_confirmada))
        .map((p) => deleteById("wms", "picking_detalle", p.id))
    );

    // Clave única por ubicación + lote + vencimiento (una posición física).
    const keyOf = (u, la, lp, fv) =>
      `${String(u || "").toUpperCase()}|${la || ""}|${lp || ""}|${String(fv || "").slice(0, 10)}`;

    // Cantidad YA comprometida en otros pickings sin confirmar (otras reservas):
    // para no volver a sugerir la misma ubicación/lote que ya está reservado.
    const comprometidos = await selectAllRows("wms", "picking_detalle", {
      empresa_id: `eq.${empresaId}`,
      confirmado: "eq.false",
      select: "ubicacion,lote_almacen,lote_proveedor,fecha_vencimiento,cantidad_sugerida,cantidad_confirmada",
    }).catch(() => []);
    const consumido = new Map(); // key -> cantidad ya reservada (se va descontando)
    (comprometidos || []).forEach((p) => {
      const rem = toNumber(p.cantidad_sugerida) - toNumber(p.cantidad_confirmada);
      if (rem > 0) {
        const k = keyOf(p.ubicacion, p.lote_almacen, p.lote_proveedor, p.fecha_vencimiento);
        consumido.set(k, (consumido.get(k) || 0) + rem);
      }
    });

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
        const k = keyOf(stock.ubicacion, stock.lote_almacen, stock.lote_proveedor, stock.fecha_vencimiento);
        // Lo realmente libre = existencia − lo ya reservado (otras líneas/reservas).
        const libre = toNumber(stock.cantidad_disponible) - (consumido.get(k) || 0);
        if (libre <= 0) return;
        const sugerida = Math.min(restante, libre);
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
        consumido.set(k, (consumido.get(k) || 0) + sugerida); // consume la posición
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
  return selectAllRows("wms", "picking_detalle", {
    empresa_id: `eq.${empresaId}`,
    reserva: `eq.${reservaValue}`,
    select: "*",
    order: "confirmado.asc,fecha_vencimiento.asc,id.asc",
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

      const found = item.id
        ? await findOne("picking_detalle", {
            empresa_id: `eq.${empresaId}`,
            id: `eq.${item.id}`,
            select: "*",
          })
        : null;

      // Si no se encontró la fila en la BD, usamos el propio item para no romper.
      const pick = found || item;
      // Id válido para actualizar: preferimos el del item (lo conocemos) y si
      // no, el encontrado. Los SKU manuales llegan con id 0 (no se actualizan).
      const pickId = Number(item.id) || Number(found?.id) || null;

      const ubicacionTomada =
        item.ubicacion_alternativa || item.ubicacion_tomada || pick?.ubicacion_alternativa || pick?.ubicacion;
      const loteAlmacen = item.lote_almacen_alternativo || item.lote_almacen || pick?.lote_almacen;
      const loteProveedor = item.lote_proveedor_alternativo || item.lote_proveedor || pick?.lote_proveedor;
      const fechaVencimiento =
        item.fecha_vencimiento_alternativa || item.fecha_vencimiento || pick?.fecha_vencimiento;

      if (pickId) {
        await updateById("wms", "picking_detalle", pickId, {
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
      }

      await crearMovimiento({
        fecha: new Date().toISOString(),
        usuario,
        documento,
        codigo_material: pick?.sku || item.sku,
        ubicacion: ubicacionTomada,
        estado: "ALMACENADO",
        lote_almacen: loteAlmacen,
        lote_proveedor: loteProveedor,
        fecha_vencimiento: fechaVencimiento,
        cantidad_r: -Math.abs(cantidad),
      });

      return pickId;
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
    }).then(() => ({ mensaje: "Traslado registrado" }));
  }

  const sign = tipo === "AJUSTE_POSITIVO" ? 1 : -1;
  return crearMovimiento({
    ...comun,
    ubicacion: payload.ubicacion_origen,
    estado: "ALMACENADO",
    cantidad_r: sign * cantidad,
  }).then(() => ({ mensaje: "Ajuste registrado" }));
}

function buildInventarioCriterio(payload) {
  if (payload.tipo_conteo === "zona") return `ZONA:${payload.zona || ""}`;
  if (payload.tipo_conteo === "familia") return `FAMILIA:${payload.familia || ""}`;
  if (payload.tipo_conteo === "bodega_familia") {
    return `BODEGA:${payload.bodega || ""}${payload.familia ? ` · FAMILIA:${payload.familia}` : " · TODAS"}`;
  }
  return `MATERIAL:${payload.codigo_material || ""}`;
}

function filterInventarioStock(stockRows, payload) {
  if (payload.tipo_conteo === "zona") {
    return stockRows.filter((row) => normalizeText(row.zona) === normalizeText(payload.zona));
  }
  if (payload.tipo_conteo === "familia") {
    return stockRows.filter((row) => normalizeText(row.familia) === normalizeText(payload.familia));
  }
  if (payload.tipo_conteo === "bodega_familia") {
    return stockRows.filter(
      (row) =>
        normalizeText(row.bodega) === normalizeText(payload.bodega) &&
        (!payload.familia || normalizeText(row.familia) === normalizeText(payload.familia))
    );
  }
  return stockRows.filter(
    (row) => normalizeText(row.codigo_material || row.sku) === normalizeText(payload.codigo_material)
  );
}

export function crearTareaInventario(payload) {
  return getAllStockRows().then(async (stockRows) => {
    const items = filterInventarioStock(stockRows, payload);
    if (!items.length) throw new Error("No hay stock almacenado para ese criterio.");

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
  };
  if (params.asignado_a) query.asignado_a = `eq.${params.asignado_a}`;
  if (params.estado) query.estado = `eq.${params.estado}`;
  return selectAllRows("wms", "inventario_tareas", query);
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
  return selectAllRows("wms", "inventario_tarea_detalles", {
    empresa_id: `eq.${empresaId}`,
    tarea_id: `eq.${tareaId}`,
    select,
    order: "ubicacion.asc,codigo_material.asc,id.asc",
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




