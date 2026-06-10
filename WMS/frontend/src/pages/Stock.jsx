import { useEffect, useMemo, useState } from "react";
import {
  Search,
  PackageSearch,
  Boxes,
  Warehouse,
  Truck,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  Printer,
  X,
  Eye,
} from "lucide-react";
import { actualizarCertificadoCalidad, getCertificadosCalidad, getStock } from "../api";

const colors = {
  navy: "#133454",
  blue: "#0b57d0",
  bg: "#f3f6fa",
  text: "#203246",
  muted: "#6b7c8f",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#1f7a3d",
  bad: "#c62828",
  warn: "#b26a00",
  goodBg: "#edf8f1",
  goodBd: "#cfe8d7",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
  warnBg: "#fff6e5",
  warnBd: "#f1ddb0",
  infoBg: "#eaf3ff",
  infoBd: "#cfe0ff",
};

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatQty(n) {
  const x = Number(n || 0);
  return fmtCO.format(x);
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isRichReceiptHtml(html) {
  return Boolean(html && /receipt-header|RECIBO CIEGO/i.test(html) && /favicon1\.ico/i.test(html));
}

function buildReceiptPreviewHtml(row, allRows = []) {
  const key = row?.recibo_serial || row?.documento || row?.orden_compra || row?.id;
  const lines = (allRows || []).filter((item) => {
    if (!key) return item === row;
    return (
      item.recibo_serial === row.recibo_serial ||
      item.documento === row.documento ||
      item.orden_compra === row.orden_compra
    );
  });
  const receiptLines = lines.length ? lines : [row];
  const generatedAt = row?.created_at ? new Date(row.created_at) : new Date();
  const generatedDate = Number.isNaN(generatedAt.getTime())
    ? new Date().toLocaleDateString("es-CO")
    : generatedAt.toLocaleDateString("es-CO");
  const generatedTime = Number.isNaN(generatedAt.getTime())
    ? ""
    : generatedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const total = receiptLines.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
  const rows = receiptLines
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.recibo_item || `${item.recibo_serial || ""}-${index + 1}`)}</td>
        <td>${escapeHtml(item.fecha_recibo || "")}</td>
        <td>${escapeHtml(item.codigo_material || "")}</td>
        <td>${escapeHtml(item.descripcion_material || "")}</td>
        <td>${escapeHtml(item.unidad_medida || "")}</td>
        <td style="text-align:right;">${escapeHtml(formatQty(item.cantidad))}</td>
        <td>${escapeHtml(item.lote_proveedor || "")}</td>
        <td>${escapeHtml(item.fecha_fabricacion || "")}</td>
        <td>${escapeHtml(item.fecha_vencimiento || "")}</td>
        <td>${item.certificado_data_url ? "Completo" : "Pendiente"}</td>
      </tr>`)
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Recibo ciego ${escapeHtml(row?.recibo_serial || row?.documento || "")}</title>
    <link rel="preload" as="image" href="/favicon1.ico" />
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; }
      body { padding: 12mm; }
      .page { width: 100%; min-height: calc(100vh - 24mm); }
      .receipt-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #0f2744; padding-bottom: 12px; margin-bottom: 18px; }
      .receipt-header-left { display: flex; align-items: center; gap: 14px; }
      .receipt-logo-box { width: 58px; height: 58px; border: 1px solid #d9e2ec; border-radius: 10px; display: grid; place-items: center; overflow: hidden; background: #fff; }
      .receipt-logo-box img { width: 100%; height: 100%; object-fit: contain; }
      .receipt-title { font-size: 28px; font-weight: 900; color: #0f2744; letter-spacing: .02em; }
      .receipt-subtitle { margin-top: 5px; font-size: 13px; color: #64748b; }
      .receipt-meta { text-align: right; font-size: 12px; line-height: 1.7; color: #0f172a; font-weight: 700; }
      .receipt-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
      .summary-card { min-height: 14mm; border: 1px solid #d9e2ec; border-radius: 8px; padding: 7px 9px; background: #fff; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
      .summary-label { font-size: 8px; line-height: 1; font-weight: 900; color: #0f2744; text-transform: uppercase; letter-spacing: .04em; margin: 0 0 4px; }
      .summary-value { margin: 0; font-size: 12px; font-weight: 900; color: #001b3f; line-height: 1.1; word-break: break-word; }
      .receipt-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 8px; line-height: 1; }
      .receipt-table th, .receipt-table td { border: 1px solid #d9e2ec; padding: 4px 5px; vertical-align: middle; white-space: normal; word-break: break-word; line-height: 1.05; }
      .receipt-table th { background: #f8fafc; text-align: left; font-weight: 900; color: #0f2744; }
      .receipt-table td { color: #0f172a; font-weight: 700; }
      .receipt-footer { margin-top: 10px; font-size: 9px; line-height: 1.2; color: #0f2744; font-weight: 900; display: flex; justify-content: space-between; gap: 12px; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <section class="page receipt-page">
      <div class="receipt-header">
        <div class="receipt-header-left">
          <div class="receipt-logo-box"><img src="/favicon1.ico" alt="INOVA" /></div>
          <div>
            <div class="receipt-title">RECIBO CIEGO</div>
            <div class="receipt-subtitle">Formato de recepción y trazabilidad de ingreso</div>
          </div>
        </div>
        <div class="receipt-meta">
          <div><b>Serial:</b> ${escapeHtml(row?.recibo_serial || "")}</div>
          <div><b>Documento:</b> ${escapeHtml(row?.documento || "")}</div>
          <div><b>Fecha recibo:</b> ${escapeHtml(row?.fecha_recibo || "")}</div>
          <div><b>Generado:</b> ${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</div>
        </div>
      </div>
      <div class="receipt-summary">
        <div class="summary-card"><div class="summary-label">Proveedor</div><div class="summary-value">${escapeHtml(row?.proveedor || "-")}</div></div>
        <div class="summary-card"><div class="summary-label">Orden compra</div><div class="summary-value">${escapeHtml(row?.orden_compra || "-")}</div></div>
        <div class="summary-card"><div class="summary-label">Líneas</div><div class="summary-value">${receiptLines.length}</div></div>
        <div class="summary-card"><div class="summary-label">Total</div><div class="summary-value">${escapeHtml(formatQty(total))}</div></div>
      </div>
      <table class="receipt-table">
        <colgroup>
          <col style="width: 4%" /><col style="width: 9%" /><col style="width: 9%" /><col style="width: 8%" />
          <col style="width: 22%" /><col style="width: 6%" /><col style="width: 9%" /><col style="width: 12%" />
          <col style="width: 8%" /><col style="width: 8%" /><col style="width: 7%" />
        </colgroup>
        <thead>
          <tr>
            <th>#</th><th>Item</th><th>Fecha recepción</th><th>Código</th><th>Descripción</th><th>UM</th><th>Cantidad</th><th>Lote proveedor</th><th>Fabricación</th><th>Vencimiento</th><th>Certificado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="receipt-footer"><span>Documento generado desde WMS INOVA para control de recibo y trazabilidad.</span><span>${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</span></div>
    </section>
  </body>
</html>`;
}

