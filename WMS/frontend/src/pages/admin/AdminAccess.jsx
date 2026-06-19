import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import {
  actualizarRolUsuario,
  aprobarSolicitud,
  cambiarEstadoUsuario,
  crearUsuarioEmpresa,
  generarClaveTemporal,
  getAccessCatalogs,
  guardarPlanEmpresa,
  rechazarSolicitud,
} from "../../adminApi";
import { APPROVAL_LOGIN_URL, buildApprovalEmailHtml, buildApprovalPayload } from "../../approvalEmailTemplate";

const PILLAR_LABELS = { wms: "WMS", "5s": "5S", eto: "ETO" };
const EMPTY_USER_FORM = {
  nombre: "",
  documento: "",
  telefono: "",
  cargo: "",
  empresa_id: "",
  rol_id: "",
  pilar: "wms",
  eto_nivel: "1",
  clave_acceso: "",
};
const EMPTY_PLAN_FORM = {
  empresa_id: "",
  nombre_plan: "Plan empresa",
  max_usuarios: 5,
  pilares_incluidos: ["wms"],
  precio_mensual: "",
  estado: "ACTIVO",
};

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ estado }) {
  const key = String(estado || "").toUpperCase();
  return <span className={`admin-status admin-status-${key.toLowerCase()}`}>{key || "-"}</span>;
}

function EmptyState({ children }) {
  return <div className="admin-empty">{children}</div>;
}

