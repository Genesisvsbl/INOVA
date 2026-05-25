const FROM_EMAIL = process.env.APPROVAL_FROM_EMAIL || "INOVA <inova-2025@outlook.com>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.office365.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "inova-2025@outlook.com";
const SMTP_PASS = process.env.SMTP_PASS || "";

const THEMES = {
  wms: { label: "WMS", primary: "#5b4ee6", soft: "#f1efff", line: "#dcd7ff" },
  "5s": { label: "5S", primary: "#2563eb", soft: "#eef6ff", line: "#cfe0ff" },
  eto: { label: "ETO", primary: "#16a34a", soft: "#eefdf4", line: "#bdf7d1" },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function approvalTemplate(payload) {
  const pilarKey = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilarKey] || THEMES.wms;
  const pilarLabel = `${theme.label}${payload.etoNivel ? ` - Nivel ${escapeHtml(payload.etoNivel)}` : ""}`;
  const loginUrl = String(payload.loginUrl || "https://inova-delta.vercel.app/login");
  const logoUrl = String(payload.logoUrl || "https://inova-delta.vercel.app/INOVA2026.png");
  const row = (icon, label, value) => `
    <tr>
      <td style="width:48px;padding:12px 0;border-bottom:1px solid #e8eef7;">
        <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:999px;background:${theme.soft};color:${theme.primary};font-size:16px;font-weight:900;">${icon}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #e8eef7;color:#526179;font-size:16px;">${label}:</td>
      <td style="padding:12px 0;border-bottom:1px solid #e8eef7;color:#071226;font-size:16px;font-weight:900;text-align:right;">${escapeHtml(value)}</td>
    </tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#071226;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.18);border:1px solid #e6edf7;">
            <tr>
              <td style="padding:28px 42px 0;text-align:center;background:#ffffff;background-image:radial-gradient(circle at 12% 20%,${theme.soft} 0 2px,transparent 3px),radial-gradient(circle at 88% 18%,${theme.soft} 0 2px,transparent 3px);">
                <img src="${escapeHtml(logoUrl)}" width="270" alt="INOVA" style="display:block;margin:0 auto;max-width:270px;width:70%;height:auto;border:0;" />
                <div style="height:72px;margin:20px -42px 0;border-bottom:1px solid ${theme.line};border-radius:0 0 52% 52%;position:relative;">
                  <div style="margin:0 auto;width:74px;height:74px;border-radius:999px;background:#ffffff;box-shadow:0 10px 28px rgba(15,23,42,.16);border:1px solid #dbeafe;transform:translateY(35px);text-align:center;line-height:74px;">
                    <span style="color:${theme.primary};font-size:40px;font-weight:900;">&#10003;</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:54px 42px 12px;text-align:center;">
                <h1 style="margin:0;color:#071226;font-size:34px;line-height:1.1;font-weight:950;">&iexcl;Acceso aprobado!</h1>
                <div style="width:56px;height:3px;border-radius:999px;background:${theme.primary};margin:18px auto 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 42px 0;">
                <p style="margin:0 0 18px;color:#17213b;font-size:17px;line-height:1.45;">Hola ${escapeHtml(payload.nombre)},<br/>Tu acceso a INOVA fue aprobado.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${theme.line};border-radius:14px;padding:0 18px;background:#ffffff;">
                  ${row("&#127970;", "Empresa", payload.empresa)}
                  ${row("&#9670;", "Pilar", pilarLabel)}
                  ${row("&#128100;", "Rol", payload.rol)}
                  ${row("&#9993;", "Usuario", payload.email)}
                  ${row("&#128274;", "Contrase&ntilde;a temporal", payload.claveTemporal)}
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;background:#eef4ff;border-radius:12px;">
                  <tr>
                    <td style="width:54px;padding:14px 0 14px 16px;color:${theme.primary};font-size:24px;">&#128737;</td>
                    <td style="padding:14px 16px 14px 0;color:#1f2a44;font-size:14px;line-height:1.4;">Por seguridad, al ingresar por primera vez el sistema te pedir&aacute; cambiar esta contrase&ntilde;a.</td>
                  </tr>
                </table>
                <div style="text-align:center;margin:22px 0 12px;">
                  <a href="${escapeHtml(loginUrl)}" style="display:inline-block;text-decoration:none;color:#ffffff;background:linear-gradient(135deg,#001b4f,${theme.primary});padding:15px 38px;border-radius:12px;font-size:16px;font-weight:900;box-shadow:0 12px 30px ${theme.primary}55;">Ingresar a INOVA&nbsp;&nbsp;&#8594;</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 42px 30px;text-align:center;color:#2563eb;font-size:18px;">
                <div style="height:1px;background:#e8eef7;margin-bottom:14px;"></div>
                Bienvenido a&nbsp; <strong style="color:#071226;letter-spacing:.04em;">INOVA</strong>
              </td>
            </tr>
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
  const html = approvalTemplate(payload);

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
      html,
    });

    return res.status(200).json({ ok: true, provider: "outlook-smtp", messageId: result.messageId });
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({
      error: "Falta SMTP_PASS para enviar desde Outlook o RESEND_API_KEY para enviar por Resend.",
    });
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [payload.email],
      subject: `Acceso aprobado a INOVA ${theme.label}`,
      html,
    }),
  });

  const text = await resendResponse.text();
  if (!resendResponse.ok) return res.status(resendResponse.status).send(text);
  return res.status(200).send(text);
}
