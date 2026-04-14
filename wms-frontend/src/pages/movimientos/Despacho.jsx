import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../api";
import {
  Upload,
  Search,
  Eraser,
  Settings2,
  Eye,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";

const colors = {
  navy: "#133454",
  blue: "#0b57d0",
  bg: "#f3f6fa",
  text: "#203246",
  muted: "#6b7c8f",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  rowAlt: "#fbfdff",
  good: "#1f7a3d",
  bad: "#c62828",
  warn: "#b26a00",
  goodBg: "#edf8f1",
  goodBd: "#cfe8d7",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
  warnBg: "#fff6e5",
  warnBd: "#f1ddb0",
  infoBg: "#eaf3ff",
  infoBd: "#cfe0ff",
};

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const STORAGE_KEY = "wms_reservas_cierre_local";

function formatQty(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return fmtCO.format(x);
}

function fmtDate(v) {
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

function Chip({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#eef2f6", bd: "#dbe4ec", tx: colors.text },
    blue: { bg: colors.infoBg, bd: colors.infoBd, tx: colors.blue },
    green: { bg: colors.goodBg, bd: colors.goodBd, tx: colors.good },
    red: { bg: colors.badBg, bd: colors.badBd, tx: colors.bad },
    amber: { bg: colors.warnBg, bd: colors.warnBd, tx: colors.warn },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.tx,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function toneByClasificacion(v) {
  const x = String(v || "").toUpperCase();
  if (x.includes("CUMPLIDA")) return "green";
  if (x.includes("PARCIAL")) return "amber";
  return "red";
}

function getReservaStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveReservaStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function withinDateRange(dateValue, desde, hasta) {
  const d = fmtDate(dateValue);
  if (!d) return !desde && !hasta;
  if (desde && d < desde) return false;
  if (hasta && d > hasta) return false;
  return true;
}

function resolveEstadoReserva(totalReq, totalRet) {
  const req = Number(totalReq || 0);
  const ret = Number(totalRet || 0);

  if (req <= 0) return "NO CUMPLIDA";
  if (ret <= 0) return "NO CUMPLIDA";
  if (ret >= req) return "CUMPLIDA";
  return "PARCIAL";
}

const shellCardStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
};

const sectionHeaderStyle = {
  padding: "14px 16px",
  borderBottom: `1px solid ${colors.border}`,
  background: colors.soft,
};

const labelStyle = {
  fontSize: 11,
  color: colors.muted,
  fontWeight: 800,
  marginBottom: 6,
  letterSpacing: ".04em",
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  fontWeight: 700,
  color: colors.text,
  outline: "none",
  boxSizing: "border-box",
  fontSize: 14,
};

const buttonBase = {
  height: 42,
  padding: "0 16px",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
};

const secondaryButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text,
};

const primaryButtonStyle = {
  ...buttonBase,
  border: "1px solid #0b57d0",
  background: "#0b57d0",
  color: "#fff",
};

const subtleBlueButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.infoBd}`,
  background: colors.infoBg,
  color: colors.blue,
};

const subtleWarnButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.warnBd}`,
  background: colors.warnBg,
  color: colors.warn,
};

const subtleGreenButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.goodBd}`,
  background: colors.goodBg,
  color: colors.good,
};

const subtleRedButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.badBd}`,
  background: colors.badBg,
  color: colors.bad,
};

const tableWrapStyle = {
  width: "100%",
  overflowX: "auto",
  overflowY: "hidden",
};

const thStyle = {
  padding: "11px 12px",
  color: "#607080",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "left",
  borderBottom: `1px solid ${colors.border}`,
  background: "#fbfcfd",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px",
  borderBottom: `1px solid #edf2f7`,
  color: colors.text,
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
  verticalAlign: "top",
};

