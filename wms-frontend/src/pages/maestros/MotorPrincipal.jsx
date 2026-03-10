import { useEffect, useMemo, useState } from "react";

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

// ✅ Formato con punto de mil (es-CO)
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
    "zona",
    "familias",
    "bodega",
    "lote_almacen",
    "lote_proveedor",
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
      headers
        .map((h) => {
          const v = r[h];
          return esc(v);
        })
        .join(",")
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

export default function MotorPrincipal() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filtros
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("TODOS"); // ENTRADA | SALIDA | TODOS
  const [estado, setEstado] = useState("TODOS"); // ALMACENADO | EN_TRANSITO | TODOS
  const [bodega, setBodega] = useState("TODAS");
  const [zona, setZona] = useState("TODAS");

  // cargar motor
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr("");

    fetch("http://127.0.0.1:8000/motor?limit=2000")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(String(e?.message || e));
        setRows([]);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

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
      if (tipo !== "TODOS" && String(r.tipo || "").toUpperCase() !== tipo) return false;
      if (estado !== "TODOS" && String(r.estado || "").toUpperCase() !== estado) return false;
      if (bodega !== "TODAS" && (r.bodega ?? "") !== bodega) return false;
      if (zona !== "TODAS" && (r.zona ?? "") !== zona) return false;

      if (!needle) return true;

      // búsqueda en campos clave
      const hay = [
        r.usuario,
        r.documento,
        r.codigo_material,
        r.descripcion_material,
        r.familia,
        r.ubicacion,
        r.estado,
        r.zona,
        r.bodega,
        r.lote_almacen,
        r.lote_proveedor,
        r.tipo,
      ]
        .map((x) => (x ?? "").toString().toLowerCase())
        .join(" | ");

      return hay.includes(needle);
    });
  }, [rows, q, tipo, estado, bodega, zona]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const entradas = filtered.filter((r) => (r.cantidad ?? 0) >= 0).length;
    const salidas = total - entradas;

    const sumEntradas = filtered.reduce((acc, r) => acc + ((r.cantidad ?? 0) >= 0 ? Number(r.cantidad || 0) : 0), 0);
    const sumSalidasAbs = filtered.reduce((acc, r) => acc + ((r.cantidad ?? 0) < 0 ? Math.abs(Number(r.cantidad || 0)) : 0), 0);
    const enTransito = filtered.filter((r) => String(r.estado || "").toUpperCase() === "EN_TRANSITO").length;

    return { total, entradas, salidas, sumEntradas, sumSalidasAbs, enTransito };
  }, [filtered]);

  const onExport = () => {
    const csv = toCSV(filtered);
    const stamp = new Date();
    const yyyy = stamp.getFullYear();
    const mm = String(stamp.getMonth() + 1).padStart(2, "0");
    const dd = String(stamp.getDate()).padStart(2, "0");
    downloadText(`motor_principal_${yyyy}-${mm}-${dd}.csv`, csv);
  };

  const resetFilters = () => {
    setQ("");
    setTipo("TODOS");
    setEstado("TODOS");
    setBodega("TODAS");
    setZona("TODAS");
  };

  return (
    <div>
      {/* Header */}
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
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>
            🧠 MOTOR PRINCIPAL
          </div>
          <h1 style={{ margin: "6px 0 0", color: colors.navy }}>
            Entradas & Salidas (Base única)
          </h1>
          <div style={{ marginTop: 6, color: colors.muted }}>
            Aquí cae todo lo del Recibo (ENTRADA), Despacho (SALIDA) y también lo que está EN TRANSITO.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`Registros: ${stats.total}`} tone="blue" />
          <Chip label={`Entradas: ${stats.entradas}`} tone="green" />
          <Chip label={`Salidas: ${stats.salidas}`} tone="red" />
          <Chip label={`En tránsito: ${stats.enTransito}`} tone="amber" />

          <button
            onClick={onExport}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
            title="Exportar lo filtrado a CSV"
          >
            ⬇️ Exportar CSV
          </button>
        </div>
      </div>

      {/* filtros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <span style={{ fontWeight: 900, color: colors.muted }}>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por material, ubicación, usuario, documento, lote, bodega..."
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: colors.text,
              background: "transparent",
              fontWeight: 700,
            }}
          />
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 10,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
            TIPO
          </div>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              fontWeight: 800,
              background: "#fff",
            }}
          >
            <option value="TODOS">TODOS</option>
            <option value="ENTRADA">ENTRADA</option>
            <option value="SALIDA">SALIDA</option>
          </select>
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 10,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
            ESTADO
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              fontWeight: 800,
              background: "#fff",
            }}
          >
            <option value="TODOS">TODOS</option>
            <option value="ALMACENADO">ALMACENADO</option>
            <option value="EN_TRANSITO">EN TRANSITO</option>
          </select>
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 10,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
            BODEGA
          </div>
          <select
            value={bodega}
            onChange={(e) => setBodega(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              fontWeight: 800,
              background: "#fff",
            }}
          >
            {bodegas.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 10,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
            ZONA
          </div>
          <select
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              fontWeight: 800,
              background: "#fff",
            }}
          >
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={resetFilters}
          style={{
            height: 52,
            padding: "0 14px",
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
          title="Limpiar filtros"
        >
          🧼 Limpiar
        </button>
      </div>

      {/* resumen cuantitativo */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>TOTAL ENTRADAS (SUMA)</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000, color: colors.good }}>
            {fmtNumberCO(stats.sumEntradas || 0)}
          </div>
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>TOTAL SALIDAS (ABS)</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000, color: colors.bad }}>
            {fmtNumberCO(stats.sumSalidasAbs || 0)}
          </div>
        </div>

        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>BALANCE (ENT - SAL)</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000, color: colors.blue }}>
            {fmtNumberCO((stats.sumEntradas || 0) - (stats.sumSalidasAbs || 0))}
          </div>
        </div>
      </div>

      {/* tabla */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 1000, color: colors.navy }}>Listado de movimientos</div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              {loading ? "Cargando…" : err ? "Error" : `Mostrando ${filtered.length} de ${rows.length}`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {loading && <Chip label="Cargando…" tone="amber" />}
            {err && <Chip label="Fallo cargando API" tone="red" />}
            {!loading && !err && <Chip label="OK" tone="green" />}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  borderBottom: `1px solid ${colors.border}`,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Fecha</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Tipo</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Estado</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Usuario</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Documento</th>

                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Material</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Descripción</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>UM</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Familia</th>

                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Ubicación</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Zona</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Bodega</th>

                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Lote almacén</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Lote prov.</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Venc.</th>

                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000, textAlign: "right" }}>
                  Cantidad
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td colSpan={16} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay registros con esos filtros.
                  </td>
                </tr>
              )}

              {filtered.map((r) => {
                const qty = Number(r.cantidad || 0);
                const isIn = qty >= 0;
                const estadoUp = String(r.estado || "").toUpperCase();
                const ubicTexto = (r.ubicacion ?? "").toString().trim();

                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12, fontWeight: 800, color: colors.text }}>{fmtDateTime(r.fecha)}</td>

                    <td style={{ padding: 12 }}>
                      {String(r.tipo || "").toUpperCase() === "ENTRADA" ? (
                        <Chip label="ENTRADA" tone="green" />
                      ) : (
                        <Chip label="SALIDA" tone="red" />
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      {estadoUp === "EN_TRANSITO" ? (
                        <Chip label="EN TRANSITO" tone="amber" />
                      ) : (
                        <Chip label="ALMACENADO" tone="blue" />
                      )}
                    </td>

                    <td style={{ padding: 12, fontWeight: 800, color: colors.text }}>{r.usuario || ""}</td>
                    <td style={{ padding: 12, fontWeight: 800, color: colors.text }}>{r.documento || ""}</td>

                    <td style={{ padding: 12, fontWeight: 1000, color: colors.navy }}>{r.codigo_material || ""}</td>
                    <td style={{ padding: 12, color: colors.text, fontWeight: 700 }}>{r.descripcion_material || ""}</td>
                    <td style={{ padding: 12, color: colors.text, fontWeight: 800 }}>{r.unidad_medida || ""}</td>
                    <td style={{ padding: 12, color: colors.text, fontWeight: 700 }}>{r.familia || ""}</td>

                    <td
                      style={{
                        padding: 12,
                        fontWeight: 1000,
                        color: estadoUp === "EN_TRANSITO" ? colors.warn : colors.blue,
                      }}
                    >
                      {ubicTexto || "EN TRANSITO"}
                    </td>
                    <td style={{ padding: 12, color: colors.text, fontWeight: 700 }}>{r.zona || ""}</td>
                    <td style={{ padding: 12, color: colors.text, fontWeight: 700 }}>{r.bodega || ""}</td>

                    <td style={{ padding: 12, color: colors.text, fontWeight: 700 }}>{r.lote_almacen || ""}</td>
                    <td style={{ padding: 12, color: colors.text, fontWeight: 700 }}>{r.lote_proveedor || ""}</td>
                    <td style={{ padding: 12, color: colors.text, fontWeight: 700 }}>{r.fecha_vencimiento || ""}</td>

                    <td
                      style={{
                        padding: 12,
                        fontWeight: 1000,
                        textAlign: "right",
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
        </div>

        {err && (
          <div style={{ padding: 14, color: colors.bad, fontWeight: 900 }}>
            Error API: {err}
            <div style={{ marginTop: 6, color: colors.muted, fontWeight: 800, fontSize: 12 }}>
              Revisa que el backend esté corriendo en <b>http://127.0.0.1:8000</b> y que exista <b>GET /motor</b>.
            </div>
          </div>
        )}
      </div>

      {/* footer tip */}
      <div style={{ marginTop: 12, color: colors.muted, fontSize: 12, fontWeight: 800 }}>
        Tip: Recibo guarda como <b>+</b> y Despacho como <b>-</b>. Además, si no tiene ubicación queda como <b>EN TRANSITO</b>.
      </div>
    </div>
  );
}