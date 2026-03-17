import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../api";

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

  const eliminarReserva = (reservaId) => {
    const ok = window.confirm(`⚠️ ¿Eliminar completamente la reserva ${reservaId}?`);
    if (!ok) return;

    const actual = getReservaStore();
    delete actual[reservaId];
    saveReservaStore(actual);
    forceRefreshStore();

    alert(`🗑️ Reserva ${reservaId} eliminada.`);
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

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", padding: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>
            📦 MÓDULO DESPACHO
          </div>
          <h1 style={{ margin: "6px 0 0", color: colors.navy }}>
            Planeación y control de reservas
          </h1>
          <div style={{ marginTop: 6, color: colors.muted }}>
            Importa el Excel, filtra por fecha de necesidad, controla estados y cierra reservas desde la visual.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`Reservas: ${resumen.totalReservas}`} tone="blue" />
          <Chip label={`SKUs: ${resumen.totalSkus}`} tone="blue" />
          <Chip label={`Req: ${formatQty(resumen.totalRequerido)}`} tone="amber" />
          <Chip label={`Ret: ${formatQty(resumen.totalRetirado)}`} tone="green" />
          <Chip label={`Pend: ${formatQty(resumen.totalDiferencia)}`} tone="red" />
          <Chip label={`Cerradas: ${resumen.totalCerradas}`} tone="neutral" />
          {loading && <Chip label="Cargando…" tone="amber" />}
          {err && <Chip label="Error" tone="red" />}
          {!loading && !err && <Chip label="OK" tone="green" />}
        </div>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr auto auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
              IMPORTAR EXCEL DESPACHO
            </div>
            <input
              id="input-despacho-excel"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                fontWeight: 700,
              }}
            />
          </div>

          <button
            onClick={onImportar}
            disabled={subiendo}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {subiendo ? "⏳ Importando..." : "📥 Importar"}
          </button>

          <div style={{ color: colors.muted, fontWeight: 800, fontSize: 13 }}>
            {ultimaCargaId ? `Última carga ID: ${ultimaCargaId}` : "Sin carga reciente"}
          </div>
        </div>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 14,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto auto auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
              RESERVA
            </div>
            <input
              value={reserva}
              onChange={(e) => setReserva(e.target.value)}
              placeholder="Ej: 4500012345"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                fontWeight: 800,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
              FECHA DESDE
            </div>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                fontWeight: 800,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
              FECHA HASTA
            </div>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                fontWeight: 800,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
              ESTADO
            </div>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                fontWeight: 800,
              }}
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

          <button
            onClick={onBuscar}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            🔎 Buscar
          </button>

          <button
            onClick={onLimpiar}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            🧼 Limpiar
          </button>

          <button
            onClick={() => onGenerarPicking()}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: `1px solid rgba(10,110,209,.25)`,
              background: "rgba(10,110,209,.08)",
              color: colors.blue,
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
            ⚙️ Generar Orden Picking
          </button>
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: colors.text }}>
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
            />
            Solo pendientes
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: colors.text }}>
            <input
              type="checkbox"
              checked={soloCerradas}
              onChange={(e) => setSoloCerradas(e.target.checked)}
            />
            Solo cerradas
          </label>
        </div>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: `1px solid ${colors.border}`,
            fontWeight: 1000,
            color: colors.navy,
          }}
        >
          Resumen por reserva
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1700 }}>
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  borderBottom: `1px solid ${colors.border}`,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 12 }}>Fecha necesidad</th>
                <th style={{ padding: 12 }}>Reserva</th>
                <th style={{ padding: 12, textAlign: "right" }}>SKUs</th>
                <th style={{ padding: 12, textAlign: "right" }}>Requerido</th>
                <th style={{ padding: 12, textAlign: "right" }}>Retirado</th>
                <th style={{ padding: 12, textAlign: "right" }}>Pendiente</th>
                <th style={{ padding: 12, textAlign: "right" }}>% Cumplimiento</th>
                <th style={{ padding: 12 }}>Estado</th>
                <th style={{ padding: 12 }}>Cierre</th>
                <th style={{ padding: 12 }}>Nota</th>
                <th style={{ padding: 12 }}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && reservasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay reservas con esos filtros.
                  </td>
                </tr>
              )}

              {reservasFiltradas.map((r) => {
                const pct =
                  Number(r.total_requerido || 0) > 0
                    ? (Number(r.total_retirado || 0) / Number(r.total_requerido || 0)) * 100
                    : 0;

                return (
                  <tr key={r.reserva} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12, fontWeight: 800 }}>
                      {r.fecha_necesidad_min === r.fecha_necesidad_max
                        ? r.fecha_necesidad_min
                        : `${r.fecha_necesidad_min || ""} → ${r.fecha_necesidad_max || ""}`}
                    </td>
                    <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>{r.reserva}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{r.total_skus}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                      {formatQty(r.total_requerido)}
                    </td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                      {formatQty(r.total_retirado)}
                    </td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                      {formatQty(r.total_diferencia)}
                    </td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                      {formatQty(pct)}
                    </td>
                    <td style={{ padding: 12 }}>
                      <Chip
                        label={r.clasificacion_mostrar}
                        tone={toneByClasificacion(r.clasificacion_mostrar)}
                      />
                    </td>
                    <td style={{ padding: 12, fontWeight: 800 }}>
                      {r.cerrada ? fmtDateTime(r.fecha_cierre) : "Abierta"}
                    </td>
                    <td style={{ padding: 12, fontWeight: 700 }}>{r.nota_cierre || ""}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => verReserva(r.reserva)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: `1px solid ${colors.border}`,
                            background: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          👁️ Ver
                        </button>

                        <button
                          onClick={() => onGenerarPicking(r.reserva)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: `1px solid rgba(10,110,209,.25)`,
                            background: "rgba(10,110,209,.08)",
                            color: colors.blue,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          ⚙️ Picking
                        </button>

                        {!r.cerrada ? (
                          <button
                            onClick={() => cerrarReserva(r.reserva, r.clasificacion_base)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(245,158,11,.28)",
                              background: "rgba(245,158,11,.10)",
                              color: colors.warn,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            🔒 Cerrar
                          </button>
                        ) : (
                          <button
                            onClick={() => reabrirReserva(r.reserva)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(22,163,74,.25)",
                              background: "rgba(22,163,74,.10)",
                              color: colors.good,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            🔓 Reabrir
                          </button>
                        )}

                        <button
                          onClick={() => eliminarReserva(r.reserva)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid rgba(220,38,38,.25)",
                            background: "rgba(220,38,38,.10)",
                            color: colors.bad,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          🗑️ Eliminar
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

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: `1px solid ${colors.border}`,
            fontWeight: 1000,
            color: colors.navy,
          }}
        >
          Cuadro despacho / validación
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2200 }}>
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  borderBottom: `1px solid ${colors.border}`,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 12 }}>Fecha necesidad</th>
                <th style={{ padding: 12 }}>Reserva</th>
                <th style={{ padding: 12 }}>SKU</th>
                <th style={{ padding: 12 }}>Texto breve</th>
                <th style={{ padding: 12, textAlign: "right" }}>Cantidad requerida</th>
                <th style={{ padding: 12, textAlign: "right" }}>Cantidad retirada</th>
                <th style={{ padding: 12, textAlign: "right" }}>Diferencia</th>
                <th style={{ padding: 12, textAlign: "right" }}>Líneas usadas</th>
                <th style={{ padding: 12, textAlign: "right" }}>% SKU</th>
                <th style={{ padding: 12 }}>Clasificación SKU</th>
                <th style={{ padding: 12, textAlign: "right" }}>% Reserva</th>
                <th style={{ padding: 12 }}>Clasificación final</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rowsFiltradas.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay registros cargados con esos filtros.
                  </td>
                </tr>
              )}

              {rowsFiltradas.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_necesidad)}</td>
                  <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>{r.reserva || ""}</td>
                  <td style={{ padding: 12, fontWeight: 900 }}>{r.sku || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.texto_breve || ""}</td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                    {formatQty(r.cantidad)}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                    {formatQty(r.cantidad_retirada)}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                    {formatQty(r.diferencia)}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                    {r.lineas_usadas ?? 0}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                    {formatQty(r.pct_cumplimiento_sku)}
                  </td>
                  <td style={{ padding: 12 }}>
                    <Chip
                      label={r.clasificacion_sku || "NO CUMPLIDA"}
                      tone={toneByClasificacion(r.clasificacion_sku)}
                    />
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                    {formatQty(r.pct_cumplimiento_reserva)}
                  </td>
                  <td style={{ padding: 12 }}>
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
          <div style={{ padding: 14, color: colors.bad, fontWeight: 900 }}>
            Error API: {err}
          </div>
        )}
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: `1px solid ${colors.border}`,
            fontWeight: 1000,
            color: colors.navy,
          }}
        >
          Orden de picking generada
        </div>

        <div style={{ padding: "10px 14px", color: colors.muted, fontWeight: 700 }}>
          {loadingPicking
            ? "Cargando picking..."
            : reservaActiva
            ? `Reserva consultada: ${reservaActiva}`
            : "Selecciona o escribe una reserva y genera el picking."}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1600 }}>
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  borderBottom: `1px solid ${colors.border}`,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 12 }}>Reserva</th>
                <th style={{ padding: 12 }}>SKU</th>
                <th style={{ padding: 12 }}>Texto breve</th>
                <th style={{ padding: 12, textAlign: "right" }}>Cantidad requerida</th>
                <th style={{ padding: 12, textAlign: "right" }}>Cantidad a retirar</th>
                <th style={{ padding: 12 }}>Ubicación</th>
                <th style={{ padding: 12 }}>Lote almacén</th>
                <th style={{ padding: 12 }}>Lote proveedor</th>
                <th style={{ padding: 12 }}>Fecha vencimiento</th>
              </tr>
            </thead>

            <tbody>
              {!loadingPicking && pickingRows.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay picking generado para esa reserva.
                  </td>
                </tr>
              )}

              {pickingRows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>{r.reserva || ""}</td>
                  <td style={{ padding: 12, fontWeight: 900 }}>{r.sku || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.texto_breve || ""}</td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>
                    {formatQty(r.cantidad_requerida)}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 900, color: colors.good }}>
                    {formatQty(r.cantidad_a_retirar ?? r.cantidad_sugerida)}
                  </td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.ubicacion || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_almacen || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_proveedor || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_vencimiento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}