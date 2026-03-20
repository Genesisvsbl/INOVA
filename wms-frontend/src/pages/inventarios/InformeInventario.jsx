import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileBarChart2,
  Search,
  RefreshCcw,
  BarChart3,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function InformeInventario() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedFromQuery = searchParams.get("tarea") || "";

  const [taskIdInput, setTaskIdInput] = useState(selectedFromQuery);
  const [report, setReport] = useState(null);
  const [taskList, setTaskList] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(selectedFromQuery);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");

  const loadTaskList = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_URL}/inventarios/tareas`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "No se pudo cargar listado");
      setTaskList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error cargando tareas");
    } finally {
      setLoadingList(false);
    }
  };

  const loadReport = async (taskIdValue) => {
    if (!String(taskIdValue).trim()) {
      setReport(null);
      return;
    }

    setLoadingReport(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/inventarios/tareas/${taskIdValue}/informe`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "No se pudo cargar el informe");
      }

      setReport(data);
      setSelectedTaskId(String(taskIdValue));
    } catch (err) {
      setError(err.message || "Error cargando informe");
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadTaskList();
  }, []);

  useEffect(() => {
    if (selectedFromQuery) {
      setTaskIdInput(selectedFromQuery);
      loadReport(selectedFromQuery);
    }
  }, [selectedFromQuery]);

  const selectedTask = useMemo(() => {
    return taskList.find((x) => String(x.id) === String(selectedTaskId)) || null;
  }, [taskList, selectedTaskId]);

  const dashboard = useMemo(() => {
    return {
      total: taskList.length,
      conciliadas: taskList.filter((x) => x.estado === "CONCILIADA").length,
      reconteo: taskList.filter((x) => x.es_reconteo).length,
      abiertas: taskList.filter(
        (x) => x.estado === "PENDIENTE" || x.estado === "EN_PROCESO"
      ).length,
    };
  }, [taskList]);

  const handleSearchReport = () => {
    if (!taskIdInput.trim()) {
      setError("Debe indicar un ID de tarea");
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("tarea", taskIdInput.trim());
    setSearchParams(next);
    loadReport(taskIdInput.trim());
  };

  return (
    <PageShell
      title="Informe de inventario"
      subtitle="Consulta el cierre de cada tarea y el resultado consolidado que devuelve tu backend."
      icon={<FileBarChart2 size={18} color="#355b7e" />}
    >
      <div style={statsGridStyle}>
        <StatBox
          icon={<ClipboardList size={18} color="#355b7e" />}
          label="Total tareas"
          value={dashboard.total}
        />
        <StatBox
          icon={<CheckCircle2 size={18} color="#1f7a3d" />}
          label="Conciliadas"
          value={dashboard.conciliadas}
        />
        <StatBox
          icon={<AlertTriangle size={18} color="#b26a00" />}
          label="Reconteos"
          value={dashboard.reconteo}
        />
        <StatBox
          icon={<BarChart3 size={18} color="#0b57d0" />}
          label="Abiertas"
          value={dashboard.abiertas}
        />
      </div>

      <div style={layoutGridStyle}>
        <section style={cardStyle}>
          <CardHeader
            title="Listado de tareas"
            subtitle="Haz clic sobre una tarea y se carga el informe automáticamente."
          />

          <div style={{ padding: 18 }}>
            {error ? <MessageBox type="error" text={error} /> : null}

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: "#fbfcfd" }}>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Criterio</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Exactitud</th>
                    <th style={thStyle}>Reconteo</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr>
                      <td colSpan={6} style={emptyCellStyle}>
                        Cargando tareas...
                      </td>
                    </tr>
                  ) : taskList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={emptyCellStyle}>
                        No hay tareas para mostrar.
                      </td>
                    </tr>
                  ) : (
                    taskList.map((item) => {
                      const active = String(item.id) === String(selectedTaskId);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setTaskIdInput(String(item.id));
                            setSelectedTaskId(String(item.id));
                            loadReport(item.id);
                          }}
                          style={{
                            cursor: "pointer",
                            background: active ? "#f3f8ff" : "#fff",
                          }}
                        >
                          <td style={tdCodeStyle}>{item.id}</td>
                          <td style={tdStyle}>{item.tipo_conteo}</td>
                          <td style={tdStyle}>{item.criterio}</td>
                          <td style={tdStyle}>
                            <span style={getStatusStyle(item.estado)}>
                              {item.estado}
                            </span>
                          </td>
                          <td style={tdStyle}>{item.porcentaje_exactitud ?? 0}%</td>
                          <td style={tdStyle}>{item.es_reconteo ? "Sí" : "No"}</td>
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
            title="Consulta puntual"
            subtitle="Busca un informe por ID cuando lo necesites directo."
          />

          <div style={{ padding: 18 }}>
            <div style={searchRowStyle}>
              <div style={{ flex: 1 }}>
                <div style={labelStyle}>ID tarea</div>
                <input
                  value={taskIdInput}
                  onChange={(e) => setTaskIdInput(e.target.value)}
                  placeholder="Ej: 12"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <button style={primaryButtonStyle} onClick={handleSearchReport}>
                  <Search size={16} />
                  Consultar
                </button>

                <button
                  style={secondaryButtonStyle}
                  onClick={() => selectedTaskId && loadReport(selectedTaskId)}
                  disabled={!selectedTaskId || loadingReport}
                >
                  <RefreshCcw size={16} />
                  Recargar
                </button>
              </div>
            </div>

            {!report ? (
              <div style={{ ...placeholderBoxStyle, marginTop: 16 }}>
                Selecciona una tarea o consulta un ID para ver el informe.
              </div>
            ) : (
              <>
                <div style={{ marginTop: 16 }} />
                <div style={detailGridStyle}>
                  <MiniInfo label="Tarea" value={report.tarea_id} />
                  <MiniInfo label="Estado" value={report.estado} />
                  <MiniInfo label="Total líneas" value={report.total_lineas} />
                  <MiniInfo label="Coinciden" value={report.total_coinciden} />
                  <MiniInfo
                    label="No coinciden"
                    value={report.total_no_coinciden}
                  />
                  <MiniInfo
                    label="Exactitud"
                    value={`${report.porcentaje_exactitud}%`}
                  />
                  <MiniInfo
                    label="Genera reconteo"
                    value={report.genera_reconteo ? "Sí" : "No"}
                  />
                  <MiniInfo
                    label="ID reconteo"
                    value={report.reconteo_tarea_id || "-"}
                  />
                </div>

                {selectedTask && (
                  <div style={selectedTaskBoxStyle}>
                    <div style={selectedTaskTitleStyle}>
                      Datos base de la tarea seleccionada
                    </div>
                    <div style={selectedTaskTextStyle}>
                      Tipo: <strong>{selectedTask.tipo_conteo}</strong> | Criterio:{" "}
                      <strong>{selectedTask.criterio}</strong> | Asignado a:{" "}
                      <strong>{selectedTask.asignado_a}</strong>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div style={statBoxStyle}>
      <div style={statHeaderStyle}>
        <div style={statIconStyle}>{icon}</div>
        <div style={statLabelStyle}>{label}</div>
      </div>
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
        marginBottom: 14,
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

  if (status === "RECONTEO_PENDIENTE") {
    return {
      ...base,
      background: "#fff0f0",
      color: "#b42318",
      borderColor: "#f2c7c2",
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

const statHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const statIconStyle = {
  width: 34,
  height: 34,
  borderRadius: 8,
  background: "#eef3f8",
  border: "1px solid #dbe5ee",
  display: "grid",
  placeItems: "center",
};

const statLabelStyle = {
  fontSize: 12,
  color: "#6a7b8d",
};

const statValueStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "#17324d",
};

const layoutGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.3fr 0.95fr",
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

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  minWidth: 760,
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

const searchRowStyle = {
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
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
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
  wordBreak: "break-word",
};

const selectedTaskBoxStyle = {
  marginTop: 16,
  border: "1px solid #dbe7f4",
  background: "#f7fbff",
  borderRadius: 10,
  padding: 14,
};

const selectedTaskTitleStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: "#355b7e",
  marginBottom: 8,
};

const selectedTaskTextStyle = {
  fontSize: 13,
  color: "#587086",
  lineHeight: 1.55,
};