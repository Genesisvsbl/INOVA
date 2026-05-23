import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Search,
  RefreshCcw,
  PlayCircle,
  CheckCircle2,
  FileBarChart2,
  Eye,
  ArrowRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function MisConteos() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [usuario, setUsuario] = useState(searchParams.get("usuario") || "");
  const [estado, setEstado] = useState(searchParams.get("estado") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(
    searchParams.get("tarea") || ""
  );

  const loadTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (usuario.trim()) params.append("asignado_a", usuario.trim());
      if (estado.trim()) params.append("estado", estado.trim());

      const res = await fetch(`${API_URL}/inventarios/tareas?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "No se pudieron consultar las tareas");
      }

      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Error consultando tareas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const selectedTask = useMemo(() => {
    return tasks.find((x) => String(x.id) === String(selectedTaskId)) || null;
  }, [tasks, selectedTaskId]);

  const handleSearch = () => {
    const next = new URLSearchParams();
    if (usuario.trim()) next.set("usuario", usuario.trim());
    if (estado.trim()) next.set("estado", estado.trim());
    if (selectedTaskId) next.set("tarea", String(selectedTaskId));
    setSearchParams(next);
    loadTasks();
  };

  const handleSelectTask = (task) => {
    setSelectedTaskId(String(task.id));

    const next = new URLSearchParams(searchParams);
    next.set("tarea", String(task.id));
    if (usuario.trim()) next.set("usuario", usuario.trim());
    if (estado.trim()) next.set("estado", estado.trim());
    setSearchParams(next);
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const pendientes = tasks.filter((x) => x.estado === "PENDIENTE").length;
    const proceso = tasks.filter((x) => x.estado === "EN_PROCESO").length;
    const reconteo = tasks.filter((x) => x.es_reconteo).length;

    return { total, pendientes, proceso, reconteo };
  }, [tasks]);

  return (
    <PageShell
      title="Mis conteos"
      subtitle="Consulta tareas asignadas, selecciónalas con un clic y entra directo a ejecutar o revisar."
      icon={<ClipboardList size={18} color="#355b7e" />}
    >
      <div style={statsGridStyle}>
        <StatBox label="Total tareas" value={stats.total} />
        <StatBox label="Pendientes" value={stats.pendientes} />
        <StatBox label="En proceso" value={stats.proceso} />
        <StatBox label="Reconteos" value={stats.reconteo} />
      </div>

      <div style={layoutGridStyle}>
        <section style={cardStyle}>
          <CardHeader
            title="Consulta operativa"
            subtitle="Puedes filtrar por usuario asignado y estado."
          />

          <div style={{ padding: 18 }}>
            <div style={filterGridStyle}>
              <Field label="Asignado a">
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ej: Josué"
                  style={inputStyle}
                />
              </Field>

              <Field label="Estado">
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_PROCESO">EN_PROCESO</option>
                  <option value="RECONTEO_PENDIENTE">RECONTEO_PENDIENTE</option>
                  <option value="CONCILIADA">CONCILIADA</option>
                  <option value="CERRADA">CERRADA</option>
                </select>
              </Field>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <button onClick={handleSearch} style={primaryButtonStyle}>
                  <Search size={16} />
                  Buscar
                </button>

                <button
                  onClick={loadTasks}
                  style={secondaryButtonStyle}
                  disabled={loading}
                >
                  <RefreshCcw size={16} />
                  Recargar
                </button>
              </div>
            </div>

            {error ? <MessageBox type="error" text={error} /> : null}

            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: "#fbfcfd" }}>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Criterio</th>
                    <th style={thStyle}>Asignado</th>
                    <th style={thStyle}>Estado</th>
                    <th style={thStyle}>Reconteo</th>
                    <th style={thStyle}>Creación</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={emptyCellStyle}>
                        Cargando tareas...
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={emptyCellStyle}>
                        No hay tareas para mostrar
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => {
                      const active = String(selectedTaskId) === String(task.id);

                      return (
                        <tr
                          key={task.id}
                          onClick={() => handleSelectTask(task)}
                          style={{
                            cursor: "pointer",
                            background: active ? "#f3f8ff" : "#fff",
                          }}
                        >
                          <td style={tdCodeStyle}>{task.id}</td>
                          <td style={tdStyle}>{task.tipo_conteo}</td>
                          <td style={tdStyle}>{task.criterio}</td>
                          <td style={tdStyle}>{task.asignado_a}</td>
                          <td style={tdStyle}>
                            <span style={getStatusStyle(task.estado)}>
                              {task.estado}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {task.es_reconteo ? (
                              <span style={badgeWarnStyle}>Sí</span>
                            ) : (
                              <span style={badgeNeutralStyle}>No</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {formatDateTime(task.fecha_creacion)}
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
            title="Detalle rápido"
            subtitle="Al seleccionar una tarea, queda detectada inmediatamente."
          />

          <div style={{ padding: 18 }}>
            {!selectedTask ? (
              <div style={placeholderBoxStyle}>
                Selecciona una tarea en la tabla para ver el resumen y ejecutar
                acciones.
              </div>
            ) : (
              <>
                <div style={detailGridStyle}>
                  <MiniInfo label="ID" value={selectedTask.id} />
                  <MiniInfo label="Tipo" value={selectedTask.tipo_conteo} />
                  <MiniInfo label="Criterio" value={selectedTask.criterio} />
                  <MiniInfo label="Estado" value={selectedTask.estado} />
                  <MiniInfo label="Asignado a" value={selectedTask.asignado_a} />
                  <MiniInfo
                    label="Exactitud"
                    value={`${selectedTask.porcentaje_exactitud ?? 0}%`}
                  />
                  <MiniInfo
                    label="Líneas"
                    value={selectedTask.total_lineas ?? 0}
                  />
                  <MiniInfo
                    label="No coinciden"
                    value={selectedTask.total_no_coinciden ?? 0}
                  />
                </div>

                <div style={actionBlockStyle}>
                  <button
                    style={primaryButtonStyle}
                    onClick={() =>
                      navigate(`/inventarios/conteo-fisico?tarea=${selectedTask.id}`)
                    }
                  >
                    <PlayCircle size={16} />
                    Ir a conteo
                  </button>

                  <button
                    style={secondaryButtonStyle}
                    onClick={() =>
                      navigate(`/inventarios/conciliacion?tarea=${selectedTask.id}`)
                    }
                  >
                    <CheckCircle2 size={16} />
                    Ver conciliación
                  </button>

                  <button
                    style={secondaryButtonStyle}
                    onClick={() =>
                      navigate(`/inventarios/informe?tarea=${selectedTask.id}`)
                    }
                  >
                    <FileBarChart2 size={16} />
                    Ver informe
                  </button>
                </div>

                <div style={calloutStyle}>
                  <div style={calloutTitleStyle}>
                    <Eye size={15} />
                    Comportamiento agregado
                  </div>
                  <div style={calloutTextStyle}>
                    Cualquier fila que selecciones queda cargada de una vez para
                    que sigas al conteo, conciliación o informe sin volver a buscar.
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    style={linkActionStyle}
                    onClick={() =>
                      navigate(`/inventarios/conteo-fisico?tarea=${selectedTask.id}`)
                    }
                  >
                    Abrir tarea seleccionada
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

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
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

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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
  gridTemplateColumns: "1.55fr 0.95fr",
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

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 220px auto",
  gap: 12,
  alignItems: "end",
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

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  minWidth: 920,
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
  padding: 24,
  textAlign: "center",
  color: "#6f8092",
  borderBottom: "1px solid #edf2f7",
};

const badgeWarnStyle = {
  display: "inline-flex",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: "#fff4db",
  color: "#9a6700",
  border: "1px solid #f1ddb0",
};

const badgeNeutralStyle = {
  display: "inline-flex",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: "#f4f6f8",
  color: "#5f7184",
  border: "1px solid #dce4ec",
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
  wordBreak: "break-word",
};

const actionBlockStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const calloutStyle = {
  marginTop: 16,
  border: "1px solid #dbe7f4",
  background: "#f7fbff",
  borderRadius: 10,
  padding: 14,
};

const calloutTitleStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 13,
  fontWeight: 800,
  color: "#355b7e",
  marginBottom: 8,
};

const calloutTextStyle = {
  fontSize: 13,
  color: "#587086",
  lineHeight: 1.55,
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