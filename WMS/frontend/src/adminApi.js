import {
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
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
  if (rol.includes("ADMIN")) base.push("admin.usuarios.ver");
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

  const user = usuarioRows?.[0]
    ? (await updateById("public", "usuarios", usuarioRows[0].id, userPayload))[0]
    : (await insertRow("public", "usuarios", userPayload))[0];

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
    mailto: buildApprovalEmail({ solicitud, claveTemporal, empresa, rol }),
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

export function cambiarClaveObligatoria(userId, nuevaClave) {
  const clave = clean(nuevaClave);
  if (clave.length < 8) throw new Error("La nueva contraseña debe tener mínimo 8 caracteres.");
  return updateById("public", "usuarios", userId, {
    clave_acceso: clave,
    debe_cambiar_clave: false,
    fecha_cambio_clave: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
  });
}