export default function AdminAccess({ view = "usuarios" }) {
  const [data, setData] = useState({
    empresas: [],
    roles: [],
    solicitudes: [],
    usuarios: [],
    usuarioPilares: [],
    planes: [],
    missingTables: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approval, setApproval] = useState({ empresa_id: "", rol_id: "", clave_acceso: "", eto_nivel: "1" });
  const [approvalResult, setApprovalResult] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [userCreateResult, setUserCreateResult] = useState(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM);
  const [planMessage, setPlanMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [roleEdit, setRoleEdit] = useState({ empresa_id: "", pilar: "wms", rol_id: "", eto_nivel: "1", estado: "ACTIVO" });
  const [previewPayload, setPreviewPayload] = useState(null);

  const actor = useMemo(() => {
    const rol = sessionStorage.getItem("rol") || "";
    const permisos = JSON.parse(sessionStorage.getItem("permisos") || "[]");
    const roleKey = String(rol || "").toUpperCase();
    const esPlatformAdmin =
      sessionStorage.getItem("esPlatformAdmin") === "true" ||
      ["ADMIN_INOVA", "INOVA_ADMIN", "ADMIN_PLATAFORMA", "PLATFORM_ADMIN"].includes(roleKey);
    const esTenantSuperAdmin = !esPlatformAdmin && (sessionStorage.getItem("esSuperAdmin") === "true" || roleKey === "SUPER_ADMIN");
    return {
      userId: sessionStorage.getItem("userId") || "",
      empresaId: sessionStorage.getItem("empresaId") || "",
      pilar: sessionStorage.getItem("pilarSeleccionado") || "",
      permisos,
      rol,
      esPlatformAdmin,
      esSuperAdmin: esTenantSuperAdmin,
      esAdmin: esPlatformAdmin || esTenantSuperAdmin || roleKey.includes("ADMIN") || permisos.includes("admin.usuarios.gestionar") || permisos.includes("admin.roles.gestionar"),
    };
  }, []);
  const canManageRoles = actor.esSuperAdmin || actor.esAdmin;
  const canManageCommercial = actor.esPlatformAdmin;

  if (!canManageRoles) {
    return (
      <div className="admin-shell">
        <header className="admin-hero">
          <span>Acceso restringido</span>
          <h1>Administración protegida</h1>
          <p>Solo administradores y super administradores pueden gestionar usuarios, roles, responsables o configuración.</p>
        </header>
      </div>
    );
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getAccessCatalogs());
    } catch (err) {
      setError(err?.message || "No se pudo cargar administracion de accesos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const defaultEmpresa = canManageCommercial ? data.empresas[0]?.id || "" : actor.empresaId;
    if (!defaultEmpresa || planForm.empresa_id) return;
    const plan = data.planes.find((item) => String(item.empresa_id) === String(defaultEmpresa));
    setPlanForm({
      empresa_id: String(defaultEmpresa),
      nombre_plan: plan?.nombre_plan || "Plan empresa",
      max_usuarios: plan?.max_usuarios || 5,
      pilares_incluidos: plan?.pilares_incluidos || ["wms"],
      precio_mensual: plan?.precio_mensual ?? "",
      estado: plan?.estado || "ACTIVO",
    });
  }, [data.empresas, data.planes, canManageCommercial, actor.empresaId, planForm.empresa_id]);

  const pendingRequests = useMemo(
    () => data.solicitudes.filter((item) => item.estado === "PENDIENTE" && (canManageCommercial || String(item.empresa_id) === String(actor.empresaId))),
    [data.solicitudes, canManageCommercial, actor.empresaId]
  );

  const visibleEmpresas = useMemo(
    () => canManageCommercial ? data.empresas : data.empresas.filter((item) => String(item.id) === String(actor.empresaId)),
    [data.empresas, canManageCommercial, actor.empresaId]
  );

  const visibleUsuarios = useMemo(
    () => canManageCommercial ? data.usuarios : data.usuarios.filter((item) => String(item.empresa_id) === String(actor.empresaId)),
    [data.usuarios, canManageCommercial, actor.empresaId]
  );

  const visibleRoles = useMemo(
    () => data.roles.filter((role) => {
      const code = String(role.codigo || "").toUpperCase();
      if (code === "ADMIN_INOVA") return canManageCommercial;
      if (code === "SUPER_ADMIN") return canManageCommercial;
      return canManageCommercial || String(role.empresa_id) === String(actor.empresaId);
    }),
    [data.roles, canManageCommercial, actor.empresaId]
  );

  const activeLicenses = useMemo(
    () => visibleUsuarios.filter((item) => item.estado === "ACTIVO").length,
    [visibleUsuarios]
  );

  const empresaById = useMemo(
    () => new Map(data.empresas.map((item) => [String(item.id), item])),
    [data.empresas]
  );

  const roleById = useMemo(
    () => new Map(data.roles.map((item) => [String(item.id), item])),
    [data.roles]
  );

  const accessByUserId = useMemo(() => {
    const map = new Map();
    data.usuarioPilares.forEach((access) => {
      const key = String(access.usuario_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(access);
    });
    return map;
  }, [data.usuarioPilares]);

  const selectedApprovalEmpresa = empresaById.get(String(approval.empresa_id));
  const selectedApprovalRole = roleById.get(String(approval.rol_id));
  const approvalPreviewPayload = selectedRequest
    ? buildApprovalPayload({
        solicitud: { ...selectedRequest, eto_nivel: selectedRequest.pilar === "eto" ? approval.eto_nivel : selectedRequest.eto_nivel },
        claveTemporal: approval.clave_acceso,
        empresa: selectedApprovalEmpresa,
        rol: selectedApprovalRole,
        loginUrl: APPROVAL_LOGIN_URL,
      })
    : null;

  const openApproval = (solicitud) => {
    const defaultEmpresa = canManageCommercial ? (solicitud.empresa_id || visibleEmpresas[0]?.id || "") : actor.empresaId;
    const defaultRole =
      visibleRoles.find((rol) => String(rol.empresa_id) === String(defaultEmpresa) && rol.codigo.includes(String(solicitud.pilar).toUpperCase())) ||
      visibleRoles.find((rol) => String(rol.empresa_id) === String(defaultEmpresa)) ||
      visibleRoles[0];
    setSelectedRequest(solicitud);
    setApproval({
      empresa_id: defaultEmpresa,
      rol_id: defaultRole?.id || "",
      clave_acceso: generarClaveTemporal(),
      eto_nivel: String(solicitud.eto_nivel || 1),
    });
    setApprovalResult(null);
  };

  const confirmApproval = async () => {
    if (!selectedRequest) return;
    setActionError("");
    try {
      const result = await aprobarSolicitud(selectedRequest, approval, actor);
      await load();
      setSelectedRequest(null);
      setApprovalResult(result);
    } catch (err) {
      setActionError(err?.message || "No se pudo aprobar la solicitud.");
    }
  };

  const defaultEmpresaId = canManageCommercial ? visibleEmpresas[0]?.id || "" : actor.empresaId;
  const selectedCreateEmpresa = userForm.empresa_id || defaultEmpresaId;
  const roleOptionsForCreate = visibleRoles.filter((role) => {
    if (String(role.empresa_id) !== String(selectedCreateEmpresa)) return false;
    const code = String(role.codigo || "").toUpperCase();
    if (code === "ADMIN_INOVA") return false;
    if (code === "SUPER_ADMIN") return canManageCommercial;
    const pilar = String(userForm.pilar || "").toUpperCase();
    if (pilar === "WMS") return code.includes("WMS") || code === "ADMIN_EMPRESA";
    if (pilar === "5S") return code.includes("5S") || code === "ADMIN_EMPRESA";
    if (pilar === "ETO") return code.includes("ETO") || code === "ADMIN_EMPRESA";
    return false;
  }).sort((a, b) => {
    const pilar = String(userForm.pilar || "").toUpperCase();
    const codeA = String(a.codigo || "").toUpperCase();
    const codeB = String(b.codigo || "").toUpperCase();
    const ownA = codeA.includes(pilar) ? 0 : 1;
    const ownB = codeB.includes(pilar) ? 0 : 1;
    return ownA - ownB || String(a.nombre || "").localeCompare(String(b.nombre || ""));
  });
  const planForCreate = data.planes.find((item) => String(item.empresa_id) === String(selectedCreateEmpresa) && String(item.estado || "ACTIVO") === "ACTIVO");
  const activeUsersForCreate = visibleUsuarios.filter((item) => String(item.empresa_id) === String(selectedCreateEmpresa) && item.estado === "ACTIVO").length;
  const selectedCreateRole = roleById.get(String(userForm.rol_id || roleOptionsForCreate[0]?.id || ""));
  const createPreviewPayload = buildApprovalPayload({
    solicitud: {
      nombre: userForm.nombre || "Nombre del usuario",
      email: userForm.nombre || "usuario",
      pilar: userForm.pilar,
      eto_nivel: userForm.pilar === "eto" ? userForm.eto_nivel : null,
    },
    claveTemporal: userForm.documento || "CEDULA",
    empresa: empresaById.get(String(selectedCreateEmpresa)),
    rol: selectedCreateRole || { nombre: "Rol asignado" },
    loginUrl: APPROVAL_LOGIN_URL,
  });

  const createDirectUser = async (event) => {
    event.preventDefault();
    setActionError("");
    setUserCreateResult(null);
    try {
      const payload = {
        ...userForm,
        empresa_id: selectedCreateEmpresa,
        rol_id: userForm.rol_id || roleOptionsForCreate[0]?.id || "",
        clave_acceso: userForm.documento,
      };
      const result = await crearUsuarioEmpresa(payload, actor);
      setUserCreateResult(result);
      setUserForm({ ...EMPTY_USER_FORM, empresa_id: selectedCreateEmpresa });
      await load();
    } catch (err) {
      setActionError(err?.message || "No se pudo crear el usuario.");
    }
  };

  const changePlanEmpresa = (empresaId) => {
    const plan = data.planes.find((item) => String(item.empresa_id) === String(empresaId));
    setPlanMessage("");
    setPlanForm({
      empresa_id: String(empresaId),
      nombre_plan: plan?.nombre_plan || "Plan empresa",
      max_usuarios: plan?.max_usuarios || 5,
      pilares_incluidos: plan?.pilares_incluidos || ["wms"],
      precio_mensual: plan?.precio_mensual ?? "",
      estado: plan?.estado || "ACTIVO",
    });
  };

  const togglePlanPillar = (pillar) => {
    setPlanForm((prev) => {
      const current = prev.pilares_incluidos || [];
      const next = current.includes(pillar) ? current.filter((item) => item !== pillar) : [...current, pillar];
      return { ...prev, pilares_incluidos: next.length ? next : [pillar] };
    });
  };

  const savePlan = async (event) => {
    event.preventDefault();
    setActionError("");
    setPlanMessage("");
    if (!canManageCommercial) {
      setActionError("Solo la administracion comercial INOVA puede modificar planes y licencias.");
      return;
    }
    try {
      await guardarPlanEmpresa(planForm);
      setPlanMessage("Plan actualizado correctamente.");
      await load();
    } catch (err) {
      setActionError(err?.message || "No se pudo guardar el plan.");
    }
  };

  const reject = async (solicitud) => {
    const reason = window.prompt("Motivo del rechazo:", "No cumple criterios de acceso");
    if (reason === null) return;
    await rechazarSolicitud(solicitud.id, reason);
    await load();
  };

  const toggleUser = async (user) => {
    const next = user.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    await cambiarEstadoUsuario(user.id, next);
    await load();
  };

  const openRoleEdit = (user) => {
    const accesses = accessByUserId.get(String(user.id)) || [];
    const firstAccess = accesses[0];
    const empresaId = canManageCommercial ? (firstAccess?.empresa_id || user.empresa_id || visibleEmpresas[0]?.id || "") : actor.empresaId;
    const role =
      visibleRoles.find((item) => String(item.id) === String(firstAccess?.rol_id)) ||
      visibleRoles.find((item) => String(item.empresa_id) === String(empresaId) && String(item.codigo).toUpperCase() === String(user.rol).toUpperCase()) ||
      visibleRoles.find((item) => String(item.empresa_id) === String(empresaId));
    setEditingUser(user);
    setRoleEdit({
      empresa_id: String(empresaId || ""),
      pilar: firstAccess?.pilar || "wms",
      rol_id: role?.id || "",
      eto_nivel: String(firstAccess?.eto_nivel || 1),
      estado: firstAccess?.estado || "ACTIVO",
    });
  };

  const roleOptionsForEdit = visibleRoles.filter((role) => {
    if (String(role.empresa_id) !== String(roleEdit.empresa_id)) return false;
    const code = String(role.codigo || "").toUpperCase();
    if (code === "ADMIN_INOVA") return false;
    if (code === "SUPER_ADMIN") return canManageCommercial;
    const pilar = String(roleEdit.pilar || "").toUpperCase();
    return code.includes(pilar) || code.includes("ADMIN") || code.includes("CONSULTA") || code.includes("OPERADOR");
  });

  const saveRoleEdit = async () => {
    if (!editingUser) return;
    if (!canManageRoles) {
      setActionError("Solo super administracion o administradores de empresa pueden editar roles.");
      return;
    }
    setActionError("");
    try {
      await actualizarRolUsuario(editingUser, { ...roleEdit, rol_id: roleEdit.rol_id || roleOptionsForEdit[0]?.id || "" }, actor);
      setEditingUser(null);
      await load();
    } catch (err) {
      setActionError(err?.message || "No se pudo actualizar el rol del usuario.");
    }
  };

  return (
    <div className="admin-page">
      <style>{adminCss}</style>
      <header className="admin-hero">
        <div>
          <span>Control multiempresa</span>
          <h1>Usuarios, roles y accesos</h1>
          <p>{canManageCommercial ? "Vista comercial INOVA: ventas, planes, empresas y usuarios sin acceso operativo a las bases del cliente." : "Vista limitada a la empresa asignada."}</p>
          <p>Administra solicitudes, licencias por usuario y permisos por pilar sin usuarios quemados en codigo.</p>
        </div>
        <button type="button" onClick={load}>Actualizar</button>
      </header>

      <section className="admin-metrics">
        <Metric icon={Clock3} label="Solicitudes pendientes" value={pendingRequests.length} />
        <Metric icon={Users} label="Usuarios activos" value={activeLicenses} />
        <Metric icon={Building2} label="Empresas" value={visibleEmpresas.length} />
        <Metric icon={ShieldCheck} label="Roles" value={visibleRoles.length} />
      </section>

      {error && (
        <div className="admin-error">
          {error}
          <small>Si ves una tabla inexistente, aplica la migracion `20260524093000_access_control_multiempresa.sql` en sistema.</small>
        </div>
      )}

      {!error && data.missingTables?.length ? (
        <div className="admin-error">
          Faltan tablas en sistema: {data.missingTables.join(", ")}.
          <small>Aplica la migracion `20260524093000_access_control_multiempresa.sql` para activar solicitudes, roles, permisos, planes y licencias.</small>
        </div>
      ) : null}

      {loading ? <EmptyState>Cargando informacion desde el sistema...</EmptyState> : null}

      {actionError ? <div className="admin-error">{actionError}</div> : null}

      {!loading && view === "usuarios" && (
        <>
          <AdminSection
            title="Crear usuario de empresa"
            helper="El administrador de empresa crea usuarios segun el cupo del plan, sin permisos de super administracion."
          >
            <form className="admin-create-user" onSubmit={createDirectUser}>
              <label>Empresa
                <select value={selectedCreateEmpresa} disabled={!canManageCommercial} onChange={(event) => setUserForm((prev) => ({ ...prev, empresa_id: event.target.value, rol_id: "" }))}>
                  {visibleEmpresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
                </select>
              </label>
              <label>Nombre completo<input required value={userForm.nombre} onChange={(event) => setUserForm((prev) => ({ ...prev, nombre: event.target.value }))} /></label>
              <label>Cedula / documento<input required value={userForm.documento} onChange={(event) => setUserForm((prev) => ({ ...prev, documento: event.target.value }))} /></label>
              <label>Telefono<input value={userForm.telefono} onChange={(event) => setUserForm((prev) => ({ ...prev, telefono: event.target.value }))} /></label>
              <label>Cargo<input value={userForm.cargo} onChange={(event) => setUserForm((prev) => ({ ...prev, cargo: event.target.value }))} /></label>
              <label>Pilar
                <select value={userForm.pilar} onChange={(event) => setUserForm((prev) => ({ ...prev, pilar: event.target.value, rol_id: "" }))}>
                  <option value="wms">WMS</option>
                  <option value="5s">5S</option>
                  <option value="eto">ETO</option>
                </select>
              </label>
              {userForm.pilar === "eto" && (
                <label>Nivel ETO
                  <select value={userForm.eto_nivel} onChange={(event) => setUserForm((prev) => ({ ...prev, eto_nivel: event.target.value }))}>
                    <option value="1">Nivel 1</option>
                    <option value="2">Nivel 2</option>
                  </select>
                </label>
              )}
              <label>Rol
                <select required value={userForm.rol_id || roleOptionsForCreate[0]?.id || ""} onChange={(event) => setUserForm((prev) => ({ ...prev, rol_id: event.target.value }))}>
                  {roleOptionsForCreate.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
                </select>
              </label>
              <label>Clave temporal
                <div className="admin-inline-field">
                  <input value={userForm.documento} placeholder="Sera la cedula" readOnly />
                </div>
              </label>
              <div className="admin-plan-box">
                <strong>{activeUsersForCreate} / {planForCreate?.max_usuarios || "sin limite"}</strong>
                <span>{planForCreate?.nombre_plan || "Plan sin limite configurado"}</span>
              </div>
              <div className="admin-form-actions">
                <button type="button" className="preview" onClick={() => setPreviewPayload(createPreviewPayload)}><Eye size={15} /> Vista previa</button>
                <button type="submit" className="primary"><KeyRound size={15} /> Crear usuario</button>
              </div>
            </form>
            {userCreateResult ? (
              <div className="admin-approval-result">
                <strong>Usuario creado</strong>
                <span>Usuario: {userCreateResult.user.usuario || userCreateResult.user.nombre}</span>
                <span>Contrasena temporal: {userCreateResult.claveTemporal}</span>
                <small>Entrega esta clave al usuario por el canal interno definido por la empresa.</small>
              </div>
            ) : null}
          </AdminSection>

          <AdminSection title="Solicitudes de acceso" helper="Bandeja donde apruebas o rechazas nuevos usuarios.">
            <Table
              headers={["Fecha", "Solicitante", "Empresa", "Pilar", "Estado", "Acciones"]}
              empty="No hay solicitudes registradas."
            >
              {data.solicitudes
                .filter((item) => canManageCommercial || String(item.empresa_id) === String(actor.empresaId))
                .map((item) => (
                <tr key={item.id}>
                  <td>{fmtDate(item.fecha_solicitud)}</td>
                  <td>
                    <strong>{item.nombre_completo}</strong>
                    <small>{item.documento} - {item.email}</small>
                  </td>
                  <td>{item.empresa_nombre}</td>
                  <td>{PILLAR_LABELS[item.pilar] || item.pilar}{item.eto_nivel ? ` - Nivel ${item.eto_nivel}` : ""}</td>
                  <td><StatusBadge estado={item.estado} /></td>
                  <td>
                    {item.estado === "PENDIENTE" ? (
                      <div className="admin-actions">
                        <button type="button" onClick={() => openApproval(item)}><CheckCircle2 size={15} /> Aprobar</button>
                        <button type="button" className="danger" onClick={() => reject(item)}><XCircle size={15} /> Rechazar</button>
                      </div>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </Table>
          </AdminSection>

          <AdminSection title="Usuarios registrados" helper="Usuarios de sistema con estado, empresa y accesos por pilar.">
            <Table headers={["Usuario", "Empresa", "Rol", "Estado", "Ultimo acceso", "Acciones"]} empty="No hay usuarios.">
              {visibleUsuarios.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.nombre}</strong>
                    <small>{user.documento || "Sin documento"} - {user.email || user.usuario}</small>
                  </td>
                  <td>{empresaById.get(String(user.empresa_id))?.nombre || user.empresa_id}</td>
                  <td>{user.rol}</td>
                  <td><StatusBadge estado={user.estado} /></td>
                  <td>{fmtDate(user.ultimo_acceso)}</td>
                  <td>
                    <div className="admin-actions">
                      {canManageRoles ? <button type="button" onClick={() => openRoleEdit(user)}><ShieldCheck size={15} /> Editar rol</button> : null}
                      <button type="button" onClick={() => toggleUser(user)}>
                        {user.estado === "ACTIVO" ? <UserX size={15} /> : <UserCheck size={15} />}
                        {user.estado === "ACTIVO" ? "Inactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </AdminSection>
        </>
      )}

      {!loading && view === "roles" && (
        <AdminSection title="Roles y permisos" helper="Roles por empresa. ETO conserva niveles separados.">
          <Table headers={["Rol", "Empresa", "Alcance", "Estado", "Sistema"]} empty="No hay roles.">
            {visibleRoles.map((role) => (
              <tr key={role.id}>
                <td>
                  <strong>{role.nombre}</strong>
                  <small>{role.codigo}</small>
                </td>
                <td>{empresaById.get(String(role.empresa_id))?.nombre || "Global"}</td>
                <td>{role.alcance}</td>
                <td><StatusBadge estado={role.estado} /></td>
                <td>{role.es_sistema ? "Si" : "No"}</td>
              </tr>
            ))}
          </Table>
        </AdminSection>
      )}

      {!loading && view === "empresas" && (
        <AdminSection title="Editar plan de usuarios" helper="Define cuantos usuarios puede tener cada empresa y que pilares incluye el paquete.">
          <form className="admin-plan-form" onSubmit={savePlan}>
            <label>Empresa
              <select value={planForm.empresa_id} disabled={!canManageCommercial} onChange={(event) => changePlanEmpresa(event.target.value)}>
                {visibleEmpresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
              </select>
            </label>
            <label>Nombre del plan
              <input value={planForm.nombre_plan} onChange={(event) => setPlanForm((prev) => ({ ...prev, nombre_plan: event.target.value }))} />
            </label>
            <label>Usuarios incluidos
              <input type="number" min="1" value={planForm.max_usuarios} onChange={(event) => setPlanForm((prev) => ({ ...prev, max_usuarios: event.target.value }))} />
            </label>
            <label>Precio mensual
              <input type="number" min="0" step="1000" value={planForm.precio_mensual} onChange={(event) => setPlanForm((prev) => ({ ...prev, precio_mensual: event.target.value }))} />
            </label>
            <div className="admin-plan-pillars">
              <span>Pilares incluidos</span>
              {["wms", "5s", "eto"].map((pillar) => (
                <label key={pillar}>
                  <input type="checkbox" checked={(planForm.pilares_incluidos || []).includes(pillar)} onChange={() => togglePlanPillar(pillar)} />
                  {PILLAR_LABELS[pillar]}
                </label>
              ))}
            </div>
            <label>Estado
              <select value={planForm.estado} onChange={(event) => setPlanForm((prev) => ({ ...prev, estado: event.target.value }))}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </label>
            <button type="submit" className="primary" disabled={!canManageCommercial}>Guardar plan</button>
          </form>
          {planMessage ? <div className="admin-success">{planMessage}</div> : null}
        </AdminSection>
      )}

      {!loading && view === "empresas" && (
        <AdminSection title="Empresas y planes" helper="Control comercial para vender paquetes por usuario.">
          <Table headers={["Empresa", "Plan", "Estado", "Usuarios activos", "Limite plan"]} empty="No hay empresas.">
            {visibleEmpresas.map((empresa) => {
              const plan = data.planes.find((item) => String(item.empresa_id) === String(empresa.id));
              const users = visibleUsuarios.filter((item) => String(item.empresa_id) === String(empresa.id) && item.estado === "ACTIVO").length;
              return (
                <tr key={empresa.id}>
                  <td>
                    <strong>{empresa.nombre}</strong>
                    <small>{empresa.nit || empresa.slug}</small>
                  </td>
                  <td>{plan?.nombre_plan || empresa.plan || "Sin plan"}</td>
                  <td><StatusBadge estado={empresa.estado} /></td>
                  <td>{users}</td>
                  <td>{plan?.max_usuarios || "-"}</td>
                </tr>
              );
            })}
          </Table>
        </AdminSection>
      )}

      {!loading && view === "auditoria" && (
        <AdminSection title="Auditoria" helper="Base lista para registrar eventos administrativos.">
          <EmptyState>La tabla `auditoria_admin` quedo preparada para registrar aprobaciones, cambios de rol y cambios de licencias.</EmptyState>
        </AdminSection>
      )}

      {selectedRequest && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h2>Aprobar solicitud</h2>
            <p>{selectedRequest.nombre_completo} - {PILLAR_LABELS[selectedRequest.pilar]}</p>
            <label>
              Empresa
              <select value={approval.empresa_id} onChange={(event) => setApproval((prev) => ({ ...prev, empresa_id: event.target.value }))}>
                {visibleEmpresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
              </select>
            </label>
            <label>
              Rol
              <select value={approval.rol_id} onChange={(event) => setApproval((prev) => ({ ...prev, rol_id: event.target.value }))}>
                {visibleRoles
                  .filter((role) => !approval.empresa_id || String(role.empresa_id) === String(approval.empresa_id))
                  .map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
              </select>
            </label>
            {selectedRequest.pilar === "eto" && (
              <label>
                Nivel ETO
                <select value={approval.eto_nivel} onChange={(event) => setApproval((prev) => ({ ...prev, eto_nivel: event.target.value }))}>
                  <option value="1">Nivel 1</option>
                  <option value="2">Nivel 2</option>
                </select>
              </label>
            )}
            <label>
              Clave temporal generada
              <div className="admin-inline-field">
                <input value={approval.clave_acceso} onChange={(event) => setApproval((prev) => ({ ...prev, clave_acceso: event.target.value }))} />
                <button type="button" onClick={() => setApproval((prev) => ({ ...prev, clave_acceso: generarClaveTemporal() }))}>Generar</button>
              </div>
            </label>
            {approvalResult ? (
              <div className="admin-approval-result">
                <strong>Acceso aprobado</strong>
                <span>Usuario: {selectedRequest.email}</span>
                <span>Contrasena temporal: {approvalResult.claveTemporal}</span>
                <small>El usuario puede consultar la aprobacion desde el login con su clave de consulta.</small>
              </div>
            ) : null}
            <div className="admin-modal-actions">
              <button type="button" onClick={() => setSelectedRequest(null)}>Cancelar</button>
              {!approvalResult && approvalPreviewPayload ? (
                <button type="button" className="preview" onClick={() => setPreviewPayload(approvalPreviewPayload)}><Eye size={15} /> Vista previa</button>
              ) : null}
              {approvalResult ? (
                <button type="button" className="primary" onClick={() => setSelectedRequest(null)}>Finalizar</button>
              ) : (
                <button type="button" className="primary" onClick={confirmApproval}><KeyRound size={15} /> Aprobar y generar clave</button>
              )}
            </div>
          </div>
        </div>
      )}


      {previewPayload && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-preview-modal">
            <div className="admin-preview-head">
              <div>
                <h2>Vista previa de acceso</h2>
                <p>Tarjeta informativa para revisar los datos antes de crear o aprobar el usuario.</p>
              </div>
              <button type="button" onClick={() => setPreviewPayload(null)}>Cerrar</button>
            </div>
            <iframe title="Vista previa correo aprobado" srcDoc={buildApprovalEmailHtml(previewPayload)} />
          </div>
        </div>
      )}
      {editingUser && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h2>Editar rol y acceso</h2>
            <p>{editingUser.nombre} - {editingUser.email || editingUser.usuario}</p>
            <label>
              Empresa
              <select
                value={roleEdit.empresa_id}
                disabled={!canManageCommercial}
                onChange={(event) => setRoleEdit((prev) => ({ ...prev, empresa_id: event.target.value, rol_id: "" }))}
              >
                {visibleEmpresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
              </select>
            </label>
            <label>
              Pilar
              <select value={roleEdit.pilar} onChange={(event) => setRoleEdit((prev) => ({ ...prev, pilar: event.target.value, rol_id: "" }))}>
                <option value="wms">WMS</option>
                <option value="5s">5S</option>
                <option value="eto">ETO</option>
              </select>
            </label>
            {roleEdit.pilar === "eto" && (
              <label>
                Nivel ETO
                <select value={roleEdit.eto_nivel} onChange={(event) => setRoleEdit((prev) => ({ ...prev, eto_nivel: event.target.value }))}>
                  <option value="1">Nivel 1</option>
                  <option value="2">Nivel 2</option>
                </select>
              </label>
            )}
            <label>
              Rol
              <select value={roleEdit.rol_id || roleOptionsForEdit[0]?.id || ""} onChange={(event) => setRoleEdit((prev) => ({ ...prev, rol_id: event.target.value }))}>
                {roleOptionsForEdit.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
              </select>
            </label>
            <label>
              Estado del acceso
              <select value={roleEdit.estado} onChange={(event) => setRoleEdit((prev) => ({ ...prev, estado: event.target.value }))}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </label>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => setEditingUser(null)}>Cancelar</button>
              <button type="button" className="primary" onClick={saveRoleEdit}><ShieldCheck size={15} /> Guardar rol</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <article>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AdminSection({ title, helper, children }) {
  return (
    <section className="admin-section">
      <header>
        <div>
          <h2>{title}</h2>
          <p>{helper}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Table({ headers, children, empty }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div className="admin-table-wrap">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.length ? rows : <tr><td colSpan={headers.length}>{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
}

const adminCss = `
.admin-page { padding: 28px; color: #10162f; font-family: Inter, system-ui, sans-serif; }
.admin-hero, .admin-section, .admin-metrics article { border: 1px solid #e3e9f4; background: rgba(255,255,255,.96); border-radius: 14px; box-shadow: 0 16px 40px rgba(15,23,42,.08); }
.admin-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; align-items: flex-start; }
.admin-hero span { color: #6d5bd0; text-transform: uppercase; font-size: 11px; letter-spacing: .12em; font-weight: 900; }
.admin-hero h1 { margin: 6px 0; font-size: 30px; line-height: 1; }
.admin-hero p { margin: 0; color: #64748b; max-width: 760px; }
button { border: 1px solid #d8e1ef; background: #fff; border-radius: 10px; padding: 9px 12px; font-weight: 850; cursor: pointer; color: #13213a; display: inline-flex; gap: 7px; align-items: center; justify-content: center; }
button.primary, .admin-actions button:first-child { background: #5b4ee6; border-color: #5b4ee6; color: #fff; }
button.danger { color: #dc2626; border-color: #fecaca; background: #fff5f5; }
button.preview { color: #5b4ee6; border-color: #ddd6fe; background: #f5f3ff; }
.admin-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
.admin-metrics article { padding: 16px; display: grid; gap: 6px; }
.admin-metrics svg { color: #5b4ee6; }
.admin-metrics span { color: #64748b; font-size: 12px; font-weight: 800; }
.admin-metrics strong { font-size: 28px; }
.admin-section { margin-top: 16px; overflow: hidden; }
.admin-section header { padding: 18px 20px; border-bottom: 1px solid #e8eef7; }
.admin-section h2 { margin: 0; font-size: 20px; }
.admin-section p { margin: 4px 0 0; color: #64748b; }
.admin-table-wrap { overflow: auto; }
.admin-table-wrap table { width: 100%; border-collapse: collapse; min-width: 860px; }
.admin-table-wrap th { text-align: left; background: #f4f7fb; color: #17213b; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; padding: 12px; }
.admin-table-wrap td { border-top: 1px solid #edf1f7; padding: 12px; vertical-align: middle; font-size: 13px; }
.admin-table-wrap td strong, .admin-table-wrap td small { display: block; }
.admin-table-wrap td small { color: #64748b; margin-top: 3px; }
.admin-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.admin-status { display: inline-flex; border-radius: 999px; padding: 6px 9px; font-size: 11px; font-weight: 900; background: #eef2ff; color: #4338ca; }
.admin-status-activo, .admin-status-activa, .admin-status-aprobada { background: #dcfce7; color: #047857; }
.admin-status-pendiente { background: #fef3c7; color: #a16207; }
.admin-status-inactivo, .admin-status-rechazada { background: #fee2e2; color: #dc2626; }
.admin-error, .admin-empty { margin-top: 16px; border: 1px solid #fecaca; background: #fff5f5; color: #991b1b; border-radius: 12px; padding: 14px; display: grid; gap: 4px; }
.admin-empty { border-color: #dbe5f2; background: #f8fafc; color: #64748b; }
.admin-modal-backdrop { position: fixed; inset: 0; z-index: 200000; display: grid; place-items: center; background: rgba(15,23,42,.38); backdrop-filter: blur(4px); }
.admin-modal { width: min(520px, calc(100vw - 28px)); background: #fff; border-radius: 16px; padding: 22px; box-shadow: 0 30px 80px rgba(15,23,42,.26); display: grid; gap: 12px; }
.admin-modal h2, .admin-modal p { margin: 0; }
.admin-modal label { display: grid; gap: 6px; font-weight: 850; font-size: 12px; color: #475569; }
.admin-modal input, .admin-modal select { border: 1px solid #d8e1ef; border-radius: 10px; padding: 10px; }
.admin-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.admin-inline-field { display: flex; gap: 8px; }
.admin-inline-field input { flex: 1; }
.admin-email-preview { display: grid; gap: 8px; border: 1px solid #dbe5f2; background: #f8fafc; border-radius: 14px; padding: 12px; }
.admin-email-preview strong { color: #17213b; }
.admin-email-preview iframe { width: 100%; height: 520px; border: 1px solid #e3e9f4; border-radius: 12px; background: #f3f6fb; }
.admin-preview-modal { width: min(640px, calc(100vw - 28px)); max-height: calc(100vh - 32px); padding: 16px; }
.admin-preview-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.admin-preview-modal iframe { width: 100%; height: min(760px, calc(100vh - 140px)); border: 1px solid #e3e9f4; border-radius: 14px; background: #f3f6fb; }
.admin-approval-result { display: grid; gap: 5px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #14532d; border-radius: 12px; padding: 12px; }
.admin-approval-result a { color: #047857; font-weight: 900; text-decoration: underline; }
.admin-create-user { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 18px 20px 20px; }
.admin-create-user label { display: grid; gap: 6px; color: #475569; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
.admin-create-user input, .admin-create-user select { width: 100%; border: 1px solid #d8e1ef; border-radius: 10px; padding: 10px; color: #17213b; background: #fff; text-transform: none; letter-spacing: 0; font-size: 13px; font-weight: 750; }
.admin-create-user .admin-inline-field { align-items: center; }
.admin-plan-box { border: 1px solid #dbeafe; background: #eff6ff; color: #1d4ed8; border-radius: 12px; padding: 10px 12px; display: grid; gap: 3px; align-content: center; }
.admin-plan-box strong { font-size: 16px; }
.admin-plan-box span { color: #64748b; font-size: 12px; font-weight: 800; }
.admin-form-actions { align-self: end; display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 8px; }
.admin-form-actions button { height: 40px; white-space: nowrap; }
.admin-form-actions button.preview { width: 42px; padding: 0; color: #5b4ee6; background: #f5f3ff; border-color: #ddd6fe; font-size: 0; }
.admin-form-actions button.preview svg { margin: 0; }
.admin-create-user > button.primary { align-self: end; height: 40px; }
.admin-plan-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 18px 20px 20px; }
.admin-plan-form label { display: grid; gap: 6px; color: #475569; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
.admin-plan-form input, .admin-plan-form select { width: 100%; border: 1px solid #d8e1ef; border-radius: 10px; padding: 10px; color: #17213b; background: #fff; text-transform: none; letter-spacing: 0; font-size: 13px; font-weight: 750; }
.admin-plan-pillars { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.admin-plan-pillars span { width: 100%; color: #475569; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; }
.admin-plan-pillars label { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #17213b; }
.admin-plan-pillars input { width: auto; }
.admin-plan-form > button.primary { align-self: end; height: 40px; }
.admin-success { margin: 0 20px 20px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #14532d; border-radius: 12px; padding: 12px; font-weight: 900; }
@media (max-width: 900px) { .admin-page { padding: 14px; } .admin-hero, .admin-metrics { grid-template-columns: 1fr; } .admin-metrics { display: grid; } }
`;




