import {
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
  supabaseKey,
  supabaseUrl,
  updateById,
} from "./supabaseRest";
import { APPROVAL_LOGIN_URL, buildApprovalEmailHtml, buildApprovalPayload } from "./approvalEmailTemplate";

const LEGACY_ADMIN_PERMISSIONS = [
  "usuarios.ver",
  "usuarios.crear",
  "usuarios.editar",
  "usuarios.bloquear",
  "usuarios.activar",
  "roles.ver",
  "roles.crear",
  "roles.editar",
  "auditoria.ver",
  "admin.usuarios.ver",
  "admin.usuarios.gestionar",
  "admin.roles.gestionar",
  "admin.solicitudes.gestionar",
  "admin.empresas.gestionar",
  "wms.ver",
  "wms.operar",
  "5s.ver",
  "5s.operar",
  "eto.ver",
  "eto.nivel1",
  "eto.nivel2",
];

const PLATFORM_ADMIN_PERMISSIONS = [
  "admin.usuarios.ver",
  "admin.usuarios.gestionar",
  "admin.roles.gestionar",
  "admin.solicitudes.gestionar",
  "admin.empresas.gestionar",
  "admin.planes.gestionar",
  "auditoria.ver",
];

function roleKey(value) {
  return String(value || "").toUpperCase().trim();
}

function isPlatformAdminRole(role) {
  return ["ADMIN_INOVA", "INOVA_ADMIN", "ADMIN_PLATAFORMA", "PLATFORM_ADMIN"].includes(roleKey(role));
}

function isTenantSuperAdminRole(role) {
  return roleKey(role) === "SUPER_ADMIN";
}

function eq(value) {
  return `eq.${value}`;
}

function clean(value) {
  return String(value || "").trim();
}

function isMissingColumnError(error) {
  const message = String(error?.message || "");
  return message.includes("PGRST204") || message.includes("42703") || message.includes("schema cache");
}

function withoutPasswordFlags(payload) {
  const next = { ...payload };
  delete next.debe_cambiar_clave;
  delete next.fecha_cambio_clave;
  delete next.clave_temporal_generada_en;
  delete next.login_intentos_fallidos;
  delete next.login_bloqueado_hasta;
  delete next.reset_token;
  delete next.reset_token_expira_en;
  delete next.reset_solicitado_en;
  return next;
}

async function saveUsuario(row, existingId = null) {
  try {
    return existingId
      ? (await updateById("public", "usuarios", existingId, row))[0]
      : (await insertRow("public", "usuarios", row))[0];
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;
    const fallback = withoutPasswordFlags(row);
    return existingId
      ? (await updateById("public", "usuarios", existingId, fallback))[0]
      : (await insertRow("public", "usuarios", fallback))[0];
  }
}

export function generarClaveTemporal(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const value = new Uint32Array(1);
      crypto.getRandomValues(value);
      return alphabet[value[0] % alphabet.length];
    }
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }).join("");
}

