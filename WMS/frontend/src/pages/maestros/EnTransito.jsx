import { useEffect, useMemo, useRef, useState } from "react";
import { showWmsAlert, showWmsConfirm, showWmsPrompt } from "../../wmsDialog.jsx";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { asignarUbicacionDesdeTransito, getEnTransito, getUbicaciones } from "../../api";
import {
  Truck,
  Search,
  Download,
  Printer,
  Camera,
  CheckCircle,
  AlertTriangle,
  ImageUp,
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

const iconButtonStyle = {
  height: 38,
  width: 38,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.blue,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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

function normalizeUbicacion(v) {
  return (v ?? "").toString().trim().toUpperCase();
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
        padding: "2px 5px",
        borderRadius: 999,
        fontSize: 8.5,
        lineHeight: 1,
        fontWeight: 900,
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
  padding: "6px 4px",
  fontSize: 8.5,
  lineHeight: 1.05,
  color: "#607080",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 900,
  whiteSpace: "normal",
  wordBreak: "normal",
  background: "#fbfcfd",
};

const tdStyle = {
  padding: "7px 4px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  lineHeight: 1.08,
  fontSize: 9.5,
};

export default function EnTransito() {
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [scanningId, setScanningId] = useState(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [ubicPorId, setUbicPorId] = useState({});
  const [validacionPorId, setValidacionPorId] = useState({});

  const ubicacionesValidasSet = useMemo(() => {
    const set = new Set();

    ubicaciones.forEach((u) => {
      const codigo = normalizeUbicacion(u.ubicacion);
      if (codigo) set.add(codigo);
    });

    return set;
  }, [ubicaciones]);

  const cargarTodo = async () => {
    setLoading(true);
    setErr("");

    try {
      const [dataRows, dataUbis] = await Promise.all([
        getEnTransito(),
        getUbicaciones(),
      ]);

      const safeRows = Array.isArray(dataRows) ? dataRows : [];
      const safeUbis = Array.isArray(dataUbis) ? dataUbis : [];

      setRows(safeRows);
      setUbicaciones(safeUbis);

      const initUbic = {};
      const initVal = {};

      safeRows.forEach((r) => {
        initUbic[r.id] = "";
        initVal[r.id] = "empty";
      });

      setUbicPorId(initUbic);
      setValidacionPorId(initVal);
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

  const validarUbicacion = (id, value) => {
    const codigo = normalizeUbicacion(value);

    if (!codigo) {
      setValidacionPorId((prev) => ({ ...prev, [id]: "empty" }));
      return false;
    }

    const existe = ubicacionesValidasSet.has(codigo);

    setValidacionPorId((prev) => ({
      ...prev,
      [id]: existe ? "valid" : "invalid",
    }));

    return existe;
  };

  const onChangeUbic = (id, value) => {
    const normalizada = normalizeUbicacion(value);

    setUbicPorId((prev) => ({ ...prev, [id]: normalizada }));

    if (!normalizada) {
      setValidacionPorId((prev) => ({ ...prev, [id]: "empty" }));
      return;
    }

    const existe = ubicacionesValidasSet.has(normalizada);

    setValidacionPorId((prev) => ({
      ...prev,
      [id]: existe ? "valid" : "invalid",
    }));
  };

  const pedirManual = async (id, mensaje = "Escribe o pega el código de ubicación:") => {
    const manual = await showWmsPrompt(mensaje);

    if (manual !== null) {
      onChangeUbic(id, manual);
    }
  };

  const crearReaderZXing = () => {
    return new BrowserMultiFormatReader();
  };

  const leerImagenUbicacion = async (file, id) => {
    if (!file || !id) return;

    const imageUrl = URL.createObjectURL(file);

    const fallbackManual = () => {
      pedirManual(
        id,
        "No se pudo decodificar automáticamente. Escribe o pega el código de ubicación:"
      );
    };

    try {
      const reader = crearReaderZXing();

      const img = document.createElement("img");
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const decodeCanvas = async (canvas) => {
        try {
          const result = await reader.decodeFromCanvas(canvas);
          return normalizeUbicacion(result?.getText?.() || result?.text || "");
        } catch {
          return "";
        }
      };

      const makeCanvas = ({
        scale = 4,
        padding = 120,
        threshold = false,
        invert = false,
      }) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth * scale + padding * 2;
        canvas.height = img.naturalHeight * scale + padding * 2;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img,
          padding,
          padding,
          img.naturalWidth * scale,
          img.naturalHeight * scale
        );

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          let lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

          if (threshold) {
            lum = lum > 145 ? 255 : 0;
          }

          if (invert) {
            lum = 255 - lum;
          }

          data[i] = lum;
          data[i + 1] = lum;
          data[i + 2] = lum;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
      };

      const intentos = [
        { scale: 2, padding: 80, threshold: false },
        { scale: 4, padding: 120, threshold: false },
        { scale: 6, padding: 160, threshold: false },
        { scale: 4, padding: 120, threshold: true },
        { scale: 6, padding: 160, threshold: true },
        { scale: 8, padding: 200, threshold: true },
        { scale: 4, padding: 120, threshold: true, invert: true },
        { scale: 6, padding: 160, threshold: true, invert: true },
      ];

      for (const config of intentos) {
        const canvas = makeCanvas(config);
        const value = await decodeCanvas(canvas);

        if (value) {
          onChangeUbic(id, value);
          return;
        }
      }

      try {
        const result = await reader.decodeFromImageElement(img);
        const value = normalizeUbicacion(result?.getText?.() || result?.text || "");

        if (value) {
          onChangeUbic(id, value);
          return;
        }
      } catch {
        // sigue fallback
      }

      fallbackManual();
    } catch {
      fallbackManual();
    } finally {
      URL.revokeObjectURL(imageUrl);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setUploadTargetId(null);
    }
  };

  const abrirSelectorImagen = (row) => {
    setUploadTargetId(row.id);

    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 0);
  };

  const escanearUbicacion = async (row) => {
    const id = row.id;

    if (!navigator.mediaDevices?.getUserMedia) {
      pedirManual(
        id,
        "Este dispositivo no permite abrir cámara desde el navegador. Escribe o pega el código de ubicación:"
      );
      return;
    }

    setScanningId(id);

    let reader = null;
    let controls = null;
    let overlay = null;
    let video = null;

    try {
      reader = crearReaderZXing();

      overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "99999";
      overlay.style.background = "rgba(15, 23, 42, 0.88)";
      overlay.style.display = "grid";
      overlay.style.placeItems = "center";
      overlay.style.padding = "18px";

      const box = document.createElement("div");
      box.style.width = "min(540px, 100%)";
      box.style.background = "#ffffff";
      box.style.borderRadius = "16px";
      box.style.overflow = "hidden";
      box.style.boxShadow = "0 18px 50px rgba(0,0,0,.25)";

      const header = document.createElement("div");
      header.style.padding = "14px 16px";
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.gap = "12px";
      header.style.borderBottom = "1px solid #e2e8f0";

      const title = document.createElement("div");
      title.innerText = "Escanear ubicación";
      title.style.fontWeight = "900";
      title.style.color = "#0f2744";

      const closeBtn = document.createElement("button");
      closeBtn.innerText = "Cerrar";
      closeBtn.style.height = "34px";
      closeBtn.style.padding = "0 12px";
      closeBtn.style.borderRadius = "8px";
      closeBtn.style.border = "1px solid #d9e2ec";
      closeBtn.style.background = "#fff";
      closeBtn.style.fontWeight = "800";
      closeBtn.style.cursor = "pointer";

      const body = document.createElement("div");
      body.style.padding = "14px";

      const help = document.createElement("div");
      help.innerText = "Apunta la cámara al código QR o código de barras de la ubicación.";
      help.style.fontSize = "13px";
      help.style.fontWeight = "700";
      help.style.color = "#64748B";
      help.style.marginBottom = "12px";

      video = document.createElement("video");
      video.setAttribute("playsinline", "true");
      video.muted = true;
      video.style.width = "100%";
      video.style.maxHeight = "420px";
      video.style.objectFit = "cover";
      video.style.borderRadius = "12px";
      video.style.background = "#000";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "10px";
      actions.style.flexWrap = "wrap";
      actions.style.marginTop = "12px";

      const manualBtn = document.createElement("button");
      manualBtn.innerText = "Ingresar manual";
      manualBtn.style.height = "38px";
      manualBtn.style.padding = "0 14px";
      manualBtn.style.borderRadius = "8px";
      manualBtn.style.border = "1px solid #0b57d0";
      manualBtn.style.background = "#0b57d0";
      manualBtn.style.color = "#fff";
      manualBtn.style.fontWeight = "800";
      manualBtn.style.cursor = "pointer";

      const subirBtn = document.createElement("button");
      subirBtn.innerText = "Subir foto";
      subirBtn.style.height = "38px";
      subirBtn.style.padding = "0 14px";
      subirBtn.style.borderRadius = "8px";
      subirBtn.style.border = "1px solid #d9e2ec";
      subirBtn.style.background = "#fff";
      subirBtn.style.color = "#1f2d3d";
      subirBtn.style.fontWeight = "800";
      subirBtn.style.cursor = "pointer";

      const cleanup = () => {
        try {
          if (controls?.stop) controls.stop();
        } catch {
          // no hacer nada
        }

        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        setScanningId(null);
      };

      closeBtn.onclick = cleanup;

      manualBtn.onclick = async () => {
        const manual = await showWmsPrompt("Escribe o pega el código de ubicación:");
        if (manual !== null) {
          onChangeUbic(id, manual);
          cleanup();
        }
      };

      subirBtn.onclick = () => {
        cleanup();
        abrirSelectorImagen(row);
      };

      actions.appendChild(manualBtn);
      actions.appendChild(subirBtn);

      header.appendChild(title);
      header.appendChild(closeBtn);
      body.appendChild(help);
      body.appendChild(video);
      body.appendChild(actions);
      box.appendChild(header);
      box.appendChild(body);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      let selectedDeviceId = undefined;

      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const backCamera =
          devices.find((d) => /back|rear|environment|trasera/i.test(d.label)) ||
          devices[devices.length - 1];

        selectedDeviceId = backCamera?.deviceId;
      } catch {
        selectedDeviceId = undefined;
      }

      controls = await reader.decodeFromVideoDevice(
        selectedDeviceId,
        video,
        (result) => {
          const value = result?.getText?.() || result?.text || "";

          if (value) {
            onChangeUbic(id, value);
            cleanup();
          }
        }
      );
    } catch {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      pedirManual(
        id,
        "No se pudo abrir la cámara. Escribe o pega el código de ubicación:"
      );

      setScanningId(null);
    }
  };

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
                <img src="${window.location.origin}/INOVA2026.png" alt="Logo" class="logo" onerror="this.style.display='none'" />
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
      showWmsAlert("El navegador bloqueó la ventana de impresión.");
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

  const asignarUbicacion = async (row) => {
    const ubicacion = normalizeUbicacion(ubicPorId[row.id]);

    if (!ubicacion) {
      showWmsAlert("Debes escribir, seleccionar, escanear o subir foto de una ubicación.");
      return;
    }

    const esValida = validarUbicacion(row.id, ubicacion);

    if (!esValida) {
      showWmsAlert(
        `La ubicación "${ubicacion}" no existe en la lista de ubicaciones válidas. Verifica el código.`
      );
      return;
    }

    setSavingId(row.id);

    try {
      await asignarUbicacionDesdeTransito(row.id, ubicacion);

      showWmsAlert(`Ubicación ${ubicacion} asignada al material ${row.codigo_material}`);
      await cargarTodo();
    } catch (e) {
      showWmsAlert("Error asignando ubicación:\n" + (e?.message || e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={pageStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTargetId) {
            leerImagenUbicacion(file, uploadTargetId);
          }
        }}
      />

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

        <div style={{ overflowX: "hidden", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 9 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "5.8%" }}>Fecha</th>
                <th style={{ ...thStyle, width: "5.8%" }}>Estado</th>
                <th style={{ ...thStyle, width: "4.7%" }}>Usuario</th>
                <th style={{ ...thStyle, width: "4.8%" }}>Material</th>
                <th style={{ ...thStyle, width: "15.8%" }}>Descripción</th>
                <th style={{ ...thStyle, width: "3.5%" }}>Unidad</th>
                <th style={{ ...thStyle, width: "5.8%" }}>Familia</th>
                <th style={{ ...thStyle, width: "2.7%" }}>UM</th>
                <th style={{ ...thStyle, width: "3%" }}>UMB</th>
                <th style={{ ...thStyle, width: "7.1%" }}>Lote almacén</th>
                <th style={{ ...thStyle, width: "6.2%" }}>Lote proveedor</th>
                <th style={{ ...thStyle, width: "5.4%" }}>F. fabricación</th>
                <th style={{ ...thStyle, width: "5.4%" }}>F. vencimiento</th>
                <th style={{ ...thStyle, width: "4.8%", textAlign: "right" }}>Cantidad</th>
                <th style={{ ...thStyle, width: "8.4%" }}>Asignar ubicación</th>
                <th style={{ ...thStyle, width: "3.8%", textAlign: "center" }}>Valid.</th>
                <th style={{ ...thStyle, width: "3%", textAlign: "center" }}>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td colSpan={17} style={tdStyle}>
                    No hay materiales en tránsito.
                  </td>
                </tr>
              )}

              {filtered.map((r) => {
                const estadoValidacion = validacionPorId[r.id] || "empty";

                return (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, fontSize: 8.5 }}>{fmtDateTime(r.fecha)}</td>
                    <td style={{ ...tdStyle, padding: "5px 2px", whiteSpace: "nowrap" }}>
                      <StatusChip label="EN TRÁNSITO" tone="amber" />
                    </td>
                    <td style={{ ...tdStyle, fontSize: 8.6 }}>{r.usuario || ""}</td>
                    <td style={{ ...tdStyle, fontWeight: 900, color: colors.navy, fontSize: 9 }}>
                      {r.codigo_material || ""}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 8.8, lineHeight: 1.08 }}>{r.descripcion_material || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.4 }}>{r.unidad_medida || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.4, lineHeight: 1.05 }}>{r.familia || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.6 }}>{r.um || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.6 }}>{r.umb || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.6 }}>{r.lote_almacen || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.6 }}>{r.lote_proveedor || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.6 }}>{r.fecha_fabricacion || ""}</td>
                    <td style={{ ...tdStyle, fontSize: 8.6 }}>{r.fecha_vencimiento || ""}</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 900,
                        color: colors.good,
                        fontSize: 9.2,
                      }}
                    >
                      {fmtNumberCO(r.cantidad)}
                    </td>

                    <td style={{ ...tdStyle, padding: "5px 3px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 20px 20px", gap: 3, alignItems: "center" }}>
                        <input
                          list="ubicacionesListEnTransito"
                          value={ubicPorId[r.id] || ""}
                          onChange={(e) => onChangeUbic(r.id, e.target.value)}
                          placeholder="Ubicación"
                          style={{
                            ...inputStyle,
                            width: "100%",
                            minWidth: 0,
                            height: 22,
                            padding: "0 4px",
                            fontSize: 8,
                            borderColor:
                              estadoValidacion === "valid"
                                ? colors.goodBd
                                : estadoValidacion === "invalid"
                                  ? colors.badBd
                                  : colors.border,
                            background:
                              estadoValidacion === "valid"
                                ? colors.goodBg
                                : estadoValidacion === "invalid"
                                  ? colors.badBg
                                  : "#fff",
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => escanearUbicacion(r)}
                          disabled={scanningId === r.id}
                          title="Escanear con cámara"
                          style={{
                            ...iconButtonStyle,
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            borderRadius: 6,
                            padding: 0,
                            opacity: scanningId === r.id ? 0.65 : 1,
                            cursor: scanningId === r.id ? "not-allowed" : "pointer",
                          }}
                        >
                          <Camera size={9} />
                        </button>

                        <button
                          type="button"
                          onClick={() => abrirSelectorImagen(r)}
                          title="Subir foto del código"
                          style={{
                            ...iconButtonStyle,
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            borderRadius: 6,
                            padding: 0,
                          }}
                        >
                          <ImageUp size={9} />
                        </button>
                      </div>
                    </td>

                    <td style={{ ...tdStyle, textAlign: "center", fontSize: 8, padding: "4px 1px", whiteSpace: "nowrap" }}>
                      {estadoValidacion === "valid" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: colors.good,
                            fontWeight: 800,
                          }}
                        >
                          <CheckCircle size={8} />
                          OK
                        </span>
                      )}

                      {estadoValidacion === "invalid" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: colors.bad,
                            fontWeight: 800,
                          }}
                        >
                          <AlertTriangle size={8} />
                          NO
                        </span>
                      )}

                      {estadoValidacion === "empty" && (
                        <span style={{ color: colors.muted, fontWeight: 700 }}>
                          Pend.
                        </span>
                      )}
                    </td>

                    <td style={{ ...tdStyle, textAlign: "center", padding: "4px 1px" }}>
                      <button
                        onClick={() => asignarUbicacion(r)}
                        disabled={savingId === r.id}
                        style={{
                          ...primaryButtonStyle,
                          height: 22,
                          minHeight: 22,
                          padding: "0 6px",
                          fontSize: 8,
                          borderRadius: 6,
                          opacity: savingId === r.id ? 0.7 : 1,
                        }}
                      >
                        {savingId === r.id ? "Guardando..." : "Asignar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <datalist id="ubicacionesListEnTransito">
            {ubicaciones.map((u) => (
              <option key={u.id} value={normalizeUbicacion(u.ubicacion)}>
                {normalizeUbicacion(u.ubicacion)}
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
        Desde esta hoja puedes exportar CSV, imprimir soporte, usar lector físico,
        cámara o foto para asignar ubicación definitiva al material pendiente.
      </div>
    </div>
  );
}
