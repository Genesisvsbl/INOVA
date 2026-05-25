export const APPROVAL_EMAIL_FROM = "INOVA <no-reply@inova.app>";
export const APPROVAL_LOGIN_URL = "https://inova-delta.vercel.app/login";
export const APPROVAL_LOGO_URL = "https://inova-delta.vercel.app/INOVA2026.png";

export const APPROVAL_THEMES = {
  wms: {
    label: "WMS",
    primary: "#6d28d9",
    secondary: "#a78bfa",
    dark: "#2e1065",
    soft: "#f5f0ff",
    line: "#d8c7ff",
    glow: "rgba(109,40,217,.28)",
    logoUrl: "/INOVA2026-wms.png",
  },
  "5s": {
    label: "5S",
    primary: "#2563eb",
    secondary: "#38bdf8",
    dark: "#06245f",
    soft: "#eef6ff",
    line: "#cfe0ff",
    glow: "rgba(37,99,235,.24)",
    logoUrl: "/INOVA2026-5s.png",
  },
  eto: {
    label: "ETO",
    primary: "#16a34a",
    secondary: "#22c55e",
    dark: "#064e3b",
    soft: "#eefdf4",
    line: "#bdf7d1",
    glow: "rgba(22,163,74,.24)",
    logoUrl: "/INOVA2026-eto.png",
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
    loginUrl: loginUrl || APPROVAL_LOGIN_URL,
    logoUrl: null,
  };
}

export function buildApprovalEmailHtml(payload = {}) {
  const theme = getApprovalTheme(payload.pilar);
  const pilarLabel = `${theme.label}${payload.etoNivel ? ` - Nivel ${payload.etoNivel}` : ""}`;
  const safe = (value) => String(value ?? "");
  const rawLogoUrl = safe(payload.logoUrl || theme.logoUrl || APPROVAL_LOGO_URL);
  const logoUrl =
    rawLogoUrl.startsWith("/") && typeof window !== "undefined"
      ? `${window.location.origin}${rawLogoUrl}`
      : rawLogoUrl;
  const loginUrl = safe(payload.loginUrl || APPROVAL_LOGIN_URL);
  const row = (icon, label, value) => `
    <tr>
      <td style="width:48px;padding:12px 0;border-bottom:1px solid #e8eef7;">
        <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:999px;background:${theme.soft};color:${theme.primary};font-size:16px;font-weight:900;">${icon}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #e8eef7;color:#526179;font-size:16px;">${label}:</td>
      <td style="padding:12px 0;border-bottom:1px solid #e8eef7;color:#071226;font-size:16px;font-weight:900;text-align:right;">${safe(value)}</td>
    </tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#071226;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at top,${theme.soft} 0,#f4f6fb 42%,#eef2f8 100%);padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 28px 75px rgba(15,23,42,.20),0 0 0 1px ${theme.line};border:1px solid #e6edf7;">
            <tr>
              <td style="padding:30px 42px 0;text-align:center;background:#ffffff;background-image:radial-gradient(circle at 15% 16%,${theme.primary} 0 2px,transparent 3px),radial-gradient(circle at 11% 28%,${theme.secondary} 0 1px,transparent 2px),radial-gradient(circle at 20% 35%,${theme.secondary} 0 1px,transparent 2px),radial-gradient(circle at 86% 16%,${theme.primary} 0 2px,transparent 3px),radial-gradient(circle at 91% 28%,${theme.secondary} 0 1px,transparent 2px),radial-gradient(circle at 80% 35%,${theme.secondary} 0 1px,transparent 2px),linear-gradient(135deg,#ffffff 0%,${theme.soft} 58%,#ffffff 100%);">
                <img src="${logoUrl}" width="306" alt="INOVA" style="display:block;margin:0 auto;max-width:306px;width:78%;height:auto;border:0;filter:drop-shadow(0 18px 30px ${theme.glow});" />
                <div style="height:72px;margin:20px -42px 0;border-bottom:1px solid ${theme.line};border-radius:0 0 52% 52%;position:relative;background:linear-gradient(180deg,rgba(255,255,255,0),${theme.soft});">
                  <div style="margin:0 auto;width:74px;height:74px;border-radius:999px;background:#ffffff;box-shadow:0 10px 28px rgba(15,23,42,.16),0 0 0 9px ${theme.soft};border:1px solid ${theme.line};transform:translateY(35px);text-align:center;line-height:74px;">
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
                <p style="margin:0 0 18px;color:#17213b;font-size:17px;line-height:1.45;">Hola ${safe(payload.nombre)},<br/>Tu acceso a INOVA fue aprobado.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${theme.line};border-radius:14px;padding:0 18px;background:#ffffff;">
                  ${row("&#127970;", "Empresa", payload.empresa)}
                  ${row("&#9670;", "Pilar", pilarLabel)}
                  ${row("&#128100;", "Rol", payload.rol)}
                  ${row("&#9993;", "Usuario", payload.email)}
                  ${row("&#128274;", "Contrase&ntilde;a temporal", payload.claveTemporal)}
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;background:linear-gradient(135deg,${theme.soft},#f8fbff);border-radius:12px;">
                  <tr>
                    <td style="width:54px;padding:14px 0 14px 16px;color:${theme.primary};font-size:24px;">&#128737;</td>
                    <td style="padding:14px 16px 14px 0;color:#1f2a44;font-size:14px;line-height:1.4;">Por seguridad, al ingresar por primera vez el sistema te pedir&aacute; cambiar esta contrase&ntilde;a.</td>
                  </tr>
                </table>
                <div style="text-align:center;margin:22px 0 12px;">
                  <a href="${loginUrl}" style="display:inline-block;text-decoration:none;color:#ffffff;background:linear-gradient(135deg,${theme.dark},${theme.primary});padding:15px 38px;border-radius:12px;font-size:16px;font-weight:900;box-shadow:0 12px 30px ${theme.primary}66;">Ingresar a INOVA&nbsp;&nbsp;&#8594;</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 42px 30px;text-align:center;color:${theme.primary};font-size:18px;background-image:radial-gradient(circle at 8% 76%,${theme.primary} 0 1px,transparent 2px),radial-gradient(circle at 12% 84%,${theme.secondary} 0 1px,transparent 2px),radial-gradient(circle at 92% 76%,${theme.primary} 0 1px,transparent 2px),radial-gradient(circle at 88% 84%,${theme.secondary} 0 1px,transparent 2px),radial-gradient(circle at bottom left,${theme.soft} 0,transparent 34%),radial-gradient(circle at bottom right,${theme.soft} 0,transparent 34%);">
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





