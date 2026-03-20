import { NavLink, Outlet } from "react-router-dom";
import { ArrowRightLeft, Inbox, Truck } from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  bg: "#f3f6f9",
  text: "#1f2d3d",
  muted: "#6b7a90",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  activeBg: "#eaf3ff",
  activeText: "#0a4fb3",
};

const tabStyle = ({ isActive }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  textDecoration: "none",
  border: `1px solid ${isActive ? "#cfe0ff" : colors.border}`,
  background: isActive ? colors.activeBg : "#fff",
  color: isActive ? colors.activeText : colors.text,
  fontWeight: isActive ? 700 : 600,
  fontSize: 13,
  whiteSpace: "nowrap",
});

export default function Movimientos() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* HEADER */}
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${colors.border}`,
            background: "linear-gradient(to bottom, #fbfcfd, #f5f8fb)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "#eaf1f8",
                border: "1px solid #d6e1ec",
                flexShrink: 0,
              }}
            >
              <ArrowRightLeft size={18} color="#315a7d" />
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  color: "#7a8797",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Movimientos
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#17324d",
                }}
              >
                Registro operativo
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#5b6b7c",
                  marginTop: 4,
                }}
              >
                Gestión de recibos y despachos con trazabilidad operativa del WMS.
              </div>
            </div>
          </div>

          <div
            style={{
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              padding: "0 12px",
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: "#fff",
              color: colors.muted,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Flujo transaccional
          </div>
        </div>

        {/* SUBNAV */}
        <div
          style={{
            padding: "12px 14px",
            background: "#fcfdff",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <NavLink to="/movimientos/recibo" style={tabStyle}>
            <Inbox size={15} />
            <span>Recibo</span>
          </NavLink>

          <NavLink to="/movimientos/despacho" style={tabStyle}>
            <Truck size={15} />
            <span>Despacho</span>
          </NavLink>
        </div>

        {/* BODY */}
        <div
          style={{
            background: colors.card,
            padding: 18,
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}