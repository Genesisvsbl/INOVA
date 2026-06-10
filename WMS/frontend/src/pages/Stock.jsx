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
  Download,
  Plus,
  Bell,
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
  purple: "#6d28d9",
  purple2: "#7c3aed",
  purpleSoft: "#f5f0ff",
  purpleBd: "#d9c7ff",
};

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatQty(n) {
  const x = Number(n || 0);
  return fmtCO.format(x);
}

function normalizeKey(value) {
  return String(value ?? "").trim().toUpperCase();
}

function pct(part, total) {
  const base = Number(total || 0);
  if (!base) return 0;
  return Math.round((Number(part || 0) / base) * 100);
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
            <div class="receipt-subtitle">Formato de recepciÃ³n y trazabilidad de ingreso</div>
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
        <div class="summary-card"><div class="summary-label">LÃ­neas</div><div class="summary-value">${receiptLines.length}</div></div>
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
            <th>#</th><th>Item</th><th>Fecha recepciÃ³n</th><th>CÃ³digo</th><th>DescripciÃ³n</th><th>UM</th><th>Cantidad</th><th>Lote proveedor</th><th>FabricaciÃ³n</th><th>Vencimiento</th><th>Certificado</th>
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


function AppNoticeModal({ notice, onClose }) {
  if (!notice) return null;
  const palette =
    {
      success: { bg: "#ecfdf3", border: "#bbf7d0", color: colors.good, mark: <CheckCircle2 size={24} /> },
      error: { bg: "#fef2f2", border: "#fecaca", color: colors.bad, mark: <AlertTriangle size={24} /> },
      warn: { bg: "#fffbeb", border: "#fed7aa", color: colors.warn, mark: <AlertTriangle size={24} /> },
      info: { bg: "#eff6ff", border: "#bfdbfe", color: colors.blue, mark: <FileText size={24} /> },
    }[notice.tone || "info"] || { bg: "#eff6ff", border: "#bfdbfe", color: colors.blue, mark: <FileText size={24} /> };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", padding: 18 }}>
      <div role="dialog" aria-modal="true" style={{ width: "min(520px, 94vw)", borderRadius: 22, background: "#fff", border: `1px solid ${colors.border}`, boxShadow: "0 28px 70px rgba(15,23,42,.25)", overflow: "hidden" }}>
        <div style={{ padding: 22, display: "flex", gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center", background: palette.bg, border: `1px solid ${palette.border}`, color: palette.color, flexShrink: 0 }}>
            {palette.mark}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 950, color: palette.color, letterSpacing: ".12em", textTransform: "uppercase" }}>{notice.kicker || "WMS INOVA"}</div>
            <div style={{ marginTop: 5, fontSize: 22, fontWeight: 950, color: colors.navy }}>{notice.title || "Mensaje"}</div>
            <div style={{ marginTop: 8, color: colors.muted, fontSize: 14, lineHeight: 1.45, fontWeight: 650, whiteSpace: "pre-line" }}>{notice.message || ""}</div>
          </div>
        </div>
        <div style={{ padding: "0 22px 22px", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" autoFocus onClick={onClose} style={{ height: 42, minWidth: 118, borderRadius: 13, border: 0, background: `linear-gradient(135deg, ${colors.blue}, ${colors.purple})`, color: "#fff", fontWeight: 950, cursor: "pointer" }}>
            {notice.confirmText || "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CertificadosCalidadView() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [materialQ, setMaterialQ] = useState("");
  const [proveedorQ, setProveedorQ] = useState("");
  const [loteQ, setLoteQ] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [vida, setVida] = useState("TODOS");
  const [loading, setLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockIndex, setStockIndex] = useState({});
  const [savingId, setSavingId] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [notice, setNotice] = useState(null);

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

  useEffect(() => {
    const codes = Array.from(new Set(rows.map((row) => normalizeKey(row.codigo_material)).filter(Boolean)));
    let active = true;
    if (!codes.length) {
      setStockIndex({});
      return () => {
        active = false;
      };
    }

    setStockLoading(true);
    Promise.all(
      codes.map(async (code) => {
        try {
          const data = await getStock(code);
          const qty = Number(data?.stock_actual ?? data?.stock_total ?? data?.cantidad ?? 0);
          return [code, Number.isFinite(qty) ? qty : 0];
        } catch {
          return [code, 0];
        }
      })
    )
      .then((entries) => {
        if (active) setStockIndex(Object.fromEntries(entries));
      })
      .finally(() => {
        if (active) setStockLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rows]);

  const rowsWithLife = useMemo(
    () => rows.map((row) => ({ ...row, vidaDias: daysUntil(row.fecha_vencimiento) })),
    [rows]
  );

  const hasStock = (row) => Number(stockIndex[normalizeKey(row.codigo_material)] || 0) > 0;

  const rowsWithStock = useMemo(
    () => rowsWithLife.filter((row) => hasStock(row)),
    [rowsWithLife, stockIndex]
  );

  const filtered = useMemo(() => {
    const query = normalizeKey(q);
    const material = normalizeKey(materialQ);
    const supplier = normalizeKey(proveedorQ);
    const lot = normalizeKey(loteQ);

    return rowsWithLife.filter((row) => {
      const status = statusInfo(row);
      const globalHaystack = normalizeKey([
        row.recibo_serial,
        row.codigo_material,
        row.descripcion_material,
        row.lote_proveedor,
        row.proveedor,
        row.documento,
        row.unidad_medida,
        row.estado_certificado,
      ].join(" "));
      const materialHaystack = normalizeKey([
        row.codigo_material,
        row.descripcion_material,
        row.unidad_medida,
        row.categoria,
        row.tipo_material,
      ].join(" "));
      const supplierHaystack = normalizeKey([row.proveedor, row.proveedor_nombre, row.documento].join(" "));
      const lotHaystack = normalizeKey([row.lote_proveedor, row.recibo_serial, row.codigo_material].join(" "));

      const matchQuery = !query || globalHaystack.includes(query);
      const matchMaterial = !material || materialHaystack.includes(material);
      const matchSupplier = !supplier || supplierHaystack.includes(supplier);
      const matchLot = !lot || lotHaystack.includes(lot);
      const matchStatus = estado === "TODOS" || status.label.toUpperCase() === estado;
      const matchVida =
        vida === "TODOS" ||
        (vida === "VENCIDO" && row.vidaDias < 0) ||
        (vida === "30" && row.vidaDias >= 0 && row.vidaDias <= 30) ||
        (vida === "60" && row.vidaDias > 30 && row.vidaDias <= 60) ||
        (vida === "OK" && row.vidaDias > 60);

      return matchQuery && matchMaterial && matchSupplier && matchLot && matchStatus && matchVida;
    });
  }, [rowsWithLife, q, materialQ, proveedorQ, loteQ, estado, vida]);

  const stats = useMemo(() => {
    const total = rowsWithLife.length;
    const completos = rowsWithLife.filter((row) => statusInfo(row).label === "Completo").length;
    const pendientes = rowsWithLife.filter((row) => statusInfo(row).label !== "Completo").length;
    const vencidosGestion = rowsWithLife.filter((row) => statusInfo(row).label === "Vencido").length;
    const uniqueMaterials = new Set(rowsWithLife.map((row) => normalizeKey(row.codigo_material)).filter(Boolean)).size;
    const suppliers = new Set(rowsWithLife.map((row) => normalizeKey(row.proveedor)).filter(Boolean)).size;

    const stockScope = rowsWithStock.reduce(
      (acc, row) => {
        if (row.vidaDias < 0) acc.expired += 1;
        else if (row.vidaDias <= 30) acc.v30 += 1;
        else if (row.vidaDias <= 60) acc.v60 += 1;
        else acc.vOk += 1;
        if (statusInfo(row).label === "Completo") acc.completeStock += 1;
        return acc;
      },
      { expired: 0, v30: 0, v60: 0, vOk: 0, completeStock: 0 }
    );

    return {
      total,
      completos,
      pendientes,
      vencidosGestion,
      uniqueMaterials,
      suppliers,
      conStock: rowsWithStock.length,
      documentalPct: pct(completos, total),
      trazabilidadPct: pct(stockScope.completeStock, rowsWithStock.length),
      ...stockScope,
    };
  }, [rowsWithLife, rowsWithStock]);

  const monthStats = useMemo(() => {
    const map = new Map();
    rowsWithStock.forEach((row) => {
      if (!row.fecha_vencimiento) return;
      const d = new Date(`${row.fecha_vencimiento}T00:00:00`);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toLocaleDateString("es-CO", { month: "short" });
      const item = map.get(key) || { label: key, v30: 0, v60: 0, vOk: 0 };
      if (row.vidaDias >= 0 && row.vidaDias <= 30) item.v30 += 1;
      else if (row.vidaDias > 30 && row.vidaDias <= 60) item.v60 += 1;
      else if (row.vidaDias > 60) item.vOk += 1;
      map.set(key, item);
    });
    return Array.from(map.values()).slice(0, 6);
  }, [rowsWithStock]);

  const activeAlerts = useMemo(() => {
    const alerts = [];
    if (stats.expired) alerts.push({ tone: "red", title: `${stats.expired} lotes vencidos con stock`, helper: "Gestion inmediata" });
    if (stats.v30) alerts.push({ tone: "red", title: `${stats.v30} lotes vencen en 0-30 dias`, helper: "Requieren atencion" });
    if (stats.v60) alerts.push({ tone: "orange", title: `${stats.v60} lotes vencen en 31-60 dias`, helper: "Atencion recomendada" });
    if (stats.pendientes) alerts.push({ tone: "blue", title: `${stats.pendientes} certificados sin evidencia completa`, helper: "Seguimiento documental" });
    return alerts.slice(0, 4);
  }, [stats]);

  const handleUpload = async (row, file) => {
    if (!file) return;
    setSavingId(row.id);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await actualizarCertificadoCalidad(row.id, { certificado_data_url: dataUrl, estado_certificado: "COMPLETO" });
      setNotice({ tone: "success", title: "Certificado actualizado", message: "La evidencia quedo anexada y disponible para vista previa." });
      await loadRows();
    } catch (error) {
      setNotice({ tone: "error", title: "No se pudo cargar", message: error?.message || "Revisa el archivo e intenta de nuevo." });
    } finally {
      setSavingId("");
    }
  };

  const openReceiptPreview = (row) => {
    const html = getReceiptPreviewHtml(row, rowsWithLife);
    setPreviewDoc({ title: `Recibo ciego ${row.recibo_serial || row.documento || ""}`, html });
  };

  const openCertificatePreview = (row) => {
    if (!row.certificado_data_url) {
      setNotice({ tone: "info", title: "Certificado pendiente", message: "Este lote todavia no tiene evidencia anexada." });
      return;
    }
    setPreviewDoc({
      title: `Certificado ${row.lote_proveedor || row.codigo_material || ""}`,
      src: row.certificado_data_url,
      type: row.certificado_mime || "image",
    });
  };

  const clearFilters = () => {
    setQ("");
    setMaterialQ("");
    setProveedorQ("");
    setLoteQ("");
    setEstado("TODOS");
    setVida("TODOS");
  };

  const inputStyle = {
    height: 42,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: "0 12px",
    fontWeight: 850,
    color: colors.text,
    background: "#fff",
    outline: "none",
    minWidth: 0,
  };

  const actionButton = {
    height: 42,
    borderRadius: 12,
    border: `1px solid ${colors.purpleBd}`,
    background: "#fff",
    color: colors.text,
    fontWeight: 950,
    padding: "0 14px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  };

  const maxMonth = Math.max(1, ...monthStats.flatMap((item) => [item.v30, item.v60, item.vOk]));
  const distributionTotal = Math.max(1, stats.expired + stats.v30 + stats.v60 + stats.vOk);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: `1px solid ${colors.purpleBd}`,
          borderRadius: 20,
          background: "linear-gradient(135deg, #ffffff 0%, #f7f2ff 42%, #ffffff 100%)",
          boxShadow: "0 18px 40px rgba(79, 70, 229, .10)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 22, display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 950, color: colors.navy }}>Trazabilidad de Materiales</div>
            <div style={{ marginTop: 7, color: colors.muted, fontSize: 14, fontWeight: 650 }}>
              Seguimiento de lotes, vencimientos y certificados de calidad anexados desde recibo ciego.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" style={actionButton} onClick={() => setNotice({ tone: "info", title: "Exportacion preparada", message: "La exportacion se conectara con Excel/PDF para calidad." })}>
              <Download size={16} /> Exportar
            </button>
            <button type="button" style={actionButton} onClick={() => setNotice({ tone: "info", title: "Notificaciones", message: "Las alertas se generan con base en certificados de materiales que tienen stock." })}>
              <Bell size={16} /> Alertas
            </button>
            <button
              type="button"
              style={{ ...actionButton, border: 0, background: `linear-gradient(135deg, ${colors.purple}, ${colors.blue})`, color: "#fff" }}
              onClick={() => setNotice({ tone: "info", title: "Nuevo certificado", message: "Carga el certificado desde el recibo ciego o desde la accion de la tabla." })}
            >
              <Plus size={16} /> Nuevo certificado
            </button>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${colors.purpleBd}`, padding: 18, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.1fr 1.1fr .9fr .9fr .8fr", gap: 12, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 950, color: colors.purple, letterSpacing: ".09em", textTransform: "uppercase" }}>Material</span>
              <input value={materialQ} onChange={(e) => setMaterialQ(e.target.value)} placeholder="Codigo o descripcion" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 950, color: colors.purple, letterSpacing: ".09em", textTransform: "uppercase" }}>Proveedor</span>
              <input value={proveedorQ} onChange={(e) => setProveedorQ(e.target.value)} placeholder="Proveedor" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 950, color: colors.purple, letterSpacing: ".09em", textTransform: "uppercase" }}>Lote / Codigo</span>
              <input value={loteQ} onChange={(e) => setLoteQ(e.target.value)} placeholder="Lote o recibo" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 950, color: colors.purple, letterSpacing: ".09em", textTransform: "uppercase" }}>Vida util</span>
              <select value={vida} onChange={(e) => setVida(e.target.value)} style={inputStyle}>
                <option value="TODOS">Todos</option>
                <option value="30">0-30 dias</option>
                <option value="60">31-60 dias</option>
                <option value="OK">+60 dias</option>
                <option value="VENCIDO">Vencido</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 950, color: colors.purple, letterSpacing: ".09em", textTransform: "uppercase" }}>Estado</span>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
                <option value="TODOS">Todos</option>
                <option value="COMPLETO">Completo</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="VENCIDO">Vencido</option>
              </select>
            </label>
            <button
              type="button"
              onClick={clearFilters}
              style={{ ...actionButton, justifyContent: "center", background: colors.purpleSoft, color: colors.purple }}
            >
              Limpiar
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.muted, fontSize: 13, fontWeight: 750 }}>
            <ShieldCheck size={17} color={colors.purple} />
            Alertas calculadas solo sobre certificados cuyo material tiene stock activo. Tabla completa: {filtered.length} registros.
            {stockLoading ? " Validando stock..." : ""}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
        <SummaryBox label="Total lotes" value={stats.total} helper="Certificados registrados" icon={Boxes} tone="blue" />
        <SummaryBox label="Con stock" value={stats.conStock} helper="Base para alertas" icon={Warehouse} tone="default" />
        <SummaryBox label="0-30 dias" value={stats.v30} helper="Requieren atencion" icon={AlertTriangle} tone="red" />
        <SummaryBox label="31-60 dias" value={stats.v60} helper="Atencion recomendada" icon={Clock} tone="amber" />
        <SummaryBox label="+60 dias" value={stats.vOk} helper="En condicion normal" icon={CheckCircle2} tone="green" />
        <SummaryBox label="Vencidos" value={stats.expired} helper="Gestion inmediata" icon={AlertTriangle} tone="red" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.05fr", gap: 14 }}>
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 16, background: "#fff", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 950, color: colors.navy, textTransform: "uppercase", letterSpacing: ".05em" }}>Distribucion por vencimiento</div>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "150px 1fr", gap: 18, alignItems: "center" }}>
            <div
              style={{
                width: 136,
                height: 136,
                borderRadius: "50%",
                background: `conic-gradient(${colors.bad} 0 ${pct(stats.expired, distributionTotal)}%, #ef4444 ${pct(stats.expired, distributionTotal)}% ${pct(stats.expired + stats.v30, distributionTotal)}%, #f59e0b ${pct(stats.expired + stats.v30, distributionTotal)}% ${pct(stats.expired + stats.v30 + stats.v60, distributionTotal)}%, #22c55e ${pct(stats.expired + stats.v30 + stats.v60, distributionTotal)}% 100%)`,
                display: "grid",
                placeItems: "center",
              }}
            >
              <div style={{ width: 82, height: 82, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", textAlign: "center", color: colors.navy, fontWeight: 950 }}>
                <span>{stats.conStock}</span>
                <small style={{ display: "block", color: colors.muted }}>stock</small>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, fontWeight: 850, color: colors.text }}>
              <Legend color={colors.bad} label="Vencidos" value={stats.expired} />
              <Legend color="#ef4444" label="0-30 dias" value={stats.v30} />
              <Legend color="#f59e0b" label="31-60 dias" value={stats.v60} />
              <Legend color="#22c55e" label="+60 dias" value={stats.vOk} />
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 16, background: "#fff", padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 950, color: colors.navy, textTransform: "uppercase", letterSpacing: ".05em" }}>Vencimientos por mes</div>
          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
            {monthStats.length ? monthStats.map((item) => (
              <div key={item.label} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 950, color: colors.muted, textTransform: "capitalize" }}>{item.label}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, alignItems: "end", height: 42 }}>
                  <Bar value={item.v30} max={maxMonth} color="#ef4444" />
                  <Bar value={item.v60} max={maxMonth} color="#f59e0b" />
                  <Bar value={item.vOk} max={maxMonth} color="#22c55e" />
                </div>
              </div>
            )) : <EmptyMini text="Sin vencimientos con stock para graficar." />}
          </div>
        </div>

        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 16, background: "#fff", padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 950, color: colors.navy, textTransform: "uppercase", letterSpacing: ".05em" }}>Alertas activas</div>
            <button type="button" style={{ border: 0, background: "transparent", color: colors.purple, fontWeight: 950, cursor: "pointer" }}>Ver todas</button>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {activeAlerts.length ? activeAlerts.map((alert) => (
              <div key={alert.title} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 12, background: colors.soft }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: alert.tone === "red" ? colors.badBg : alert.tone === "orange" ? colors.warnBg : colors.infoBg }}>
                  <AlertTriangle size={18} color={alert.tone === "red" ? colors.bad : alert.tone === "orange" ? colors.warn : colors.blue} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 950, color: colors.text }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: colors.muted, fontWeight: 750 }}>{alert.helper}</div>
                </div>
              </div>
            )) : <EmptyMini text="Sin alertas activas para materiales con stock." />}
          </div>
        </div>
      </div>

      <div style={{ border: `1px solid ${colors.border}`, borderRadius: 16, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 950, color: colors.purple, fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" }}>Lista de materiales</div>
            <div style={{ color: colors.muted, fontWeight: 650, marginTop: 3 }}>Certificados, recibos y evidencias por lote.</div>
          </div>
          <button onClick={loadRows} style={{ ...actionButton, width: "auto" }}>{loading ? "Actualizando..." : "Actualizar"}</button>
        </div>
        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 210px 92px", gap: 10, borderBottom: `1px solid ${colors.border}` }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la tabla..." style={inputStyle} />
          <select value={estado} onChange={(e) => setEstado(e.target.value)} style={inputStyle}>
            <option value="TODOS">Todas las columnas</option>
            <option value="COMPLETO">Completos</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="VENCIDO">Vencidos</option>
          </select>
          <div style={{ height: 42, border: `1px solid ${colors.border}`, borderRadius: 12, display: "grid", placeItems: "center", fontWeight: 950, color: colors.navy }}>{filtered.length}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180 }}>
            <thead>
              <tr style={{ background: "#f6f9fc", color: colors.text }}>
                {[
                  "Estado",
                  "Fecha recibo",
                  "Codigo",
                  "Descripcion",
                  "UM",
                  "Lote proveedor",
                  "Fabricacion",
                  "Vencimiento",
                  "Vida restante",
                  "Cantidad",
                  "Recibo",
                  "Certificado",
                ].map((h) => (
                  <th key={h} style={{ padding: "11px 12px", textAlign: "left", fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase", borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const status = statusInfo(row);
                const vidaTone = row.vidaDias < 0 ? "red" : row.vidaDias <= 30 ? "red" : row.vidaDias <= 60 ? "orange" : "green";
                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid #eef2f6` }}>
                    <td style={{ padding: 12 }}><Chip label={status.label} tone={status.tone} /></td>
                    <td style={{ padding: 12, fontWeight: 800 }}>{row.fecha_recibo || "-"}</td>
                    <td style={{ padding: 12, fontWeight: 900 }}>{row.codigo_material || "-"}</td>
                    <td style={{ padding: 12, fontWeight: 850, color: colors.text }}>{row.descripcion_material || "-"}</td>
                    <td style={{ padding: 12, fontWeight: 850 }}>{row.unidad_medida || "-"}</td>
                    <td style={{ padding: 12, fontWeight: 850 }}>{row.lote_proveedor || "-"}</td>
                    <td style={{ padding: 12 }}>{row.fecha_fabricacion || "-"}</td>
                    <td style={{ padding: 12, fontWeight: 850 }}>{row.fecha_vencimiento || "-"}</td>
                    <td style={{ padding: 12 }}><Chip label={row.vidaDias == null ? "Sin fecha" : row.vidaDias < 0 ? `${Math.abs(row.vidaDias)} dias vencido` : `${row.vidaDias} dias`} tone={vidaTone} /></td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{formatQty(row.cantidad)}</td>
                    <td style={{ padding: 12 }}>
                      <button onClick={() => openReceiptPreview(row)} style={{ ...actionButton, height: 34, padding: "0 10px", borderColor: colors.border }}><Eye size={15} /> Ver</button>
                    </td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={() => openCertificatePreview(row)}
                          title="Ver certificado"
                          aria-label="Ver certificado"
                          style={{ ...actionButton, width: 36, height: 34, padding: 0, justifyContent: "center", color: row.certificado_data_url ? colors.good : colors.muted }}
                        >
                          <Eye size={15} />
                        </button>
                        <label style={{ ...actionButton, height: 34, padding: "0 10px", cursor: savingId === row.id ? "wait" : "pointer" }}>
                          <Upload size={15} /> {savingId === row.id ? "..." : "Cargar"}
                          <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={(e) => handleUpload(row, e.target.files?.[0])} />
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={12} style={{ padding: 28, textAlign: "center", color: colors.muted, fontWeight: 900 }}>
                    No hay certificados para los filtros seleccionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ border: `1px solid ${colors.purpleBd}`, borderRadius: 16, background: "#fff", padding: 16, display: "grid", gridTemplateColumns: "repeat(5, 1fr) 48px", gap: 12, alignItems: "center" }}>
        <FooterMetric label="Materiales unicos" value={stats.uniqueMaterials} />
        <FooterMetric label="Proveedores activos" value={stats.suppliers} />
        <FooterMetric label="Certificados con evidencia" value={`${stats.completos} (${stats.documentalPct}%)`} />
        <FooterMetric label="Sin evidencia" value={`${stats.pendientes} (${pct(stats.pendientes, stats.total)}%)`} />
        <FooterMetric label="Trazabilidad con stock" value={`${stats.trazabilidadPct}%`} />
        <button type="button" onClick={loadRows} style={{ width: 42, height: 42, borderRadius: 13, border: 0, background: colors.purpleSoft, color: colors.purple, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <RefreshCcw size={18} />
        </button>
      </div>

      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      <AppNoticeModal notice={notice} onClose={() => setNotice(null)} />
    </div>
  );
}

function Legend({ color, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: "inline-block" }} />
      <span style={{ flex: 1 }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Bar({ value, max, color }) {
  const height = Math.max(5, Math.round((Number(value || 0) / Math.max(1, max)) * 38));
  return <div title={String(value)} style={{ alignSelf: "end", height, borderRadius: "7px 7px 2px 2px", background: color, opacity: value ? 1 : 0.18 }} />;
}

function EmptyMini({ text }) {
  return <div style={{ border: `1px dashed ${colors.border}`, borderRadius: 13, padding: 14, color: colors.muted, fontWeight: 850 }}>{text}</div>;
}

function FooterMetric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: colors.muted, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 18, color: colors.navy, fontWeight: 950 }}>{value}</div>
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
        text: "Consulta un material para analizar disponibilidad y condiciÃ³n operativa.",
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
        label: "ReposiciÃ³n en curso",
        tone: "blue",
        text: "El material tiene stock disponible y adicionalmente cuenta con inventario en trÃ¡nsito.",
      };
    }

    if (stockAlmacenado > 0) {
      return {
        label: "Disponible",
        tone: "green",
        text: "El material tiene inventario disponible en almacÃ©n para operaciÃ³n.",
      };
    }

    if (stockEnTransito > 0) {
      return {
        label: "Solo en trÃ¡nsito",
        tone: "amber",
        text: "El material no estÃ¡ almacenado aÃºn, pero existen unidades en trÃ¡nsito.",
      };
    }

    return {
      label: "Sin visibilidad completa",
      tone: "neutral",
      text: "Se encontrÃ³ informaciÃ³n parcial del material.",
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
            Frescura / condiciÃ³n operativa
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
            label="CondiciÃ³n logÃ­stica"
            value={
              stockEnTransito > 0 && stockAlmacenado > 0
                ? "Mixta"
                : stockEnTransito > 0
                ? "En trÃ¡nsito"
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
            label="ObservaciÃ³n"
            value="Este mÃ³dulo ya quedÃ³ preparado para mostrar lotes, vencimientos y alertas de rotaciÃ³n."
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
      setErr("Debes escribir un cÃ³digo de material.");
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
              Selecciona una consulta para trabajar inventario o trazabilidad documental.
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
                CÃ³digo material
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
          helper="Disponible fÃ­sicamente en ubicaciÃ³n"
          icon={Warehouse}
          tone="green"
        />
        <SummaryBox
          label="En trÃ¡nsito"
          value={formatQty(stockTransito)}
          helper="Pendiente por ubicar o recibir"
          icon={Truck}
          tone="amber"
        />
        <SummaryBox
          label="CondiciÃ³n"
          value={
            !data
              ? "-"
              : totalStock <= 0
              ? "CrÃ­tico"
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
              Datos base del cÃ³digo consultado.
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
                <DataBox label="CÃ³digo" value={data.codigo} />
                <DataBox label="Unidad de medida" value={data.unidad_medida} />
                <DataBox label="Familia" value={data.familia} />
                <DataBox label="DescripciÃ³n" value={data.descripcion} />
                <DataBox label="Stock actual" value={formatQty(data.stock_actual)} />
                <DataBox label="Stock almacenado" value={formatQty(data.stock_almacenado)} />
                <DataBox label="Stock en trÃ¡nsito" value={formatQty(data.stock_en_transito)} />
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





