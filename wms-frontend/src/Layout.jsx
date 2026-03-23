import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Database,
  ArrowRightLeft,
  Boxes,
  ClipboardCheck,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  LogOut,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  bg: "#eef3f9",
  panel: "#ffffff",
  line: "#d9e2ec",
  soft: "#f8fafc",
  text: "#1f2d3d",
  muted: "#6b7a90",
  activeBg: "#eaf3ff",
  activeText: "#0a4fb3",
};

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 250;
const HEADER_HEIGHT = 56;

const navItemStyle = ({ isActive }, expanded) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: expanded ? "flex-start" : "center",
  gap: 10,
  padding: expanded ? "10px 12px" : "10px 0",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? colors.activeText : colors.text,
  background: isActive ? colors.activeBg : "transparent",
  border: `1px solid ${isActive ? "#cfe0ff" : "transparent"}`,
  fontWeight: isActive ? 700 : 600,
  fontSize: 14,
  minHeight: 42,
});

const childNavItemStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 12px 9px 38px",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? colors.activeText : colors.text,
  background: isActive ? colors.activeBg : "transparent",
  border: `1px solid ${isActive ? "#cfe0ff" : "transparent"}`,
  fontWeight: isActive ? 700 : 600,
  fontSize: 13,
  minHeight: 38,
});

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7a8797",
  letterSpacing: ".08em",
  margin: "18px 10px 8px",
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);

  const [openMenus, setOpenMenus] = useState({
    datosMaestros: true,
    movimientos: false,
    inventarios: false,
  });

  const usuario = sessionStorage.getItem("usuario") || "Usuario";
  const rol = sessionStorage.getItem("rol") || "OPERATIVO";

  const sidebarExpanded = sidebarPinned || sidebarHover;

  const isDatosActive = useMemo(
    () => location.pathname.startsWith("/datos-maestros"),
    [location.pathname]
  );

  const isMovimientosActive = useMemo(
    () => location.pathname.startsWith("/movimientos"),
    [location.pathname]
  );

  const isInventariosActive = useMemo(
    () => location.pathname.startsWith("/inventarios"),
    [location.pathname]
  );

  const isStockActive = useMemo(
    () => location.pathname.startsWith("/stock"),
    [location.pathname]
  );

  const isInicioActive = useMemo(
    () => location.pathname === "/",
    [location.pathname]
  );

  const toggleMenu = (key) => {
    if (!sidebarExpanded) return;

    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: colors.bg,
        color: colors.text,
        overflowX: "hidden",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {/* TOP BAR */}
      <header
        style={{
          height: HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          background: "rgba(255,255,255,0.88)",
          borderBottom: `1px solid ${colors.line}`,
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              overflow: "hidden",
              background: "#fff",
              border: `1px solid ${colors.line}`,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <img
              src="/INOVA.png"
              alt="INOVA"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <div style={{ lineHeight: 1.1 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: colors.navy,
              }}
            >
              WMS INOVA
            </div>
            <div
              style={{
                fontSize: 11,
                color: colors.muted,
                marginTop: 2,
              }}
            >
              Control logístico
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setSidebarPinned((v) => !v)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${colors.line}`,
              background: "#fff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title={sidebarPinned ? "Desanclar panel" : "Anclar panel"}
          >
            {sidebarPinned ? (
              <PanelLeftClose size={16} color={colors.muted} />
            ) : (
              <PanelLeftOpen size={16} color={colors.muted} />
            )}
          </button>

          <div
            style={{
              height: 34,
              minWidth: 240,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              border: `1px solid ${colors.line}`,
              borderRadius: 8,
              background: "#fff",
            }}
          >
            <Search size={15} color={colors.muted} />
            <span style={{ fontSize: 13, color: "#8a97a8" }}>Buscar</span>
          </div>

          <button
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: `1px solid ${colors.line}`,
              background: "#fff",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Bell size={16} color={colors.muted} />
          </button>

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#2f6f44",
              background: "#edf8f1",
              border: "1px solid #cfe8d7",
              borderRadius: 999,
              padding: "6px 10px",
              whiteSpace: "nowrap",
            }}
          >
            Online
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div
        style={{
          position: "relative",
          minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
        }}
      >
        {/* SIDEBAR OVERLAY */}
        <aside
          onMouseEnter={() => setSidebarHover(true)}
          onMouseLeave={() => setSidebarHover(false)}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: sidebarExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
            background: "rgba(255,255,255,0.97)",
            borderRight: `1px solid ${colors.line}`,
            padding: 12,
            overflowY: "auto",
            overflowX: "hidden",
            transition: "width .22s ease",
            backdropFilter: "blur(10px)",
            zIndex: 20,
            boxShadow: sidebarExpanded
              ? "10px 0 28px rgba(15,39,68,.08)"
              : "none",
          }}
        >
          <div
            style={{
              padding: sidebarExpanded ? 14 : 8,
              borderRadius: 12,
              background: "linear-gradient(180deg, #16385f 0%, #0f2744 100%)",
              color: "#fff",
              marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              minHeight: 70,
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarExpanded ? "flex-start" : "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/INOVA.png"
                  alt="INOVA"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {sidebarExpanded && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>INOVA</div>
                  <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
                    Warehouse Management
                  </div>
                </div>
              )}
            </div>
          </div>

          {sidebarExpanded && <div style={sectionTitleStyle}>OPERACIONES</div>}

          <nav style={{ display: "grid", gap: 4 }}>
            <NavLink to="/" style={(s) => navItemStyle(s, sidebarExpanded)} title="Inicio">
              <Home size={16} />
              {sidebarExpanded && <span>Inicio</span>}
            </NavLink>

            {/* DATOS MAESTROS */}
            <button
              onClick={() => toggleMenu("datosMaestros")}
              style={menuButtonStyle(isDatosActive, sidebarExpanded)}
              title="Datos maestros"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Database size={16} />
                {sidebarExpanded && <span>Datos maestros</span>}
              </div>

              {sidebarExpanded &&
                (openMenus.datosMaestros ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </button>

            {sidebarExpanded && openMenus.datosMaestros && (
              <div style={{ display: "grid", gap: 4 }}>
                <NavLink to="/datos-maestros/materiales" style={childNavItemStyle}>
                  <span>Materiales</span>
                </NavLink>
                <NavLink to="/datos-maestros/proveedores" style={childNavItemStyle}>
                  <span>Proveedores</span>
                </NavLink>
                <NavLink to="/datos-maestros/ubicaciones" style={childNavItemStyle}>
                  <span>Ubicaciones</span>
                </NavLink>
                <NavLink to="/datos-maestros/motor" style={childNavItemStyle}>
                  <span>Motor principal</span>
                </NavLink>
                <NavLink to="/datos-maestros/rotulos" style={childNavItemStyle}>
                  <span>Historial de rótulos</span>
                </NavLink>
                <NavLink to="/datos-maestros/en-transito" style={childNavItemStyle}>
                  <span>En tránsito</span>
                </NavLink>
              </div>
            )}

            {/* MOVIMIENTOS */}
            <button
              onClick={() => toggleMenu("movimientos")}
              style={menuButtonStyle(isMovimientosActive, sidebarExpanded)}
              title="Movimientos"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ArrowRightLeft size={16} />
                {sidebarExpanded && <span>Movimientos</span>}
              </div>

              {sidebarExpanded &&
                (openMenus.movimientos ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </button>

            {sidebarExpanded && openMenus.movimientos && (
              <div style={{ display: "grid", gap: 4 }}>
                <NavLink to="/movimientos/recibo" style={childNavItemStyle}>
                  <span>Recibo</span>
                </NavLink>
                <NavLink to="/movimientos/despacho" style={childNavItemStyle}>
                  <span>Despacho</span>
                </NavLink>
                <NavLink to="/movimientos/desde-recibo" style={childNavItemStyle}>
                  <span>Desde recibo</span>
                </NavLink>
              </div>
            )}

            <NavLink
              to="/stock"
              style={(s) => navItemStyle(s, sidebarExpanded)}
              title="Stock"
            >
              <Boxes size={16} />
              {sidebarExpanded && <span>Stock</span>}
            </NavLink>

            {/* INVENTARIOS */}
            <button
              onClick={() => toggleMenu("inventarios")}
              style={menuButtonStyle(isInventariosActive, sidebarExpanded)}
              title="Inventarios"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ClipboardCheck size={16} />
                {sidebarExpanded && <span>Inventarios</span>}
              </div>

              {sidebarExpanded &&
                (openMenus.inventarios ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </button>

            {sidebarExpanded && openMenus.inventarios && (
              <div style={{ display: "grid", gap: 4 }}>
                <NavLink to="/inventarios" style={childNavItemStyle}>
                  <span>Panel inventarios</span>
                </NavLink>
                <NavLink to="/inventarios/crear-tarea" style={childNavItemStyle}>
                  <span>Crear tarea</span>
                </NavLink>
                <NavLink to="/inventarios/mis-conteos" style={childNavItemStyle}>
                  <span>Mis conteos</span>
                </NavLink>
                <NavLink to="/inventarios/conteo-fisico" style={childNavItemStyle}>
                  <span>Conteo físico</span>
                </NavLink>
                <NavLink to="/inventarios/conciliacion" style={childNavItemStyle}>
                  <span>Conciliación</span>
                </NavLink>
                <NavLink to="/inventarios/reconteos" style={childNavItemStyle}>
                  <span>Reconteos</span>
                </NavLink>
                <NavLink to="/inventarios/informe" style={childNavItemStyle}>
                  <span>Informe inventario</span>
                </NavLink>
              </div>
            )}
          </nav>

          {sidebarExpanded && (
            <>
              <div style={sectionTitleStyle}>INFORMACIÓN</div>

              <div
                style={{
                  border: `1px solid ${colors.line}`,
                  borderRadius: 10,
                  background: colors.soft,
                  padding: 12,
                  fontSize: 12,
                  color: colors.muted,
                  lineHeight: 1.55,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    color: colors.text,
                    marginBottom: 6,
                    fontSize: 12,
                  }}
                >
                  Sesión activa
                </div>

                <div>
                  <b>Usuario:</b> {usuario}
                </div>
                <div>
                  <b>Rol:</b> {rol}
                </div>
                <div style={{ marginTop: 10 }}>
                  El acceso permanece activo mientras el navegador siga abierto.
                </div>
              </div>

              <button onClick={handleLogout} style={logoutButtonStyle}>
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </>
          )}
        </aside>

        {/* MAIN */}
        <main
          style={{
            marginLeft: COLLAPSED_WIDTH,
            minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
            width: `calc(100% - ${COLLAPSED_WIDTH}px)`,
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 18% 16%, rgba(10,110,209,.08), transparent 24%), linear-gradient(135deg, #eef3f9 0%, #e7edf5 50%, #dde7f2 100%)",
          }}
        >
          <div style={mainBackgroundGridStyle} />
          <div style={mainBackgroundGlowTopStyle} />
          <div style={mainBackgroundGlowBottomStyle} />
          <div style={mainBackgroundCircleOneStyle} />
          <div style={mainBackgroundCircleTwoStyle} />
          <div style={mainBackgroundLineOneStyle} />
          <div style={mainBackgroundLineTwoStyle} />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function menuButtonStyle(active, expanded) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: expanded ? "space-between" : "center",
    gap: 10,
    width: "100%",
    padding: expanded ? "10px 12px" : "10px 0",
    borderRadius: 8,
    color: active ? colors.activeText : colors.text,
    background: active ? colors.activeBg : "transparent",
    border: `1px solid ${active ? "#cfe0ff" : "transparent"}`,
    fontWeight: active ? 700 : 600,
    fontSize: 14,
    cursor: "pointer",
    minHeight: 42,
  };
}

const logoutButtonStyle = {
  marginTop: 14,
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 40,
  borderRadius: 8,
  border: "1px solid #f0c7c7",
  background: "#fff5f5",
  color: "#b42318",
  fontWeight: 800,
  cursor: "pointer",
};

const mainBackgroundGridStyle = {
  position: "absolute",
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(15,39,68,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,39,68,0.04) 1px, transparent 1px)
  `,
  backgroundSize: "74px 74px",
  pointerEvents: "none",
};

const mainBackgroundGlowTopStyle = {
  position: "absolute",
  width: 680,
  height: 680,
  top: -250,
  left: -120,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(10,110,209,.18) 0%, rgba(10,110,209,.06) 35%, rgba(10,110,209,0) 72%)",
  filter: "blur(18px)",
  pointerEvents: "none",
};

const mainBackgroundGlowBottomStyle = {
  position: "absolute",
  width: 760,
  height: 760,
  bottom: -330,
  right: -180,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(15,39,68,.16) 0%, rgba(15,39,68,.05) 34%, rgba(15,39,68,0) 70%)",
  filter: "blur(24px)",
  pointerEvents: "none",
};

