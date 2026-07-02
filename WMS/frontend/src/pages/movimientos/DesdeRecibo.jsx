import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { showWmsAlert, showWmsConfirm, showWmsPrompt } from "../../wmsDialog.jsx";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  crearMovimiento,
  crearRotulosBulk,
  getUbicaciones,
  guardarCertificadosCalidad,
  sugerirUbicaciones,
} from "../../api";
import {
  ArrowLeft,
  Save,
  Truck,
  MapPinned,
  AlertTriangle,
  Boxes,
  Camera,
  ImageUp,
  X,
} from "lucide-react";

const DRAFT_KEY = "wms_recibo_draft";

const colors = {
  navy: "#072B5A",
  blue: "#0A6ED1",
  bg: "#F5F7FB",
  text: "#0F172A",
  muted: "#64748B",
  card: "#FFFFFF",
  border: "#E2E8F0",
  good: "#16a34a",
  bad: "#dc2626",
  warn: "#f59e0b",
};

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function serialItem(serial, idx) {
  return `${serial}-${String(idx + 1).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loteProveedorFromLoteAlmacen(lote15) {
  const s = String(lote15 ?? "");
  return s.length >= 10 ? s.slice(0, 10) : "";
}

function stripAccents(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeISODate(v) {
  const raw = String(v ?? "").trim();
  if (!raw || raw.toLowerCase() === "nan" || raw === "-") return "";

  const short = raw.split("T")[0].trim();
  const pad = (n) => String(n).padStart(2, "0");
  const isValid = (yyyy, mm, dd) => {
    const y = Number(yyyy);
    const m = Number(mm);
    const d = Number(dd);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
    if (y < 1900 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  };

  const iso = short.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso && isValid(iso[1], iso[2], iso[3])) {
    return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
  }

  const latin = short.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (latin && isValid(latin[3], latin[2], latin[1])) {
    return `${latin[3]}-${pad(latin[2])}-${pad(latin[1])}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const yyyy = parsed.getFullYear();
  const mm = pad(parsed.getMonth() + 1);
  const dd = pad(parsed.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function getISOWeek(dateInput) {
  const s = normalizeISODate(dateInput);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";

  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);

  return String(weekNum).padStart(2, "0");
}

function dateISOToExcelSerial5(isoDate) {
  const iso = normalizeISODate(isoDate);
  if (!iso) return "";

  const parts = iso.split("-");
  if (parts.length !== 3) return "";

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";

  const base = Date.UTC(1899, 11, 30);
  const target = Date.UTC(y, m - 1, d);
  const diffDays = Math.round((target - base) / (1000 * 60 * 60 * 24));

  if (!Number.isFinite(diffDays) || diffDays <= 0) return "";
  return String(diffDays).padStart(5, "0").slice(-5);
}

function buildLoteAlmacen15(loteProveedor10, fechaVencISO) {
  const lp = String(loteProveedor10 ?? "").trim().slice(0, 10);
  const serial5 = dateISOToExcelSerial5(fechaVencISO);
  if (lp.length !== 10 || serial5.length !== 5) return "";
  return lp + serial5;
}

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatQty(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return fmtCO.format(x);
}

function parseCantidadPNC(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.max(n, 0) : 0;
}

function Chip({ label, tone = "neutral" }) {
  const stylesByTone = {
    neutral: { bg: "#F1F5F9", bd: "#E2E8F0", tx: colors.text },
    blue: { bg: "rgba(10,110,209,.10)", bd: "rgba(10,110,209,.25)", tx: colors.blue },
    green: { bg: "rgba(22,163,74,.10)", bd: "rgba(22,163,74,.25)", tx: colors.good },
    red: { bg: "rgba(220,38,38,.10)", bd: "rgba(220,38,38,.25)", tx: colors.bad },
    amber: { bg: "rgba(245,158,11,.10)", bd: "rgba(245,158,11,.28)", tx: colors.warn },
  };

  const st = stylesByTone[tone] || stylesByTone.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: st.bg,
        border: `1px solid ${st.bd}`,
        color: st.tx,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function esMaterialAuto(linea) {
  const texto = stripAccents([linea?.familia || "", linea?.descripcion || "", linea?.codigo || ""]
    .join(" "))
    .toLowerCase();

  return (
    texto.includes("lata") ||
    texto.includes("preforma") ||
    texto.includes("azucar") ||
    texto.includes("azucar")
  );
}

function tipoSugerenciaMaterial(linea) {
  const texto = stripAccents([linea?.familia || "", linea?.descripcion || "", linea?.codigo || ""]
    .join(" "))
    .toLowerCase();

  if (texto.includes("preforma")) return "preforma";
  if (texto.includes("lata")) return "lata";
  if (texto.includes("azucar") || texto.includes("azucar")) return "azucar";
  return "normal";
}

function buildLineaExpandida({
  lineaOriginal,
  idxLineaOriginal,
  idxExpandido,
  ubicacionData,
  draft,
  source = "principal",
}) {
  const serial = draft?.header?.serial || "00000";
  const usuario = draft?.header?.usuario || "";
  const fecha = todayISODate();
  const movimiento = draft?.tipo === "SALIDA" ? "SALIDA" : "ENTRADA";

  const ff = normalizeISODate(lineaOriginal.fecha_fabricacion);
  const fv = normalizeISODate(lineaOriginal.fecha_vencimiento);

  const loteProv =
    (lineaOriginal.lote_proveedor || "").toString().trim().slice(0, 10) ||
    loteProveedorFromLoteAlmacen(lineaOriginal.lote);

  const loteAlm = buildLoteAlmacen15(loteProv, fv);

  const um = (
    lineaOriginal.um ||
    lineaOriginal.umm ||
    lineaOriginal.unidad_medida ||
    draft?.header?.um ||
    ""
  )
    .toString()
    .trim();

  const umb = (lineaOriginal.umb || draft?.header?.umb || "").toString().trim();

  const cantidadOriginal = Number(lineaOriginal.cantidad || 0);
  const totalOriginal = Number(lineaOriginal.total || 0);
  const totalUnitario = cantidadOriginal > 0 ? totalOriginal / cantidadOriginal : 0;

  return {
    rowKey: `${idxLineaOriginal}-${source}-${idxExpandido}-${ubicacionData?.ubicacion || "sin-ubi"}`,
    idxLineaOriginal,
    idxExpandido,
    source,
    auto: true,
    base: ubicacionData?.ubicacion_base || "",
    posicion: ubicacionData?.posicion || "",
    ubicacion: ubicacionData?.ubicacion || "",
    sugeridas: [],
    fecha,
    movimiento,
    id: "",
    usuario,
    codigoCita: serialItem(serial, idxLineaOriginal),
    sku: (lineaOriginal.codigo || "").toString().trim(),
    texto: (lineaOriginal.descripcion || "").toString().trim(),
    loteAlm,
    loteProv,
    ff,
    fv,
    numeroSemana: getISOWeek(fv),
    um,
    umb,
    cantidadRaw: 1,
    cantidadFmt: formatQty(totalUnitario),
    proveedor: (draft?.header?.proveedor || "").toString().trim(),
    documento: (draft?.header?.documento || "").toString().trim(),
    remesa: (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim(),
    ordenCompra: (draft?.header?.orden_compra || "").toString().trim(),
    lineaOriginal,
  };
}

const cardStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  boxShadow: "0 14px 34px rgba(2,6,23,.06)",
};


const modeChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minWidth: 0,
  height: 22,
  padding: "0 3px",
  borderRadius: 999,
  fontSize: 8.4,
  lineHeight: 1,
  fontWeight: 750,
  letterSpacing: "-.2px",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  overflow: "hidden",
};

const inputMini = {
  width: "100%",
  minWidth: 0,
  height: 26,
  padding: "0 4px",
  borderRadius: 7,
  border: `1px solid ${colors.border}`,
  outline: "none",
  fontWeight: 650,
  textAlign: "center",
  background: "#fff",
  color: colors.text,
  fontSize: 9.2,
  lineHeight: 1,
  boxSizing: "border-box",
};

const inputReadOnly = {
  ...inputMini,
  background: "#f8fafc",
};

const thStyle = {
  padding: "5px 3px",
  textAlign: "center",
  fontSize: 8.2,
  lineHeight: 1.05,
  color: colors.muted,
  fontWeight: 700,
  borderBottom: `1px solid ${colors.border}`,
  background: "#F8FAFC",
  whiteSpace: "normal",
  wordBreak: "keep-all",
  overflowWrap: "normal",
  letterSpacing: "-.25px",
};

const tdStyle = {
  padding: "4px 3px",
  borderBottom: `1px solid ${colors.border}`,
  verticalAlign: "middle",
  minWidth: 0,
  fontSize: 8.8,
  lineHeight: 1.05,
  color: colors.text,
  textAlign: "center",
};

const compactCellInput = {
  ...inputReadOnly,
  width: "100%",
  height: 26,
  fontSize: 8.8,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "clip",
  whiteSpace: "nowrap",
};

const compactTextBox = {
  ...inputReadOnly,
  minHeight: 26,
  height: "auto",
  padding: "4px 5px",
  fontSize: 8.4,
  lineHeight: 1.1,
  textAlign: "center",
  whiteSpace: "normal",
  overflow: "hidden",
  wordBreak: "break-word",
  display: "flex",
  alignItems: "center",
};


function ProcessNoticeModal({ notice, onClose }) {
  if (!notice) return null;
  const tone = notice.tone || "info";
  const isRotulosAction = String(notice.confirmText || "").toLowerCase().includes("rotulos");
  const palette =
    {
      success: { bg: "#f3e8ff", border: "#d8b4fe", color: colors.purple, mark: "OK" },
      error: { bg: "#fef2f2", border: "#fecaca", color: colors.bad, mark: "!" },
      warn: { bg: "#fffbeb", border: "#fed7aa", color: colors.warn, mark: "!" },
      info: { bg: "#eff6ff", border: "#bfdbfe", color: colors.blue, mark: "i" },
    }[tone] || { bg: "#eff6ff", border: "#bfdbfe", color: colors.blue, mark: "i" };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 13000,
        background: "rgba(8, 15, 31, .48)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: "min(520px, 94vw)",
          borderRadius: 22,
          background: "#fff",
          border: `1px solid ${colors.border}`,
          boxShadow: "0 28px 70px rgba(15, 23, 42, .26)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 22, display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              color: palette.color,
              fontWeight: 950,
            }}
          >
            {palette.mark}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 950, color: palette.color, letterSpacing: ".12em", textTransform: "uppercase" }}>
              {notice.kicker || "WMS INOVA"}
            </div>
            <div style={{ marginTop: 5, fontSize: 22, lineHeight: 1.15, fontWeight: 950, color: colors.navy }}>
              {notice.title || "Operacion completada"}
            </div>
            {notice.message ? (
              <div style={{ marginTop: 9, color: colors.muted, fontSize: 14, lineHeight: 1.45, fontWeight: 650, whiteSpace: "pre-line" }}>
                {notice.message}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ padding: "0 22px 22px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            style={{
              height: 42,
              minWidth: 118,
              borderRadius: 13,
              border: isRotulosAction ? `2px solid ${colors.purple}` : 0,
              background: isRotulosAction ? "#fff" : `linear-gradient(135deg, ${colors.purple}, ${colors.purple2})`,
              color: isRotulosAction ? colors.purple : "#fff",
              fontWeight: 950,
              cursor: "pointer",
              textShadow: "none",
              boxShadow: isRotulosAction ? "0 14px 30px rgba(107,33,168,.18)" : "0 14px 30px rgba(107,33,168,.26)",
            }}
          >
            {notice.confirmText || "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesdeRecibo() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const readerZXingRef = useRef(null);
  const controlsZXingRef = useRef(null);

  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [ubicaciones, setUbicaciones] = useState([]);
  const [ubicacionesError, setUbicacionesError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [ubicPorLinea, setUbicPorLinea] = useState({});
  const [pncPorNovedad, setPncPorNovedad] = useState({});
  const [sugiriendoLinea, setSugiriendoLinea] = useState({});
  const [sugiriendoSecundaria, setSugiriendoSecundaria] = useState({});

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLineaIdx, setScannerLineaIdx] = useState(null);
  const [scannerError, setScannerError] = useState("");
  const [scannerBusy, setScannerBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const showNotice = (payload) => {
    setNotice({
      tone: "info",
      title: "Mensaje del sistema",
      message: "",
      confirmText: "Aceptar",
      ...payload,
    });
  };

  const closeNotice = () => {
    const action = notice?.onConfirm;
    setNotice(null);
    if (typeof action === "function") setTimeout(action, 0);
  };

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);

    if (!raw) {
      setLoadError("No hay recibo en proceso. Vuelve a Recibo y confirma nuevamente.");
      return;
    }

    try {
      const d = JSON.parse(raw);
      if (!d || !Array.isArray(d.lineas)) {
        throw new Error("El recibo guardado no tiene lineas validas.");
      }
      setLoadError("");
      setDraft(d);

      const init = {};
      (d?.lineas || []).forEach((ln, idx) => {
        init[idx] = {
          auto: esMaterialAuto(ln),
          base: "",
          posicion: "",
          ubicacion: "",
          sugeridas: [],
          baseSecundaria: "",
          sugeridasSecundarias: [],
          faltanteCantidad: 0,
          faltanteATransito: false,
        };
      });
      setUbicPorLinea(init);
    } catch (error) {
      setDraft(null);
      setLoadError(`Error leyendo el recibo: ${error?.message || error}`);
    }
  }, [navigate]);

  useEffect(() => {
    getUbicaciones()
      .then((data) => {
        setUbicaciones(Array.isArray(data) ? data : []);
        setUbicacionesError("");
      })
      .catch((e) => {
        setUbicaciones([]);
        setUbicacionesError(String(e));
      });
  }, []);

  useEffect(() => {
    return () => cerrarScanner();
  }, []);
  const novedadesPNC = useMemo(() => {
    return (draft?.novedades || [])
      .map((nov, idx) => {
        const lineaIdx = nov.lineaIndex === "" ? null : Number(nov.lineaIndex);
        const linea = Number.isInteger(lineaIdx) ? draft?.lineas?.[lineaIdx] : null;
        return {
          ...nov,
          key: `pnc-${idx}-${Number.isInteger(lineaIdx) ? lineaIdx : "sin-linea"}`,
          novedadIndex: idx,
          lineaIndex: Number.isInteger(lineaIdx) ? lineaIdx : null,
          item: nov.item || (Number.isInteger(lineaIdx) ? lineaIdx + 1 : ""),
          codigo: nov.codigo || linea?.codigo || "",
          descripcion: nov.descripcion || linea?.descripcion || "",
          empaque: nov.empaque || linea?.empaque || "",
          cantidadNumero: parseCantidadPNC(nov.cantidad),
          linea,
        };
      })
      .filter((nov) => Number.isInteger(nov.lineaIndex) && nov.linea && nov.cantidadNumero > 0);
  }, [draft]);

  const cantidadPncPorLinea = useMemo(() => {
    const map = {};
    novedadesPNC.forEach((nov) => {
      map[nov.lineaIndex] = (map[nov.lineaIndex] || 0) + nov.cantidadNumero;
    });
    return map;
  }, [novedadesPNC]);

  const totalPnc = useMemo(
    () => novedadesPNC.reduce((acc, nov) => acc + Number(nov.cantidadNumero || 0), 0),
    [novedadesPNC]
  );

  const setPncDecision = (key, patch) => {
    setPncPorNovedad((prev) => ({
      ...prev,
      [key]: {
        destino: "UBICAR_PNC",
        base: "",
        posicion: "",
        ubicacion: "",
        ...prev[key],
        ...patch,
      },
    }));
  };

  const onPncDestinoChange = (key, destino) => {
    setPncDecision(key, {
      destino,
      ...(destino === "TRANSITO_PNC" ? { base: "", posicion: "", ubicacion: "" } : {}),
    });
  };

  const onPncBaseChange = (key, base) => {
    setPncDecision(key, { base, posicion: "", ubicacion: "" });
  };

  const onPncPosicionChange = (key, posicion) => {
    setPncPorNovedad((prev) => {
      const current = { destino: "UBICAR_PNC", base: "", posicion: "", ubicacion: "", ...prev[key] };
      return {
        ...prev,
        [key]: {
          ...current,
          posicion,
          ubicacion: current.base && posicion ? `${current.base}${posicion}`.toUpperCase() : "",
        },
      };
    });
  };

  const validarPNC = () => {
    for (const nov of novedadesPNC) {
      const decision = { destino: "UBICAR_PNC", ...(pncPorNovedad[nov.key] || {}) };
      const totalLinea = Number(nov.linea?.total || 0);
      if (nov.cantidadNumero > totalLinea) {
        return `La cantidad PNC del item ${nov.item} supera el total de la linea.`;
      }
      if (decision.destino === "UBICAR_PNC" && !(decision.ubicacion || "").trim()) {
        return `Falta ubicacion PNC para el item ${nov.item}.`;
      }
    }
    return "";
  };


  const basesDisponibles = useMemo(() => {
    const set = new Set();

    ubicaciones.forEach((u) => {
      const base = (u.ubicacion_base || "").toString().trim();
      if (base) set.add(base);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ubicaciones]);

  const posicionesPorBase = useMemo(() => {
    const map = {};

    ubicaciones.forEach((u) => {
      const base = (u.ubicacion_base || "").toString().trim();
      const pos = (u.posicion || "").toString().trim();
      if (!base || !pos) return;

      if (!map[base]) map[base] = [];
      if (!map[base].includes(pos)) map[base].push(pos);
    });

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.localeCompare(b);
      });
    });

    return map;
  }, [ubicaciones]);

  const normalizarUbicacionPantalla = (value) => (value || "").toString().trim().toUpperCase();

  const ubicacionesApartadasEnPantalla = (idxActual = null, options = {}) => {
    const { incluirActual = false, omitirPncKey = "" } = options;
    const ocupadas = new Set();
    const agregar = (value) => {
      const ubicacion = normalizarUbicacionPantalla(value);
      if (ubicacion) ocupadas.add(ubicacion);
    };

    Object.entries(ubicPorLinea || {}).forEach(([idx, conf]) => {
      const esActual = idxActual !== null && Number(idx) === Number(idxActual);
      if (esActual && !incluirActual) return;

      agregar(conf?.ubicacion);
      (conf?.sugeridas || []).forEach((sug) => agregar(sug?.ubicacion));
      (conf?.sugeridasSecundarias || []).forEach((sug) => agregar(sug?.ubicacion));
    });

    Object.entries(pncPorNovedad || {}).forEach(([key, decision]) => {
      if (key === omitirPncKey || decision?.destino === "TRANSITO_PNC") return;
      agregar(decision?.ubicacion);
    });

    return Array.from(ocupadas);
  };

  const posicionesPncDisponibles = (base, keyActual = "") => {
    const bloqueadas = new Set(ubicacionesApartadasEnPantalla(null, { omitirPncKey: keyActual }));
    return (posicionesPorBase[base] || []).filter((posicion) => {
      const ubicacion = normalizarUbicacionPantalla(`${base || ""}${posicion || ""}`);
      return ubicacion && !bloqueadas.has(ubicacion);
    });
  };
  const filasMov = useMemo(() => {
    if (!draft) return [];

    const serial = draft?.header?.serial || "00000";
    const usuario = draft?.header?.usuario || "";
    const fecha = todayISODate();
    const movimiento = draft?.tipo === "SALIDA" ? "SALIDA" : "ENTRADA";

    const filas = [];

    (draft.lineas || []).forEach((ln, idx) => {
      const codigoCita = serialItem(serial, idx);
      const sku = (ln.codigo || "").toString().trim();
      const texto = (ln.descripcion || "").toString().trim();

      const ff = normalizeISODate(ln.fecha_fabricacion);
      const fv = normalizeISODate(ln.fecha_vencimiento);

      const loteProv =
        (ln.lote_proveedor || "").toString().trim().slice(0, 10) ||
        loteProveedorFromLoteAlmacen(ln.lote);

      const loteAlm = buildLoteAlmacen15(loteProv, fv);

      const cantidadPallets = Number(ln.cantidad || 0);
      const totalLinea = Number(ln.total || 0);

      const um = (
        ln.um ||
        ln.umm ||
        ln.unidad_medida ||
        draft?.header?.um ||
        ""
      )
        .toString()
        .trim();

      const umb = (ln.umb || draft?.header?.umb || "").toString().trim();

      const estadoUbic = ubicPorLinea[idx] || {
        auto: esMaterialAuto(ln),
        base: "",
        posicion: "",
        ubicacion: "",
        sugeridas: [],
        baseSecundaria: "",
        sugeridasSecundarias: [],
        faltanteCantidad: 0,
        faltanteATransito: false,
      };

      if (estadoUbic.auto) {
        if (Array.isArray(estadoUbic.sugeridas) && estadoUbic.sugeridas.length > 0) {
          estadoUbic.sugeridas.forEach((sug, subIdx) => {
            filas.push(
              buildLineaExpandida({
                lineaOriginal: ln,
                idxLineaOriginal: idx,
                idxExpandido: subIdx,
                ubicacionData: sug,
                draft,
                source: "principal",
              })
            );
          });
        }

        if (
          Array.isArray(estadoUbic.sugeridasSecundarias) &&
          estadoUbic.sugeridasSecundarias.length > 0
        ) {
          estadoUbic.sugeridasSecundarias.forEach((sug, subIdx) => {
            filas.push(
              buildLineaExpandida({
                lineaOriginal: ln,
                idxLineaOriginal: idx,
                idxExpandido: subIdx,
                ubicacionData: sug,
                draft,
                source: "secundaria",
              })
            );
          });
        }

        if (
          (!estadoUbic.sugeridas || estadoUbic.sugeridas.length === 0) &&
          (!estadoUbic.sugeridasSecundarias || estadoUbic.sugeridasSecundarias.length === 0)
        ) {
          filas.push({
            rowKey: `${idx}`,
            idx,
            idxLineaOriginal: idx,
            idxExpandido: 0,
            auto: estadoUbic.auto,
            base: estadoUbic.base,
            posicion: estadoUbic.posicion,
            ubicacion: estadoUbic.ubicacion,
            sugeridas: estadoUbic.sugeridas || [],
            fecha,
            movimiento,
            id: "",
            usuario,
            codigoCita,
            sku,
            texto,
            loteAlm,
            loteProv,
            ff,
            fv,
            numeroSemana: getISOWeek(fv),
            um,
            umb,
            cantidadRaw: cantidadPallets,
            cantidadFmt: formatQty(totalLinea),
            proveedor: (draft?.header?.proveedor || "").toString().trim(),
            documento: (draft?.header?.documento || "").toString().trim(),
            remesa: (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim(),
            ordenCompra: (draft?.header?.orden_compra || "").toString().trim(),
            lineaOriginal: ln,
          });
        }
      } else {
        filas.push({
          rowKey: `${idx}`,
          idx,
          idxLineaOriginal: idx,
          idxExpandido: 0,
          auto: estadoUbic.auto,
          base: estadoUbic.base,
          posicion: estadoUbic.posicion,
          ubicacion: estadoUbic.ubicacion,
          sugeridas: estadoUbic.sugeridas || [],
          fecha,
          movimiento,
          id: "",
          usuario,
          codigoCita,
          sku,
          texto,
          loteAlm,
          loteProv,
          ff,
          fv,
          numeroSemana: getISOWeek(fv),
          um,
          umb,
          cantidadRaw: cantidadPallets,
          cantidadFmt: formatQty(totalLinea),
          proveedor: (draft?.header?.proveedor || "").toString().trim(),
          documento: (draft?.header?.documento || "").toString().trim(),
          remesa: (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim(),
          ordenCompra: (draft?.header?.orden_compra || "").toString().trim(),
          lineaOriginal: ln,
        });
      }
    });

    return filas;
  }, [draft, ubicPorLinea]);

  if (!draft) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 140px)",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(560px, 100%)",
            border: `1px solid ${loadError ? "rgba(220,38,38,.24)" : colors.border}`,
            borderRadius: 18,
            background: colors.card,
            boxShadow: "0 18px 45px rgba(15,23,42,.12)",
            padding: 24,
            color: colors.text,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: colors.muted }}>
            MOVIMIENTOS DESDE RECIBO
          </div>
          <h2 style={{ margin: "8px 0 10px", color: colors.navy }}>Recibo no disponible</h2>
          <p style={{ margin: 0, color: loadError ? colors.bad : colors.muted, fontWeight: 800 }}>
            {loadError || "Cargando recibo..."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/movimientos/recibo")}
            style={{
              marginTop: 18,
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "none",
              background: colors.blue,
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Volver a Recibo
          </button>
        </div>
      </div>
    );
  }

  const createReaderZXing = () => {
    if (!readerZXingRef.current) {
      readerZXingRef.current = new BrowserMultiFormatReader();
    }
    return readerZXingRef.current;
  };

  const limpiarCodigoUbicacion = (raw) => {
    const value = (raw || "").toString().trim();
    if (!value) return "";

    try {
      const json = JSON.parse(value);
      const posible =
        json.ubicacion ||
        json.codigo_ubicacion ||
        json.codigoUbicacion ||
        json.codigo ||
        json.location ||
        json.value ||
        "";
      if (posible) return posible.toString().trim().toUpperCase().replace(/\s+/g, "");
    } catch {
      // texto normal
    }

    return value.toUpperCase().replace(/\s+/g, "");
  };

  const aplicarUbicacionEscaneada = (idx, raw) => {
    const codigo = limpiarCodigoUbicacion(raw);

    if (!codigo) {
      showNotice({ tone: "warn", title: "No se leyo ubicacion", message: "Intenta escanear nuevamente con mejor enfoque." });
      return;
    }

    let ubic = ubicaciones.find(
      (u) => (u.ubicacion || "").toString().trim().toUpperCase() === codigo
    );

    if (!ubic) {
      ubic = ubicaciones.find((u) => {
        const base = (u.ubicacion_base || "").toString().trim().toUpperCase();
        const posicion = (u.posicion || "").toString().trim().toUpperCase();
        return `${base}${posicion}` === codigo;
      });
    }

    if (!ubic) {
      let matchDetectado = null;

      const basesOrdenadas = basesDisponibles
        .map((b) => b.toString().trim().toUpperCase())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

      for (const baseDetectada of basesOrdenadas) {
        if (!codigo.startsWith(baseDetectada)) continue;

        const posicionDetectada = codigo.slice(baseDetectada.length);
        if (!posicionDetectada) continue;

        const existeBasePosicion = ubicaciones.some((u) => {
          const base = (u.ubicacion_base || "").toString().trim().toUpperCase();
          const posicion = (u.posicion || "").toString().trim().toUpperCase();
          return base === baseDetectada && posicion === posicionDetectada;
        });

        if (existeBasePosicion) {
          matchDetectado = {
            base: baseDetectada,
            posicion: posicionDetectada,
            ubicacion: codigo,
          };
          break;
        }
      }

      if (matchDetectado) {
        setUbicPorLinea((prev) => ({
          ...prev,
          [idx]: {
            ...(prev[idx] || {}),
            auto: false,
            base: matchDetectado.base,
            posicion: matchDetectado.posicion,
            ubicacion: matchDetectado.ubicacion,
          },
        }));

        cerrarScanner();
        return;
      }
    }

    if (!ubic) {
      showNotice({ tone: "error", title: "Ubicacion no existe", message: `La ubicacion escaneada no existe en datos maestros:\n${codigo}` });
      return;
    }

    const base = (ubic.ubicacion_base || "").toString().trim();
    const posicion = (ubic.posicion || "").toString().trim();
    const ubicacion = (ubic.ubicacion || `${base}${posicion}`).toString().trim().toUpperCase();

    setUbicPorLinea((prev) => ({
      ...prev,
      [idx]: {
        ...(prev[idx] || {}),
        auto: false,
        base,
        posicion,
        ubicacion,
      },
    }));

    cerrarScanner();
  };

  function cerrarScanner() {
    try {
      if (controlsZXingRef.current) {
        controlsZXingRef.current.stop();
        controlsZXingRef.current = null;
      }
    } catch {
      // noop
    }

    try {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    } catch {
      // noop
    }

    setScannerOpen(false);
    setScannerLineaIdx(null);
    setScannerBusy(false);
  }

  const decodeFromCanvasZXing = async (canvas) => {
    const reader = createReaderZXing();

    if (typeof reader.decodeFromCanvas === "function") {
      const result = await reader.decodeFromCanvas(canvas);
      return result?.getText?.() || result?.text || "";
    }

    const dataUrl = canvas.toDataURL("image/png");
    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const result = await reader.decodeFromImageElement(img);
    return result?.getText?.() || result?.text || "";
  };

  const leerImagenUbicacion = async (file) => {
    if (!file) return "";

    const reader = createReaderZXing();

    const img = new Image();
    img.src = URL.createObjectURL(file);

    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      try {
        const direct = await reader.decodeFromImageElement(img);
        const text = direct?.getText?.() || direct?.text || "";
        if (text) return text;
      } catch {
        // seguimos con canvas
      }

      const escalas = [1, 1.5, 2, 2.5, 3];
      const thresholds = [null, 90, 120, 150, 180, 210];

      for (const escala of escalas) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        for (const threshold of thresholds) {
          const work = document.createElement("canvas");
          const workCtx = work.getContext("2d", { willReadFrequently: true });

          work.width = canvas.width;
          work.height = canvas.height;
          workCtx.drawImage(canvas, 0, 0);

          if (threshold !== null) {
            const imageData = workCtx.getImageData(0, 0, work.width, work.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
              const bw = gray >= threshold ? 255 : 0;
              data[i] = bw;
              data[i + 1] = bw;
              data[i + 2] = bw;
            }

            workCtx.putImageData(imageData, 0, 0);
          }

          try {
            const text = await decodeFromCanvasZXing(work);
            if (text) return text;
          } catch {
            // probar invert
          }

          try {
            const inv = document.createElement("canvas");
            const invCtx = inv.getContext("2d", { willReadFrequently: true });

            inv.width = work.width;
            inv.height = work.height;
            invCtx.drawImage(work, 0, 0);

            const imageData = invCtx.getImageData(0, 0, inv.width, inv.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              data[i] = 255 - data[i];
              data[i + 1] = 255 - data[i + 1];
              data[i + 2] = 255 - data[i + 2];
            }

            invCtx.putImageData(imageData, 0, 0);

            const text = await decodeFromCanvasZXing(inv);
            if (text) return text;
          } catch {
            // siguiente intento
          }
        }
      }

      return "";
    } finally {
      URL.revokeObjectURL(img.src);
    }
  };

  const leerUbicacionDesdeFoto = async (idx, file) => {
    if (!file) return;

    try {
      setScannerBusy(true);
      const texto = await leerImagenUbicacion(file);

      if (!texto) {
        showNotice({ tone: "warn", title: "No se detecto codigo", message: "Toma la foto mas cerca, enfocada y con buena luz." });
        return;
      }

      aplicarUbicacionEscaneada(idx, texto);
    } catch (e) {
      showNotice({ tone: "error", title: "Error leyendo foto", message: String(e?.message || e) });
    } finally {
      setScannerBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const abrirFotoManual = (idx) => {
    setScannerLineaIdx(idx);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const ingresarManualDesdeScanner = async () => {
    const idx = scannerLineaIdx;
    const valor = await showWmsPrompt("Ingresa o pega el codigo de ubicacion:");

    if (valor === null) return;
    aplicarUbicacionEscaneada(idx, valor);
  };

  const escanearUbicacion = async (idx) => {
    setScannerLineaIdx(idx);
    setScannerOpen(true);
    setScannerError("");
    setScannerBusy(true);

    try {
      const reader = createReaderZXing();

      let devices = [];
      try {
        devices = await BrowserMultiFormatReader.listVideoInputDevices();
      } catch {
        devices = [];
      }

      const backCamera =
        devices.find((d) => /back|rear|environment|trasera|posterior/i.test(d.label || "")) ||
        devices[devices.length - 1] ||
        devices[0];

      const deviceId = backCamera?.deviceId;

      setTimeout(async () => {
        try {
          if (!videoRef.current) return;

          controlsZXingRef.current = await reader.decodeFromVideoDevice(
            deviceId,
            videoRef.current,
            (result) => {
              const text = result?.getText?.() || result?.text || "";
              if (text) {
                aplicarUbicacionEscaneada(idx, text);
              }
            }
          );

          setScannerBusy(false);
        } catch (e) {
          setScannerBusy(false);
          setScannerError(
            `No se pudo abrir la camara. Revisa permisos o usa FOTO / Ingresar manual. Detalle: ${
              e?.message || e
            }`
          );
        }
      }, 80);
    } catch (e) {
      setScannerBusy(false);
      setScannerError(
        `No se pudo iniciar el lector. Usa FOTO / Ingresar manual. Detalle: ${e?.message || e}`
      );
    }
  };

  const onChangeBase = (idx, value) => {
    setUbicPorLinea((prev) => {
      const actual = prev[idx] || {};
      const next = {
        ...actual,
        base: value,
      };

      if (!actual.auto) {
        next.ubicacion = `${value || ""}${actual.posicion || ""}`;
      } else {
        next.sugeridas = [];
        next.sugeridasSecundarias = [];
        next.baseSecundaria = "";
        next.faltanteCantidad = 0;
        next.faltanteATransito = false;
      }

      return { ...prev, [idx]: next };
    });

    if ((ubicPorLinea[idx] || {}).auto && value) {
      setTimeout(() => sugerirLinea(idx, draft?.lineas?.[idx]?.cantidad, value), 0);
    }
  };

  const onChangePosicion = (idx, value) => {
    setUbicPorLinea((prev) => {
      const actual = prev[idx] || {};
      return {
        ...prev,
        [idx]: {
          ...actual,
          posicion: value,
          ubicacion: `${actual.base || ""}${value || ""}`,
        },
      };
    });
  };

  const onChangeBaseSecundaria = (idx, value) => {
    setUbicPorLinea((prev) => {
      const actual = prev[idx] || {};
      return {
        ...prev,
        [idx]: {
          ...actual,
          baseSecundaria: value,
          sugeridasSecundarias: [],
        },
      };
    });
  };

  const onToggleFaltanteTransito = (idx, checked) => {
    setUbicPorLinea((prev) => {
      const actual = prev[idx] || {};
      return {
        ...prev,
        [idx]: {
          ...actual,
          faltanteATransito: checked,
        },
      };
    });
  };

  const sugerirLinea = async (idx, cantidadRaw, baseOverride = "") => {
    const conf = ubicPorLinea[idx] || {};
    const base = (baseOverride || conf.base || "").trim();

    if (!base) {
      showNotice({ tone: "warn", title: "Falta ubicacion base", message: `Selecciona ubicacion base en la linea #${idx + 1}.` });
      return;
    }

    const cantidad = Number(cantidadRaw || 0);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      showNotice({ tone: "warn", title: "Cantidad invalida", message: `La linea #${idx + 1} debe tener cantidad entera mayor a 0 para auto ubicacion.` });
      return;
    }

    setSugiriendoLinea((p) => ({ ...p, [idx]: true }));

    try {
      const payload = {
        ubicacion_base: base,
        cantidad_pallets: cantidad,
        tipo_material: tipoSugerenciaMaterial(draft?.lineas?.[idx]),
      excluir_ubicaciones: ubicacionesApartadasEnPantalla(idx),
      };

      const data = await sugerirUbicaciones(payload);
      const posiciones = Array.isArray(data?.posiciones)
        ? data.posiciones
        : Array.isArray(data?.ubicaciones)
        ? data.ubicaciones
        : [];
      const faltante = Math.max(0, cantidad - posiciones.length);

      setUbicPorLinea((prev) => ({
        ...prev,
        [idx]: {
          ...(prev[idx] || {}),
          base,
          sugeridas: posiciones,
          sugeridasSecundarias: [],
          baseSecundaria: "",
          faltanteCantidad: faltante,
          faltanteATransito: false,
        },
      }));

      if (faltante > 0) {
        showNotice({ tone: "warn", title: "Ubicaciones incompletas", message: `Solo se encontraron ${posiciones.length} posiciones en ${base}. Faltan ${faltante} pallet(s). Puedes elegir una ubicacion base secundaria o mandar el faltante a transito.` });
      }
    } catch (e) {
      showNotice({ tone: "error", title: "Error sugiriendo ubicacion", message: `Linea #${idx + 1}:\n${e?.message || e}` });
    } finally {
      setSugiriendoLinea((p) => ({ ...p, [idx]: false }));
    }
  };

  const sugerirLineaSecundaria = async (idx) => {
    const conf = ubicPorLinea[idx] || {};
    const baseSecundaria = (conf.baseSecundaria || "").trim();
    const faltante = Number(conf.faltanteCantidad || 0);

    if (!baseSecundaria) {
      showNotice({ tone: "warn", title: "Falta ubicacion secundaria", message: `Selecciona ubicacion base secundaria en la linea #${idx + 1}.` });
      return;
    }

    if (!Number.isInteger(faltante) || faltante <= 0) {
      showNotice({ tone: "info", title: "Sin faltante pendiente", message: `No hay faltante pendiente en la linea #${idx + 1}.` });
      return;
    }

    setSugiriendoSecundaria((p) => ({ ...p, [idx]: true }));

    try {
      const payload = {
        ubicacion_base: baseSecundaria,
        cantidad_pallets: faltante,
        tipo_material: tipoSugerenciaMaterial(draft?.lineas?.[idx]),
      excluir_ubicaciones: ubicacionesApartadasEnPantalla(idx, { incluirActual: true }),
      };

      const data = await sugerirUbicaciones(payload);
      const posiciones = Array.isArray(data?.posiciones)
        ? data.posiciones
        : Array.isArray(data?.ubicaciones)
        ? data.ubicaciones
        : [];
      const nuevoFaltante = Math.max(0, faltante - posiciones.length);

      setUbicPorLinea((prev) => ({
        ...prev,
        [idx]: {
          ...(prev[idx] || {}),
          sugeridasSecundarias: posiciones,
          faltanteCantidad: nuevoFaltante,
        },
      }));

      if (nuevoFaltante > 0) {
        showNotice({ tone: "warn", title: "Faltante por gestionar", message: `La ubicacion secundaria ${baseSecundaria} solo cubrio ${posiciones.length} pallet(s). Aun faltan ${nuevoFaltante}. Marca la opcion de enviar faltante a transito si deseas continuar.` });
      }
    } catch (e) {
      showNotice({ tone: "error", title: "Error sugiriendo secundaria", message: `Linea #${idx + 1}:\n${e?.message || e}` });
    } finally {
      setSugiriendoSecundaria((p) => ({ ...p, [idx]: false }));
    }
  };

  const validarDatosBase = () => {
    for (let i = 0; i < (draft.lineas || []).length; i++) {
      const ln = draft.lineas[i];
      if (!ln?.codigo) return `Hay lineas sin SKU/codigo. Revisa la linea #${i + 1}.`;

      const ff = normalizeISODate(ln.fecha_fabricacion);
      const fv = normalizeISODate(ln.fecha_vencimiento);
      const loteProv =
        (ln.lote_proveedor || "").toString().trim().slice(0, 10) ||
        loteProveedorFromLoteAlmacen(ln.lote);

      if (loteProv.length !== 10) {
        return `El Lote Proveedor debe ser exactamente 10 caracteres. Revisa la linea #${i + 1}.`;
      }

      if (!ff) {
        return `Falta Fecha de Fabricacion en la linea #${i + 1}. Es requisito para ubicar o enviar a transito.`;
      }

      if (!fv) {
        return `Falta Fecha de Vencimiento en la linea #${i + 1}. Es requisito para ubicar o enviar a transito.`;
      }

      const loteAlm = buildLoteAlmacen15(loteProv, fv);
      if (!loteAlm || loteAlm.length !== 15) {
        return `No se pudo generar Lote Almacen (15). Revisa lote proveedor y fecha vencimiento en la linea #${i + 1}.`;
      }
    }

    return "";
  };

  const validarConUbicacion = () => {
    const base = validarDatosBase();
    if (base) return base;

    const pnc = validarPNC();
    if (pnc) return pnc;

    for (let i = 0; i < (draft.lineas || []).length; i++) {
      const ln = draft.lineas[i];
      const conf = ubicPorLinea[i] || {};
      const auto = esMaterialAuto(ln);

      if (auto) {
        if (!(conf.base || "").trim()) {
          return `Falta ubicacion base en la linea #${i + 1}.`;
        }

        const cant = Number(ln.cantidad || 0);
        if (!Number.isInteger(cant) || cant <= 0) {
          return `La linea #${i + 1} debe tener cantidad entera > 0 para auto ubicacion.`;
        }

        const sugeridasPrincipal = Array.isArray(conf.sugeridas) ? conf.sugeridas.length : 0;
        const sugeridasSec = Array.isArray(conf.sugeridasSecundarias)
          ? conf.sugeridasSecundarias.length
          : 0;
        const faltante = Number(conf.faltanteCantidad || 0);

        if (sugeridasPrincipal === 0) {
          return `Debes generar la sugerencia principal en la linea #${i + 1}.`;
        }

        if (sugeridasPrincipal + sugeridasSec + faltante !== cant) {
          return `La distribucion de pallet(s) no cuadra en la linea #${i + 1}.`;
        }

        if (faltante > 0 && !conf.faltanteATransito) {
          if (!(conf.baseSecundaria || "").trim() || sugeridasSec === 0) {
            return `Faltan pallet(s) por ubicar en la linea #${i + 1}. Usa base secundaria o marca enviar faltante a transito.`;
          }
        }
      } else {
        if (!(conf.base || "").trim()) {
          return `Falta ubicacion base en la linea #${i + 1}.`;
        }
        if (!(conf.posicion || "").trim()) {
          return `Falta posicion en la linea #${i + 1}.`;
        }
        if (!(conf.ubicacion || "").trim()) {
          return `No se pudo construir la ubicacion final en la linea #${i + 1}.`;
        }
      }
    }

    return "";
  };

  const construirPayloadMovimiento = (linea, idx, opts = {}) => {
    const serial = (draft?.header?.serial || "").toString().trim();
    const proveedor = (draft?.header?.proveedor || "").toString().trim();
    const documento = (draft?.header?.documento || "").toString().trim();
    const usuario = (draft?.header?.usuario || "").toString().trim();
    const ordenCompra = (draft?.header?.orden_compra || "").toString().trim();
    const remesa = (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim();

    const loteProv =
      (linea.lote_proveedor || "").toString().trim().slice(0, 10) ||
      loteProveedorFromLoteAlmacen(linea.lote);

    const ff = normalizeISODate(linea.fecha_fabricacion);
    const fv = normalizeISODate(linea.fecha_vencimiento);
    const loteAlm = buildLoteAlmacen15(loteProv, fv);

    if (!loteAlm) {
      throw new Error(`No se pudo generar Lote Almacen en la linea #${idx + 1}`);
    }

    const umMovimiento = (
      linea.um ||
      linea.umm ||
      linea.unidad_medida ||
      draft?.header?.um ||
      ""
    )
      .toString()
      .trim();

    const umbMovimiento = (linea.umb || draft?.header?.umb || "").toString().trim();

    return {
      fecha: new Date().toISOString(),
      usuario,
      documento,
      codigo_cita: serial,
      proveedor: proveedor || null,
      remesa: remesa || null,
      orden_compra: ordenCompra || null,
      um: umMovimiento || null,
      umb: umbMovimiento || null,
      codigo_material: (linea.codigo || "").toString().trim(),
      codigo_ubicacion: opts.codigo_ubicacion  -  null,
      estado: opts.estado  -  "ALMACENADO",
      lote_almacen: loteAlm,
      lote_proveedor: loteProv,
      fecha_fabricacion: ff || null,
      fecha_vencimiento: fv || null,
      cantidad_r: Number(opts.cantidad_r  -  linea.total  -  0),
    };
  };

  const construirRotulosItems = () => {
    const serial = (draft?.header?.serial || "").toString().trim();
    const proveedor = (draft?.header?.proveedor || "").toString().trim();
    const documento = (draft?.header?.documento || "").toString().trim();
    const ordenCompra = (draft?.header?.orden_compra || "").toString().trim();
    const remesa = (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim();
    const auxiliar = (
      draft?.header?.auxiliar ||
      draft?.header?.nombre_auxiliar ||
      draft?.auxiliar ||
      ""
    ).toString().trim();
    const fechaRecep = todayISODate();
    const esAmcor = proveedor.toUpperCase().includes("AMCOR");

    const prepararLineaRotulo = (linea, index, overrides = {}) => {
      const loteProv =
        overrides.lote_proveedor ||
        (linea.lote_proveedor || "").toString().trim().slice(0, 10) ||
        loteProveedorFromLoteAlmacen(linea.lote);

      const ff = normalizeISODate(overrides.fecha_fabricacion || linea.fecha_fabricacion);
      const fv = normalizeISODate(overrides.fecha_vencimiento || linea.fecha_vencimiento);
      const loteAlm = buildLoteAlmacen15(loteProv, fv);
      const impresion = serialItem(serial, index);
      const sku = (linea.codigo || "").toString().trim();
      const cantidad = overrides.cantidad !== undefined ? Number(overrides.cantidad) : Number(linea.total || 0);
      const um = (
        linea.um ||
        linea.umm ||
        linea.unidad_medida ||
        draft?.header?.um ||
        ""
      )
        .toString()
        .trim();

      return {
        impresion,
        codigo_cita: serial,
        fecha_recepcion: fechaRecep,
        numero_semana: getISOWeek(fv),
        proveedor: proveedor || "",
        auxiliar: auxiliar || "",
        documento: documento || "",
        remesa: remesa || "",
        orden_compra: ordenCompra || "",
        cantidad,
        sku,
        texto_breve: (linea.descripcion || "").toString().trim(),
        um,
        umb: (linea.umb || draft?.header?.umb || "").toString().trim(),
        fecha_fabricacion: ff || null,
        fecha_vencimiento: fv || null,
        lote_proveedor: loteProv,
        lote_almacen: loteAlm,
      };
    };

    if (!esAmcor) return draft.lineas.map((linea, i) => prepararLineaRotulo(linea, i));

    const grupos = new Map();

    (draft.lineas || []).forEach((linea, idx) => {
      const sku = (linea.codigo || "").toString().trim();
      const texto = (linea.descripcion || "").toString().trim();
      const fv = normalizeISODate(linea.fecha_vencimiento);
      const um = (
        linea.um ||
        linea.umm ||
        linea.unidad_medida ||
        draft?.header?.um ||
        ""
      ).toString().trim();
      const umb = (linea.umb || draft?.header?.umb || "").toString().trim();
      const key = [sku, texto, fv, um, umb].join("|");

      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push({ linea, idx });
    });

    return Array.from(grupos.values())
      .sort((a, b) => {
        const fa = normalizeISODate(a[0]?.linea?.fecha_vencimiento);
        const fb = normalizeISODate(b[0]?.linea?.fecha_vencimiento);
        return String(fa || "9999-99-99").localeCompare(String(fb || "9999-99-99"));
      })
      .map((grupo, groupIdx) => {
        const ordenado = [...grupo].sort((a, b) => {
          const loteA = (a.linea.lote_proveedor || "").toString().trim().slice(0, 10) || loteProveedorFromLoteAlmacen(a.linea.lote);
          const loteB = (b.linea.lote_proveedor || "").toString().trim().slice(0, 10) || loteProveedorFromLoteAlmacen(b.linea.lote);
          const cmp = loteA.localeCompare(loteB, undefined, { numeric: true, sensitivity: "base" });
          return cmp || a.idx - b.idx;
        });
        const primero = ordenado[0];
        const loteInicial = (primero.linea.lote_proveedor || "").toString().trim().slice(0, 10) || loteProveedorFromLoteAlmacen(primero.linea.lote);
        return prepararLineaRotulo(primero.linea, groupIdx, {
          lote_proveedor: loteInicial,
          fecha_fabricacion: primero.linea.fecha_fabricacion,
          fecha_vencimiento: primero.linea.fecha_vencimiento,
          cantidad: ordenado.length,
        });
      });
  };

  const guardarRotulos = async () => {
    const rotulosItems = construirRotulosItems();
    await crearRotulosBulk({ items: rotulosItems });
  };

  const buildReciboConsultaHtml = () => {
    const header = draft?.header || {};
    const lineas = draft?.lineas || [];
    const esDevolucion = draft?.tipoRecibo === "devolucion";
    const generatedAt = draft?.createdAtISO ? new Date(draft.createdAtISO) : new Date();
    const generatedDate = Number.isNaN(generatedAt.getTime())
      ? todayISODate()
      : generatedAt.toLocaleDateString("es-CO");
    const generatedTime = Number.isNaN(generatedAt.getTime())
      ? ""
      : generatedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const totalRecibo = lineas.reduce(
      (acc, linea) => acc + Number(linea.total || linea.cantidad || 0),
      0
    );

    const novedadesRows = (draft?.novedades || [])
      .filter((nov) => nov?.item && (nov?.hallazgo || nov?.cantidad))
      .map((nov) => {
        return [
          "<tr>",
          `<td>${escapeHtml(nov.item || "")}</td>`,
          `<td>${escapeHtml(nov.hallazgo || "Novedad reportada")}</td>`,
          `<td>${escapeHtml(nov.empaque || "-")}</td>`,
          `<td style="text-align:right;">${escapeHtml(nov.cantidad || "")}</td>`,
          "</tr>",
        ].join("");
      })
      .join("");

    const rows = lineas
      .map((linea, i) => {
        const item = serialItem(header.serial || "", i);
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(item)}</td>
            <td>${escapeHtml(linea.fecha_recepcion || header.fecha_recepcion || todayISODate())}</td>
            <td>${escapeHtml(linea.codigo || "")}</td>
            <td>${escapeHtml(linea.descripcion || "")}</td>
            <td>${escapeHtml(linea.empaque || "")}</td>
            <td style="text-align:right;">${escapeHtml(linea.umb || "")}</td>
            <td>${escapeHtml(linea.um || linea.umm || linea.unidad_medida || header.um || "")}</td>
            <td style="text-align:right;">${escapeHtml(linea.cantidad || "")}</td>
            <td style="text-align:right;">${escapeHtml(formatQty(linea.total || linea.cantidad || 0))}</td>
            <td>${escapeHtml(linea.lote_proveedor || "")}</td>
            <td>${escapeHtml(linea.fecha_fabricacion || "")}</td>
            <td>${escapeHtml(linea.fecha_vencimiento || "")}</td>
            <td>${esDevolucion ? "No aplica" : linea.certificado_data_url ? "Completo" : "Pendiente"}</td>
          </tr>`;
      })
      .join("");

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Recibo ciego ${escapeHtml(header.serial || "")}</title>
    <link rel="preload" as="image" href="/favicon1.ico" />
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      body { padding: 12mm; }
      .page { width: 100%; min-height: calc(100vh - 24mm); }
      .receipt-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        border-bottom: 2px solid #0f2744;
        padding-bottom: 12px;
        margin-bottom: 18px;
      }
      .receipt-header-left { display: flex; align-items: center; gap: 14px; }
      .receipt-logo-box {
        width: 58px;
        height: 58px;
        border: 1px solid #d9e2ec;
        border-radius: 10px;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: #fff;
      }
      .receipt-logo-box img { width: 100%; height: 100%; object-fit: contain; }
      .receipt-title { font-size: 28px; font-weight: 900; color: #0f2744; letter-spacing: .02em; }
      .receipt-subtitle { margin-top: 5px; font-size: 13px; color: #64748b; }
      .receipt-meta { text-align: right; font-size: 12px; line-height: 1.7; color: #0f172a; font-weight: 700; }
      .receipt-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 10px;
      }
      .summary-card {
        min-height: 12mm;
        border: 1px solid #d9e2ec;
        border-radius: 6px;
        padding: 5px 7px;
        background: #fff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
      }
      .summary-label {
        font-size: 7px;
        line-height: 1;
        font-weight: 900;
        color: #0f2744;
        text-transform: uppercase;
        letter-spacing: .04em;
        margin: 0 0 3px;
      }
      .summary-value {
        margin: 0;
        font-size: 11px;
        font-weight: 900;
        color: #001b3f;
        line-height: 1.1;
        word-break: break-word;
      }
      .receipt-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 7px; line-height: 1; }
      .receipt-table th, .receipt-table td {
        border: 1px solid #d9e2ec;
        padding: 3px 4px;
        vertical-align: middle;
        white-space: normal;
        word-break: break-word;
        line-height: 1.05;
      }
      .receipt-table th { background: #f8fafc; text-align: left; font-weight: 900; color: #0f2744; }
      .receipt-table td { color: #0f172a; font-weight: 700; }
      .receipt-novelty-wrap { width: 48%; margin: 44mm 0 0 auto; border: 1px solid #0f2744; border-radius: 7px; overflow: hidden; background: #fff; }
      .receipt-novelty-title { text-align: center; color: #0f2744; background: #fff; font-size: 8px; font-weight: 900; letter-spacing: .04em; padding: 4px 6px; text-transform: uppercase; border-bottom: 1px solid #d9e2ec; }
      .receipt-novelty-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 7px; }
      .receipt-novelty-table th, .receipt-novelty-table td { border-right: 1px solid #d9e2ec; border-bottom: 1px solid #d9e2ec; padding: 4px 5px; color: #0f2744; font-weight: 800; text-align: center; }
      .receipt-novelty-table th { background: #fff; font-weight: 900; }
      .receipt-novelty-table th:last-child, .receipt-novelty-table td:last-child { border-right: 0; }
      .receipt-footer { margin-top: 10px; font-size: 8px; line-height: 1.2; color: #0f2744; font-weight: 900; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <section class="page receipt-page">
      <div class="receipt-header">
        <div class="receipt-header-left">
          <div class="receipt-logo-box"><img src="/favicon1.ico" alt="INOVA" /></div>
          <div>
            <div class="receipt-title">RECIBO CIEGO</div>
            <div class="receipt-subtitle">Formato de recepción y trazabilidad de ingreso</div>
          </div>
        </div>
        <div class="receipt-meta">
          <div><b>Usuario:</b> ${escapeHtml(header.usuario || "")}</div>
          <div><b>Auxiliar:</b> ${escapeHtml(header.auxiliar || "")}</div>
          <div><b>Documento:</b> ${escapeHtml(header.documento || "")}</div>
          <div><b>Fecha recibo:</b> ${escapeHtml(header.fecha_recepcion || todayISODate())}</div>
          <div><b>Generado:</b> ${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</div>
          <div><b>Serial:</b> ${escapeHtml(header.serial || "")}</div>
        </div>
      </div>

      <div class="receipt-summary">
        <div class="summary-card"><div class="summary-label">Proveedor</div><div class="summary-value">${escapeHtml(header.proveedor || "-")}</div></div>
        <div class="summary-card"><div class="summary-label">Orden compra</div><div class="summary-value">${escapeHtml(header.orden_compra || "-")}</div></div>
        <div class="summary-card"><div class="summary-label">Lineas</div><div class="summary-value">${lineas.length}</div></div>
        <div class="summary-card"><div class="summary-label">Total</div><div class="summary-value">${escapeHtml(formatQty(totalRecibo))}</div></div>
      </div>

      <table class="receipt-table">
        <colgroup>
          <col style="width: 3.2%" />
          <col style="width: 7.2%" />
          <col style="width: 7.8%" />
          <col style="width: 6.2%" />
          <col style="width: 13%" />
          <col style="width: 6.8%" />
          <col style="width: 4.6%" />
          <col style="width: 4%" />
          <col style="width: 5.8%" />
          <col style="width: 7%" />
          <col style="width: 9.5%" />
          <col style="width: 8.5%" />
          <col style="width: 8.5%" />
          <col style="width: 7.9%" />
        </colgroup>
        <thead>
          <tr>
            <th>Item</th>
            <th># Serial</th>
            <th>Fecha recepción</th>
            <th>Código</th>
            <th>Texto breve material</th>
            <th>Empaque</th>
            <th>UMB</th>
            <th>UM</th>
            <th>Cantidad</th>
            <th>Total</th>
            <th>Lote proveedor</th>
            <th>F. fabricación</th>
            <th>F. vencimiento</th>
            <th>Certificado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      ${novedadesRows ? `
        <div class="receipt-novelty-wrap">
          <div class="receipt-novelty-title">Novedad por item detectada en el recibo fisico</div>
          <table class="receipt-novelty-table">
            <colgroup><col style="width: 18%" /><col style="width: 42%" /><col style="width: 22%" /><col style="width: 18%" /></colgroup>
            <thead><tr><th>No. item</th><th>Hallazgo</th><th>Empaque</th><th>Cantidad</th></tr></thead>
            <tbody>${novedadesRows}</tbody>
          </table>
        </div>` : ""}
      <div class="receipt-footer">Documento generado desde WMS INOVA para control de recibo y trazabilidad.</div>
    </section>
  </body>
</html>`;
  };
  const guardarTrazabilidadCertificados = async () => {
    if (draft?.tipoRecibo === "devolucion") {
      return { saved: [], skipped: true, reason: "devolucion_no_aplica_certificado" };
    }

    const header = draft?.header || {};
    const reciboHtml = buildReciboConsultaHtml();
    const items = (draft?.lineas || []).map((linea, i) => ({
      fecha_recibo: linea.fecha_recepcion || header.fecha_recepcion || todayISODate(),
      codigo_material: linea.codigo || "",
      descripcion_material: linea.descripcion || "",
      unidad_medida: linea.um || "",
      lote_proveedor: linea.lote_proveedor || "",
      fecha_fabricacion: linea.fecha_fabricacion || null,
      fecha_vencimiento: linea.fecha_vencimiento || null,
      cantidad: Number(linea.total || linea.cantidad || 0),
      proveedor: header.proveedor || "",
      documento: header.documento || "",
      orden_compra: header.orden_compra || "",
      recibo_serial: header.serial || "",
      recibo_item: serialItem(header.serial || "", i),
      certificado_nombre: linea.certificado_nombre || "",
      certificado_tipo: linea.certificado_tipo || "",
      certificado_data_url: linea.certificado_data_url || "",
    }));

    return guardarCertificadosCalidad({
      header,
      items,
      recibo_documento_html: reciboHtml,
      created_at: draft?.createdAtISO || new Date().toISOString(),
    });
  };

  const postMovimiento = async (payload) => {
    await crearMovimiento(payload);
  };
  const crearMovimientoPnc = async (nov) => {
    const decision = { destino: "UBICAR_PNC", ...(pncPorNovedad[nov.key] || {}) };
    const codigoUbicacion = decision.destino === "TRANSITO_PNC" ? null : decision.ubicacion;
    await postMovimiento(
      construirPayloadMovimiento(nov.linea, nov.lineaIndex, {
        codigo_ubicacion: codigoUbicacion || null,
        estado: "PNC_BLOQUEADO",
        cantidad_r: nov.cantidadNumero,
      })
    );
  };

  const cantidadNormal = (linea, idx) => {
    return Math.max(Number(linea.total || 0) - Number(cantidadPncPorLinea[idx] || 0), 0);
  };

  const distribuirCantidadNormalAuto = (linea, idx, cantidadBase) => {
    const normalTotal = cantidadNormal(linea, idx);
    let restante = normalTotal;
    return () => {
      if (restante <= 0) return 0;
      const valor = Math.min(Number(cantidadBase || 0), restante);
      restante -= valor;
      return valor;
    };
  };

  const guardarMovimientos = async () => {
    const err = validarConUbicacion();
    if (err) {
      showNotice({ tone: "warn", title: "Datos incompletos", message: String(err) });
      return;
    }

    setGuardando(true);

    try {
      for (const nov of novedadesPNC) {
        await crearMovimientoPnc(nov);
      }

      for (let i = 0; i < draft.lineas.length; i++) {
        const linea = draft.lineas[i];
        const conf = ubicPorLinea[i] || {};
        const auto = esMaterialAuto(linea);

        if (auto) {
          const cantidadPallets = Number(linea.cantidad || 0);
          const totalLinea = Number(linea.total || 0);
          const valorUnitario = cantidadPallets > 0 ? totalLinea / cantidadPallets : 0;
          const tomarNormal = distribuirCantidadNormalAuto(linea, i, valorUnitario);

          for (const sug of conf.sugeridas || []) {
            const cantidadMovimiento = tomarNormal();
            if (cantidadMovimiento <= 0) continue;
            await postMovimiento(
              construirPayloadMovimiento(linea, i, {
                codigo_ubicacion: sug.ubicacion,
                estado: "ALMACENADO",
                cantidad_r: cantidadMovimiento,
              })
            );
          }

          for (const sug of conf.sugeridasSecundarias || []) {
            const cantidadMovimiento = tomarNormal();
            if (cantidadMovimiento <= 0) continue;
            await postMovimiento(
              construirPayloadMovimiento(linea, i, {
                codigo_ubicacion: sug.ubicacion,
                estado: "ALMACENADO",
                cantidad_r: cantidadMovimiento,
              })
            );
          }

          if (Number(conf.faltanteCantidad || 0) > 0 && conf.faltanteATransito) {
            for (let x = 0; x < Number(conf.faltanteCantidad || 0); x++) {
              const cantidadMovimiento = tomarNormal();
              if (cantidadMovimiento <= 0) continue;
              await postMovimiento(
                construirPayloadMovimiento(linea, i, {
                  codigo_ubicacion: null,
                  estado: "EN_TRANSITO",
                  cantidad_r: cantidadMovimiento,
                })
              );
            }
          }
        } else {
          const ubic = (conf.ubicacion || "").trim();
          const normal = cantidadNormal(linea, i);
          if (normal <= 0) continue;

          await postMovimiento(
            construirPayloadMovimiento(linea, i, {
              codigo_ubicacion: ubic,
              estado: "ALMACENADO",
              cantidad_r: normal,
            })
          );
        }
      }

      await guardarRotulos();
      await guardarTrazabilidadCertificados();

      localStorage.removeItem(DRAFT_KEY);
      showNotice({ tone: "success", title: "Movimientos guardados", message: "Se guardo la ubicacion y el historial de rotulos correctamente.", confirmText: "Ir a rotulos", onConfirm: () => navigate("/datos-maestros/rotulos") });

    } catch (e) {
      const msg = e?.message || String(e);
      showNotice({ tone: "error", title: "Error guardando", message: msg + (msg.includes("Failed to fetch") ? "\n\nNo se pudo comunicar con el servicio. Revisa la conexion e intenta nuevamente." : "") });
    } finally {
      setGuardando(false);
    }
  };

  const guardarEnTransito = async () => {
    const err = validarDatosBase() || validarPNC();
    if (err) {
      showNotice({ tone: "warn", title: "Datos incompletos", message: String(err) });
      return;
    }

    setGuardando(true);

    try {
      for (const nov of novedadesPNC) {
        await crearMovimientoPnc(nov);
      }

      for (let i = 0; i < draft.lineas.length; i++) {
        const linea = draft.lineas[i];
        const cantidadPallets = Number(linea.cantidad || 0);
        const totalLinea = Number(linea.total || 0);
        const normalTotal = cantidadNormal(linea, i);

        if (normalTotal <= 0) continue;

        if (Number.isInteger(cantidadPallets) && cantidadPallets > 0) {
          const valorUnitario = cantidadPallets > 0 ? totalLinea / cantidadPallets : 0;
          const tomarNormal = distribuirCantidadNormalAuto(linea, i, valorUnitario);

          for (let x = 0; x < cantidadPallets; x++) {
            const cantidadMovimiento = tomarNormal();
            if (cantidadMovimiento <= 0) continue;
            await postMovimiento(
              construirPayloadMovimiento(linea, i, {
                codigo_ubicacion: null,
                estado: "EN_TRANSITO",
                cantidad_r: cantidadMovimiento,
              })
            );
          }
        } else {
          await postMovimiento(
            construirPayloadMovimiento(linea, i, {
              codigo_ubicacion: null,
              estado: "EN_TRANSITO",
              cantidad_r: normalTotal,
            })
          );
        }
      }

      await guardarRotulos();
      await guardarTrazabilidadCertificados();

      localStorage.removeItem(DRAFT_KEY);
      showNotice({ tone: "success", title: "Material en transito", message: "Se guardo el material en EN TRANSITO por pallet y el historial de rotulos correctamente.", confirmText: "Ir a rotulos", onConfirm: () => navigate("/datos-maestros/rotulos") });

    } catch (e) {
      const msg = e?.message || String(e);
      showNotice({ tone: "error", title: "Error guardando en transito", message: msg + (msg.includes("Failed to fetch") ? "\n\nNo se pudo comunicar con el servicio. Revisa la conexion e intenta nuevamente." : "") });
    } finally {
      setGuardando(false);
    }
  };
  const renderTopButtons = () => (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button
        onClick={() => navigate("/movimientos/recibo")}
        style={{
          height: 42,
          padding: "0 14px",
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          background: colors.card,
          fontWeight: 900,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ArrowLeft size={16} />
        Regresar al Recibo
      </button>

      <button
        onClick={guardarMovimientos}
        disabled={guardando}
        style={{
          height: 42,
          padding: "0 14px",
          borderRadius: 12,
          border: "none",
          background: colors.blue,
          color: "#fff",
          fontWeight: 900,
          cursor: guardando ? "not-allowed" : "pointer",
          opacity: guardando ? 0.7 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Save size={16} />
        {guardando ? "Guardando..." : "Guardar con ubicacion"}
      </button>

      <button
        onClick={guardarEnTransito}
        disabled={guardando}
        style={{
          height: 42,
          padding: "0 14px",
          borderRadius: 12,
          border: "none",
          background: colors.warn,
          color: "#fff",
          fontWeight: 900,
          cursor: guardando ? "not-allowed" : "pointer",
          opacity: guardando ? 0.7 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Truck size={16} />
        {guardando ? "Guardando..." : "Guardar en transito"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16, width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden", position: "relative" }}>
      <style>{`
        html, body, #root {
          max-width: 100%;
          overflow-x: hidden !important;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>

      <ProcessNoticeModal notice={notice} onClose={closeNotice} />

      {guardando && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            background: "rgba(15,23,42,.42)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              width: "min(360px, calc(100vw - 32px))",
              borderRadius: 18,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              boxShadow: "0 24px 70px rgba(15,23,42,.26)",
              padding: 22,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                margin: "0 auto 12px",
                borderRadius: "999px",
                border: `4px solid ${colors.border}`,
                borderTopColor: colors.blue,
                animation: "wmsSpin 0.85s linear infinite",
              }}
            />
            <style>{`@keyframes wmsSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: 18, fontWeight: 1000, color: colors.navy }}>Guardando movimientos</div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: colors.muted }}>
              No cierres esta ventana. Estamos guardando movimientos y rotulos.
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => leerUbicacionDesdeFoto(scannerLineaIdx, e.target.files?.[0])}
      />

      {scannerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.72)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "min(760px, 96vw)",
              background: "#fff",
              borderRadius: 18,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 24px 80px rgba(0,0,0,.30)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 14,
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 1000, color: colors.navy }}>Escanear ubicacion</div>
                <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>
                  Apunta al QR/codigo de la ubicacion.
                </div>
              </div>

              <button
                onClick={cerrarScanner}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  background: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  maxHeight: 460,
                  objectFit: "cover",
                  borderRadius: 16,
                  background: "#020617",
                }}
              />

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => abrirFotoManual(scannerLineaIdx)}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <ImageUp size={16} />
                  Leer desde foto
                </button>

                <button
                  onClick={ingresarManualDesdeScanner}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Ingresar manual
                </button>

                {scannerBusy && <Chip label="Procesando..." tone="amber" />}
              </div>

              {scannerError && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(220,38,38,.08)",
                    border: "1px solid rgba(220,38,38,.18)",
                    color: colors.bad,
                    fontWeight: 800,
                  }}
                >
                  {scannerError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <div
          style={{
            padding: 18,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 12,
            flexWrap: "wrap",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, letterSpacing: 1 }}>
              MOVIMIENTOS DESDE RECIBO
            </div>
            <h1 style={{ margin: "6px 0 0", color: colors.navy, fontSize: 30 }}>
              Confirmacion de movimientos
            </h1>
            <div style={{ marginTop: 6, color: colors.muted, fontSize: 14 }}>
              Para lata, preforma y azucar eliges base y el sistema sugiere posiciones.
              Para el resto eliges base + posicion manual o escaneas la ubicacion.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Chip label={`Lineas: ${draft.lineas.length}`} tone="blue" />
            <Chip label={`Serial: ${draft.header.serial || ""}`} tone="green" />
            {guardando && <Chip label="Guardando..." tone="amber" />}
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr auto",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: "#FCFDFE",
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>PROVEEDOR</div>
                <div style={{ marginTop: 6, fontWeight: 900, color: colors.text }}>
                  {draft.header.proveedor}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: "#FCFDFE",
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>DOCUMENTO</div>
                <div style={{ marginTop: 6, fontWeight: 900, color: colors.text }}>
                  {draft.header.documento}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: "#FCFDFE",
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>REMESA</div>
                <div style={{ marginTop: 6, fontWeight: 900, color: colors.text }}>
                  {draft.header.remesa || draft.header.remesa_transp || ""}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: "#FCFDFE",
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>USUARIO</div>
                <div style={{ marginTop: 6, fontWeight: 900, color: colors.text }}>
                  {draft.header.usuario}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: "#FCFDFE",
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>
                  SERIAL (CITA)
                </div>
                <div style={{ marginTop: 6, fontWeight: 900, color: colors.text }}>
                  {draft.header.serial}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: "#FCFDFE",
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>LINEAS</div>
                <div style={{ marginTop: 6, fontWeight: 900, color: colors.text }}>
                  {draft.lineas.length}
                </div>
              </div>
            </div>

            <div>{renderTopButtons()}</div>
          </div>
        </div>
      </div>

      {ubicacionesError && (
        <div
          style={{
            ...cardStyle,
            padding: 14,
            color: colors.bad,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={16} />
          Error cargando ubicaciones: {ubicacionesError}
        </div>
      )}

      {novedadesPNC.length > 0 && (
        <div style={cardStyle}>
          <div
            style={{
              padding: 14,
              borderBottom: `1px solid ${colors.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              background: "#FFFBEB",
            }}
          >
            <div>
              <div style={{ fontWeight: 1000, color: colors.navy, fontSize: 18 }}>
                Materiales con novedad / PNC
              </div>
              <div style={{ marginTop: 4, color: colors.muted, fontSize: 12, fontWeight: 700 }}>
                Estos items se gestionan antes del flujo normal. La cantidad PNC queda bloqueada y no entra a picking.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Chip label={`Novedades: ${novedadesPNC.length}`} tone="amber" />
              <Chip label={`Cantidad PNC: ${formatQty(totalPnc)}`} tone="red" />
            </div>
          </div>
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1120, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Hallazgo</th>
                  <th style={thStyle}>Empaque</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad PNC</th>
                  <th style={thStyle}>Destino</th>
                  <th style={thStyle}>Base PNC</th>
                  <th style={thStyle}>Posicion</th>
                  <th style={thStyle}>Ubicacion PNC</th>
                </tr>
              </thead>
              <tbody>
                {novedadesPNC.map((nov) => {
                  const decision = { destino: "UBICAR_PNC", base: "", posicion: "", ubicacion: "", ...(pncPorNovedad[nov.key] || {}) };
                  const posicionesPNC = posicionesPncDisponibles(decision.base, nov.key);
                  const bloqueaUbicacion = decision.destino === "TRANSITO_PNC";
                  return (
                    <tr key={nov.key} style={{ borderBottom: `1px solid ${colors.border}`, background: "#fff" }}>
                      <td style={tdStyle}>
                        <span style={{ ...modeChipStyle, color: colors.bad, background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.22)" }}>
                          {nov.item}
                        </span>
                      </td>
                      <td style={tdStyle}>{nov.codigo}</td>
                      <td style={tdStyle}><div title={nov.descripcion} style={compactTextBox}>{nov.descripcion}</div></td>
                      <td style={tdStyle}><div title={nov.hallazgo} style={compactTextBox}>{nov.hallazgo || "Novedad reportada"}</div></td>
                      <td style={tdStyle}>{nov.empaque || "-"}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 1000, color: colors.bad }}>{formatQty(nov.cantidadNumero)}</td>
                      <td style={tdStyle}>
                        <select value={decision.destino} onChange={(e) => onPncDestinoChange(nov.key, e.target.value)} style={{ ...inputMini }}>
                          <option value="UBICAR_PNC">Ubicar PNC</option>
                          <option value="TRANSITO_PNC">Transito PNC</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <select value={decision.base} onChange={(e) => onPncBaseChange(nov.key, e.target.value)} style={{ ...inputMini }} disabled={bloqueaUbicacion}>
                          <option value="">Seleccione...</option>
                          {basesDisponibles.map((b) => (<option key={b} value={b}>{b}</option>))}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <select value={decision.posicion} onChange={(e) => onPncPosicionChange(nov.key, e.target.value)} style={{ ...inputMini }} disabled={bloqueaUbicacion || !decision.base}>
                          <option value="">Seleccione...</option>
                          {posicionesPNC.map((p) => (<option key={p} value={p}>{p}</option>))}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <input value={bloqueaUbicacion ? "EN TRANSITO PNC" : decision.ubicacion} readOnly style={{ ...compactCellInput, color: colors.bad, fontWeight: 900 }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <div
          style={{
            padding: 14,
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 1000, color: colors.navy, fontSize: 18 }}>
              Confirmacion por linea
            </div>
            <div style={{ marginTop: 4, color: colors.muted, fontSize: 12, fontWeight: 700 }}>
              Revisa ubicacion manual, escaneada o sugerida antes de guardar los movimientos.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Chip label="AUTO = sugerencia por pallets" tone="amber" />
            <Chip label="MANUAL = base + posicion / camara / foto" tone="blue" />
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", fontSize: 8.8 }}>
            <colgroup>
              <col style={{ width: "4.2%" }} />
              <col style={{ width: "6.8%" }} />
              <col style={{ width: "6.8%" }} />
              <col style={{ width: "9.6%" }} />
              <col style={{ width: "5.8%" }} />
              <col style={{ width: "6.2%" }} />
              <col style={{ width: "4.8%" }} />
              <col style={{ width: "13.0%" }} />
              <col style={{ width: "8.6%" }} />
              <col style={{ width: "7.0%" }} />
              <col style={{ width: "6.4%" }} />
              <col style={{ width: "6.4%" }} />
              <col style={{ width: "3.2%" }} />
              <col style={{ width: "3.5%" }} />
              <col style={{ width: "7.7%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={thStyle}>Modo</th>
                <th style={thStyle}>Ubicacion base</th>
                <th style={thStyle}>Posicion manual</th>
                <th style={thStyle}>Ubicacion final / sugeridas</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Codigo Cita</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Texto Breve del Material</th>
                <th style={thStyle}>Lote Almacen</th>
                <th style={thStyle}>Lote Proveedor</th>
                <th style={thStyle}>Fecha de Fabricacion</th>
                <th style={thStyle}>Fecha de Vencimiento</th>
                <th style={thStyle}>UM</th>
                <th style={thStyle}>UMB</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Cantidad</th>
              </tr>
            </thead>

            <tbody>
              {filasMov.map((r) => {
                const posicionesManual = posicionesPorBase[r.base] || [];
                const editableManual = !r.auto;
                const conf = ubicPorLinea[r.idxLineaOriginal] || {};
                const mostrarPanelSecundario =
                  r.auto &&
                  r.idxExpandido === 0 &&
                  r.source !== "secundaria" &&
                  (Number(conf.faltanteCantidad || 0) > 0 ||
                    (conf.sugeridasSecundarias || []).length > 0 ||
                    (conf.baseSecundaria || "").trim());

                return (
                  <Fragment key={r.rowKey}>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={tdStyle}>
                        {r.auto ? (
                          <span
                            title="AUTO"
                            style={{
                              ...modeChipStyle,
                              color: colors.warn,
                              background: "rgba(245,158,11,.10)",
                              border: "1px solid rgba(245,158,11,.28)",
                            }}
                          >
                            AUTO
                          </span>
                        ) : (
                          <span
                            title="MANUAL"
                            style={{
                              ...modeChipStyle,
                              color: colors.blue,
                              background: "rgba(10,110,209,.10)",
                              border: "1px solid rgba(10,110,209,.25)",
                            }}
                          >
                            MANUAL
                          </span>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <select
                          value={r.base}
                          onChange={(e) => onChangeBase(r.idxLineaOriginal, e.target.value)}
                          style={{ ...inputMini }}
                          disabled={r.auto && (conf.sugeridas || []).length > 0}
                        >
                          <option value="">Seleccione...</option>
                          {basesDisponibles.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={tdStyle}>
                        {r.auto ? (
                          <input value={r.posicion} readOnly style={{ ...compactCellInput }} />
                        ) : (
                          <select
                            value={r.posicion}
                            onChange={(e) => onChangePosicion(r.idxLineaOriginal, e.target.value)}
                            style={{ ...inputMini }}
                            disabled={!r.base || !editableManual}
                          >
                            <option value="">Seleccione...</option>
                            {posicionesManual.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {r.auto && (conf.sugeridas || []).length === 0 ? (
                          <div>
                            <button
                              onClick={() => sugerirLinea(r.idxLineaOriginal, r.cantidadRaw)}
                              disabled={!!sugiriendoLinea[r.idxLineaOriginal] || !r.base}
                              style={{
                                height: 24,
                                padding: "0 6px",
                                borderRadius: 7,
                                border: "none",
                                background: colors.warn,
                                color: "#fff",
                                fontWeight: 750,
                                cursor: !r.base ? "not-allowed" : "pointer",
                                opacity: !r.base ? 0.6 : 1,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 8.6,
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <MapPinned size={10} />
                              {sugiriendoLinea[r.idxLineaOriginal] ? "Sugiriendo..." : "Sugerido"}
                            </button>

                            <div style={{ marginTop: 4, fontSize: 8.6, color: colors.text, fontWeight: 650, lineHeight: 1 }}>
                              Sin sugerencia
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 3, alignItems: "center", width: "100%" }}>
                            <input value={r.ubicacion} readOnly style={{ ...compactCellInput }} />

                            {!r.auto && (
                              <>
                                <button
                                  onClick={() => escanearUbicacion(r.idxLineaOriginal)}
                                  title="Escanear con camara"
                                  style={{
                                    height: 24,
                                    width: 24,
                                    minWidth: 24,
                                    borderRadius: 7,
                                    border: `1px solid ${colors.border}`,
                                    background: "#fff",
                                    cursor: "pointer",
                                    display: "grid",
                                    placeItems: "center",
                                  }}
                                >
                                  <Camera size={12} />
                                </button>

                                <button
                                  onClick={() => abrirFotoManual(r.idxLineaOriginal)}
                                  title="Leer desde foto"
                                  style={{
                                    height: 24,
                                    width: 24,
                                    minWidth: 24,
                                    borderRadius: 7,
                                    border: `1px solid ${colors.border}`,
                                    background: "#fff",
                                    cursor: "pointer",
                                    display: "grid",
                                    placeItems: "center",
                                  }}
                                >
                                  <ImageUp size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <input value={r.fecha} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={r.codigoCita} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={r.sku} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <div title={r.texto} style={compactTextBox}>{r.texto}</div>
                      </td>
                      <td style={tdStyle}>
                        <input value={r.loteAlm} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={r.loteProv} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={r.ff} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={r.fv} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={r.um} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input value={r.umb} readOnly style={{ ...compactCellInput }} />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={r.cantidadFmt}
                          readOnly
                          style={{ ...compactCellInput, textAlign: "center" }}
                        />
                      </td>
                    </tr>

                    {mostrarPanelSecundario && (
                      <tr>
                        <td colSpan={16} style={{ padding: 16, background: "#FBFDFF" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 16,
                              flexWrap: "wrap",
                              alignItems: "end",
                              padding: 16,
                              border: `1px dashed ${colors.border}`,
                              borderRadius: 14,
                              background: "#fff",
                            }}
                          >
                            <div
                              style={{
                                minWidth: 170,
                                padding: 12,
                                borderRadius: 12,
                                background: "rgba(220,38,38,.06)",
                                border: "1px solid rgba(220,38,38,.14)",
                              }}
                            >
                              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
                                FALTANTE PENDIENTE
                              </div>
                              <div style={{ fontWeight: 1000, color: colors.bad, display: "flex", gap: 8, alignItems: "center" }}>
                                <AlertTriangle size={15} />
                                {Number(conf.faltanteCantidad || 0)} pallet(s)
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
                                UBICACION BASE SECUNDARIA
                              </div>
                              <select
                                value={conf.baseSecundaria || ""}
                                onChange={(e) => onChangeBaseSecundaria(r.idxLineaOriginal, e.target.value)}
                                style={{ ...inputMini, width: 220 }}
                                disabled={Number(conf.faltanteCantidad || 0) <= 0}
                              >
                                <option value="">Seleccione...</option>
                                {basesDisponibles
                                  .filter((b) => b !== conf.base)
                                  .map((b) => (
                                    <option key={b} value={b}>
                                      {b}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <button
                                onClick={() => sugerirLineaSecundaria(r.idxLineaOriginal)}
                                disabled={
                                  !!sugiriendoSecundaria[r.idxLineaOriginal] ||
                                  !(conf.baseSecundaria || "").trim() ||
                                  Number(conf.faltanteCantidad || 0) <= 0
                                }
                                style={{
                                  height: 40,
                                  padding: "0 14px",
                                  borderRadius: 12,
                                  border: "none",
                                  background: colors.blue,
                                  color: "#fff",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  opacity:
                                    !!sugiriendoSecundaria[r.idxLineaOriginal] ||
                                    !(conf.baseSecundaria || "").trim() ||
                                    Number(conf.faltanteCantidad || 0) <= 0
                                      ? 0.6
                                      : 1,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <Boxes size={15} />
                                {sugiriendoSecundaria[r.idxLineaOriginal]
                                  ? "Sugiriendo secundaria..."
                                  : "Sugerir secundaria"}
                              </button>
                            </div>

                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontWeight: 800,
                                color: colors.text,
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: `1px solid ${colors.border}`,
                                background: "#fff",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={!!conf.faltanteATransito}
                                onChange={(e) =>
                                  onToggleFaltanteTransito(r.idxLineaOriginal, e.target.checked)
                                }
                                disabled={Number(conf.faltanteCantidad || 0) <= 0}
                              />
                              Enviar faltante a transito
                            </label>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

