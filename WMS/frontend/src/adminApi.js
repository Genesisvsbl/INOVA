import {
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
  supabaseKey,
  supabaseUrl,
  updateById,
} from "./supabaseRest";
import { APPROVAL_LOGIN_URL, buildApprovalPayload } from "./approvalEmailTemplate";

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

function slugIdentity(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 42);
}

function buildInternalUserEmail({ empresaId, documento, usuario, pilar }) {
  const base = slugIdentity(documento) || slugIdentity(usuario) || `usuario.${Date.now()}`;
  const scope = slugIdentity(pilar) || "wms";
  return `${base}.${scope}@empresa-${empresaId}.inova.local`;
}

function isDuplicateKeyError(error) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  return code === "23505" || message.includes("duplicate key value") || message.includes("already exists");
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

function normalizeLookup(value) {
  return clean(value).toLowerCase();
}

export function generarCodigoSolicitud(solicitud) {
  const id = String(solicitud?.id || "").padStart(4, "0");
  const documento = String(solicitud?.documento || "").replace(/\D/g, "");
  const tail = documento.slice(-4).padStart(4, "0");
  return id ? `INOVA-${id}-${tail}` : "";
}

function normalizeConsultaSolicitud(value) {
  return clean(value).toUpperCase().replace(/\s+/g, "");
}

function claveConsultaSolicitud(solicitud) {
  if (solicitud?.clave_consulta) return solicitud.clave_consulta;
  const match = String(solicitud?.motivo || "").match(/\[CLAVE_CONSULTA:([^\]]+)\]/i);
  return match?.[1] || "";
}

function requestLookupKey(email, documento, pilar) {
  return `inova_request_lookup_${normalizeLookup(email)}_${String(documento || "").replace(/\D/g, "")}_${pilar || "wms"}`;
}

function checkRequestLookupLock(email, documento, pilar) {
  if (typeof localStorage === "undefined") return;
  const key = requestLookupKey(email, documento, pilar);
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  if (data.blockedUntil && Number(data.blockedUntil) > Date.now()) {
    const minutes = Math.ceil((Number(data.blockedUntil) - Date.now()) / 60000);
    throw new Error(`Consulta bloqueada temporalmente. Intenta nuevamente en ${minutes} minutos.`);
  }
}

function registerRequestLookupFailure(email, documento, pilar) {
  if (typeof localStorage === "undefined") return;
  const key = requestLookupKey(email, documento, pilar);
  const current = JSON.parse(localStorage.getItem(key) || "{}");
  const attempts = Number(current.attempts || 0) + 1;
  if (attempts >= 4) {
    localStorage.setItem(key, JSON.stringify({ attempts: 0, blockedUntil: Date.now() + 30 * 60 * 1000 }));
    throw new Error("Consulta bloqueada por 30 minutos por 4 intentos fallidos.");
  }
  localStorage.setItem(key, JSON.stringify({ attempts }));
  throw new Error(`Datos incorrectos. Intentos restantes: ${4 - attempts}.`);
}

