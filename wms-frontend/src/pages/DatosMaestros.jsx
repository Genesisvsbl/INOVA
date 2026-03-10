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

const tabStyle = ({ isActive }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 14,
  textDecoration: "none",
  border: `1px solid ${isActive ? colors.blue : colors.border}`,
  background: isActive ? colors.blue : colors.card,
  color: isActive ? "white" : colors.text,
  fontWeight: 800,
  boxShadow: isActive ? "0 10px 22px rgba(10,110,209,.18)" : "none",
  transition: "all .15s ease",
});

export default function DatosMaestros() {
  return (
    <div>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            DATOS MAESTROS
          </div>

          <h1
            style={{
              margin: "6px 0 0",
              color: colors.navy,
              fontWeight: 900,
            }}
          >
            Administración del sistema
          </h1>

          <div
            style={{
              marginTop: 6,
              color: colors.muted,
              fontSize: 14,
            }}
          >
            Materiales • Proveedores • Ubicaciones • Motor principal • En tránsito • Historial de rótulos
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            color: colors.muted,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          🧠 Tablas base del WMS
        </div>
      </div>

      {/* TABS */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <NavLink to="materiales" style={tabStyle}>
          <span style={{ width: 22, textAlign: "center" }}>📦</span>
          Materiales
        </NavLink>

        <NavLink to="proveedores" style={tabStyle}>
          <span style={{ width: 22, textAlign: "center" }}>🏭</span>
          Proveedores
        </NavLink>

        <NavLink to="ubicaciones" style={tabStyle}>
          <span style={{ width: 22, textAlign: "center" }}>📍</span>
          Ubicaciones
        </NavLink>

        <NavLink to="motor" style={tabStyle}>
          <span style={{ width: 22, textAlign: "center" }}>⚙️</span>
          Motor principal
        </NavLink>

        <NavLink to="en-transito" style={tabStyle}>
          <span style={{ width: 22, textAlign: "center" }}>🚚</span>
          En tránsito
        </NavLink>

        <NavLink to="rotulos" style={tabStyle}>
          <span style={{ width: 22, textAlign: "center" }}>🏷️</span>
          Historial de rótulos
        </NavLink>
      </div>

      {/* CONTENIDO */}
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 20,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}