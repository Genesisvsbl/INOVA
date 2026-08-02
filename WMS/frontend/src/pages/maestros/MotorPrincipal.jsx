import { useEffect, useMemo, useRef, useState } from "react";
import {
  getMotor,
  importarInventarioInicial,
  borrarDatosWms,
  WMS_DATA_GROUPS,
} from "../../api";
import { verificarClaveUsuarioActual } from "../../adminApi";
import {
  Cpu,
  Search,
  Download,
  FilterX,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Trash2,
  Lock,
  ChevronDown,
  X,
} from "lucide-react";

function esAdminWms() {
  const role = String(sessionStorage.getItem("rol") || "").toUpperCase();
  let permisos = [];
  try {
    permisos = JSON.parse(sessionStorage.getItem("permisos") || "[]");
  } catch {
    permisos = [];
  }
  return (
    ["SUPER_ADMIN", "ADMIN_INOVA", "INOVA_ADMIN", "ADMIN_PLATAFORMA", "PLATFORM_ADMIN"].includes(role) ||
    role.includes("ADMIN") ||
    sessionStorage.getItem("esSuperAdmin") === "true" ||
    sessionStorage.getItem("esPlatformAdmin") === "true" ||
    (Array.isArray(permisos) && (permisos.includes("admin.usuarios.gestionar") || permisos.includes("admin.roles.gestionar")))
  );
}

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
  infoBg: "#eaf3ff",
  infoBd: "#cfe0ff",
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

const selectStyle = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  outline: "none",
  background: "#fff",
  color: colors.text,
  fontSize: 13,
  fontWeight: 600,
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

function toCSV(rows) {
  const headers = [
    "id",
    "fecha",
    "tipo",
    "estado",
    "usuario",
    "documento",
    "codigo_material",
    "descripcion_material",
    "unidad_medida",
    "familia",
    "ubicacion",
    "ubicacion_base",
    "posicion",
    "zona",
    "familias",
    "bodega",
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
    ...rows.map((r) =>
      headers.map((h) => esc(r[h])).join(",")
    ),
  ];

  return lines.join("\n");
}

function toCSVStock(rows) {
  const headers = [
    "codigo_material",
    "descripcion_material",
    "unidad_medida",
    "familia",
    "ubicacion",
    "ubicacion_base",
    "posicion",
    "zona",
    "bodega",
    "lote_almacen",
    "lote_proveedor",
    "fecha_fabricacion",
    "fecha_vencimiento",
    "stock",
  ];

  const esc = (x) => {
    const s = (x ?? "").toString().replaceAll('"', '""');
    return `"${s}"`;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => esc(r[h])).join(",")
    ),
  ];

  return lines.join("\n");
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
        padding: "2px 5px",
        borderRadius: 999,
        fontSize: 8.2,
        fontWeight: 800,
        border: `1px solid ${t.bd}`,
        whiteSpace: "normal",
        lineHeight: 1,
        maxWidth: "100%",
        textAlign: "center",
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
              background: "#eaf1f8",
              border: "1px solid #d6e1ec",
              flexShrink: 0,
            }}
          >
            <Cpu size={18} color="#315a7d" />
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
              Motor principal
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
  padding: "5px 3px",
  fontSize: 8.5,
  color: "#607080",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 800,
  whiteSpace: "normal",
  lineHeight: 1.1,
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  background: "#fbfcfd",
  verticalAlign: "middle",
};

const tdStyle = {
  padding: "5px 3px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "normal",
  fontSize: 8.8,
  lineHeight: 1.12,
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  verticalAlign: "top",
};