function abrirOutlookLocal(payload) {
  if (typeof window === "undefined" || !payload?.email) return false;
  const pilar = String(payload.pilar || "wms").toUpperCase();
  const nivel = payload.etoNivel ? ` - Nivel ${payload.etoNivel}` : "";
  const subject = `INOVA - Acceso aprobado ${pilar}`;
  const body = [
    `Hola ${payload.nombre || ""},`,
    "",
    "Tu acceso a INOVA fue aprobado.",
    "",
    `Empresa: ${payload.empresa || ""}`,
    `Pilar: ${pilar}${nivel}`,
    `Rol: ${payload.rol || ""}`,
    `Usuario: ${payload.email || ""}`,
    `Contrasena temporal: ${payload.claveTemporal || ""}`,
    "",
    "Por seguridad, al ingresar por primera vez el sistema te pedira cambiar esta contrasena.",
    "",
    `Ingresar a INOVA: ${payload.loginUrl || APPROVAL_LOGIN_URL}`,
    "",
    "Bienvenido a INOVA",
  ].join("\n");
  const mailto = `mailto:${encodeURIComponent(payload.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
  return true;
}

async function generarTarjetaAprobacionPng(payload) {
  if (typeof window === "undefined" || typeof document === "undefined") return "";
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "640px";
  iframe.style.height = "920px";
  iframe.style.border = "0";
  iframe.srcdoc = buildApprovalEmailHtml(payload);
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      setTimeout(resolve, 900);
    });
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc?.body) return "";
    await Promise.all(
      Array.from(doc.images || []).map((img) =>
        img.complete ? Promise.resolve() : new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          setTimeout(resolve, 900);
        })
      )
    );
    const { default: html2canvas } = await import("html2canvas");
    const target = doc.body.querySelector("table") || doc.body;
    const canvas = await html2canvas(target, {
      backgroundColor: "#f4f6fb",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL("image/png").split(",")[1] || "";
  } catch (error) {
    console.warn("No se pudo generar PNG de aprobacion:", error);
    return "";
  } finally {
    iframe.remove();
  }
}

export async function enviarCorreoAprobacion({ solicitud, claveTemporal, empresa, rol }) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase no estÃ¡ configurado.");
  const payload = buildApprovalPayload({
    solicitud,
    claveTemporal,
    empresa,
    rol,
    loginUrl: APPROVAL_LOGIN_URL,
  });
  payload.cardPngBase64 = await generarTarjetaAprobacionPng(payload);
  const endpoints = [
    {
      url: `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-approval-email`,
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    },
    {
      url: "https://inova-delta.vercel.app/api/send-approval-email",
      headers: { "Content-Type": "application/json" },
    },
  ];

  const errors = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: endpoint.headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) return response.json().catch(() => ({ ok: true }));
      errors.push(await response.text());
    } catch (error) {
      errors.push(error?.message || String(error));
    }
  }

  if (abrirOutlookLocal(payload)) return { ok: true, provider: "outlook-local" };
  throw new Error(errors.filter(Boolean).join(" | ") || "No se pudo enviar correo automatico.");
}

function normalizeEmailError(error) {
  const message = String(error?.message || error || "");
  if (message.includes("SMTP_PASS") || message.includes("SMTP_USER") || message.includes("SMTP_HOST")) {
    return "Correo automatico pendiente: falta configurar la clave SMTP del buzon inova-2025@outlook.com en Vercel para que Outlook permita el envio automatico.";
  }
  if (message === "Failed to fetch" || message.includes("Failed to fetch")) {
    return "Correo automatico no disponible: no respondio el endpoint de correo de INOVA. El sistema ya intenta enviar por Vercel/Outlook.";
  }
  if (message.includes("RESEND_API_KEY")) {
    return "Correo automatico pendiente: falta configurar RESEND_API_KEY o SMTP_PASS en Vercel para enviar desde INOVA.";
  }
  if (message.includes("domain is not verified") || message.includes("verify a domain")) {
    return "Correo automatico pendiente: el dominio remitente no esta verificado para envio automatico.";
  }
  return message || "No se pudo enviar el correo automatico.";
}

const PASSWORD_SECURITY_MIGRATION_MESSAGE =
  "Falta aplicar la migracion 20260525093000_password_recovery_security.sql en Supabase para activar recuperacion y bloqueo de contrasenas.";

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function minutesUntil(dateValue) {
  const diff = new Date(dateValue).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / 60000));
}

function localLoginKey(login) {
  return `inova_login_security_${String(login || "").toLowerCase()}`;
}

function getLocalLoginState(login) {
  if (typeof localStorage === "undefined") return { attempts: 0, blockedUntil: "" };
  try {
    return JSON.parse(localStorage.getItem(localLoginKey(login)) || "{}") || { attempts: 0, blockedUntil: "" };
  } catch {
    return { attempts: 0, blockedUntil: "" };
  }
}

function setLocalLoginState(login, value) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(localLoginKey(login), JSON.stringify(value || {}));
}

function clearLocalLoginState(login) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(localLoginKey(login));
}

function ensureLocalLoginAllowed(login) {
  const state = getLocalLoginState(login);
  if (state.blockedUntil && new Date(state.blockedUntil).getTime() > Date.now()) {
    throw new Error(`Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutesUntil(state.blockedUntil)} minutos.`);
  }
}

function registerLocalLoginFailure(login) {
  const state = getLocalLoginState(login);
  const attempts = Number(state.attempts || 0) + 1;
  if (attempts >= 4) {
    const blockedUntil = addMinutes(new Date(), 30).toISOString();
    setLocalLoginState(login, { attempts: 0, blockedUntil });
    throw new Error("Cuenta bloqueada por 30 minutos por 4 intentos fallidos.");
  }
  setLocalLoginState(login, { attempts, blockedUntil: "" });
  throw new Error(`Credenciales incorrectas. Intentos restantes: ${4 - attempts}.`);
}

async function updateUsuarioSecurity(userId, payload, { required = false } = {}) {
  try {
    return await updateById("public", "usuarios", userId, payload);
  } catch (error) {
    if (isMissingColumnError(error)) {
      if (required) throw new Error(PASSWORD_SECURITY_MIGRATION_MESSAGE);
      return null;
    }
    throw error;
  }
}

async function sendPasswordSecurityEmail(payload) {
  const endpoints = [
    {
      url: supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-password-email` : "",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    },
    {
      url: "https://inova-delta.vercel.app/api/send-password-email",
      headers: { "Content-Type": "application/json" },
    },
  ].filter((endpoint) => endpoint.url);

  const errors = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: endpoint.headers,
        body: JSON.stringify(payload),
      });
      if (response.ok) return response.json().catch(() => ({ ok: true }));
      errors.push(await response.text());
    } catch (error) {
      errors.push(error?.message || String(error));
    }
  }
  throw new Error(errors.filter(Boolean).join(" | ") || "No se pudo enviar el correo de seguridad.");
}

