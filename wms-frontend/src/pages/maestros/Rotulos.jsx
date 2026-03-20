import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../api";
import {
  Tags,
  Search,
  Download,
  RefreshCw,
  FilterX,
  Trash2,
} from "lucide-react";

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
};

const DOWNLOAD_HINT_PATH = "C:\\Users\\JOSUE\\Documents\\INOVA_ALM\\wms\\rotulo_print.csv";

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

const dangerTinyButtonStyle = {
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

function fmtDate(v) {
  if (!v) return "";

  const s = String(v).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const onlyDate = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) return onlyDate;

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

function StatusChip({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#f1f5f9", bd: "#e2e8f0", tx: colors.text },
    blue: { bg: "#eaf3ff", bd: "#cfe0ff", tx: colors.blue },
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

function classifySerialInput(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return { kind: "none", value: "" };
  if (s.includes("-")) return { kind: "impresion", value: s };
  return { kind: "codigo_cita", value: s };
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
            <Tags size={18} color="#315a7d" />
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
              Historial de rótulos
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
  padding: "12px 14px",
  fontSize: 12,
  color: "#607080",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 700,
  whiteSpace: "nowrap",
  background: "#fbfcfd",
};

const tdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "nowrap",
  fontSize: 13,
};

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

  const mostrarAyudaDescarga = () => {
    alert(
      `El archivo se descargará como rotulo_print.csv.\n\nGuárdalo o reemplázalo en esta ruta:\n${DOWNLOAD_HINT_PATH}\n\nLuego abre BarTender y dale Imprimir.`
    );
  };

  const exportCSV = () => {
    const { kind, value } = classifySerialInput(serial);
    const url = `${API_URL}/rotulos/export`;

    if (kind === "none") {
      window.open(url, "_blank");
    } else if (kind === "codigo_cita") {
      window.open(`${url}?codigo_cita=${encodeURIComponent(value)}`, "_blank");
    } else {
      window.open(`${url}?impresion=${encodeURIComponent(value)}`, "_blank");
    }

    mostrarAyudaDescarga();
  };

  const exportarFila = (rotuloId) => {
    window.open(`${API_URL}/rotulos/export?rotulo_id=${rotuloId}`, "_blank");
    mostrarAyudaDescarga();
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

      alert("Rótulo eliminado correctamente");
      load();
    } catch (e) {
      alert("Error eliminando rótulo:\n" + (e?.message || e));
    }
  };

  return (
    <div style={pageStyle}>
      <ModuleHeader
        title="Rótulos por serial o impresión"
        subtitle='Consulta por serial de cita o por serial exacto de impresión, por ejemplo "13002" o "13002-01".'
        helper="Impresión y trazabilidad"
      />

      <div style={panelStyle}>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 2fr) minmax(220px, 1fr) auto auto auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabelStyle}>Buscar general</div>
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
                  placeholder="SKU, lote, documento, proveedor, remesa..."
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
              <div style={fieldLabelStyle}>Serial / impresión</div>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Ej: 13002 o 13002-01"
                style={inputStyle}
              />
            </div>

            <button onClick={load} style={secondaryButtonStyle} title="Aplicar filtros">
              <RefreshCw size={15} />
              Buscar
            </button>

            <button
              onClick={() => {
                setQ("");
                setSerial("");
                setTimeout(load, 0);
              }}
              style={secondaryButtonStyle}
              title="Limpiar filtros"
            >
              <FilterX size={15} />
              Limpiar
            </button>

            <button onClick={exportCSV} style={primaryButtonStyle} title="Exportar CSV para BarTender">
              <Download size={15} />
              Exportar CSV
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusChip label={`Registros: ${stats.total}`} tone="blue" />
            {loading && <StatusChip label="Cargando" tone="amber" />}
            {err && <StatusChip label="Error" tone="red" />}
            {!loading && !err && <StatusChip label="Operativo" tone="green" />}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Listado de rótulos</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2200 }}>
            <thead>
              <tr>
                <th style={thStyle}>Serial impresión</th>
                <th style={thStyle}>Serial cita</th>
                <th style={thStyle}>Fecha recepción</th>
                <th style={thStyle}>Semana</th>
                <th style={thStyle}>Proveedor</th>
                <th style={thStyle}>Documento</th>
                <th style={thStyle}>Remesa</th>
                <th style={thStyle}>Orden compra</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cantidad</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Texto breve</th>
                <th style={thStyle}>UM</th>
                <th style={thStyle}>UMB</th>
                <th style={thStyle}>F. fabricación</th>
                <th style={thStyle}>F. vencimiento</th>
                <th style={thStyle}>Lote proveedor</th>
                <th style={thStyle}>Lote almacén</th>
                <th style={thStyle}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td colSpan={18} style={tdStyle}>
                    No hay rótulos con esos filtros.
                  </td>
                </tr>
              )}

              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: colors.navy }}>
                    {r.impresion || ""}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: colors.blue }}>
                    {r.codigo_cita || ""}
                  </td>
                  <td style={tdStyle}>{fmtDate(r.fecha_recepcion)}</td>
                  <td style={tdStyle}>{r.numero_semana || ""}</td>
                  <td style={tdStyle}>{r.proveedor || ""}</td>
                  <td style={tdStyle}>{r.documento || ""}</td>
                  <td style={tdStyle}>{r.remesa || ""}</td>
                  <td style={tdStyle}>{r.orden_compra || ""}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                    {formatQty(r.cantidad)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{r.sku || ""}</td>
                  <td style={tdStyle}>{r.texto_breve || ""}</td>
                  <td style={tdStyle}>{r.um || ""}</td>
                  <td style={tdStyle}>{r.umb || ""}</td>
                  <td style={tdStyle}>{fmtDate(r.fecha_fabricacion)}</td>
                  <td style={tdStyle}>{fmtDate(r.fecha_vencimiento)}</td>
                  <td style={tdStyle}>{r.lote_proveedor || ""}</td>
                  <td style={tdStyle}>{r.lote_almacen || ""}</td>

                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={() => exportarFila(r.id)}
                        style={secondaryButtonStyle}
                        title="Exportar solo esta línea como rotulo_print.csv"
                      >
                        <Download size={14} />
                        Exportar
                      </button>

                      <button onClick={() => eliminarRotulo(r)} style={dangerTinyButtonStyle}>
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          </div>
        )}

        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${colors.border}`,
            background: "#fcfdff",
            color: colors.muted,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Usa <b>Exportar</b> por fila para bajar solo un rótulo como <b>rotulo_print.csv</b>, guardarlo en <b>{DOWNLOAD_HINT_PATH}</b> y luego abrir BarTender para imprimir.
        </div>
      </div>
    </div>
  );
}