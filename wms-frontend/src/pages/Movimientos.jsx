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
  padding: "10px 14px",
  borderRadius: 999,
  textDecoration: "none",
  border: `1px solid ${isActive ? colors.blue : colors.border}`,
  background: isActive ? colors.blue : "white",
  color: isActive ? "white" : colors.text,
  fontWeight: 900,
  boxShadow: isActive ? "0 10px 20px rgba(10,110,209,.18)" : "none",
  transition: "all .15s ease",
});

export default function Movimientos() {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.blue} 100%)`,
                color: "white",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                boxShadow: "0 12px 30px rgba(2,6,23,.12)",
              }}
            >
              🔄
            </div>
            <div>
              <h1 style={{ margin: 0, color: colors.text, fontSize: 40, letterSpacing: -0.6 }}>
                Movimientos
              </h1>
              <div style={{ color: colors.muted, fontWeight: 700 }}>
                Registro de entradas, recibos y despachos
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: "#fff",
            color: colors.muted,
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          💡 Consejo: completa Recibo para generar movimientos de entrada
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <NavLink to="/movimientos/manual" style={tabStyle}>
          ✍️ Manual
        </NavLink>
        <NavLink to="/movimientos/recibo" style={tabStyle}>
          📥 Recibo
        </NavLink>
        <NavLink to="/movimientos/despacho" style={tabStyle}>
          🚚 Despacho
        </NavLink>
      </div>

      {/* Content card */}
      <div
        style={{
          padding: 16,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          boxShadow: "0 16px 40px rgba(2,6,23,.06)",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}