import {
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
  supabaseKey,
  supabaseUrl,
  updateById,
} from "./supabaseRest";

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

export function buildApprovalEmail({ solicitud, claveTemporal, empresa, rol }) {
  const subject = encodeURIComponent("Acceso aprobado - INOVA");
  const body = [
    `Hola ${solicitud.nombre_completo},`,
    "",
    "Tu acceso a INOVA fue aprobado.",
    "",
    `Empresa: ${empresa?.nombre || solicitud.empresa_nombre || ""}`,
    `Pilar: ${String(solicitud.pilar || "").toUpperCase()}${solicitud.eto_nivel ? ` - Nivel ${solicitud.eto_nivel}` : ""}`,
    `Rol: ${rol?.nombre || rol?.codigo || ""}`,
    `Usuario: ${solicitud.email}`,
    `Contraseña temporal: ${claveTemporal}`,
    "",
    "Por seguridad, al ingresar por primera vez el sistema te pedirá cambiar esta contraseña.",
    "",
    "INOVA",
  ].join("\n");
  return `mailto:${encodeURIComponent(solicitud.email)}?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export async function enviarCorreoAprobacion({ solicitud, claveTemporal, empresa, rol }) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase no está configurado.");
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-approval-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      nombre: solicitud.nombre_completo,
      email: solicitud.email,
      empresa: empresa?.nombre || solicitud.empresa_nombre || "",
      pilar: solicitud.pilar,
      etoNivel: solicitud.eto_nivel || null,
      rol: rol?.nombre || rol?.codigo || "",
      claveTemporal,
      loginUrl: `${window.location.origin}/login`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `No se pudo enviar correo (${response.status}).`);
  }

  return response.json().catch(() => ({ ok: true }));
}

function roleToPermissions(role, pilar, etoNivel) {
  const rol = String(role || "").toUpperCase();
  if (rol === "SUPER_ADMIN") return LEGACY_ADMIN_PERMISSIONS;
  const base = [];
  if (pilar === "wms") base.push("wms.ver", "wms.operar");
  if (pilar === "5s") base.push("5s.ver", "5s.operar");
  if (pilar === "eto") {
    base.push("eto.ver");
    if (String(etoNivel) === "1") base.push("eto.nivel1");
    if (String(etoNivel) === "2") base.push("eto.nivel2");
  }
  if (rol.includes("ADMIN")) base.push("admin.usuarios.ver", "admin.usuarios.gestionar", "roles.ver");
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
  if (!login || !clave) throw new Error("Debes ingresar usuario y contraseña.");

  const usuarios = await safeSelect("public", "usuarios", {
    select: "*",
    or: `(usuario.ilike.${login},email.ilike.${login})`,
    estado: eq("ACTIVO"),
    limit: "1",
  });

  const user = usuarios?.[0];
  if (!user || clean(user.clave_acceso) !== clave) {
    throw new Error("Credenciales incorrectas.");
  }

  const accesos = await safeSelect("public", "usuario_pilares", {
    select: "*",
    usuario_id: eq(user.id),
    estado: eq("ACTIVO"),
  });

  const superAdmin = user.es_super_admin || String(user.rol).toUpperCase() === "SUPER_ADMIN";
  const acceso = superAdmin
    ? accesos.find((item) => item.pilar === pilar) || { pilar, eto_nivel: pilar === "eto" ? 1 : null }
    : accesos.find((item) => item.pilar === pilar);

  if (!acceso) throw new Error(`Este usuario no tiene acceso activo al pilar ${pilar.toUpperCase()}.`);

  await updateById("public", "usuarios", user.id, { ultimo_acceso: new Date().toISOString() }).catch(() => {});

  const etoNivel = acceso.eto_nivel || (pilar === "eto" ? 1 : null);
  return {
    auth: "true",
    userId: String(user.id),
    empresaId: String(acceso.empresa_id || user.empresa_id || empresaId),
    esSuperAdmin: Boolean(superAdmin),
    nombre: user.nombre,
    usuario: user.usuario || user.email,
    email: user.email,
    rol: user.rol,
    estado: user.estado,
    plataforma: pilar,
    accessLevel: etoNivel ? String(etoNivel) : "",
    accessCode: etoNivel ? `N${etoNivel}-ETO` : "",
    debeCambiarClave: Boolean(user.debe_cambiar_clave),
    permisos: roleToPermissions(user.rol, pilar, etoNivel),
  };
}

export async function aprobarSolicitud(solicitud, { empresa_id, rol_id, clave_acceso, eto_nivel }) {
  const empresaIdFinal = Number(empresa_id || solicitud.empresa_id);
  if (!empresaIdFinal) throw new Error("Debes asignar empresa.");

  const rolRows = rol_id
    ? await safeSelect("public", "roles", { select: "*", id: eq(rol_id), limit: "1" })
    : [];
  const rol = rolRows?.[0];
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
    rol: rol?.codigo || "CONSULTA",
    clave_acceso: claveTemporal,
    debe_cambiar_clave: true,
    clave_temporal_generada_en: new Date().toISOString(),
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

  const mailto = buildApprovalEmail({ solicitud, claveTemporal, empresa, rol });
  let emailSent = false;
  try {
    await enviarCorreoAprobacion({ solicitud, claveTemporal, empresa, rol });
    emailSent = true;
  } catch (error) {
    console.warn("No se pudo enviar el correo HTML de aprobación:", error);
  }

  return {
    user,
    claveTemporal,
    mailto,
    emailSent,
  };
}

export async function crearUsuarioEmpresa(payload, actor = {}) {
  const actorRol = String(actor.rol || "").toUpperCase();
  const actorIsSuperAdmin = actor.esSuperAdmin || actorRol === "SUPER_ADMIN";
  const empresaIdFinal = Number(actorIsSuperAdmin ? payload.empresa_id : actor.empresaId);
  if (!empresaIdFinal) throw new Error("Debes asignar una empresa.");

  const rolRows = payload.rol_id
    ? await safeSelect("public", "roles", { select: "*", id: eq(payload.rol_id), limit: "1" })
    : [];
  const rol = rolRows?.[0];
  const rolCodigo = String(rol?.codigo || payload.rol || "").toUpperCase();

  if (!rol || !rolCodigo) throw new Error("Debes seleccionar un rol.");
  if (rolCodigo === "SUPER_ADMIN") throw new Error("El rol SUPER_ADMIN solo puede administrarse fuera de este flujo.");
  if (!actorIsSuperAdmin && String(rol.empresa_id) !== String(empresaIdFinal)) {
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
    throw new Error(`La empresa ya alcanzó el límite del plan (${maxUsuarios} usuarios).`);
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
    es_super_admin: false,
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

  const mailto = buildApprovalEmail({ solicitud, claveTemporal, empresa, rol });
  let emailSent = false;
  try {
    await enviarCorreoAprobacion({ solicitud, claveTemporal, empresa, rol });
    emailSent = true;
  } catch (error) {
    console.warn("No se pudo enviar el correo HTML de aprobación:", error);
  }

  return {
    user,
    claveTemporal,
    mailto,
    emailSent,
  };
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
    throw new Error("El plan debe permitir mínimo 1 usuario.");
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

export function cambiarClaveObligatoria(userId, nuevaClave) {
  const clave = clean(nuevaClave);
  if (clave.length < 8) throw new Error("La nueva contraseña debe tener mínimo 8 caracteres.");
  return saveUsuario({
    clave_acceso: clave,
    debe_cambiar_clave: false,
    fecha_cambio_clave: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  }, userId);
}
