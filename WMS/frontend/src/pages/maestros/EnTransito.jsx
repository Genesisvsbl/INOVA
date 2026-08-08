import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { showWmsAlert, showWmsConfirm, showWmsPrompt } from "../../wmsDialog.jsx";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  ubicarCantidadTransito,
  getEnTransito,
  getUbicaciones,
  getUbicacionesVacias,
} from "../../api";
import { exportarTransitoExcel } from "./transitoExcel";
import {
  Truck,
  Search,
  Download,
  Printer,
  Camera,
  CheckCircle,
  AlertTriangle,
  ImageUp,
  MapPin,
  X,
  Check,
} from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  bg: "#f3f6f9",
  text: "#1f2d3d",
  muted: "#6b7a90",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#2f6f44",
  goodBg: "#edf8f1",
  goodBd: "#cfe8d7",
  bad: "#b42318",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
  warn: "#9a6700",
  warnBg: "#fff6e5",
  warnBd: "#f1ddb0",
};

const pageStyle = {
  display: "grid",
  gap: 16,
  color: colors.text,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"',
};

const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  overflow: "hidden",
};

const panelHeaderStyle = {
  padding: "12px 14px",
  borderBottom: `1px solid ${colors.border}`,
  background: colors.soft,
  fontWeight: 700,
  color: "#1f3448",
  fontSize: 14,
};