export default function MotorPrincipal() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("TODOS");
  const [estado, setEstado] = useState("TODOS");
  const [bodega, setBodega] = useState("TODAS");
  const [zona, setZona] = useState("TODAS");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        const data = await getMotor(2000);

        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setErr(String(e?.message || e));
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  // ----- Toolbox administrador (importar / borrar) -----
  const isAdmin = useMemo(() => esAdminWms(), []);
  const fileInputRef = useRef(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [delModal, setDelModal] = useState(false);
  const [delSel, setDelSel] = useState({});
  const [pwModal, setPwModal] = useState(null); // { titulo, detalle, ejecutar }
  const [pwValue, setPwValue] = useState("");
  const [pwError, setPwError] = useState("");
  const [working, setWorking] = useState(false);
  const [adminMsg, setAdminMsg] = useState(null); // { tone, text }

  const recargarMotor = async () => {
    try {
      const data = await getMotor(2000);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  };

  const pedirClave = (config) => {
    setPwValue("");
    setPwError("");
    setPwModal(config);
  };

  const confirmarClave = async () => {
    if (working) return;
    const clave = pwValue.trim();
    if (!clave) {
      setPwError("Escribe tu contraseña.");
      return;
    }
    setWorking(true);
    setPwError("");
    try {
      const ok = await verificarClaveUsuarioActual(clave);
      if (!ok) {
        setPwError("Contraseña incorrecta.");
        setWorking(false);
        return;
      }
      const accion = pwModal?.ejecutar;
      setPwModal(null);
      if (typeof accion === "function") await accion();
    } catch (e) {
      setAdminMsg({ tone: "bad", text: String(e?.message || e) });
    } finally {
      setWorking(false);
    }
  };

  const onSeleccionArchivo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    pedirClave({
      titulo: "Importar inventario inicial",
      detalle: `Se cargará el inventario del archivo "${file.name}" como movimientos ALMACENADO. Confirma con tu contraseña.`,
      ejecutar: async () => {
        setAdminMsg({ tone: "info", text: "Importando inventario…" });
        try {
          const res = await importarInventarioInicial(file);
          setAdminMsg({ tone: "good", text: res?.mensaje || `Inventario importado: ${res?.inserted ?? 0} registro(s).` });
          await recargarMotor();
        } catch (e) {
          setAdminMsg({ tone: "bad", text: `No se pudo importar: ${e?.message || e}` });
        }
      },
    });
  };

  const abrirBorrar = () => {
    setDelSel({});
    setAdminMsg(null);
    setDelModal(true);
  };

  const continuarBorrar = () => {
    const seleccion = { ...delSel };
    const algo = WMS_DATA_GROUPS.some((g) => seleccion[g.key]);
    if (!algo) {
      setAdminMsg({ tone: "bad", text: "Marca al menos una categoría para borrar." });
      return;
    }
    const nombres = WMS_DATA_GROUPS.filter((g) => seleccion[g.key]).map((g) => g.label);
    const tocaMaestros = WMS_DATA_GROUPS.some((g) => g.grupo === "maestros" && seleccion[g.key]);
    setDelModal(false);
    pedirClave({
      titulo: "Borrar datos del WMS",
      detalle: `Vas a BORRAR de forma permanente: ${nombres.join("; ")}.${tocaMaestros ? " OJO: incluye MAESTROS." : ""} Confirma con tu contraseña.`,
      ejecutar: async () => {
        setAdminMsg({ tone: "info", text: "Borrando datos…" });
        try {
          const res = await borrarDatosWms(seleccion);
          const omit = res?.omitidas?.length ? ` (se omitieron ${res.omitidas.length} tabla(s) inexistente(s): ${res.omitidas.join(", ")})` : "";
          setAdminMsg({ tone: "good", text: `Datos borrados correctamente (${res?.tablas?.length || 0} tabla(s))${omit}. El WMS quedó limpio en lo seleccionado.` });
          await recargarMotor();
        } catch (e) {
          setAdminMsg({ tone: "bad", text: `No se pudo borrar: ${e?.message || e}` });
        }
      },
    });
  };

  const bodegas = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const v = (r.bodega ?? "").toString().trim();
      if (v) set.add(v);
    });
    return ["TODAS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const zonas = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const v = (r.zona ?? "").toString().trim();
      if (v) set.add(v);
    });
    return ["TODAS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return rows.filter((r) => {
      if (
        tipo !== "TODOS" &&
        tipo !== "STOCK" &&
        String(r.tipo || "").toUpperCase() !== tipo
      ) {
        return false;
      }

      if (estado !== "TODOS" && String(r.estado || "").toUpperCase() !== estado) return false;
      if (bodega !== "TODAS" && (r.bodega ?? "") !== bodega) return false;
      if (zona !== "TODAS" && (r.zona ?? "") !== zona) return false;

      if (fechaDesde || fechaHasta) {
        const fechaMovimiento = new Date(r.fecha);
        if (Number.isNaN(fechaMovimiento.getTime())) return false;

        if (fechaDesde) {
          const desde = new Date(`${fechaDesde}T00:00:00`);
          if (fechaMovimiento < desde) return false;
        }

        if (fechaHasta) {
          const hasta = new Date(`${fechaHasta}T23:59:59.999`);
          if (fechaMovimiento > hasta) return false;
        }
      }

      if (!needle) return true;

      const hay = [
        r.usuario,
        r.documento,
        r.codigo_material,
        r.descripcion_material,
        r.familia,
        r.ubicacion,
        r.ubicacion_base,
        r.posicion,
        r.estado,
        r.zona,
        r.bodega,
        r.lote_almacen,
        r.lote_proveedor,
        r.fecha_fabricacion,
        r.fecha_vencimiento,
        r.tipo,
      ]
        .map((x) => (x ?? "").toString().toLowerCase())
        .join(" | ");

      return hay.includes(needle);
    });
  }, [rows, q, tipo, estado, bodega, zona, fechaDesde, fechaHasta]);

  const stockRows = useMemo(() => {
    const map = new Map();

    filtered.forEach((r) => {
      const key = [
        r.codigo_material ?? "",
        r.descripcion_material ?? "",
        r.unidad_medida ?? "",
        r.familia ?? "",
        r.ubicacion ?? "",
        r.ubicacion_base ?? "",
        r.posicion ?? "",
        r.zona ?? "",
        r.bodega ?? "",
        r.lote_almacen ?? "",
        r.lote_proveedor ?? "",
        r.fecha_fabricacion ?? "",
        r.fecha_vencimiento ?? "",
      ].join("||");

      const qty = Number(r.cantidad ?? 0);

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          codigo_material: r.codigo_material ?? "",
          descripcion_material: r.descripcion_material ?? "",
          unidad_medida: r.unidad_medida ?? "",
          familia: r.familia ?? "",
          ubicacion: r.ubicacion ?? "",
          ubicacion_base: r.ubicacion_base ?? "",
          posicion: r.posicion ?? "",
          zona: r.zona ?? "",
          bodega: r.bodega ?? "",
          lote_almacen: r.lote_almacen ?? "",
          lote_proveedor: r.lote_proveedor ?? "",
          fecha_fabricacion: r.fecha_fabricacion ?? "",
          fecha_vencimiento: r.fecha_vencimiento ?? "",
          cantidad: 0,
          stock: 0,
        });
      }

      const item = map.get(key);
      item.cantidad += qty;
      item.stock = item.cantidad;
    });

    return Array.from(map.values())
      .filter((r) => Number(r.stock || 0) !== 0)
      .sort((a, b) => {
        const am = String(a.codigo_material || "");
        const bm = String(b.codigo_material || "");
        return am.localeCompare(bm);
      });
  }, [filtered]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const entradas = filtered.filter((r) => Number(r.cantidad ?? 0) >= 0).length;
    const salidas = total - entradas;

    const sumEntradas = filtered.reduce(
      (acc, r) => acc + (Number(r.cantidad ?? 0) >= 0 ? Number(r.cantidad || 0) : 0),
      0
    );

    const sumSalidasAbs = filtered.reduce(
      (acc, r) => acc + (Number(r.cantidad ?? 0) < 0 ? Math.abs(Number(r.cantidad || 0)) : 0),
      0
    );

    const enTransito = filtered.filter(
      (r) => String(r.estado || "").toUpperCase() === "EN_TRANSITO"
    ).length;

    const totalStock = stockRows.reduce(
      (acc, r) => acc + Number(r.stock || 0),
      0
    );

    return { total, entradas, salidas, sumEntradas, sumSalidasAbs, enTransito, totalStock };
  }, [filtered, stockRows]);

  const onExport = () => {
    const stamp = new Date();
    const yyyy = stamp.getFullYear();
    const mm = String(stamp.getMonth() + 1).padStart(2, "0");
    const dd = String(stamp.getDate()).padStart(2, "0");

    if (tipo === "STOCK") {
      const csv = toCSVStock(stockRows);
      downloadText(`motor_principal_stock_${yyyy}-${mm}-${dd}.csv`, csv);
      return;
    }

    const csv = toCSV(filtered);
    downloadText(`motor_principal_${yyyy}-${mm}-${dd}.csv`, csv);
  };

  const resetFilters = () => {
    setQ("");
    setTipo("TODOS");
    setEstado("TODOS");
    setBodega("TODAS");
    setZona("TODAS");
    setFechaDesde("");
    setFechaHasta("");
  };

  const showingRows = tipo === "STOCK" ? stockRows : filtered;

  return (
    <div style={pageStyle}>
      <ModuleHeader
        title="Entradas y salidas"
        subtitle="Base consolidada de movimientos de recibo, despacho y material en tránsito."
        helper="Vista consolidada"
      />

      {isAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end", position: "relative", zIndex: 30 }}>
          <button
            onClick={() => setPanelOpen((o) => !o)}
            style={{
              height: 44,
              padding: "0 16px 0 12px",
              borderRadius: 12,
              border: "1px solid #1f3d6b",
              background: panelOpen
                ? "linear-gradient(135deg,#0b2c5e,#123f83)"
                : "linear-gradient(135deg,#0f2f61,#1a4a92)",
              color: "#eaf2ff",
              fontWeight: 800,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(15,47,97,.28)",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,.14)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.18)",
              }}
            >
              <ShieldCheck size={17} color="#8fe3b0" />
            </span>
            Zona segura
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: ".06em",
                padding: "2px 7px",
                borderRadius: 999,
                background: "rgba(143,227,176,.16)",
                color: "#8fe3b0",
                border: "1px solid rgba(143,227,176,.35)",
              }}
            >
              ADMIN
            </span>
            <ChevronDown
              size={16}
              color="#cfe0ff"
              style={{ transform: panelOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}
            />
          </button>

          {panelOpen && (
            <>
              <div
                onClick={() => setPanelOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 20 }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 52,
                  right: 0,
                  width: "min(380px, 94vw)",
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid #dbe6f2",
                  boxShadow: "0 26px 60px rgba(10,26,52,.22)",
                  overflow: "hidden",
                  zIndex: 30,
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    background: "linear-gradient(135deg,#0f2f61,#1a4a92)",
                    color: "#eaf2ff",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={20} color="#8fe3b0" />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>Herramientas de administrador</div>
                    <div style={{ fontSize: 11.5, color: "#bcd4f7" }}>Cada acción se confirma con tu contraseña</div>
                  </div>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  <button
                    onClick={() => {
                      setPanelOpen(false);
                      fileInputRef.current?.click();
                    }}
                    style={toolItemStyle("#bcd7f5", "#eaf3ff")}
                  >
                    <span style={toolIconStyle("#0b57d0", "#eaf3ff")}>
                      <Upload size={17} />
                    </span>
                    <span>
                      <span style={{ display: "block", fontWeight: 800, color: "#17324d" }}>Importar inventario inicial</span>
                      <span style={{ display: "block", fontSize: 11.5, color: colors.muted }}>Carga el stock de arranque desde un archivo</span>
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setPanelOpen(false);
                      abrirBorrar();
                    }}
                    style={toolItemStyle(colors.badBd, colors.badBg)}
                  >
                    <span style={toolIconStyle(colors.bad, "#fdecec")}>
                      <Trash2 size={17} />
                    </span>
                    <span>
                      <span style={{ display: "block", fontWeight: 800, color: "#8a1a12" }}>Borrar datos (dejar limpio)</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "#a5564e" }}>Elige con checks qué eliminar, incluidos maestros</span>
                    </span>
                  </button>
                </div>

              </div>
            </>
          )}

          {adminMsg && (
            <div
              onClick={() => setAdminMsg(null)}
              style={{
                position: "absolute",
                top: 52,
                right: 0,
                width: "min(380px, 94vw)",
                padding: "11px 13px",
                borderRadius: 12,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                zIndex: 25,
                boxShadow: "0 16px 40px rgba(10,26,52,.18)",
                border: `1px solid ${adminMsg.tone === "bad" ? colors.badBd : adminMsg.tone === "good" ? colors.goodBd : colors.infoBd}`,
                background: adminMsg.tone === "bad" ? colors.badBg : adminMsg.tone === "good" ? colors.goodBg : colors.infoBg,
                color: adminMsg.tone === "bad" ? colors.bad : adminMsg.tone === "good" ? colors.good : colors.blue,
              }}
            >
              {adminMsg.text}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onSeleccionArchivo}
            style={{ display: "none" }}
          />
        </div>
      )}

      <div style={panelStyle}>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 2fr) repeat(6, minmax(140px, 1fr)) auto",
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
                  placeholder="Material, ubicación, usuario, documento, lote, bodega..."
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
              <div style={fieldLabelStyle}>Tipo</div>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={selectStyle}>
                <option value="TODOS">TODOS</option>
                <option value="ENTRADA">ENTRADA</option>
                <option value="SALIDA">SALIDA</option>
                <option value="STOCK">STOCK</option>
              </select>
            </div>

            <div>
              <div style={fieldLabelStyle}>Estado</div>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={selectStyle}>
                <option value="TODOS">TODOS</option>
                <option value="ALMACENADO">ALMACENADO</option>
                <option value="EN_TRANSITO">EN_TRANSITO</option>
                <option value="PNC_BLOQUEADO">PNC_BLOQUEADO</option>
              </select>
            </div>

            <div>
              <div style={fieldLabelStyle}>Bodega</div>
              <select value={bodega} onChange={(e) => setBodega(e.target.value)} style={selectStyle}>
                {bodegas.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={fieldLabelStyle}>Zona</div>
              <select value={zona} onChange={(e) => setZona(e.target.value)} style={selectStyle}>
                {zonas.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={fieldLabelStyle}>Fecha desde</div>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Fecha hasta</div>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={resetFilters} style={secondaryButtonStyle} title="Limpiar filtros">
                <FilterX size={15} />
                Limpiar
              </button>
              <button onClick={onExport} style={primaryButtonStyle} title="Exportar CSV">
                <Download size={15} />
                Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(120px, 1fr))",
          gap: 10,
        }}
      >
        <div style={panelStyle}>
          <div style={panelBodyStyle}>
            <div style={fieldLabelStyle}>
              {tipo === "STOCK" ? "Registros stock" : "Registros"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.navy }}>
              {tipo === "STOCK" ? stockRows.length : stats.total}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelBodyStyle}>
            <div style={fieldLabelStyle}>Entradas</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.good }}>{stats.entradas}</div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelBodyStyle}>
            <div style={fieldLabelStyle}>Salidas</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.bad }}>{stats.salidas}</div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelBodyStyle}>
            <div style={fieldLabelStyle}>En tránsito</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.warn }}>{stats.enTransito}</div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelBodyStyle}>
            <div style={fieldLabelStyle}>Total entradas</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.good }}>
              {fmtNumberCO(stats.sumEntradas || 0)}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelBodyStyle}>
            <div style={fieldLabelStyle}>Total salidas</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.bad }}>
              {fmtNumberCO(stats.sumSalidasAbs || 0)}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelBodyStyle}>
            <div style={fieldLabelStyle}>
              {tipo === "STOCK" ? "Stock total" : "Balance"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: colors.blue }}>
              {tipo === "STOCK"
                ? fmtNumberCO(stats.totalStock || 0)
                : fmtNumberCO((stats.sumEntradas || 0) - (stats.sumSalidasAbs || 0))}
            </div>
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
          <div>{tipo === "STOCK" ? "Listado de stock" : "Listado de movimientos"}</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {loading && <StatusChip label="Cargando" tone="amber" />}
            {err && <StatusChip label="Fallo API" tone="red" />}
            {!loading && !err && (
              <StatusChip
                label={
                  tipo === "STOCK"
                    ? `Mostrando ${stockRows.length} grupos de stock`
                    : `Mostrando ${filtered.length} de ${rows.length}`
                }
                tone="blue"
              />
            )}
          </div>
        </div>

        <div style={{ width: "100%", overflowX: "auto", paddingBottom: 4 }}>
          {tipo === "STOCK" ? (
            <table style={{ width: "100%", minWidth: 1550, borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: "6%" }}>Material</th>
                  <th style={{ ...thStyle, width: "14%" }}>Descripción</th>
                  <th style={{ ...thStyle, width: "3.5%" }}>UM</th>
                  <th style={{ ...thStyle, width: "6%" }}>Familia</th>
                  <th style={{ ...thStyle, width: "7%" }}>Ubicación base</th>
                  <th style={{ ...thStyle, width: "4.5%" }}>Posición</th>
                  <th style={{ ...thStyle, width: "7.5%" }}>Ubicación final</th>
                  <th style={{ ...thStyle, width: "4.5%" }}>Zona</th>
                  <th style={{ ...thStyle, width: "5.5%" }}>Bodega</th>
                  <th style={{ ...thStyle, width: "8.5%" }}>Lote almacén</th>
                  <th style={{ ...thStyle, width: "8.5%" }}>Lote proveedor</th>
                  <th style={{ ...thStyle, width: "6%" }}>Fabricaci&oacute;n</th>
                  <th style={{ ...thStyle, width: "6%" }}>Vencimiento</th>
                  <th style={{ ...thStyle, width: "5.5%", textAlign: "right" }}>Stock</th>
                </tr>
              </thead>

              <tbody>
                {!loading && !err && showingRows.length === 0 && (
                  <tr>
                    <td colSpan={14} style={tdStyle}>
                      No hay registros con esos filtros.
                    </td>
                  </tr>
                )}

                {showingRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: colors.navy }}>
                      {r.codigo_material || ""}
                    </td>
                    <td style={tdStyle}>{r.descripcion_material || ""}</td>
                    <td style={tdStyle}>{r.unidad_medida || ""}</td>
                    <td style={tdStyle}>{r.familia || ""}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: colors.navy }}>
                      {r.ubicacion_base || ""}
                    </td>
                    <td style={tdStyle}>{r.posicion || ""}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: colors.blue }}>
                      {r.ubicacion || ""}
                    </td>
                    <td style={tdStyle}>{r.zona || ""}</td>
                    <td style={tdStyle}>{r.bodega || ""}</td>
                    <td style={tdStyle}>{r.lote_almacen || ""}</td>
                    <td style={tdStyle}>{r.lote_proveedor || ""}</td>
                    <td style={tdStyle}>{r.fecha_fabricacion || ""}</td>
                    <td style={tdStyle}>{r.fecha_vencimiento || ""}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 800,
                        color: Number(r.stock || 0) >= 0 ? colors.good : colors.bad,
                      }}
                    >
                      {fmtNumberCO(r.stock || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", minWidth: 1980, borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: "5%" }}>Fecha</th>
                  <th style={{ ...thStyle, width: "3.6%" }}>Tipo</th>
                  <th style={{ ...thStyle, width: "4.8%" }}>Estado</th>
                  <th style={{ ...thStyle, width: "4.5%" }}>Usuario</th>
                  <th style={{ ...thStyle, width: "5%" }}>Documento</th>
                  <th style={{ ...thStyle, width: "5.2%" }}>Material</th>
                  <th style={{ ...thStyle, width: "13.2%" }}>Descripción</th>
                  <th style={{ ...thStyle, width: "3%" }}>UM</th>
                  <th style={{ ...thStyle, width: "5.5%" }}>Familia</th>
                  <th style={{ ...thStyle, width: "5.8%" }}>Ubicación base</th>
                  <th style={{ ...thStyle, width: "4%" }}>Posición</th>
                  <th style={{ ...thStyle, width: "6.3%" }}>Ubicación final</th>
                  <th style={{ ...thStyle, width: "4.5%" }}>Zona</th>
                  <th style={{ ...thStyle, width: "5%" }}>Bodega</th>
                  <th style={{ ...thStyle, width: "7.5%" }}>Lote almacén</th>
                  <th style={{ ...thStyle, width: "7.1%" }}>Lote proveedor</th>
                  <th style={{ ...thStyle, width: "5.4%" }}>Fabricaci&oacute;n</th>
                  <th style={{ ...thStyle, width: "5.4%" }}>Vencimiento</th>
                  <th style={{ ...thStyle, width: "4.6%", textAlign: "right" }}>Cantidad</th>
                </tr>
              </thead>

              <tbody>
                {!loading && !err && showingRows.length === 0 && (
                  <tr>
                    <td colSpan={19} style={tdStyle}>
                      No hay registros con esos filtros.
                    </td>
                  </tr>
                )}

                {showingRows.map((r) => {
                  const qty = Number(r.cantidad || 0);
                  const isIn = qty >= 0;
                  const estadoUp = String(r.estado || "").toUpperCase();
                  const ubicFinal = (r.ubicacion ?? "").toString().trim();
                  const ubicBase = (r.ubicacion_base ?? "").toString().trim();
                  const posicion = (r.posicion ?? "").toString().trim();

                  return (
                    <tr key={r.id}>
                      <td style={tdStyle}>{fmtDateTime(r.fecha)}</td>

                      <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                        {String(r.tipo || "").toUpperCase() === "ENTRADA" ? (
                          <StatusChip label="ENTRADA" tone="green" />
                        ) : (
                          <StatusChip label="SALIDA" tone="red" />
                        )}
                      </td>

                      <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                        {estadoUp === "EN_TRANSITO" ? (
                          <StatusChip label="EN TRANSITO" tone="amber" />
                        ) : estadoUp === "PNC_BLOQUEADO" ? (
                          <StatusChip label="PNC BLOQUEADO" tone="red" />
                        ) : estadoUp === "BAJA_PNC" ? (
                          <StatusChip label="BAJA PNC" tone="neutral" />
                        ) : (
                          <StatusChip label="ALMACENADO" tone="blue" />
                        )}
                      </td>

                      <td style={tdStyle}>{r.usuario || ""}</td>
                      <td style={tdStyle}>{r.documento || ""}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: colors.navy }}>
                        {r.codigo_material || ""}
                      </td>
                      <td style={tdStyle}>{r.descripcion_material || ""}</td>
                      <td style={tdStyle}>{r.unidad_medida || ""}</td>
                      <td style={tdStyle}>{r.familia || ""}</td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700,
                          color: estadoUp === "EN_TRANSITO" ? colors.warn : estadoUp === "PNC_BLOQUEADO" ? colors.bad : colors.navy,
                        }}
                      >
                        {ubicBase || (estadoUp === "EN_TRANSITO" ? "EN TRANSITO" : "")}
                      </td>

                      <td style={tdStyle}>{posicion || ""}</td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700,
                          color: estadoUp === "EN_TRANSITO" ? colors.warn : estadoUp === "PNC_BLOQUEADO" ? colors.bad : colors.blue,
                        }}
                      >
                        {ubicFinal || "EN TRANSITO"}
                      </td>

                      <td style={tdStyle}>{r.zona || ""}</td>
                      <td style={tdStyle}>{r.bodega || ""}</td>
                      <td style={tdStyle}>{r.lote_almacen || ""}</td>
                      <td style={tdStyle}>{r.lote_proveedor || ""}</td>
                      <td style={tdStyle}>{r.fecha_fabricacion || ""}</td>
                      <td style={tdStyle}>{r.fecha_vencimiento || ""}</td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 800,
                          color: isIn ? colors.good : colors.bad,
                        }}
                      >
                        {fmtNumberCO(qty)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

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
            <div style={{ marginTop: 6, color: colors.muted, fontWeight: 600, fontSize: 12 }}>
              Revisa la conexión con la API y que exista <b>GET /motor</b>.
            </div>
          </div>
        )}
      </div>

      <div style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>
        Recibo guarda cantidades positivas, Despacho negativas y el material sin ubicación queda en <b>EN TRANSITO</b>.
      </div>

      {delModal && (
        <div style={overlayStyle} onClick={() => setDelModal(false)}>
          <div style={{ ...modalCardStyle, width: "min(560px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeadStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trash2 size={16} color={colors.bad} />
                <span style={{ fontWeight: 900, color: "#17324d", fontSize: 16 }}>Borrar datos del WMS</span>
              </div>
              <button onClick={() => setDelModal(false)} style={iconBtnStyle}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 12.5, color: colors.muted, marginBottom: 12 }}>
                Marca qué quieres eliminar para arrancar de cero. Los maestros no se borran.
              </div>

              {["movimientos", "bases", "maestros"].map((grupo) => {
                const items = WMS_DATA_GROUPS.filter((g) => g.grupo === grupo);
                if (!items.length) return null;
                const grupoLabel =
                  grupo === "movimientos" ? "Movimientos" : grupo === "bases" ? "Bases" : "Maestros (¡cuidado!)";
                return (
                  <div key={grupo} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        ...fieldLabelStyle,
                        marginBottom: 8,
                        color: grupo === "maestros" ? colors.bad : fieldLabelStyle.color,
                      }}
                    >
                      {grupoLabel}
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {items.map((g) => (
                        <label
                          key={g.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 12px",
                            border: `1px solid ${delSel[g.key] ? colors.badBd : colors.border}`,
                            background: delSel[g.key] ? colors.badBg : "#fff",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 700,
                            color: colors.text,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(delSel[g.key])}
                            onChange={(e) => setDelSel((prev) => ({ ...prev, [g.key]: e.target.checked }))}
                          />
                          {g.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button onClick={() => setDelModal(false)} style={secondaryButtonStyle}>
                  Cancelar
                </button>
                <button
                  onClick={continuarBorrar}
                  style={{ ...primaryButtonStyle, borderColor: "#b42318", background: "#b42318" }}
                >
                  <Trash2 size={15} />
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pwModal && (
        <div style={overlayStyle} onClick={() => !working && setPwModal(null)}>
          <div style={{ ...modalCardStyle, width: "min(460px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeadStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Lock size={16} color="#8a5b00" />
                <span style={{ fontWeight: 900, color: "#17324d", fontSize: 16 }}>{pwModal.titulo}</span>
              </div>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 12.5, color: colors.muted, marginBottom: 14 }}>{pwModal.detalle}</div>
              <div style={fieldLabelStyle}>Tu contraseña</div>
              <input
                type="password"
                value={pwValue}
                autoFocus
                onChange={(e) => setPwValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmarClave()}
                placeholder="••••••••"
                style={inputStyle}
              />
              {pwError && (
                <div style={{ marginTop: 8, color: colors.bad, fontSize: 12.5, fontWeight: 800 }}>{pwError}</div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button onClick={() => setPwModal(null)} disabled={working} style={secondaryButtonStyle}>
                  Cancelar
                </button>
                <button onClick={confirmarClave} disabled={working} style={primaryButtonStyle}>
                  {working ? "Verificando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 10001,
  display: "grid",
  placeItems: "center",
  background: "rgba(8,17,31,.55)",
  padding: 16,
};

const modalCardStyle = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #d9e2ec",
  boxShadow: "0 24px 60px rgba(8,17,31,.35)",
  overflow: "hidden",
};

const modalHeadStyle = {
  padding: "14px 18px",
  borderBottom: "1px solid #eef2f7",
  background: "#f8fafc",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const iconBtnStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid #d9e2ec",
  background: "#fff",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

function toolItemStyle(borderColor, hoverBg) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textAlign: "left",
    width: "100%",
    padding: "11px 12px",
    borderRadius: 12,
    border: `1px solid ${borderColor}`,
    background: hoverBg,
    cursor: "pointer",
  };
}

function toolIconStyle(color, bg) {
  return {
    flexShrink: 0,
    width: 38,
    height: 38,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: bg,
    color,
    border: `1px solid ${color}22`,
  };
}