function getReceiptPreviewHtml(row, allRows) {
  return isRichReceiptHtml(row?.recibo_documento_html)
    ? row.recibo_documento_html
    : buildReceiptPreviewHtml(row, allRows);
}
function Chip({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#eef2f6", bd: "#dbe4ec", tx: colors.text },
    blue: { bg: colors.infoBg, bd: colors.infoBd, tx: colors.blue },
    green: { bg: colors.goodBg, bd: colors.goodBd, tx: colors.good },
    red: { bg: colors.badBg, bd: colors.badBd, tx: colors.bad },
    amber: { bg: colors.warnBg, bd: colors.warnBd, tx: colors.warn },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.tx,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function SummaryBox({ label, value, helper, icon, tone = "default" }) {
  const toneStyles = {
    default: { color: colors.navy, bg: "#f5f8fb", bd: "#dde5ee" },
    green: { color: colors.good, bg: colors.goodBg, bd: colors.goodBd },
    red: { color: colors.bad, bg: colors.badBg, bd: colors.badBd },
    amber: { color: colors.warn, bg: colors.warnBg, bd: colors.warnBd },
    blue: { color: colors.blue, bg: colors.infoBg, bd: colors.infoBd },
  };

  const Icon = icon;
  const t = toneStyles[tone] || toneStyles.default;

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: colors.muted,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: t.color,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {helper ? (
          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            {helper}
          </div>
        ) : null}
      </div>

      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: t.bg,
          border: `1px solid ${t.bd}`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={t.color} />
      </div>
    </div>
  );
}

function DataBox({ label, value }) {
  return (
    <div
      style={{
        background: "#fbfcfe",
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: colors.muted,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: colors.text,
          fontWeight: 800,
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function readFileAsDataUrl(file) {
  if (file?.type?.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const maxEdge = 1800;
            const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
            const width = Math.max(1, Math.round(img.width * scale));
            const height = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.filter = "brightness(1.12) contrast(1.24) saturate(0.96)";
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.88));
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
        img.src = String(reader.result || "");
      };
      reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function openHtmlDocument(html) {
  if (!html) return;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function printCertificatePreview(doc) {
  if (!doc?.dataUrl) return;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  if (doc.type?.includes("pdf") || doc.dataUrl.startsWith("data:application/pdf")) {
    frame.src = doc.dataUrl;
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1500);
    };
    return;
  }

  frame.contentDocument?.open();
  frame.contentDocument?.write(`
    <html>
      <head>
        <title>${doc.name || "Certificado de calidad"}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { margin: 0; background: #fff; }
          .page { min-height: calc(100vh - 24mm); display: grid; place-items: center; }
          img { max-width: 100%; max-height: calc(100vh - 24mm); object-fit: contain; }
        </style>
      </head>
      <body><div class="page"><img src="${doc.dataUrl}" /></div></body>
    </html>
  `);
  frame.contentDocument?.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 250);
}

function CertificatePreviewModal({ doc, onClose }) {
  if (!doc?.dataUrl) return null;
  const isPdf = doc.type?.includes("pdf") || doc.dataUrl.startsWith("data:application/pdf");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(8,18,34,.68)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(1120px, 94vw)",
          height: "min(860px, 90vh)",
          background: "#f8fafc",
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 30px 80px rgba(0,0,0,.35)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            background: "#fff",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: colors.blue, fontWeight: 900, letterSpacing: ".08em" }}>VISTA PREVIA</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: colors.navy }}>{doc.name || "Certificado de calidad"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => printCertificatePreview(doc)} style={{ border: `1px solid ${colors.border}`, background: colors.blue, color: "#fff", borderRadius: 10, height: 38, padding: "0 14px", fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Printer size={16} />
              Imprimir / PDF
            </button>
            <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${colors.border}`, background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <div style={{ padding: 18, overflow: "auto", display: "grid", placeItems: "center" }}>
          {isPdf ? (
            <iframe title="Vista previa certificado" src={doc.dataUrl} style={{ width: "100%", height: "100%", border: 0, borderRadius: 10, background: "#fff" }} />
          ) : (
            <img src={doc.dataUrl} alt="Certificado" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 10, boxShadow: "0 12px 30px rgba(15,39,68,.14)" }} />
          )}
        </div>
      </div>
    </div>
  );
}

function withPreviewBase(html) {
  if (!html) return "";
  const origin = window.location?.origin || "";
  const hasBase = /<base\s/i.test(html);
  const withBase = hasBase ? html : html.replace(/<head([^>]*)>/i, `<head$1><base href="${origin}/">`);
  return withBase.replace(/<body([^>]*)>/i, `<body$1 style="margin:0;background:#fff;">`);
}

function printHtmlPreview(html) {
  if (!html) return;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  frame.contentDocument?.open();
  frame.contentDocument?.write(withPreviewBase(html));
  frame.contentDocument?.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 300);
}

function DocumentPreviewModal({ doc, onClose }) {
  if (!doc) return null;
  if (!doc.html) return <CertificatePreviewModal doc={doc} onClose={onClose} />;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(8,18,34,.68)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(1180px, 94vw)",
          height: "min(860px, 90vh)",
          background: "#f8fafc",
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 30px 80px rgba(0,0,0,.35)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            background: "#fff",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: colors.blue, fontWeight: 900, letterSpacing: ".08em" }}>VISTA PREVIA</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: colors.navy }}>{doc.title || "Recibo ciego"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => printHtmlPreview(doc.html)} style={{ border: `1px solid ${colors.border}`, background: colors.blue, color: "#fff", borderRadius: 10, height: 38, padding: "0 14px", fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Printer size={16} />
              Imprimir / PDF
            </button>
            <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${colors.border}`, background: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
        </div>
        <iframe title="Vista previa recibo ciego" srcDoc={withPreviewBase(doc.html)} style={{ width: "100%", height: "100%", border: 0, background: "#fff" }} />
      </div>
    </div>
  );
}
function statusInfo(row) {
  const status = String(row.estado_certificado || "").toUpperCase();
  const expired =
    !row.certificado_data_url &&
    row.vence_gestion_at &&
    new Date(row.vence_gestion_at).getTime() < Date.now();
  if (status === "COMPLETO" || row.certificado_data_url) {
    return { label: "Completo", tone: "green", icon: CheckCircle2 };
  }
  if (expired || status === "VENCIDO") {
    return { label: "Vencido", tone: "red", icon: AlertTriangle };
  }
  return { label: "Pendiente", tone: "amber", icon: Clock };
}

