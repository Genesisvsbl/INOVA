import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../api";
import {
  Truck,
  Search,
  Download,
  Printer,
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

function toCSV(rows) {
  const headers = [
    "id",
    "fecha",
    "usuario",
    "documento",
    "codigo_cita",
    "proveedor",
    "remesa",
    "orden_compra",
    "codigo_material",
    "descripcion_material",
    "unidad_medida",
    "familia",
    "um",
    "umb",
    "estado",
    "lote_almacen",
    "lote_proveedor",
    "fecha_fabricacion",
    "fecha_vencimiento",
    "cantidad",
  ];

  const esc = (x) => {
    const s = (x ?? "").toString().replaceAll('"', '""');
    return `"${s}"`;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];

  return lines.join("\n");
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
              background: "#fff6e5",
              border: "1px solid #f1ddb0",
              flexShrink: 0,
            }}
          >
            <Truck size={18} color="#9a6700" />
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
              En tránsito
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

export default function EnTransito() {
  const [rows, setRows] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [ubicPorId, setUbicPorId] = useState({});

  const cargarTodo = async () => {
    setLoading(true);
    setErr("");

    try {
      const [resRows, resUbis] = await Promise.all([
        fetch(`${API_URL}/movimientos/en-transito?limit=2000`),
        fetch(`${API_URL}/ubicaciones?limit=2000`),
      ]);

      if (!resRows.ok) throw new Error(await resRows.text());
      if (!resUbis.ok) throw new Error(await resUbis.text());

      const dataRows = await resRows.json();
      const dataUbis = await resUbis.json();

      setRows(Array.isArray(dataRows) ? dataRows : []);
      setUbicaciones(Array.isArray(dataUbis) ? dataUbis : []);

      const init = {};
      (Array.isArray(dataRows) ? dataRows : []).forEach((r) => {
        init[r.id] = "";
      });
      setUbicPorId(init);
    } catch (e) {
      setErr(String(e?.message || e));
      setRows([]);
      setUbicaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;

    return rows.filter((r) => {
      const hay = [
        r.usuario,
        r.documento,
        r.codigo_cita,
        r.proveedor,
        r.remesa,
        r.orden_compra,
        r.codigo_material,
        r.descripcion_material,
        r.unidad_medida,
        r.familia,
        r.um,
        r.umb,
        r.estado,
        r.lote_almacen,
        r.lote_proveedor,
        r.fecha_fabricacion,
        r.fecha_vencimiento,
      ]
        .map((x) => (x ?? "").toString().toLowerCase())
        .join(" | ");

      return hay.includes(needle);
    });
  }, [rows, q]);

  const totalQty = useMemo(() => {
    return filtered.reduce((acc, r) => acc + Number(r.cantidad || 0), 0);
  }, [filtered]);

  const onExport = () => {
    const csv = toCSV(filtered);
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    downloadText(`en_transito_${yyyy}-${mm}-${dd}.csv`, csv);
  };

  const buildPrintHtml = () => {
    const rowsHtml = filtered
      .map(
        (r) => `
        <tr>
          <td>${fmtDateTime(r.fecha)}</td>
          <td>${r.estado || "EN_TRANSITO"}</td>
          <td>${r.usuario || ""}</td>
          <td>${r.documento || ""}</td>
          <td>${r.codigo_cita || ""}</td>
          <td>${r.proveedor || ""}</td>
          <td>${r.codigo_material || ""}</td>
          <td>${r.descripcion_material || ""}</td>
          <td>${r.um || r.unidad_medida || ""}</td>
          <td>${r.lote_almacen || ""}</td>
          <td>${r.lote_proveedor || ""}</td>
          <td>${r.fecha_vencimiento || ""}</td>
          <td style="text-align:right;">${fmtNumberCO(r.cantidad)}</td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Soporte Materiales en Tránsito</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; }
            .sheet { width: 100%; padding: 0; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #072B5A; padding-bottom: 10px; margin-bottom: 14px; }
            .header-left { display: flex; align-items: center; gap: 14px; }
            .logo { width: 90px; height: auto; object-fit: contain; }
            .title { margin: 0; font-size: 22px; font-weight: 900; color: #072B5A; }
            .subtitle { margin-top: 4px; font-size: 12px; color: #64748B; }
            .meta { text-align: right; font-size: 12px; font-weight: 700; color: #0f172a; }
            .summary { display: flex; gap: 12px; margin-bottom: 14px; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; min-width: 180px; }
            .box-label { font-size: 10px; font-weight: 800; color: #64748B; }
            .box-value { margin-top: 4px; font-size: 18px; font-weight: 900; color: #072B5A; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 7px; vertical-align: top; }
            th { background: #e2e8f0; font-weight: 800; text-align: left; }
            .footer { margin-top: 12px; font-size: 10px; color: #64748B; }
            tr { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="header-left">
                <img src="${window.location.origin}/INOVA.png" alt="Logo" class="logo" onerror="this.style.display='none'" />
                <div>
                  <h1 class="title">SOPORTE DE MATERIALES EN TRÁNSITO</h1>
                  <div class="subtitle">Material pendiente por ubicación definitiva</div>
                </div>
              </div>

              <div class="meta">
                <div>Fecha impresión: ${fmtDateTime(new Date())}</div>
                <div>Total registros: ${filtered.length}</div>
              </div>
            </div>

            <div class="summary">
              <div class="box">
                <div class="box-label">REGISTROS PENDIENTES</div>
                <div class="box-value">${filtered.length}</div>
              </div>
              <div class="box">
                <div class="box-label">CANTIDAD TOTAL</div>
                <div class="box-value">${fmtNumberCO(totalQty)}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Usuario</th>
                  <th>Documento</th>
                  <th>Código Cita</th>
                  <th>Proveedor</th>
                  <th>Material</th>
                  <th>Descripción</th>
                  <th>UM</th>
                  <th>Lote Almacén</th>
                  <th>Lote Proveedor</th>
                  <th>F. Vencimiento</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
              Documento generado desde la hoja de materiales en tránsito del WMS.
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const onPrint = () => {
    const printWindow = window.open("", "_blank", "width=1400,height=900");

    if (!printWindow) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const onChangeUbic = (id, value) => {
    setUbicPorId((prev) => ({ ...prev, [id]: value }));
  };

  const asignarUbicacion = async (row) => {
    const ubicacion = (ubicPorId[row.id] || "").trim();
    if (!ubicacion) {
      alert("Debes escribir o seleccionar una ubicación.");
      return;
    }

    setSavingId(row.id);

    try {
      const res = await fetch(`${API_URL}/movimientos/${row.id}/asignar-ubicacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo_ubicacion: ubicacion }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      alert(`Ubicación asignada al material ${row.codigo_material}`);
      await cargarTodo();
    } catch (e) {
      alert("Error asignando ubicación:\n" + (e?.message || e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={pageStyle}>
      <ModuleHeader
        title="Materiales sin ubicación asignada"
        subtitle="Listado operativo de material pendiente por ubicar y asignación definitiva."
        helper="Pendiente por ubicar"
      />

      <div style={panelStyle}>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 1fr) auto auto auto",
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
                  placeholder="Documento, proveedor, material, lote, usuario..."
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

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <StatusChip label={`Pendientes: ${filtered.length}`} tone="amber" />
              <StatusChip label={`Cantidad total: ${fmtNumberCO(totalQty)}`} tone="blue" />
            </div>

            <button onClick={onExport} style={secondaryButtonStyle}>
              <Download size={15} />
              Exportar CSV
            </button>

            <button onClick={onPrint} style={primaryButtonStyle}>
              <Printer size={15} />
              Imprimir soporte
            </button>
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
          <div>Listado pendiente por ubicar</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {loading && <StatusChip label="Cargando" tone="amber" />}
            {err && <StatusChip label="Fallo API" tone="red" />}
            {!loading && !err && <StatusChip label="EN TRANSITO" tone="amber" />}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1900 }}>
            <thead>
              <tr>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Usuario</th>
                <th style={thStyle}>Documento</th>
                <th style={thStyle}>Código cita</th>
                <th style={thStyle}>Proveedor</th>
                <th style={thStyle}>Remesa</th>
                <th style={thStyle}>Orden compra</th>
                <th style={thStyle}>Material</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Unidad</th>
                <th style={thStyle}>Familia</th>
                <th style={thStyle}>UM</th>
                <th style={thStyle}>UMB</th>
                <th style={thStyle}>Lote almacén</th>
                <th style={thStyle}>Lote proveedor</th>
                <th style={thStyle}>F. fabricación</th>
                <th style={thStyle}>F. vencimiento</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cantidad</th>
                <th style={thStyle}>Asignar ubicación</th>
                <th style={thStyle}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td colSpan={21} style={tdStyle}>
                    No hay materiales en tránsito.
                  </td>
                </tr>
              )}

              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{fmtDateTime(r.fecha)}</td>
                  <td style={tdStyle}>
                    <StatusChip label="EN TRANSITO" tone="amber" />
                  </td>
                  <td style={tdStyle}>{r.usuario || ""}</td>
                  <td style={tdStyle}>{r.documento || ""}</td>
                  <td style={tdStyle}>{r.codigo_cita || ""}</td>
                  <td style={tdStyle}>{r.proveedor || ""}</td>
                  <td style={tdStyle}>{r.remesa || ""}</td>
                  <td style={tdStyle}>{r.orden_compra || ""}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: colors.navy }}>
                    {r.codigo_material || ""}
                  </td>
                  <td style={tdStyle}>{r.descripcion_material || ""}</td>
                  <td style={tdStyle}>{r.unidad_medida || ""}</td>
                  <td style={tdStyle}>{r.familia || ""}</td>
                  <td style={tdStyle}>{r.um || ""}</td>
                  <td style={tdStyle}>{r.umb || ""}</td>
                  <td style={tdStyle}>{r.lote_almacen || ""}</td>
                  <td style={tdStyle}>{r.lote_proveedor || ""}</td>
                  <td style={tdStyle}>{r.fecha_fabricacion || ""}</td>
                  <td style={tdStyle}>{r.fecha_vencimiento || ""}</td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 800,
                      color: colors.good,
                    }}
                  >
                    {fmtNumberCO(r.cantidad)}
                  </td>

                  <td style={tdStyle}>
                    <input
                      list="ubicacionesListEnTransito"
                      value={ubicPorId[r.id] || ""}
                      onChange={(e) => onChangeUbic(r.id, e.target.value)}
                      placeholder="Escriba o seleccione..."
                      style={{ ...inputStyle, width: 190 }}
                    />
                  </td>

                  <td style={tdStyle}>
                    <button
                      onClick={() => asignarUbicacion(r)}
                      disabled={savingId === r.id}
                      style={{
                        ...primaryButtonStyle,
                        opacity: savingId === r.id ? 0.7 : 1,
                      }}
                    >
                      {savingId === r.id ? "Guardando..." : "Asignar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <datalist id="ubicacionesListEnTransito">
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.ubicacion}>
                {u.ubicacion}
              </option>
            ))}
          </datalist>
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
      </div>

      <div style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>
        Desde esta hoja puedes exportar CSV, imprimir soporte y asignar ubicación definitiva al material pendiente.
      </div>
    </div>
  );
}