import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../api";

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

function fmtDate(v) {
  if (!v) return "";

  const s = String(v).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  const onlyDate = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) {
    return onlyDate;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function classifySerialInput(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return { kind: "none", value: "" };
  if (s.includes("-")) return { kind: "impresion", value: s };
  return { kind: "codigo_cita", value: s };
}

export default function Rotulos() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [serial, setSerial] = useState("");

  const load = () => {
    setLoading(true);
    setErr("");

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());

    const { kind, value } = classifySerialInput(serial);
    if (kind === "codigo_cita") params.set("codigo_cita", value);
    if (kind === "impresion") params.set("impresion", value);
    params.set("limit", "2000");

    fetch(`${API_URL}/rotulos?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        setErr(String(e?.message || e));
        setRows([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => ({ total: rows.length }), [rows]);

  const exportCSV = () => {
    const { kind, value } = classifySerialInput(serial);
    const url = `${API_URL}/rotulos/export`;

    if (kind === "none") return window.open(url, "_blank");
    if (kind === "codigo_cita") {
      return window.open(`${url}?codigo_cita=${encodeURIComponent(value)}`, "_blank");
    }
    return window.open(`${url}?impresion=${encodeURIComponent(value)}`, "_blank");
  };

  const imprimir = async (rotulo_id) => {
    try {
      const res = await fetch(`${API_URL}/rotulos/imprimir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotulo_id, copias: 1 }),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("✅ Enviado a impresión");
    } catch (e) {
      alert("❌ Error imprimiendo:\n" + (e?.message || e));
    }
  };

  const eliminarRotulo = async (r) => {
    const ok = window.confirm(
      `¿Seguro que deseas eliminar este rótulo?\n\nImpresión: ${r.impresion || ""}\nSerial: ${r.codigo_cita || ""}`
    );

    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/rotulos/${r.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(await res.text());

      alert("✅ Rótulo eliminado correctamente");
      load();
    } catch (e) {
      alert("❌ Error eliminando rótulo:\n" + (e?.message || e));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>🏷️ HISTORIAL DE RÓTULOS</div>
          <h1 style={{ margin: "6px 0 0", color: colors.navy }}>Rótulos por serial o impresión</h1>
          <div style={{ marginTop: 6, color: colors.muted }}>
            Escribe <b>13002</b> para ver todo el serial o <b>13002-01</b> para un rótulo exacto.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`Registros: ${stats.total}`} tone="blue" />
          {loading && <Chip label="Cargando…" tone="amber" />}
          {err && <Chip label="Error" tone="red" />}
          {!loading && !err && <Chip label="OK" tone="green" />}

          <button
            onClick={exportCSV}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
            title="Exportar CSV (para Bartender)"
          >
            ⬇️ Exportar CSV
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr auto auto",
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
            placeholder="Buscar por SKU, lote, documento, proveedor, remesa..."
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
            SERIAL / IMPRESIÓN
          </div>
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Ej: 13002 o 13002-01"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              fontWeight: 800,
              background: "#fff",
            }}
          />
        </div>

        <button
          onClick={load}
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
          title="Aplicar filtros"
        >
          🔄 Buscar
        </button>

        <button
          onClick={() => {
            setQ("");
            setSerial("");
            setTimeout(load, 0);
          }}
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

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2200 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Serial impresión</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Serial (cita)</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Fecha recepción</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Semana</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Proveedor</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Documento</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Remesa</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Orden compra</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000, textAlign: "right" }}>Cantidad</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>SKU</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Texto breve</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>UM</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>UMB</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>F. fabricación</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>F. vencimiento</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Lote proveedor</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Lote almacén</th>
                <th style={{ padding: 12, fontSize: 12, color: colors.muted, fontWeight: 1000 }}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td colSpan={18} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay rótulos con esos filtros.
                  </td>
                </tr>
              )}

              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 12, fontWeight: 900, color: colors.navy }}>{r.impresion || ""}</td>
                  <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>{r.codigo_cita || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_recepcion)}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.numero_semana || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.proveedor || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.documento || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.remesa || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.orden_compra || ""}</td>
                  <td style={{ padding: 12, fontWeight: 1000, textAlign: "right" }}>{formatQty(r.cantidad)}</td>
                  <td style={{ padding: 12, fontWeight: 900 }}>{r.sku || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.texto_breve || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.um || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{r.umb || ""}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_fabricacion)}</td>
                  <td style={{ padding: 12, fontWeight: 800 }}>{fmtDate(r.fecha_vencimiento)}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_proveedor || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_almacen || ""}</td>

                  <td style={{ padding: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={() => imprimir(r.id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: `1px solid ${colors.border}`,
                          background: "#fff",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        🖨️ Imprimir
                      </button>

                      <button
                        onClick={() => eliminarRotulo(r)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(220,38,38,.25)",
                          background: "rgba(220,38,38,.08)",
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
    </div>
  );
}