function clearRequestLookupFailures(email, documento, pilar) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(requestLookupKey(email, documento, pilar));
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
  const claveConsulta = clean(payload.clave_consulta);
  if (claveConsulta.length < 6) {
    throw new Error("La clave de consulta debe tener minimo 6 caracteres.");
  }

  const basePayload = {
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
  };

  let rows;
  try {
    rows = await insertRow("public", "solicitudes_acceso", {
      ...basePayload,
      clave_consulta: claveConsulta,
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (!message.includes("clave_consulta") && !message.includes("schema cache")) throw error;
    rows = await insertRow("public", "solicitudes_acceso", {
      ...basePayload,
      motivo: `${basePayload.motivo ? `${basePayload.motivo}\n` : ""}[CLAVE_CONSULTA:${claveConsulta}]`,
    });
  }
  const solicitud = rows?.[0];
  return {
    solicitud,
  };
}

export async function consultarSolicitudAcceso({ email, documento, claveConsulta, codigo, pilar }) {
  const cleanEmail = normalizeLookup(email);
  const cleanDocumento = clean(documento);
  const cleanPilar = clean(pilar || "wms");
  const cleanClave = normalizeConsultaSolicitud(claveConsulta || codigo);

  if (!cleanEmail || !cleanDocumento || !cleanClave) {
    throw new Error("Ingresa correo, documento y clave de consulta.");
  }

  checkRequestLookupLock(cleanEmail, cleanDocumento, cleanPilar);

  const solicitudes = await safeSelect("public", "solicitudes_acceso", {
    select: "*",
    email: `ilike.${cleanEmail}`,
    documento: eq(cleanDocumento),
    pilar: eq(cleanPilar),
    order: "fecha_solicitud.desc",
    limit: "20",
  }).catch(() => []);

  const solicitud = solicitudes.find((item) => normalizeConsultaSolicitud(claveConsultaSolicitud(item)) === cleanClave);
  if (!solicitud) registerRequestLookupFailure(cleanEmail, cleanDocumento, cleanPilar);
  clearRequestLookupFailures(cleanEmail, cleanDocumento, cleanPilar);

  if (String(solicitud.estado || "").toUpperCase() !== "APROBADA") {
    return {
      estado: solicitud.estado || "PENDIENTE",
      codigo: generarCodigoSolicitud(solicitud),
      mensaje: "Tu solicitud aun esta pendiente de aprobacion.",
      solicitud,
    };
  }

  const userRows = solicitud.usuario_creado_id
    ? await safeSelect("public", "usuarios", { select: "*", id: eq(solicitud.usuario_creado_id), limit: "1" }).catch(() => [])
    : [];
  const fallbackUsers = userRows?.[0]
    ? []
    : await safeSelect("public", "usuarios", {
        select: "*",
        email: `ilike.${cleanEmail}`,
        documento: eq(cleanDocumento),
        limit: "1",
      }).catch(() => []);
  const user = userRows?.[0] || fallbackUsers?.[0];
  if (!user?.id) {
    return {
      estado: "APROBADA",
      codigo: generarCodigoSolicitud(solicitud),
      mensaje: "Tu solicitud fue aprobada, pero el usuario aun no esta disponible. Contacta al administrador.",
      solicitud,
    };
  }

  const empresaRows = user.empresa_id
    ? await safeSelect("public", "empresas", { select: "*", id: eq(user.empresa_id), limit: "1" }).catch(() => [])
    : [];
  const accesoRows = await safeSelect("public", "usuario_pilares", {
    select: "*",
    usuario_id: eq(user.id),
    pilar: eq(cleanPilar),
    estado: eq("ACTIVO"),
    limit: "1",
  }).catch(() => []);
  const acceso = accesoRows?.[0];
  const rolRows = acceso?.rol_id
    ? await safeSelect("public", "roles", { select: "*", id: eq(acceso.rol_id), limit: "1" }).catch(() => [])
    : [];
  const rol = rolRows?.[0];
  const claveVisible = Boolean(user.debe_cambiar_clave);
  const payload = buildApprovalPayload({
    solicitud: {
      nombre_completo: user.nombre || solicitud.nombre_completo,
      email: user.email || solicitud.email,
      empresa_nombre: empresaRows?.[0]?.nombre || solicitud.empresa_nombre,
      pilar: cleanPilar,
      eto_nivel: acceso?.eto_nivel || solicitud.eto_nivel,
    },
    claveTemporal: claveVisible ? user.clave_acceso : "Ya fue entregada",
    empresa: empresaRows?.[0] || { nombre: solicitud.empresa_nombre },
    rol: rol || { nombre: user.rol || "Usuario" },
    loginUrl: APPROVAL_LOGIN_URL,
  });

  return {
    estado: "APROBADA",
    codigo: generarCodigoSolicitud(solicitud),
    solicitud,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      usuario: user.usuario || user.email,
      debeCambiarClave: Boolean(user.debe_cambiar_clave),
    },
    claveTemporal: claveVisible ? user.clave_acceso : "",
    payload,
    mensaje: claveVisible
      ? "Tu acceso fue aprobado. Usa esta clave temporal y cambiala al ingresar."
      : "Tu acceso ya fue aprobado y la clave temporal ya fue usada o entregada.",
  };
}

export async function autenticarUsuario({ usuario, password, pilar }) {
  const login = clean(usuario);
  const clave = clean(password);
  if (!login || !clave) throw new Error("Debes ingresar usuario y contraseÃ±a.");
  ensureLocalLoginAllowed(login);

  const usuarios = await safeSelect("public", "usuarios", {
    select: "*",
    or: `(usuario.ilike.${login},email.ilike.${login},documento.ilike.${login},nombre.ilike.${login})`,
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

  return {
    user,
    claveTemporal,
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

  const usuarioLogin = clean(payload.nombre);
  const documento = clean(payload.documento);
  if (!usuarioLogin) throw new Error("Debes ingresar el nombre completo.");
  if (!documento) throw new Error("Debes ingresar la cedula o documento.");
  const internalEmail = buildInternalUserEmail({
    empresaId: empresaIdFinal,
    documento,
    usuario: usuarioLogin,
    pilar: payload.pilar,
  });
  const email = clean(payload.email).includes("@") ? clean(payload.email).toLowerCase() : internalEmail;
  const existingByDocumentOrUser = await safeSelect("public", "usuarios", {
    select: "*",
    empresa_id: eq(empresaIdFinal),
    or: `(usuario.ilike.${usuarioLogin},documento.eq.${documento})`,
    limit: "1",
  });
  const existingByEmail = existingByDocumentOrUser?.[0]
    ? []
    : await safeSelect("public", "usuarios", {
        select: "*",
        empresa_id: eq(empresaIdFinal),
        email: eq(email),
        limit: "1",
      }).catch(() => []);
  const existing = existingByDocumentOrUser?.[0] || existingByEmail?.[0] || null;

  if (!existing && maxUsuarios && usuariosActivos.length >= maxUsuarios) {
    throw new Error(`La empresa ya alcanzÃ³ el lÃ­mite del plan (${maxUsuarios} usuarios).`);
  }

  const claveTemporal = documento;
  const userPayload = {
    empresa_id: empresaIdFinal,
    nombre: usuarioLogin,
    email,
    usuario: usuarioLogin,
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

  let user;
  try {
    user = await saveUsuario(userPayload, existing?.id || null);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    throw new Error("Ese usuario ya existe en esta empresa. Revisa la lista de usuarios y edita el rol o el pilar desde Acciones.");
  }

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

  return {
    user,
    claveTemporal,
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