async function findActiveUserByLogin(login) {
  const value = clean(login);
  if (!value) return null;
  const rows = await safeSelect("public", "usuarios", {
    select: "*",
    or: `(usuario.ilike.${value},email.ilike.${value})`,
    estado: eq("ACTIVO"),
    limit: "1",
  });
  return rows?.[0] || null;
}

export async function solicitarRecuperacionClave({ usuario, pilar }) {
  const login = clean(usuario).toLowerCase();
  if (!login) throw new Error("Ingresa tu correo o usuario para recuperar la contraseña.");

  const user = await findActiveUserByLogin(login);
  const generic = {
    ok: true,
    message: "Si el usuario existe y está activo, enviaremos un correo con el enlace de recuperación.",
  };
  if (!user?.id || !user.email) return generic;

  const token = generarClaveTemporal(36);
  const resetUrl = `${APPROVAL_LOGIN_URL}?resetPasswordToken=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}&pilar=${encodeURIComponent(pilar || "wms")}`;
  const now = new Date();

  try {
    await updateUsuarioSecurity(user.id, {
      reset_token: token,
      reset_token_expira_en: addMinutes(now, 30).toISOString(),
      reset_solicitado_en: now.toISOString(),
      fecha_actualizacion: now.toISOString(),
    }, { required: true });

    await sendPasswordSecurityEmail({
      type: "reset",
      email: user.email,
      nombre: user.nombre || user.usuario || user.email,
      pilar: pilar || "wms",
      resetUrl,
      expiresMinutes: 30,
    });
  } catch (error) {
    if (!String(error?.message || "").includes("20260525093000_password_recovery_security")) throw error;
    const claveTemporal = generarClaveTemporal();
    await saveUsuario({
      clave_acceso: claveTemporal,
      debe_cambiar_clave: true,
      clave_temporal_generada_en: now.toISOString(),
      fecha_actualizacion: now.toISOString(),
    }, user.id);
    await sendPasswordSecurityEmail({
      type: "temporary",
      email: user.email,
      nombre: user.nombre || user.usuario || user.email,
      pilar: pilar || "wms",
      claveTemporal,
      loginUrl: APPROVAL_LOGIN_URL,
    });
  }

  return generic;
}

export async function restablecerClaveConToken({ email, token, nuevaClave, pilar }) {
  const correo = clean(email).toLowerCase();
  const resetToken = clean(token);
  const clave = clean(nuevaClave);
  if (!correo || !resetToken) throw new Error("El enlace de recuperación no es válido.");
  if (clave.length < 8) throw new Error("La nueva contraseña debe tener mínimo 8 caracteres.");

  const rows = await safeSelect("public", "usuarios", {
    select: "*",
    email: `ilike.${correo}`,
    estado: eq("ACTIVO"),
    limit: "1",
  });
  const user = rows?.[0];
  if (!user || clean(user.reset_token) !== resetToken) {
    throw new Error("El enlace de recuperación no es válido o ya fue usado.");
  }
  if (!user.reset_token_expira_en || new Date(user.reset_token_expira_en).getTime() < Date.now()) {
    throw new Error("El enlace de recuperación expiró. Solicita uno nuevo.");
  }

  await updateUsuarioSecurity(user.id, {
    clave_acceso: clave,
    debe_cambiar_clave: false,
    login_intentos_fallidos: 0,
    login_bloqueado_hasta: null,
    reset_token: null,
    reset_token_expira_en: null,
    reset_solicitado_en: null,
    fecha_cambio_clave: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  }, { required: true });
  clearLocalLoginState(correo);

  await sendPasswordSecurityEmail({
    type: "changed",
    email: user.email,
    nombre: user.nombre || user.usuario || user.email,
    pilar: pilar || "wms",
    loginUrl: APPROVAL_LOGIN_URL,
  }).catch((error) => console.warn("No se pudo enviar aviso de cambio de clave:", error));

  return { ok: true };
}

