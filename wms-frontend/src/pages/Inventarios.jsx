import { Link } from "react-router-dom";
import {
  ClipboardList,
  Boxes,
  RefreshCcw,
  FileBarChart2,
  CheckCircle2,
  Plus,
} from "lucide-react";

export default function Inventarios() {
  const stats = [
    { title: "Tareas activas", value: 12, icon: ClipboardList },
    { title: "Pendientes conciliación", value: 5, icon: CheckCircle2 },
    { title: "Reconteos abiertos", value: 3, icon: RefreshCcw },
    { title: "Diferencias detectadas", value: 18, icon: Boxes },
  ];

  const modules = [
    {
      title: "Conteos físicos",
      desc: "Registra conteos por ubicación o material.",
      icon: Boxes,
      link: "/inventarios/conteo-fisico",
    },
    {
      title: "Conciliación",
      desc: "Compara stock físico vs sistema.",
      icon: CheckCircle2,
      link: "/inventarios/conciliacion",
    },
    {
      title: "Reconteos",
      desc: "Verifica diferencias detectadas.",
      icon: RefreshCcw,
      link: "/inventarios/reconteos",
    },
    {
      title: "Mis conteos",
      desc: "Tareas asignadas al usuario.",
      icon: ClipboardList,
      link: "/inventarios/mis-conteos",
    },
    {
      title: "Reportes",
      desc: "Consulta históricos e inventarios.",
      icon: FileBarChart2,
      link: "/inventarios/informe",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>📦 Inventarios</h2>
          <p style={{ margin: 0, color: "#666" }}>
            Gestión de conteos físicos, conciliaciones y reconteos.
          </p>
        </div>

        <Link to="/inventarios/crear-tarea">
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Nueva tarea
          </button>
        </Link>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              style={{
                background: "white",
                padding: 16,
                borderRadius: 16,
                border: "1px solid #eee",
              }}
            >
              <p style={{ margin: 0, color: "#777", fontSize: 14 }}>{item.title}</p>
              <h3 style={{ margin: "10px 0" }}>{item.value}</h3>
              <Icon size={20} />
            </div>
          );
        })}
      </div>

      {/* MODULOS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              style={{
                background: "white",
                padding: 20,
                borderRadius: 16,
                border: "1px solid #eee",
              }}
            >
              <Icon size={22} style={{ marginBottom: 10 }} />

              <h3 style={{ margin: "0 0 6px 0" }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: "#666" }}>{item.desc}</p>

              <Link to={item.link}>
                <button
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    cursor: "pointer",
                  }}
                >
                  Entrar
                </button>
              </Link>
            </div>
          );
        })}
      </div>

      {/* TABLA SIMPLE */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          border: "1px solid #eee",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
          <strong>Últimas tareas de inventario</strong>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={{ textAlign: "left", padding: 10 }}>Código</th>
              <th style={{ textAlign: "left", padding: 10 }}>Tipo</th>
              <th style={{ textAlign: "left", padding: 10 }}>Ubicación</th>
              <th style={{ textAlign: "left", padding: 10 }}>Estado</th>
              <th style={{ textAlign: "left", padding: 10 }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 10 }}>INV-001</td>
              <td style={{ padding: 10 }}>Conteo</td>
              <td style={{ padding: 10 }}>A-01</td>
              <td style={{ padding: 10 }}>En proceso</td>
              <td style={{ padding: 10 }}>2026-03-19</td>
            </tr>
            <tr>
              <td style={{ padding: 10 }}>INV-002</td>
              <td style={{ padding: 10 }}>Conciliación</td>
              <td style={{ padding: 10 }}>B-04</td>
              <td style={{ padding: 10 }}>Pendiente</td>
              <td style={{ padding: 10 }}>2026-03-18</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}