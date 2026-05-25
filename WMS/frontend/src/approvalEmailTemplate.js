export const APPROVAL_EMAIL_FROM = "INOVA <no-reply@inova.app>";

export const APPROVAL_THEMES = {
  wms: {
    label: "WMS",
    primary: "#5b4ee6",
    secondary: "#7c3aed",
    soft: "#f1efff",
    line: "#dcd7ff",
    icon: "W",
  },
  "5s": {
    label: "5S",
    primary: "#2563eb",
    secondary: "#38bdf8",
    soft: "#eef6ff",
    line: "#cfe0ff",
    icon: "5S",
  },
  eto: {
    label: "ETO",
    primary: "#16a34a",
    secondary: "#22c55e",
    soft: "#eefdf4",
    line: "#bdf7d1",
    icon: "E",
  },
};

export function getApprovalTheme(pilar = "wms") {
  return APPROVAL_THEMES[String(pilar || "wms").toLowerCase()] || APPROVAL_THEMES.wms;
}

export function buildApprovalPayload({ solicitud, claveTemporal, empresa, rol, loginUrl }) {
  return {
    nombre: solicitud?.nombre_completo || solicitud?.nombre || "",
    email: solicitud?.email || "",
    empresa: empresa?.nombre || solicitud?.empresa_nombre || "",
    pilar: solicitud?.pilar || "wms",
    etoNivel: solicitud?.eto_nivel || null,
    rol: rol?.nombre || rol?.codigo || "",
    claveTemporal,
    loginUrl,
  };
}

export function buildApprovalEmailHtml(payload = {}) {
  const theme = getApprovalTheme(payload.pilar);
  const pilarLabel = `${theme.label}${payload.etoNivel ? ` - Nivel ${payload.etoNivel}` : ""}`;
  const safe = (value) => String(value ?? "");
  const row = (icon, label, value) => `
    <tr>
      <td style="width:46px;padding:13px 0;border-bottom:1px solid #e8eef7;">
        <span style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:999px;background:${theme.soft};color:${theme.primary};font-size:15px;font-weight:900;">${icon}</span>
      </td>
      <td style="padding:13px 0;border-bottom:1px solid #e8eef7;color:#526179;font-size:15px;">${label}:</td>
      <td style="padding:13px 0;border-bottom:1px solid #e8eef7;color:#071226;font-size:15px;font-weight:850;text-align:right;">${safe(value)}</td>
    </tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#071226;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.16);border:1px solid #e6edf7;">
            <tr>
              <td style="padding:28px 42px 0;text-align:center;background:linear-gradient(180deg,#ffffff 0%,${theme.soft} 100%);">
                <div style="font-size:58px;line-height:1;font-weight:950;letter-spacing:-.06em;color:#071226;">INOVA</div>
                <div style="height:70px;margin:20px -42px 0;border-bottom:1px solid ${theme.line};border-radius:0 0 50% 50%;position:relative;">
                  <div style="margin:0 auto;width:70px;height:70px;border-radius:999px;background:#ffffff;box-shadow:0 10px 28px rgba(15,23,42,.14);display:grid;place-items:center;border:1px solid #dbeafe;transform:translateY(34px);">
                    <span style="color:${theme.primary};font-size:38px;font-weight:900;">✓</span>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:52px 42px 12px;text-align:center;">
                <h1 style="margin:0;color:#071226;font-size:32px;line-height:1.1;font-weight:950;">¡Acceso aprobado!</h1>
                <div style="width:54px;height:3px;border-radius:999px;background:${theme.primary};margin:18px auto 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 42px 0;">
                <p style="margin:0 0 18px;color:#17213b;font-size:17px;line-height:1.45;">Hola ${safe(payload.nombre)},<br/>Tu acceso a INOVA fue aprobado.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${theme.line};border-radius:14px;padding:0 18px;background:#ffffff;">
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
                  <a href="${safe(payload.loginUrl || "https://inova-delta.vercel.app/login")}" style="display:inline-block;text-decoration:none;color:#ffffff;background:linear-gradient(135deg,${theme.primary},${theme.secondary});padding:15px 34px;border-radius:12px;font-size:16px;font-weight:900;box-shadow:0 12px 30px ${theme.primary}55;">Ingresar a INOVA →</a>
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