function roleToPermissions(role, pilar, etoNivel, options = {}) {
  const rol = roleKey(role);
  if (options.platformAdmin || isPlatformAdminRole(rol)) return PLATFORM_ADMIN_PERMISSIONS;
  const base = [];
  if (pilar === "wms") base.push("wms.ver", "wms.operar");
  if (pilar === "5s") base.push("5s.ver", "5s.operar");
  if (pilar === "eto") {
    base.push("eto.ver");
    if (String(etoNivel) === "1") base.push("eto.nivel1");
    if (String(etoNivel) === "2") base.push("eto.nivel2");
  }
  if (rol.includes("ADMIN")) base.push("admin.usuarios.ver", "admin.usuarios.gestionar", "roles.ver", "admin.roles.gestionar");
  return base;
}

async function safeSelect(schema, table, params = {}) {
  if (!supabaseEnabled) throw new Error("Supabase no esta configurado.");
  return selectRows(schema, table, params);
}

export async function getAccessCatalogs() {
  const missingTables = [];
  const optional = async (table, params) => {
    try {
      return await safeSelect("public", table, params);
    } catch (error) {
      if (String(error?.message || "").includes("PGRST205")) {
        missingTables.push(table);
        return [];
      }
      throw error;
    }
  };

  const [empresas, roles, solicitudes, usuarios, usuarioPilares, planes] = await Promise.all([
    optional("empresas", { select: "*", order: "nombre.asc" }),
    optional("roles", { select: "*", order: "nombre.asc" }),
    optional("solicitudes_acceso", { select: "*", order: "fecha_solicitud.desc" }),
    optional("usuarios", { select: "*", order: "nombre.asc" }),
    optional("usuario_pilares", { select: "*", order: "fecha_creacion.desc" }),
    optional("planes_empresa", { select: "*", order: "fecha_creacion.desc" }),
  ]);

  return { empresas, roles, solicitudes, usuarios, usuarioPilares, planes, missingTables };
}

export async function solicitarAcceso(payload) {
  return insertRow("public", "solicitudes_acceso", {
    nombre_completo: clean(payload.nombre_completo),
    documento: clean(payload.documento),
    email: clean(payload.email).toLowerCase(),
    telefono: clean(payload.telefono),
    empresa_nombre: clean(payload.empresa_nombre),
    cargo: clean(payload.cargo),
    pilar: payload.pilar,
    eto_nivel: payload.pilar === "eto" ? Number(payload.eto_nivel || 1) : null,
    motivo: clean(payload.motivo),
    estado: "PENDIENTE",
  });
}

