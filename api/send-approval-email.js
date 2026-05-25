const FROM_EMAIL = process.env.APPROVAL_FROM_EMAIL || "INOVA <inova-2025@outlook.com>";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.APPROVAL_FROM_EMAIL || "INOVA <onboarding@resend.dev>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.office365.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "inova-2025@outlook.com";
const SMTP_PASS = process.env.SMTP_PASS || "";

const THEMES = {
  wms: {
    label: "WMS",
    primary: "#6d28d9",
    dark: "#2e1065",
    soft: "#f5f0ff",
    line: "#d8c7ff",
    logoUrl: "https://inova-delta.vercel.app/INOVA2026-wms.png",
  },
  "5s": {
    label: "5S",
    primary: "#2563eb",
    dark: "#0b2f73",
    soft: "#eef6ff",
    line: "#cfe0ff",
    logoUrl: "https://inova-delta.vercel.app/INOVA2026-5s.png",
  },
  eto: {
    label: "ETO",
    primary: "#16a34a",
    dark: "#064e3b",
    soft: "#eefdf4",
    line: "#bdf7d1",
    logoUrl: "https://inova-delta.vercel.app/INOVA2026-eto.png",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll("&#039;", "&apos;");
}

function cleanFilename(value) {
  return String(value || "usuario")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 64) || "usuario";
}

