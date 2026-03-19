import { NavLink, Outlet } from "react-router-dom";

const colors = {
  navy: "#072B5A",
  blue: "#0A6ED1",
  bg: "#F5F7FB",
  text: "#0F172A",
  muted: "#64748B",
  card: "#FFFFFF",
  border: "#E2E8F0",
};

const linkStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
  color: isActive ? "white" : colors.text,
  background: isActive ? colors.blue : "transparent",
  fontWeight: isActive ? 800 : 600,
  border: isActive ? `1px solid ${colors.blue}` : `1px solid transparent`,
  transition: "all .15s ease",
});

export default function Layout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          background: colors.card,
          borderBottom: `1px solid ${colors.border}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
              background: "#fff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <img
              src="/INOVA.png"
              alt="INOVA"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 900, color: colors.navy }}>WMS INOVA</div>
            <div style={{ fontSize: 12, color: colors.muted }}>
              Control logístico • Estilo SAP
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              background: "#fff",
              color: colors.muted,
              fontWeight: 700,
            }}
          >
            🟢 Online
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 280,
            padding: 14,
            borderRight: `1px solid ${colors.border}`,
            background: colors.card,
            minHeight: "calc(100vh - 56px)",
          }}
        >
          {/* Brand block */}
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.blue} 100%)`,
              color: "white",
              boxShadow: "0 12px 30px rgba(2, 6, 23, .12)",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: "rgba(255,255,255,.14)",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,.2)",
                }}
              >
                <img
                  src="/INOVA.png"
                  alt="INOVA"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>INOVA</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Es momento de evolucionar
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              fontWeight: 800,
              margin: "10px 6px",
            }}
          >
            MENÚ
          </div>

          <nav style={{ display: "grid", gap: 10 }}>
            {/* DATOS MAESTROS */}
            <NavLink to="/datos-maestros" style={linkStyle}>
              <span style={{ width: 22, textAlign: "center" }}>🧱</span> Datos maestros
            </NavLink>

            {/* MOVIMIENTOS */}
            <NavLink to="/movimientos" style={linkStyle}>
              <span style={{ width: 22, textAlign: "center" }}>🔄</span> Movimientos
            </NavLink>

            {/* STOCK */}
            <NavLink to="/stock" style={linkStyle}>
              <span style={{ width: 22, textAlign: "center" }}>📊</span> Stock
            </NavLink>

            {/* ✅ NUEVO: INVENTARIOS */}
            <NavLink to="/inventarios" style={linkStyle}>
              <span style={{ width: 22, textAlign: "center" }}>📦</span> Inventarios
            </NavLink>
          </nav>

          <div
            style={{
              marginTop: 18,
              padding: 12,
              borderRadius: 14,
              border: `1px dashed ${colors.border}`,
              color: colors.muted,
              fontSize: 12,
              background: "#FBFDFF",
            }}
          >
            <div style={{ fontWeight: 800, color: colors.text }}>Tips rápidos</div>
            <div style={{ marginTop: 6 }}>
              • Usa <b>Recibo</b> para entradas masivas. <br />
              • En <b>Manual</b> registra ajustes puntuales. <br />
              • En <b>Datos maestros</b> administras Materiales/Proveedores/Ubicaciones. <br />
              • En <b>Inventarios</b> harás conteos y ajustes físicos.
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: 18 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}