const panelBodyStyle = {
  padding: 16,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7a8797",
  letterSpacing: ".04em",
  marginBottom: 6,
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  outline: "none",
  background: "#fff",
  color: colors.text,
  fontSize: 13,
  fontWeight: 500,
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #0b57d0",
  background: "#0b57d0",
  color: "#fff",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const tbInputStyle = {
  width: "100%",
  height: 38,
  padding: "0 10px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text,
  fontWeight: 600,
  fontSize: 14,
};

// Nivel = dígito justo antes del apóstrofe; Módulo = dos posiciones antes.
function codeUbic(u) {
  return String(u?.ubicacion || `${u?.ubicacion_base || ""}${u?.posicion || ""}`)
    .replace(/[´`’]/g, "'")
    .toUpperCase();
}
function nivelDeUbicacion(u) {
  const code = codeUbic(u);
  const ap = code.indexOf("'");
  return ap > 0 ? code[ap - 1] : "";
}
function moduloDeUbicacion(u) {
  const code = codeUbic(u);
  const ap = code.indexOf("'");
  return ap > 1 ? code[ap - 2] : "";
}
function pasilloDeUbicacion(u) {
  const code = codeUbic(u);
  const ap = code.indexOf("'");
  return ap > 2 ? code[ap - 3] : "";
}

// Rótulo de ubicación (10.16 x 5.08 cm) con cantidad en grande y código de
// barras (Code128) de la ubicación. Se imprime solo al cargar.
function buildRotuloUbicacionHtml({ logo, codigo, descripcion, lote, vencimiento, ubicacion, cantidad }) {
  const esc = (s) =>
    String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const venc = String(vencimiento || "").slice(0, 10);
  const ubic = String(ubicacion || "");
  const cant = cantidad === undefined || cantidad === null || cantidad === "" ? "-" : String(cantidad);
  return (
    `<html><head><meta charset="utf-8"><title>Rótulo de ubicación</title>` +
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>` +
    `<style>` +
    `@page{size:10.16cm 5.08cm;margin:0}` +
    `html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
    `*{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
    `.lbl{width:10.16cm;height:5.08cm;overflow:hidden;display:flex;flex-direction:column}` +
    `.hd{background:#000;color:#fff;display:flex;align-items:center;gap:2mm;padding:1.6mm 3mm}` +
    `.hd img{height:6mm}` +
    `.hd .t{font-size:11px;font-weight:800;letter-spacing:.3px;color:#fff}` +
    `.bd{flex:1;display:flex;flex-direction:column;padding:1.1mm 3mm 1.4mm}` +
    `.top{display:flex;justify-content:space-between;align-items:flex-start;gap:3mm}` +
    `.info{min-width:0;flex:1}` +
    `.cod{font-size:15px;font-weight:900;color:#000;line-height:1.02}` +
    `.desc{font-size:8.5px;font-weight:800;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` +
    `.meta{font-size:9px;font-weight:800;color:#000;margin-top:.3mm}` +
    `.meta b{color:#000;font-weight:900}` +
    `.qtybox{text-align:right;flex-shrink:0}` +
    `.lab{font-size:7.5px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:.5px}` +
    `.qty{font-size:32px;font-weight:900;color:#000;line-height:.95}` +
    `.ubwrap{text-align:center;margin-top:3mm}` +
    `.ub{font-size:31px;font-weight:900;color:#000;letter-spacing:2px;line-height:1}` +
    `.bcwrap{margin-top:auto}` +
    `.bcwrap svg{width:100%;height:48px;display:block}` +
    `</style></head><body>` +
    `<div class="lbl">` +
    `<div class="hd"><img src="${logo}" onerror="this.style.display='none'"/><div class="t">UBICACIÓN DE MATERIAL</div></div>` +
    `<div class="bd">` +
    `<div class="top">` +
    `<div class="info">` +
    `<div class="cod">${esc(codigo)}</div>` +
    `<div class="desc">${esc(descripcion)}</div>` +
    `<div class="meta">Lote <b>${esc(lote || "-")}</b> · Vence <b>${esc(venc || "-")}</b></div>` +
    `</div>` +
    `<div class="qtybox"><div class="lab">Cantidad</div><div class="qty">${esc(cant)}</div></div>` +
    `</div>` +
    `<div class="ubwrap"><div class="lab">Ubicación</div><div class="ub">${esc(ubic)}</div></div>` +
    `<div class="bcwrap"><svg id="bc"></svg></div>` +
    `</div></div>` +
    `<script>(function(){function go(){try{JsBarcode("#bc",${JSON.stringify(ubic)},{format:"CODE128",displayValue:false,height:40,width:1.5,margin:0});}catch(e){}setTimeout(function(){try{window.focus();window.print();}catch(e){}},250);}if(document.readyState==="complete"){go();}else{window.addEventListener("load",go);}window.onafterprint=function(){setTimeout(function(){try{window.close();}catch(e){}},150);};})();<\/script>` +
    `</body></html>`
  );
}

const iconButtonStyle = {
  height: 38,
  width: 38,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.blue,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtNumberCO(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return fmtCO.format(n);
}

function normalizeUbicacion(v) {
  return (v ?? "").toString().trim().toUpperCase();
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows) {
  const headers = [
    "id",
    "fecha",
    "usuario",
    "documento",
    "codigo_cita",
    "proveedor",
    "remesa",
    "orden_compra",
    "codigo_material",
    "descripcion_material",
    "unidad_medida",
    "familia",
    "um",
    "umb",
    "estado",
    "lote_almacen",
    "lote_proveedor",
    "fecha_fabricacion",
    "fecha_vencimiento",
    "cantidad",
  ];

  const esc = (x) => {
    const s = (x ?? "").toString().replaceAll('"', '""');
    return `"${s}"`;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];

  return lines.join("\n");
}

function StatusChip({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#f1f5f9", bd: "#e2e8f0", tx: colors.text },
    blue: { bg: "#eaf3ff", bd: "#cfe0ff", tx: colors.blue },
    green: { bg: colors.goodBg, bd: colors.goodBd, tx: colors.good },
    amber: { bg: colors.warnBg, bd: colors.warnBd, tx: colors.warn },
    red: { bg: colors.badBg, bd: colors.badBd, tx: colors.bad },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 5px",
        borderRadius: 999,
        fontSize: 8.5,
        lineHeight: 1,
        fontWeight: 900,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
        background: t.bg,
        color: t.tx,
      }}
    >
      {label}
    </span>
  );
}

function ModuleHeader({ title, subtitle, helper }) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${colors.border}`,
          background: "linear-gradient(to bottom, #fbfcfd, #f5f8fb)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#fff6e5",
              border: "1px solid #f1ddb0",
              flexShrink: 0,
            }}
          >
            <Truck size={18} color="#9a6700" />
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".08em",
                color: "#7a8797",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              En tránsito
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.1,
                color: "#17324d",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#5b6b7c",
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <div
          style={{
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 12px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            background: "#fff",
            color: colors.muted,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {helper}
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 8px",
  fontSize: 12.5,
  lineHeight: 1.15,
  color: "#607080",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 900,
  whiteSpace: "nowrap",
  wordBreak: "normal",
  background: "#fbfcfd",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const tdStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  lineHeight: 1.25,
  fontSize: 13,
};

// Filtro desplegable con checkboxes (multi-selección). Vacío = todas.
function MultiCheckFamilia({ options, selected, onChange, allLabel = "TODAS" }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const selSet = new Set(selected);
  const toggle = (val) => onChange(selSet.has(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  const resumen = selected.length === 0 ? allLabel : selected.length === 1 ? selected[0] : `${selected.length} familias`;
  const abrir = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen((o) => !o);
  };
  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={abrir}
        style={{
          height: 38, minWidth: 190, width: "100%", padding: "0 10px", borderRadius: 8,
          border: `1px solid ${selected.length ? colors.blue : colors.border}`, background: "#fff",
          color: colors.text, fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumen}</span>
        <span style={{ color: colors.muted, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && rect && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 3000 }} />
          <div style={{ position: "fixed", zIndex: 3001, top: rect.top, left: rect.left, minWidth: Math.max(rect.width, 220), maxHeight: 320, overflowY: "auto", background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 10, boxShadow: "0 12px 34px rgba(15,23,42,.18)", padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px 6px" }}>
              <button type="button" onClick={() => onChange(options.slice())} style={{ border: "none", background: "transparent", color: colors.blue, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Todas</button>
              <button type="button" onClick={() => onChange([])} style={{ border: "none", background: "transparent", color: colors.blue, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Limpiar</button>
            </div>
            {options.length === 0 && <div style={{ padding: 8, color: colors.muted, fontSize: 12 }}>Sin familias.</div>}
            {options.map((o) => {
              const on = selSet.has(o);
              return (
                <label key={o} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: on ? "#eef4ff" : "transparent", fontSize: 12.5 }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(o)} style={{ width: 15, height: 15, cursor: "pointer" }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function EnTransito() {
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [scanningId, setScanningId] = useState(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [ubicPorId, setUbicPorId] = useState({});
  const [validacionPorId, setValidacionPorId] = useState({});
  const [cantPorId, setCantPorId] = useState({}); // cantidad a ubicar por grupo
  const [familiasSel, setFamiliasSel] = useState([]); // familias marcadas (vacío = todas)

  // Toolbox de ubicaciones vacías (sugerencia estratégica al ubicar).
  const [tbRow, setTbRow] = useState(null); // material que se está ubicando
  const [tbBase, setTbBase] = useState("");
  const [tbZona, setTbZona] = useState("");
  const [tbList, setTbList] = useState([]);
  const [tbLoading, setTbLoading] = useState(false);
  const [tbSel, setTbSel] = useState("");
  const [tbBuscado, setTbBuscado] = useState(false);
  const [tbNivel, setTbNivel] = useState("");
  const [tbRack, setTbRack] = useState("");
  const [tbPasillo, setTbPasillo] = useState("");

  const basesUbic = useMemo(() => {
    const s = new Set();
    ubicaciones.forEach((u) => {
      const b = String(u.ubicacion_base || "").trim();
      if (b) s.add(b);
    });
    return Array.from(s).sort();
  }, [ubicaciones]);

  const zonasUbic = useMemo(() => {
    const s = new Set();
    ubicaciones.forEach((u) => {
      const b = String(u.ubicacion_base || "").trim();
      if (tbBase && b !== tbBase) return;
      const z = String(u.zona || "").trim();
      if (z) s.add(z);
    });
    return Array.from(s).sort();
  }, [ubicaciones, tbBase]);

  const tbUbicScope = useMemo(
    () =>
      (ubicaciones || []).filter(
        (u) =>
          (!tbBase || String(u.ubicacion_base || "").trim() === tbBase) &&
          (!tbZona || String(u.zona || "").trim() === tbZona)
      ),
    [ubicaciones, tbBase, tbZona]
  );
  const pasillosUbic = useMemo(
    () => [...new Set(tbUbicScope.map((u) => pasilloDeUbicacion(u)).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    [tbUbicScope]
  );
  const modulosUbic = useMemo(
    () => [...new Set(tbUbicScope.map((u) => moduloDeUbicacion(u)).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    [tbUbicScope]
  );
  const nivelesUbic = useMemo(
    () => [...new Set(tbUbicScope.map((u) => nivelDeUbicacion(u)).filter(Boolean))].sort((a, b) => Number(a) - Number(b)),
    [tbUbicScope]
  );

  const ubicacionesValidasSet = useMemo(() => {
    const set = new Set();

    ubicaciones.forEach((u) => {
      const codigo = normalizeUbicacion(u.ubicacion);
      if (codigo) set.add(codigo);
    });

    return set;
  }, [ubicaciones]);

  const cargarTodo = async () => {
    setLoading(true);
    setErr("");

    try {
      const [dataRows, dataUbis] = await Promise.all([
        getEnTransito(),
        getUbicaciones(),
      ]);

      const safeRows = Array.isArray(dataRows) ? dataRows : [];
      const safeUbis = Array.isArray(dataUbis) ? dataUbis : [];

      setRows(safeRows);
      setUbicaciones(safeUbis);

      const initUbic = {};
      const initVal = {};

      safeRows.forEach((r) => {
        initUbic[r.id] = "";
        initVal[r.id] = "empty";
      });

      setUbicPorId(initUbic);
      setValidacionPorId(initVal);
    } catch (e) {
      setErr(String(e?.message || e));
      setRows([]);
      setUbicaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((r) => {
      const hay = [
        r.usuario,
        r.documento,
        r.codigo_cita,
        r.proveedor,
        r.remesa,
        r.orden_compra,
        r.codigo_material,
        r.descripcion_material,
        r.unidad_medida,
        r.familia,
        r.um,
        r.umb,
        r.estado,
        r.lote_almacen,
        r.lote_proveedor,
        r.fecha_fabricacion,
        r.fecha_vencimiento,
        r.observacion,
      ]
        .map((x) => (x ?? "").toString().toLowerCase())
        .join(" | ");

      return hay.includes(needle);
    });
  }, [rows, q]);

  // Consolida las filas repetidas del MISMO lote en una sola (totaliza la
  // cantidad). Guarda los ids de origen para poder ubicar por cantidad después.
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const key = [
        r.codigo_material,
        r.lote_almacen,
        r.lote_proveedor,
        r.fecha_vencimiento,
        r.fecha_fabricacion,
        r.um,
        r.umb,
        r.observacion,
      ]
        .map((x) => String(x ?? "").trim())
        .join("¦");
      if (!map.has(key)) {
        map.set(key, { ...r, id: `g:${key}`, ids: [], cantidad: 0, count: 0 });
      }
      const g = map.get(key);
      g.ids.push(r.id);
      g.cantidad += Number(r.cantidad || 0);
      g.count += 1;
    });
    return Array.from(map.values());
  }, [filtered]);

  const familiasDisponibles = useMemo(() => {
    const set = new Set(grouped.map((g) => String(g.familia || "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [grouped]);

  // Vista final: filtrada por familias marcadas y ordenada por familia -> material
  // -> lote, para mostrar un encabezado de sección por cada familia.
  const groupedView = useMemo(() => {
    const famSet = new Set(familiasSel);
    const base = famSet.size === 0 ? grouped : grouped.filter((g) => famSet.has(String(g.familia || "").trim()));
    return base.slice().sort((a, b) => {
      const fa = String(a.familia || "~").toLowerCase();
      const fb = String(b.familia || "~").toLowerCase();
      if (fa !== fb) return fa.localeCompare(fb);
      const ma = String(a.codigo_material || "");
      const mb = String(b.codigo_material || "");
      if (ma !== mb) return ma.localeCompare(mb);
      return String(a.lote_almacen || "").localeCompare(String(b.lote_almacen || ""));
    });
  }, [grouped, familiasSel]);

  const totalQty = useMemo(() => {
    return filtered.reduce((acc, r) => acc + Number(r.cantidad || 0), 0);
  }, [filtered]);

  const validarUbicacion = (id, value) => {
    const codigo = normalizeUbicacion(value);

    if (!codigo) {
      setValidacionPorId((prev) => ({ ...prev, [id]: "empty" }));
      return false;
    }

    const existe = ubicacionesValidasSet.has(codigo);

    setValidacionPorId((prev) => ({
      ...prev,
      [id]: existe ? "valid" : "invalid",
    }));

    return existe;
  };

  const onChangeUbic = (id, value) => {
    const normalizada = normalizeUbicacion(value);

    setUbicPorId((prev) => ({ ...prev, [id]: normalizada }));

    if (!normalizada) {
      setValidacionPorId((prev) => ({ ...prev, [id]: "empty" }));
      return;
    }

    const existe = ubicacionesValidasSet.has(normalizada);

    setValidacionPorId((prev) => ({
      ...prev,
      [id]: existe ? "valid" : "invalid",
    }));
  };

  const pedirManual = async (id, mensaje = "Escribe o pega el código de ubicación:") => {
    const manual = await showWmsPrompt(mensaje);

    if (manual !== null) {
      onChangeUbic(id, manual);
    }
  };

  const crearReaderZXing = () => {
    return new BrowserMultiFormatReader();
  };

  const leerImagenUbicacion = async (file, id) => {
    if (!file || !id) return;

    const imageUrl = URL.createObjectURL(file);

    const fallbackManual = () => {
      pedirManual(
        id,
        "No se pudo decodificar automáticamente. Escribe o pega el código de ubicación:"
      );
    };

    try {
      const reader = crearReaderZXing();

      const img = document.createElement("img");
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const decodeCanvas = async (canvas) => {
        try {
          const result = await reader.decodeFromCanvas(canvas);
          return normalizeUbicacion(result?.getText?.() || result?.text || "");
        } catch {
          return "";
        }
      };

      const makeCanvas = ({
        scale = 4,
        padding = 120,
        threshold = false,
        invert = false,
      }) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth * scale + padding * 2;
        canvas.height = img.naturalHeight * scale + padding * 2;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img,
          padding,
          padding,
          img.naturalWidth * scale,
          img.naturalHeight * scale
        );

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          let lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

          if (threshold) {
            lum = lum > 145 ? 255 : 0;
          }

          if (invert) {
            lum = 255 - lum;
          }

          data[i] = lum;
          data[i + 1] = lum;
          data[i + 2] = lum;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
      };

      const intentos = [
        { scale: 2, padding: 80, threshold: false },
        { scale: 4, padding: 120, threshold: false },
        { scale: 6, padding: 160, threshold: false },
        { scale: 4, padding: 120, threshold: true },
        { scale: 6, padding: 160, threshold: true },
        { scale: 8, padding: 200, threshold: true },
        { scale: 4, padding: 120, threshold: true, invert: true },
        { scale: 6, padding: 160, threshold: true, invert: true },
      ];

      for (const config of intentos) {
        const canvas = makeCanvas(config);
        const value = await decodeCanvas(canvas);

        if (value) {
          onChangeUbic(id, value);
          return;
        }
      }

      try {
        const result = await reader.decodeFromImageElement(img);
        const value = normalizeUbicacion(result?.getText?.() || result?.text || "");

        if (value) {
          onChangeUbic(id, value);
          return;
        }
      } catch {
        // sigue fallback
      }

      fallbackManual();
    } catch {
      fallbackManual();
    } finally {
      URL.revokeObjectURL(imageUrl);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setUploadTargetId(null);
    }
  };

  const abrirSelectorImagen = (row) => {
    setUploadTargetId(row.id);

    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 0);
  };

  const escanearUbicacion = async (row) => {
    const id = row.id;

    if (!navigator.mediaDevices?.getUserMedia) {
      pedirManual(
        id,
        "Este dispositivo no permite abrir cámara desde el navegador. Escribe o pega el código de ubicación:"
      );
      return;
    }

    setScanningId(id);

    let reader = null;
    let controls = null;
    let overlay = null;
    let video = null;

    try {
      reader = crearReaderZXing();

      overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "99999";
      overlay.style.background = "rgba(15, 23, 42, 0.88)";
      overlay.style.display = "grid";
      overlay.style.placeItems = "center";
      overlay.style.padding = "18px";

      const box = document.createElement("div");
      box.style.width = "min(540px, 100%)";
      box.style.background = "#ffffff";
      box.style.borderRadius = "16px";
      box.style.overflow = "hidden";
      box.style.boxShadow = "0 18px 50px rgba(0,0,0,.25)";

      const header = document.createElement("div");
      header.style.padding = "14px 16px";
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.gap = "12px";
      header.style.borderBottom = "1px solid #e2e8f0";

      const title = document.createElement("div");
      title.innerText = "Escanear ubicación";
      title.style.fontWeight = "900";
      title.style.color = "#0f2744";

      const closeBtn = document.createElement("button");
      closeBtn.innerText = "Cerrar";
      closeBtn.style.height = "34px";
      closeBtn.style.padding = "0 12px";
      closeBtn.style.borderRadius = "8px";
      closeBtn.style.border = "1px solid #d9e2ec";
      closeBtn.style.background = "#fff";
      closeBtn.style.fontWeight = "800";
      closeBtn.style.cursor = "pointer";

      const body = document.createElement("div");
      body.style.padding = "14px";

      const help = document.createElement("div");
      help.innerText = "Apunta la cámara al código QR o código de barras de la ubicación.";
      help.style.fontSize = "13px";
      help.style.fontWeight = "700";
      help.style.color = "#64748B";
      help.style.marginBottom = "12px";

      video = document.createElement("video");
      video.setAttribute("playsinline", "true");
      video.muted = true;
      video.style.width = "100%";
      video.style.maxHeight = "420px";
      video.style.objectFit = "cover";
      video.style.borderRadius = "12px";
      video.style.background = "#000";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "10px";
      actions.style.flexWrap = "wrap";
      actions.style.marginTop = "12px";

      const manualBtn = document.createElement("button");
      manualBtn.innerText = "Ingresar manual";
      manualBtn.style.height = "38px";
      manualBtn.style.padding = "0 14px";
      manualBtn.style.borderRadius = "8px";
      manualBtn.style.border = "1px solid #0b57d0";
      manualBtn.style.background = "#0b57d0";
      manualBtn.style.color = "#fff";
      manualBtn.style.fontWeight = "800";
      manualBtn.style.cursor = "pointer";

      const subirBtn = document.createElement("button");
      subirBtn.innerText = "Subir foto";
      subirBtn.style.height = "38px";
      subirBtn.style.padding = "0 14px";
      subirBtn.style.borderRadius = "8px";
      subirBtn.style.border = "1px solid #d9e2ec";
      subirBtn.style.background = "#fff";
      subirBtn.style.color = "#1f2d3d";
      subirBtn.style.fontWeight = "800";
      subirBtn.style.cursor = "pointer";

      const cleanup = () => {
        try {
          if (controls?.stop) controls.stop();
        } catch {
          // no hacer nada
        }

        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        setScanningId(null);
      };

      closeBtn.onclick = cleanup;

      manualBtn.onclick = async () => {
        const manual = await showWmsPrompt("Escribe o pega el código de ubicación:");
        if (manual !== null) {
          onChangeUbic(id, manual);
          cleanup();
        }
      };

      subirBtn.onclick = () => {
        cleanup();
        abrirSelectorImagen(row);
      };

      actions.appendChild(manualBtn);
      actions.appendChild(subirBtn);

      header.appendChild(title);
      header.appendChild(closeBtn);
      body.appendChild(help);
      body.appendChild(video);
      body.appendChild(actions);
      box.appendChild(header);
      box.appendChild(body);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      let selectedDeviceId = undefined;

      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const backCamera =
          devices.find((d) => /back|rear|environment|trasera/i.test(d.label)) ||
          devices[devices.length - 1];

        selectedDeviceId = backCamera?.deviceId;
      } catch {
        selectedDeviceId = undefined;
      }

      controls = await reader.decodeFromVideoDevice(
        selectedDeviceId,
        video,
        (result) => {
          const value = result?.getText?.() || result?.text || "";

          if (value) {
            onChangeUbic(id, value);
            cleanup();
          }
        }
      );
    } catch {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      pedirManual(
        id,
        "No se pudo abrir la cámara. Escribe o pega el código de ubicación:"
      );

      setScanningId(null);
    }
  };

  const onExport = () => {
    const csv = toCSV(filtered);
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    downloadText(`en_transito_${yyyy}-${mm}-${dd}.csv`, csv);
  };

  const [exportandoExcel, setExportandoExcel] = useState(false);
  const onExportExcel = async () => {
    if (!groupedView.length) return;
    setExportandoExcel(true);
    try {
      await exportarTransitoExcel({ rows: groupedView });
    } catch (e) {
      showWmsAlert("No se pudo exportar el Excel:\n" + (e?.message || e));
    } finally {
      setExportandoExcel(false);
    }
  };

  const buildPrintHtml = () => {
    const rowsHtml = filtered
      .map(
        (r) => `
        <tr>
          <td>${fmtDateTime(r.fecha)}</td>
          <td>${r.estado || "EN_TRANSITO"}</td>
          <td>${r.usuario || ""}</td>
          <td>${r.documento || ""}</td>
          <td>${r.codigo_cita || ""}</td>
          <td>${r.proveedor || ""}</td>
          <td>${r.codigo_material || ""}</td>
          <td>${r.descripcion_material || ""}</td>
          <td>${r.um || r.unidad_medida || ""}</td>
          <td>${r.lote_almacen || ""}</td>
          <td>${r.lote_proveedor || ""}</td>
          <td>${r.fecha_vencimiento || ""}</td>
          <td>${r.observacion || ""}</td>
          <td style="text-align:right;">${fmtNumberCO(r.cantidad)}</td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Soporte Materiales en Tránsito</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; }
            .sheet { width: 100%; padding: 0; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #072B5A; padding-bottom: 10px; margin-bottom: 14px; }
            .header-left { display: flex; align-items: center; gap: 14px; }
            .logo { display: inline-block; width: 132px; height: 42px; background-color: #072B5A; -webkit-mask: url("${window.location.origin}/inova-azul.png") left center / contain no-repeat; mask: url("${window.location.origin}/inova-azul.png") left center / contain no-repeat; }
            .title { margin: 0; font-size: 22px; font-weight: 900; color: #072B5A; }
            .subtitle { margin-top: 4px; font-size: 12px; color: #64748B; }
            .meta { text-align: right; font-size: 12px; font-weight: 700; color: #0f172a; }
            .summary { display: flex; gap: 12px; margin-bottom: 14px; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; min-width: 180px; }
            .box-label { font-size: 10px; font-weight: 800; color: #64748B; }
            .box-value { margin-top: 4px; font-size: 18px; font-weight: 900; color: #072B5A; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 7px; vertical-align: top; }
            th { background: #e2e8f0; font-weight: 800; text-align: left; }
            .footer { margin-top: 12px; font-size: 10px; color: #64748B; }
            tr { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="header-left">
                <span class="logo" role="img" aria-label="INOVA"></span>
                <div>
                  <h1 class="title">SOPORTE DE MATERIALES EN TRÁNSITO</h1>
                  <div class="subtitle">Material pendiente por ubicación definitiva</div>
                </div>
              </div>

              <div class="meta">
                <div>Fecha impresión: ${fmtDateTime(new Date())}</div>
                <div>Total registros: ${filtered.length}</div>
              </div>
            </div>

            <div class="summary">
              <div class="box">
                <div class="box-label">REGISTROS PENDIENTES</div>
                <div class="box-value">${filtered.length}</div>
              </div>
              <div class="box">
                <div class="box-label">CANTIDAD TOTAL</div>
                <div class="box-value">${fmtNumberCO(totalQty)}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Usuario</th>
                  <th>Documento</th>
                  <th>Código Cita</th>
                  <th>Proveedor</th>
                  <th>Material</th>
                  <th>Descripción</th>
                  <th>UM</th>
                  <th>Lote Almacén</th>
                  <th>Lote Proveedor</th>
                  <th>F. Vencimiento</th>
                  <th>Observación</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
              Documento generado desde la hoja de materiales en tránsito del WMS.
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const onPrint = () => {
    const printWindow = window.open("", "_blank", "width=1400,height=900");

    if (!printWindow) {
      showWmsAlert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // ---- Toolbox de ubicaciones vacías ----
  const abrirToolbox = async (row) => {
    setTbRow(row);
    setTbBase("");
    setTbZona("");
    setTbNivel("");
    setTbRack("");
    setTbPasillo("");
    setTbList([]);
    setTbSel("");
    // Al abrir, ya trae la ubicación SUGERIDA (primera vacía) para no hacerlo
    // uno por uno, como en Recibo.
    setTbBuscado(true);
    setTbLoading(true);
    try {
      const list = await getUbicacionesVacias(null, null);
      setTbList(list || []);
      setTbSel(list && list.length ? normalizeUbicacion(list[0].ubicacion) : "");
    } catch {
      setTbList([]);
      setTbSel("");
    } finally {
      setTbLoading(false);
    }
  };

  const cerrarToolbox = () => {
    setTbRow(null);
    setTbList([]);
    setTbSel("");
    setTbBuscado(false);
    setTbNivel("");
    setTbRack("");
    setTbPasillo("");
  };

  const consultarVacias = async () => {
    setTbLoading(true);
    setTbBuscado(true);
    try {
      const list = await getUbicacionesVacias(tbBase || null, tbZona || null);
      setTbList(list || []);
      const filtr = (list || []).filter(
        (u) =>
          (!tbPasillo || pasilloDeUbicacion(u) === tbPasillo) &&
          (!tbRack || moduloDeUbicacion(u) === tbRack) &&
          (!tbNivel || nivelDeUbicacion(u) === tbNivel)
      );
      setTbSel(filtr.length ? normalizeUbicacion(filtr[0].ubicacion) : "");
    } catch (e) {
      showWmsAlert("Error consultando ubicaciones vacías:\n" + (e?.message || e));
      setTbList([]);
      setTbSel("");
    } finally {
      setTbLoading(false);
    }
  };

  const imprimirSugerido = () => {
    if (!tbRow || !tbSel) {
      showWmsAlert("Selecciona una ubicación sugerida primero.");
      return;
    }
    const w = window.open("", "_blank", "width=560,height=420");
    if (!w) {
      showWmsAlert("El navegador bloqueó la ventana de impresión.");
      return;
    }
    const logo = `${window.location.origin}/INOVA2026.png`;
    const html = buildRotuloUbicacionHtml({
      logo,
      codigo: tbRow.codigo_material || "",
      descripcion: tbRow.descripcion_material || "",
      lote: tbRow.lote_almacen || tbRow.lote_proveedor || "",
      vencimiento: tbRow.fecha_vencimiento || "",
      ubicacion: tbSel,
      cantidad: cantPorId[tbRow.id] ?? tbRow.cantidad ?? tbRow.cantidad_r ?? "",
    });
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // La ventana se imprime sola (tras generar el código de barras).
  };

  const guardarDesdeToolbox = async () => {
    if (!tbRow) return;
    const ubicacion = normalizeUbicacion(tbSel);
    if (!ubicacion) {
      showWmsAlert("Selecciona o escribe una ubicación.");
      return;
    }
    if (!ubicacionesValidasSet.has(ubicacion)) {
      showWmsAlert(`La ubicación "${ubicacion}" no existe en la lista válida.`);
      return;
    }
    const disponible = Number(tbRow.cantidad || 0);
    const cantidad = Math.min(Number(cantPorId[tbRow.id] ?? disponible) || 0, disponible);
    if (cantidad <= 0) {
      showWmsAlert("Indica una cantidad válida a ubicar (mayor que 0).");
      return;
    }
    setSavingId(tbRow.id);
    try {
      const ids = tbRow.ids || [tbRow.id];
      const res = await ubicarCantidadTransito(ids, cantidad, ubicacion);
      const restante = res?.restante ?? 0;
      showWmsAlert(
        `Ubicadas ${fmtNumberCO(res?.asignado ?? cantidad)} un. de ${tbRow.codigo_material} en ${ubicacion}.` +
          (restante > 0 ? `\nQuedan ${fmtNumberCO(restante)} un. en tránsito de este lote.` : "")
      );
      setCantPorId((prev) => ({ ...prev, [tbRow.id]: undefined }));
      cerrarToolbox();
      await cargarTodo();
    } catch (e) {
      showWmsAlert("Error asignando ubicación:\n" + (e?.message || e));
    } finally {
      setSavingId(null);
    }
  };

  const asignarUbicacion = async (row) => {
    const ubicacion = normalizeUbicacion(ubicPorId[row.id]);

    if (!ubicacion) {
      showWmsAlert("Debes escribir, seleccionar, escanear o subir foto de una ubicación.");
      return;
    }

    const esValida = validarUbicacion(row.id, ubicacion);

    if (!esValida) {
      showWmsAlert(
        `La ubicación "${ubicacion}" no existe en la lista de ubicaciones válidas. Verifica el código.`
      );
      return;
    }

    const disponible = Number(row.cantidad || 0);
    const cantidad = Math.min(Number(cantPorId[row.id] ?? disponible) || 0, disponible);
    if (cantidad <= 0) {
      showWmsAlert("Indica una cantidad válida a ubicar (mayor que 0).");
      return;
    }

    setSavingId(row.id);

    try {
      const ids = row.ids || [row.id];
      const res = await ubicarCantidadTransito(ids, cantidad, ubicacion);
      const restante = res?.restante ?? 0;
      showWmsAlert(
        `Ubicadas ${fmtNumberCO(res?.asignado ?? cantidad)} un. de ${row.codigo_material} en ${ubicacion}.` +
          (restante > 0 ? `\nQuedan ${fmtNumberCO(restante)} un. en tránsito de este lote.` : "")
      );
      setCantPorId((prev) => ({ ...prev, [row.id]: undefined }));
      await cargarTodo();
    } catch (e) {
      showWmsAlert("Error asignando ubicación:\n" + (e?.message || e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={pageStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTargetId) {
            leerImagenUbicacion(file, uploadTargetId);
          }
        }}
      />

      <ModuleHeader
        title="Materiales sin ubicación asignada"
        subtitle="Listado operativo de material pendiente por ubicar y asignación definitiva."
        helper="Pendiente por ubicar"
      />

      <div style={panelStyle}>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 1fr) auto auto auto auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabelStyle}>Buscar</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  background: "#fff",
                  height: 38,
                  padding: "0 12px",
                }}
              >
                <Search size={15} color={colors.muted} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Documento, proveedor, material, lote, usuario..."
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    height: "100%",
                    color: colors.text,
                    fontSize: 13,
                    background: "transparent",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={fieldLabelStyle}>Familia</div>
              <MultiCheckFamilia
                options={familiasDisponibles}
                selected={familiasSel}
                onChange={setFamiliasSel}
                allLabel="TODAS"
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {[
                { k: "Lotes", v: fmtNumberCO(groupedView.length), c: colors.navy },
                { k: "Unidades", v: fmtNumberCO(totalQty), c: colors.blue },
              ].map((s) => (
                <div
                  key={s.k}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1px solid ${colors.border}`,
                    background: "#fff",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: ".03em" }}>{s.k}</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: s.c }}>{s.v}</span>
                </div>
              ))}
            </div>

            <button onClick={onExportExcel} disabled={exportandoExcel} style={secondaryButtonStyle}>
              <Download size={15} />
              {exportandoExcel ? "Generando…" : "Exportar Excel"}
            </button>

            <button onClick={onPrint} style={primaryButtonStyle}>
              <Printer size={15} />
              Imprimir soporte
            </button>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div
          style={{
            ...panelHeaderStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>Listado pendiente por ubicar</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {loading && <StatusChip label="Cargando" tone="amber" />}
            {err && <StatusChip label="Fallo API" tone="red" />}
            {!loading && !err && <StatusChip label="EN TRANSITO" tone="amber" />}
          </div>
        </div>

        <div style={{ overflow: "auto", width: "100%", maxHeight: "68vh", border: `1px solid ${colors.border}`, borderRadius: 10 }}>
          <table style={{ width: "100%", minWidth: 1400, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "5.8%" }}>Fecha</th>
                <th style={{ ...thStyle, width: "5.8%" }}>Estado</th>
                <th style={{ ...thStyle, width: "4.7%" }}>Usuario</th>
                <th style={{ ...thStyle, width: "4.8%" }}>Material</th>
                <th style={{ ...thStyle, width: "15.8%" }}>Descripción</th>
                <th style={{ ...thStyle, width: "3.5%" }}>Unidad</th>
                <th style={{ ...thStyle, width: "5.8%" }}>Familia</th>
                <th style={{ ...thStyle, width: "2.7%" }}>UM</th>
                <th style={{ ...thStyle, width: "3%" }}>UMB</th>
                <th style={{ ...thStyle, width: "7.1%" }}>Lote almacén</th>
                <th style={{ ...thStyle, width: "6.2%" }}>Lote proveedor</th>
                <th style={{ ...thStyle, width: "5.4%" }}>F. fabricación</th>
                <th style={{ ...thStyle, width: "5.4%" }}>F. vencimiento</th>
                <th style={{ ...thStyle, width: "9%" }}>Observación (dónde queda)</th>
                <th style={{ ...thStyle, width: "4.8%", textAlign: "right" }}>Cantidad</th>
                <th style={{ ...thStyle, width: "8.4%" }}>Asignar ubicación</th>
                <th style={{ ...thStyle, width: "3.8%", textAlign: "center" }}>Valid.</th>
                <th style={{ ...thStyle, width: "3%", textAlign: "center" }}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td colSpan={17} style={tdStyle}>
                    No hay materiales en tránsito.
                  </td>
                </tr>
              )}

              {groupedView.map((r, idx) => {
                const estadoValidacion = validacionPorId[r.id] || "empty";
                const cantAUbicar = cantPorId[r.id] ?? r.cantidad;
                const famActual = String(r.familia || "").trim() || "(sin familia)";
                const famAnterior = idx > 0 ? (String(groupedView[idx - 1].familia || "").trim() || "(sin familia)") : null;
                const nuevaFamilia = famActual !== famAnterior;
                const famRows = groupedView.filter((g) => (String(g.familia || "").trim() || "(sin familia)") === famActual);
                const famTotal = famRows.reduce((acc, g) => acc + Number(g.cantidad || 0), 0);

                return (
                  <Fragment key={r.id}>
                    {nuevaFamilia && (
                      <tr>
                        <td
                          colSpan={18}
                          style={{
                            background: "#eef2fb",
                            borderTop: `2px solid ${colors.navy}`,
                            borderBottom: `1px solid ${colors.border}`,
                            padding: "7px 12px",
                            fontWeight: 900,
                            color: colors.navy,
                            fontSize: 13.5,
                            letterSpacing: ".02em",
                          }}
                        >
                          {famActual}
                          <span style={{ fontWeight: 700, color: colors.muted, fontSize: 11.5, marginLeft: 10 }}>
                            {famRows.length} lote(s) · {fmtNumberCO(famTotal)} un.
                          </span>
                        </td>
                      </tr>
                    )}
                  <tr
                    onClick={(e) => {
                      if (e.target.closest("input,button,select,textarea,a")) return;
                      abrirToolbox(r);
                    }}
                    style={{ cursor: "pointer" }}
                    title="Clic en la línea para almacenar (abre el panel con la ubicación sugerida)"
                  >
                    <td style={{ ...tdStyle, fontSize: 13 }}>{fmtDateTime(r.fecha)}</td>
                    <td style={{ ...tdStyle, padding: "5px 2px", whiteSpace: "nowrap" }}>
                      <StatusChip label="EN TRÁNSITO" tone="amber" />
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.usuario || ""}</td>
                    <td style={{ ...tdStyle, fontWeight: 900, color: colors.navy, fontSize: 14 }}>
                      {r.codigo_material || ""}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13, lineHeight: 1.08 }}>{r.descripcion_material || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.unidad_medida || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13, lineHeight: 1.05 }}>{r.familia || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.um || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.umb || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.lote_almacen || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.lote_proveedor || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.fecha_fabricacion || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{r.fecha_vencimiento || ""}</td>
                    <td
                      style={{
                        ...tdStyle,
                        fontSize: 13,
                        fontWeight: 700,
                        color: r.observacion ? "#9a6700" : colors.muted,
                        whiteSpace: "normal",
                        lineHeight: 1.1,
                      }}
                      title={r.observacion || ""}
                    >
                      {r.observacion || "—"}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 900,
                        color: colors.good,
                        fontSize: 14,
                      }}
                    >
                      {fmtNumberCO(r.cantidad)}
                      {r.count > 1 && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: colors.muted }}>
                          {r.count} registros
                        </div>
                      )}
                    </td>

                    <td style={{ ...tdStyle, padding: "5px 3px" }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cantAUbicar === "" ? "" : fmtNumberCO(cantAUbicar)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^\d]/g, "");
                          const val = digits ? Math.min(parseInt(digits, 10), Number(r.cantidad || 0)) : "";
                          setCantPorId((prev) => ({ ...prev, [r.id]: val }));
                        }}
                        title="Cantidad a ubicar (máx. el total del lote)"
                        placeholder="Cant. a ubicar"
                        style={{ ...inputStyle, width: "100%", height: 22, padding: "0 4px", fontSize: 10, marginBottom: 3, textAlign: "right", fontWeight: 800 }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 20px 20px", gap: 3, alignItems: "center" }}>
                        <input
                          list="ubicacionesListEnTransito"
                          value={ubicPorId[r.id] || ""}
                          onChange={(e) => onChangeUbic(r.id, e.target.value)}
                          placeholder="Ubicación"
                          style={{
                            ...inputStyle,
                            width: "100%",
                            minWidth: 0,
                            height: 22,
                            padding: "0 4px",
                            fontSize: 8,
                            borderColor:
                              estadoValidacion === "valid"
                                ? colors.goodBd
                                : estadoValidacion === "invalid"
                                  ? colors.badBd
                                  : colors.border,
                            background:
                              estadoValidacion === "valid"
                                ? colors.goodBg
                                : estadoValidacion === "invalid"
                                  ? colors.badBg
                                  : "#fff",
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => escanearUbicacion(r)}
                          disabled={scanningId === r.id}
                          title="Escanear con cámara"
                          style={{
                            ...iconButtonStyle,
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            borderRadius: 6,
                            padding: 0,
                            opacity: scanningId === r.id ? 0.65 : 1,
                            cursor: scanningId === r.id ? "not-allowed" : "pointer",
                          }}
                        >
                          <Camera size={9} />
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirSelectorImagen(r)}
                          title="Subir foto del código"
                          style={{
                            ...iconButtonStyle,
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            borderRadius: 6,
                            padding: 0,
                          }}
                        >
                          <ImageUp size={9} />
                        </button>
                      </div>
                    </td>

                    <td style={{ ...tdStyle, textAlign: "center", fontSize: 8, padding: "4px 1px", whiteSpace: "nowrap" }}>
                      {estadoValidacion === "valid" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: colors.good,
                            fontWeight: 800,
                          }}
                        >
                          <CheckCircle size={8} />
                          OK
                        </span>
                      )}

                      {estadoValidacion === "invalid" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: colors.bad,
                            fontWeight: 800,
                          }}
                        >
                          <AlertTriangle size={8} />
                          NO
                        </span>
                      )}

                      {estadoValidacion === "empty" && (
                        <span style={{ color: colors.muted, fontWeight: 700 }}>
                          Pend.
                        </span>
                      )}
                    </td>

                    <td style={{ ...tdStyle, textAlign: "center", padding: "4px 1px" }}>
                      <div style={{ display: "flex", gap: 3, justifyContent: "center", alignItems: "center" }}>
                        <button
                          onClick={() => asignarUbicacion(r)}
                          disabled={savingId === r.id}
                          style={{
                            ...primaryButtonStyle,
                            height: 22,
                            minHeight: 22,
                            padding: "0 6px",
                            fontSize: 8,
                            borderRadius: 6,
                            opacity: savingId === r.id ? 0.7 : 1,
                          }}
                        >
                          {savingId === r.id ? "..." : "Asignar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirToolbox(r)}
                          title="Buscar ubicaciones vacías (sugerencia)"
                          style={{
                            height: 22,
                            minHeight: 22,
                            padding: "0 5px",
                            fontSize: 8,
                            borderRadius: 6,
                            border: `1px solid ${colors.blue}`,
                            background: "#fff",
                            color: colors.blue,
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <MapPin size={9} /> Vacías
                        </button>
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <datalist id="ubicacionesListEnTransito">
            {ubicaciones.map((u) => (
              <option key={u.id} value={normalizeUbicacion(u.ubicacion)}>
                {normalizeUbicacion(u.ubicacion)}
              </option>
            ))}
          </datalist>
        </div>

        {tbRow && (
          <div
            onClick={cerrarToolbox}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,.5)",
              display: "grid",
              placeItems: "center",
              zIndex: 1000,
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(760px, 96vw)",
                maxHeight: "90vh",
                overflow: "auto",
                background: "#fff",
                borderRadius: 16,
                boxShadow: "0 24px 70px rgba(8,14,30,.4)",
                border: "1px solid #e7ecf4",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  color: colors.navy,
                  padding: "16px 18px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: `3px solid ${colors.navy}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    aria-label="INOVA"
                    style={{
                      display: "inline-block",
                      width: 132,
                      height: 40,
                      backgroundColor: colors.navy,
                      WebkitMask: "url(/inova-azul.png) left center / contain no-repeat",
                      mask: "url(/inova-azul.png) left center / contain no-repeat",
                    }}
                  />
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", color: colors.navy }}>
                    SISTEMA WMS
                    <small style={{ display: "block", color: colors.muted, fontWeight: 700, letterSpacing: ".08em" }}>
                      Gestión de inventarios
                    </small>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900, fontSize: 15, color: colors.navy }}>Almacenar material</div>
                    <div style={{ fontSize: 11, color: colors.muted, fontWeight: 700 }}>Ubicación sugerida</div>
                  </div>
                  <button
                    type="button"
                    onClick={cerrarToolbox}
                    style={{ width: 32, height: 32, borderRadius: 9, background: "#f1f5fa", border: "none", color: colors.navy, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div style={{ padding: 18 }}>
                <div style={{ background: "#f7f9fd", border: "1px solid #e7ecf4", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: colors.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>Material</div>
                  <div style={{ fontSize: 15.5, fontWeight: 900, color: colors.navy, marginTop: 1 }}>
                    {tbRow.codigo_material} — {tbRow.descripcion_material}
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8, fontSize: 12.5, color: colors.text }}>
                    <span>Familia: <b>{tbRow.familia || "-"}</b></span>
                    <span>Lote: <b>{tbRow.lote_almacen || tbRow.lote_proveedor || "-"}</b></span>
                    <span>Vence: <b>{(tbRow.fecha_vencimiento || "-").toString().slice(0, 10)}</b></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: colors.muted, textTransform: "uppercase" }}>Cantidad a ubicar</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={fmtNumberCO(cantPorId[tbRow.id] ?? tbRow.cantidad)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^\d]/g, "");
                        const val = digits ? Math.min(parseInt(digits, 10), Number(tbRow.cantidad || 0)) : "";
                        setCantPorId((prev) => ({ ...prev, [tbRow.id]: val }));
                      }}
                      style={{ ...tbInputStyle, width: 130, textAlign: "right", fontWeight: 800 }}
                    />
                    <span style={{ fontSize: 12, color: colors.muted }}>de {fmtNumberCO(tbRow.cantidad)} en el lote</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>BASE</div>
                    <select
                      value={tbBase}
                      onChange={(e) => {
                        setTbBase(e.target.value);
                        setTbZona("");
                        setTbBuscado(false);
                      }}
                      style={tbInputStyle}
                    >
                      <option value="">Todas</option>
                      {basesUbic.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: "1 1 160px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>ZONA</div>
                    <select value={tbZona} onChange={(e) => { setTbZona(e.target.value); setTbBuscado(false); }} style={tbInputStyle}>
                      <option value="">Todas</option>
                      {zonasUbic.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: "1 1 100px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>PASILLO</div>
                    <select
                      value={tbPasillo}
                      onChange={(e) => {
                        const ps = e.target.value;
                        setTbPasillo(ps);
                        const view = tbList.filter((u) => (!ps || pasilloDeUbicacion(u) === ps) && (!tbRack || moduloDeUbicacion(u) === tbRack) && (!tbNivel || nivelDeUbicacion(u) === tbNivel));
                        setTbSel(view.length ? normalizeUbicacion(view[0].ubicacion) : "");
                      }}
                      style={tbInputStyle}
                    >
                      <option value="">Todos</option>
                      {pasillosUbic.map((ps) => (
                        <option key={ps} value={ps}>Pasillo {ps}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: "1 1 100px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>MÓDULO</div>
                    <select
                      value={tbRack}
                      onChange={(e) => {
                        const rk = e.target.value;
                        setTbRack(rk);
                        const view = tbList.filter((u) => (!tbPasillo || pasilloDeUbicacion(u) === tbPasillo) && (!rk || moduloDeUbicacion(u) === rk) && (!tbNivel || nivelDeUbicacion(u) === tbNivel));
                        setTbSel(view.length ? normalizeUbicacion(view[0].ubicacion) : "");
                      }}
                      style={tbInputStyle}
                    >
                      <option value="">Todos</option>
                      {modulosUbic.map((rk) => (
                        <option key={rk} value={rk}>Módulo {rk}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: "1 1 100px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>NIVEL</div>
                    <select
                      value={tbNivel}
                      onChange={(e) => {
                        const nv = e.target.value;
                        setTbNivel(nv);
                        const view = tbList.filter((u) => (!tbPasillo || pasilloDeUbicacion(u) === tbPasillo) && (!tbRack || moduloDeUbicacion(u) === tbRack) && (!nv || nivelDeUbicacion(u) === nv));
                        setTbSel(view.length ? normalizeUbicacion(view[0].ubicacion) : "");
                      }}
                      style={tbInputStyle}
                    >
                      <option value="">Todos</option>
                      {nivelesUbic.map((n) => (
                        <option key={n} value={n}>Nivel {n}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button
                      type="button"
                      onClick={consultarVacias}
                      disabled={tbLoading}
                      style={{
                        ...primaryButtonStyle,
                        height: 38,
                        padding: "0 16px",
                        borderRadius: 8,
                        opacity: tbLoading ? 0.7 : 1,
                      }}
                    >
                      <Search size={15} /> {tbLoading ? "Buscando..." : "Consultar vacías"}
                    </button>
                  </div>
                </div>

                {tbBuscado && !tbLoading && (() => {
                  const tbView = tbList.filter((u) => (!tbPasillo || pasilloDeUbicacion(u) === tbPasillo) && (!tbRack || moduloDeUbicacion(u) === tbRack) && (!tbNivel || nivelDeUbicacion(u) === tbNivel));
                  const filtroTxt = `${tbPasillo ? ` / pasillo ${tbPasillo}` : ""}${tbRack ? ` / módulo ${tbRack}` : ""}${tbNivel ? ` / nivel ${tbNivel}` : ""}`;
                  return (
                  <div style={{ marginTop: 16 }}>
                    {tbView.length === 0 ? (
                      <div style={{ padding: 14, color: colors.muted, fontWeight: 600 }}>
                        No hay ubicaciones vacías para esa base/zona{filtroTxt}.
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: colors.text, marginBottom: 8 }}>
                          <b>{tbView.length}</b> ubicación(es) libre(s){filtroTxt}. Sugerida:{" "}
                          <b style={{ color: colors.blue }}>{tbSel || "-"}</b> — puedes cambiarla abajo.
                        </div>
                        <div style={{ maxHeight: 260, overflow: "auto", border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                          {tbView.map((u) => {
                            const code = normalizeUbicacion(u.ubicacion);
                            const sel = code === tbSel;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => setTbSel(code)}
                                style={{
                                  display: "flex",
                                  width: "100%",
                                  textAlign: "left",
                                  gap: 10,
                                  alignItems: "center",
                                  padding: "9px 12px",
                                  border: "none",
                                  borderBottom: `1px solid ${colors.border}`,
                                  background: sel ? "#eef4ff" : "#fff",
                                  cursor: "pointer",
                                }}
                              >
                                <span style={{ width: 16, color: colors.blue }}>{sel ? <Check size={16} /> : null}</span>
                                <span style={{ fontWeight: 800, color: colors.navy, minWidth: 120 }}>{code}</span>
                                <span style={{ fontSize: 12, color: colors.muted }}>
                                  Base {u.ubicacion_base || "-"} · Pos {u.posicion || "-"} · Zona {u.zona || "-"} · {u.bodega || "-"}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={imprimirSugerido}
                            disabled={!tbSel}
                            style={{
                              height: 40,
                              padding: "0 16px",
                              borderRadius: 8,
                              border: `1px solid ${colors.navy}`,
                              background: "#fff",
                              color: colors.navy,
                              fontWeight: 800,
                              cursor: tbSel ? "pointer" : "not-allowed",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Printer size={16} /> Imprimir rótulo
                          </button>
                          <button
                            type="button"
                            onClick={guardarDesdeToolbox}
                            disabled={!tbSel || savingId === tbRow.id}
                            style={{
                              height: 40,
                              padding: "0 20px",
                              borderRadius: 10,
                              border: "1px solid #0f9d58",
                              background: "linear-gradient(135deg,#22c55e,#12a150)",
                              color: "#fff",
                              fontWeight: 800,
                              cursor: tbSel ? "pointer" : "not-allowed",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 8px 18px rgba(18,161,80,.32)",
                              opacity: savingId === tbRow.id ? 0.7 : 1,
                            }}
                          >
                            <Check size={16} /> {savingId === tbRow.id ? "Guardando..." : "Confirmar y guardar aquí"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {err && (
          <div
            style={{
              padding: 14,
              color: colors.bad,
              fontWeight: 700,
              borderTop: `1px solid ${colors.border}`,
              background: colors.badBg,
            }}
          >
            Error API: {err}
          </div>
        )}
      </div>

      <div style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>
        Desde esta hoja puedes exportar CSV, imprimir soporte, usar lector físico,
        cámara o foto para asignar ubicación definitiva al material pendiente.
      </div>
    </div>
  );
}
