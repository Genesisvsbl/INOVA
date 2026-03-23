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
} from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  bg: "#f3f6f9",
  panel: "#ffffff",
  line: "#d9e2ec",
  soft: "#f8fafc",
  text: "#1f2d3d",
  muted: "#6b7a90",
  activeBg: "#eaf3ff",
  activeText: "#0a4fb3",
};

const navItemStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 8,
  textDecoration: "none",
  color: isActive ? colors.activeText : colors.text,
  background: isActive ? colors.activeBg : "transparent",
  border: `1px solid ${isActive ? "#cfe0ff" : "transparent"}`,
  fontWeight: isActive ? 700 : 600,
  fontSize: 14,
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

  const [openMenus, setOpenMenus] = useState({
    datosMaestros: true,
    movimientos: false,
    inventarios: false,
  });

  const usuario = sessionStorage.getItem("usuario") || "Usuario";
  const rol = sessionStorage.getItem("rol") || "OPERATIVO";

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

  const toggleMenu = (key) => {
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
        background: colors.bg,
        color: colors.text,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {/* TOP BAR */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          background: "#ffffff",
          borderBottom: `1px solid ${colors.line}`,
          position: "sticky",
          top: 0,
          zIndex: 20,
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
            }}
          >
            Online
          </div>
        </div>
      </header>

      {/* BODY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "250px minmax(0, 1fr)",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            background: "#ffffff",
            borderRight: `1px solid ${colors.line}`,
            padding: 14,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: "linear-gradient(180deg, #16385f 0%, #0f2744 100%)",
              color: "#fff",
              marginBottom: 16,
              border: "1px solid rgba(255,255,255,0.08)",
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

              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>INOVA</div>
                <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
                  Warehouse Management
                </div>
              </div>
            </div>
          </div>

          <div style={sectionTitleStyle}>OPERACIONES</div>

          <nav style={{ display: "grid", gap: 4 }}>
            <NavLink to="/" style={navItemStyle}>
              <Home size={16} />
              <span>Inicio</span>
            </NavLink>

            {/* DATOS MAESTROS */}
            <button
              onClick={() => toggleMenu("datosMaestros")}
              style={menuButtonStyle(isDatosActive)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Database size={16} />
                <span>Datos maestros</span>
              </div>
              {openMenus.datosMaestros ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openMenus.datosMaestros && (
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
              style={menuButtonStyle(isMovimientosActive)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ArrowRightLeft size={16} />
                <span>Movimientos</span>
              </div>
              {openMenus.movimientos ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openMenus.movimientos && (
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

            <NavLink to="/stock" style={navItemStyle}>
              <Boxes size={16} />
              <span>Stock</span>
            </NavLink>

            {/* INVENTARIOS */}
            <button
              onClick={() => toggleMenu("inventarios")}
              style={menuButtonStyle(isInventariosActive)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ClipboardCheck size={16} />
                <span>Inventarios</span>
              </div>
              {openMenus.inventarios ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openMenus.inventarios && (
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

          <div style={sectionTitleStyle}>INFORMACIÓN</div>

          <div
            style={{
              border: `1px solid ${colors.line}`,
              borderRadius: 8,
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

            <div><b>Usuario:</b> {usuario}</div>
            <div><b>Rol:</b> {rol}</div>
            <div style={{ marginTop: 10 }}>
              El acceso permanece activo mientras el navegador siga abierto.
            </div>
          </div>

          <button onClick={handleLogout} style={logoutButtonStyle}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </aside>

        {/* MAIN */}
        <main
          style={{
            minWidth: 0,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "none",
              margin: 0,
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function menuButtonStyle(active) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    textDecoration: "none",
    color: active ? colors.activeText : colors.text,
    background: active ? colors.activeBg : "transparent",
    border: `1px solid ${active ? "#cfe0ff" : "transparent"}`,
    fontWeight: active ? 700 : 600,
    fontSize: 14,
    cursor: "pointer",
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