export async function autenticarUsuario({ usuario, password, pilar }) {
  const login = clean(usuario);
  const clave = clean(password);
  if (!login || !clave) throw new Error("Debes ingresar usuario y contraseÃ±a.");
  ensureLocalLoginAllowed(login);

  const usuarios = await safeSelect("public", "usuarios", {
    select: "*",
    or: `(usuario.ilike.${login},email.ilike.${login})`,
    estado: eq("ACTIVO"),
    limit: "1",
  });

  const user = usuarios?.[0];
  if (user?.login_bloqueado_hasta && new Date(user.login_bloqueado_hasta).getTime() > Date.now()) {
    throw new Error(`Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutesUntil(user.login_bloqueado_hasta)} minutos.`);
  }

  if (!user || clean(user.clave_acceso) !== clave) {
    if (!user?.id) {
      registerLocalLoginFailure(login);
      throw new Error("Credenciales incorrectas. Intentos restantes: 3.");
    }

    const attempts = Number(user.login_intentos_fallidos || 0) + 1;
    if (attempts >= 4) {
      const blockedUntil = addMinutes(new Date(), 30).toISOString();
      const updated = await updateUsuarioSecurity(user.id, {
        login_intentos_fallidos: 0,
        login_bloqueado_hasta: blockedUntil,
        fecha_actualizacion: new Date().toISOString(),
      });
      if (!updated) registerLocalLoginFailure(login);
      throw new Error("Cuenta bloqueada por 30 minutos por 4 intentos fallidos.");
    }

    const updated = await updateUsuarioSecurity(user.id, {
      login_intentos_fallidos: attempts,
      fecha_actualizacion: new Date().toISOString(),
    });
    if (!updated) registerLocalLoginFailure(login);
    throw new Error(`Credenciales incorrectas. Intentos restantes: ${4 - attempts}.`);
  }

  const accesos = await safeSelect("public", "usuario_pilares", {
    select: "*",
    usuario_id: eq(user.id),
    estado: eq("ACTIVO"),
  });

  const platformAdmin =
    Boolean(user.es_admin_inova) ||
    isPlatformAdminRole(user.rol) ||
    (Boolean(user.es_super_admin) && ["gvisbal", "genesisvsbl@outlook.com", "admin@inova.local"].includes(String(user.usuario || user.email || "").toLowerCase()));
  const tenantSuperAdmin = !platformAdmin && (Boolean(user.es_super_admin) || isTenantSuperAdminRole(user.rol));
  const acceso = platformAdmin
    ? (accesos.find((item) => item.pilar === "wms") || { pilar: "wms", empresa_id: user.empresa_id || empresaId, eto_nivel: null })
    : accesos.find((item) => item.pilar === pilar);

  if (!acceso) throw new Error(`Este usuario no tiene acceso activo al pilar ${pilar.toUpperCase()}.`);

  clearLocalLoginState(login);
  await updateUsuarioSecurity(user.id, {
    ultimo_acceso: new Date().toISOString(),
    login_intentos_fallidos: 0,
    login_bloqueado_hasta: null,
  }).catch(() => {});

  const etoNivel = acceso.eto_nivel || (pilar === "eto" ? 1 : null);
  return {
    auth: "true",
    userId: String(user.id),
    empresaId: String(acceso.empresa_id || user.empresa_id || empresaId),
    esSuperAdmin: Boolean(tenantSuperAdmin),
    esPlatformAdmin: Boolean(platformAdmin),
    nombre: user.nombre,
    usuario: user.usuario || user.email,
    email: user.email,
    rol: user.rol,
    estado: user.estado,
    plataforma: pilar,
    accessLevel: etoNivel ? String(etoNivel) : "",
    accessCode: etoNivel ? `N${etoNivel}-ETO` : "",
    debeCambiarClave: Boolean(user.debe_cambiar_clave),
    permisos: roleToPermissions(user.rol, platformAdmin ? "wms" : pilar, etoNivel, { platformAdmin }),
  };
}

export async function aprobarSolicitud(solicitud, { empresa_id, rol_id, clave_acceso, eto_nivel }, actor = {}) {
  const empresaIdFinal = Number(empresa_id || solicitud.empresa_id);
  if (!empresaIdFinal) throw new Error("Debes asignar empresa.");
  const actorIsPlatformAdmin = Boolean(actor.esPlatformAdmin) || isPlatformAdminRole(actor.rol);

  const rolRows = rol_id
    ? await safeSelect("public", "roles", { select: "*", id: eq(rol_id), limit: "1" })
    : [];
  const rol = rolRows?.[0];
  const rolCodigo = roleKey(rol?.codigo || "CONSULTA");
  if (rolCodigo === "SUPER_ADMIN" && !actorIsPlatformAdmin) {
    throw new Error("Solo la administracion comercial INOVA puede asignar el super administrador de una empresa.");
  }
  const empresaRows = await safeSelect("public", "empresas", { select: "*", id: eq(empresaIdFinal), limit: "1" });
  const empresa = empresaRows?.[0];
  const claveTemporal = clean(clave_acceso) || generarClaveTemporal();

  const usuarioRows = await safeSelect("public", "usuarios", {
    select: "*",
    empresa_id: eq(empresaIdFinal),
    or: `(email.ilike.${solicitud.email},documento.eq.${solicitud.documento})`,
    limit: "1",
  });

  const userPayload = {
    empresa_id: empresaIdFinal,
    nombre: solicitud.nombre_completo,
    email: solicitud.email,
    usuario: solicitud.email,
    documento: solicitud.documento,
    telefono: solicitud.telefono,
    cargo: solicitud.cargo,
    rol: rolCodigo || "CONSULTA",
    clave_acceso: claveTemporal,
    debe_cambiar_clave: true,
    clave_temporal_generada_en: new Date().toISOString(),
    es_super_admin: rolCodigo === "SUPER_ADMIN",
    estado: "ACTIVO",
    fecha_actualizacion: new Date().toISOString(),
  };

  const user = await saveUsuario(userPayload, usuarioRows?.[0]?.id || null);

  const accessPayload = {
    usuario_id: user.id,
    empresa_id: empresaIdFinal,
    pilar: solicitud.pilar,
    rol_id: rol_id || null,
    eto_nivel: solicitud.pilar === "eto" ? Number(eto_nivel || solicitud.eto_nivel || 1) : null,
    estado: "ACTIVO",
  };

  const existingAccess = await safeSelect("public", "usuario_pilares", {
    select: "*",
    usuario_id: eq(user.id),
    empresa_id: eq(empresaIdFinal),
    pilar: eq(solicitud.pilar),
    ...(accessPayload.eto_nivel ? { eto_nivel: eq(accessPayload.eto_nivel) } : { eto_nivel: "is.null" }),
    limit: "1",
  });

  if (existingAccess?.[0]) {
    await updateById("public", "usuario_pilares", existingAccess[0].id, accessPayload);
  } else {
    await insertRow("public", "usuario_pilares", accessPayload);
  }

  await insertRow("public", "licencias_usuario", {
    empresa_id: empresaIdFinal,
    usuario_id: user.id,
    estado: "ACTIVA",
  }).catch(() => {});

  await updateById("public", "solicitudes_acceso", solicitud.id, {
    estado: "APROBADA",
    usuario_creado_id: user.id,
    empresa_id: empresaIdFinal,
    fecha_respuesta: new Date().toISOString(),
  });

  let emailSent = false;
  let emailError = "";
  try {
    await enviarCorreoAprobacion({ solicitud, claveTemporal, empresa, rol });
    emailSent = true;
  } catch (error) {
    console.warn("No se pudo enviar el correo HTML de aprobaciÃ³n:", error);
    emailError = normalizeEmailError(error);
  }

  return {
    user,
    claveTemporal,
    emailSent,
    emailError,
  };
}

