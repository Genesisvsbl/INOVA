import { Database, ArrowRightLeft, Boxes, ClipboardCheck } from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  text: "#1f2d3d",
  muted: "#6b7a90",
  card: "rgba(255,255,255,0.72)",
  border: "#d9e2ec",
};

const modules = [
  {
    title: "Datos maestros",
    desc: "Administra materiales, proveedores, ubicaciones, tránsito y catálogos base del sistema.",
    icon: Database,
  },
  {
    title: "Movimientos",
    desc: "Controla recibo, despacho, picking y trazabilidad operativa de extremo a extremo.",
    icon: ArrowRightLeft,
  },
  {
    title: "Stock",
    desc: "Consulta existencias, disponibilidad, ocupación y frescura logística de materiales.",
    icon: Boxes,
  },
  {
    title: "Inventarios",
    desc: "Gestiona tareas, conteos físicos, conciliación, reconteos e informes operativos.",
    icon: ClipboardCheck,
  },
];

export default function Inicio() {
  return (
    <div style={pageStyle}>
      <div style={heroBadgeStyle}>PLATAFORMA INOVA</div>

      <h1 style={heroTitleStyle}>
        Bienvenidos a INOVA: el sistema inteligente logístico que transforma la
        forma en que operamos.
      </h1>

      <div style={heroTextCardStyle}>
        <p style={heroParagraphStyle}>
          <strong>INOVA</strong> significa{" "}
          <strong>Inventario, Ocupación, Validación y Asignación</strong>. Cuatro
          pilares que redefinen la eficiencia operativa en cada movimiento.
        </p>

        <p style={heroParagraphStyle}>
          Con INOVA, cada entrada, salida y reasignación se gestiona con
          precisión. El índice de ocupación se actualiza en tiempo real, y la
          frescura de los productos se monitorea de forma continua.
        </p>

        <p style={heroParagraphStyle}>
          Este sistema está diseñado para equipos logísticos que exigen
          agilidad, trazabilidad y control total. INOVA no solo organiza:
          optimiza recursos, anticipa necesidades y potencia tu operación.
        </p>

        <p style={heroClosingStyle}>
          Es momento de evolucionar. Es momento de <strong>INOVA</strong>.
        </p>
      </div>

      <div style={cardsGridStyle}>
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} style={moduleCardStyle}>
              <div style={moduleIconWrapStyle}>
                <Icon size={18} color="#315a7d" />
              </div>

              <div>
                <div style={moduleTitleStyle}>{item.title}</div>
                <div style={moduleDescStyle}>{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pageStyle = {
  position: "relative",
  zIndex: 1,
  minHeight: "calc(100vh - 96px)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "22px 18px 28px",
};

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(10,110,209,.10)",
  color: "#0a6ed1",
  border: "1px solid rgba(10,110,209,.22)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".05em",
  marginBottom: 18,
  boxShadow: "0 8px 18px rgba(10,110,209,.08)",
};

const heroTitleStyle = {
  margin: 0,
  maxWidth: 980,
  fontSize: "clamp(32px, 4vw, 58px)",
  lineHeight: 1.04,
  fontWeight: 900,
  color: colors.navy,
  textShadow: "0 1px 0 rgba(255,255,255,.65)",
};

const heroTextCardStyle = {
  marginTop: 22,
  maxWidth: 980,
  background: colors.card,
  border: `1px solid rgba(217,226,236,.9)`,
  borderRadius: 22,
  padding: "24px 26px",
  backdropFilter: "blur(10px)",
  boxShadow: "0 16px 35px rgba(15,39,68,.05)",
};

const heroParagraphStyle = {
  margin: "0 0 14px",
  fontSize: 16,
  color: "#55687b",
  lineHeight: 1.85,
};

const heroClosingStyle = {
  margin: "8px 0 0",
  fontSize: 18,
  color: "#17324d",
  lineHeight: 1.7,
  fontWeight: 800,
};

const cardsGridStyle = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 16,
  maxWidth: 1080,
};

const moduleCardStyle = {
  background: "rgba(255,255,255,0.78)",
  border: `1px solid ${colors.border}`,
  borderRadius: 18,
  padding: 18,
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  backdropFilter: "blur(10px)",
  boxShadow: "0 14px 28px rgba(15,39,68,.05)",
};

const moduleIconWrapStyle = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: "#eef3f8",
  border: "1px solid #dbe5ee",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const moduleTitleStyle = {
  fontSize: 16,
  fontWeight: 800,
  color: "#17324d",
  marginBottom: 6,
};

const moduleDescStyle = {
  fontSize: 13,
  color: "#66788a",
  lineHeight: 1.6,
};