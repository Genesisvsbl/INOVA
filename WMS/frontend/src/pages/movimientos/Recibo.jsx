import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMateriales, getProveedores } from "../../api";
import {
  Inbox,
  RotateCcw,
  Printer,
  Save,
  Plus,
  Trash2,
  User,
  CalendarDays,
  Camera,
  FileCheck,
  ClipboardList,
  X,
} from "lucide-react";

// ===== Helpers =====
function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addMonthsISO(fechaISO, meses) {
  if (!fechaISO || !meses) return "";

  const d = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";

  const originalDay = d.getDate();
  const target = new Date(d);

  target.setMonth(target.getMonth() + Number(meses));

  // Si el día no existe en el mes destino, usa el último día válido.
  // Ejemplo: 31/01 + 1 mes => 28/02 o 29/02.
  if (target.getDate() !== originalDay) {
    target.setDate(0);
  }

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function getVigenciaMeses(material) {
  if (!material) return null;

  const rawMeses =
    material.vigencia_meses ??
    material.vigenciaMeses ??
    material.Vigencia_meses ??
    material.VigenciaMeses ??
    null;

  const meses = Number(rawMeses);
  if (Number.isFinite(meses) && meses > 0) return Math.round(meses);

  // Compatibilidad por si aún llega del backend como vigencia_dias.
  const rawDias =
    material.vigencia_dias ??
    material.vigenciaDias ??
    material.Vigencia_dias ??
    material.VigenciaDias ??
    null;

  const dias = Number(rawDias);
  if (!Number.isFinite(dias) || dias <= 0) return null;

  if (dias === 180) return 6;
  if (dias === 365) return 12;
  if (dias === 730) return 24;

  return Math.round(dias / 30.4167);
}

function getEmpaqueMaterial(material) {
  if (!material) return "";

  const raw =
    material.empaque ??
    material.Empaque ??
    material.EMPAQUE ??
    material.tipo_empaque ??
    material.tipoEmpaque ??
    material.Tipo_empaque ??
    material.TipoEmpaque ??
    "";

  const value = String(raw ?? "").trim();
  if (!value || value.toLowerCase() === "nan") return "";

  return value.toUpperCase();
}


function clampMaxLen(s, max) {
  const str = (s ?? "").toString();
  return str.length > max ? str.slice(0, max) : str;
}

function onlyAlnumAndStar(s) {
  return (s ?? "").toString().replace(/[^a-zA-Z0-9*]/g, "");
}
function limit10(s) {
  return onlyAlnumAndStar(s).slice(0, 10);
}
function pad10WithStars(s) {
  const v = limit10(s);
  return (v + "**********").slice(0, 10);
}
function pad10WithStarsAny(s) {
  const v = limit10(s);
  return (v + "**********").slice(0, 10);
}

function serialItem(serial, idx) {
  return `${serial}-${String(idx + 1).padStart(2, "0")}`;
}

function formatDateDisplay(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const short = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(short)) return short;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDots(v) {
  const iso = formatDateDisplay(v);
  if (!iso) return "";
  return iso.replaceAll("-", ".");
}

function cleanBarcodeValue(v) {
  return String(v ?? "")
    .trim()
    .replaceAll("*", "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtMilesCO = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});
function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return fmtCO.format(x);
}

function formatMiles(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return fmtMilesCO.format(Number(digits));
}

const EMPAQUES = [
  "CAJA",
  "CANECA",
  "ROLLO",
  "BULTO",
  "PALLETS",
  "ISOTANQUES",
  "BIG BAG",
  "SACO",
  "TAMBOR",
];

const DRAFT_KEY = "wms_recibo_draft";

function createEmptyLinea() {
  return {
    fecha_recepcion: todayISODate(),
    codigo: "",
    descripcion: "",
    empaque: "",
    umb: "",
    umb_bloqueado: false,
    unidad_material: null,
    um: "",
    cantidad: "",
    total: 0,
    lote_proveedor: "",
    fecha_fabricacion: "",
    fecha_vencimiento: "",
    fv_automatica: false,
    vigencia_meses: null,
    lote: "",
    certificado_nombre: "",
    certificado_tipo: "",
    certificado_data_url: "",
    certificado_fecha: "",
  };
}

function createEmptyNovedad() {
  return {
    lineaIndex: "",
    empaque: "",
    hallazgo: "",
    cantidad: "",
  };
}

function createInitialHeader() {
  return {
    serial: "",
    proveedor_id: "",
    proveedor: "",
    acreedor: "",
    remesa_transp: "",
    documento: "",
    orden_compra: "",
    auxiliar: "",
    fecha_recepcion: todayISODate(),
  };
}

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
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
  infoBg: "#eaf3ff",
  infoBd: "#cfe0ff",
};

const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  overflow: "hidden",
};

const panelHeaderStyle = {
  padding: "9px 12px",
  borderBottom: `1px solid ${colors.border}`,
  background: colors.soft,
  fontWeight: 700,
  color: "#1f3448",
  fontSize: 14,
};

const panelBodyStyle = {
  padding: 12,
};

const fieldLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: "#7a8797",
  letterSpacing: ".04em",
  marginBottom: 4,
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  outline: "none",
  background: "#fff",
  color: colors.text,
  fontSize: 13,
  fontWeight: 500,
  boxSizing: "border-box",
};

const readOnlyInputStyle = {
  ...inputStyle,
  background: "#f8fafc",
};

