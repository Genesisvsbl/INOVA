import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Plus,
  ClipboardList,
  Boxes,
  RefreshCcw,
  FileBarChart2,
  CheckCircle2,
  ChevronRight,
  Warehouse,
  AlertTriangle,
} from "lucide-react";

export default function Inventarios() {
  const location = useLocation();
  const isRoot = location.pathname === "/inventarios";

  const summary = [
    {
      label: "Tareas activas",
      value: "12",
      helper: "En ejecución",
      icon: ClipboardList,
    },
    {
      label: "Pendientes conciliación",
      value: "05",
      helper: "Requieren revisión",
      icon: CheckCircle2,
    },
    {
      label: "Reconteos abiertos",
      value: "03",
      helper: "Con diferencia detectada",
      icon: RefreshCcw,
    },
    {
      label: "Diferencias detectadas",
      value: "18",
      helper: "Pendientes de análisis",
      icon: AlertTriangle,
    },
  ];

  const operations = [
    {
      title: "Crear tarea",
      desc: "Genera una nueva tarea de inventario físico o cíclico.",
      to: "/inventarios/crear-tarea",
      icon: Plus,
    },
    {
      title: "Conteo físico",
      desc: "Registra cantidades contadas por ubicación, material o lote.",
      to: "/inventarios/conteo-fisico",
      icon: Boxes,
    },
    {
      title: "Conciliación",
      desc: "Compara el stock del sistema contra el stock físico registrado.",
      to: "/inventarios/conciliacion",
      icon: CheckCircle2,
    },
    {
      title: "Reconteos",
      desc: "Gestiona segundas validaciones sobre diferencias detectadas.",
      to: "/inventarios/reconteos",
      icon: RefreshCcw,
    },
    {
      title: "Mis conteos",
      desc: "Consulta y ejecuta tareas asignadas al usuario actual.",
      to: "/inventarios/mis-conteos",
      icon: ClipboardList,
    },
    {
      title: "Informe inventario",
      desc: "Consulta históricos, productividad, diferencias y cierres.",
      to: "/inventarios/informe",
      icon: FileBarChart2,
    },
  ];

  const recentTasks = [
    {
      code: "INV-000124",
      type: "Conteo cíclico",
      zone: "A-01-02",
      status: "En proceso",
      owner: "Josué",
      date: "19/03/2026",
    },
    {
      code: "INV-000123",
      type: "Conciliación",
      zone: "B-04-01",
      status: "Pendiente",
      owner: "Andrea",
      date: "18/03/2026",
    },
    {
      code: "INV-000122",
      type: "Reconteo",
      zone: "C-02-03",
      status: "Abierto",
      owner: "Carlos",
      date: "18/03/2026",
    },
    {
      code: "INV-000121",
      type: "Conteo general",
      zone: "PT-01",
      status: "Cerrado",
      owner: "María",
      date: "17/03/2026",
    },
  ];

  const getStatusStyle = (status) => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      border: "1px solid transparent",
      whiteSpace: "nowrap",
    };

    if (status === "En proceso") {
      return {
        ...base,
        background: "#e8f1ff",
        color: "#0b5ed7",
        borderColor: "#cfe0ff",
      };
    }

    if (status === "Pendiente" || status === "Abierto") {
      return {
        ...base,
        background: "#fff4db",
        color: "#9a6700",
        borderColor: "#f1ddb0",
      };
    }

    return {
      ...base,
      background: "#eaf7ee",
      color: "#1f7a3d",
      borderColor: "#cfe7d5",
    };
  };

  if (!isRoot) {
    return <Outlet />;
  }

  return (
    <div
      style={{
        padding: 24,
        background: "#f5f7fa",
        minHeight: "100%",
        color: "#1f2d3d",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d9e1ea",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e6ebf1",
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
              }}
            >
              <Warehouse size={18} color="#315a7d" />
            </div>

            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#17324d",
                }}
              >
                Inventarios
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#5b6b7c",
                  marginTop: 4,
                }}
              >
                Gestión de conteos físicos, conciliación, reconteos y cierres.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/inventarios/informe" style={{ textDecoration: "none" }}>
              <button
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid #c8d3df",
                  background: "#fff",
                  color: "#213547",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ver informes
              </button>
            </Link>

            <Link to="/inventarios/crear-tarea" style={{ textDecoration: "none" }}>
              <button
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: "1px solid #0b57d0",
                  background: "#0b57d0",
                  color: "#fff",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <Plus size={16} />
                Nueva tarea
              </button>
            </Link>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {summary.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  style={{
                    background: "#fbfcfe",
                    border: "1px solid #dde5ee",
                    borderRadius: 10,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#607080",
                        marginBottom: 6,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 700,
                        color: "#17324d",
                        lineHeight: 1,
                      }}
                    >
                      {item.value}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#7b8a99",
                        marginTop: 6,
                      }}
                    >
                      {item.helper}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      background: "#eef3f8",
                      border: "1px solid #dbe5ee",
                    }}
                  >
                    <Icon size={18} color="#355b7e" />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1.9fr",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #dde5ee",
                borderRadius: 10,
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #e6ebf1",
                  background: "#f8fafc",
                  fontWeight: 700,
                  color: "#1f3448",
                  fontSize: 14,
                }}
              >
                Operaciones de inventario
              </div>

              <div style={{ padding: 8 }}>
                {operations.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.title}
                      to={item.to}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "12px 10px",
                          borderRadius: 8,
                          border: "1px solid transparent",
                          cursor: "pointer",
                          background: index === 0 ? "#f7fbff" : "transparent",
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: "#eef3f8",
                              border: "1px solid #dbe5ee",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={16} color="#355b7e" />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#16324a",
                                marginBottom: 4,
                              }}
                            >
                              {item.title}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#66788a",
                                lineHeight: 1.45,
                              }}
                            >
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        <ChevronRight
                          size={16}
                          color="#7a8b9c"
                          style={{ flexShrink: 0, marginTop: 8 }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #dde5ee",
                borderRadius: 10,
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #e6ebf1",
                  background: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "#1f3448",
                    fontSize: 14,
                  }}
                >
                  Últimas tareas de inventario
                </div>

                <div style={{ fontSize: 12, color: "#708090" }}>
                  Vista operativa reciente
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#fbfcfd" }}>
                      <th style={thStyle}>Código</th>
                      <th style={thStyle}>Tipo</th>
                      <th style={thStyle}>Ubicación</th>
                      <th style={thStyle}>Estado</th>
                      <th style={thStyle}>Responsable</th>
                      <th style={thStyle}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map((row) => (
                      <tr key={row.code}>
                        <td style={tdStyleCode}>{row.code}</td>
                        <td style={tdStyle}>{row.type}</td>
                        <td style={tdStyle}>{row.zone}</td>
                        <td style={tdStyle}>
                          <span style={getStatusStyle(row.status)}>{row.status}</span>
                        </td>
                        <td style={tdStyle}>{row.owner}</td>
                        <td style={tdStyle}>{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderTop: "1px solid #e6ebf1",
                  background: "#fcfdff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 12, color: "#708090" }}>
                  Mostrando actividad reciente del módulo
                </div>

                <Link
                  to="/inventarios/mis-conteos"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0b57d0",
                    textDecoration: "none",
                  }}
                >
                  Ver todas las tareas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 12,
  color: "#607080",
  borderBottom: "1px solid #e6ebf1",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "nowrap",
};

const tdStyleCode = {
  ...tdStyle,
  fontWeight: 700,
  color: "#17324d",
};