function ConsultaChoice({ activeTab, onSelect }) {
  const cards = [
    {
      key: "stock",
      eyebrow: "Inventario",
      title: "Stock operativo",
      text: "Consulta disponibilidad, transito, ubicacion y condicion ejecutiva por codigo de material.",
      icon: Search,
      accent: colors.blue,
      bg: "linear-gradient(135deg, #eef6ff 0%, #ffffff 58%)",
    },
    {
      key: "certificados",
      eyebrow: "Calidad",
      title: "Certificados de calidad",
      text: "Revisa certificados anexados desde recibo ciego, pendientes de 24 horas y evidencias por lote.",
      icon: ShieldCheck,
      accent: "#7c3aed",
      bg: "linear-gradient(135deg, #f5f0ff 0%, #ffffff 58%)",
    },
  ];

  return (
    <div
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 14,
      }}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const selected = activeTab === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            style={{
              border: `1px solid ${selected ? card.accent : colors.border}`,
              background: card.bg,
              borderRadius: 14,
              padding: 18,
              minHeight: 154,
              textAlign: "left",
              cursor: "pointer",
              boxShadow: selected
                ? `0 18px 40px ${card.accent}24`
                : "0 12px 30px rgba(15, 39, 68, 0.08)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "start",
            }}
          >
            <span>
              <span
                style={{
                  display: "block",
                  color: card.accent,
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {card.eyebrow}
              </span>
              <span
                style={{
                  display: "block",
                  color: colors.navy,
                  fontSize: 24,
                  fontWeight: 950,
                  lineHeight: 1,
                  marginBottom: 10,
                }}
              >
                {card.title}
              </span>
              <span
                style={{
                  display: "block",
                  color: colors.muted,
                  fontSize: 13,
                  fontWeight: 650,
                  lineHeight: 1.45,
                  maxWidth: 520,
                }}
              >
                {card.text}
              </span>
            </span>
            <span
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                background: card.accent,
                boxShadow: `0 14px 28px ${card.accent}35`,
              }}
            >
              <Icon size={24} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CertificadosCalidadView() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadRows = async () => {
    setLoading(true);
    try {
      setRows(await getCertificadosCalidad());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toUpperCase();
    return rows.filter((row) => {
      const info = statusInfo(row);
      const matchesStatus = estado === "TODOS" || info.label.toUpperCase() === estado;
      const haystack = [
        row.fecha_recibo,
        row.codigo_material,
        row.descripcion_material,
        row.unidad_medida,
        row.lote_proveedor,
        row.fecha_fabricacion,
        row.fecha_vencimiento,
        row.proveedor,
        row.documento,
        row.orden_compra,
        row.recibo_serial,
        row.recibo_item,
      ]
        .join(" ")
        .toUpperCase();
      return matchesStatus && (!text || haystack.includes(text));
    });
  }, [rows, q, estado]);

  const stats = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const info = statusInfo(row);
        acc.total += 1;
        if (info.label === "Completo") acc.completos += 1;
        if (info.label === "Pendiente") acc.pendientes += 1;
        if (info.label === "Vencido") acc.vencidos += 1;
        return acc;
      },
      { total: 0, completos: 0, pendientes: 0, vencidos: 0 }
    );
  }, [rows]);

  const onUpload = async (row, file) => {
    if (!file) return;
    const maxBytes = 7 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("El certificado supera 7 MB. Usa una imagen o PDF mas liviano.");
      return;
    }
    setSavingId(String(row.id));
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const saved = await actualizarCertificadoCalidad(row.id, {
        certificado_nombre: file.name || "certificado",
        certificado_tipo: file.type || "application/octet-stream",
        certificado_data_url: dataUrl,
      });
      setRows((prev) =>
        prev.map((item) =>
          String(item.id) === String(row.id)
            ? { ...item, ...saved, certificado_nombre: file.name, certificado_tipo: file.type, certificado_data_url: dataUrl }
            : item
        )
      );
    } catch (e) {
      alert(`No se pudo actualizar el certificado: ${e?.message || e}`);
    } finally {
      setSavingId("");
    }
  };

  const th = {
    padding: "10px 8px",
    textAlign: "left",
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: ".04em",
    borderBottom: `1px solid ${colors.border}`,
    background: colors.soft,
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "10px 8px",
    borderBottom: "1px solid #edf2f7",
    fontSize: 12,
    color: colors.text,
    verticalAlign: "middle",
  };

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 16,
          alignItems: "center",
          borderBottom: `1px solid ${colors.border}`,
          background:
            "linear-gradient(135deg, rgba(124,58,237,.13) 0%, rgba(255,255,255,1) 58%), #fff",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              background: "#7c3aed",
              boxShadow: "0 14px 28px rgba(124,58,237,.28)",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={23} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 950,
                color: "#7c3aed",
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              Calidad documental
            </div>
            <div style={{ fontWeight: 950, color: colors.navy, fontSize: 22, lineHeight: 1.1 }}>
              Certificados de calidad
            </div>
            <div style={{ color: colors.muted, fontSize: 12, marginTop: 4, fontWeight: 650 }}>
              Trazabilidad del recibo ciego por lote, con evidencia, vencimiento de gestion y estado.
            </div>
          </div>
        </div>
        <button
          onClick={loadRows}
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          padding: 14,
          borderBottom: `1px solid ${colors.border}`,
          background: "#fff",
        }}
      >
        <SummaryBox label="Total" value={stats.total} helper="Lotes recibidos" icon={FileText} tone="blue" />
        <SummaryBox label="Pendientes" value={stats.pendientes} helper="Dentro de 24 horas" icon={Clock} tone="amber" />
        <SummaryBox label="Completos" value={stats.completos} helper="Con evidencia" icon={CheckCircle2} tone="green" />
        <SummaryBox label="Vencidos" value={stats.vencidos} helper="Requieren gestion" icon={AlertTriangle} tone="red" />
      </div>

      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por lote, codigo, proveedor, documento..."
          style={{
            height: 38,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "0 12px",
            fontWeight: 700,
            outline: "none",
          }}
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          style={{
            height: 38,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "0 10px",
            fontWeight: 800,
            background: "#fff",
          }}
        >
          <option value="TODOS">Todos</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="VENCIDO">Vencido</option>
          <option value="COMPLETO">Completo</option>
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
          <thead>
            <tr>
              <th style={th}>Estado</th>
              <th style={th}>Fecha recibo</th>
              <th style={th}>Codigo</th>
              <th style={th}>Descripcion</th>
              <th style={th}>UM</th>
              <th style={th}>Lote proveedor</th>
              <th style={th}>Fabricacion</th>
              <th style={th}>Vencimiento</th>
              <th style={th}>Cantidad</th>
              <th style={th}>Recibo</th>
              <th style={th}>Certificado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ ...td, padding: 24, textAlign: "center", color: colors.muted }}>
                  No hay certificados para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const info = statusInfo(row);
                return (
                  <tr key={row.id || `${row.recibo_item}-${row.codigo_material}-${row.lote_proveedor}`}>
                    <td style={td}>
                      <Chip label={info.label} tone={info.tone} />
                    </td>
                    <td style={td}>{row.fecha_recibo || "-"}</td>
                    <td style={{ ...td, fontWeight: 900 }}>{row.codigo_material || "-"}</td>
                    <td style={{ ...td, maxWidth: 260 }}>{row.descripcion_material || "-"}</td>
                    <td style={td}>{row.unidad_medida || "-"}</td>
                    <td style={{ ...td, fontWeight: 900 }}>{row.lote_proveedor || "-"}</td>
                    <td style={td}>{row.fecha_fabricacion || "-"}</td>
                    <td style={td}>{row.fecha_vencimiento || "-"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 900 }}>{formatQty(row.cantidad)}</td>
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            kind: "recibo",
                            title: `Recibo ciego ${row.recibo_serial || row.documento || ""}`.trim(),
                            html: getReceiptPreviewHtml(row, filtered),
                          })
                        }
                        style={{
                          border: `1px solid ${colors.border}`,
                          background: "#fff",
                          borderRadius: 8,
                          height: 30,
                          padding: "0 9px",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Eye size={14} />
                        Ver
                      </button>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {row.certificado_data_url ? (
                          <button
                            type="button"
                            title="Ver certificado"
                            aria-label="Ver certificado"
                            onClick={() =>
                              setPreviewDoc({
                                kind: "certificado",
                                title: row.certificado_nombre || `Certificado ${row.lote_proveedor || row.codigo_material || ""}`.trim(),
                                name: row.certificado_nombre || "Certificado de calidad",
                                type: row.certificado_tipo,
                                dataUrl: row.certificado_data_url,
                              })
                            }
                            style={{
                              border: 0,
                              background: "transparent",
                              padding: 0,
                              fontWeight: 900,
                              color: colors.good,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        ) : (
                          <span style={{ color: colors.warn, fontWeight: 900 }}>Pendiente</span>
                        )}
                        <label
                          style={{
                            border: `1px solid ${colors.border}`,
                            background: "#fff",
                            borderRadius: 8,
                            height: 30,
                            padding: "0 9px",
                            fontWeight: 800,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Upload size={14} />
                          {savingId === String(row.id) ? "Subiendo..." : "Cargar"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            capture="environment"
                            onChange={(e) => onUpload(row, e.target.files?.[0])}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}

function FrescuraCard({ data }) {
  const stockActual = Number(data?.stock_actual || 0);
  const stockAlmacenado = Number(data?.stock_almacenado || 0);
  const stockEnTransito = Number(data?.stock_en_transito || 0);

  const diagnostico = useMemo(() => {
    if (!data) {
      return {
        label: "Sin consulta",
        tone: "neutral",
        text: "Consulta un material para analizar disponibilidad y condición operativa.",
      };
    }

    if (stockActual <= 0) {
      return {
        label: "Sin stock",
        tone: "red",
        text: "El material no presenta inventario disponible actualmente.",
      };
    }

    if (stockAlmacenado > 0 && stockEnTransito > 0) {
      return {
        label: "Reposición en curso",
        tone: "blue",
        text: "El material tiene stock disponible y adicionalmente cuenta con inventario en tránsito.",
      };
    }

    if (stockAlmacenado > 0) {
      return {
        label: "Disponible",
        tone: "green",
        text: "El material tiene inventario disponible en almacén para operación.",
      };
    }

    if (stockEnTransito > 0) {
      return {
        label: "Solo en tránsito",
        tone: "amber",
        text: "El material no está almacenado aún, pero existen unidades en tránsito.",
      };
    }

    return {
      label: "Sin visibilidad completa",
      tone: "neutral",
      text: "Se encontró información parcial del material.",
    };
  }, [data, stockActual, stockAlmacenado, stockEnTransito]);

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${colors.border}`,
          background: colors.soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: colors.navy,
            }}
          >
            Frescura / condición operativa
          </div>
          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              marginTop: 4,
            }}
          >
            Vista ejecutiva del material con enfoque WMS.
          </div>
        </div>

        <Chip label={diagnostico.label} tone={diagnostico.tone} />
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${
              diagnostico.tone === "green"
                ? colors.goodBd
                : diagnostico.tone === "red"
                ? colors.badBd
                : diagnostico.tone === "amber"
                ? colors.warnBd
                : colors.infoBd
            }`,
            background:
              diagnostico.tone === "green"
                ? colors.goodBg
                : diagnostico.tone === "red"
                ? colors.badBg
                : diagnostico.tone === "amber"
                ? colors.warnBg
                : colors.infoBg,
            padding: 14,
            color:
              diagnostico.tone === "green"
                ? colors.good
                : diagnostico.tone === "red"
                ? colors.bad
                : diagnostico.tone === "amber"
                ? colors.warn
                : colors.blue,
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {diagnostico.text}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <DataBox
            label="Nivel de cobertura"
            value={
              stockActual > 0
                ? stockAlmacenado > 0
                  ? "Cobertura inmediata"
                  : "Cobertura pendiente"
                : "Sin cobertura"
            }
          />
          <DataBox
            label="Condición logística"
            value={
              stockEnTransito > 0 && stockAlmacenado > 0
                ? "Mixta"
                : stockEnTransito > 0
                ? "En tránsito"
                : stockAlmacenado > 0
                ? "Almacenado"
                : "No disponible"
            }
          />
          <DataBox
            label="Frescura FEFO"
            value="Pendiente de backend por lote/vencimiento"
          />
          <DataBox
            label="Observación"
            value="Este módulo ya quedó preparado para mostrar lotes, vencimientos y alertas de rotación."
          />
        </div>
      </div>
    </div>
  );
}

export default function Stock() {
  const [activeTab, setActiveTab] = useState("");
  const [codigo, setCodigo] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const consultar = async () => {
    const cod = codigo.trim();
    if (!cod) {
      setErr("Debes escribir un código de material.");
      setData(null);
      return;
    }

    setErr("");
    setData(null);
    setLoading(true);

    try {
      const r = await getStock(cod);
      setData(r);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  const totalStock = Number(data?.stock_actual || 0);
  const stockAlmacenado = Number(data?.stock_almacenado || 0);
  const stockTransito = Number(data?.stock_en_transito || 0);

  return (
    <div
      style={{
        background: colors.bg,
        minHeight: "100%",
        display: "grid",
        gap: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${colors.border}`,
            background: colors.soft,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                fontWeight: 900,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Consulta
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.1,
                color: colors.navy,
              }}
            >
              Consulta operativa
            </div>

            <div
              style={{
                marginTop: 6,
                color: colors.muted,
                fontSize: 13,
              }}
            >
              Selecciona una consulta: inventario operativo o certificados de calidad del recibo ciego.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 10,
                border: `1px solid ${activeTab === "stock" ? colors.blue : colors.border}`,
                background: activeTab === "stock" ? colors.blue : "#fff",
                color: activeTab === "stock" ? "#fff" : colors.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Stock
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("certificados")}
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 10,
                border: `1px solid ${activeTab === "certificados" ? colors.blue : colors.border}`,
                background: activeTab === "certificados" ? colors.blue : "#fff",
                color: activeTab === "certificados" ? "#fff" : colors.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Certificados
            </button>
            {activeTab === "stock" && loading && <Chip label="Consultando..." tone="amber" />}
            {activeTab === "stock" && !loading && data && <Chip label="Consulta OK" tone="green" />}
            {activeTab === "stock" && err && <Chip label="Error de consulta" tone="red" />}
          </div>
        </div>

        {!activeTab && <ConsultaChoice activeTab={activeTab} onSelect={setActiveTab} />}

        {activeTab === "stock" && (
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr auto auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  fontWeight: 800,
                  marginBottom: 6,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                }}
              >
                Código material
              </div>

              <div style={{ position: "relative" }}>
                <PackageSearch
                  size={16}
                  color={colors.muted}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  placeholder="Ej: 421516"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") consultar();
                  }}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px 0 36px",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: "#fff",
                    fontWeight: 700,
                    color: colors.text,
                    outline: "none",
                    boxSizing: "border-box",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            <button
              onClick={consultar}
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid #0b57d0",
                background: "#0b57d0",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Search size={15} />
              Consultar
            </button>

            <button
              onClick={() => {
                setCodigo("");
                setData(null);
                setErr("");
                setLoading(false);
              }}
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                color: colors.text,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <RefreshCcw size={15} />
              Limpiar
            </button>
          </div>

          {err ? (
            <div
              style={{
                marginTop: 14,
                border: `1px solid ${colors.badBd}`,
                background: colors.badBg,
                color: colors.bad,
                borderRadius: 10,
                padding: 14,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          ) : null}
        </div>
        )}
      </div>

      {activeTab === "certificados" ? (
        <CertificadosCalidadView />
      ) : activeTab === "stock" ? (
        <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryBox
          label="Stock total"
          value={formatQty(totalStock)}
          helper="Inventario total del material"
          icon={Boxes}
          tone="blue"
        />
        <SummaryBox
          label="Stock almacenado"
          value={formatQty(stockAlmacenado)}
          helper="Disponible físicamente en ubicación"
          icon={Warehouse}
          tone="green"
        />
        <SummaryBox
          label="En tránsito"
          value={formatQty(stockTransito)}
          helper="Pendiente por ubicar o recibir"
          icon={Truck}
          tone="amber"
        />
        <SummaryBox
          label="Condición"
          value={
            !data
              ? "-"
              : totalStock <= 0
              ? "Crítico"
              : stockAlmacenado > 0
              ? "Operativo"
              : "Pendiente"
          }
          helper="Estado ejecutivo del inventario"
          icon={totalStock > 0 ? ShieldCheck : AlertTriangle}
          tone={!data ? "default" : totalStock <= 0 ? "red" : "green"}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 14,
        }}
      >
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${colors.border}`,
              background: colors.soft,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: colors.navy,
              }}
            >
              Ficha de material
            </div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                marginTop: 4,
              }}
            >
              Datos base del código consultado.
            </div>
          </div>

          <div style={{ padding: 16 }}>
            {!data ? (
              <div
                style={{
                  border: `1px dashed ${colors.border}`,
                  background: "#fbfcfe",
                  borderRadius: 10,
                  padding: 18,
                  color: colors.muted,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Consulta un material para visualizar su ficha operativa de stock.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                <DataBox label="Código" value={data.codigo} />
                <DataBox label="Unidad de medida" value={data.unidad_medida} />
                <DataBox label="Familia" value={data.familia} />
                <DataBox label="Descripción" value={data.descripcion} />
                <DataBox label="Stock actual" value={formatQty(data.stock_actual)} />
                <DataBox label="Stock almacenado" value={formatQty(data.stock_almacenado)} />
                <DataBox label="Stock en tránsito" value={formatQty(data.stock_en_transito)} />
                <DataBox
                  label="Balance operativo"
                  value={
                    Number(data.stock_actual || 0) > 0
                      ? "Con inventario"
                      : "Sin inventario"
                  }
                />
              </div>
            )}
          </div>
        </div>

        <FrescuraCard data={data} />
      </div>
        </>
      ) : null}
    </div>
  );
}



