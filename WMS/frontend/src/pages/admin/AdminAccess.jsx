import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import {
  aprobarSolicitud,
  cambiarEstadoUsuario,
  getAccessCatalogs,
  rechazarSolicitud,
} from "../../adminApi";

const PILLAR_LABELS = { wms: "WMS", "5s": "5S", eto: "ETO" };

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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approval, setApproval] = useState({ empresa_id: "", rol_id: "", clave_acceso: "", eto_nivel: "1" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getAccessCatalogs());
    } catch (err) {
      setError(err?.message || "No se pudo cargar administración de accesos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pendingRequests = useMemo(
    () => data.solicitudes.filter((item) => item.estado === "PENDIENTE"),
    [data.solicitudes]
  );

  const activeLicenses = useMemo(
    () => data.usuarios.filter((item) => item.estado === "ACTIVO").length,
    [data.usuarios]
  );

  const empresaById = useMemo(
    () => new Map(data.empresas.map((item) => [String(item.id), item])),
    [data.empresas]
  );

  const roleById = useMemo(
    () => new Map(data.roles.map((item) => [String(item.id), item])),
    [data.roles]
  );

  const openApproval = (solicitud) => {
    const defaultEmpresa = solicitud.empresa_id || data.empresas[0]?.id || "";
    const defaultRole =
      data.roles.find((rol) => String(rol.empresa_id) === String(defaultEmpresa) && rol.codigo.includes(String(solicitud.pilar).toUpperCase())) ||
      data.roles.find((rol) => String(rol.empresa_id) === String(defaultEmpresa)) ||
      data.roles[0];
    setSelectedRequest(solicitud);
    setApproval({
      empresa_id: defaultEmpresa,
      rol_id: defaultRole?.id || "",
      clave_acceso: solicitud.documento || "",
      eto_nivel: String(solicitud.eto_nivel || 1),
    });
  };

  const confirmApproval = async () => {
    if (!selectedRequest) return;
    await aprobarSolicitud(selectedRequest, approval);
    setSelectedRequest(null);
    await load();
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

  return (
    <div className="admin-page">
      <style>{adminCss}</style>
      <header className="admin-hero">
        <div>
          <span>Control multiempresa</span>
          <h1>Usuarios, roles y accesos</h1>
          <p>Administra solicitudes, licencias por usuario y permisos por pilar sin usuarios quemados en código.</p>
        </div>
        <button type="button" onClick={load}>Actualizar</button>
      </header>

      <section className="admin-metrics">
        <Metric icon={Clock3} label="Solicitudes pendientes" value={pendingRequests.length} />
        <Metric icon={Users} label="Usuarios activos" value={activeLicenses} />
        <Metric icon={Building2} label="Empresas" value={data.empresas.length} />
        <Metric icon={ShieldCheck} label="Roles" value={data.roles.length} />
      </section>

      {error && (
        <div className="admin-error">
          {error}
          <small>Si ves una tabla inexistente, aplica la migración `20260524093000_access_control_multiempresa.sql` en Supabase.</small>
        </div>
      )}

      {loading ? <EmptyState>Cargando información desde Supabase...</EmptyState> : null}

      {!loading && view === "usuarios" && (
        <>
          <AdminSection title="Solicitudes de acceso" helper="Bandeja donde apruebas o rechazas nuevos usuarios.">
            <Table
              headers={["Fecha", "Solicitante", "Empresa", "Pilar", "Estado", "Acciones"]}
              empty="No hay solicitudes registradas."
            >
              {data.solicitudes.map((item) => (
                <tr key={item.id}>
                  <td>{fmtDate(item.fecha_solicitud)}</td>
                  <td>
                    <strong>{item.nombre_completo}</strong>
                    <small>{item.documento} · {item.email}</small>
                  </td>
                  <td>{item.empresa_nombre}</td>
                  <td>{PILLAR_LABELS[item.pilar] || item.pilar}{item.eto_nivel ? ` · Nivel ${item.eto_nivel}` : ""}</td>
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

          <AdminSection title="Usuarios registrados" helper="Usuarios de Supabase con estado, empresa y accesos por pilar.">
            <Table headers={["Usuario", "Empresa", "Rol", "Estado", "Último acceso", "Acciones"]} empty="No hay usuarios.">
              {data.usuarios.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.nombre}</strong>
                    <small>{user.documento || "Sin documento"} · {user.email || user.usuario}</small>
                  </td>
                  <td>{empresaById.get(String(user.empresa_id))?.nombre || user.empresa_id}</td>
                  <td>{user.rol}</td>
                  <td><StatusBadge estado={user.estado} /></td>
                  <td>{fmtDate(user.ultimo_acceso)}</td>
                  <td>
                    <button type="button" onClick={() => toggleUser(user)}>
                      {user.estado === "ACTIVO" ? <UserX size={15} /> : <UserCheck size={15} />}
                      {user.estado === "ACTIVO" ? "Inactivar" : "Activar"}
                    </button>
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
            {data.roles.map((role) => (
              <tr key={role.id}>
                <td>
                  <strong>{role.nombre}</strong>
                  <small>{role.codigo}</small>
                </td>
                <td>{empresaById.get(String(role.empresa_id))?.nombre || "Global"}</td>
                <td>{role.alcance}</td>
                <td><StatusBadge estado={role.estado} /></td>
                <td>{role.es_sistema ? "Sí" : "No"}</td>
              </tr>
            ))}
          </Table>
        </AdminSection>
      )}

      {!loading && view === "empresas" && (
        <AdminSection title="Empresas y planes" helper="Control comercial para vender paquetes por usuario.">
          <Table headers={["Empresa", "Plan", "Estado", "Usuarios activos", "Límite plan"]} empty="No hay empresas.">
            {data.empresas.map((empresa) => {
              const plan = data.planes.find((item) => String(item.empresa_id) === String(empresa.id));
              const users = data.usuarios.filter((item) => String(item.empresa_id) === String(empresa.id) && item.estado === "ACTIVO").length;
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
        <AdminSection title="Auditoría" helper="Base lista para registrar eventos administrativos.">
          <EmptyState>La tabla `auditoria_admin` quedó preparada para registrar aprobaciones, cambios de rol y cambios de licencias.</EmptyState>
        </AdminSection>
      )}

      {selectedRequest && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h2>Aprobar solicitud</h2>
            <p>{selectedRequest.nombre_completo} · {PILLAR_LABELS[selectedRequest.pilar]}</p>
            <label>
              Empresa
              <select value={approval.empresa_id} onChange={(event) => setApproval((prev) => ({ ...prev, empresa_id: event.target.value }))}>
                {data.empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>)}
              </select>
            </label>
            <label>
              Rol
              <select value={approval.rol_id} onChange={(event) => setApproval((prev) => ({ ...prev, rol_id: event.target.value }))}>
                {data.roles
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
              Clave temporal
              <input value={approval.clave_acceso} onChange={(event) => setApproval((prev) => ({ ...prev, clave_acceso: event.target.value }))} />
            </label>
            <div className="admin-modal-actions">
              <button type="button" onClick={() => setSelectedRequest(null)}>Cancelar</button>
              <button type="button" className="primary" onClick={confirmApproval}><KeyRound size={15} /> Aprobar y crear acceso</button>
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
@media (max-width: 900px) { .admin-page { padding: 14px; } .admin-hero, .admin-metrics { grid-template-columns: 1fr; } .admin-metrics { display: grid; } }
`;