export async function crearUsuarioEmpresa(payload, actor = {}) {
  const actorRol = roleKey(actor.rol);
  const actorIsPlatformAdmin = Boolean(actor.esPlatformAdmin) || isPlatformAdminRole(actorRol);
  const actorIsTenantSuperAdmin = !actorIsPlatformAdmin && (actor.esSuperAdmin || actorRol === "SUPER_ADMIN");
  const empresaIdFinal = Number(actorIsPlatformAdmin ? payload.empresa_id : actor.empresaId);
  if (!empresaIdFinal) throw new Error("Debes asignar una empresa.");

  const rolRows = payload.rol_id
    ? await safeSelect("public", "roles", { select: "*", id: eq(payload.rol_id), limit: "1" })
    : [];
  const rol = rolRows?.[0];
  const rolCodigo = roleKey(rol?.codigo || payload.rol || "");

  if (!rol || !rolCodigo) throw new Error("Debes seleccionar un rol.");
  if (rolCodigo === "SUPER_ADMIN" && !actorIsPlatformAdmin) {
    throw new Error("Solo la administracion comercial INOVA puede crear o reasignar el super administrador de una empresa.");
  }
  if (!actorIsPlatformAdmin && !actorIsTenantSuperAdmin) {
    throw new Error("Solo administradores de empresa o administracion comercial INOVA pueden crear usuarios.");
  }
  if (!actorIsPlatformAdmin && String(rol.empresa_id) !== String(empresaIdFinal)) {
    throw new Error("No puedes asignar roles de otra empresa.");
  }

  const planes = await safeSelect("public", "planes_empresa", {
    select: "*",
    empresa_id: eq(empresaIdFinal),
    estado: eq("ACTIVO"),
    limit: "1",
  }).catch(() => []);
  const plan = planes?.[0];
  const maxUsuarios = Number(plan?.max_usuarios || 0);

  const usuariosActivos = await safeSelect("public", "usuarios", {
    select: "id",
    empresa_id: eq(empresaIdFinal),
    estado: eq("ACTIVO"),
  });

  const email = clean(payload.email).toLowerCase();
  const documento = clean(payload.documento);
  const existing = await safeSelect("public", "usuarios", {
    select: "*",
    empresa_id: eq(empresaIdFinal),
    or: `(email.ilike.${email},documento.eq.${documento})`,
    limit: "1",
  });

  if (!existing?.[0] && maxUsuarios && usuariosActivos.length >= maxUsuarios) {
    throw new Error(`La empresa ya alcanzÃ³ el lÃ­mite del plan (${maxUsuarios} usuarios).`);
  }

  const claveTemporal = clean(payload.clave_acceso) || generarClaveTemporal();
  const userPayload = {
    empresa_id: empresaIdFinal,
    nombre: clean(payload.nombre),
    email,
    usuario: email,
    documento,
    telefono: clean(payload.telefono),
    cargo: clean(payload.cargo),
    rol: rolCodigo,
    clave_acceso: claveTemporal,
    debe_cambiar_clave: true,
    clave_temporal_generada_en: new Date().toISOString(),
    es_super_admin: rolCodigo === "SUPER_ADMIN",
    estado: "ACTIVO",
    fecha_actualizacion: new Date().toISOString(),
  };

  const user = await saveUsuario(userPayload, existing?.[0]?.id || null);

  const pilar = payload.pilar;
  const accessPayload = {
    usuario_id: user.id,
    empresa_id: empresaIdFinal,
    pilar,
    rol_id: rol.id,
    eto_nivel: pilar === "eto" ? Number(payload.eto_nivel || 1) : null,
    estado: "ACTIVO",
  };

  const existingAccess = await safeSelect("public", "usuario_pilares", {
    select: "*",
    usuario_id: eq(user.id),
    empresa_id: eq(empresaIdFinal),
    pilar: eq(pilar),
    ...(accessPayload.eto_nivel ? { eto_nivel: eq(accessPayload.eto_nivel) } : { eto_nivel: "is.null" }),
    limit: "1",
  });

  if (existingAccess?.[0]) {
    await updateById("public", "usuario_pilares", existingAccess[0].id, accessPayload);
  } else {
    await insertRow("public", "usuario_pilares", accessPayload);
  }

  await insertRow("public", "licencias_usuario", {
    empresa_id: empresaIdFinal,
    usuario_id: user.id,
    estado: "ACTIVA",
  }).catch(() => {});

  const empresaRows = await safeSelect("public", "empresas", { select: "*", id: eq(empresaIdFinal), limit: "1" }).catch(() => []);
  const empresa = empresaRows?.[0];
  const solicitud = {
    nombre_completo: user.nombre,
    email: user.email,
    empresa_nombre: empresa?.nombre,
    pilar,
    eto_nivel: accessPayload.eto_nivel,
  };

  let emailSent = false;
  let emailError = "";
  try {
    await enviarCorreoAprobacion({ solicitud, claveTemporal, empresa, rol });
    emailSent = true;
  } catch (error) {
    console.warn("No se pudo enviar el correo HTML de aprobaciÃ³n:", error);
    emailError = normalizeEmailError(error);
  }

  return {
    user,
    claveTemporal,
    emailSent,
    emailError,
  };
}

