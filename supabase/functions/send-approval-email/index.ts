const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("APPROVAL_FROM_EMAIL") || "INOVA <notificaciones@inova.app>";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const THEMES = {
  wms: {
    label: "WMS",
    primary: "#5b4ee6",
    secondary: "#8b5cf6",
    soft: "#f1efff",
    icon: "▣",
  },
  "5s": {
    label: "5S",
    primary: "#2563eb",
    secondary: "#38bdf8",
    soft: "#eef6ff",
    icon: "✓",
  },
  eto: {
    label: "ETO",
    primary: "#16a34a",
    secondary: "#22c55e",
    soft: "#eefdf4",
    icon: "◆",
  },
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function approvalTemplate(payload: Record<string, unknown>) {
  const pilarKey = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilarKey as keyof typeof THEMES] || THEMES.wms;
  const pilarLabel = `${theme.label}${payload.etoNivel ? ` - Nivel ${escapeHtml(payload.etoNivel)}` : ""}`;
  const loginUrl = String(payload.loginUrl || "https://inova-delta.vercel.app/login");

  const row = (icon: string, label: string, value: unknown) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e8eef7;width:48px;">
        <span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:12px;background:${theme.soft};color:${theme.primary};font-size:18px;font-weight:900;">${icon}</span>
      </td>
      <td style="padding:16px 0;border-bottom:1px solid #e8eef7;color:#526179;font-size:15px;">${label}:</td>
      <td style="padding:16px 0;border-bottom:1px solid #e8eef7;color:#111827;font-size:15px;font-weight:800;text-align:right;">${escapeHtml(value)}</td>
    </tr>`;

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.16);border:1px solid #e6edf7;">
            <tr>
              <td style="padding:34px 42px 18px;text-align:center;background:linear-gradient(180deg,#ffffff 0%,${theme.soft} 100%);border-bottom:1px solid #dbeafe;">
                <div style="font-size:54px;line-height:1;font-weight:950;letter-spacing:-.05em;color:#071226;">
                  <span style="color:${theme.primary};font-weight:950;">◖</span>INOVA
                </div>
                <div style="margin:28px auto 0;width:72px;height:72px;border-radius:999px;background:#ffffff;box-shadow:0 10px 28px rgba(15,23,42,.14);display:grid;place-items:center;border:1px solid #dbeafe;">
                  <span style="color:${theme.primary};font-size:38px;font-weight:900;">✓</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 42px 12px;text-align:center;">
                <h1 style="margin:0;color:#071226;font-size:32px;line-height:1.1;font-weight:950;">¡Acceso aprobado!</h1>
                <div style="width:54px;height:3px;border-radius:999px;background:${theme.primary};margin:18px auto 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 42px 0;">
                <p style="margin:0 0 18px;color:#17213b;font-size:17px;line-height:1.45;">Hola ${escapeHtml(payload.nombre)},<br/>Tu acceso a INOVA fue aprobado.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cfe0ff;border-radius:14px;padding:0 18px;background:#ffffff;">
                  ${row("🏢", "Empresa", payload.empresa)}
                  ${row(theme.icon, "Pilar", pilarLabel)}
                  ${row("👤", "Rol", payload.rol)}
                  ${row("✉", "Usuario", payload.email)}
                  ${row("🔒", "Contraseña temporal", payload.claveTemporal)}
                </table>
                <div style="margin-top:14px;display:flex;gap:12px;align-items:center;background:#eef4ff;border-radius:12px;padding:14px 16px;color:#1f2a44;">
                  <span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#ffffff;color:${theme.primary};font-weight:900;">🛡</span>
                  <span style="font-size:14px;line-height:1.4;">Por seguridad, al ingresar por primera vez el sistema te pedirá cambiar esta contraseña.</span>
                </div>
                <div style="text-align:center;margin:22px 0 12px;">
                  <a href="${escapeHtml(loginUrl)}" style="display:inline-block;text-decoration:none;color:#ffffff;background:linear-gradient(135deg,${theme.primary},${theme.secondary});padding:15px 34px;border-radius:12px;font-size:16px;font-weight:900;box-shadow:0 12px 30px ${theme.primary}55;">Ingresar a INOVA →</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 42px 30px;text-align:center;color:#64748b;font-size:14px;">
                <div style="height:1px;background:#e8eef7;margin-bottom:14px;"></div>
                Bienvenido a <strong style="color:#071226;letter-spacing:.08em;">INOVA</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  if (!RESEND_API_KEY) {
    return new Response("RESEND_API_KEY no está configurada.", { status: 500, headers: CORS_HEADERS });
  }

  const payload = await req.json();
  if (!payload?.email || !payload?.claveTemporal) {
    return new Response("Faltan email o contraseña temporal.", { status: 400, headers: CORS_HEADERS });
  }

  const pilar = String(payload.pilar || "wms").toLowerCase();
  const theme = THEMES[pilar as keyof typeof THEMES] || THEMES.wms;
  const html = approvalTemplate(payload);

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

  const result = await resendResponse.text();
  if (!resendResponse.ok) {
    return new Response(result, { status: resendResponse.status, headers: CORS_HEADERS });
  }

  return new Response(result, {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