const selectStyle = {
  ...inputStyle,
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

const dangerButtonStyle = {
  height: 32,
  padding: "0 10px",
  borderRadius: 7,
  border: `1px solid ${colors.badBd}`,
  background: colors.badBg,
  color: colors.bad,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 12,
};

function StatusChip({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#f1f5f9", bd: "#e2e8f0", tx: colors.text },
    blue: { bg: colors.infoBg, bd: colors.infoBd, tx: colors.blue },
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
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
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

function readFileAsDataUrl(file) {
  if (file?.type?.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const maxEdge = 1800;
            const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
            const width = Math.max(1, Math.round(img.width * scale));
            const height = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.filter = "brightness(1.12) contrast(1.24) saturate(0.96)";
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.88));
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
        img.src = String(reader.result || "");
      };
      reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

const thStyle = {
  textAlign: "left",
  padding: "8px 6px",
  fontSize: 10,
  lineHeight: 1.15,
  color: "#334155",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 900,
  whiteSpace: "normal",
  wordBreak: "break-word",
  background: "#fbfcfd",
  verticalAlign: "middle",
};

const tdStyle = {
  padding: "8px 6px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "normal",
  wordBreak: "break-word",
  fontSize: 11,
  lineHeight: 1.15,
  verticalAlign: "middle",
};

const detailInputStyle = {
  ...inputStyle,
  width: "100%",
  height: 30,
  padding: "0 7px",
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 600,
  boxSizing: "border-box",
};

const detailReadOnlyInputStyle = {
  ...detailInputStyle,
  background: "#f8fafc",
};

const detailSelectStyle = {
  ...detailInputStyle,
  padding: "0 5px",
};

const detailHelpStyle = {
  marginTop: 5,
  fontSize: 9,
  fontWeight: 800,
  lineHeight: 1.15,
};

const detailTableStyle = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
};

const detailColWidths = {
  serial: "5.2%",
  item: "3.3%",
  fechaRecepcion: "7%",
  codigo: "6.2%",
  descripcion: "12.5%",
  empaque: "8%",
  umb: "5.3%",
  um: "4.9%",
  cantidad: "6.2%",
  total: "7%",
  lote: "7.4%",
  fabricacion: "7.4%",
  vencimiento: "8%",
  accion: "10.8%",
};

export default function Recibo() {
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [usuario, setUsuario] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresError, setProveedoresError] = useState("");
  const [tipoRecibo, setTipoRecibo] = useState("");
  const [header, setHeader] = useState(createInitialHeader());
  const [materiales, setMateriales] = useState([]);
  const [lineas, setLineas] = useState([createEmptyLinea()]);
  const [novedades, setNovedades] = useState([createEmptyNovedad()]);
  const [novedadOpen, setNovedadOpen] = useState(false);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    const auth = sessionStorage.getItem("auth");
    const estado = sessionStorage.getItem("estado");
    const usuarioSesion = sessionStorage.getItem("usuario");

    if (auth !== "true" || estado !== "ACTIVO" || !usuarioSesion) {
      navigate("/login", { replace: true });
      return;
    }

    setUsuario(usuarioSesion);
  }, [navigate]);

  useEffect(() => {
    getProveedores()
      .then((data) => {
        setProveedores(Array.isArray(data) ? data : []);
        setProveedoresError("");
      })
      .catch((e) => {
        setProveedores([]);
        setProveedoresError(String(e));
      });
  }, []);

  useEffect(() => {
    getMateriales()
      .then((data) => setMateriales(Array.isArray(data) ? data : []))
      .catch(() => setMateriales([]));
  }, []);

  // ==============================
  // RECALCULAR FV Y EMPAQUE CUANDO CARGAN LOS MATERIALES
  // ==============================
  useEffect(() => {
    if (!Array.isArray(materiales) || materiales.length === 0) return;

    setLineas((prev) =>
      prev.map((ln) => {
        if (!ln.codigo) return ln;

        const mat = materiales.find(
          (m) => String(m.codigo) === String(ln.codigo).trim()
        );

        const vigenciaMeses = getVigenciaMeses(mat);
        const empaqueAuto = getEmpaqueMaterial(mat);

        const base = {
          ...ln,
          descripcion: mat ? mat.descripcion : ln.descripcion,
          empaque: empaqueAuto || ln.empaque || "",
          unidad_material: mat?.unidad ?? ln.unidad_material ?? null,
          um: mat ? mat.unidad_medida : ln.um,
          vigencia_meses: vigenciaMeses,
        };

        if (!vigenciaMeses) {
          return {
            ...base,
            vigencia_meses: null,
            fv_automatica: false,
          };
        }

        const fechaVencimiento = calcularFVPorVigencia(
          ln.fecha_fabricacion,
          ln.fecha_recepcion,
          vigenciaMeses
        );

        return {
          ...base,
          fecha_vencimiento: fechaVencimiento,
          fv_automatica: !!fechaVencimiento,
        };
      })
    );
  }, [materiales]);


  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);

      if (d?.header) {
        setHeader({
          ...createInitialHeader(),
          ...d.header,
          remesa_transp: "",
          documento: "",
          orden_compra: "",
        });
      }

      if (Array.isArray(d?.lineas) && d.lineas.length) {
        setLineas(
          d.lineas.map((ln) => ({
            umb_bloqueado: false,
            unidad_material: null,
            fv_automatica: false,
            vigencia_meses: null,
            ...ln,
          }))
        );
      }
    } catch {
      // nada
    }

    setTipoRecibo("");
  }, []);

  useEffect(() => {
    if (tipoRecibo === "devolucion") {
      setHeader((prev) => ({
        ...prev,
        remesa_transp: "**********",
        orden_compra: "**********",
      }));
      setLineas((prev) =>
        prev.map((ln) => ({
          ...ln,
          certificado_nombre: "",
          certificado_tipo: "",
          certificado_data_url: "",
          certificado_fecha: "",
        }))
      );

      setErrores((prev) => {
        const copy = { ...prev };
        delete copy.remesa_transp;
        delete copy.orden_compra;
        return copy;
      });
    }

    if (tipoRecibo === "recibo") {
      setHeader((prev) => ({
        ...prev,
        remesa_transp:
          prev.remesa_transp === "**********" ? "" : prev.remesa_transp,
        orden_compra:
          prev.orden_compra === "**********" ? "" : prev.orden_compra,
      }));
    }
  }, [tipoRecibo]);

  useEffect(() => {
    setNovedades((prev) =>
      prev.map((nov) => {
        if (nov.lineaIndex === "") return nov;
        const idx = Number(nov.lineaIndex);
        const linea = Number.isInteger(idx) ? lineas[idx] : null;
        return { ...nov, empaque: linea?.empaque || nov.empaque || "" };
      })
    );
  }, [lineas]);

  const totalRecibo = useMemo(
    () => lineas.reduce((acc, ln) => acc + (Number(ln.total) || 0), 0),
    [lineas]
  );

  const setHeaderField = (k, v) => setHeader((prev) => ({ ...prev, [k]: v }));

  const onProveedorSelect = (proveedorId) => {
    const p = proveedores.find((x) => String(x.id) === String(proveedorId));
    setHeader((prev) => ({
      ...prev,
      proveedor_id: proveedorId,
      proveedor: p ? p.nombre : "",
      acreedor: p ? p.acreedor : "",
    }));
  };

  const onField10Change = (key, raw) => {
    const v = limit10(raw);
    setHeaderField(key, v);

    if ((raw ?? "").toString().length > 10) {
      setErrores((e) => ({ ...e, [key]: "Máximo 10 caracteres." }));
    } else {
      setErrores((e) => {
        const copy = { ...e };
        delete copy[key];
        return copy;
      });
    }
  };

  const onField10Blur = (key) => {
    if (
      tipoRecibo === "devolucion" &&
      (key === "remesa_transp" || key === "orden_compra")
    ) {
      setHeaderField(key, "**********");
      return;
    }
    setHeaderField(key, pad10WithStars(header[key]));
  };

  const setLinea = (idx, patch) => {
    setLineas((prev) =>
      prev.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln))
    );
  };

  const addLinea = () => {
    setLineas((prev) => [...prev, createEmptyLinea()]);
  };

  const removeLinea = (idx) =>
    setLineas((prev) => prev.filter((_, i) => i !== idx));

  const setNovedad = (idx, patch) => {
    setNovedades((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    );
  };

  const onNovedadItemChange = (idx, value) => {
    const lineIndex = value === "" ? "" : Number(value);
    const linea = Number.isInteger(lineIndex) ? lineas[lineIndex] : null;
    setNovedad(idx, {
      lineaIndex: value,
      empaque: linea?.empaque || "",
    });
  };

  const onNovedadCantidadChange = (idx, value) => {
    setNovedad(idx, { cantidad: formatMiles(value) });
  };

  const addNovedad = () => {
    setNovedades((prev) => [...prev, createEmptyNovedad()]);
  };

  const removeNovedad = (idx) => {
    setNovedades((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const onCertificadoChange = async (idx, file) => {
    if (!file) return;
    if (tipoRecibo === "devolucion") {
      alert("En devolución no aplica certificado de calidad porque es un movimiento interno.");
      return;
    }
    const maxBytes = 7 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("El certificado supera 7 MB. Toma una foto mas liviana o usa un PDF comprimido.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLinea(idx, {
        certificado_nombre: file.name || `certificado-linea-${idx + 1}`,
        certificado_tipo: file.type || "application/octet-stream",
        certificado_data_url: dataUrl,
        certificado_fecha: new Date().toISOString(),
      });
    } catch (e) {
      alert(`No se pudo anexar el certificado: ${e?.message || e}`);
    }
  };

  const clearCertificado = (idx) => {
    setLinea(idx, {
      certificado_nombre: "",
      certificado_tipo: "",
      certificado_data_url: "",
      certificado_fecha: "",
    });
  };

  const recomputeTotal = (umb, cantidad) => {
    const u = Number(umb);
    const c = Number(cantidad);
    if (!Number.isFinite(u) || !Number.isFinite(c)) return 0;
    return u * c;
  };

  const calcularFVPorVigencia = (fechaFabricacion, fechaRecepcion, vigenciaMeses) => {
    const meses = Number(vigenciaMeses);
    if (!Number.isFinite(meses) || meses <= 0) return "";

    const fechaBase = fechaFabricacion || fechaRecepcion;
    if (!fechaBase) return "";

    return addMonthsISO(fechaBase, meses);
  };

  const onCodigoChange = (idx, codigo) => {
    const code = codigo.trim();
    const mat = materiales.find((m) => String(m.codigo) === String(code));

    const unidadMaterial = mat?.unidad ?? null;
    const unidadNumero = Number(unidadMaterial);
    const bloquearUmb = Number.isFinite(unidadNumero) && unidadNumero > 1;
    const umbFinal = bloquearUmb ? String(unidadNumero) : "";

    const vigenciaMeses = getVigenciaMeses(mat);
    const tieneVigencia =
      Number.isFinite(Number(vigenciaMeses)) && Number(vigenciaMeses) > 0;

    const lineaActual = lineas[idx] || {};
    const fechaVencimiento = tieneVigencia
      ? calcularFVPorVigencia(
          lineaActual.fecha_fabricacion,
          lineaActual.fecha_recepcion,
          vigenciaMeses
        )
      : "";

    const empaqueAuto = getEmpaqueMaterial(mat);

    setLinea(idx, {
      codigo: code,
      descripcion: mat ? mat.descripcion : "",
      empaque: empaqueAuto,
      unidad_material: unidadMaterial,
      umb: umbFinal,
      umb_bloqueado: bloquearUmb,
      um: mat ? mat.unidad_medida : "",
      vigencia_meses: tieneVigencia ? Number(vigenciaMeses) : null,
      fv_automatica: tieneVigencia && !!fechaVencimiento,
      fecha_vencimiento: fechaVencimiento,
      total: recomputeTotal(umbFinal, lineas[idx]?.cantidad),
    });
  };

  const onUmbChange = (idx, value) => {
    setLineas((prev) =>
      prev.map((ln, i) => {
        if (i !== idx) return ln;
        if (ln.umb_bloqueado) return ln;

        return {
          ...ln,
          umb: value,
          total: recomputeTotal(value, ln.cantidad),
        };
      })
    );
  };

  const onCantidadChange = (idx, value) => {
    setLineas((prev) =>
      prev.map((ln, i) =>
        i === idx
          ? {
              ...ln,
              cantidad: value,
              total: recomputeTotal(ln.umb, value),
            }
          : ln
      )
    );
  };

  const onLoteProveedorChange = (idx, value) => {
    const clamped = limit10(value);
    setLinea(idx, {
      lote_proveedor: clamped,
      lote: "",
    });

    if ((value ?? "").toString().length > 10) {
      setErrores((e) => ({
        ...e,
        [`loteprov_${idx}`]: "Lote proveedor máximo 10 caracteres.",
      }));
    } else {
      setErrores((e) => {
        const copy = { ...e };
        delete copy[`loteprov_${idx}`];
        return copy;
      });
    }
  };

  const onFechaFabricacionChange = (idx, value) => {
    setLineas((prev) =>
      prev.map((ln, i) => {
        if (i !== idx) return ln;

        const fechaVencimiento =
          ln.vigencia_meses
            ? calcularFVPorVigencia(value, ln.fecha_recepcion, ln.vigencia_meses)
            : ln.fecha_vencimiento;

        return {
          ...ln,
          fecha_fabricacion: value,
          fecha_vencimiento: fechaVencimiento,
          fv_automatica: !!ln.vigencia_meses && !!fechaVencimiento,
        };
      })
    );
  };

  const validarAntesDeContinuar = () => {
    const errs = {};

    if (!tipoRecibo)
      errs.tipoRecibo = "Debes seleccionar Recibo o Devolución.";

    ["documento"].forEach((k) => {
      if (!header[k] || header[k].length !== 10) {
        errs[k] =
          "Debe quedar exactamente de 10 caracteres (se rellena con *).";
      }
    });

    if (tipoRecibo === "recibo") {
      ["remesa_transp", "orden_compra"].forEach((k) => {
        if (!header[k] || header[k].length !== 10) {
          errs[k] =
            "Debe quedar exactamente de 10 caracteres (se rellena con *).";
        }
      });
    }

    if (tipoRecibo === "devolucion") {
      if (header.remesa_transp !== "**********") {
        errs.remesa_transp = "En devolución debe quedar en **********.";
      }
      if (header.orden_compra !== "**********") {
        errs.orden_compra = "En devolución debe quedar en **********.";
      }
    }

    if (!header.proveedor_id) errs.proveedor = "Proveedor obligatorio.";
    if (!header.acreedor) errs.acreedor = "Acreedor obligatorio.";
    if (!header.auxiliar || !header.auxiliar.trim()) errs.auxiliar = "Auxiliar obligatorio.";
    if (!usuario) errs.usuario = "Usuario no identificado en sesión.";

    lineas.forEach((ln, idx) => {
      if (!ln.codigo) errs[`codigo_${idx}`] = "Código obligatorio.";
      if (!ln.empaque) errs[`empaque_${idx}`] = "Empaque obligatorio.";
      if (!ln.cantidad || Number(ln.cantidad) <= 0)
        errs[`cantidad_${idx}`] = "Cantidad > 0 obligatoria.";
      if (!ln.umb || Number(ln.umb) <= 0)
        errs[`umb_${idx}`] = "UMB (valor) > 0 obligatoria.";

      if ((ln.lote_proveedor ?? "").toString().trim().length !== 10) {
        errs[`loteprov_${idx}`] = "Lote proveedor debe ser exactamente 10.";
      }
      if (!ln.fecha_vencimiento)
        errs[`fv_${idx}`] = "Fecha vencimiento obligatoria.";
    });

    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const onGuardarRecibo = async () => {
    if (!tipoRecibo) {
      alert("Debes seleccionar primero Recibo o Devolución.");
      return;
    }

    if (tipoRecibo === "devolucion") {
      setHeader((prev) => ({
        ...prev,
        remesa_transp: "**********",
        orden_compra: "**********",
        documento: pad10WithStars(prev.documento),
      }));
    } else {
      ["remesa_transp", "documento", "orden_compra"].forEach((k) => {
        setHeaderField(k, pad10WithStars(header[k]));
      });
    }

    setTimeout(() => {
      if (!validarAntesDeContinuar()) {
        alert("Hay errores. Revisa los campos marcados.");
        return;
      }

      const codigo_cita = header.serial;

      const headerFinal =
        tipoRecibo === "devolucion"
          ? {
              ...header,
              remesa_transp: "**********",
              orden_compra: "**********",
              documento: pad10WithStars(header.documento),
            }
          : {
              ...header,
              remesa_transp: pad10WithStars(header.remesa_transp),
              documento: pad10WithStars(header.documento),
              orden_compra: pad10WithStars(header.orden_compra),
            };

      const draft = {
        tipo: "ENTRADA",
        tipoRecibo,
        header: { ...headerFinal, usuario, codigo_cita },
        lineas: lineas.map((ln) => ({
          ...ln,
          lote: "",
          lote_proveedor: pad10WithStarsAny(ln.lote_proveedor),
          fecha_fabricacion: ln.fecha_fabricacion || "",
          fecha_vencimiento: ln.fecha_vencimiento || "",
          certificado_nombre: tipoRecibo === "devolucion" ? "" : ln.certificado_nombre || "",
          certificado_tipo: tipoRecibo === "devolucion" ? "" : ln.certificado_tipo || "",
          certificado_data_url: tipoRecibo === "devolucion" ? "" : ln.certificado_data_url || "",
          certificado_fecha: tipoRecibo === "devolucion" ? "" : ln.certificado_fecha || "",
        })),
        totalRecibo,
        createdAtISO: new Date().toISOString(),
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      navigate("/movimientos/desde-recibo");
    }, 0);
  };

  const buildReciboRowsHtml = () => {
    return lineas
      .map((ln, idx) => {
        const serial = serialItem(header.serial, idx);

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(serial)}</td>
            <td>${escapeHtml(formatDateDisplay(ln.fecha_recepcion))}</td>
            <td>${escapeHtml(ln.codigo)}</td>
            <td>${escapeHtml(ln.descripcion)}</td>
            <td>${escapeHtml(ln.empaque)}</td>
            <td style="text-align:right;">${escapeHtml(ln.umb)}</td>
            <td>${escapeHtml(ln.um)}</td>
            <td style="text-align:right;">${escapeHtml(ln.cantidad)}</td>
            <td style="text-align:right;">${escapeHtml(
              formatMoney(ln.total || 0)
            )}</td>
            <td>${escapeHtml(ln.lote_proveedor)}</td>
            <td>${escapeHtml(formatDateDisplay(ln.fecha_fabricacion))}</td>
            <td>${escapeHtml(formatDateDisplay(ln.fecha_vencimiento))}</td>
          </tr>
        `;
      })
      .join("");
  };

  const buildNovedadesRowsHtml = () => {
    const rows = novedades
      .map((nov) => {
        const idx = nov.lineaIndex === "" ? null : Number(nov.lineaIndex);
        const linea = Number.isInteger(idx) ? lineas[idx] : null;
        return {
          item: linea ? idx + 1 : "",
          hallazgo: nov.hallazgo || "",
          empaque: nov.empaque || linea?.empaque || "",
          cantidad: nov.cantidad || "",
        };
      })
      .filter((row) => row.item || row.hallazgo || row.empaque || row.cantidad);

    if (!rows.length) return "";
    rows.push({ item: "", hallazgo: "", empaque: "", cantidad: "" });

    return rows
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.item)}</td>
          <td>${escapeHtml(row.hallazgo)}</td>
          <td>${escapeHtml(row.empaque)}</td>
          <td style="text-align:right;">${escapeHtml(row.cantidad)}</td>
        </tr>
      `)
      .join("");
  };

  const buildTarjetasHtml = () => {
    return lineas
      .map((ln, idx) => {
        const serial = serialItem(header.serial, idx);
        const codigo = (ln.codigo || "").trim();
        const descripcion = (ln.descripcion || "").trim();
        const cantidad = formatMoney(ln.total || 0);
        const fechaVenc = formatDateDots(ln.fecha_vencimiento);
        const loteProveedorClean = cleanBarcodeValue(ln.lote_proveedor || "");

        return `
          <section class="card-sheet">
            <div class="id-card">
              <div class="id-card-top">
                <div class="id-brand">
                  <div class="id-logo-wrap">
                    <img src="/favicon1.ico" alt="INOVA" class="id-logo" />
                  </div>

                  <div>
                    <div class="id-brand-title">WMS INOVA</div>
                    <div class="id-brand-sub">Tarjeta de identificación logística</div>
                  </div>
                </div>

                <div class="id-serial-box">
                  <div class="id-label-mini">SERIAL</div>
                  <div class="id-serial-value">${escapeHtml(serial)}</div>
                </div>
              </div>

              <div class="id-main-grid">
                <div class="id-main-cell">
                  <div class="id-label-mini">CÓDIGO</div>
                  <div class="id-main-value">${escapeHtml(codigo || "-")}</div>
                </div>

                <div class="id-main-cell right">
                  <div class="id-label-mini">CANTIDAD</div>
                  <div class="id-main-value">${escapeHtml(
                    cantidad || "0,00"
                  )}</div>
                </div>
              </div>

              <div class="id-description-block">
                <div class="id-label-mini">DESCRIPCIÓN</div>
                <div class="id-description-text">${escapeHtml(
                  descripcion || "-"
                )}</div>
              </div>

              <div class="barcode-section">
                <div class="id-label-mini">FECHA VENCIMIENTO</div>
                <div class="barcode-box">
                  <svg id="barcode-fv-${idx}"></svg>
                </div>
                <div class="barcode-caption">${escapeHtml(
                  fechaVenc || "-"
                )}</div>
              </div>

              <div class="barcode-section">
                <div class="id-label-mini">LOTE PROVEEDOR</div>
                <div class="barcode-box">
                  <svg id="barcode-lp-${idx}"></svg>
                </div>
                <div class="barcode-caption">${escapeHtml(
                  loteProveedorClean || "-"
                )}</div>
              </div>

              <div class="id-footer">
                <div><b>Proveedor:</b> ${escapeHtml(
                  header.proveedor || "-"
                )}</div>
                <div><b>Documento:</b> ${escapeHtml(
                  header.documento || "-"
                )}</div>
              </div>
            </div>
          </section>
        `;
      })
      .join("");
  };

  const buildBarcodeScript = () => {
    return lineas
      .map((ln, idx) => {
        const fechaVenc = JSON.stringify(
          formatDateDots(ln.fecha_vencimiento) || "SIN.FECHA"
        );
        const loteProveedorClean = JSON.stringify(
          cleanBarcodeValue(ln.lote_proveedor || "") || "VACIO"
        );

        return `
          try {
            JsBarcode("#barcode-fv-${idx}", ${fechaVenc}, {
              format: "CODE128",
              displayValue: false,
              height: 34,
              width: 1.0,
              margin: 0
            });
          } catch (e) {
            console.error("Error barcode fecha vencimiento ${idx}", e);
          }

          try {
            JsBarcode("#barcode-lp-${idx}", ${loteProveedorClean}, {
              format: "CODE128",
              displayValue: false,
              height: 34,
              width: 1.0,
              margin: 0
            });
          } catch (e) {
            console.error("Error barcode lote proveedor ${idx}", e);
          }
        `;
      })
      .join("\n");
  };

  const onImprimir = () => {
    if (!tipoRecibo) {
      alert("Debes seleccionar primero Recibo o Devolución.");
      return;
    }

    const w = window.open("", "_blank", "width=1600,height=1000");
    if (!w) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    const proveedorNombre =
      proveedores.find((x) => String(x.id) === String(header.proveedor_id))
        ?.nombre ||
      header.proveedor ||
      "";

    const reciboRowsHtml = buildReciboRowsHtml();
    const novedadesRowsHtml = buildNovedadesRowsHtml();
    const tarjetasHtml = buildTarjetasHtml();
    const barcodeScript = buildBarcodeScript();

    const html = `
      <html>
        <head>
          <title>${escapeHtml(
            tipoRecibo === "devolucion" ? "Devolución" : "Recibo ciego"
          )} - ${escapeHtml(header.serial)}</title>
          <meta charset="utf-8" />
          <link rel="preload" as="image" href="/favicon1.ico" />
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            html, body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }

            .page {
              width: 100%;
              min-height: calc(100vh - 24mm);
            }

            .receipt-page {
              page-break-after: always;
            }

            .receipt-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              border-bottom: 2px solid #0f2744;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }

            .receipt-header-left {
              display: flex;
              align-items: center;
              gap: 14px;
            }

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

            .receipt-logo-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .receipt-title {
              font-size: 28px;
              font-weight: 900;
              color: #0f2744;
              letter-spacing: .02em;
            }

            .receipt-subtitle {
              margin-top: 5px;
              font-size: 13px;
              color: #64748b;
            }

            .receipt-meta {
              text-align: right;
              font-size: 12px;
              line-height: 1.7;
              color: #0f172a;
              font-weight: 700;
            }

            .receipt-summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 5px;
              margin-bottom: 7px;
              align-items: stretch;
            }

            .summary-card {
              min-height: 11mm;
              border: 1px solid #d9e2ec;
              border-radius: 5px;
              padding: 3px 5px;
              background: #fff;
              display: flex;
              flex-direction: column;
              justify-content: center;
              overflow: hidden;
            }

            .summary-label {
              font-size: 6.3px;
              line-height: 1;
              font-weight: 900;
              color: #0f2744;
              text-transform: uppercase;
              letter-spacing: .035em;
              margin: 0 0 2px;
            }

            .summary-value {
              margin: 0;
              font-size: 10px;
              font-weight: 900;
              color: #001b3f;
              line-height: 1;
              word-break: break-word;
            }

            .receipt-table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              font-size: 6.7px;
              line-height: 1;
            }

            .receipt-table th,
            .receipt-table td {
              border: 1px solid #d9e2ec;
              padding: 2px 3px;
              vertical-align: middle;
              white-space: normal;
              word-break: break-word;
              line-height: 1;
            }

            .receipt-table th {
              background: #f8fafc;
              text-align: left;
              font-weight: 900;
              color: #0f2744;
            }

            .receipt-table td {
              color: #0f172a;
              font-weight: 700;
            }

            .receipt-novelty-wrap {
              width: 48%;
              margin: 8mm 0 0 auto;
              padding-top: 12px;
              position: relative;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .receipt-novelty-title {
              min-width: 72%;
              height: 28px;
              display: inline-grid;
              place-items: center;
              position: absolute;
              left: 50%;
              top: 0;
              transform: translateX(-50%);
              padding: 0 14px;
              border-radius: 10px 10px 0 0;
              color: #ffffff;
              background: #0f2744;
              font-size: 10.5px;
              line-height: 1;
              font-weight: 900;
              letter-spacing: .02em;
              text-transform: uppercase;
              box-shadow: 0 2px 6px rgba(15, 39, 68, .18);
              z-index: 2;
            }

            .receipt-novelty-table {
              width: 100%;
              table-layout: fixed;
              border-collapse: separate;
              border-spacing: 0;
              border: 1.4px solid #0f2744;
              border-radius: 8px;
              overflow: hidden;
              font-size: 9.4px;
              line-height: 1.1;
            }

            .receipt-novelty-table th,
            .receipt-novelty-table td {
              height: 23px;
              border-right: 1px solid #cbd5e1;
              border-bottom: 1px dashed #cbd5e1;
              padding: 4px 6px;
              color: #0f172a;
              background: #ffffff;
              vertical-align: middle;
              font-weight: 800;
            }

            .receipt-novelty-table th:last-child,
            .receipt-novelty-table td:last-child {
              border-right: 0;
            }

            .receipt-novelty-table tr:last-child td {
              border-bottom: 0;
            }

            .receipt-novelty-table th {
              height: 34px;
              text-align: center;
              font-size: 9.2px;
              font-weight: 900;
              color: #0f2744;
              background: linear-gradient(180deg, #ffffff 0%, #f3f7fb 100%);
              border-bottom: 1px solid #cbd5e1;
            }

            .receipt-novelty-table .nov-icon {
              display: inline-block;
              margin-right: 5px;
              color: #0f2744;
              font-size: 13px;
              vertical-align: -1px;
            }

            .receipt-footer {
              margin-top: 7px;
              font-size: 8px;
              line-height: 1.1;
              color: #0f2744;
              font-weight: 900;
            }

            /* TARJETAS / RÓTULOS: 4 POR HOJA A4 LANDSCAPE */
            .card-sheet {
              width: 50%;
              height: 88mm;
              display: inline-flex;
              align-items: stretch;
              justify-content: center;
              padding: 2mm;
              margin: 0;
              vertical-align: top;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: auto;
              overflow: hidden;
            }

            .card-sheet:last-child {
              page-break-after: auto;
            }

            .id-card {
              width: 100%;
              height: 100%;
              border: 1px solid #d9e2ec;
              border-radius: 10px;
              padding: 3mm;
              background: #fff;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }

            .id-card-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 5px;
              padding-bottom: 5px;
              border-bottom: 1px solid #e5e7eb;
              flex-shrink: 0;
            }

            .id-brand {
              display: flex;
              align-items: center;
              gap: 7px;
              min-width: 0;
            }

            .id-logo-wrap {
              width: 30px;
              height: 30px;
              border: 1px solid #d9e2ec;
              border-radius: 8px;
              overflow: hidden;
              display: grid;
              place-items: center;
              background: #fff;
              flex-shrink: 0;
            }

            .id-logo {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }

            .id-brand-title {
              font-size: 11px;
              font-weight: 900;
              color: #0f2744;
              line-height: 1;
            }

            .id-brand-sub {
              margin-top: 2px;
              font-size: 7px;
              color: #64748b;
              line-height: 1.1;
              white-space: nowrap;
            }

            .id-serial-box {
              min-width: 34mm;
              text-align: right;
              flex-shrink: 0;
            }

            .id-label-mini {
              font-size: 6.5px;
              color: #0f172a;
              font-weight: 900;
              letter-spacing: .04em;
              text-transform: uppercase;
              line-height: 1;
            }

            .id-serial-value {
              margin-top: 2px;
              font-size: 14px;
              font-weight: 900;
              color: #0f2744;
              line-height: 1;
              white-space: nowrap;
            }

            .id-main-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 5px;
              flex-shrink: 0;
            }

            .id-main-cell.right {
              text-align: right;
            }

            .id-main-value {
              margin-top: 3px;
              font-size: 17px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1;
              word-break: break-word;
            }

            .id-description-block {
              margin-bottom: 5px;
              padding-bottom: 5px;
              border-bottom: 1px solid #e5e7eb;
              flex-shrink: 0;
            }

            .id-description-text {
              margin-top: 3px;
              font-size: 9px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.15;
              max-height: 20px;
              overflow: hidden;
            }

            .barcode-section {
              margin-top: 4px;
              padding-top: 4px;
              border-top: 1px solid #eceff3;
              flex-shrink: 0;
              text-align: center;
            }

            .barcode-box {
              margin-top: 3px;
              height: 12mm;
              min-height: 12mm;
              max-height: 12mm;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }

            .barcode-box svg {
              width: 52mm !important;
              height: 12mm !important;
              max-width: 100%;
              display: block;
            }

            .barcode-caption {
              margin-top: 2px;
              font-size: 7px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1;
            }

            .id-footer {
              margin-top: auto;
              padding-top: 4px;
              border-top: 1px solid #e5e7eb;
              display: grid;
              gap: 2px;
              font-size: 7px;
              color: #334155;
              font-weight: 800;
              line-height: 1.1;
            }

            @media print {
              .card-sheet:nth-of-type(4n + 1) {
                page-break-before: auto;
              }
            }
          </style>
        </head>
        <body>
          <section class="page receipt-page">
            <div class="receipt-header">
              <div class="receipt-header-left">
                <div class="receipt-logo-box">
                  <img src="/favicon1.ico" alt="INOVA" />
                </div>

                <div>
                  <div class="receipt-title">
                    ${escapeHtml(
                      tipoRecibo === "devolucion"
                        ? "DEVOLUCIÓN"
                        : "RECIBO CIEGO"
                    )}
                  </div>
                  <div class="receipt-subtitle">
                    Formato de recepción y trazabilidad de ingreso
                  </div>
                </div>
              </div>

              <div class="receipt-meta">
                <div><b>Usuario:</b> ${escapeHtml(usuario)}</div>
                <div><b>Auxiliar:</b> ${escapeHtml(header.auxiliar)}</div>
                <div><b>Documento:</b> ${escapeHtml(header.documento)}</div>
                <div><b>Fecha:</b> ${escapeHtml(header.fecha_recepcion)}</div>
                <div><b>Serial:</b> ${escapeHtml(header.serial)}</div>
              </div>
            </div>

            <div class="receipt-summary">
              <div class="summary-card">
                <div class="summary-label">Proveedor</div>
                <div class="summary-value">${escapeHtml(
                  proveedorNombre || "-"
                )}</div>
              </div>

              <div class="summary-card">
                <div class="summary-label">Serial</div>
                <div class="summary-value">${escapeHtml(
                  header.serial || "-"
                )}</div>
              </div>

              <div class="summary-card">
                <div class="summary-label">Líneas</div>
                <div class="summary-value">${lineas.length}</div>
              </div>

              <div class="summary-card">
                <div class="summary-label">Total</div>
                <div class="summary-value">${escapeHtml(
                  formatMoney(totalRecibo)
                )}</div>
              </div>
            </div>

            <table class="receipt-table">
              <colgroup>
                <col style="width: 3.6%" />
                <col style="width: 7.2%" />
                <col style="width: 8.2%" />
                <col style="width: 6.2%" />
                <col style="width: 13.5%" />
                <col style="width: 7.8%" />
                <col style="width: 5%" />
                <col style="width: 4.2%" />
                <col style="width: 6.1%" />
                <col style="width: 7.6%" />
                <col style="width: 10.2%" />
                <col style="width: 9.2%" />
                <col style="width: 11.2%" />
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
                </tr>
              </thead>
              <tbody>
                ${reciboRowsHtml}
              </tbody>
            </table>

            ${tipoRecibo === "recibo" && novedadesRowsHtml ? `
              <div class="receipt-novelty-wrap">
                <div class="receipt-novelty-title">NOVEDAD POR ITEM DETECTADA EN EL RECIBO FÍSICO</div>
                <table class="receipt-novelty-table">
                  <colgroup>
                    <col style="width: 18%" />
                    <col style="width: 32%" />
                    <col style="width: 28%" />
                    <col style="width: 22%" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th><span class="nov-icon">▣</span>No. Item</th>
                      <th><span class="nov-icon">⌕</span>Hallazgo</th>
                      <th><span class="nov-icon">▧</span>Tipo de empaque</th>
                      <th><span class="nov-icon">#</span>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${novedadesRowsHtml}
                  </tbody>
                </table>
              </div>
            ` : ""}

            <div class="receipt-footer">
              Documento generado desde WMS INOVA para control de recibo y trazabilidad.
            </div>
          </section>

          ${tarjetasHtml}

          <script>
            ${barcodeScript}
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 700);
            };
          </script>
        </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const selectedTipoLabel =
    !tipoRecibo
      ? "Selecciona tipo de movimiento"
      : tipoRecibo === "devolucion"
      ? "Devolución"
      : "Recibo ciego";

  return (
    <div style={{ display: "grid", gap: 16 }}>
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
                background: "#eaf1f8",
                border: "1px solid #d6e1ec",
                flexShrink: 0,
              }}
            >
              {tipoRecibo === "devolucion" ? (
                <RotateCcw size={18} color="#315a7d" />
              ) : (
                <Inbox size={18} color="#315a7d" />
              )}
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
                Recibo
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#17324d",
                }}
              >
                {selectedTipoLabel}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#5b6b7c",
                  marginTop: 4,
                }}
              >
                Registro de entrada con impresión, trazabilidad y preparación
                para asignación de ubicación.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tipoRecibo && (
              <>
                <button onClick={onImprimir} style={secondaryButtonStyle}>
                  <Printer size={15} />
                  Imprimir
                </button>
                <button onClick={onGuardarRecibo} style={primaryButtonStyle}>
                  <Save size={15} />
                  Guardar y asignar ubicación
                </button>
              </>
            )}
          </div>
        </div>

        <div style={panelBodyStyle}>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setTipoRecibo("recibo")}
              style={{
                ...secondaryButtonStyle,
                borderColor:
                  tipoRecibo === "recibo" ? "#cfe0ff" : colors.border,
                background: tipoRecibo === "recibo" ? "#eaf3ff" : "#fff",
                color: tipoRecibo === "recibo" ? colors.blue : colors.text,
              }}
            >
              <Inbox size={15} />
              Recibo
            </button>

            <button
              type="button"
              onClick={() => setTipoRecibo("devolucion")}
              style={{
                ...secondaryButtonStyle,
                borderColor:
                  tipoRecibo === "devolucion" ? "#cfe0ff" : colors.border,
                background:
                  tipoRecibo === "devolucion" ? "#eaf3ff" : "#fff",
                color:
                  tipoRecibo === "devolucion" ? colors.blue : colors.text,
              }}
            >
              <RotateCcw size={15} />
              Devolución
            </button>

            {!tipoRecibo && (
              <StatusChip label="Debes seleccionar tipo" tone="amber" />
            )}
            {tipoRecibo === "recibo" && (
              <StatusChip label="Modo recibo" tone="blue" />
            )}
            {tipoRecibo === "devolucion" && (
              <StatusChip label="Modo devolución" tone="green" />
            )}
          </div>

          {!!errores.tipoRecibo && (
            <div
              style={{
                marginBottom: 12,
                color: colors.bad,
                background: colors.badBg,
                border: `1px solid ${colors.badBd}`,
                borderRadius: 8,
                padding: "10px 12px",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {errores.tipoRecibo}
            </div>
          )}

          {!tipoRecibo && (
            <div
              style={{
                border: `1px dashed ${colors.border}`,
                borderRadius: 10,
                padding: 24,
                background: "#f8fafc",
                textAlign: "center",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              Selecciona primero <b>Recibo</b> o <b>Devolución</b> para
              continuar.
            </div>
          )}
        </div>
      </div>

      {tipoRecibo && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 16,
            }}
          >
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>Cabecera del documento</div>
              <div style={panelBodyStyle}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={fieldLabelStyle}>Usuario</div>
                    <div
                      style={{
                        ...readOnlyInputStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <User size={14} color={colors.muted} />
                      <span>{usuario || "(sin usuario)"}</span>
                    </div>
                    {!!errores.usuario && (
                      <div
                        style={{
                          marginTop: 6,
                          color: colors.bad,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {errores.usuario}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Serial</div>
                    <input
                      value={header.serial}
                      onChange={(e) =>
                        setHeaderField(
                          "serial",
                          clampMaxLen(e.target.value, 10)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Auxiliar</div>
                    <input
                      value={header.auxiliar}
                      onChange={(e) =>
                        setHeaderField(
                          "auxiliar",
                          clampMaxLen(e.target.value.toUpperCase(), 40)
                        )
                      }
                      placeholder="Nombre del auxiliar encargado de pegar el rótulo.
"
                      style={inputStyle}
                    />
                    {!!errores.auxiliar && (
                      <div
                        style={{
                          marginTop: 6,
                          color: colors.bad,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {errores.auxiliar}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Proveedor</div>
                    <select
                      value={header.proveedor_id}
                      onChange={(e) => onProveedorSelect(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Seleccione proveedor...</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                    {!!errores.proveedor && (
                      <div
                        style={{
                          marginTop: 6,
                          color: colors.bad,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {errores.proveedor}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Acreedor</div>
                    <input
                      value={header.acreedor}
                      readOnly
                      placeholder="Auto por proveedor"
                      style={readOnlyInputStyle}
                    />
                    {!!errores.acreedor && (
                      <div
                        style={{
                          marginTop: 6,
                          color: colors.bad,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {errores.acreedor}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Fecha recepción</div>
                    <div
                      style={{
                        ...readOnlyInputStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CalendarDays size={14} color={colors.muted} />
                      <span>{header.fecha_recepcion}</span>
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Total recibo</div>
                    <div
                      style={{
                        ...readOnlyInputStyle,
                        fontWeight: 800,
                        color: colors.navy,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {formatMoney(totalRecibo)}
                    </div>
                  </div>
                </div>

                {proveedoresError && (
                  <div
                    style={{
                      marginTop: 12,
                      color: colors.bad,
                      background: colors.badBg,
                      border: `1px solid ${colors.badBd}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Error cargando proveedores: {proveedoresError}
                  </div>
                )}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>Campos de referencia</div>
              <div style={panelBodyStyle}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={fieldLabelStyle}>Remesa transporte (10)</div>
                    <input
                      value={header.remesa_transp}
                      onChange={(e) =>
                        onField10Change("remesa_transp", e.target.value)
                      }
                      onBlur={() => onField10Blur("remesa_transp")}
                      maxLength={10}
                      disabled={tipoRecibo === "devolucion"}
                      style={{
                        ...inputStyle,
                        background:
                          tipoRecibo === "devolucion" ? "#f8fafc" : "#fff",
                      }}
                    />
                    {!!errores.remesa_transp && (
                      <div
                        style={{
                          marginTop: 6,
                          color: colors.bad,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {errores.remesa_transp}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Documento (10)</div>
                    <input
                      value={header.documento}
                      onChange={(e) =>
                        onField10Change("documento", e.target.value)
                      }
                      onBlur={() => onField10Blur("documento")}
                      maxLength={10}
                      style={inputStyle}
                    />
                    {!!errores.documento && (
                      <div
                        style={{
                          marginTop: 6,
                          color: colors.bad,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {errores.documento}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Orden de compra (10)</div>
                    <input
                      value={header.orden_compra}
                      onChange={(e) =>
                        onField10Change("orden_compra", e.target.value)
                      }
                      onBlur={() => onField10Blur("orden_compra")}
                      maxLength={10}
                      disabled={tipoRecibo === "devolucion"}
                      style={{
                        ...inputStyle,
                        background:
                          tipoRecibo === "devolucion" ? "#f8fafc" : "#fff",
                      }}
                    />
                    {!!errores.orden_compra && (
                      <div
                        style={{
                          marginTop: 6,
                          color: colors.bad,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {errores.orden_compra}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <StatusChip label={`Líneas: ${lineas.length}`} tone="blue" />
                    <StatusChip
                      label={`Usuario: ${usuario || "-"}`}
                      tone="green"
                    />
                    {tipoRecibo === "devolucion" && (
                      <StatusChip
                        label="Remesa y OC bloqueadas"
                        tone="amber"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div ref={printRef} style={panelStyle}>
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
              <div>Detalle de líneas</div>

              <div style={{ display: "flex", gap: 8 }}>
                {tipoRecibo === "recibo" && (
                  <button
                    onClick={() => setNovedadOpen((value) => !value)}
                    style={{
                      ...secondaryButtonStyle,
                      width: 38,
                      padding: 0,
                      justifyContent: "center",
                      borderColor: novedadOpen ? colors.infoBd : colors.border,
                      background: novedadOpen ? colors.infoBg : "#fff",
                      color: novedadOpen ? colors.blue : colors.text,
                    }}
                    title="Reportar novedad por item"
                  >
                    <ClipboardList size={16} />
                  </button>
                )}
                <button onClick={addLinea} style={secondaryButtonStyle}>
                  <Plus size={15} />
                  Agregar línea
                </button>
                <button onClick={onImprimir} style={secondaryButtonStyle}>
                  <Printer size={15} />
                  Imprimir
                </button>
              </div>
            </div>

            <div style={{ width: "100%", overflowX: "hidden" }}>
              <table style={detailTableStyle}>
                <colgroup>
                  <col style={{ width: detailColWidths.serial }} />
                  <col style={{ width: detailColWidths.item }} />
                  <col style={{ width: detailColWidths.fechaRecepcion }} />
                  <col style={{ width: detailColWidths.codigo }} />
                  <col style={{ width: detailColWidths.descripcion }} />
                  <col style={{ width: detailColWidths.empaque }} />
                  <col style={{ width: detailColWidths.umb }} />
                  <col style={{ width: detailColWidths.um }} />
                  <col style={{ width: detailColWidths.cantidad }} />
                  <col style={{ width: detailColWidths.total }} />
                  <col style={{ width: detailColWidths.lote }} />
                  <col style={{ width: detailColWidths.fabricacion }} />
                  <col style={{ width: detailColWidths.vencimiento }} />
                  <col style={{ width: detailColWidths.accion }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thStyle}># Serial</th>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Fecha recepción</th>
                    <th style={thStyle}>Código</th>
                    <th style={thStyle}>Texto breve material</th>
                    <th style={thStyle}>Empaque</th>
                    <th style={thStyle}>UMB</th>
                    <th style={thStyle}>UM</th>
                    <th style={thStyle}>Cantidad</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Lote proveedor (10)</th>
                    <th style={thStyle}>Fecha fabricación</th>
                    <th style={thStyle}>Fecha vencimiento</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((ln, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: colors.navy }}>
                          {serialItem(header.serial, idx)}
                        </div>
                      </td>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={ln.fecha_recepcion}
                          readOnly
                          style={detailReadOnlyInputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          list="materialesList"
                          value={ln.codigo}
                          onChange={(e) => onCodigoChange(idx, e.target.value)}
                          placeholder="Código"
                          style={detailInputStyle}
                        />
                        {!!errores[`codigo_${idx}`] && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.bad,
                            }}
                          >
                            {errores[`codigo_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={ln.descripcion}
                          readOnly
                          style={detailReadOnlyInputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={ln.empaque}
                          onChange={(e) =>
                            setLinea(idx, { empaque: e.target.value })
                          }
                          style={detailSelectStyle}
                        >
                          <option value="">Seleccione...</option>
                          {ln.empaque && !EMPAQUES.includes(ln.empaque) && (
                            <option value={ln.empaque}>{ln.empaque}</option>
                          )}
                          {EMPAQUES.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                        {ln.empaque && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.good,
                            }}
                          >
                            Auto desde material: {ln.empaque}
                          </div>
                        )}
                        {!!errores[`empaque_${idx}`] && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.bad,
                            }}
                          >
                            {errores[`empaque_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          value={ln.umb}
                          onChange={(e) => onUmbChange(idx, e.target.value)}
                          readOnly={ln.umb_bloqueado}
                          style={
                            ln.umb_bloqueado
                              ? detailReadOnlyInputStyle
                              : detailInputStyle
                          }
                        />
                        {!!errores[`umb_${idx}`] && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.bad,
                            }}
                          >
                            {errores[`umb_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={ln.um}
                          readOnly
                          style={detailReadOnlyInputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          value={ln.cantidad}
                          onChange={(e) =>
                            onCantidadChange(idx, e.target.value)
                          }
                          style={detailInputStyle}
                        />
                        {!!errores[`cantidad_${idx}`] && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.bad,
                            }}
                          >
                            {errores[`cantidad_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={formatMoney(ln.total || 0)}
                          readOnly
                          style={detailReadOnlyInputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={ln.lote_proveedor}
                          onChange={(e) =>
                            onLoteProveedorChange(idx, e.target.value)
                          }
                          onBlur={() =>
                            setLinea(idx, {
                              lote_proveedor: pad10WithStarsAny(
                                ln.lote_proveedor
                              ),
                            })
                          }
                          maxLength={10}
                          placeholder="10 caracteres"
                          style={detailInputStyle}
                        />
                        {!!errores[`loteprov_${idx}`] && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.bad,
                            }}
                          >
                            {errores[`loteprov_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={ln.fecha_fabricacion}
                          onChange={(e) =>
                            onFechaFabricacionChange(idx, e.target.value)
                          }
                          style={detailInputStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={ln.fecha_vencimiento}
                          readOnly={ln.fv_automatica}
                          onChange={(e) =>
                            setLinea(idx, {
                              fecha_vencimiento: e.target.value,
                              fv_automatica: false,
                            })
                          }
                          style={
                            ln.fv_automatica
                              ? detailReadOnlyInputStyle
                              : detailInputStyle
                          }
                        />
                        {ln.fv_automatica && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.good,
                            }}
                          >
                            Automática: {ln.vigencia_meses} meses desde fabricación
                          </div>
                        )}
                        {!!errores[`fv_${idx}`] && (
                          <div
                            style={{
                              ...detailHelpStyle,
                              color: colors.bad,
                            }}
                          >
                            {errores[`fv_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: tipoRecibo === "devolucion" ? "auto 30px" : "repeat(4, 30px)",
                            gap: 5,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {tipoRecibo === "devolucion" ? (
                          <span
                            title="No aplica certificado de calidad en devolución"
                            style={{
                              minWidth: 86,
                              height: 30,
                              padding: "0 9px",
                              borderRadius: 8,
                              border: `1px solid ${colors.border}`,
                              background: "#f8fafc",
                              color: colors.muted,
                              display: "inline-grid",
                              placeItems: "center",
                              fontSize: 10,
                              fontWeight: 950,
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            No aplica
                          </span>
                        ) : (
                          <>
                            <label
                              title="Escanear o anexar certificado"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: `1px solid ${ln.certificado_data_url ? colors.goodBd : colors.infoBd}`,
                                background: ln.certificado_data_url ? colors.goodBg : colors.infoBg,
                                color: ln.certificado_data_url ? colors.good : colors.blue,
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                                boxShadow: ln.certificado_data_url
                                  ? "none"
                                  : "0 0 0 3px rgba(10,110,209,.08)",
                              }}
                            >
                              <Camera size={15} />
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                capture="environment"
                                onChange={(e) => onCertificadoChange(idx, e.target.files?.[0])}
                                style={{ display: "none" }}
                              />
                            </label>

                            {ln.certificado_data_url ? (
                              <a
                                href={ln.certificado_data_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Ver certificado anexado"
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  border: `1px solid ${colors.goodBd}`,
                                  background: colors.goodBg,
                                  color: colors.good,
                                  display: "grid",
                                  placeItems: "center",
                                  textDecoration: "none",
                                }}
                              >
                                <FileCheck size={15} />
                              </a>
                            ) : (
                              <span
                                title="Certificado pendiente: 24h"
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  border: `1px solid ${colors.warnBd}`,
                                  background: colors.warnBg,
                                  color: colors.warn,
                                  display: "grid",
                                  placeItems: "center",
                                  fontSize: 10,
                                  fontWeight: 900,
                                }}
                              >
                                24h
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => clearCertificado(idx)}
                              disabled={!ln.certificado_data_url}
                              title="Quitar certificado"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: `1px solid ${colors.border}`,
                                background: "#fff",
                                color: ln.certificado_data_url ? colors.bad : colors.muted,
                                display: "grid",
                                placeItems: "center",
                                cursor: ln.certificado_data_url ? "pointer" : "not-allowed",
                                opacity: ln.certificado_data_url ? 1 : 0.45,
                              }}
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}

                          <button
                            type="button"
                            onClick={() => removeLinea(idx)}
                            disabled={lineas.length === 1}
                            title="Eliminar linea"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              border: `1px solid ${colors.badBd}`,
                              background: colors.badBg,
                              color: colors.bad,
                              display: "grid",
                              placeItems: "center",
                              opacity: lineas.length === 1 ? 0.55 : 1,
                              cursor: lineas.length === 1 ? "not-allowed" : "pointer",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <datalist id="materialesList">
                {materiales.map((m) => (
                  <option key={m.id} value={m.codigo}>
                    {m.descripcion}
                    {getEmpaqueMaterial(m) ? ` | Empaque: ${getEmpaqueMaterial(m)}` : ""}
                  </option>
                ))}
              </datalist>

              {tipoRecibo === "recibo" && novedadOpen && (
                <div
                  style={{
                    width: "min(620px, 48%)",
                    margin: "12px 0 0 auto",
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: "0 8px 18px rgba(15,39,68,.06)",
                  }}
                >
                  <div
                    style={{
                      minHeight: 28,
                      padding: "6px 9px",
                      background: "#f8fafc",
                      color: colors.navy,
                      borderBottom: `1px solid ${colors.border}`,
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span>Novedad por item detectada en el recibo fisico</span>
                    <button
                      type="button"
                      onClick={addNovedad}
                      title="Agregar novedad"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        border: `1px solid ${colors.border}`,
                        background: "#fff",
                        color: colors.blue,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "74px minmax(0, 1fr) 122px 96px 28px",
                      gap: 0,
                      background: colors.border,
                      fontSize: 10,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color: colors.navy,
                    }}
                  >
                    <div style={{ background: "#f8fafc", padding: "6px 7px" }}>No. item</div>
                    <div style={{ background: "#f8fafc", padding: "6px 7px" }}>Hallazgo</div>
                    <div style={{ background: "#f8fafc", padding: "6px 7px" }}>Empaque</div>
                    <div style={{ background: "#f8fafc", padding: "6px 7px" }}>Cantidad</div>
                    <div style={{ background: "#f8fafc", padding: "6px 4px" }} />
                  </div>

                  <div style={{ display: "grid", gap: 1, background: colors.border }}>
                    {novedades.map((nov, idx) => (
                      <div
                        key={`novedad-${idx}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "74px minmax(0, 1fr) 122px 96px 28px",
                          gap: 0,
                          background: "#fff",
                        }}
                      >
                        <div style={{ padding: 5 }}>
                          <select
                            value={nov.lineaIndex}
                            onChange={(e) => onNovedadItemChange(idx, e.target.value)}
                            style={{ ...detailSelectStyle, minHeight: 28, fontSize: 11, padding: "0 7px" }}
                          >
                            <option value="">Item</option>
                            {lineas.map((ln, lineIdx) => (
                              <option key={`nov-item-${lineIdx}`} value={lineIdx}>
                                {lineIdx + 1}{ln.codigo ? ` - ${ln.codigo}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ padding: 5 }}>
                          <input
                            value={nov.hallazgo}
                            onChange={(e) => setNovedad(idx, { hallazgo: e.target.value })}
                            placeholder="Hallazgo"
                            style={{ ...detailInputStyle, minHeight: 28, fontSize: 11, padding: "0 8px" }}
                          />
                        </div>
                        <div style={{ padding: 5 }}>
                          <input
                            value={nov.empaque}
                            readOnly
                            placeholder="Auto"
                            style={{ ...detailReadOnlyInputStyle, minHeight: 28, fontSize: 11, padding: "0 8px" }}
                          />
                        </div>
                        <div style={{ padding: 5 }}>
                          <input
                            value={nov.cantidad}
                            onChange={(e) => onNovedadCantidadChange(idx, e.target.value)}
                            placeholder="0"
                            inputMode="numeric"
                            style={{ ...detailInputStyle, minHeight: 28, fontSize: 11, padding: "0 8px", textAlign: "right" }}
                          />
                        </div>
                        <div style={{ padding: 5, display: "grid", placeItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => removeNovedad(idx)}
                            disabled={novedades.length === 1}
                            title="Quitar novedad"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 7,
                              border: `1px solid ${colors.border}`,
                              background: "#fff",
                              color: novedades.length === 1 ? colors.muted : colors.bad,
                              display: "grid",
                              placeItems: "center",
                              cursor: novedades.length === 1 ? "not-allowed" : "pointer",
                              opacity: novedades.length === 1 ? 0.45 : 1,
                              padding: 0,
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      padding: "6px 9px",
                      color: colors.muted,
                      fontSize: 10,
                      fontWeight: 800,
                      background: "#f8fafc",
                    }}
                  >
                    Solo para impresión. No afecta inventario ni guardado.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: colors.muted,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              El flujo, la impresión y el guardado hacia asignación de ubicación
              se conservan igual.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addLinea} style={secondaryButtonStyle}>
                <Plus size={15} />
                Agregar línea
              </button>
              <button onClick={onImprimir} style={secondaryButtonStyle}>
                <Printer size={15} />
                Imprimir
              </button>
              <button onClick={onGuardarRecibo} style={primaryButtonStyle}>
                <Save size={15} />
                Guardar y continuar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

