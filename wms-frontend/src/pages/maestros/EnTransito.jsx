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

      if (!resRows.ok) {
        throw new Error(await resRows.text());
      }
      if (!resUbis.ok) {
        throw new Error(await resUbis.text());
      }

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
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: #fff;
            }

            .sheet {
              width: 100%;
              padding: 0;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              border-bottom: 2px solid #072B5A;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }

            .header-left {
              display: flex;
              align-items: center;
              gap: 14px;
            }

            .logo {
              width: 90px;
              height: auto;
              object-fit: contain;
            }

            .title {
              margin: 0;
              font-size: 22px;
              font-weight: 900;
              color: #072B5A;
            }

            .subtitle {
              margin-top: 4px;
              font-size: 12px;
              color: #64748B;
            }

            .meta {
              text-align: right;
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
            }

            .summary {
              display: flex;
              gap: 12px;
              margin-bottom: 14px;
            }

            .box {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 10px 12px;
              min-width: 180px;
            }

            .box-label {
              font-size: 10px;
              font-weight: 800;
              color: #64748B;
            }

            .box-value {
              margin-top: 4px;
              font-size: 18px;
              font-weight: 900;
              color: #072B5A;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }

            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 7px;
              vertical-align: top;
            }

            th {
              background: #e2e8f0;
              font-weight: 800;
              text-align: left;
            }

            .footer {
              margin-top: 12px;
              font-size: 10px;
              color: #64748B;
            }

            tr {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="header-left">
                <img
                  src="${window.location.origin}/logo.png"
                  alt="Logo"
                  class="logo"
                  onerror="this.style.display='none'"
                />
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
              <tbody>
                ${rowsHtml}
              </tbody>
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

      alert(`✅ Ubicación asignada al material ${row.codigo_material}`);
      await cargarTodo();
    } catch (e) {
      alert("❌ Error asignando ubicación:\n" + (e?.message || e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
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
            🚚 DATOS MAESTROS
          </div>
          <h1 style={{ margin: "6px 0 0", color: colors.navy }}>
            Materiales sin ubicación asignada
          </h1>
          <div style={{ marginTop: 6, color: colors.muted }}>
            Aquí ves todo lo pendiente por ubicar y puedes asignar ubicación definitiva.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`Pendientes: ${filtered.length}`} tone="amber" />
          <Chip label={`Cantidad total: ${fmtNumberCO(totalQty)}`} tone="blue" />

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
          >
            ⬇️ Exportar CSV
          </button>

          <button
            onClick={onPrint}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            🖨️ Imprimir soporte
          </button>
        </div>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <span style={{ fontWeight: 900, color: colors.muted }}>🔎</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por documento, proveedor, material, lote, usuario..."
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
            <div style={{ fontWeight: 1000, color: colors.navy }}>Listado pendiente por ubicar</div>
            <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
              {loading ? "Cargando…" : err ? "Error" : `Mostrando ${filtered.length} registros`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {loading && <Chip label="Cargando…" tone="amber" />}
            {err && <Chip label="Fallo cargando API" tone="red" />}
            {!loading && !err && <Chip label="EN TRANSITO" tone="amber" />}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1900 }}>
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  borderBottom: `1px solid ${colors.border}`,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 12 }}>Fecha</th>
                <th style={{ padding: 12 }}>Estado</th>
                <th style={{ padding: 12 }}>Usuario</th>
                <th style={{ padding: 12 }}>Documento</th>
                <th style={{ padding: 12 }}>Código Cita</th>
                <th style={{ padding: 12 }}>Proveedor</th>
                <th style={{ padding: 12 }}>Remesa</th>
                <th style={{ padding: 12 }}>Orden Compra</th>
                <th style={{ padding: 12 }}>Material</th>
                <th style={{ padding: 12 }}>Descripción</th>
                <th style={{ padding: 12 }}>Unidad</th>
                <th style={{ padding: 12 }}>Familia</th>
                <th style={{ padding: 12 }}>UM</th>
                <th style={{ padding: 12 }}>UMB</th>
                <th style={{ padding: 12 }}>Lote Almacén</th>
                <th style={{ padding: 12 }}>Lote Proveedor</th>
                <th style={{ padding: 12 }}>F. Fabricación</th>
                <th style={{ padding: 12 }}>F. Vencimiento</th>
                <th style={{ padding: 12, textAlign: "right" }}>Cantidad</th>
                <th style={{ padding: 12 }}>Asignar Ubicación</th>
                <th style={{ padding: 12 }}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td colSpan={21} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay materiales en tránsito.
                  </td>
                </tr>
              )}

              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 12, fontWeight: 800 }}>{fmtDateTime(r.fecha)}</td>
                  <td style={{ padding: 12 }}>
                    <Chip label="EN TRANSITO" tone="amber" />
                  </td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.usuario || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.documento || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.codigo_cita || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.proveedor || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.remesa || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.orden_compra || ""}</td>
                  <td style={{ padding: 12, fontWeight: 1000, color: colors.navy }}>{r.codigo_material || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.descripcion_material || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.unidad_medida || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.familia || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.um || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.umb || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_almacen || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.lote_proveedor || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.fecha_fabricacion || ""}</td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{r.fecha_vencimiento || ""}</td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 1000, color: colors.good }}>
                    {fmtNumberCO(r.cantidad)}
                  </td>

                  <td style={{ padding: 12 }}>
                    <input
                      list="ubicacionesListEnTransito"
                      value={ubicPorId[r.id] || ""}
                      onChange={(e) => onChangeUbic(r.id, e.target.value)}
                      placeholder="Escriba o seleccione..."
                      style={{ width: 180 }}
                    />
                  </td>

                  <td style={{ padding: 12 }}>
                    <button
                      onClick={() => asignarUbicacion(r)}
                      disabled={savingId === r.id}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "none",
                        background: colors.blue,
                        color: "#fff",
                        fontWeight: 900,
                        cursor: "pointer",
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
          <div style={{ padding: 14, color: colors.bad, fontWeight: 900 }}>
            Error API: {err}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, color: colors.muted, fontSize: 12, fontWeight: 800 }}>
        Desde esta hoja puedes sacar soporte impreso o CSV de todo lo pendiente por ubicar.
      </div>
    </div>
  );
}