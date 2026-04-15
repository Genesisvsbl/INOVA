import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../../api";
import {
  ArrowLeft,
  Printer,
  Save,
  User,
  FileText,
  AlertTriangle,
  GitCompareArrows,
  X,
  CheckCircle2,
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
  overlay: "rgba(15, 23, 42, 0.45)",
};

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

const textAreaStyle = {
  width: "100%",
  minHeight: 82,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  fontWeight: 700,
  color: colors.text,
  outline: "none",
  boxSizing: "border-box",
  fontSize: 13,
  resize: "vertical",
  fontFamily: "inherit",
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

const greenButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.goodBd}`,
  background: colors.goodBg,
  color: colors.good,
};

const warnButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.warnBd}`,
  background: colors.warnBg,
  color: colors.warn,
};

const dangerOutlineButtonStyle = {
  ...buttonBase,
  border: `1px solid ${colors.badBd}`,
  background: "#fff",
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

function PrintCompareValue({ sugerido, tomado, format = (v) => v || "" }) {
  const sugRaw = sugerido ?? "";
  const tomRaw = tomado ?? "";

  const sug = format(sugRaw);
  const tom = format(tomRaw);

  const hayAlternativaReal =
    String(tomRaw || "").trim() !== "" &&
    String(sug || "").trim() !== String(tom || "").trim();

  if (!hayAlternativaReal) {
    return <span>{sug || tom || ""}</span>;
  }

  return (
    <div style={{ display: "grid", gap: 2, lineHeight: 1.25 }}>
      <div
        style={{
          color: "#8a94a6",
          textDecoration: "line-through",
          fontWeight: 700,
        }}
      >
        {sug || ""}
      </div>
      <div
        style={{
          color: "#0f172a",
          fontWeight: 800,
        }}
      >
        {tom || ""}
      </div>
    </div>
  );
}

export default function OrdenPicking() {
  const navigate = useNavigate();
  const { reserva } = useParams();

  const [rows, setRows] = useState([]);
  const [detallesReserva, setDetallesReserva] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState("");

  const [usuario, setUsuario] = useState("DESPACHO");
  const [documento, setDocumento] = useState("");

  const [cantidades, setCantidades] = useState({});
  const [seleccionados, setSeleccionados] = useState({});
  const [impresos, setImpresos] = useState({});
  const [modoImpresion, setModoImpresion] = useState("seleccionados");

  const [incumplimientoRows, setIncumplimientoRows] = useState({});
  const [alternativasPorRow, setAlternativasPorRow] = useState({});
  const [cargandoAlternativas, setCargandoAlternativas] = useState({});
  const [alternativaElegida, setAlternativaElegida] = useState({});
  const [motivosRotacion, setMotivosRotacion] = useState({});

  const [modalRow, setModalRow] = useState(null);

  const printTimeoutRef = useRef(null);

  const buildMotivoRotacion = (texto) => {
    const limpio = String(texto || "").trim();
    return limpio ? `Incumplimiento de rotacion debido a ${limpio}` : "";
  };

  const closeModal = () => {
    setModalRow(null);
  };

  const loadAlternativas = async (row) => {
    if (!row?.id) return;

    setCargandoAlternativas((prev) => ({
      ...prev,
      [row.id]: true,
    }));

    try {
      const res = await fetch(`${API_URL}/despachos/picking-alternativas/${row.id}`);
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const alternativas = Array.isArray(data?.alternativas) ? data.alternativas : [];

      setAlternativasPorRow((prev) => ({
        ...prev,
        [row.id]: alternativas,
      }));

      if (!alternativas.length) {
        alert("No se encontraron alternativas adicionales para esta línea.");
      }
    } catch (e) {
      alert("❌ Error consultando alternativas:\n" + (e?.message || e));
      setAlternativasPorRow((prev) => ({
        ...prev,
        [row.id]: [],
      }));
    } finally {
      setCargandoAlternativas((prev) => ({
        ...prev,
        [row.id]: false,
      }));
    }
  };

  const abrirModalIncumplimiento = async (row) => {
    setModalRow(row);

    if (!incumplimientoRows[row.id]) {
      setIncumplimientoRows((prev) => ({
        ...prev,
        [row.id]: true,
      }));
    }

    const yaCargadas = alternativasPorRow[row.id];
    const yaTiene = Array.isArray(yaCargadas) && yaCargadas.length > 0;

    if (!yaTiene) {
      await loadAlternativas(row);
    }
  };

  const limpiarIncumplimiento = (id, cantidadBase) => {
    setIncumplimientoRows((prev) => ({
      ...prev,
      [id]: false,
    }));

    setAlternativaElegida((prev) => ({
      ...prev,
      [id]: null,
    }));

    setMotivosRotacion((prev) => ({
      ...prev,
      [id]: "",
    }));

    const base = Number(cantidadBase ?? 0);

    setCantidades((prev) => ({
      ...prev,
      [id]: base,
    }));

    setSeleccionados((prev) => ({
      ...prev,
      [id]: base > 0,
    }));
  };

  const guardarYcerrarModal = (row) => {
    const alt = alternativaElegida[row.id];
    const motivo = buildMotivoRotacion(motivosRotacion[row.id]);

    if (!alt) {
      alert("Debes seleccionar una ubicación alternativa.");
      return;
    }

    if (!motivo.trim()) {
      alert("Debes escribir el motivo del incumplimiento de rotación.");
      return;
    }

    closeModal();
  };

  const onSeleccionarAlternativa = (row, alt) => {
    setAlternativaElegida((prev) => ({
      ...prev,
      [row.id]: alt,
    }));

    const maximo = Number(alt?.cantidad_disponible ?? 0);
    const actual = Number(cantidades[row.id] ?? 0);
    const sugerida = Number(row.cantidad_sugerida ?? 0);
    const nuevaCantidad = Math.min(actual > 0 ? actual : sugerida, maximo);

    setCantidades((prev) => ({
      ...prev,
      [row.id]: nuevaCantidad,
    }));

    setSeleccionados((prev) => ({
      ...prev,
      [row.id]: nuevaCantidad > 0,
    }));
  };

  const loadData = async () => {
    if (!reserva) return;

    setLoading(true);
    setErr("");

    try {
      const [pickRes, despRes] = await Promise.all([
        fetch(`${API_URL}/despachos/picking/${encodeURIComponent(reserva)}`),
        fetch(`${API_URL}/despachos?reserva=${encodeURIComponent(reserva)}`),
      ]);

      if (!pickRes.ok) throw new Error(await pickRes.text());
      if (!despRes.ok) throw new Error(await despRes.text());

      const pickData = await pickRes.json();
      const despData = await despRes.json();

      const safePick = Array.isArray(pickData) ? pickData : [];
      const safeDesp = Array.isArray(despData) ? despData : [];

      setRows(safePick);
      setDetallesReserva(safeDesp);

      const initCant = {};
      const initSel = {};
      const initImp = {};
      const initInc = {};
      const initAltElegida = {};
      const initMotivos = {};

      safePick.forEach((r) => {
        const sugerida = Number(r.cantidad_sugerida ?? 0);
        const confirmada = Number(r.cantidad_confirmada ?? 0);
        const estaConfirmado = !!r.confirmado || confirmada > 0;
        const tieneIncumplimiento = !!r.motivo_rotacion;

        initCant[r.id] = estaConfirmado ? 0 : sugerida;
        initSel[r.id] = !estaConfirmado && sugerida > 0;
        initImp[r.id] = !!r.impreso;
        initInc[r.id] = tieneIncumplimiento;
        initMotivos[r.id] = r.motivo_rotacion
          ? String(r.motivo_rotacion).replace(/^Incumplimiento de rotacion debido a\s*/i, "")
          : "";

        if (r.ubicacion_alternativa) {
          initAltElegida[r.id] = {
            ubicacion: r.ubicacion_alternativa,
            lote_almacen: r.lote_almacen_alternativo,
            lote_proveedor: r.lote_proveedor_alternativo,
            fecha_vencimiento: r.fecha_vencimiento_alternativa,
            cantidad_disponible: Number(r.cantidad_sugerida ?? 0),
          };
        } else {
          initAltElegida[r.id] = null;
        }
      });

      setCantidades(initCant);
      setSeleccionados(initSel);
      setImpresos(initImp);
      setIncumplimientoRows(initInc);
      setAlternativaElegida(initAltElegida);
      setMotivosRotacion(initMotivos);
    } catch (e) {
      setErr(String(e?.message || e));
      setRows([]);
      setDetallesReserva([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reserva]);

  useEffect(() => {
    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
    };
  }, []);

  const rowsConfirmados = useMemo(() => {
    return rows.filter((r) => {
      const confirmada = Number(r.cantidad_confirmada ?? 0);
      return !!r.confirmado || confirmada > 0;
    });
  }, [rows]);

  const rowsPendientes = useMemo(() => {
    return rows.filter((r) => {
      const confirmada = Number(r.cantidad_confirmada ?? 0);
      const sugerida = Number(r.cantidad_sugerida ?? 0);
      return !r.confirmado && confirmada <= 0 && sugerida > 0;
    });
  }, [rows]);

  const onChangeCantidad = (id, value, maximo) => {
    let n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (n > Number(maximo || 0)) n = Number(maximo || 0);

    setCantidades((prev) => ({
      ...prev,
      [id]: n,
    }));

    setSeleccionados((prev) => ({
      ...prev,
      [id]: n > 0,
    }));
  };

  const onToggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const nuevo = !prev[id];

      if (!nuevo) {
        setCantidades((old) => ({
          ...old,
          [id]: 0,
        }));
      } else {
        const row = rowsPendientes.find((x) => x.id === id);
        const alt = alternativaElegida[id];
        const maximoAlt = Number(alt?.cantidad_disponible ?? 0);
        const sugerida = alt ? maximoAlt : Number(row?.cantidad_sugerida ?? 0);

        setCantidades((old) => ({
          ...old,
          [id]: old[id] > 0 ? old[id] : sugerida,
        }));
      }

      return {
        ...prev,
        [id]: nuevo,
      };
    });
  };

  const lineasSeleccionadas = useMemo(() => {
    return rowsPendientes.filter((r) => {
      const cant = Number(cantidades[r.id] ?? 0);
      return !!seleccionados[r.id] && cant > 0;
    });
  }, [rowsPendientes, cantidades, seleccionados]);

  const resumen = useMemo(() => {
    const totalPendientes = rowsPendientes.length;

    const totalRequerido = detallesReserva.reduce(
      (acc, r) => acc + Number(r.cantidad || 0),
      0
    );

    const totalRetirado = detallesReserva.reduce(
      (acc, r) => acc + Number(r.cantidad_retirada || 0),
      0
    );

    const totalPendiente = detallesReserva.reduce(
      (acc, r) => acc + Number(r.diferencia || 0),
      0
    );

    const totalComprometer = lineasSeleccionadas.reduce(
      (acc, r) => acc + Number(cantidades[r.id] ?? 0),
      0
    );

    const totalIncumplimientoRotacion = lineasSeleccionadas.filter(
      (r) => !!incumplimientoRows[r.id]
    ).length;

    return {
      totalPendientes,
      totalRequerido,
      totalRetirado,
      totalPendiente,
      totalComprometer,
      totalIncumplimientoRotacion,
    };
  }, [rowsPendientes, detallesReserva, lineasSeleccionadas, cantidades, incumplimientoRows]);

  const imprimirSeleccionados = async () => {
    if (!lineasSeleccionadas.length) {
      alert("Selecciona al menos una línea pendiente con cantidad mayor que 0 para imprimir.");
      return;
    }

    const ids = {};
    lineasSeleccionadas.forEach((r) => {
      ids[r.id] = true;
    });
    setImpresos((prev) => ({ ...prev, ...ids }));

    setModoImpresion("seleccionados");

    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
    }

    printTimeoutRef.current = setTimeout(() => {
      window.print();
    }, 200);
  };

  const imprimirResultadoFinal = () => {
    setModoImpresion("final");

    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
    }

    printTimeoutRef.current = setTimeout(() => {
      window.print();
    }, 200);
  };

  const guardarDespacho = async () => {
    if (!rowsPendientes.length) {
      alert("No hay líneas pendientes para guardar.");
      return;
    }

    const lineasGuardar = lineasSeleccionadas.map((r) => {
      const usaAlternativa = !!incumplimientoRows[r.id];
      const alt = alternativaElegida[r.id];
      const motivo = buildMotivoRotacion(motivosRotacion[r.id]);

      return {
        ...r,
        cantidad_confirmada: Number(cantidades[r.id] ?? 0),
        usar_alternativa: usaAlternativa,
        motivo_rotacion: usaAlternativa ? motivo : null,
        ubicacion_alternativa: usaAlternativa ? alt?.ubicacion || null : null,
        lote_almacen_alternativo: usaAlternativa ? alt?.lote_almacen || null : null,
        lote_proveedor_alternativo: usaAlternativa ? alt?.lote_proveedor || null : null,
        fecha_vencimiento_alternativa: usaAlternativa
          ? alt?.fecha_vencimiento || null
          : null,
      };
    });

    if (!lineasGuardar.length) {
      alert("Debes seleccionar al menos una línea pendiente con cantidad mayor que 0.");
      return;
    }

    const conIncumplimientoInvalido = lineasGuardar.find((r) => {
      if (!r.usar_alternativa) return false;
      if (!String(r.motivo_rotacion || "").trim()) return true;
      if (!String(r.ubicacion_alternativa || "").trim()) return true;
      return false;
    });

    if (conIncumplimientoInvalido) {
      alert(
        "Debes escribir el motivo del incumplimiento de rotación y seleccionar una ubicación alternativa en todas las líneas marcadas."
      );
      return;
    }

    const noImpresas = lineasGuardar.filter((r) => !impresos[r.id]);
    if (noImpresas.length) {
      const seguir = window.confirm(
        "Hay líneas seleccionadas que aún no has marcado para impresión. ¿Deseas guardar de todas formas?"
      );
      if (!seguir) return;
    }

    setGuardando(true);

    try {
      const payload = {
        usuario: (usuario || "").trim() || "DESPACHO",
        documento: (documento || "").trim() || null,
        items: lineasGuardar.map((r) => ({
          id: r.id,
          cantidad_confirmada: Number(r.cantidad_confirmada),
          usar_alternativa: !!r.usar_alternativa,
          motivo_rotacion: r.motivo_rotacion,
          ubicacion_alternativa: r.ubicacion_alternativa,
          lote_almacen_alternativo: r.lote_almacen_alternativo,
          lote_proveedor_alternativo: r.lote_proveedor_alternativo,
          fecha_vencimiento_alternativa: r.fecha_vencimiento_alternativa,
        })),
      };

      const res = await fetch(
        `${API_URL}/despachos/confirmar-picking/${encodeURIComponent(reserva)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      alert(
        `✅ Despacho guardado correctamente\n\n` +
          `Reserva: ${data.reserva}\n` +
          `Total guardado: ${formatQty(data.total_guardado)}\n` +
          `Total retirado: ${formatQty(data.total_retirado)}\n` +
          `% cumplimiento reserva: ${data.pct_cumplimiento_reserva}%`
      );

      await loadData();
    } catch (e) {
      alert("❌ Error guardando picking:\n" + (e?.message || e));
    } finally {
      setGuardando(false);
    }
  };

  const lineasParaImprimir =
    modoImpresion === "final"
      ? rowsPendientes.map((r) => ({
          ...r,
          cantidad_impresion: Number(cantidades[r.id] ?? 0),
          motivo_rotacion_impresion: buildMotivoRotacion(motivosRotacion[r.id]),
          alternativa_impresion: alternativaElegida[r.id] || null,
        }))
      : lineasSeleccionadas.map((r) => ({
          ...r,
          cantidad_impresion: Number(cantidades[r.id] ?? 0),
          motivo_rotacion_impresion: buildMotivoRotacion(motivosRotacion[r.id]),
          alternativa_impresion: alternativaElegida[r.id] || null,
        }));

  const currentModalAlternativas = modalRow ? alternativasPorRow[modalRow.id] || [] : [];
  const currentModalAlternativa = modalRow ? alternativaElegida[modalRow.id] : null;
  const currentModalMotivo = modalRow ? motivosRotacion[modalRow.id] || "" : "";
  const currentModalUsa = modalRow ? !!incumplimientoRows[modalRow.id] : false;

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", padding: 18 }}>
      <style>{`
        .print-area {
          display: none;
        }

        @page {
          size: landscape;
          margin: 10mm;
        }

        @media print {
          html, body {
            width: 100%;
            height: auto;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }

          .print-area,
          .print-area * {
            visibility: visible;
          }

          .print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .screen-only-root {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border: 1px solid #dbe2ea !important;
            border-radius: 8px !important;
            page-break-inside: avoid;
            margin-bottom: 12px !important;
          }

          .print-table-wrap {
            overflow: visible !important;
          }

          .print-table {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            font-size: 10px !important;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #dbe2ea !important;
            padding: 6px 7px !important;
            white-space: nowrap !important;
          }

          .print-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 16px !important;
            margin-bottom: 8px !important;
            padding-bottom: 6px !important;
            border-bottom: 1px solid #133454 !important;
          }

          .print-header-left {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }

          .print-logo {
            width: 34px !important;
            height: 34px !important;
            object-fit: contain !important;
          }

          .print-title {
            font-size: 14px !important;
            font-weight: 900 !important;
            color: #133454 !important;
            margin: 0 !important;
          }

          .print-subtitle {
            font-size: 9px !important;
            color: #334155 !important;
            margin-top: 4px !important;
          }

          .print-meta {
            font-size: 11px !important;
            color: #0f172a !important;
            text-align: right !important;
            line-height: 1.6 !important;
          }

          .print-alert {
            margin-top: 6px !important;
            color: #c62828 !important;
            font-weight: 800 !important;
          }
        }
      `}</style>

      <div className="screen-only-root">
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
                Orden picking
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: colors.navy,
                }}
              >
                Reserva {reserva || ""}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: colors.muted,
                  fontSize: 13,
                }}
              >
                Lo confirmado queda aparte y abajo solo ves lo pendiente según la necesidad.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Chip label={`Pendientes: ${resumen.totalPendientes}`} tone="blue" />
              <Chip label={`Req: ${formatQty(resumen.totalRequerido)}`} tone="amber" />
              <Chip label={`Retirado: ${formatQty(resumen.totalRetirado)}`} tone="green" />
              <Chip label={`Pendiente: ${formatQty(resumen.totalPendiente)}`} tone="red" />
              <Chip label={`Comprometer: ${formatQty(resumen.totalComprometer)}`} tone="green" />
              <Chip
                label={`Incumplimientos: ${resumen.totalIncumplimientoRotacion}`}
                tone={resumen.totalIncumplimientoRotacion > 0 ? "red" : "neutral"}
              />
              {loading && <Chip label="Cargando..." tone="amber" />}
              {!loading && !err && <Chip label="OK" tone="green" />}
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto auto auto auto",
                gap: 10,
                alignItems: "end",
              }}
            >
              <div>
                <div style={labelStyle}>Usuario</div>
                <div style={{ position: "relative" }}>
                  <User
                    size={14}
                    color={colors.muted}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 34 }}
                  />
                </div>
              </div>

              <div>
                <div style={labelStyle}>Documento</div>
                <div style={{ position: "relative" }}>
                  <FileText
                    size={14}
                    color={colors.muted}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="Opcional"
                    style={{ ...inputStyle, paddingLeft: 34 }}
                  />
                </div>
              </div>

              <button onClick={() => navigate("/movimientos/despacho")} style={secondaryButtonStyle}>
                <ArrowLeft size={15} />
                Regresar
              </button>

              {rowsPendientes.length > 0 && (
                <button onClick={imprimirSeleccionados} style={secondaryButtonStyle}>
                  <Printer size={15} />
                  Imprimir seleccionados
                </button>
              )}

              {rowsPendientes.length === 0 && (
                <button onClick={imprimirResultadoFinal} style={secondaryButtonStyle}>
                  <Printer size={15} />
                  Imprimir resultado final
                </button>
              )}

              <button onClick={guardarDespacho} disabled={guardando} style={greenButtonStyle}>
                <Save size={15} />
                {guardando ? "Guardando..." : "Guardar despacho"}
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div style={{ padding: 14, color: colors.bad, fontWeight: 800 }}>
            Error API: {err}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(170px, 1fr))",
            gap: 10,
            marginTop: 14,
            marginBottom: 14,
          }}
        >
          <SummaryBox label="Pendientes" value={resumen.totalPendientes} tone="blue" />
          <SummaryBox label="Total requerido" value={formatQty(resumen.totalRequerido)} tone="amber" />
          <SummaryBox label="Total retirado" value={formatQty(resumen.totalRetirado)} tone="green" />
          <SummaryBox label="Pendiente" value={formatQty(resumen.totalPendiente)} tone="red" />
          <SummaryBox label="Comprometer" value={formatQty(resumen.totalComprometer)} tone="green" />
          <SummaryBox
            label="Incumplimientos rotación"
            value={resumen.totalIncumplimientoRotacion}
            tone={resumen.totalIncumplimientoRotacion > 0 ? "red" : "default"}
          />
        </div>

        <div style={{ ...shellCardStyle, marginBottom: 14 }}>
          <div style={sectionHeaderStyle}>
            <div style={{ fontWeight: 800, color: colors.navy, fontSize: 15 }}>
              Resumen de la reserva
            </div>
          </div>

          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1500 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha necesidad</th>
                  <th style={thStyle}>Reserva</th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Texto breve</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad retirada</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Diferencia</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>% SKU</th>
                  <th style={thStyle}>Clasificación</th>
                </tr>
              </thead>
              <tbody>
                {detallesReserva.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      background: idx % 2 === 0 ? "#fff" : colors.rowAlt,
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{fmtDate(r.fecha_necesidad)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: colors.blue }}>{r.reserva}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{r.sku}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "normal" }}>
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
                      {formatQty(r.pct_cumplimiento_sku)}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{r.clasificacion_sku || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...shellCardStyle, marginBottom: 14 }}>
          <div style={sectionHeaderStyle}>
            <div style={{ fontWeight: 800, color: colors.navy, fontSize: 15 }}>
              Materiales confirmados
            </div>
          </div>

          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2300 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Reserva</th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Texto breve</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad confirmada</th>
                  <th style={thStyle}>Ubicación tomada</th>
                  <th style={thStyle}>Lote almacén</th>
                  <th style={thStyle}>Lote proveedor</th>
                  <th style={thStyle}>Fecha vencimiento</th>
                  <th style={thStyle}>Alerta rotación</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rowsConfirmados.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: 18, color: colors.muted, fontWeight: 700 }}>
                      Aún no hay materiales confirmados.
                    </td>
                  </tr>
                ) : (
                  rowsConfirmados.map((r, idx) => (
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
                      <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "normal" }}>
                        {r.texto_breve || ""}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                        {formatQty(r.cantidad_requerida)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                        {formatQty(r.cantidad_confirmada || 0)}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {r.ubicacion_alternativa || r.ubicacion || ""}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {r.lote_almacen_alternativo || r.lote_almacen || ""}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {r.lote_proveedor_alternativo || r.lote_proveedor || ""}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {fmtDate(r.fecha_vencimiento_alternativa || r.fecha_vencimiento)}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "normal", minWidth: 340 }}>
                        {r.motivo_rotacion ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              padding: 10,
                              borderRadius: 10,
                              background: colors.badBg,
                              border: `1px solid ${colors.badBd}`,
                              color: colors.bad,
                              fontWeight: 900,
                              lineHeight: 1.35,
                            }}
                          >
                            <AlertTriangle size={16} style={{ flex: "0 0 auto", marginTop: 1 }} />
                            <div>{r.motivo_rotacion}</div>
                          </div>
                        ) : (
                          <span style={{ color: colors.muted }}>Sin novedad</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Chip label="CONFIRMADO" tone="green" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
              Orden de picking pendiente
            </div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>
              Selecciona líneas, define cantidad y registra incumplimiento de rotación si aplica
            </div>
          </div>

          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2600 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Comprometer</th>
                  <th style={thStyle}>Reserva</th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Texto breve</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad sugerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad a comprometer</th>
                  <th style={thStyle}>Ubicación sugerida</th>
                  <th style={thStyle}>Ubicación tomada</th>
                  <th style={thStyle}>Lote almacén</th>
                  <th style={thStyle}>Lote proveedor</th>
                  <th style={thStyle}>Fecha vencimiento</th>
                  <th style={thStyle}>Impreso</th>
                  <th style={thStyle}>Gestión rotación</th>
                  <th style={thStyle}>Estado alerta</th>
                </tr>
              </thead>
              <tbody>
                {rowsPendientes.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ padding: 18, color: colors.good, fontWeight: 800 }}>
                      No hay líneas pendientes.
                    </td>
                  </tr>
                ) : (
                  rowsPendientes.map((r, idx) => {
                    const usandoAlternativa = !!incumplimientoRows[r.id];
                    const alternativa = alternativaElegida[r.id];
                    const maximoCantidad = usandoAlternativa
                      ? Number(alternativa?.cantidad_disponible ?? 0)
                      : Number(r.cantidad_sugerida ?? 0);

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                          background: idx % 2 === 0 ? "#fff" : colors.rowAlt,
                        }}
                      >
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!seleccionados[r.id]}
                            onChange={() => onToggleSeleccion(r.id)}
                          />
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 800, color: colors.blue }}>
                          {r.reserva || ""}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 800 }}>{r.sku || ""}</td>

                        <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "normal", minWidth: 220 }}>
                          {r.texto_breve || ""}
                        </td>

                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                          {formatQty(r.cantidad_requerida)}
                        </td>

                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                          {formatQty(r.cantidad_sugerida ?? 0)}
                        </td>

                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cantidades[r.id] ?? 0}
                            onChange={(e) =>
                              onChangeCantidad(r.id, e.target.value, maximoCantidad)
                            }
                            disabled={!seleccionados[r.id]}
                            style={{
                              width: 120,
                              height: 38,
                              padding: "0 10px",
                              borderRadius: 10,
                              border: `1px solid ${colors.border}`,
                              textAlign: "right",
                              fontWeight: 800,
                              background: !seleccionados[r.id] ? "#f8fafc" : "#fff",
                            }}
                          />
                          {usandoAlternativa && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                color: colors.bad,
                              }}
                            >
                              Máx alt: {formatQty(maximoCantidad)}
                            </div>
                          )}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 700 }}>
                          {r.ubicacion || ""}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: "normal", minWidth: 170 }}>
                          {usandoAlternativa ? (
                            <div style={{ color: colors.bad, fontWeight: 900 }}>
                              {alternativa?.ubicacion || "Pendiente definir"}
                            </div>
                          ) : (
                            <span style={{ color: colors.muted }}>Sugerida</span>
                          )}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "normal", minWidth: 150 }}>
                          {usandoAlternativa
                            ? alternativa?.lote_almacen || ""
                            : r.lote_almacen || ""}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "normal", minWidth: 150 }}>
                          {usandoAlternativa
                            ? alternativa?.lote_proveedor || ""
                            : r.lote_proveedor || ""}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 700 }}>
                          {usandoAlternativa
                            ? fmtDate(alternativa?.fecha_vencimiento)
                            : fmtDate(r.fecha_vencimiento)}
                        </td>

                        <td style={tdStyle}>
                          <Chip
                            label={impresos[r.id] ? "Sí" : "No"}
                            tone={impresos[r.id] ? "green" : "amber"}
                          />
                        </td>

                        <td style={{ ...tdStyle, minWidth: 230, whiteSpace: "normal" }}>
                          <div style={{ display: "grid", gap: 8 }}>
                            <button
                              onClick={() => abrirModalIncumplimiento(r)}
                              type="button"
                              style={usandoAlternativa ? warnButtonStyle : dangerOutlineButtonStyle}
                            >
                              <GitCompareArrows size={15} />
                              {usandoAlternativa ? "Editar alternativa" : "Registrar incumplimiento"}
                            </button>

                            {usandoAlternativa && (
                              <button
                                type="button"
                                onClick={() => limpiarIncumplimiento(r.id, r.cantidad_sugerida)}
                                style={dangerOutlineButtonStyle}
                              >
                                <X size={15} />
                                Quitar incumplimiento
                              </button>
                            )}
                          </div>
                        </td>

                        <td style={{ ...tdStyle, minWidth: 320, whiteSpace: "normal" }}>
                          {usandoAlternativa ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                padding: 10,
                                borderRadius: 10,
                                background: colors.badBg,
                                border: `1px solid ${colors.badBd}`,
                                color: colors.bad,
                                fontWeight: 900,
                                lineHeight: 1.35,
                              }}
                            >
                              <AlertTriangle size={16} style={{ flex: "0 0 auto", marginTop: 1 }} />
                              <div>
                                <div style={{ marginBottom: 4 }}>
                                  {buildMotivoRotacion(motivosRotacion[r.id]) ||
                                    "Incumplimiento de rotacion debido a ..."}
                                </div>
                                <div style={{ fontSize: 12 }}>
                                  Alternativa: {alternativa?.ubicacion || "Pendiente"}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: colors.muted }}>Sin novedad</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalRow && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: colors.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 96vw)",
              maxHeight: "92vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 18,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 24px 80px rgba(15,23,42,.22)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: `1px solid ${colors.border}`,
                background: "linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: colors.bad,
                    fontWeight: 900,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    marginBottom: 8,
                  }}
                >
                  <AlertTriangle size={16} />
                  Incumplimiento de rotación
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, color: colors.navy }}>
                  Gestión de alternativa · SKU {modalRow.sku}
                </div>

                <div style={{ marginTop: 6, color: colors.muted, fontSize: 13 }}>
                  Reserva {modalRow.reserva} · {modalRow.texto_breve || ""}
                </div>
              </div>

              <button
                onClick={closeModal}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: "#fff",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={18} color={colors.text} />
              </button>
            </div>

            <div style={{ padding: 20, display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <SummaryBox label="Cantidad requerida" value={formatQty(modalRow.cantidad_requerida)} tone="amber" />
                <SummaryBox label="Cantidad sugerida" value={formatQty(modalRow.cantidad_sugerida)} tone="blue" />
                <SummaryBox
                  label="Cantidad a tomar"
                  value={formatQty(cantidades[modalRow.id] ?? 0)}
                  tone="green"
                />
                <SummaryBox
                  label="Estado alerta"
                  value={currentModalUsa ? "Activa" : "Sin novedad"}
                  tone={currentModalUsa ? "red" : "default"}
                />
              </div>

              <div
                style={{
                  border: `1px solid ${colors.badBd}`,
                  background: colors.badBg,
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: colors.bad,
                    fontWeight: 900,
                    marginBottom: 10,
                  }}
                >
                  <AlertTriangle size={16} />
                  Mensaje estándar visible
                </div>

                <div
                  style={{
                    color: colors.bad,
                    fontWeight: 900,
                    lineHeight: 1.45,
                    fontSize: 14,
                  }}
                >
                  {buildMotivoRotacion(currentModalMotivo) ||
                    "Incumplimiento de rotacion debido a ..."}
                </div>
              </div>

              <div>
                <div style={labelStyle}>Motivo obligatorio</div>
                <textarea
                  value={currentModalMotivo}
                  onChange={(e) =>
                    setMotivosRotacion((prev) => ({
                      ...prev,
                      [modalRow.id]: e.target.value,
                    }))
                  }
                  placeholder="Ej: equipos eléctricos no están operativos, lote bloqueado, calidad retenida, daño de estiba, acceso restringido..."
                  style={textAreaStyle}
                />
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ ...labelStyle, marginBottom: 0 }}>Ubicaciones alternativas</div>

                  <button
                    type="button"
                    onClick={() => loadAlternativas(modalRow)}
                    style={secondaryButtonStyle}
                    disabled={!!cargandoAlternativas[modalRow.id]}
                  >
                    <GitCompareArrows size={14} />
                    {cargandoAlternativas[modalRow.id] ? "Consultando..." : "Actualizar alternativas"}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    maxHeight: 320,
                    overflowY: "auto",
                    paddingRight: 2,
                  }}
                >
                  {!currentModalAlternativas.length ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: `1px dashed ${colors.badBd}`,
                        background: colors.badBg,
                        color: colors.bad,
                        fontWeight: 800,
                      }}
                    >
                      No hay alternativas disponibles para esta línea.
                    </div>
                  ) : (
                    currentModalAlternativas.map((alt, i) => {
                      const activa =
                        currentModalAlternativa?.ubicacion === alt.ubicacion &&
                        currentModalAlternativa?.lote_almacen === alt.lote_almacen &&
                        currentModalAlternativa?.lote_proveedor === alt.lote_proveedor &&
                        fmtDate(currentModalAlternativa?.fecha_vencimiento) ===
                          fmtDate(alt.fecha_vencimiento);

                      return (
                        <button
                          key={`${modalRow.id}-${i}-${alt.ubicacion}-${alt.lote_almacen}`}
                          type="button"
                          onClick={() => onSeleccionarAlternativa(modalRow, alt)}
                          style={{
                            textAlign: "left",
                            padding: 14,
                            borderRadius: 12,
                            cursor: "pointer",
                            border: `1px solid ${activa ? colors.bad : colors.border}`,
                            background: activa ? colors.badBg : "#fff",
                            color: colors.text,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ fontWeight: 900, color: activa ? colors.bad : colors.navy }}>
                              {alt.ubicacion || ""}
                            </div>
                            <div
                              style={{
                                fontWeight: 900,
                                color: activa ? colors.bad : colors.good,
                              }}
                            >
                              Disp: {formatQty(alt.cantidad_disponible)}
                            </div>
                          </div>

                          <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.55 }}>
                            <div><b>Lote almacén:</b> {alt.lote_almacen || ""}</div>
                            <div><b>Lote proveedor:</b> {alt.lote_proveedor || ""}</div>
                            <div><b>Fecha vencimiento:</b> {fmtDate(alt.fecha_vencimiento)}</div>
                          </div>

                          {activa && (
                            <div
                              style={{
                                marginTop: 10,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                color: colors.bad,
                                fontWeight: 900,
                                fontSize: 12,
                              }}
                            >
                              <CheckCircle2 size={14} />
                              Alternativa seleccionada
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  paddingTop: 4,
                }}
              >
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => limpiarIncumplimiento(modalRow.id, modalRow.cantidad_sugerida)}
                    style={dangerOutlineButtonStyle}
                  >
                    <X size={15} />
                    Quitar incumplimiento
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={closeModal} style={secondaryButtonStyle}>
                    Cerrar
                  </button>

                  <button type="button" onClick={() => guardarYcerrarModal(modalRow)} style={primaryButtonStyle}>
                    <CheckCircle2 size={15} />
                    Guardar y cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="print-area">
        <div className="print-header">
          <div className="print-header-left">
            <img src="/INOVA.png" alt="INOVA" className="print-logo" />
            <div>
              <h1 className="print-title">
                {modoImpresion === "final" ? "RESULTADO FINAL DE DESPACHO" : "ORDEN DE PICKING"}
              </h1>
              <div className="print-subtitle">
                {modoImpresion === "final"
                  ? "WMS INOVA · Resumen final del despacho"
                  : "WMS INOVA · Control logístico"}
              </div>
            </div>
          </div>

          <div className="print-meta">
            <div><b>Reserva:</b> {reserva || ""}</div>
            <div><b>Usuario:</b> {usuario || "DESPACHO"}</div>
            <div><b>Documento:</b> {documento || ""}</div>
            <div><b>Fecha impresión:</b> {fmtDate(new Date())}</div>
          </div>
        </div>

        <div className="print-card" style={shellCardStyle}>
          <div style={sectionHeaderStyle}>Resumen de la reserva</div>

          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Fecha necesidad</th>
                  <th>Reserva</th>
                  <th>SKU</th>
                  <th>Texto breve</th>
                  <th style={{ textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ textAlign: "right" }}>Cantidad retirada</th>
                  <th style={{ textAlign: "right" }}>Diferencia</th>
                  <th style={{ textAlign: "right" }}>% SKU</th>
                  <th>Clasificación</th>
                </tr>
              </thead>
              <tbody>
                {detallesReserva.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.fecha_necesidad)}</td>
                    <td>{r.reserva}</td>
                    <td>{r.sku}</td>
                    <td>{r.texto_breve || ""}</td>
                    <td style={{ textAlign: "right" }}>{formatQty(r.cantidad)}</td>
                    <td style={{ textAlign: "right" }}>{formatQty(r.cantidad_retirada)}</td>
                    <td style={{ textAlign: "right" }}>{formatQty(r.diferencia)}</td>
                    <td style={{ textAlign: "right" }}>{formatQty(r.pct_cumplimiento_sku)}</td>
                    <td>{r.clasificacion_sku || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-card" style={shellCardStyle}>
          <div style={sectionHeaderStyle}>Materiales confirmados</div>

          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>SKU</th>
                  <th>Texto breve</th>
                  <th style={{ textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ textAlign: "right" }}>Cantidad confirmada</th>
                  <th>Ubicación tomada</th>
                  <th>Lote almacén</th>
                  <th>Lote proveedor</th>
                  <th>Fecha vencimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rowsConfirmados.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 18 }}>
                      Aún no hay materiales confirmados.
                    </td>
                  </tr>
                ) : (
                  rowsConfirmados.map((r) => (
                    <tr key={r.id}>
                      <td>{r.reserva || ""}</td>
                      <td>{r.sku || ""}</td>
                      <td>{r.texto_breve || ""}</td>
                      <td style={{ textAlign: "right" }}>{formatQty(r.cantidad_requerida)}</td>
                      <td style={{ textAlign: "right" }}>{formatQty(r.cantidad_confirmada || 0)}</td>
                      <td>
                        <PrintCompareValue
                          sugerido={r.ubicacion}
                          tomado={r.ubicacion_alternativa || r.ubicacion}
                        />
                      </td>
                      <td>
                        <PrintCompareValue
                          sugerido={r.lote_almacen}
                          tomado={r.lote_almacen_alternativo || r.lote_almacen}
                        />
                      </td>
                      <td>
                        <PrintCompareValue
                          sugerido={r.lote_proveedor}
                          tomado={r.lote_proveedor_alternativo || r.lote_proveedor}
                        />
                      </td>
                      <td>
                        <PrintCompareValue
                          sugerido={r.fecha_vencimiento}
                          tomado={r.fecha_vencimiento_alternativa || r.fecha_vencimiento}
                          format={(v) => fmtDate(v)}
                        />
                      </td>
                      <td>CONFIRMADO</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {rowsConfirmados
              .filter((r) => !!r.motivo_rotacion)
              .map((r) => (
                <div key={`alerta-print-${r.id}`} className="print-alert">
                  <b>{r.sku}</b>: {r.motivo_rotacion}
                </div>
              ))}
          </div>
        </div>

        <div className="print-card" style={shellCardStyle}>
          <div style={sectionHeaderStyle}>
            {modoImpresion === "final" ? "Pendiente restante" : "Orden de picking pendiente"}
          </div>

          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr>
                  <th>Reserva</th>
                  <th>SKU</th>
                  <th>Texto breve</th>
                  <th style={{ textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ textAlign: "right" }}>Cantidad sugerida</th>
                  <th>Ubicación sugerida</th>
                  <th style={{ textAlign: "right" }}>Cantidad tomada</th>
                  <th>Ubicación tomada</th>
                  <th>Lote almacén</th>
                  <th>Lote proveedor</th>
                  <th>Fecha vencimiento</th>
                  <th>Observación rotación</th>
                </tr>
              </thead>
              <tbody>
                {lineasParaImprimir.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 18 }}>
                      {modoImpresion === "final"
                        ? "No hay líneas pendientes. El despacho quedó completamente atendido."
                        : "No hay líneas pendientes para imprimir."}
                    </td>
                  </tr>
                ) : (
                  lineasParaImprimir.map((r) => {
                    const alt = r.alternativa_impresion;
                    const usaAlternativa = !!alt;

                    return (
                      <tr key={r.id}>
                        <td>{r.reserva || ""}</td>
                        <td>{r.sku || ""}</td>
                        <td>{r.texto_breve || ""}</td>
                        <td style={{ textAlign: "right" }}>{formatQty(r.cantidad_requerida)}</td>
                        <td style={{ textAlign: "right" }}>{formatQty(r.cantidad_sugerida ?? 0)}</td>
                        <td>
                          <PrintCompareValue
                            sugerido={r.ubicacion}
                            tomado={usaAlternativa ? alt?.ubicacion : r.ubicacion}
                          />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatQty(r.cantidad_impresion ?? 0)}
                        </td>
                        <td>
                          <PrintCompareValue
                            sugerido={r.ubicacion}
                            tomado={usaAlternativa ? alt?.ubicacion : r.ubicacion}
                          />
                        </td>
                        <td>
                          <PrintCompareValue
                            sugerido={r.lote_almacen}
                            tomado={usaAlternativa ? alt?.lote_almacen : r.lote_almacen}
                          />
                        </td>
                        <td>
                          <PrintCompareValue
                            sugerido={r.lote_proveedor}
                            tomado={usaAlternativa ? alt?.lote_proveedor : r.lote_proveedor}
                          />
                        </td>
                        <td>
                          <PrintCompareValue
                            sugerido={r.fecha_vencimiento}
                            tomado={usaAlternativa ? alt?.fecha_vencimiento : r.fecha_vencimiento}
                            format={(v) => fmtDate(v)}
                          />
                        </td>
                        <td style={{ color: r.motivo_rotacion_impresion ? colors.bad : "#0f172a", fontWeight: 800 }}>
                          {r.motivo_rotacion_impresion || ""}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}