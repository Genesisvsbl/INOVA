import { NavLink, Outlet } from "react-router-dom";
import {
  Database,
  ArrowRightLeft,
  Boxes,
  ClipboardCheck,
  Bell,
  Search,
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

const sectionTitleStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7a8797",
  letterSpacing: ".08em",
  margin: "18px 10px 8px",
};

export default function Layout() {
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
              minWidth: 260,
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
            <NavLink to="/datos-maestros" style={navItemStyle}>
              <Database size={16} />
              <span>Datos maestros</span>
            </NavLink>

            <NavLink to="/movimientos" style={navItemStyle}>
              <ArrowRightLeft size={16} />
              <span>Movimientos</span>
            </NavLink>

            <NavLink to="/stock" style={navItemStyle}>
              <Boxes size={16} />
              <span>Stock</span>
            </NavLink>

            <NavLink to="/inventarios" style={navItemStyle}>
              <ClipboardCheck size={16} />
              <span>Inventarios</span>
            </NavLink>
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
              Guía rápida
            </div>

            <div>Recibo para entradas masivas.</div>
            <div>Manual para ajustes puntuales.</div>
            <div>Datos maestros para catálogos base.</div>
            <div>Inventarios para conteos y conciliación.</div>
          </div>
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