export async function actualizarRolUsuario(user, payload, actor = {}) {
  const actorRol = roleKey(actor.rol);
  const actorIsPlatformAdmin = Boolean(actor.esPlatformAdmin) || isPlatformAdminRole(actorRol);
  const actorIsTenantSuperAdmin = !actorIsPlatformAdmin && (actor.esSuperAdmin || actorRol === "SUPER_ADMIN");
  const actorIsAdmin = actorIsPlatformAdmin || actorIsTenantSuperAdmin || actorRol.includes("ADMIN");
  if (!actorIsAdmin) throw new Error("Solo super administracion o administradores de empresa pueden editar roles.");
  const empresaIdFinal = Number(actorIsPlatformAdmin ? payload.empresa_id || user.empresa_id : actor.empresaId);
  if (!empresaIdFinal) throw new Error("Debes asignar una empresa.");
  if (!actorIsPlatformAdmin && String(user.empresa_id) !== String(actor.empresaId)) {
    throw new Error("No puedes editar usuarios de otra empresa.");
  }

  const rolRows = payload.rol_id
    ? await safeSelect("public", "roles", { select: "*", id: eq(payload.rol_id), limit: "1" })
    : [];
  const rol = rolRows?.[0];
  const rolCodigo = roleKey(rol?.codigo || "");
  if (!rol || !rolCodigo) throw new Error("Debes seleccionar un rol.");
  if (rolCodigo === "SUPER_ADMIN" && !actorIsPlatformAdmin) {
    throw new Error("Solo la administracion comercial INOVA puede asignar el super administrador de una empresa.");
  }
  if (String(rol.empresa_id) !== String(empresaIdFinal)) {
    throw new Error("El rol seleccionado no pertenece a la empresa.");
  }

  const pilar = payload.pilar || "wms";
  const accessPayload = {
    usuario_id: user.id,
    empresa_id: empresaIdFinal,
    pilar,
    rol_id: rol.id,
    eto_nivel: pilar === "eto" ? Number(payload.eto_nivel || 1) : null,
    estado: payload.estado || "ACTIVO",
  };

  const updatedUser = await saveUsuario({
    empresa_id: empresaIdFinal,
    rol: rolCodigo,
    es_super_admin: rolCodigo === "SUPER_ADMIN",
    estado: payload.usuario_estado || user.estado || "ACTIVO",
    fecha_actualizacion: new Date().toISOString(),
  }, user.id);

  const existingAccess = await safeSelect("public", "usuario_pilares", {
    select: "*",
    usuario_id: eq(user.id),
    empresa_id: eq(empresaIdFinal),
    pilar: eq(pilar),
    ...(accessPayload.eto_nivel ? { eto_nivel: eq(accessPayload.eto_nivel) } : { eto_nivel: "is.null" }),
    limit: "1",
  });

  if (existingAccess?.[0]) {
    await updateById("public", "usuario_pilares", existingAccess[0].id, accessPayload);
  } else {
    await insertRow("public", "usuario_pilares", accessPayload);
  }

  await insertRow("public", "auditoria_admin", {
    usuario_id: actor.userId || null,
    empresa_id: empresaIdFinal,
    accion: "CAMBIO_ROL_USUARIO",
    entidad: "usuarios",
    entidad_id: String(user.id),
    detalle: { usuario: user.email || user.usuario, rol: rolCodigo, pilar, eto_nivel: accessPayload.eto_nivel },
  }).catch(() => {});

  return updatedUser;
}

