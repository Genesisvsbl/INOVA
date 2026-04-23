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
  Plus,
  Search,
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
  overlay: "rgba(15, 23, 42, 0.45)",
};

const MOTIVOS_ROTACION = [
  "Equipos No operativos",
  "Mala Identificacion del material",
  "desicion del opm",
];

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

const selectStyle = {
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

function getEstadoEntrega(cantidad, sugerida) {
  const cant = Number(cantidad || 0);
  const sug = Number(sugerida || 0);

  if (cant <= 0) {
    return {
      key: "sin_cantidad",
      label: "SIN CANTIDAD",
      tone: "neutral",
      color: colors.muted,
    };
  }

  if (cant > sug) {
    return {
      key: "sobre",
      label: "ENTREGA DE MÁS",
      tone: "red",
      color: colors.bad,
    };
  }

  if (cant === sug) {
    return {
      key: "igual",
      label: "ENTREGA EXACTA",
      tone: "green",
      color: colors.good,
    };
  }

  return {
    key: "debajo",
    label: "ENTREGA MENOR",
    tone: "amber",
    color: colors.warn,
  };
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

  const [maximosManuales, setMaximosManuales] = useState({});
  const [itemsManualExtra, setItemsManualExtra] = useState([]);

  const [busquedaManualOpen, setBusquedaManualOpen] = useState(false);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuSearchLoading, setSkuSearchLoading] = useState(false);
  const [skuSearchResults, setSkuSearchResults] = useState([]);
  const [skuSearchError, setSkuSearchError] = useState("");

  const printTimeoutRef = useRef(null);
  const skuSearchTimeoutRef = useRef(null);

  const buildMotivoRotacion = (texto) => {
    const limpio = String(texto || "").trim();
    return limpio ? `Incumplimiento de rotacion debido a ${limpio}` : "";
  };

  const closeModal = () => {
    setModalRow(null);
  };

  const loadAlternativas = async (row) => {
    if (!row?.id || String(row.id).startsWith("manual-")) return;

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

    if (String(row.id).startsWith("manual-")) return;

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
      alert("Debes seleccionar el motivo del incumplimiento de rotación.");
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
      const initMaximos = {};

      safePick.forEach((r) => {
        const sugerida = Number(r.cantidad_sugerida ?? 0);
        const disponible = Number(r.cantidad_disponible ?? r.cantidad_sugerida ?? 0);
        const confirmada = Number(r.cantidad_confirmada ?? 0);
        const estaConfirmado = !!r.confirmado || confirmada > 0;
        const tieneIncumplimiento = !!r.motivo_rotacion;

        initCant[r.id] = estaConfirmado ? 0 : sugerida;
        initSel[r.id] = !estaConfirmado && sugerida > 0;
        initImp[r.id] = !!r.impreso;
        initInc[r.id] = tieneIncumplimiento;
        initMaximos[r.id] = disponible;

        initMotivos[r.id] = r.motivo_rotacion
          ? String(r.motivo_rotacion).replace(/^Incumplimiento de rotacion debido a\s*/i, "")
          : "";

        if (r.ubicacion_alternativa) {
          initAltElegida[r.id] = {
            ubicacion: r.ubicacion_alternativa,
            lote_almacen: r.lote_almacen_alternativo,
            lote_proveedor: r.lote_proveedor_alternativo,
            fecha_vencimiento: r.fecha_vencimiento_alternativa,
            cantidad_disponible: Number(r.cantidad_disponible ?? r.cantidad_sugerida ?? 0),
            sku: r.sku,
            texto_breve: r.texto_breve,
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
      setMaximosManuales((prev) => ({ ...prev, ...initMaximos }));
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
      if (skuSearchTimeoutRef.current) {
        clearTimeout(skuSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!busquedaManualOpen) return;

    const q = skuSearch.trim();

    if (skuSearchTimeoutRef.current) {
      clearTimeout(skuSearchTimeoutRef.current);
    }

    if (!q || q.length < 2) {
      setSkuSearchResults([]);
      setSkuSearchError("");
      setSkuSearchLoading(false);
      return;
    }

    skuSearchTimeoutRef.current = setTimeout(async () => {
      setSkuSearchLoading(true);
      setSkuSearchError("");

      try {
        const res = await fetch(
          `${API_URL}/despachos/buscar-sku-manual?q=${encodeURIComponent(q)}&limit=20`
        );
        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        setSkuSearchResults(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        setSkuSearchResults([]);
        setSkuSearchError(String(e?.message || e));
      } finally {
        setSkuSearchLoading(false);
      }
    }, 350);
  }, [skuSearch, busquedaManualOpen]);

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

  const rowsPendientesFull = useMemo(() => {
    return [...rowsPendientes, ...itemsManualExtra];
  }, [rowsPendientes, itemsManualExtra]);

  const calcularNecesidadPendientePorSku = (sku, excludeId = null) => {
    const skuNorm = String(sku || "").trim().toUpperCase();
    if (!skuNorm) return 0;

    const detallesMismoSku = detallesReserva.filter(
      (d) => String(d.sku || "").trim().toUpperCase() === skuNorm
    );

    const totalRequerido = detallesMismoSku.reduce(
      (acc, d) => acc + Number(d.cantidad || 0),
      0
    );

    const totalRetirado = detallesMismoSku.reduce(
      (acc, d) => acc + Number(d.cantidad_retirada || 0),
      0
    );

    const comprometidoSeleccionado = rowsPendientesFull.reduce((acc, r) => {
      if (excludeId != null && String(r.id) === String(excludeId)) return acc;

      const mismoSku = String(r.sku || "").trim().toUpperCase() === skuNorm;
      if (!mismoSku) return acc;
      if (!seleccionados[r.id]) return acc;

      return acc + Number(cantidades[r.id] ?? 0);
    }, 0);

    const pendiente = totalRequerido - totalRetirado - comprometidoSeleccionado;
    return pendiente > 0 ? pendiente : 0;
  };

  const getCantidadSugeridaVisual = (r) => {
    const esManual = !!r.manual;
    const maximoCantidad = !!incumplimientoRows[r.id]
      ? Number(alternativaElegida[r.id]?.cantidad_disponible ?? 0)
      : Number(
          maximosManuales[r.id] ??
            r.cantidad_disponible ??
            r.cantidad_sugerida ??
            0
        );

    if (esManual) {
      return Math.min(calcularNecesidadPendientePorSku(r.sku, r.id), maximoCantidad);
    }

    return Number(r.cantidad_sugerida ?? 0);
  };

  const onChangeCantidad = (id, value, maximo) => {
    let n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    if (n < 0) n = 0;

    const tope = Number(maximo || 0);
    if (tope > 0 && n > tope) n = tope;

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
        const row = rowsPendientesFull.find((x) => x.id === id);
        const alt = alternativaElegida[id];
        const maximoAlt = Number(alt?.cantidad_disponible ?? 0);
        const maximoManual = Number(
          maximosManuales[id] ??
            row?.cantidad_disponible ??
            row?.cantidad_sugerida ??
            0
        );

        let sugeridaBase = Number(row?.cantidad_sugerida ?? 0);

        if (row?.manual) {
          sugeridaBase = Math.min(
            calcularNecesidadPendientePorSku(row.sku, row.id),
            maximoManual
          );
        }

        const base = alt ? maximoAlt : sugeridaBase;

        setCantidades((old) => ({
          ...old,
          [id]: old[id] > 0 ? old[id] : base,
        }));
      }

      return {
        ...prev,
        [id]: nuevo,
      };
    });
  };

  const lineasSeleccionadas = useMemo(() => {
    return rowsPendientesFull.filter((r) => {
      const cant = Number(cantidades[r.id] ?? 0);
      return !!seleccionados[r.id] && cant > 0;
    });
  }, [rowsPendientesFull, cantidades, seleccionados]);

  const resumen = useMemo(() => {
    const totalPendientes = rowsPendientesFull.length;

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

    const totalSobreSugerido = lineasSeleccionadas.filter((r) => {
      const actual = Number(cantidades[r.id] ?? 0);
      const sugerida = getCantidadSugeridaVisual(r);
      return actual > sugerida;
    }).length;

    const totalIgualSugerido = lineasSeleccionadas.filter((r) => {
      const actual = Number(cantidades[r.id] ?? 0);
      const sugerida = getCantidadSugeridaVisual(r);
      return actual > 0 && actual === sugerida;
    }).length;

    const totalDebajoSugerido = lineasSeleccionadas.filter((r) => {
      const actual = Number(cantidades[r.id] ?? 0);
      const sugerida = getCantidadSugeridaVisual(r);
      return actual > 0 && actual < sugerida;
    }).length;

    const diferenciaContraSugerido = lineasSeleccionadas.reduce((acc, r) => {
      const actual = Number(cantidades[r.id] ?? 0);
      const sugerida = getCantidadSugeridaVisual(r);
      return acc + (actual - sugerida);
    }, 0);

    return {
      totalPendientes,
      totalRequerido,
      totalRetirado,
      totalPendiente,
      totalComprometer,
      totalIncumplimientoRotacion,
      totalSobreSugerido,
      totalIgualSugerido,
      totalDebajoSugerido,
      diferenciaContraSugerido,
    };
  }, [rowsPendientesFull, detallesReserva, lineasSeleccionadas, cantidades, incumplimientoRows]);

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
    }, 180);
  };

  const imprimirResultadoFinal = () => {
    setModoImpresion("final");

    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current);
    }

    printTimeoutRef.current = setTimeout(() => {
      window.print();
    }, 180);
  };

  const guardarDespacho = async () => {
    if (!rowsPendientesFull.length) {
      alert("No hay líneas pendientes para guardar.");
      return;
    }

    const lineasGuardar = lineasSeleccionadas.map((r) => {
      const usaAlternativa = !!incumplimientoRows[r.id];
      const alt = alternativaElegida[r.id];
      const motivo = buildMotivoRotacion(motivosRotacion[r.id]);

      const esManual = !!r.manual;
      const ubicBase = r.ubicacion;
      const loteAlmBase = r.lote_almacen;
      const loteProvBase = r.lote_proveedor;
      const fvBase = r.fecha_vencimiento;

      return {
        ...r,
        cantidad_confirmada: Number(cantidades[r.id] ?? 0),
        usar_alternativa: usaAlternativa,
        motivo_rotacion: usaAlternativa ? motivo : null,
        ubicacion_alternativa: usaAlternativa ? alt?.ubicacion || null : null,
        lote_almacen_alternativo: usaAlternativa ? alt?.lote_almacen || null : null,
        lote_proveedor_alternativo: usaAlternativa ? alt?.lote_proveedor || null : null,
        fecha_vencimiento_alternativa: usaAlternativa ? alt?.fecha_vencimiento || null : null,
        ubicacion_base_guardado: ubicBase || null,
        lote_almacen_base_guardado: loteAlmBase || null,
        lote_proveedor_base_guardado: loteProvBase || null,
        fecha_vencimiento_base_guardado: fvBase || null,
        manual: esManual,
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
        "Debes seleccionar el motivo del incumplimiento de rotación y seleccionar una ubicación alternativa en todas las líneas marcadas."
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
          id: Number(String(r.id).startsWith("manual-") ? 0 : r.id),
          cantidad_confirmada: Number(r.cantidad_confirmada),
          usar_alternativa: !!r.usar_alternativa,
          motivo_rotacion: r.motivo_rotacion,
          ubicacion_alternativa: r.ubicacion_alternativa,
          lote_almacen_alternativo: r.lote_almacen_alternativo,
          lote_proveedor_alternativo: r.lote_proveedor_alternativo,
          fecha_vencimiento_alternativa: r.fecha_vencimiento_alternativa,
          manual: !!r.manual,
          sku: r.sku,
          texto_breve: r.texto_breve,
          reserva: r.reserva,
          ubicacion: r.ubicacion_base_guardado,
          lote_almacen: r.lote_almacen_base_guardado,
          lote_proveedor: r.lote_proveedor_base_guardado,
          fecha_vencimiento: r.fecha_vencimiento_base_guardado,
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

      setItemsManualExtra([]);
      await loadData();
    } catch (e) {
      alert("❌ Error guardando picking:\n" + (e?.message || e));
    } finally {
      setGuardando(false);
    }
  };

  const lineasParaImprimir =
    modoImpresion === "final"
      ? rowsPendientesFull.map((r) => ({
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

  const abrirBuscadorManual = () => {
    setBusquedaManualOpen(true);
    setSkuSearch("");
    setSkuSearchResults([]);
    setSkuSearchError("");
  };

  const cerrarBuscadorManual = () => {
    setBusquedaManualOpen(false);
    setSkuSearch("");
    setSkuSearchResults([]);
    setSkuSearchError("");
    setSkuSearchLoading(false);
  };

  const agregarSkuManualDesdeSugerencia = (item) => {
    const id = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const sku = item?.sku || "";
    const disponible = Number(item?.cantidad_disponible ?? 0);
    const necesidadPendiente = calcularNecesidadPendientePorSku(sku);
    const sugerida = Math.min(necesidadPendiente, disponible);

    const nuevo = {
      id,
      manual: true,
      reserva: reserva || "",
      sku,
      texto_breve: item?.texto_breve || "",
      cantidad_requerida: necesidadPendiente,
      cantidad_sugerida: sugerida,
      cantidad_confirmada: 0,
      cantidad_disponible: disponible,
      ubicacion: item?.ubicacion || "",
      lote_almacen: item?.lote_almacen || "",
      lote_proveedor: item?.lote_proveedor || "",
      fecha_vencimiento: item?.fecha_vencimiento || null,
      impreso: false,
      confirmado: false,
      familia: item?.familia || "",
      unidad_medida: item?.unidad_medida || "",
    };

    setItemsManualExtra((prev) => [...prev, nuevo]);
    setCantidades((prev) => ({ ...prev, [id]: sugerida }));
    setSeleccionados((prev) => ({ ...prev, [id]: sugerida > 0 }));
    setImpresos((prev) => ({ ...prev, [id]: false }));
    setIncumplimientoRows((prev) => ({ ...prev, [id]: false }));
    setAlternativaElegida((prev) => ({ ...prev, [id]: null }));
    setMotivosRotacion((prev) => ({ ...prev, [id]: "" }));
    setMaximosManuales((prev) => ({
      ...prev,
      [id]: disponible,
    }));

    cerrarBuscadorManual();
  };

  const eliminarSkuManual = (id) => {
    setItemsManualExtra((prev) => prev.filter((x) => x.id !== id));

    setCantidades((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setSeleccionados((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setImpresos((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setIncumplimientoRows((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setAlternativaElegida((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setMotivosRotacion((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    setMaximosManuales((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", padding: 18 }}>
      <style>{`
        .print-area {
          display: none;
        }

        @page {
          size: Letter landscape;
          margin: 6mm 5mm;
        }

        @media print {
          html,
          body {
            width: 100% !important;
            min-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: Arial, Helvetica, sans-serif !important;
          }

          #root {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .screen-only-root {
            display: none !important;
          }

          .print-area {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            transform: none !important;
            height: auto !important;
            min-height: auto !important;
          }

          .print-inner {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .print-header {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 12px !important;
            margin: 0 0 8px 0 !important;
            padding: 0 0 6px 0 !important;
            border-bottom: 1px solid #133454 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-header-left {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            min-width: 0 !important;
          }

          .print-logo {
            width: 34px !important;
            height: 34px !important;
            object-fit: contain !important;
            flex: 0 0 auto !important;
          }

          .print-title {
            font-size: 18px !important;
            font-weight: 900 !important;
            color: #133454 !important;
            margin: 0 !important;
            line-height: 1.05 !important;
          }

          .print-subtitle {
            font-size: 9px !important;
            color: #334155 !important;
            margin-top: 2px !important;
            line-height: 1.15 !important;
          }

          .print-meta {
            font-size: 10px !important;
            color: #0f172a !important;
            text-align: right !important;
            line-height: 1.25 !important;
            flex: 0 0 auto !important;
            margin: 0 !important;
            padding: 0 !important;
            white-space: nowrap !important;
          }

          .print-card {
            border: 1px solid #cfd8e3 !important;
            border-radius: 6px !important;
            margin: 0 0 10px 0 !important;
            overflow: visible !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
            page-break-after: auto !important;
            page-break-before: auto !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }

          .print-section-title {
            font-size: 12px !important;
            font-weight: 900 !important;
            padding: 7px 10px !important;
            margin: 0 !important;
            background: #ffffff !important;
            border-bottom: 1px solid #dbe2ea !important;
            color: #133454 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-table-wrap {
            width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            max-height: none !important;
          }

          .print-table {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 !important;
            page-break-inside: auto !important;
          }

          .print-table thead {
            display: table-header-group !important;
          }

          .print-table tfoot {
            display: table-footer-group !important;
          }

          .print-table tbody {
            display: table-row-group !important;
          }

          .print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #cfd8e3 !important;
            padding: 5px 6px !important;
            vertical-align: top !important;
            line-height: 1.2 !important;
            font-size: 10px !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }

          .print-table th {
            font-size: 10px !important;
            font-weight: 900 !important;
            white-space: normal !important;
            background: #f8fafc !important;
          }

          .print-nowrap {
            white-space: nowrap !important;
          }

          .print-wrap {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
          }

          .print-alert {
            margin-top: 4px !important;
            color: #c62828 !important;
            font-weight: 800 !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding: 2px 0 !important;
          }

          .print-no-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
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
                label={`De más: ${resumen.totalSobreSugerido}`}
                tone={resumen.totalSobreSugerido > 0 ? "red" : "neutral"}
              />
              <Chip
                label={`Exactas: ${resumen.totalIgualSugerido}`}
                tone={resumen.totalIgualSugerido > 0 ? "green" : "neutral"}
              />
              <Chip
                label={`De menos: ${resumen.totalDebajoSugerido}`}
                tone={resumen.totalDebajoSugerido > 0 ? "amber" : "neutral"}
              />
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
                gridTemplateColumns: "1fr 1fr auto auto auto auto auto",
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

              <button onClick={abrirBuscadorManual} style={secondaryButtonStyle} type="button">
                <Plus size={15} />
                Agregar SKU manual
              </button>

              {rowsPendientesFull.length > 0 && (
                <button onClick={imprimirSeleccionados} style={secondaryButtonStyle}>
                  <Printer size={15} />
                  Imprimir seleccionados
                </button>
              )}

              {rowsPendientesFull.length === 0 && (
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
            gridTemplateColumns: "repeat(9, minmax(150px, 1fr))",
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
          <SummaryBox label="Líneas de más" value={resumen.totalSobreSugerido} tone="red" />
          <SummaryBox label="Líneas exactas" value={resumen.totalIgualSugerido} tone="green" />
          <SummaryBox label="Líneas de menos" value={resumen.totalDebajoSugerido} tone="amber" />
          <SummaryBox
            label="Dif. vs sugerido"
            value={formatQty(resumen.diferenciaContraSugerido)}
            tone={
              resumen.diferenciaContraSugerido > 0
                ? "red"
                : resumen.diferenciaContraSugerido < 0
                ? "amber"
                : "green"
            }
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
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 900,
                        color:
                          Number(r.diferencia || 0) < 0
                            ? colors.bad
                            : Number(r.diferencia || 0) > 0
                            ? colors.warn
                            : colors.good,
                      }}
                    >
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2550 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Reserva</th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Texto breve</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad sugerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad confirmada</th>
                  <th style={thStyle}>Evidencia entrega</th>
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
                    <td colSpan={13} style={{ padding: 18, color: colors.muted, fontWeight: 700 }}>
                      Aún no hay materiales confirmados.
                    </td>
                  </tr>
                ) : (
                  rowsConfirmados.map((r, idx) => {
                    const estadoEntrega = getEstadoEntrega(
                      Number(r.cantidad_confirmada ?? 0),
                      Number(r.cantidad_sugerida ?? 0)
                    );

                    const dif = Number(r.cantidad_confirmada ?? 0) - Number(r.cantidad_sugerida ?? 0);

                    return (
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
                          {formatQty(r.cantidad_sugerida ?? 0)}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 900,
                            color: estadoEntrega.color,
                          }}
                        >
                          {formatQty(r.cantidad_confirmada || 0)}
                        </td>
                        <td style={{ ...tdStyle, minWidth: 180, whiteSpace: "normal" }}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <Chip
                              label={estadoEntrega.label}
                              tone={
                                estadoEntrega.key === "sobre"
                                  ? "red"
                                  : estadoEntrega.key === "igual"
                                  ? "green"
                                  : estadoEntrega.key === "debajo"
                                  ? "amber"
                                  : "neutral"
                              }
                            />
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 900,
                                color: estadoEntrega.color,
                              }}
                            >
                              Dif. vs sugerido: {formatQty(dif)}
                            </div>
                          </div>
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
                    );
                  })
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 3200 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Comprometer</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Reserva</th>
                  <th style={thStyle}>SKU</th>
                  <th style={thStyle}>Texto breve</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad sugerida</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad a comprometer</th>
                  <th style={thStyle}>Evidencia entrega</th>
                  <th style={thStyle}>Ubicación sugerida</th>
                  <th style={thStyle}>Ubicación tomada</th>
                  <th style={thStyle}>Lote almacén</th>
                  <th style={thStyle}>Lote proveedor</th>
                  <th style={thStyle}>Fecha vencimiento</th>
                  <th style={thStyle}>Impreso</th>
                  <th style={thStyle}>Gestión rotación</th>
                  <th style={thStyle}>Acción</th>
                  <th style={thStyle}>Estado alerta</th>
                </tr>
              </thead>
              <tbody>
                {rowsPendientesFull.length === 0 ? (
                  <tr>
                    <td colSpan={18} style={{ padding: 18, color: colors.good, fontWeight: 800 }}>
                      No hay líneas pendientes.
                    </td>
                  </tr>
                ) : (
                  rowsPendientesFull.map((r, idx) => {
                    const usandoAlternativa = !!incumplimientoRows[r.id];
                    const alternativa = alternativaElegida[r.id];
                    const esManual = !!r.manual;

                    const maximoCantidad = usandoAlternativa
                      ? Number(alternativa?.cantidad_disponible ?? 0)
                      : Number(
                          maximosManuales[r.id] ??
                            r.cantidad_disponible ??
                            r.cantidad_sugerida ??
                            0
                        );

                    const cantidadActual = Number(cantidades[r.id] ?? 0);

                    const cantidadSugeridaVisual = esManual
                      ? Math.min(calcularNecesidadPendientePorSku(r.sku, r.id), maximoCantidad)
                      : Number(r.cantidad_sugerida ?? 0);

                    const cantidadRequeridaVisual = esManual
                      ? calcularNecesidadPendientePorSku(r.sku, r.id) + cantidadActual
                      : Number(r.cantidad_requerida ?? 0);

                    const excesoSobreSugerido = Math.max(0, cantidadActual - cantidadSugeridaVisual);
                    const estadoEntrega = getEstadoEntrega(cantidadActual, cantidadSugeridaVisual);

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

                        <td style={tdStyle}>
                          <Chip label={esManual ? "MANUAL" : "SUGERIDO"} tone={esManual ? "amber" : "blue"} />
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 800, color: colors.blue }}>
                          {r.reserva || ""}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 800 }}>{r.sku || ""}</td>

                        <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "normal", minWidth: 220 }}>
                          {r.texto_breve || ""}
                        </td>

                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                          {formatQty(cantidadRequeridaVisual)}
                        </td>

                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>
                          {formatQty(cantidadSugeridaVisual)}
                        </td>

                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cantidades[r.id] ?? 0}
                            onChange={(e) => onChangeCantidad(r.id, e.target.value, maximoCantidad)}
                            disabled={!seleccionados[r.id]}
                            style={{
                              width: 120,
                              height: 38,
                              padding: "0 10px",
                              borderRadius: 10,
                              border:
                                cantidadActual > cantidadSugeridaVisual
                                  ? `1px solid ${colors.bad}`
                                  : `1px solid ${colors.border}`,
                              textAlign: "right",
                              fontWeight: 800,
                              color: cantidadActual > cantidadSugeridaVisual ? colors.bad : colors.text,
                              background: !seleccionados[r.id] ? "#f8fafc" : "#fff",
                            }}
                          />

                          {cantidadActual > 0 && excesoSobreSugerido > 0 && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                fontWeight: 900,
                                color: colors.bad,
                              }}
                            >
                              Exceso sobre sugerido: {formatQty(excesoSobreSugerido)}
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 11,
                              fontWeight: 800,
                              color: colors.muted,
                            }}
                          >
                            Sugerido: {formatQty(cantidadSugeridaVisual)} · Máx disp.: {formatQty(maximoCantidad)}
                          </div>
                        </td>

                        <td style={{ ...tdStyle, minWidth: 180, whiteSpace: "normal" }}>
                          {cantidadActual > 0 ? (
                            <div style={{ display: "grid", gap: 6 }}>
                              <Chip
                                label={estadoEntrega.label}
                                tone={
                                  estadoEntrega.key === "sobre"
                                    ? "red"
                                    : estadoEntrega.key === "igual"
                                    ? "green"
                                    : estadoEntrega.key === "debajo"
                                    ? "amber"
                                    : "neutral"
                                }
                              />
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 900,
                                  color: estadoEntrega.color,
                                }}
                              >
                                Dif.: {formatQty(cantidadActual - cantidadSugeridaVisual)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: colors.muted }}>Sin definir</span>
                          )}
                        </td>

                        <td style={{ ...tdStyle, fontWeight: 700 }}>{r.ubicacion || ""}</td>

                        <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: "normal", minWidth: 170 }}>
                          {usandoAlternativa ? (
                            <div style={{ color: colors.bad, fontWeight: 900 }}>
                              {alternativa?.ubicacion || "Pendiente definir"}
                            </div>
                          ) : (
                            <span style={{ color: colors.muted }}>{esManual ? "Base manual" : "Sugerida"}</span>
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
                                onClick={() => limpiarIncumplimiento(r.id, cantidadSugeridaVisual)}
                                style={dangerOutlineButtonStyle}
                              >
                                <X size={15} />
                                Quitar incumplimiento
                              </button>
                            )}
                          </div>
                        </td>

                        <td style={{ ...tdStyle, minWidth: 130 }}>
                          {esManual ? (
                            <button
                              type="button"
                              onClick={() => eliminarSkuManual(r.id)}
                              style={dangerOutlineButtonStyle}
                            >
                              <Trash2 size={15} />
                              Eliminar
                            </button>
                          ) : (
                            <span style={{ color: colors.muted }}>—</span>
                          )}
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
                <SummaryBox
                  label="Cantidad requerida"
                  value={formatQty(
                    modalRow?.manual
                      ? calcularNecesidadPendientePorSku(modalRow.sku, modalRow.id) +
                          Number(cantidades[modalRow.id] ?? 0)
                      : modalRow.cantidad_requerida
                  )}
                  tone="amber"
                />
                <SummaryBox
                  label="Cantidad sugerida"
                  value={formatQty(
                    modalRow?.manual
                      ? Math.min(
                          calcularNecesidadPendientePorSku(modalRow.sku, modalRow.id),
                          Number(
                            maximosManuales[modalRow.id] ??
                              modalRow.cantidad_disponible ??
                              modalRow.cantidad_sugerida ??
                              0
                          )
                        )
                      : modalRow.cantidad_sugerida
                  )}
                  tone="blue"
                />
                <SummaryBox
                  label="Cantidad a tomar"
                  value={formatQty(cantidades[modalRow.id] ?? 0)}
                  tone={
                    Number(cantidades[modalRow.id] ?? 0) >
                    Number(modalRow.cantidad_sugerida ?? 0)
                      ? "red"
                      : "green"
                  }
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
                <select
                  value={currentModalMotivo}
                  onChange={(e) =>
                    setMotivosRotacion((prev) => ({
                      ...prev,
                      [modalRow.id]: e.target.value,
                    }))
                  }
                  style={selectStyle}
                >
                  <option value="">Selecciona un motivo</option>
                  {MOTIVOS_ROTACION.map((motivo) => (
                    <option key={motivo} value={motivo}>
                      {motivo}
                    </option>
                  ))}
                </select>
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

                  {!String(modalRow.id).startsWith("manual-") && (
                    <button
                      type="button"
                      onClick={() => loadAlternativas(modalRow)}
                      style={secondaryButtonStyle}
                      disabled={!!cargandoAlternativas[modalRow.id]}
                    >
                      <GitCompareArrows size={14} />
                      {cargandoAlternativas[modalRow.id] ? "Consultando..." : "Actualizar alternativas"}
                    </button>
                  )}
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
                  {String(modalRow.id).startsWith("manual-") ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: `1px solid ${colors.infoBd}`,
                        background: colors.infoBg,
                        color: colors.text,
                        fontWeight: 800,
                      }}
                    >
                      Este SKU manual ya tiene una ubicación base seleccionada desde la búsqueda.
                      Si necesitas otra ubicación, agrega otro SKU manual buscándolo nuevamente.
                    </div>
                  ) : !currentModalAlternativas.length ? (
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
                    onClick={() =>
                      limpiarIncumplimiento(
                        modalRow.id,
                        modalRow?.manual
                          ? Math.min(
                              calcularNecesidadPendientePorSku(modalRow.sku, modalRow.id),
                              Number(
                                maximosManuales[modalRow.id] ??
                                  modalRow.cantidad_disponible ??
                                  modalRow.cantidad_sugerida ??
                                  0
                              )
                            )
                          : modalRow.cantidad_sugerida
                      )
                    }
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

      {busquedaManualOpen && (
        <div
          onClick={cerrarBuscadorManual}
          style={{
            position: "fixed",
            inset: 0,
            background: colors.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 9998,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, 96vw)",
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
                    color: colors.blue,
                    fontWeight: 900,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    marginBottom: 8,
                  }}
                >
                  <Search size={16} />
                  Agregar SKU manual
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, color: colors.navy }}>
                  Buscar material disponible
                </div>

                <div style={{ marginTop: 6, color: colors.muted, fontSize: 13 }}>
                  Escribe el código o parte del texto breve. Elige una sugerencia y solo ajusta la cantidad.
                </div>
              </div>

              <button
                onClick={cerrarBuscadorManual}
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
              <div>
                <div style={labelStyle}>Buscar SKU o texto</div>
                <div style={{ position: "relative" }}>
                  <Search
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
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    placeholder="Ej: 2147 o tapa pvf"
                    style={{ ...inputStyle, paddingLeft: 34 }}
                    autoFocus
                  />
                </div>

                <div style={{ marginTop: 8, fontSize: 12, color: colors.muted, fontWeight: 700 }}>
                  Mínimo 2 caracteres para buscar.
                </div>
              </div>

              {skuSearchLoading && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: colors.warnBg,
                    border: `1px solid ${colors.warnBd}`,
                    color: colors.warn,
                    fontWeight: 800,
                  }}
                >
                  Consultando materiales disponibles...
                </div>
              )}

              {!!skuSearchError && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: colors.badBg,
                    border: `1px solid ${colors.badBd}`,
                    color: colors.bad,
                    fontWeight: 800,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {skuSearchError}
                </div>
              )}

              {!skuSearchLoading && skuSearch.trim().length >= 2 && !skuSearchResults.length && !skuSearchError && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: colors.soft,
                    border: `1px solid ${colors.border}`,
                    color: colors.muted,
                    fontWeight: 800,
                  }}
                >
                  No se encontraron sugerencias con stock disponible.
                </div>
              )}

              {!!skuSearchResults.length && (
                <div style={{ display: "grid", gap: 10 }}>
                  {skuSearchResults.map((item, i) => {
                    const necesidadPendiente = calcularNecesidadPendientePorSku(item?.sku);
                    const disponible = Number(item?.cantidad_disponible ?? 0);
                    const sugerida = Math.min(necesidadPendiente, disponible);

                    return (
                      <button
                        key={`${item.sku}-${item.ubicacion}-${item.lote_almacen}-${i}`}
                        type="button"
                        onClick={() => agregarSkuManualDesdeSugerencia(item)}
                        style={{
                          textAlign: "left",
                          padding: 14,
                          borderRadius: 12,
                          cursor: "pointer",
                          border: `1px solid ${colors.border}`,
                          background: "#fff",
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
                          <div>
                            <div style={{ fontWeight: 900, color: colors.navy }}>
                              {item.sku || ""}
                            </div>
                            <div style={{ marginTop: 4, color: colors.text, fontWeight: 700 }}>
                              {item.texto_breve || ""}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gap: 4,
                              textAlign: "right",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 900,
                                color: colors.good,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Disp: {formatQty(disponible)}
                            </div>
                            <div
                              style={{
                                fontWeight: 900,
                                color: colors.blue,
                                whiteSpace: "nowrap",
                                fontSize: 12,
                              }}
                            >
                              Nec.: {formatQty(necesidadPendiente)}
                            </div>
                            <div
                              style={{
                                fontWeight: 900,
                                color: colors.warn,
                                whiteSpace: "nowrap",
                                fontSize: 12,
                              }}
                            >
                              Sug.: {formatQty(sugerida)}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
                            gap: 8,
                            fontSize: 12,
                            color: colors.muted,
                            lineHeight: 1.45,
                          }}
                        >
                          <div><b>Ubicación:</b> {item.ubicacion || ""}</div>
                          <div><b>Lote almacén:</b> {item.lote_almacen || ""}</div>
                          <div><b>Lote proveedor:</b> {item.lote_proveedor || ""}</div>
                          <div><b>Fecha vencimiento:</b> {fmtDate(item.fecha_vencimiento)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={cerrarBuscadorManual} style={secondaryButtonStyle}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="print-area">
        <div className="print-inner">
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
            <div className="print-section-title" style={sectionHeaderStyle}>
              Resumen de la reserva
            </div>

            <div className="print-table-wrap">
              <table className="print-table">
                <thead>
                  <tr>
                    <th className="print-nowrap">Fecha necesidad</th>
                    <th className="print-nowrap">Reserva</th>
                    <th className="print-nowrap">SKU</th>
                    <th className="print-wrap">Texto breve</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad requerida</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad retirada</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Diferencia</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>% SKU</th>
                    <th className="print-nowrap">Clasificación</th>
                  </tr>
                </thead>
                <tbody>
                  {detallesReserva.map((r) => (
                    <tr key={r.id}>
                      <td className="print-nowrap">{fmtDate(r.fecha_necesidad)}</td>
                      <td className="print-nowrap">{r.reserva}</td>
                      <td className="print-nowrap">{r.sku}</td>
                      <td className="print-wrap">{r.texto_breve || ""}</td>
                      <td className="print-nowrap" style={{ textAlign: "right" }}>{formatQty(r.cantidad)}</td>
                      <td className="print-nowrap" style={{ textAlign: "right" }}>{formatQty(r.cantidad_retirada)}</td>
                      <td className="print-nowrap" style={{ textAlign: "right" }}>{formatQty(r.diferencia)}</td>
                      <td className="print-nowrap" style={{ textAlign: "right" }}>{formatQty(r.pct_cumplimiento_sku)}</td>
                      <td className="print-nowrap">{r.clasificacion_sku || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="print-card" style={shellCardStyle}>
            <div className="print-section-title" style={sectionHeaderStyle}>
              Materiales confirmados
            </div>

            <div className="print-table-wrap">
              <table className="print-table">
                <thead>
                  <tr>
                    <th className="print-nowrap">Reserva</th>
                    <th className="print-nowrap">SKU</th>
                    <th className="print-wrap">Texto breve</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad requerida</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad sugerida</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad confirmada</th>
                    <th className="print-nowrap">Evidencia</th>
                    <th className="print-nowrap">Ubicación tomada</th>
                    <th className="print-nowrap">Lote almacén</th>
                    <th className="print-nowrap">Lote proveedor</th>
                    <th className="print-nowrap">Fecha vencimiento</th>
                    <th className="print-nowrap">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsConfirmados.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: 18 }}>
                        Aún no hay materiales confirmados.
                      </td>
                    </tr>
                  ) : (
                    rowsConfirmados.map((r) => {
                      const estadoEntrega = getEstadoEntrega(
                        Number(r.cantidad_confirmada ?? 0),
                        Number(r.cantidad_sugerida ?? 0)
                      );

                      return (
                        <tr key={r.id}>
                          <td className="print-nowrap">{r.reserva || ""}</td>
                          <td className="print-nowrap">{r.sku || ""}</td>
                          <td className="print-wrap">{r.texto_breve || ""}</td>
                          <td className="print-nowrap" style={{ textAlign: "right" }}>{formatQty(r.cantidad_requerida)}</td>
                          <td className="print-nowrap" style={{ textAlign: "right" }}>{formatQty(r.cantidad_sugerida ?? 0)}</td>
                          <td className="print-nowrap" style={{ textAlign: "right" }}>{formatQty(r.cantidad_confirmada || 0)}</td>
                          <td className="print-nowrap">{estadoEntrega.label}</td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.ubicacion}
                              tomado={r.ubicacion_alternativa || r.ubicacion}
                            />
                          </td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.lote_almacen}
                              tomado={r.lote_almacen_alternativo || r.lote_almacen}
                            />
                          </td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.lote_proveedor}
                              tomado={r.lote_proveedor_alternativo || r.lote_proveedor}
                            />
                          </td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.fecha_vencimiento}
                              tomado={r.fecha_vencimiento_alternativa || r.fecha_vencimiento}
                              format={(v) => fmtDate(v)}
                            />
                          </td>
                          <td className="print-nowrap">CONFIRMADO</td>
                        </tr>
                      );
                    })
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
            <div className="print-section-title" style={sectionHeaderStyle}>
              {modoImpresion === "final" ? "Pendiente restante" : "Orden de picking pendiente"}
            </div>

            <div className="print-table-wrap">
              <table className="print-table">
                <thead>
                  <tr>
                    <th className="print-nowrap">Reserva</th>
                    <th className="print-nowrap">SKU</th>
                    <th className="print-wrap">Texto breve</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad requerida</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad sugerida</th>
                    <th className="print-nowrap" style={{ textAlign: "right" }}>Cantidad tomada</th>
                    <th className="print-nowrap">Ubicación sugerida</th>
                    <th className="print-nowrap">Ubicación tomada</th>
                    <th className="print-nowrap">Lote almacén</th>
                    <th className="print-nowrap">Lote proveedor</th>
                    <th className="print-nowrap">Fecha vencimiento</th>
                    <th className="print-wrap">Observación rotación</th>
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

                      const cantidadSugeridaPrint = r.manual
                        ? Math.min(
                            calcularNecesidadPendientePorSku(r.sku, r.id) + Number(r.cantidad_impresion ?? 0),
                            Number(
                              maximosManuales[r.id] ??
                                r.cantidad_disponible ??
                                r.cantidad_sugerida ??
                                0
                            )
                          )
                        : Number(r.cantidad_sugerida ?? 0);

                      const cantidadRequeridaPrint = r.manual
                        ? calcularNecesidadPendientePorSku(r.sku, r.id) + Number(r.cantidad_impresion ?? 0)
                        : Number(r.cantidad_requerida ?? 0);

                      return (
                        <tr key={r.id}>
                          <td className="print-nowrap">{r.reserva || ""}</td>
                          <td className="print-nowrap">{r.sku || ""}</td>
                          <td className="print-wrap">{r.texto_breve || ""}</td>
                          <td className="print-nowrap" style={{ textAlign: "right" }}>
                            {formatQty(cantidadRequeridaPrint)}
                          </td>
                          <td className="print-nowrap" style={{ textAlign: "right" }}>
                            {formatQty(cantidadSugeridaPrint)}
                          </td>
                          <td className="print-nowrap" style={{ textAlign: "right" }}>
                            {formatQty(r.cantidad_impresion ?? 0)}
                          </td>
                          <td className="print-nowrap">{r.ubicacion || ""}</td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.ubicacion || ""}
                              tomado={usaAlternativa ? alt?.ubicacion || "" : r.ubicacion || ""}
                            />
                          </td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.lote_almacen || ""}
                              tomado={usaAlternativa ? alt?.lote_almacen || "" : r.lote_almacen || ""}
                            />
                          </td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.lote_proveedor || ""}
                              tomado={usaAlternativa ? alt?.lote_proveedor || "" : r.lote_proveedor || ""}
                            />
                          </td>
                          <td className="print-nowrap">
                            <PrintCompareValue
                              sugerido={r.fecha_vencimiento}
                              tomado={usaAlternativa ? alt?.fecha_vencimiento : r.fecha_vencimiento}
                              format={(v) => fmtDate(v)}
                            />
                          </td>
                          <td
                            className="print-wrap"
                            style={{
                              color: r.motivo_rotacion_impresion ? colors.bad : "#0f172a",
                              fontWeight: 800,
                            }}
                          >
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
    </div>
  );
}