function pdfEscape(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function hexToRgb(hex) {
  const clean = String(hex || "#2563eb").replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  const int = Number.parseInt(value, 16);
  return {
    r: ((int >> 16) & 255) / 255,
    g: ((int >> 8) & 255) / 255,
    b: (int & 255) / 255,
  };
}

function pdfColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function buildApprovalCardPdf(payload) {
  const pilarKey = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilarKey] || THEMES.wms;
  const pilarLabel = `${theme.label}${payload.etoNivel ? ` - Nivel ${payload.etoNivel}` : ""}`;
  const loginUrl = String(payload.loginUrl || "https://inova-delta.vercel.app/login");
  const primary = pdfColor(theme.primary);
  const dark = pdfColor(theme.dark);
  const rows = [
    ["Empresa", payload.empresa],
    ["Pilar", pilarLabel],
    ["Rol", payload.rol],
    ["Usuario", payload.email],
    ["Contrasena temporal", payload.claveTemporal],
  ];
  const rowCommands = rows
    .map(([label, value], index) => {
      const y = 455 - index * 40;
      const valueFont = String(value || "").length > 24 ? 11 : 13;
      return `
0.965 0.973 0.992 rg
58 ${y - 14} 28 28 re f
${primary} rg
BT /F2 13 Tf 67 ${y - 3} Td (${index + 1}) Tj ET
0.318 0.380 0.475 rg
BT /F2 12 Tf 106 ${y} Td (${pdfEscape(label)}:) Tj ET
0.027 0.071 0.149 rg
BT /F1 ${valueFont} Tf 270 ${y} Td (${pdfEscape(value)}) Tj ET`;
    })
    .join("\n");

  const content = `
q
1 1 1 rg
36 36 540 720 re f
0.965 0.953 1 rg
36 600 540 156 re f
${primary} rg
BT /F3 44 Tf 178 666 Td (INOVA) Tj ET
0.027 0.071 0.149 rg
BT /F3 30 Tf 132 548 Td (!Acceso aprobado!) Tj ET
${primary} rg
260 528 92 4 re f
0.090 0.129 0.235 rg
BT /F1 14 Tf 58 500 Td (Hola ${pdfEscape(payload.nombre)},) Tj ET
BT /F1 14 Tf 58 480 Td (Tu acceso a INOVA fue aprobado.) Tj ET
0.996 0.996 1 rg
52 242 508 226 re f
${primary} RG
1 w
52 242 508 226 re S
${rowCommands}
0.933 0.957 1 rg
58 170 444 50 re f
0.122 0.165 0.263 rg
BT /F1 11 Tf 104 198 Td (Por seguridad, al ingresar por primera vez el sistema) Tj ET
BT /F1 11 Tf 104 182 Td (te pedira cambiar esta contrasena.) Tj ET
${dark} rg
176 105 260 46 re f
1 1 1 rg
BT /F2 15 Tf 244 124 Td (Ingresar a INOVA ->) Tj ET
${primary} rg
BT /F1 11 Tf 160 82 Td (${pdfEscape(loginUrl)}) Tj ET
0.027 0.071 0.149 rg
BT /F1 13 Tf 238 58 Td (Bienvenido a) Tj ET
BT /F2 13 Tf 334 58 Td (INOVA) Tj ET
Q`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R /Annots [8 0 R] >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>",
    `<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`,
    `<< /Type /Annot /Subtype /Link /Rect [176 105 436 151] /Border [0 0 0] /A << /S /URI /URI (${pdfEscape(loginUrl)}) >> >>`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function buildApprovalCardSvg(payload) {
  const pilarKey = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilarKey] || THEMES.wms;
  const pilarLabel = `${theme.label}${payload.etoNivel ? ` - Nivel ${escapeXml(payload.etoNivel)}` : ""}`;
  const loginUrl = String(payload.loginUrl || "https://inova-delta.vercel.app/login");
  const logoUrl = String(payload.logoUrl || theme.logoUrl);
  const rows = [
    ["Empresa", payload.empresa],
    ["Pilar", pilarLabel],
    ["Rol", payload.rol],
    ["Usuario", payload.email],
    ["Contrasena temporal", payload.claveTemporal],
  ];

  const rowSvg = rows
    .map((row, index) => {
      const y = 365 + index * 54;
      return `
        <circle cx="92" cy="${y - 11}" r="18" fill="${theme.soft}" stroke="${theme.line}" />
        <text x="92" y="${y - 4}" text-anchor="middle" font-size="17" font-family="Arial" fill="${theme.primary}" font-weight="800">${index + 1}</text>
        <text x="128" y="${y - 5}" font-size="18" font-family="Arial, sans-serif" fill="#526179">${escapeXml(row[0])}:</text>
        <text x="252" y="${y - 5}" font-size="18" font-family="Arial, sans-serif" fill="#071226" font-weight="800">${escapeXml(row[1])}</text>
        ${index < rows.length - 1 ? `<line x1="128" y1="${y + 17}" x2="478" y2="${y + 17}" stroke="#e8eef7" />` : ""}`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="780" viewBox="0 0 560 780">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
    <filter id="glow">
      <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="${theme.primary}" flood-opacity="0.28"/>
    </filter>
    <linearGradient id="top" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="${theme.soft}"/>
    </linearGradient>
    <linearGradient id="button" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.dark}"/>
      <stop offset="1" stop-color="${theme.primary}"/>
    </linearGradient>
    <radialGradient id="cornerLeft" cx="0" cy="1" r="0.65">
      <stop offset="0" stop-color="${theme.line}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cornerRight" cx="1" cy="1" r="0.65">
      <stop offset="0" stop-color="${theme.line}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="10" width="532" height="752" rx="22" fill="#ffffff" filter="url(#shadow)" />
  <clipPath id="cardClip"><rect x="14" y="10" width="532" height="752" rx="22"/></clipPath>
  <g clip-path="url(#cardClip)">
    <rect x="14" y="10" width="532" height="752" fill="#ffffff"/>
    <rect x="14" y="10" width="532" height="160" fill="url(#top)"/>
    <path d="M14 142 C150 186 410 186 546 142" fill="none" stroke="${theme.line}" stroke-width="1.2"/>
    <circle cx="82" cy="62" r="2.4" fill="${theme.primary}" opacity=".8"/>
    <circle cx="118" cy="88" r="1.8" fill="${theme.primary}" opacity=".5"/>
    <circle cx="478" cy="64" r="2.4" fill="${theme.primary}" opacity=".8"/>
    <circle cx="446" cy="92" r="1.8" fill="${theme.primary}" opacity=".5"/>
    <image href="${escapeXml(logoUrl)}" x="118" y="34" width="324" height="96" preserveAspectRatio="xMidYMid meet" filter="url(#glow)"/>
    <circle cx="280" cy="163" r="42" fill="#ffffff" stroke="#dbeafe" filter="url(#shadow)" />
    <text x="280" y="181" text-anchor="middle" font-size="48" font-family="Arial, sans-serif" fill="${theme.primary}" font-weight="900">✓</text>
    <text x="280" y="262" text-anchor="middle" font-size="38" font-family="Arial, sans-serif" fill="#071226" font-weight="900">¡Acceso aprobado!</text>
    <rect x="252" y="285" width="56" height="4" rx="2" fill="${theme.primary}"/>
    <text x="58" y="333" font-size="18" font-family="Arial, sans-serif" fill="#17213b">Hola ${escapeXml(payload.nombre)},</text>
    <text x="58" y="357" font-size="18" font-family="Arial, sans-serif" fill="#17213b">Tu acceso a INOVA fue aprobado.</text>
    <rect x="58" y="382" width="444" height="232" rx="14" fill="#ffffff" stroke="${theme.line}" />
    ${rowSvg}
    <rect x="58" y="630" width="444" height="54" rx="12" fill="#eef4ff"/>
    <text x="94" y="653" font-size="21" font-family="Arial" fill="${theme.primary}">▣</text>
    <text x="128" y="650" font-size="13" font-family="Arial, sans-serif" fill="#1f2a44">Por seguridad, al ingresar por primera vez el sistema</text>
    <text x="128" y="669" font-size="13" font-family="Arial, sans-serif" fill="#1f2a44">te pedira cambiar esta contrasena.</text>
    <a href="${escapeXml(loginUrl)}" target="_blank">
      <rect x="160" y="704" width="240" height="48" rx="12" fill="url(#button)" filter="url(#glow)" />
      <text x="270" y="735" text-anchor="middle" font-size="17" font-family="Arial, sans-serif" fill="#ffffff" font-weight="900">Ingresar a INOVA</text>
      <text x="368" y="735" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" fill="#ffffff">→</text>
    </a>
    <rect x="14" y="640" width="190" height="122" fill="url(#cornerLeft)" opacity=".42"/>
    <rect x="356" y="640" width="190" height="122" fill="url(#cornerRight)" opacity=".42"/>
  </g>
</svg>`;
}

function approvalTemplate(payload, imageSource = "cid:approval-card") {
  const pilarKey = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilarKey] || THEMES.wms;
  const loginUrl = String(payload.loginUrl || "https://inova-delta.vercel.app/login");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#071226;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;border:1px solid #e6edf7;box-shadow:0 22px 60px rgba(15,23,42,.14);">
            <tr>
              <td style="padding:20px;text-align:center;">
                <a href="${escapeHtml(loginUrl)}" style="display:inline-block;text-decoration:none;border:0;">
                  <img src="${escapeHtml(imageSource)}" width="560" alt="Acceso aprobado INOVA" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:18px;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 22px;text-align:center;">
                <a href="${escapeHtml(loginUrl)}" style="display:inline-block;color:#ffffff;background:${theme.primary};padding:13px 24px;border-radius:12px;text-decoration:none;font-weight:800;">Abrir link de entrada</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function approvalSummaryTemplate(payload) {
  const pilarKey = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilarKey] || THEMES.wms;
  const pilarLabel = `${theme.label}${payload.etoNivel ? ` - Nivel ${escapeHtml(payload.etoNivel)}` : ""}`;
  const loginUrl = String(payload.loginUrl || "https://inova-delta.vercel.app/login");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#071226;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;border:1px solid #e6edf7;box-shadow:0 18px 45px rgba(15,23,42,.12);">
            <tr><td style="padding:28px 34px;text-align:center;">
              <h1 style="margin:0;color:#071226;font-size:30px;">&iexcl;Acceso aprobado!</h1>
              <p style="margin:14px 0 0;color:#526179;font-size:16px;">Hola ${escapeHtml(payload.nombre)}, tu acceso a INOVA fue aprobado.</p>
              <div style="margin:22px 0;padding:16px;border:1px solid ${theme.line};border-radius:14px;text-align:left;">
                <p><strong>Empresa:</strong> ${escapeHtml(payload.empresa)}</p>
                <p><strong>Pilar:</strong> ${pilarLabel}</p>
                <p><strong>Rol:</strong> ${escapeHtml(payload.rol)}</p>
                <p><strong>Usuario:</strong> ${escapeHtml(payload.email)}</p>
                <p><strong>Contrase&ntilde;a temporal:</strong> ${escapeHtml(payload.claveTemporal)}</p>
              </div>
              <p style="color:#526179;">La tarjeta visual de bienvenida va adjunta en PNG.</p>
              <a href="${escapeHtml(loginUrl)}" style="display:inline-block;color:#ffffff;background:${theme.primary};padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:800;">Ingresar a INOVA</a>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).send("ok");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!payload.email || !payload.claveTemporal) {
    return res.status(400).json({ error: "Faltan email o contrasena temporal." });
  }

  const pilar = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilar] || THEMES.wms;
  const cardPng = payload.cardPngBase64 ? Buffer.from(String(payload.cardPngBase64).replace(/^data:image\/png;base64,/, ""), "base64") : null;
  const attachmentBase = `acceso-aprobado-${cleanFilename(payload.nombre || payload.email)}`;
  if (!cardPng || cardPng.length < 1024) {
    return res.status(400).json({
      error: "No se recibio la tarjeta PNG de aprobacion. Abre la vista previa y vuelve a enviar.",
    });
  }

  if (RESEND_API_KEY) {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [payload.email],
        subject: `Acceso aprobado a INOVA ${theme.label}`,
        html: approvalSummaryTemplate(payload),
        attachments: [
          {
            filename: `${attachmentBase}.png`,
            content: cardPng.toString("base64"),
            content_type: "image/png",
            content_id: "approval-card-png",
          },
        ],
      }),
    });

    const text = await resendResponse.text();
    if (!resendResponse.ok) return res.status(resendResponse.status).send(text);
    return res.status(200).send(text);
  }

  if (SMTP_PASS) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const result = await transporter.sendMail({
      from: FROM_EMAIL,
      to: payload.email,
      subject: `Acceso aprobado a INOVA ${theme.label}`,
      html: approvalSummaryTemplate(payload),
      attachments: [
        {
          filename: `${attachmentBase}.png`,
          content: cardPng,
          contentType: "image/png",
          cid: "approval-card-png",
        },
      ],
    });

    return res.status(200).json({ ok: true, provider: "outlook-smtp", messageId: result.messageId });
  }

  return res.status(500).json({
    error: "Falta RESEND_API_KEY para enviar con adjuntos automaticos o SMTP_PASS para Outlook.",
  });
}
