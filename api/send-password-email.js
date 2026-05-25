const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "INOVA <onboarding@resend.dev>";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

const THEMES = {
  wms: { label: "WMS", primary: "#6d28d9", dark: "#2e1065", soft: "#f5f0ff", line: "#d8c7ff" },
  "5s": { label: "5S", primary: "#2563eb", dark: "#0b2f73", soft: "#eef6ff", line: "#cfe0ff" },
  eto: { label: "ETO", primary: "#16a34a", dark: "#064e3b", soft: "#eefdf4", line: "#bdf7d1" },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildShell({ title, subtitle, body, buttonText, buttonUrl, pilar }) {
  const theme = THEMES[String(pilar || "wms").toLowerCase()] || THEMES.wms;
  const safeUrl = escapeHtml(buttonUrl || "https://inova-delta.vercel.app/login");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif;color:#071226;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,${theme.soft} 0,#f4f6fb 45%,#eef2f8 100%);padding:28px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:570px;background:#ffffff;border-radius:22px;border:1px solid ${theme.line};box-shadow:0 24px 70px rgba(15,23,42,.16);overflow:hidden;">
            <tr>
              <td style="padding:30px 34px;text-align:center;background:linear-gradient(135deg,#ffffff,${theme.soft});border-bottom:1px solid ${theme.line};">
                <div style="font-size:42px;font-weight:950;letter-spacing:.03em;color:${theme.primary};text-shadow:0 14px 30px ${theme.primary}33;">INOVA</div>
                <div style="margin:14px auto 0;width:68px;height:68px;border-radius:999px;background:#ffffff;border:1px solid ${theme.line};box-shadow:0 12px 32px rgba(15,23,42,.14);line-height:68px;color:${theme.primary};font-size:38px;font-weight:900;">&#10003;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 38px;text-align:left;">
                <h1 style="margin:0;text-align:center;font-size:30px;line-height:1.12;color:#071226;">${escapeHtml(title)}</h1>
                <div style="width:60px;height:3px;background:${theme.primary};border-radius:999px;margin:16px auto 22px;"></div>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#526179;text-align:center;">${escapeHtml(subtitle)}</p>
                <div style="border:1px solid ${theme.line};border-radius:16px;background:#ffffff;padding:18px 20px;color:#17213b;font-size:15px;line-height:1.55;">
                  ${body}
                </div>
                <div style="margin:24px 0 8px;text-align:center;">
                  <a href="${safeUrl}" style="display:inline-block;text-decoration:none;color:#ffffff;background:linear-gradient(135deg,${theme.dark},${theme.primary});padding:14px 30px;border-radius:12px;font-size:15px;font-weight:900;box-shadow:0 12px 30px ${theme.primary}55;">${escapeHtml(buttonText)} &rarr;</a>
                </div>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.45;color:#64748b;text-align:center;">Si no solicitaste esta acción, informa de inmediato a la super administración de INOVA.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function resetTemplate(payload) {
  const body = `
    <p style="margin:0 0 12px;"><strong>Hola ${escapeHtml(payload.nombre || "usuario")},</strong></p>
    <p style="margin:0 0 12px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta INOVA.</p>
    <p style="margin:0;">Este enlace es válido por <strong>${escapeHtml(payload.expiresMinutes || 30)} minutos</strong>. Después de ese tiempo deberás solicitar uno nuevo.</p>
  `;
  return buildShell({
    title: "Restablecer contraseña",
    subtitle: "Usa el botón para crear una nueva contraseña de forma segura.",
    body,
    buttonText: "Restablecer contraseña",
    buttonUrl: payload.resetUrl,
    pilar: payload.pilar,
  });
}

function changedTemplate(payload) {
  const body = `
    <p style="margin:0 0 12px;"><strong>Hola ${escapeHtml(payload.nombre || "usuario")},</strong></p>
    <p style="margin:0 0 12px;">La contraseña de tu cuenta INOVA acaba de cambiar.</p>
    <p style="margin:0;">Si fuiste tú, puedes ignorar este correo. Si no reconoces este cambio, solicita bloqueo o recuperación inmediata.</p>
  `;
  return buildShell({
    title: "Tu contraseña ha cambiado",
    subtitle: "Notificación de seguridad de tu cuenta INOVA.",
    body,
    buttonText: "Ingresar a INOVA",
    buttonUrl: payload.loginUrl || "https://inova-delta.vercel.app/login",
    pilar: payload.pilar,
  });
}

function temporaryTemplate(payload) {
  const body = `
    <p style="margin:0 0 12px;"><strong>Hola ${escapeHtml(payload.nombre || "usuario")},</strong></p>
    <p style="margin:0 0 12px;">Generamos una contraseña temporal para que recuperes el acceso a INOVA.</p>
    <p style="margin:0 0 12px;">Usuario: <strong>${escapeHtml(payload.email)}</strong></p>
    <p style="margin:0;">Contraseña temporal: <strong>${escapeHtml(payload.claveTemporal)}</strong></p>
  `;
  return buildShell({
    title: "Recuperación de acceso",
    subtitle: "Ingresa con esta contraseña temporal. El sistema te pedirá cambiarla al entrar.",
    body,
    buttonText: "Ingresar a INOVA",
    buttonUrl: payload.loginUrl || "https://inova-delta.vercel.app/login",
    pilar: payload.pilar,
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).send("ok");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!RESEND_API_KEY) return res.status(500).json({ error: "Falta RESEND_API_KEY." });

  const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!payload.email) return res.status(400).json({ error: "Falta email." });

  const type = String(payload.type || "reset").toLowerCase();
  const theme = THEMES[String(payload.pilar || "wms").toLowerCase()] || THEMES.wms;
  const html = type === "changed"
    ? changedTemplate(payload)
    : type === "temporary"
      ? temporaryTemplate(payload)
      : resetTemplate(payload);
  const subject = type === "changed"
    ? `INOVA - Tu contraseña ha cambiado ${theme.label}`
    : type === "temporary"
      ? `INOVA - Recuperación de acceso ${theme.label}`
      : `INOVA - Restablecer contraseña ${theme.label}`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [payload.email],
      subject,
      html,
    }),
  });

  const text = await resendResponse.text();
  if (!resendResponse.ok) return res.status(resendResponse.status).send(text);
  return res.status(200).send(text);
}
