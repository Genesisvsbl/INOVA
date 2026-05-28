import { useEffect, useMemo, useState } from "react";
import { eliminarRotulo as borrarRotulo, getRotulos } from "../../api";
import {
  Tags,
  Search,
  Download,
  RefreshCw,
  FilterX,
  Trash2,
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

const DOWNLOAD_HINT_PATH =
  "C:\\Users\\Cristian\\Documents\\INOVA\\WMS\\backend\\rotulo_print.csv";

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

function fmtDateSlash(v) {
  const s = fmtDate(v);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "";
  const [yyyy, mm, dd] = s.split("-");
  return `${dd}/${mm}/${yyyy}`;
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

function safeText(v) {
  return (v ?? "").toString().trim();
}

function escapeHtml(v) {
  return safeText(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(v) {
  return safeText(v)
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("$", "\\$")
    .replaceAll('"', '\\"')
    .replaceAll("'", "\\'")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
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

function descargarRotulosCsv(items) {
  const cols = [
    "codigo_cita",
    "impresion",
    "documento",
    "sku",
    "texto_breve",
    "lote_almacen",
    "lote_proveedor",
    "fecha_fabricacion",
    "fecha_vencimiento",
    "cantidad",
    "proveedor",
    "remesa",
    "orden_compra",
    "auxiliar",
  ];
  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [cols.join(";")]
    .concat((items || []).map((row) => cols.map((col) => escapeCsv(row[col])).join(";")))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rotulo_print.csv";
  a.click();
  URL.revokeObjectURL(url);
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
  padding: "8px 6px",
  fontSize: 10,
  color: "#607080",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 800,
  whiteSpace: "normal",
  lineHeight: 1.1,
  background: "#fbfcfd",
};

const tdStyle = {
  padding: "5px 4px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "normal",
  fontSize: 8.8,
  lineHeight: 1.08,
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  verticalAlign: "middle",
};

const thCompactStyle = {
  ...thStyle,
  padding: "5px 4px",
  fontSize: 8.5,
  lineHeight: 1.05,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  verticalAlign: "middle",
};

const actionButtonCompactStyle = {
  width: 28,
  minWidth: 28,
  height: 28,
  padding: 0,
  borderRadius: 8,
  fontSize: 0,
  gap: 0,
  whiteSpace: "nowrap",
  justifyContent: "center",
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

    const params = {};

    if (q.trim()) params.q = q.trim();

    const { kind, value } = classifySerialInput(serial);

    if (kind === "codigo_cita") params.codigo_cita = value;
    if (kind === "impresion") params.impresion = value;

    params.limit = "2000";

    getRotulos(params)
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
    const data = rows.filter((r) => {
      if (kind === "codigo_cita") return String(r.codigo_cita || "") === String(value);
      if (kind === "impresion") return String(r.impresion || "") === String(value);
      return true;
    });
    descargarRotulosCsv(data);
    mostrarAyudaDescarga();
  };

  const exportarFila = (rotuloId) => {
    descargarRotulosCsv(rows.filter((r) => String(r.id) === String(rotuloId)));
    mostrarAyudaDescarga();
  };

  const imprimirRotulo = (r) => {
    const fechaFab = escapeHtml(fmtDateSlash(r.fecha_fabricacion));
    const fechaVen = escapeHtml(fmtDateSlash(r.fecha_vencimiento));

    const loteProveedor = escapeHtml(safeText(r.lote_proveedor));
    const loteAlmacen = escapeHtml(safeText(r.lote_almacen));
    const auxiliar = escapeHtml(safeText(r.auxiliar));

    const codigoBarcodeText =
      safeText(r.sku) || safeText(r.codigo_cita) || safeText(r.impresion);

    const almacenBarcodeText = safeText(r.lote_almacen);

    const codigoBarcodeHtml = escapeHtml(codigoBarcodeText);

    const codigoBarcodeJs = escapeJs(codigoBarcodeText);
    const almacenBarcodeJs = escapeJs(almacenBarcodeText);

    const impresion = escapeHtml(r.impresion);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Rótulo ${impresion}</title>
  <link rel="preload" as="image" href="/INOVA2026.png" />
  <link rel="preload" as="image" href="/favicon.ico" />
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

  <style>
    @page {
      size: 10.16cm 5.08cm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html,
    body {
      width: 10.16cm;
      height: 5.08cm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
    }

    .label {
      position: relative;
      width: 10.16cm;
      height: 5.08cm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      border: 0.25mm solid #bdbdbd;
      border-radius: 3mm;
    }

    .logo-inova {
      position: absolute;
      top: 2.2mm;
      left: 3.2mm;
      width: 36mm;
      height: 9.6mm;
      object-fit: contain;
      object-position: left center;
      display: block;
      filter: grayscale(100%) brightness(0%);
    }

    .logo-b {
      position: absolute;
      top: 2mm;
      right: 3mm;
      width: 12mm;
      height: 12mm;
      object-fit: contain;
      display: block;
      filter: grayscale(100%) brightness(0%);
    }

    .auxiliar {
      position: absolute;
      top: 13.6mm;
      left: 3mm;
      width: 58mm;
      font-size: 6.2px;
      line-height: 1;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #000000;
    }

    .linea-superior {
      position: absolute;
      top: 18.4mm;
      left: 3mm;
      right: 3mm;
      height: 0.25mm;
      background: #bdbdbd;
    }

    .info {
      position: absolute;
      top: 20.8mm;
      left: 3mm;
      width: 60mm;
      overflow: hidden;
    }

    .line {
      display: grid;
      grid-template-columns: 29mm 2mm 1fr;
      align-items: center;
      height: 4.4mm;
      font-size: 6.8px;
      line-height: 1;
      font-weight: 900;
      white-space: nowrap;
      overflow: hidden;
      color: #000000;
    }

    .line div {
      overflow: hidden;
      text-overflow: clip;
      white-space: nowrap;
    }

    .separador-vertical {
      position: absolute;
      top: 18.5mm;
      left: 66mm;
      width: 0.25mm;
      height: 17mm;
      background: #bdbdbd;
    }

    .barcode-sku-box {
      position: absolute;
      top: 19.8mm;
      left: 69mm;
      width: 25mm;
      height: 15mm;
      overflow: hidden;
      text-align: center;
    }

    #barcode1 {
      width: 25mm;
      height: 10.5mm;
      display: block;
      margin: 0 auto;
      overflow: hidden;
    }

    .sku-text {
      margin-top: 0.6mm;
      font-size: 7.2px;
      line-height: 1;
      font-weight: 900;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      color: #000000;
    }

    .linea-media {
      position: absolute;
      top: 35.7mm;
      left: 3mm;
      right: 3mm;
      height: 0.25mm;
      background: #bdbdbd;
    }

    .barcode-almacen-box {
      position: absolute;
      top: 36.7mm;
      left: 4mm;
      width: 92mm;
      height: 9.6mm;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #barcode2 {
      width: 92mm;
      height: 9.6mm;
      display: block;
      overflow: hidden;
    }

    .almacen-text {
      position: absolute;
      top: 46.6mm;
      left: 3mm;
      right: 3mm;
      text-align: center;
      font-size: 7.2px;
      line-height: 1;
      font-weight: 900;
      white-space: nowrap;
      overflow: hidden;
      color: #000000;
    }

    svg {
      display: block;
      overflow: visible;
    }

    @media print {
      html,
      body {
        width: 10.16cm;
        height: 5.08cm;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      .label {
        width: 10.16cm;
        height: 5.08cm;
        overflow: hidden;
      }
    }
  </style>
</head>

<body>
  <div class="label">
    <img src="/INOVA2026.png" class="logo-inova" alt="Logo Inova" loading="eager" decoding="sync" />
    <img src="/favicon.ico" class="logo-b" alt="Logo B" loading="eager" decoding="sync" />

    <div class="auxiliar">${auxiliar}</div>
    <div class="linea-superior"></div>

    <div class="info">
      <div class="line">
        <div>FECHA FABRICACIÓN</div>
        <div>:</div>
        <div>${fechaFab}</div>
      </div>

      <div class="line">
        <div>FECHA VENCIMIENTO</div>
        <div>:</div>
        <div>${fechaVen}</div>
      </div>

      <div class="line">
        <div>LOTE PROVEEDOR</div>
        <div>:</div>
        <div>${loteProveedor}</div>
      </div>
    </div>

    <div class="separador-vertical"></div>

    <div class="barcode-sku-box">
      <svg id="barcode1"></svg>
      <div class="sku-text">${codigoBarcodeHtml}</div>
    </div>

    <div class="linea-media"></div>

    <div class="barcode-almacen-box">
      <svg id="barcode2"></svg>
    </div>

    <div class="almacen-text">${loteAlmacen}</div>
  </div>

  <script>
    function normalizarSvg(selector, w, h) {
      var svg = document.querySelector(selector);
      if (!svg) return;

      svg.removeAttribute("width");
      svg.removeAttribute("height");

      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
      svg.setAttribute("preserveAspectRatio", "none");

      svg.style.width = w;
      svg.style.height = h;
      svg.style.maxWidth = w;
      svg.style.maxHeight = h;
      svg.style.display = "block";
      svg.style.overflow = "visible";
    }

    function draw() {
      JsBarcode("#barcode1", "${codigoBarcodeJs}", {
        format: "CODE128",
        displayValue: false,
        height: 34,
        width: 0.72,
        margin: 2
      });

      JsBarcode("#barcode2", "${almacenBarcodeJs}", {
        format: "CODE128",
        displayValue: false,
        height: 40,
        width: 0.46,
        margin: 4
      });

      normalizarSvg("#barcode1", "25mm", "10.5mm");
      normalizarSvg("#barcode2", "92mm", "9.6mm");

      setTimeout(function () {
        window.focus();
        window.print();
      }, 500);
    }

    window.onload = draw;

    window.onafterprint = function () {
      setTimeout(function () {
        window.close();
      }, 300);
    };
  </script>
</body>
</html>
`;

    const win = window.open("", "_blank", "width=700,height=400");

    if (!win) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const eliminarRotulo = async (r) => {
    const ok = window.confirm(
      `¿Seguro que deseas eliminar este rótulo?\n\nImpresión: ${
        r.impresion || ""
      }\nSerial: ${r.codigo_cita || ""}`
    );

    if (!ok) return;

    try {
      await borrarRotulo(r.id);
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
              gridTemplateColumns:
                "minmax(220px, 1.6fr) minmax(170px, 0.9fr) auto auto auto",
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

            <button
              onClick={load}
              style={secondaryButtonStyle}
              title="Aplicar filtros"
            >
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

            <button
              onClick={exportCSV}
              style={primaryButtonStyle}
              title="Exportar CSV para BarTender"
            >
              <Download size={15} />
              Exportar CSV
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <StatusChip label={`Registros: ${stats.total}`} tone="blue" />
            {loading && <StatusChip label="Cargando" tone="amber" />}
            {err && <StatusChip label="Error" tone="red" />}
            {!loading && !err && <StatusChip label="Operativo" tone="green" />}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Listado de rótulos</div>

        <div style={{ width: "100%", overflowX: "hidden" }}>
          <table
            style={{
              width: "100%",
              maxWidth: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...thCompactStyle, width: "5.5%" }}>Serial impresión</th>
                <th style={{ ...thCompactStyle, width: "5%" }}>Serial cita</th>
                <th style={{ ...thCompactStyle, width: "5%" }}>Fecha recepción</th>
                <th style={{ ...thCompactStyle, width: "3%" }}>Semana</th>
                <th style={{ ...thCompactStyle, width: "7%" }}>Proveedor</th>
                <th style={{ ...thCompactStyle, width: "5.5%" }}>Auxiliar</th>
                <th style={{ ...thCompactStyle, width: "4.5%" }}>Documento</th>
                <th style={{ ...thCompactStyle, width: "4.5%" }}>Remesa</th>
                <th style={{ ...thCompactStyle, width: "4.5%" }}>Orden compra</th>
                <th style={{ ...thCompactStyle, width: "5%", textAlign: "right" }}>Cantidad</th>
                <th style={{ ...thCompactStyle, width: "4%" }}>SKU</th>
                <th style={{ ...thCompactStyle, width: "8.5%" }}>Texto breve</th>
                <th style={{ ...thCompactStyle, width: "2.8%" }}>UM</th>
                <th style={{ ...thCompactStyle, width: "3%" }}>UMB</th>
                <th style={{ ...thCompactStyle, width: "5%" }}>F. fabricación</th>
                <th style={{ ...thCompactStyle, width: "5%" }}>F. vencimiento</th>
                <th style={{ ...thCompactStyle, width: "5.2%" }}>Lote proveedor</th>
                <th style={{ ...thCompactStyle, width: "5.5%" }}>Lote almacén</th>
                <th style={{ ...thCompactStyle, width: "5%", textAlign: "center" }}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td colSpan={19} style={tdStyle}>
                    No hay rótulos con esos filtros.
                  </td>
                </tr>
              )}

              {rows.map((r) => (
                <tr key={r.id}>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      color: colors.navy,
                    }}
                  >
                    {r.impresion || ""}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      color: colors.blue,
                    }}
                  >
                    {r.codigo_cita || ""}
                  </td>

                  <td style={tdStyle}>{fmtDate(r.fecha_recepcion)}</td>
                  <td style={tdStyle}>{r.numero_semana || ""}</td>
                  <td style={tdStyle}>{r.proveedor || ""}</td>
                  <td style={tdStyle}>{r.auxiliar || ""}</td>
                  <td style={tdStyle}>{r.documento || ""}</td>
                  <td style={tdStyle}>{r.remesa || ""}</td>
                  <td style={tdStyle}>{r.orden_compra || ""}</td>

                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      fontWeight: 700,
                    }}
                  >
                    {formatQty(r.cantidad)}
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 700 }}>
                    {r.sku || ""}
                  </td>

                  <td style={tdStyle}>{r.texto_breve || ""}</td>
                  <td style={tdStyle}>{r.um || ""}</td>
                  <td style={tdStyle}>{r.umb || ""}</td>
                  <td style={tdStyle}>{fmtDate(r.fecha_fabricacion)}</td>
                  <td style={tdStyle}>{fmtDate(r.fecha_vencimiento)}</td>
                  <td style={tdStyle}>{r.lote_proveedor || ""}</td>
                  <td style={tdStyle}>{r.lote_almacen || ""}</td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        gap: 3,
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => imprimirRotulo(r)}
                        style={{ ...primaryButtonStyle, ...actionButtonCompactStyle }}
                        title="Imprimir"
                        aria-label="Imprimir"
                      >
                        <Printer size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => exportarFila(r.id)}
                        style={{ ...secondaryButtonStyle, ...actionButtonCompactStyle }}
                        title="Exportar"
                        aria-label="Exportar"
                      >
                        <Download size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarRotulo(r)}
                        style={{ ...dangerTinyButtonStyle, ...actionButtonCompactStyle }}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={13} />
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
          Usa <b>Imprimir</b> para generar el rótulo 2x4 directamente desde el
          sistema. También puedes usar <b>Exportar</b> por fila para bajar solo
          un rótulo como <b>rotulo_print.csv</b>.
        </div>
      </div>
    </div>
  );
}

