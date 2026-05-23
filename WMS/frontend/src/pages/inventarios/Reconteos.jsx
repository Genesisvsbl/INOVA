import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  RefreshCcw,
  Search,
  ClipboardCheck,
  ArrowRight,
  Eye,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Reconteos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedFromQuery = searchParams.get("tarea") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [asignadoA, setAsignadoA] = useState("");
  const [estado, setEstado] = useState("");
  const [selectedId, setSelectedId] = useState(selectedFromQuery);

  const loadReconteos = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("es_reconteo", "true");
      if (asignadoA.trim()) params.append("asignado_a", asignadoA.trim());
      if (estado.trim()) params.append("estado", estado.trim());

      const res = await fetch(`${API_URL}/inventarios/tareas?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "No se pudieron cargar los reconteos");
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error consultando reconteos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReconteos();
  }, []);

  const selectedTask = useMemo(
    () => rows.find((x) => String(x.id) === String(selectedId)) || null,
    [rows, selectedId]
  );

  const stats = useMemo(() => {
    return {
      total: rows.length,
      pendientes: rows.filter((x) => x.estado === "PENDIENTE").length,
      proceso: rows.filter((x) => x.estado === "EN_PROCESO").length,
      cerrados: rows.filter(
        (x) => x.estado === "CONCILIADA" || x.estado === "CERRADA"
      ).length,
    };
  }, [rows]);

  return (
    <PageShell
      title="Reconteos"
      subtitle="Controla las tareas generadas automáticamente por diferencias encontradas en la conciliación."
      icon={<RefreshCcw size={18} color="#355b7e" />}
    >
      <div style={statsGridStyle}>
        <StatBox label="Total reconteos" value={stats.total} />
        <StatBox label="Pendientes" value={stats.pendientes} />
        <StatBox label="En proceso" value={stats.proceso} />
        <StatBox label="Cerrados" value={stats.cerrados} />
      </div>

      <div style={layoutGridStyle}>
        <section style={cardStyle}>
          <CardHeader
            title="Consulta de reconteos"
            subtitle="Filtro directo sobre tareas con es_reconteo = true."
          />

          <div style={{ padding: 18 }}>
            <div style={filterRowStyle}>
              <div style={{ minWidth: 220 }}>
                <div style={labelStyle}>Asignado a</div>
                <input
                  value={asignadoA}
                  onChange={(e) => setAsignadoA(e.target.value)}
                  placeholder="Ej: Josué"
                  style={inputStyle}
                />
              </div>

              <div style={{ minWidth: 220 }}>
                <div style={labelStyle}>Estado</div>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_PROCESO">EN_PROCESO</option>
                  <option value="CONCILIADA">CONCILIADA</option>
                  <option value="CERRADA">CERRADA</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <button style={primaryButtonStyle} onClick={loadReconteos}>
                  <Search size={16} />
                  Buscar
                </button>
              </div>
            </div>

            {error ? <MessageBox type="error" text={error} /> : null}

            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: "#fbfcfd" }}>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Origen</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Criterio</th>
                    <th style={thStyle}>Asignado</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>No coinciden</th>
                    <th style={thStyle}>Exactitud</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={emptyCellStyle}>
                        Cargando reconteos...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={emptyCellStyle}>
                        No hay reconteos para mostrar
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => {
                      const active = String(item.id) === String(selectedId);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedId(String(item.id))}
                          style={{
                            cursor: "pointer",
                            background: active ? "#f3f8ff" : "#fff",
                          }}
                        >
                          <td style={tdCodeStyle}>{item.id}</td>
                          <td style={tdStyle}>{item.tarea_origen_id || "-"}</td>
                          <td style={tdStyle}>{item.tipo_conteo}</td>
                          <td style={tdStyle}>{item.criterio}</td>
                          <td style={tdStyle}>{item.asignado_a}</td>
                          <td style={tdStyle}>
                            <span style={getStatusStyle(item.estado)}>
                              {item.estado}
                            </span>
                          </td>
                          <td style={tdStyle}>{item.total_no_coinciden ?? 0}</td>
                          <td style={tdStyle}>
                            {item.porcentaje_exactitud ?? 0}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <CardHeader
            title="Acción rápida"
            subtitle="Selecciona un reconteo y ábrelo directo."
          />

          <div style={{ padding: 18 }}>
            {!selectedTask ? (
              <div style={placeholderBoxStyle}>
                Selecciona un reconteo de la tabla para ver detalle rápido y
                continuar el proceso.
              </div>
            ) : (
              <>
                <div style={detailGridStyle}>
                  <MiniInfo label="ID reconteo" value={selectedTask.id} />
                  <MiniInfo label="Tarea origen" value={selectedTask.tarea_origen_id} />
                  <MiniInfo label="Tipo" value={selectedTask.tipo_conteo} />
                  <MiniInfo label="Criterio" value={selectedTask.criterio} />
                  <MiniInfo label="Asignado" value={selectedTask.asignado_a} />
                  <MiniInfo label="Estado" value={selectedTask.estado} />
                </div>

                <div style={infoCalloutStyle}>
                  <div style={infoCalloutTitleStyle}>
                    <Eye size={15} />
                    Flujo recomendado
                  </div>
                  <div style={infoCalloutTextStyle}>
                    Abre el reconteo en conteo físico, registra nuevamente las
                    líneas pendientes y luego vuelve a conciliación para cerrar.
                  </div>
                </div>

                <div style={actionGroupStyle}>
                  <button
                    style={primaryButtonStyle}
                    onClick={() =>
                      navigate(`/inventarios/conteo-fisico?tarea=${selectedTask.id}`)
                    }
                  >
                    <ClipboardCheck size={16} />
                    Ir a reconteo
                  </button>

                  <button
                    style={secondaryButtonStyle}
                    onClick={() =>
                      navigate(`/inventarios/conciliacion?tarea=${selectedTask.id}`)
                    }
                  >
                    Ver conciliación
                  </button>

                  <button
                    style={linkActionStyle}
                    onClick={() =>
                      navigate(`/inventarios/informe?tarea=${selectedTask.id}`)
                    }
                  >
                    Ver informe
                    <ArrowRight size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={statBoxStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div style={miniInfoStyle}>
      <div style={miniInfoLabelStyle}>{label}</div>
      <div style={miniInfoValueStyle}>{value || "-"}</div>
    </div>
  );
}

function CardHeader({ title, subtitle }) {
  return (
    <div style={cardHeaderStyle}>
      <div style={cardTitleStyle}>{title}</div>
      <div style={cardSubtitleStyle}>{subtitle}</div>
    </div>
  );
}

function PageShell({ title, subtitle, icon, children }) {
  return (
    <div style={pageStyle}>
      <div style={pageTopStyle}>
        <div style={pageTopIconStyle}>{icon}</div>
        <div>
          <div style={pageTitleStyle}>{title}</div>
          <div style={pageSubtitleStyle}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function MessageBox({ type, text }) {
  const isError = type === "error";
  return (
    <div
      style={{
        marginTop: 14,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${isError ? "#f1c7c2" : "#cfe7d5"}`,
        background: isError ? "#fff5f4" : "#eef8f1",
        color: isError ? "#9f2f25" : "#1f7a3d",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

function getStatusStyle(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  if (status === "PENDIENTE") {
    return {
      ...base,
      background: "#fff4db",
      color: "#9a6700",
      borderColor: "#f1ddb0",
    };
  }

  if (status === "EN_PROCESO") {
    return {
      ...base,
      background: "#e8f1ff",
      color: "#0b5ed7",
      borderColor: "#cfe0ff",
    };
  }

  return {
    ...base,
    background: "#eaf7ee",
    color: "#1f7a3d",
    borderColor: "#cfe7d5",
  };
}

const pageStyle = {
  padding: 24,
  background: "#f5f7fa",
  minHeight: "100%",
};

const pageTopStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 18,
};

const pageTopIconStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "#eaf1f8",
  border: "1px solid #d6e1ec",
};

const pageTitleStyle = {
  fontSize: 24,
  fontWeight: 800,
  color: "#17324d",
};

const pageSubtitleStyle = {
  fontSize: 13,
  color: "#66788a",
  marginTop: 4,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const statBoxStyle = {
  background: "#fff",
  border: "1px solid #dde5ee",
  borderRadius: 12,
  padding: 14,
};

const statLabelStyle = {
  fontSize: 12,
  color: "#6a7b8d",
  marginBottom: 8,
};

const statValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "#17324d",
};

const layoutGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.45fr 0.95fr",
  gap: 16,
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #dde5ee",
  borderRadius: 12,
  overflow: "hidden",
  minWidth: 0,
};

const cardHeaderStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #e6ebf1",
  background: "#f8fafc",
};

const cardTitleStyle = {
  fontSize: 15,
  fontWeight: 800,
  color: "#17324d",
};

const cardSubtitleStyle = {
  fontSize: 12,
  color: "#6e7f91",
  marginTop: 4,
};

const filterRowStyle = {
  display: "flex",
  gap: 12,
  alignItems: "end",
  flexWrap: "wrap",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#536779",
  marginBottom: 7,
};

const inputStyle = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #cfd8e3",
  background: "#fff",
  padding: "0 12px",
  fontSize: 14,
  color: "#1e3348",
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  height: 40,
  borderRadius: 9,
  border: "1px solid #0b57d0",
  background: "#0b57d0",
  color: "#fff",
  padding: "0 14px",
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const secondaryButtonStyle = {
  height: 40,
  borderRadius: 9,
  border: "1px solid #c6d2df",
  background: "#fff",
  color: "#213547",
  padding: "0 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  minWidth: 950,
};

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

const tdCodeStyle = {
  ...tdStyle,
  fontWeight: 800,
  color: "#17324d",
};

const emptyCellStyle = {
  padding: 26,
  textAlign: "center",
  color: "#6f8092",
  borderBottom: "1px solid #edf2f7",
};

const placeholderBoxStyle = {
  border: "1px dashed #c9d4df",
  background: "#fbfcfe",
  borderRadius: 12,
  padding: 20,
  color: "#6d7e90",
  fontSize: 14,
  lineHeight: 1.6,
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
};

const miniInfoStyle = {
  background: "#fbfcfe",
  border: "1px solid #dfe7ef",
  borderRadius: 10,
  padding: 12,
};

const miniInfoLabelStyle = {
  fontSize: 11,
  color: "#6b7c8d",
  marginBottom: 6,
};

const miniInfoValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#17324d",
};

const infoCalloutStyle = {
  marginTop: 16,
  border: "1px solid #dbe7f4",
  background: "#f7fbff",
  borderRadius: 10,
  padding: 14,
};

const infoCalloutTitleStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 13,
  fontWeight: 800,
  color: "#355b7e",
  marginBottom: 8,
};

const infoCalloutTextStyle = {
  fontSize: 13,
  color: "#587086",
  lineHeight: 1.55,
};

const actionGroupStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
  alignItems: "center",
};

const linkActionStyle = {
  background: "transparent",
  border: "none",
  color: "#0b57d0",
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 13,
};