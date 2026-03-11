import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

      safePick.forEach((r) => {
        const sugerida = Number(r.cantidad_sugerida ?? 0);
        const confirmada = Number(r.cantidad_confirmada ?? 0);
        const estaConfirmado = !!r.confirmado || confirmada > 0;

        initCant[r.id] = estaConfirmado ? 0 : sugerida;
        initSel[r.id] = !estaConfirmado && sugerida > 0;
        initImp[r.id] = !!r.impreso;
      });

      setCantidades(initCant);
      setSeleccionados(initSel);
      setImpresos(initImp);
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
        const sugerida = Number(row?.cantidad_sugerida ?? 0);
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

    return {
      totalPendientes,
      totalRequerido,
      totalRetirado,
      totalPendiente,
      totalComprometer,
    };
  }, [rowsPendientes, detallesReserva, lineasSeleccionadas, cantidades]);

  const imprimir = async () => {
    if (!lineasSeleccionadas.length) {
      alert("Selecciona al menos una línea pendiente con cantidad mayor que 0 para imprimir.");
      return;
    }

    const ids = {};
    lineasSeleccionadas.forEach((r) => {
      ids[r.id] = true;
    });
    setImpresos((prev) => ({ ...prev, ...ids }));

    setTimeout(() => {
      window.print();
    }, 200);
  };

  const guardarDespacho = async () => {
    if (!rowsPendientes.length) {
      alert("No hay líneas pendientes para guardar.");
      return;
    }

    const lineasGuardar = lineasSeleccionadas.map((r) => ({
      ...r,
      cantidad_confirmada: Number(cantidades[r.id] ?? 0),
    }));

    if (!lineasGuardar.length) {
      alert("Debes seleccionar al menos una línea pendiente con cantidad mayor que 0.");
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

  const lineasParaImprimir = lineasSeleccionadas;

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
            border-bottom: 1px solid #072B5A !important;
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
            color: #072B5A !important;
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
        }
      `}</style>

      <div className="screen-only-root">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>🧾 ORDEN PICKING</div>
            <h1 style={{ margin: "6px 0 0", color: colors.navy }}>
              Reserva {reserva || ""}
            </h1>
            <div style={{ marginTop: 6, color: colors.muted }}>
              Lo confirmado queda aparte y abajo solo ves lo pendiente según la necesidad.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Chip label={`Pendientes: ${resumen.totalPendientes}`} tone="blue" />
            <Chip label={`Req: ${formatQty(resumen.totalRequerido)}`} tone="amber" />
            <Chip label={`Retirado: ${formatQty(resumen.totalRetirado)}`} tone="green" />
            <Chip label={`Pendiente: ${formatQty(resumen.totalPendiente)}`} tone="red" />
            <Chip label={`Comprometer: ${formatQty(resumen.totalComprometer)}`} tone="green" />
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: 10, alignItems: "end" }}>
            <div>
              <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, marginBottom: 6 }}>
                USUARIO
              </div>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
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
                DOCUMENTO
              </div>
              <input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Opcional"
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

            <button
              onClick={() => navigate("/movimientos/despacho")}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.card,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              🔙 Regresar
            </button>

            <button
              onClick={imprimir}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.card,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              🖨️ Imprimir seleccionados
            </button>

            <button
              onClick={guardarDespacho}
              disabled={guardando}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: `1px solid rgba(22,163,74,.25)`,
                background: "rgba(22,163,74,.10)",
                color: colors.good,
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              {guardando ? "⏳ Guardando..." : "💾 Guardar despacho"}
            </button>
          </div>
        </div>

        {err && (
          <div style={{ padding: 14, color: colors.bad, fontWeight: 900 }}>
            Error API: {err}
          </div>
        )}

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
            Resumen de la reserva
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1500 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: 12 }}>Fecha necesidad</th>
                  <th style={{ padding: 12 }}>Reserva</th>
                  <th style={{ padding: 12 }}>SKU</th>
                  <th style={{ padding: 12 }}>Texto breve</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cantidad retirada</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Diferencia</th>
                  <th style={{ padding: 12, textAlign: "right" }}>% SKU</th>
                  <th style={{ padding: 12 }}>Clasificación</th>
                </tr>
              </thead>
              <tbody>
                {detallesReserva.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_necesidad)}</td>
                    <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>{r.reserva}</td>
                    <td style={{ padding: 12, fontWeight: 900 }}>{r.sku}</td>
                    <td style={{ padding: 12, fontWeight: 700 }}>{r.texto_breve || ""}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.cantidad)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.cantidad_retirada)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.diferencia)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.pct_cumplimiento_sku)}</td>
                    <td style={{ padding: 12, fontWeight: 900 }}>{r.clasificacion_sku || ""}</td>
                  </tr>
                ))}
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
            Materiales confirmados
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1800 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: 12 }}>Reserva</th>
                  <th style={{ padding: 12 }}>SKU</th>
                  <th style={{ padding: 12 }}>Texto breve</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cantidad confirmada</th>
                  <th style={{ padding: 12 }}>Ubicación</th>
                  <th style={{ padding: 12 }}>Lote almacén</th>
                  <th style={{ padding: 12 }}>Lote proveedor</th>
                  <th style={{ padding: 12 }}>Fecha vencimiento</th>
                  <th style={{ padding: 12 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rowsConfirmados.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                      Aún no hay materiales confirmados.
                    </td>
                  </tr>
                ) : (
                  rowsConfirmados.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>{r.reserva || ""}</td>
                      <td style={{ padding: 12, fontWeight: 900 }}>{r.sku || ""}</td>
                      <td style={{ padding: 12, fontWeight: 700 }}>{r.texto_breve || ""}</td>
                      <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.cantidad_requerida)}</td>
                      <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.cantidad_confirmada || 0)}</td>
                      <td style={{ padding: 12, fontWeight: 800 }}>{r.ubicacion || ""}</td>
                      <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_almacen || ""}</td>
                      <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_proveedor || ""}</td>
                      <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_vencimiento)}</td>
                      <td style={{ padding: 12, fontWeight: 900 }}>CONFIRMADO</td>
                    </tr>
                  ))
                )}
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
            Orden de picking pendiente
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2200 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th style={{ padding: 12 }}>Comprometer</th>
                  <th style={{ padding: 12 }}>Reserva</th>
                  <th style={{ padding: 12 }}>SKU</th>
                  <th style={{ padding: 12 }}>Texto breve</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cantidad sugerida</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Cantidad a comprometer</th>
                  <th style={{ padding: 12 }}>Ubicación</th>
                  <th style={{ padding: 12 }}>Lote almacén</th>
                  <th style={{ padding: 12 }}>Lote proveedor</th>
                  <th style={{ padding: 12 }}>Fecha vencimiento</th>
                  <th style={{ padding: 12 }}>Impreso</th>
                </tr>
              </thead>
              <tbody>
                {rowsPendientes.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 18, color: colors.good, fontWeight: 900 }}>
                      ✅ No hay líneas pendientes.
                    </td>
                  </tr>
                ) : (
                  rowsPendientes.map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: 12, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!seleccionados[r.id]}
                          onChange={() => onToggleSeleccion(r.id)}
                        />
                      </td>
                      <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>{r.reserva || ""}</td>
                      <td style={{ padding: 12, fontWeight: 900 }}>{r.sku || ""}</td>
                      <td style={{ padding: 12, fontWeight: 700 }}>{r.texto_breve || ""}</td>
                      <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.cantidad_requerida)}</td>
                      <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(r.cantidad_sugerida ?? 0)}</td>
                      <td style={{ padding: 12, textAlign: "right" }}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cantidades[r.id] ?? 0}
                          onChange={(e) => onChangeCantidad(r.id, e.target.value, r.cantidad_sugerida ?? 0)}
                          disabled={!seleccionados[r.id]}
                          style={{
                            width: 120,
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: `1px solid ${colors.border}`,
                            textAlign: "right",
                            fontWeight: 900,
                            background: !seleccionados[r.id] ? "#F8FAFC" : "#fff",
                          }}
                        />
                      </td>
                      <td style={{ padding: 12, fontWeight: 800 }}>{r.ubicacion || ""}</td>
                      <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_almacen || ""}</td>
                      <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_proveedor || ""}</td>
                      <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_vencimiento)}</td>
                      <td style={{ padding: 12 }}>
                        <Chip label={impresos[r.id] ? "Sí" : "No"} tone={impresos[r.id] ? "green" : "amber"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="print-area">
        <div className="print-header">
          <div className="print-header-left">
            <img
              src="/inova-logo.png"
              alt="INOVA"
              className="print-logo"
            />
            <div>
              <h1 className="print-title">ORDEN DE PICKING</h1>
              <div className="print-subtitle">WMS INOVA · Control logístico</div>
            </div>
          </div>

          <div className="print-meta">
            <div><b>Reserva:</b> {reserva || ""}</div>
            <div><b>Usuario:</b> {usuario || "DESPACHO"}</div>
            <div><b>Documento:</b> {documento || ""}</div>
            <div><b>Fecha impresión:</b> {fmtDate(new Date())}</div>
          </div>
        </div>

        <div
          className="print-card"
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
            Resumen de la reserva
          </div>

          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
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

        <div
          className="print-card"
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
            Materiales confirmados
          </div>

          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th>Reserva</th>
                  <th>SKU</th>
                  <th>Texto breve</th>
                  <th style={{ textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ textAlign: "right" }}>Cantidad confirmada</th>
                  <th>Ubicación</th>
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
                      <td>{r.ubicacion || ""}</td>
                      <td>{r.lote_almacen || ""}</td>
                      <td>{r.lote_proveedor || ""}</td>
                      <td>{fmtDate(r.fecha_vencimiento)}</td>
                      <td>CONFIRMADO</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="print-card"
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
            Orden de picking pendiente
          </div>

          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                  <th>Reserva</th>
                  <th>SKU</th>
                  <th>Texto breve</th>
                  <th style={{ textAlign: "right" }}>Cantidad requerida</th>
                  <th style={{ textAlign: "right" }}>Cantidad sugerida</th>
                  <th style={{ textAlign: "right" }}>Cantidad a comprometer</th>
                  <th>Ubicación</th>
                  <th>Lote almacén</th>
                  <th>Lote proveedor</th>
                  <th>Fecha vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {lineasParaImprimir.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 18 }}>
                      No hay líneas pendientes para imprimir.
                    </td>
                  </tr>
                ) : (
                  lineasParaImprimir.map((r) => (
                    <tr key={r.id}>
                      <td>{r.reserva || ""}</td>
                      <td>{r.sku || ""}</td>
                      <td>{r.texto_breve || ""}</td>
                      <td style={{ textAlign: "right" }}>{formatQty(r.cantidad_requerida)}</td>
                      <td style={{ textAlign: "right" }}>{formatQty(r.cantidad_sugerida ?? 0)}</td>
                      <td style={{ textAlign: "right" }}>{formatQty(cantidades[r.id] ?? 0)}</td>
                      <td>{r.ubicacion || ""}</td>
                      <td>{r.lote_almacen || ""}</td>
                      <td>{r.lote_proveedor || ""}</td>
                      <td>{fmtDate(r.fecha_vencimiento)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}