const mainBackgroundCircleOneStyle = {
  position: "absolute",
  top: 100,
  right: 140,
  width: 260,
  height: 260,
  borderRadius: "50%",
  border: "1px solid rgba(15,39,68,.08)",
  boxShadow: "0 0 0 28px rgba(15,39,68,.03), 0 0 0 56px rgba(15,39,68,.02)",
  pointerEvents: "none",
};

const mainBackgroundCircleTwoStyle = {
  position: "absolute",
  bottom: 70,
  left: 60,
  width: 170,
  height: 170,
  borderRadius: "50%",
  border: "1px solid rgba(15,39,68,.08)",
  boxShadow: "0 0 0 20px rgba(15,39,68,.03), 0 0 0 40px rgba(15,39,68,.02)",
  pointerEvents: "none",
};

const mainBackgroundLineOneStyle = {
  position: "absolute",
  left: 0,
  top: 180,
  width: "44%",
  height: 2,
  background:
    "linear-gradient(90deg, rgba(15,39,68,0) 0%, rgba(15,39,68,.08) 20%, rgba(15,39,68,0) 100%)",
  pointerEvents: "none",
};

const mainBackgroundLineTwoStyle = {
  position: "absolute",
  right: 0,
  bottom: 160,
  width: "38%",
  height: 2,
  background:
    "linear-gradient(90deg, rgba(15,39,68,0) 0%, rgba(15,39,68,.08) 25%, rgba(15,39,68,0) 100%)",
  pointerEvents: "none",
};