export function rechazarSolicitud(id, observacion_admin = "") {
  return updateById("public", "solicitudes_acceso", id, {
    estado: "RECHAZADA",
    observacion_admin,
    fecha_respuesta: new Date().toISOString(),
  });
}

export function cambiarEstadoUsuario(id, estado) {
  return updateById("public", "usuarios", id, {
    estado,
    fecha_actualizacion: new Date().toISOString(),
  });
}

export async function guardarPlanEmpresa(payload) {
  const empresaIdFinal = Number(payload.empresa_id);
  if (!empresaIdFinal) throw new Error("Debes seleccionar empresa.");
  const maxUsuarios = Number(payload.max_usuarios || 1);
  if (!Number.isFinite(maxUsuarios) || maxUsuarios < 1) {
    throw new Error("El plan debe permitir mÃ­nimo 1 usuario.");
  }

  const row = {
    empresa_id: empresaIdFinal,
    nombre_plan: clean(payload.nombre_plan) || "Plan empresa",
    max_usuarios: maxUsuarios,
    pilares_incluidos: payload.pilares_incluidos?.length ? payload.pilares_incluidos : ["wms"],
    estado: payload.estado || "ACTIVO",
    precio_mensual: payload.precio_mensual === "" || payload.precio_mensual == null ? null : Number(payload.precio_mensual),
  };

  const existing = await safeSelect("public", "planes_empresa", {
    select: "*",
    empresa_id: eq(empresaIdFinal),
    limit: "1",
  }).catch(() => []);

  return existing?.[0]
    ? updateById("public", "planes_empresa", existing[0].id, row)
    : insertRow("public", "planes_empresa", row);
}

export async function cambiarClaveObligatoria(userId, nuevaClave) {
  const clave = clean(nuevaClave);
  if (clave.length < 8) throw new Error("La nueva contraseÃ±a debe tener mÃ­nimo 8 caracteres.");
  const existing = await safeSelect("public", "usuarios", { select: "*", id: eq(userId), limit: "1" }).catch(() => []);
  const user = existing?.[0];
  const saved = await saveUsuario({
    clave_acceso: clave,
    debe_cambiar_clave: false,
    login_intentos_fallidos: 0,
    login_bloqueado_hasta: null,
    reset_token: null,
    reset_token_expira_en: null,
    reset_solicitado_en: null,
    fecha_cambio_clave: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  }, userId);
  if (user?.email) {
    await sendPasswordSecurityEmail({
      type: "changed",
      email: user.email,
      nombre: user.nombre || user.usuario || user.email,
      pilar: "wms",
      loginUrl: APPROVAL_LOGIN_URL,
    }).catch((error) => console.warn("No se pudo enviar aviso de cambio de clave:", error));
  }
  return saved;
}



