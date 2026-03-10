import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://127.0.0.1:8000";

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

function toneByClasificacion(v) {
  const x = String(v || "").toUpperCase();
  if (x === "CUMPLIDA") return "green";
  if (x === "PARCIAL") return "amber";
  return "red";
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

  const loadDespachos = async (reservaBuscar = "") => {
    setLoading(true);
    setErr("");

    try {
      const params = new URLSearchParams();
      if (reservaBuscar.trim()) params.set("reserva", reservaBuscar.trim());

      const res = await fetch(`${API}/despachos?${params.toString()}`);
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
        `${API}/despachos/picking/${encodeURIComponent(reservaBuscar.trim())}`
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

      const res = await fetch(`${API}/despachos/importar`, {
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
      setPickingRows([]);
      setFile(null);
    } catch (e) {
      alert("❌ Error importando despacho:\n" + (e?.message || e));
    } finally {
      setSubiendo(false);
    }
  };

  const onBuscar = async () => {
    await loadDespachos(reserva);
    await loadPicking(reserva);
  };

  const onLimpiar = async () => {
    setReserva("");
    setPickingRows([]);
    await loadDespachos("");
  };

  const onGenerarPicking = async () => {
    if (!reserva.trim()) {
      alert("Escribe una reserva para generar el picking.");
      return;
    }

    try {
      const res = await fetch(
        `${API}/despachos/generar-picking/${encodeURIComponent(reserva.trim())}`,
        {
          method: "POST",
        }
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

      await loadDespachos(reserva);
      await loadPicking(reserva);

      navigate(`/movimientos/orden-picking/${encodeURIComponent(reserva.trim())}`);
    } catch (e) {
      alert("❌ Error generando picking:\n" + (e?.message || e));
    }
  };

  const resumen = useMemo(() => {
    const totalReservas = new Set(rows.map((x) => x.reserva)).size;
    const totalSkus = rows.length;
    const totalRequerido = rows.reduce((a, b) => a + Number(b.cantidad || 0), 0);
    const totalRetirado = rows.reduce((a, b) => a + Number(b.cantidad_retirada || 0), 0);

    return {
      totalReservas,
      totalSkus,
      totalRequerido,
      totalRetirado,
    };
  }, [rows]);

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
            Planeación y orden de picking
          </h1>
          <div style={{ marginTop: 6, color: colors.muted }}>
            Importa el Excel, consulta por reserva y genera el picking por <b>FEFO</b>.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`Reservas: ${resumen.totalReservas}`} tone="blue" />
          <Chip label={`SKUs: ${resumen.totalSkus}`} tone="blue" />
          <Chip label={`Req: ${formatQty(resumen.totalRequerido)}`} tone="amber" />
          <Chip label={`Ret: ${formatQty(resumen.totalRetirado)}`} tone="green" />
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
            gridTemplateColumns: "2fr auto auto auto",
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
            onClick={onGenerarPicking}
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
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay registros cargados.
                  </td>
                </tr>
              )}

              {rows.map((r) => (
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
            : reserva
            ? `Reserva consultada: ${reserva}`
            : "Escribe una reserva y genera el picking."}
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
                    {formatQty(r.cantidad_a_retirar)}
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