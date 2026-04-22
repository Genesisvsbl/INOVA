import { useEffect, useMemo, useState } from "react";
import { getMotor } from "../../api";
import {
  Cpu,
  Search,
  Download,
  FilterX,
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

        <div style={{ overflowX: "auto" }}>
          {tipo === "STOCK" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1500 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>UM</th>
                  <th style={thStyle}>Familia</th>
                  <th style={thStyle}>Ubicación base</th>
                  <th style={thStyle}>Posición</th>
                  <th style={thStyle}>Ubicación final</th>
                  <th style={thStyle}>Zona</th>
                  <th style={thStyle}>Bodega</th>
                  <th style={thStyle}>Lote almacén</th>
                  <th style={thStyle}>Lote proveedor</th>
                  <th style={thStyle}>Vencimiento</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Stock</th>
                </tr>
              </thead>

              <tbody>
                {!loading && !err && showingRows.length === 0 && (
                  <tr>
                    <td colSpan={13} style={tdStyle}>
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
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1700 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Documento</th>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>UM</th>
                  <th style={thStyle}>Familia</th>
                  <th style={thStyle}>Ubicación base</th>
                  <th style={thStyle}>Posición</th>
                  <th style={thStyle}>Ubicación final</th>
                  <th style={thStyle}>Zona</th>
                  <th style={thStyle}>Bodega</th>
                  <th style={thStyle}>Lote almacén</th>
                  <th style={thStyle}>Lote proveedor</th>
                  <th style={thStyle}>Vencimiento</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cantidad</th>
                </tr>
              </thead>

              <tbody>
                {!loading && !err && showingRows.length === 0 && (
                  <tr>
                    <td colSpan={18} style={tdStyle}>
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

                      <td style={tdStyle}>
                        {String(r.tipo || "").toUpperCase() === "ENTRADA" ? (
                          <StatusChip label="ENTRADA" tone="green" />
                        ) : (
                          <StatusChip label="SALIDA" tone="red" />
                        )}
                      </td>

                      <td style={tdStyle}>
                        {estadoUp === "EN_TRANSITO" ? (
                          <StatusChip label="EN TRANSITO" tone="amber" />
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
                          color: estadoUp === "EN_TRANSITO" ? colors.warn : colors.navy,
                        }}
                      >
                        {ubicBase || (estadoUp === "EN_TRANSITO" ? "EN TRANSITO" : "")}
                      </td>

                      <td style={tdStyle}>{posicion || ""}</td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700,
                          color: estadoUp === "EN_TRANSITO" ? colors.warn : colors.blue,
                        }}
                      >
                        {ubicFinal || "EN TRANSITO"}
                      </td>

                      <td style={tdStyle}>{r.zona || ""}</td>
                      <td style={tdStyle}>{r.bodega || ""}</td>
                      <td style={tdStyle}>{r.lote_almacen || ""}</td>
                      <td style={tdStyle}>{r.lote_proveedor || ""}</td>
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
    </div>
  );
}