function SummaryBox({ label, value, tone = "default" }) {
  const toneStyles = {
    default: { color: colors.navy },
    green: { color: colors.good },
    red: { color: colors.bad },
    amber: { color: colors.warn },
    blue: { color: colors.blue },
  };

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: colors.muted,
          fontWeight: 800,
          letterSpacing: ".04em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: toneStyles[tone]?.color || colors.navy,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Despacho() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const [rows, setRows] = useState([]);
  const [pickingRows, setPickingRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingPicking, setLoadingPicking] = useState(false);
  const [err, setErr] = useState("");

  const [reserva, setReserva] = useState("");
  const [ultimaCargaId, setUltimaCargaId] = useState(null);

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODAS");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [soloCerradas, setSoloCerradas] = useState(false);
  const [reservaActiva, setReservaActiva] = useState("");

  const [storeVersion, setStoreVersion] = useState(0);

  const reservasStore = useMemo(() => getReservaStore(), [storeVersion]);

  const forceRefreshStore = () => setStoreVersion((v) => v + 1);

  const loadDespachos = async (reservaBuscar = "") => {
    setLoading(true);
    setErr("");

    try {
      const params = new URLSearchParams();
      if (reservaBuscar.trim()) params.set("reserva", reservaBuscar.trim());

      const qs = params.toString();
      const res = await fetch(`${API_URL}/despachos${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPicking = async (reservaBuscar = "") => {
    if (!reservaBuscar.trim()) {
      setPickingRows([]);
      return;
    }

    setLoadingPicking(true);

    try {
      const res = await fetch(
        `${API_URL}/despachos/picking/${encodeURIComponent(reservaBuscar.trim())}`
      );

      if (!res.ok) {
        setPickingRows([]);
        return;
      }

      const data = await res.json();
      setPickingRows(Array.isArray(data) ? data : []);
    } catch {
      setPickingRows([]);
    } finally {
      setLoadingPicking(false);
    }
  };

  useEffect(() => {
    loadDespachos("");
  }, []);

  const onImportar = async () => {
    if (!file) {
      alert("Selecciona un archivo Excel.");
      return;
    }

    setSubiendo(true);
    setErr("");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_URL}/despachos/importar`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setUltimaCargaId(data?.carga_id || null);

      alert(
        `✅ Importación OK\nCarga ID: ${data?.carga_id}\nRegistros: ${data?.total_registros}`
      );

      await loadDespachos("");
      setReserva("");
      setReservaActiva("");
      setPickingRows([]);
      setFile(null);

      const input = document.getElementById("input-despacho-excel");
      if (input) input.value = "";
    } catch (e) {
      alert("❌ Error importando despacho:\n" + (e?.message || e));
    } finally {
      setSubiendo(false);
    }
  };

  const onBuscar = async () => {
    const target = reserva.trim();
    setReservaActiva(target);
    await loadDespachos(target);
    await loadPicking(target);
  };

  const onLimpiar = async () => {
    setReserva("");
    setReservaActiva("");
    setPickingRows([]);
    setFechaDesde("");
    setFechaHasta("");
    setEstadoFiltro("TODAS");
    setSoloPendientes(false);
    setSoloCerradas(false);
    await loadDespachos("");
  };

  const onGenerarPicking = async (reservaTarget = "") => {
    const reservaFinal = (reservaTarget || reserva || reservaActiva || "").trim();
    if (!reservaFinal) {
      alert("Escribe o selecciona una reserva para generar el picking.");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/despachos/generar-picking/${encodeURIComponent(reservaFinal)}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      alert(
        `✅ Picking generado\n\n` +
          `Reserva: ${data.reserva}\n` +
          `Total requerido: ${formatQty(data.total_requerido)}\n` +
          `Total retirado: ${formatQty(data.total_retirado)}\n` +
          `% cumplimiento: ${data.pct_cumplimiento_reserva}%\n` +
          `Clasificación: ${data.clasificacion_final}\n` +
          `Líneas picking: ${data.lineas_picking}`
      );

      setReserva(reservaFinal);
      setReservaActiva(reservaFinal);

      await loadDespachos(reservaFinal);
      await loadPicking(reservaFinal);

      navigate(`/movimientos/orden-picking/${encodeURIComponent(reservaFinal)}`);
    } catch (e) {
      alert("❌ Error generando picking:\n" + (e?.message || e));
    }
  };

  const cerrarReserva = (reservaId, estadoBase) => {
    const motivo = window.prompt(
      `Vas a cerrar la reserva ${reservaId}.\n\nEscribe una nota o motivo de cierre:`,
      estadoBase === "PARCIAL" ? "Entrega parcial cerrada" : "Reserva cerrada"
    );

    if (motivo === null) return;

    const actual = getReservaStore();
    actual[reservaId] = {
      cerrada: true,
      fecha_cierre: new Date().toISOString(),
      nota: (motivo || "").trim(),
      estado_cierre: estadoBase === "CUMPLIDA" ? "CUMPLIDA CERRADA" : "PARCIAL CERRADA",
    };
    saveReservaStore(actual);
    forceRefreshStore();

    alert(`✅ Reserva ${reservaId} cerrada correctamente.`);
  };

  const reabrirReserva = (reservaId) => {
    const ok = window.confirm(`¿Deseas reabrir la reserva ${reservaId}?`);
    if (!ok) return;

    const actual = getReservaStore();
    delete actual[reservaId];
    saveReservaStore(actual);
    forceRefreshStore();

    alert(`✅ Reserva ${reservaId} reabierta.`);
  };

  const eliminarReserva = async (reservaId) => {
    const ok = window.confirm(`⚠️ ¿Eliminar completamente la reserva ${reservaId}?`);
    if (!ok) return;

    try {
      const res = await fetch(
        `${API_URL}/despachos/reserva/${encodeURIComponent(reservaId)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const actual = getReservaStore();
      delete actual[reservaId];
      saveReservaStore(actual);
      forceRefreshStore();

      if (reservaActiva === reservaId || reserva.trim() === reservaId) {
        setReserva("");
        setReservaActiva("");
        setPickingRows([]);
        await loadDespachos("");
      } else {
        await loadDespachos(reserva.trim());
      }

      alert(`🗑️ Reserva ${reservaId} eliminada correctamente.`);
    } catch (e) {
      console.error(e);
      alert("❌ No se pudo eliminar la reserva.\n" + (e?.message || e));
    }
  };

  const reservasResumen = useMemo(() => {
    const map = new Map();

    rows.forEach((r) => {
      const key = String(r.reserva || "").trim();
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          reserva: key,
          fecha_necesidad_min: fmtDate(r.fecha_necesidad),
          fecha_necesidad_max: fmtDate(r.fecha_necesidad),
          total_skus: 0,
          total_requerido: 0,
          total_retirado: 0,
          total_diferencia: 0,
          lineas_usadas: 0,
          clasificacion_base: "NO CUMPLIDA",
          clasificacion_mostrar: "NO CUMPLIDA",
          cerrada: false,
          fecha_cierre: "",
          nota_cierre: "",
        });
      }

      const item = map.get(key);
      const fechaActual = fmtDate(r.fecha_necesidad);

      item.total_skus += 1;
      item.total_requerido += Number(r.cantidad || 0);
      item.total_retirado += Number(r.cantidad_retirada || 0);
      item.total_diferencia += Number(r.diferencia || 0);
      item.lineas_usadas += Number(r.lineas_usadas || 0);

      if (fechaActual) {
        if (!item.fecha_necesidad_min || fechaActual < item.fecha_necesidad_min) {
          item.fecha_necesidad_min = fechaActual;
        }
        if (!item.fecha_necesidad_max || fechaActual > item.fecha_necesidad_max) {
          item.fecha_necesidad_max = fechaActual;
        }
      }
    });

    const out = Array.from(map.values()).map((item) => {
      const base = resolveEstadoReserva(item.total_requerido, item.total_retirado);
      const localInfo = reservasStore[item.reserva];

      item.clasificacion_base = base;
      item.cerrada = !!localInfo?.cerrada;
      item.fecha_cierre = localInfo?.fecha_cierre || "";
      item.nota_cierre = localInfo?.nota || "";

      if (item.cerrada) {
        item.clasificacion_mostrar =
          localInfo?.estado_cierre ||
          (base === "CUMPLIDA" ? "CUMPLIDA CERRADA" : "PARCIAL CERRADA");
      } else {
        item.clasificacion_mostrar = base;
      }

      return item;
    });

    return out.sort((a, b) => {
      const fa = a.fecha_necesidad_min || "9999-99-99";
      const fb = b.fecha_necesidad_min || "9999-99-99";
      if (fa !== fb) return fa.localeCompare(fb);
      return a.reserva.localeCompare(b.reserva);
    });
  }, [rows, reservasStore]);

  const reservasFiltradas = useMemo(() => {
    return reservasResumen.filter((r) => {
      if (reserva.trim() && !r.reserva.toLowerCase().includes(reserva.trim().toLowerCase())) {
        return false;
      }

      const fechaRef = r.fecha_necesidad_min || r.fecha_necesidad_max || "";
      if (!withinDateRange(fechaRef, fechaDesde, fechaHasta)) return false;

      if (estadoFiltro !== "TODAS") {
        const estadoBase = String(r.clasificacion_base || "").toUpperCase();
        const estadoMostrado = String(r.clasificacion_mostrar || "").toUpperCase();

        if (estadoFiltro === "CERRADAS" && !r.cerrada) return false;
        if (estadoFiltro === "ABIERTAS" && r.cerrada) return false;
        if (estadoFiltro === "CUMPLIDA" && estadoBase !== "CUMPLIDA") return false;
        if (estadoFiltro === "PARCIAL" && estadoBase !== "PARCIAL") return false;
        if (estadoFiltro === "NO CUMPLIDA" && estadoBase !== "NO CUMPLIDA") return false;
        if (estadoFiltro === "PARCIAL CERRADA" && estadoMostrado !== "PARCIAL CERRADA") return false;
        if (estadoFiltro === "CUMPLIDA CERRADA" && estadoMostrado !== "CUMPLIDA CERRADA") return false;
      }

      if (soloPendientes && !(Number(r.total_diferencia || 0) > 0)) return false;
      if (soloCerradas && !r.cerrada) return false;

      return true;
    });
  }, [reservasResumen, reserva, fechaDesde, fechaHasta, estadoFiltro, soloPendientes, soloCerradas]);

  const reservaSetFiltrado = useMemo(() => {
    return new Set(reservasFiltradas.map((x) => x.reserva));
  }, [reservasFiltradas]);

  const rowsFiltradas = useMemo(() => {
    return rows.filter((r) => {
      if (!reservaSetFiltrado.has(r.reserva)) return false;
      if (!withinDateRange(r.fecha_necesidad, fechaDesde, fechaHasta)) return false;
      if (soloPendientes && !(Number(r.diferencia || 0) > 0)) return false;
      return true;
    });
  }, [rows, reservaSetFiltrado, fechaDesde, fechaHasta, soloPendientes]);

  const resumen = useMemo(() => {
    const totalReservas = reservasFiltradas.length;
    const totalSkus = rowsFiltradas.length;
    const totalRequerido = rowsFiltradas.reduce((a, b) => a + Number(b.cantidad || 0), 0);
    const totalRetirado = rowsFiltradas.reduce((a, b) => a + Number(b.cantidad_retirada || 0), 0);
    const totalDiferencia = rowsFiltradas.reduce((a, b) => a + Number(b.diferencia || 0), 0);
    const totalCerradas = reservasFiltradas.filter((x) => x.cerrada).length;

    return {
      totalReservas,
      totalSkus,
      totalRequerido,
      totalRetirado,
      totalDiferencia,
      totalCerradas,
    };
  }, [reservasFiltradas, rowsFiltradas]);

  const verReserva = async (reservaId) => {
    setReserva(reservaId);
    setReservaActiva(reservaId);
    await loadDespachos(reservaId);
    await loadPicking(reservaId);
  };

  const seleccionarReservaDesdeResumen = async (reservaId) => {
    setReserva(reservaId);
    setReservaActiva(reservaId);
    await loadDespachos(reservaId);
    await loadPicking(reservaId);
  };

  return (
    <div
      style={{
        background: colors.bg,
        minHeight: "100%",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={shellCardStyle}>
        <div
          style={{
            ...sectionHeaderStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                fontWeight: 900,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Módulo despacho
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.1,
                color: colors.navy,
              }}
            >
              Planeación y control de reservas
            </div>
            <div
              style={{
                marginTop: 6,
                color: colors.muted,
                fontSize: 13,
              }}
            >
              Importa el Excel, filtra por fecha de necesidad, controla estados y cierra reservas desde la visual.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Chip label={`Reservas: ${resumen.totalReservas}`} tone="blue" />
            <Chip label={`SKUs: ${resumen.totalSkus}`} tone="blue" />
            <Chip label={`Req: ${formatQty(resumen.totalRequerido)}`} tone="amber" />
            <Chip label={`Ret: ${formatQty(resumen.totalRetirado)}`} tone="green" />
            <Chip label={`Pend: ${formatQty(resumen.totalDiferencia)}`} tone="red" />
            <Chip label={`Cerradas: ${resumen.totalCerradas}`} tone="neutral" />
            {loading && <Chip label="Cargando..." tone="amber" />}
            {err && <Chip label="Error" tone="red" />}
            {!loading && !err && <Chip label="OK" tone="green" />}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.8fr auto auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <div style={labelStyle}>Importar Excel despacho</div>
              <input
                id="input-despacho-excel"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{
                  ...inputStyle,
                  paddingTop: 9,
                }}
              />
            </div>

            <button onClick={onImportar} disabled={subiendo} style={secondaryButtonStyle}>
              <Upload size={15} />
              {subiendo ? "Importando..." : "Importar"}
            </button>

            <div
              style={{
                color: colors.muted,
                fontWeight: 700,
                fontSize: 12,
                minHeight: 42,
                display: "flex",
                alignItems: "center",
              }}
            >
              {ultimaCargaId ? `Última carga ID: ${ultimaCargaId}` : "Sin carga reciente"}
            </div>
          </div>
        </div>
      </div>

      <div style={shellCardStyle}>
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 0.8fr 0.8fr 0.9fr auto auto auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={labelStyle}>Reserva</div>
              <input
                value={reserva}
                onChange={(e) => setReserva(e.target.value)}
                placeholder="Ej: 4500012345"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Fecha desde</div>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Fecha hasta</div>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Estado</div>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                style={inputStyle}
              >
                <option value="TODAS">Todas</option>
                <option value="ABIERTAS">Abiertas</option>
                <option value="CERRADAS">Cerradas</option>
                <option value="CUMPLIDA">Cumplida</option>
                <option value="PARCIAL">Parcial</option>
                <option value="NO CUMPLIDA">No cumplida</option>
                <option value="CUMPLIDA CERRADA">Cumplida cerrada</option>
                <option value="PARCIAL CERRADA">Parcial cerrada</option>
              </select>
            </div>

            <button onClick={onBuscar} style={secondaryButtonStyle}>
              <Search size={15} />
              Buscar
            </button>

            <button onClick={onLimpiar} style={secondaryButtonStyle}>
              <Eraser size={15} />
              Limpiar
            </button>

            <button onClick={() => onGenerarPicking()} style={subtleBlueButtonStyle}>
              <Settings2 size={15} />
              Generar Orden Picking
            </button>
          </div>

          <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                color: colors.text,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => setSoloPendientes(e.target.checked)}
              />
              Solo pendientes
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                color: colors.text,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={soloCerradas}
                onChange={(e) => setSoloCerradas(e.target.checked)}
              />
              Solo cerradas
            </label>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryBox label="Reservas" value={resumen.totalReservas} tone="blue" />
        <SummaryBox label="SKUs" value={resumen.totalSkus} tone="blue" />
        <SummaryBox label="Total requerido" value={formatQty(resumen.totalRequerido)} tone="amber" />
        <SummaryBox label="Total retirado" value={formatQty(resumen.totalRetirado)} tone="green" />
        <SummaryBox label="Pendiente" value={formatQty(resumen.totalDiferencia)} tone="red" />
        <SummaryBox label="Cerradas" value={resumen.totalCerradas} tone="default" />
      </div>

      <div style={shellCardStyle}>
        <div
          style={{
            ...sectionHeaderStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 800, color: colors.navy, fontSize: 15 }}>
            Resumen por reserva
          </div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>
            Mostrando {reservasFiltradas.length} reservas
          </div>
        </div>

        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1500 }}>
            <thead>
              <tr>
                <th style={thStyle}>Fecha necesidad</th>
                <th style={thStyle}>Reserva</th>
                <th style={{ ...thStyle, textAlign: "right" }}>SKUs</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Requerido</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Retirado</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Pendiente</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% Cumplimiento</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Cierre</th>
                <th style={thStyle}>Nota</th>
                <th style={thStyle}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && reservasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: 18, color: colors.muted, fontWeight: 700 }}>
                    No hay reservas con esos filtros.
                  </td>
                </tr>
              )}

              {reservasFiltradas.map((r, idx) => {
                const pct =
                  Number(r.total_requerido || 0) > 0
                    ? (Number(r.total_retirado || 0) / Number(r.total_requerido || 0)) * 100
                    : 0;

                return (
                  <tr
                    key={r.reserva}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      background:
                        reservaActiva === r.reserva
                          ? "#eef6ff"
                          : idx % 2 === 0
                          ? "#fff"
                          : colors.rowAlt,
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 800 }}>
                      {r.fecha_necesidad_min === r.fecha_necesidad_max
                        ? r.fecha_necesidad_min
                        : `${r.fecha_necesidad_min || ""} → ${r.fecha_necesidad_max || ""}`}
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() => seleccionarReservaDesdeResumen(r.reserva)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          margin: 0,
                          color: colors.blue,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                        title={`Seleccionar reserva ${r.reserva}`}
                      >
                        {r.reserva}
                      </button>
                    </td>

                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>{r.total_skus}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                      {formatQty(r.total_requerido)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                      {formatQty(r.total_retirado)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                      {formatQty(r.total_diferencia)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                      {formatQty(pct)}
                    </td>

                    <td style={tdStyle}>
                      <Chip
                        label={r.clasificacion_mostrar}
                        tone={toneByClasificacion(r.clasificacion_mostrar)}
                      />
                    </td>

                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {r.cerrada ? fmtDateTime(r.fecha_cierre) : "Abierta"}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                        whiteSpace: "normal",
                        minWidth: 180,
                        color: "#475569",
                      }}
                    >
                      {r.nota_cierre || ""}
                    </td>

                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => verReserva(r.reserva)}
                          style={{ ...secondaryButtonStyle, height: 36, padding: "0 12px" }}
                        >
                          <Eye size={14} />
                          Ver
                        </button>

                        <button
                          onClick={() => onGenerarPicking(r.reserva)}
                          style={{ ...subtleBlueButtonStyle, height: 36, padding: "0 12px" }}
                        >
                          <Settings2 size={14} />
                          Picking
                        </button>

                        {!r.cerrada ? (
                          <button
                            onClick={() => cerrarReserva(r.reserva, r.clasificacion_base)}
                            style={{ ...subtleWarnButtonStyle, height: 36, padding: "0 12px" }}
                          >
                            <Lock size={14} />
                            Cerrar
                          </button>
                        ) : (
                          <button
                            onClick={() => reabrirReserva(r.reserva)}
                            style={{ ...subtleGreenButtonStyle, height: 36, padding: "0 12px" }}
                          >
                            <Unlock size={14} />
                            Reabrir
                          </button>
                        )}

                        <button
                          onClick={() => eliminarReserva(r.reserva)}
                          style={{ ...subtleRedButtonStyle, height: 36, padding: "0 12px" }}
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={shellCardStyle}>
        <div style={sectionHeaderStyle}>
          <div style={{ fontWeight: 800, color: colors.navy, fontSize: 15 }}>
            Cuadro despacho / validación
          </div>
        </div>

        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1650 }}>
            <thead>
              <tr>
                <th style={thStyle}>Fecha necesidad</th>
                <th style={thStyle}>Reserva</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Texto breve</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cantidad requerida</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cantidad retirada</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Diferencia</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Líneas usadas</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% SKU</th>
                <th style={thStyle}>Clasificación SKU</th>
                <th style={{ ...thStyle, textAlign: "right" }}>% Reserva</th>
                <th style={thStyle}>Clasificación final</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rowsFiltradas.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: 18, color: colors.muted, fontWeight: 700 }}>
                    No hay registros cargados con esos filtros.
                  </td>
                </tr>
              )}

              {rowsFiltradas.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    background: idx % 2 === 0 ? "#fff" : colors.rowAlt,
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{fmtDate(r.fecha_necesidad)}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, color: colors.blue }}>
                    {r.reserva || ""}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{r.sku || ""}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      whiteSpace: "normal",
                      minWidth: 260,
                    }}
                  >
                    {r.texto_breve || ""}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                    {formatQty(r.cantidad)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                    {formatQty(r.cantidad_retirada)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                    {formatQty(r.diferencia)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                    {r.lineas_usadas ?? 0}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                    {formatQty(r.pct_cumplimiento_sku)}
                  </td>
                  <td style={tdStyle}>
                    <Chip
                      label={r.clasificacion_sku || "NO CUMPLIDA"}
                      tone={toneByClasificacion(r.clasificacion_sku)}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                    {formatQty(r.pct_cumplimiento_reserva)}
                  </td>
                  <td style={tdStyle}>
                    <Chip
                      label={r.clasificacion_final || "NO CUMPLIDA"}
                      tone={toneByClasificacion(r.clasificacion_final)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {err && (
          <div style={{ padding: 14, color: colors.bad, fontWeight: 800 }}>
            Error API: {err}
          </div>
        )}
      </div>

      <div style={shellCardStyle}>
        <div
          style={{
            ...sectionHeaderStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 800, color: colors.navy, fontSize: 15 }}>
            Orden de picking generada
          </div>

          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>
            {loadingPicking
              ? "Cargando picking..."
              : reservaActiva
              ? `Reserva consultada: ${reservaActiva}`
              : "Selecciona o escribe una reserva y genera el picking."}
          </div>
        </div>

        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
            <thead>
              <tr>
                <th style={thStyle}>Reserva</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Texto breve</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cantidad requerida</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cantidad a retirar</th>
                <th style={thStyle}>Ubicación</th>
                <th style={thStyle}>Lote almacén</th>
                <th style={thStyle}>Lote proveedor</th>
                <th style={thStyle}>Fecha vencimiento</th>
              </tr>
            </thead>

            <tbody>
              {!loadingPicking && pickingRows.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 18, color: colors.muted, fontWeight: 700 }}>
                    No hay picking generado para esa reserva.
                  </td>
                </tr>
              )}

              {pickingRows.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    background: idx % 2 === 0 ? "#fff" : colors.rowAlt,
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 800, color: colors.blue }}>
                    {r.reserva || ""}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>{r.sku || ""}</td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      whiteSpace: "normal",
                      minWidth: 260,
                    }}
                  >
                    {r.texto_breve || ""}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                    {formatQty(r.cantidad_requerida)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 800,
                      color: colors.good,
                    }}
                  >
                    {formatQty(r.cantidad_a_retirar ?? r.cantidad_sugerida)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{r.ubicacion || ""}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.lote_almacen || ""}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.lote_proveedor || ""}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>
                    {fmtDate(r.fecha_vencimiento)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}