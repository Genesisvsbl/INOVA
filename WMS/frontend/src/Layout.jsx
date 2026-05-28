import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Bell,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileText,
  Home,
  LogOut,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

const COLORS = {
  navy: "#070b1a",
  navy2: "#08142b",
  blue: "#2563eb",
  purple: "#7c3aed",
  cyan: "#06b6d4",
  text: "#10162f",
  muted: "#667085",
  line: "#e7ecf4",
  soft: "#f7f9fd",
};

function useViewport() {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}


function getConfig(width) {
  const isMobile = width <= 760;
  const isTablet = width > 760 && width <= 1180;

  return {
    isMobile,
    isTablet,
    scale: isMobile ? 1 : isTablet ? 0.92 : 0.82,
    headerHeight: isMobile ? 68 : isTablet ? 78 : 78,
    sidebarCollapsed: isMobile ? 0 : isTablet ? 76 : 86,
    sidebarExpanded: isMobile ? Math.min(width * 0.86, 330) : isTablet ? 282 : 300,
    gap: isMobile ? 10 : isTablet ? 14 : 18,
  };
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const viewportWidth = useViewport();
  const config = useMemo(() => getConfig(viewportWidth), [viewportWidth]);

  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const usuario = sessionStorage.getItem("usuario") || "Gvisbal";
  const rol = sessionStorage.getItem("rol") || "SUPER_ADMIN";
  const permisos = JSON.parse(sessionStorage.getItem("permisos") || "[]");
  const roleKey = String(rol || "").toUpperCase();
  const esPlatformAdmin =
    sessionStorage.getItem("esPlatformAdmin") === "true" ||
    ["ADMIN_INOVA", "INOVA_ADMIN", "ADMIN_PLATAFORMA", "PLATFORM_ADMIN"].includes(roleKey);

  const puedeVerAdmin =
    esPlatformAdmin ||
    sessionStorage.getItem("esSuperAdmin") === "true" ||
    roleKey === "SUPER_ADMIN" ||
    roleKey.includes("ADMIN") ||
    permisos.includes("admin.usuarios.gestionar") ||
    permisos.includes("admin.roles.gestionar");

  const sidebarExpanded = config.isMobile ? sidebarPinned : sidebarPinned || sidebarHover;

  useEffect(() => {
    if (config.isMobile) {
      setSidebarPinned(false);
      setSidebarHover(false);
    }

    setOpenMenu(null);
  }, [config.isMobile, location.pathname]);

  const isDatosActive = location.pathname.startsWith("/datos-maestros");
  const isMovimientosActive = location.pathname.startsWith("/movimientos");
  const isInventariosActive = location.pathname.startsWith("/inventarios");
  const isAdminUsuariosActive = location.pathname.startsWith("/admin/usuarios");
  const isAdminRolesActive = location.pathname.startsWith("/admin/roles");
  const isAdminAuditoriaActive = location.pathname.startsWith("/admin/auditoria");
  const visibleOpenMenu = openMenu;

  const contentPaddingLeft = config.isMobile
    ? config.gap
    : (sidebarExpanded ? config.sidebarExpanded : config.sidebarCollapsed) + config.gap * 2;

  const toggleMenu = (key) => {
    if (!sidebarExpanded) {
      setSidebarPinned(true);
    }

    setOpenMenu((value) => (value === key ? null : key));
  };

  const closeMobileMenu = () => {
    if (config.isMobile) setSidebarPinned(false);
  };

  const handleSidebarNavClick = (event) => {
    // En celular NO cierres el menú cuando se toca un módulo desplegable.
    // Solo cierra cuando realmente se entra a una ruta/link.
    if (!config.isMobile) return;

    const clickedLink = event.target.closest("a");
    if (clickedLink) {
      setSidebarPinned(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="layout-root"
      style={{
        "--ui-scale": config.scale,
        "--header-height": `${config.headerHeight}px`,
      }}
    >
      <style>{css}</style>

      <header className="topbar" style={{ height: config.headerHeight }}>
        <div className="topbar-left">
          <button
            type="button"
            className="top-icon-btn"
            onClick={() => setSidebarPinned((value) => !value)}
            aria-label={sidebarExpanded ? "Cerrar menú" : "Abrir menú"}
          >
            {config.isMobile ? (
              sidebarExpanded ? <X size={20} /> : <Menu size={21} />
            ) : sidebarPinned ? (
              <PanelLeftClose size={19} />
            ) : (
              <PanelLeftOpen size={19} />
            )}
          </button>

          <BrandHeader />
        </div>

        <div className="topbar-right">
          <button type="button" className="top-icon-btn notification-btn" aria-label="Notificaciones">
            <Bell size={18} />
            <i />
          </button>

          <div className="user-chip">
            <div className="user-avatar">
              <UserRound size={17} />
            </div>
            <div className="user-info">
              <strong>{usuario}</strong>
              <small>{rol}</small>
            </div>
            <ChevronDown className="user-chevron" size={16} />
          </div>
        </div>
      </header>

      {!config.isMobile && !sidebarPinned && (
        <div
          className="sidebar-hotzone-global"
          onMouseEnter={() => {
            setSidebarHover(true);
            setOpenMenu(null);
          }}
        />
      )}

      <section className="workspace" style={{ height: `calc(100dvh - ${config.headerHeight}px)` }}>
        <main className="content-area">
          <div
            className="content-wrap"
            style={{
              paddingLeft: contentPaddingLeft,
              paddingRight: config.gap,
              paddingTop: config.gap,
              paddingBottom: config.gap,
            }}
          >
            <div className="content-card">
              <Outlet />
            </div>
          </div>
        </main>

        {config.isMobile && sidebarExpanded && (
          <button
            type="button"
            className="mobile-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setSidebarPinned(false)}
          />
        )}

        <aside
          className={sidebarExpanded ? "sidebar expanded" : "sidebar collapsed"}
          style={{
            width: sidebarExpanded ? config.sidebarExpanded : config.sidebarCollapsed,
            left: config.gap,
            top: config.gap,
            bottom: config.gap,
            transform: config.isMobile && !sidebarExpanded ? `translateX(-${config.sidebarExpanded + config.gap}px)` : "translateX(0)",
          }}
          onMouseEnter={() => {
            if (!config.isMobile) setSidebarHover(true);
          }}
          onMouseLeave={() => {
            if (!config.isMobile && !sidebarPinned) {
              setSidebarHover(false);
              setOpenMenu(null);
            }
          }}
        >
          <div className="sidebar-inner">
            <div className="sidebar-top">
              {sidebarExpanded ? <BrandSidebar /> : <img className="sidebar-logo-mini" src="/INOVA2026.png" alt="INOVA" />}
            </div>

            <nav className="sidebar-nav" onClick={handleSidebarNavClick}>
              {!esPlatformAdmin && (
                <>
                  {sidebarExpanded && <SectionTitle>Operaciones</SectionTitle>}

                  <NavLink to="/" style={(state) => navStyle(state, sidebarExpanded)} title="Inicio">
                    <Home size={18} />
                    {sidebarExpanded && <span>Inicio</span>}
                  </NavLink>

                  <button
                    type="button"
                    style={menuStyle(isDatosActive, sidebarExpanded)}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMenu("datosMaestros");
                    }}
                    onMouseEnter={() => {}}
                    title="Datos maestros"
                  >
                    <span className="menu-left">
                      <Database size={18} />
                      {sidebarExpanded && <span>Datos maestros</span>}
                    </span>
                    {sidebarExpanded && (visibleOpenMenu === "datosMaestros" ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </button>

                  {sidebarExpanded && visibleOpenMenu === "datosMaestros" && (
                    <SubNav>
                      <NavLink to="/datos-maestros/materiales" style={childNavStyle}>Materiales</NavLink>
                      <NavLink to="/datos-maestros/proveedores" style={childNavStyle}>Proveedores</NavLink>
                      <NavLink to="/datos-maestros/ubicaciones" style={childNavStyle}>Ubicaciones</NavLink>
                      <NavLink to="/datos-maestros/motor" style={childNavStyle}>Motor principal</NavLink>
                      <NavLink to="/datos-maestros/rotulos" style={childNavStyle}>Historial de rótulos</NavLink>
                      <NavLink to="/datos-maestros/en-transito" style={childNavStyle}>En tránsito</NavLink>
                    </SubNav>
                  )}

                  <button
                    type="button"
                    style={menuStyle(isMovimientosActive, sidebarExpanded)}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMenu("movimientos");
                    }}
                    onMouseEnter={() => {}}
                    title="Movimientos"
                  >
                    <span className="menu-left">
                      <ArrowRightLeft size={18} />
                      {sidebarExpanded && <span>Movimientos</span>}
                    </span>
                    {sidebarExpanded && (visibleOpenMenu === "movimientos" ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </button>

                  {sidebarExpanded && visibleOpenMenu === "movimientos" && (
                    <SubNav>
                      <NavLink to="/movimientos/recibo" style={childNavStyle}>Recibo</NavLink>
                      <NavLink to="/movimientos/despacho" style={childNavStyle}>Despacho</NavLink>
                      <NavLink to="/movimientos/reasignacion" style={childNavStyle}>Reasignación</NavLink>
                    </SubNav>
                  )}

                  <NavLink to="/stock" style={(state) => navStyle(state, sidebarExpanded)} title="Stock">
                    <Boxes size={18} />
                    {sidebarExpanded && <span>Stock</span>}
                  </NavLink>

                  <NavLink to="/layout-zona" style={(state) => navStyle(state, sidebarExpanded)} title="Layout por zona">
                    <Map size={18} />
                    {sidebarExpanded && <span>Layout por zona</span>}
                  </NavLink>

                  <button
                    type="button"
                    style={menuStyle(isInventariosActive, sidebarExpanded)}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMenu("inventarios");
                    }}
                    onMouseEnter={() => {}}
                    title="Inventarios"
                  >
                    <span className="menu-left">
                      <ClipboardCheck size={18} />
                      {sidebarExpanded && <span>Inventarios</span>}
                    </span>
                    {sidebarExpanded && (visibleOpenMenu === "inventarios" ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                  </button>

                  {sidebarExpanded && visibleOpenMenu === "inventarios" && (
                    <SubNav>
                      <NavLink to="/inventarios" style={childNavStyle}>Panel inventarios</NavLink>
                      <NavLink to="/inventarios/crear-tarea" style={childNavStyle}>Crear tarea</NavLink>
                      <NavLink to="/inventarios/mis-conteos" style={childNavStyle}>Mis conteos</NavLink>
                      <NavLink to="/inventarios/conteo-fisico" style={childNavStyle}>Conteo físico</NavLink>
                      <NavLink to="/inventarios/conciliacion" style={childNavStyle}>Conciliación</NavLink>
                      <NavLink to="/inventarios/reconteos" style={childNavStyle}>Reconteos</NavLink>
                      <NavLink to="/inventarios/informe" style={childNavStyle}>Informe inventario</NavLink>
                    </SubNav>
                  )}
                </>
              )}

              {puedeVerAdmin && sidebarExpanded && <SectionTitle>Administración</SectionTitle>}

              {puedeVerAdmin && (
                <>
                  <NavLink
                    to="/admin/usuarios"
                    style={() => navStyle({ isActive: isAdminUsuariosActive }, sidebarExpanded)}
                    title="Usuarios"
                  >
                    <Users size={18} />
                    {sidebarExpanded && <span>Usuarios</span>}
                  </NavLink>

                  <NavLink
                    to="/admin/roles"
                    style={() => navStyle({ isActive: isAdminRolesActive }, sidebarExpanded)}
                    title="Roles y permisos"
                  >
                    <ShieldCheck size={18} />
                    {sidebarExpanded && <span>Roles y permisos</span>}
                  </NavLink>

                  <NavLink
                    to="/admin/auditoria"
                    style={() => navStyle({ isActive: isAdminAuditoriaActive }, sidebarExpanded)}
                    title="Auditoría"
                  >
                    <FileText size={18} />
                    {sidebarExpanded && <span>Auditoría</span>}
                  </NavLink>

                  <NavLink
                    to="/admin/configuracion"
                    style={(state) => navStyle(state, sidebarExpanded)}
                    title="Configuración"
                  >
                    <Settings size={18} />
                    {sidebarExpanded && <span>Configuración</span>}
                  </NavLink>
                </>
              )}
            </nav>

            {sidebarExpanded && (
              <div className="sidebar-bottom-card">
                <div className="circuit-bg" />
                <Settings size={17} />
                <span>Administración</span>
              </div>
            )}

            {sidebarExpanded && (
              <button type="button" className="logout-btn" onClick={handleLogout}>
                <LogOut size={17} />
                Cerrar sesión
              </button>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="brand-header">
      <img src="/INOVA2026.png" alt="INOVA" loading="eager" decoding="sync" fetchPriority="high" />
      <small>WMS</small>
    </div>
  );
}

function BrandSidebar() {
  return (
    <div className="brand-sidebar">
      <img src="/INOVA2026.png" alt="INOVA" loading="eager" decoding="sync" fetchPriority="high" />
      <small>WMS</small>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

function SubNav({ children }) {
  const itemCount = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div
      className="subnav"
      role="group"
      style={{
        gridTemplateRows: `repeat(${itemCount}, 34px)`,
        minHeight: itemCount * 37 + 10,
      }}
    >
      {children}
    </div>
  );
}

function navStyle({ isActive }, expanded) {
  return {
    minHeight: expanded ? 44 : 48,
    height: expanded ? 44 : 48,
    width: expanded ? "100%" : 48,
    display: "flex",
    alignItems: "center",
    justifyContent: expanded ? "flex-start" : "center",
    gap: 12,
    padding: expanded ? "0 14px" : 0,
    borderRadius: expanded ? 14 : 16,
    color: isActive ? "#4338ca" : "#17213b",
    background: isActive
      ? expanded
        ? "linear-gradient(135deg, rgba(124,58,237,.12), rgba(37,99,235,.08))"
        : "linear-gradient(145deg, rgba(255,255,255,.98), rgba(238,244,255,.95))"
      : "transparent",
    border: `1px solid ${isActive ? "rgba(99,102,241,.24)" : "transparent"}`,
    textDecoration: "none",
    fontWeight: isActive ? 900 : 750,
    fontSize: 13,
    letterSpacing: "-.01em",
    boxShadow: isActive
      ? expanded
        ? "inset 4px 0 0 #6366f1, 0 10px 24px rgba(79,70,229,.10)"
        : "0 8px 18px rgba(79,70,229,.18), inset 0 0 0 1px rgba(255,255,255,.82)"
      : "none",
    outline: "none",
    transition: "background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease",
  };
}

function menuStyle(active, expanded) {
  return {
    minHeight: expanded ? 44 : 48,
    height: expanded ? 44 : 48,
    width: expanded ? "100%" : 48,
    display: "flex",
    alignItems: "center",
    justifyContent: expanded ? "space-between" : "center",
    gap: 12,
    padding: expanded ? "0 14px" : 0,
    borderRadius: expanded ? 14 : 16,
    color: active ? "#4338ca" : "#17213b",
    background: active
      ? expanded
        ? "linear-gradient(135deg, rgba(124,58,237,.12), rgba(37,99,235,.08))"
        : "linear-gradient(145deg, rgba(255,255,255,.98), rgba(238,244,255,.95))"
      : "transparent",
    border: `1px solid ${active ? "rgba(99,102,241,.24)" : "transparent"}`,
    fontWeight: active ? 900 : 750,
    fontSize: 13,
    letterSpacing: "-.01em",
    cursor: "pointer",
    boxShadow: active
      ? expanded
        ? "inset 4px 0 0 #6366f1, 0 10px 24px rgba(79,70,229,.10)"
        : "0 8px 18px rgba(79,70,229,.18), inset 0 0 0 1px rgba(255,255,255,.82)"
      : "none",
    outline: "none",
    transition: "background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease",
  };
}

const childNavStyle = ({ isActive }) => ({
  minHeight: 34,
  height: 34,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "0 10px 0 44px",
  borderRadius: 12,
  color: isActive ? "#4f46e5" : "#667085",
  background: isActive ? "rgba(124,58,237,.08)" : "transparent",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: isActive ? 850 : 700,
});

const css = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; }
body { overflow: hidden; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #eef4fb; }
button, input { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }

.layout-root {
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  color: #10162f;
  background:
    radial-gradient(circle at 8% -8%, rgba(99,102,241,.13), transparent 30%),
    radial-gradient(circle at 90% 0%, rgba(14,165,233,.12), transparent 30%),
    linear-gradient(135deg, rgba(255,255,255,.44) 0 1px, transparent 1px),
    linear-gradient(180deg, #f8fbff 0%, #edf4fb 48%, #e9f1f9 100%);
  background-size: auto, auto, 42px 42px, auto;
}

.topbar {
  width: calc(100% / var(--ui-scale));
  transform: scale(var(--ui-scale));
  transform-origin: top left;
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(300px, 1fr);
  align-items: center;
  gap: 18px;
  padding: 0 clamp(16px, 2vw, 28px);
  background:
    radial-gradient(circle at 27% 100%, rgba(124,58,237,.35), transparent 12%),
    radial-gradient(circle at 75% 100%, rgba(6,182,212,.28), transparent 14%),
    linear-gradient(180deg, #070b1a 0%, #050713 100%);
  border-bottom: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 16px 42px rgba(15,23,42,.20);
  position: relative;
  z-index: 80;
}

.topbar-left, .topbar-right { min-width: 0; display: flex; align-items: center; gap: 14px; }
.topbar-right { justify-content: flex-end; }

.top-icon-btn {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  line-height: 0;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  color: rgba(255,255,255,.84);
  background: rgba(255,255,255,.055);
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}

.top-icon-btn svg {
  display: block;
  margin: auto;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  overflow: hidden;
}
.brand-header img {
  width: 118px;
  height: 34px;
  object-fit: contain;
  object-position: left center;
  flex: 0 1 auto;
  min-width: 0;
}
.brand-header strong {
  display: block;
  color: #fff;
  font-size: 23px;
  line-height: .92;
  font-weight: 950;
  letter-spacing: .04em;
}
.brand-header small {
  display: block;
  margin-left: 2px;
  color: rgba(255,255,255,.82);
  font-size: 10px;
  line-height: 1;
  font-weight: 850;
  letter-spacing: .15em;
  white-space: nowrap;
  text-shadow: none;
}


.notification-btn { position: relative; }
.notification-btn i {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #fb7185;
  box-shadow: 0 0 12px rgba(251,113,133,.8);
}

.user-chip {
  min-width: 0;
  height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 0 6px;
  border-radius: 999px;
  color: #fff;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.065);
}
.user-avatar {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  box-shadow: 0 0 20px rgba(124,58,237,.35);
}
.user-info { display: grid; line-height: 1; min-width: 0; }
.user-info strong { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 900; }
.user-info small { margin-top: 4px; color: rgba(255,255,255,.62); font-size: 10px; font-weight: 800; }
.user-chevron { color: rgba(255,255,255,.72); }

.workspace {
  position: relative;
  width: calc(100% / var(--ui-scale));
  height: calc((100dvh - var(--header-height)) / var(--ui-scale)) !important;
  overflow: hidden;
  transform: scale(var(--ui-scale));
  transform-origin: top left;
}
.content-area { position: absolute; inset: 0; overflow: hidden; }
.content-wrap { width: 100%; height: 100%; transition: padding-left .22s ease, padding .22s ease; }
.content-card {
  width: 100%;
  height: 100%;
  overflow: auto;
  border-radius: 24px;
  background:
    radial-gradient(circle at 92% 4%, rgba(99,102,241,.045), transparent 24%),
    linear-gradient(135deg, rgba(255,255,255,.98), rgba(247,250,255,.94));
  border: 1px solid #e7ecf4;
  box-shadow: 0 24px 70px rgba(15,23,42,.10), inset 0 1px 0 rgba(255,255,255,.90);
  scrollbar-width: none;
}
.content-card::-webkit-scrollbar, .sidebar::-webkit-scrollbar, .subnav::-webkit-scrollbar { width: 0; height: 0; }

.sidebar-hotzone-global {
  position: fixed;
  z-index: 999999;
  left: 0;
  top: var(--header-height);
  bottom: 0;
  width: 74px;
  background: transparent;
  cursor: pointer;
}

.sidebar-hotzone-global::after {
  content: "";
  position: absolute;
  top: 16px;
  left: 0;
  width: 4px;
  height: calc(100% - 32px);
  border-radius: 0 999px 999px 0;
  background: linear-gradient(180deg, rgba(10,110,209,.45), rgba(56,189,248,.18));
  opacity: .35;
}
.mobile-backdrop { position: absolute; z-index: 65; inset: 0; border: 0; background: rgba(15,23,42,.30); backdrop-filter: blur(3px); }

.sidebar {
  position: absolute;
  z-index: 100000;
  overflow: hidden;
  border-radius: 24px;
  background: rgba(255,255,255,.98);
  border: 1px solid #e6ebf3;
  box-shadow: 0 22px 70px rgba(15,23,42,.14);
  transition: width .22s ease, transform .22s ease, left .22s ease, top .22s ease, bottom .22s ease;
}
.sidebar-inner { height: 100%; display: flex; flex-direction: column; padding: 14px; overflow: hidden; }
.sidebar.collapsed .sidebar-inner { padding: 12px 8px; align-items: center; }

.sidebar-top {
  flex: 0 0 auto;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  background:
    radial-gradient(circle at 10% 0%, rgba(124,58,237,.12), transparent 36%),
    linear-gradient(135deg, #ffffff, #f8f9ff);
  border: 1px solid #e7ecf4;
  overflow: hidden;
}
.sidebar.collapsed .sidebar-top { width: 54px; min-height: 54px; border-radius: 18px; }
.sidebar-logo-mini {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 12px;
  background: linear-gradient(135deg, #312064, #4f32b8);
  padding: 5px;
}

.brand-sidebar {
  width: 100%;
  height: 72px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 18px;
  border: 1px solid rgba(124, 94, 255, .28);
  background: linear-gradient(135deg, #25163f, #4f32b8 54%, #0b1020);
  box-shadow: 0 16px 34px rgba(79, 50, 184, .22);
  overflow: hidden;
}
.brand-sidebar img {
  width: 92px;
  height: 30px;
  object-fit: contain;
  object-position: left center;
  flex: 1 1 auto;
  min-width: 0;
}
.brand-sidebar strong {
  display: block;
  color: #17213b;
  font-size: 21px;
  line-height: .95;
  font-weight: 950;
  letter-spacing: .03em;
}
.brand-sidebar small {
  display: block;
  margin-left: auto;
  color: #ffffff;
  font-size: 10px;
  line-height: 1;
  font-weight: 850;
  letter-spacing: .15em;
  white-space: nowrap;
  text-shadow: 0 1px 8px rgba(0,0,0,.35);
}

.sidebar-nav { flex: 1 1 auto; min-height: 0; display: grid; align-content: start; gap: 7px; overflow: auto; padding-top: 12px; scrollbar-width: none; }
.sidebar-nav a,
.sidebar-nav button {
  position: relative;
  isolation: isolate;
  cursor: pointer;
}
.sidebar-nav a::before,
.sidebar-nav button::before {
  content: "";
  position: absolute;
  inset: 5px;
  z-index: -1;
  border-radius: 13px;
  background: linear-gradient(135deg, rgba(99,102,241,.13), rgba(14,165,233,.08));
  opacity: 0;
  transform: scale(.96);
  transition: opacity .16s ease, transform .16s ease;
}
.sidebar-nav a:hover,
.sidebar-nav button:hover {
  color: #4338ca !important;
  background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(238,244,255,.88)) !important;
  border-color: rgba(99,102,241,.20) !important;
  box-shadow: 0 8px 18px rgba(79,70,229,.10) !important;
}
.sidebar-nav a svg,
.sidebar-nav button svg {
  transition: color .16s ease, filter .16s ease, transform .16s ease;
}
.sidebar-nav a:hover svg,
.sidebar-nav button:hover svg {
  color: #4f46e5;
  filter: drop-shadow(0 4px 8px rgba(79,70,229,.18));
  transform: scale(1.07);
}
.sidebar-nav a:hover::before,
.sidebar-nav button:hover::before {
  opacity: 1;
  transform: scale(1);
}
.sidebar-nav a:focus-visible,
.sidebar-nav button:focus-visible {
  outline: 3px solid rgba(99,102,241,.22) !important;
  outline-offset: 2px;
}
.section-title { color: #7b8496; font-size: 10px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; padding: 14px 12px 5px; }
.menu-left { display: inline-flex; align-items: center; gap: 12px; min-width: 0; }
.menu-left span, .sidebar-nav a span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.subnav {
  display: grid !important;
  width: 100%;
  gap: 3px;
  padding: 5px 0 5px;
  margin: 0 0 4px;
  overflow: hidden !important;
}
.subnav a {
  min-height: 34px !important;
  height: 34px !important;
  width: 100% !important;
  opacity: 1 !important;
  visibility: visible !important;
}
.subnav a:hover {
  background: rgba(99,102,241,.08) !important;
  color: #4338ca !important;
  border-color: rgba(99,102,241,.16) !important;
}

.sidebar-bottom-card {
  position: relative;
  flex: 0 0 118px;
  overflow: hidden;
  margin-top: 12px;
  border-radius: 20px;
  border: 1px solid #e7ecf4;
  background: linear-gradient(135deg, #ffffff, #f8f9ff);
  color: #667085;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  font-size: 12px;
  font-weight: 800;
}
.circuit-bg {
  position: absolute;
  inset: 0;
  opacity: .46;
  background:
    linear-gradient(135deg, transparent 42%, rgba(124,58,237,.10) 42.5%, transparent 43%),
    linear-gradient(155deg, transparent 55%, rgba(37,99,235,.10) 55.5%, transparent 56%),
    radial-gradient(circle at 20% 80%, rgba(124,58,237,.16), transparent 18%);
}
.sidebar-bottom-card svg, .sidebar-bottom-card span { position: relative; z-index: 1; }

.logout-btn {
  flex: 0 0 auto;
  height: 42px;
  margin-top: 12px;
  border-radius: 14px;
  border: 1px solid rgba(244,63,94,.16);
  background: rgba(244,63,94,.06);
  color: #be123c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 1180px) {
  .topbar { grid-template-columns: minmax(240px, 1fr) auto; }
  .brand-header small { display: none; }
}

@media (max-width: 760px) {
  html, body, #root {
    height: auto;
    min-height: 100%;
  }

  body {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .layout-root {
    height: auto;
    min-height: 100dvh;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .workspace {
    width: 100%;
    height: auto !important;
    min-height: calc(100dvh - var(--header-height));
    overflow: visible;
    transform: none;
  }

  .content-area {
    position: relative;
    inset: auto;
    overflow: visible;
  }

  .content-wrap {
    height: auto;
    min-height: calc(100dvh - var(--header-height));
    padding-left: 10px !important;
    padding-right: 10px !important;
    padding-top: 10px !important;
    padding-bottom: 16px !important;
  }

  .content-card {
    height: auto;
    min-height: calc(100dvh - var(--header-height) - 26px);
    overflow: visible;
  }

  .mobile-backdrop {
    position: fixed;
    top: var(--header-height);
    z-index: 99998;
  }

  .sidebar {
    position: fixed;
    top: calc(var(--header-height) + 10px) !important;
    bottom: 10px !important;
    z-index: 100000;
    max-height: calc(100dvh - var(--header-height) - 20px);
    overflow: hidden;
  }

  .sidebar-inner {
    min-height: 0;
    height: 100%;
    overflow: hidden;
    padding: 12px;
  }

  .sidebar-top {
    min-height: 64px;
  }

  .sidebar-nav {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding-bottom: 12px;
  }

  .subnav {
    overflow: visible;
    padding-bottom: 8px;
  }

  .sidebar-bottom-card {
    display: none;
  }

  .logout-btn {
    flex: 0 0 42px;
    margin-top: 8px;
  }

  .topbar { padding: 0 10px; grid-template-columns: 1fr auto; gap: 10px; }
  .topbar-left { gap: 9px; }
  .brand-header img { width: 120px; height: 42px; }
  .brand-header strong { font-size: 18px; }
  .notification-btn { display: none; }
  .user-chip { width: 42px; padding: 0; justify-content: center; }
  .user-info, .user-chevron { display: none; }
  .content-card { border-radius: 20px; }
  .sidebar { border-radius: 22px; }

  .table-tools-bar {
    align-items: stretch;
    display: grid;
    grid-template-columns: 1fr;
  }
  .table-tools-search,
  .table-tools-select {
    min-width: 0;
  }
  .table-tools-clear,
  .table-tools-count {
    width: 100%;
  }}

@media (max-width: 460px) {
  .brand-header div { display: none; }
  .top-icon-btn { width: 40px; height: 40px; border-radius: 13px; }
}
`;

