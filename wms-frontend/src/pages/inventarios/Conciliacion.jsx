import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  Search,
  RefreshCcw,
  FileBarChart2,
  GitCompare,
  AlertTriangle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Conciliacion() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tareaQuery = searchParams.get("tarea") || "";

  const [taskIdInput, setTaskIdInput] = useState(tareaQuery);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [asignadoReconteo, setAsignadoReconteo] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [finalInfo, setFinalInfo] = useState(null);

  const loadTask = async (taskIdValue) => {
    if (!String(taskIdValue).trim()) {
      setTask(null);
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");
    setFinalInfo(null);

    try {
      const res = await fetch(
        `${API_URL}/inventarios/tareas/${taskIdValue}/conciliacion`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "No se pudo consultar la conciliación");
      }

      setTask(data);
    } catch (err) {
      setError(err.message || "Error cargando conciliación");
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tareaQuery) {
      setTaskIdInput(tareaQuery);
      loadTask(tareaQuery);
    }
  }, [tareaQuery]);

  const summary = useMemo(() => {
    if (!task?.detalles) {
      return {
        totalSistema: 0,
        totalContado: 0,
        diferencias: 0,
      };
    }

    return task.detalles.reduce(
      (acc, item) => {
        acc.totalSistema += Number(item.cantidad_sistema || 0);
        acc.totalContado += Number(item.cantidad_contada || 0);
        if (item.coincide === false) acc.diferencias += 1;
        return acc;
      },
      { totalSistema: 0, totalContado: 0, diferencias: 0 }
    );
  }, [task]);

  const handleSearchTask = () => {
    if (!taskIdInput.trim()) {
      setError("Debe indicar un ID de tarea");
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("tarea", taskIdInput.trim());
    setSearchParams(next);
    loadTask(taskIdInput.trim());
  };

  const handleFinalize = async () => {
    if (!task?.id) {
      setError("No hay tarea cargada");
      return;
    }

    if (!usuario.trim()) {
      setError("Debe indicar el usuario que finaliza");
      return;
    }

    setFinalizing(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_URL}/inventarios/tareas/${task.id}/finalizar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario: usuario.trim(),
          asignado_a_reconteo: asignadoReconteo.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "No se pudo finalizar la tarea");
      }

      setFinalInfo(data);
      setSuccessMsg("Tarea finalizada correctamente");
      await loadTask(task.id);
    } catch (err) {
      setError(err.message || "Error finalizando tarea");
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <PageShell
      title="Conciliación"
      subtitle="Compara sistema vs físico y finaliza la tarea para cerrar o generar reconteo automático."
      icon={<CheckCircle2 size={18} color="#355b7e" />}
    >
      <section style={cardStyle}>
        <CardHeader
          title="Consulta de conciliación"
          subtitle="Selecciona la tarea y revisa el comparativo antes de finalizar."
        />

        <div style={{ padding: 18 }}>
          <div style={topFormRowStyle}>
            <div style={{ minWidth: 180 }}>
              <div style={labelStyle}>ID tarea</div>
              <input
                value={taskIdInput}
                onChange={(e) => setTaskIdInput(e.target.value)}
                placeholder="Ej: 12"
                style={inputStyle}
              />
            </div>

            <div style={{ minWidth: 220 }}>
              <div style={labelStyle}>Usuario que finaliza</div>
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ej: Supervisor"
                style={inputStyle}
              />
            </div>

            <div style={{ minWidth: 240 }}>
              <div style={labelStyle}>Asignado a reconteo</div>
              <input
                value={asignadoReconteo}
                onChange={(e) => setAsignadoReconteo(e.target.value)}
                placeholder="Opcional"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <button style={primaryButtonStyle} onClick={handleSearchTask}>
                <Search size={16} />
                Cargar
              </button>

              <button
                style={secondaryButtonStyle}
                onClick={() => task?.id && loadTask(task.id)}
                disabled={!task?.id || loading}
              >
                <RefreshCcw size={16} />
                Recargar
              </button>
            </div>
          </div>

          {error ? <MessageBox type="error" text={error} /> : null}
          {successMsg ? <MessageBox type="success" text={successMsg} /> : null}

          {task && (
            <div style={summaryGridStyle}>
              <MiniInfo label="Estado tarea" value={task.estado} />
              <MiniInfo label="Criterio" value={task.criterio} />
              <MiniInfo label="Total líneas" value={task.total_lineas} />
              <MiniInfo label="Coinciden" value={task.total_coinciden} />
              <MiniInfo label="No coinciden" value={task.total_no_coinciden} />
              <MiniInfo
                label="Exactitud"
                value={`${task.porcentaje_exactitud ?? 0}%`}
              />
              <MiniInfo label="Total sistema" value={summary.totalSistema} />
              <MiniInfo label="Total contado" value={summary.totalContado} />
            </div>
          )}
        </div>
      </section>

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <CardHeader
          title="Comparativo por línea"
          subtitle="Aquí sí se muestra la cantidad del sistema y el resultado del conteo."
        />

        <div style={{ padding: 18 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#fbfcfd" }}>
                  <th style={thStyle}>Detalle</th>
                  <th style={thStyle}>Ubicación</th>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Lote almacén</th>
                  <th style={thStyle}>Lote proveedor</th>
                  <th style={thStyle}>Sistema</th>
                  <th style={thStyle}>Contado</th>
                  <th style={thStyle}>Diferencia</th>
                  <th style={thStyle}>Coincide</th>
                  <th style={thStyle}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={emptyCellStyle}>
                      Cargando conciliación...
                    </td>
                  </tr>
                ) : !task ? (
                  <tr>
                    <td colSpan={11} style={emptyCellStyle}>
                      Carga una tarea para revisar la conciliación.
                    </td>
                  </tr>
                ) : task.detalles?.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={emptyCellStyle}>
                      La tarea no tiene detalles.
                    </td>
                  </tr>
                ) : (
                  task.detalles.map((item) => (
                    <tr key={item.id}>
                      <td style={tdCodeStyle}>{item.id}</td>
                      <td style={tdStyle}>{item.ubicacion || "-"}</td>
                      <td style={tdStyle}>{item.codigo_material}</td>
                      <td style={tdStyle}>{item.descripcion_material || "-"}</td>
                      <td style={tdStyle}>{item.lote_almacen || "-"}</td>
                      <td style={tdStyle}>{item.lote_proveedor || "-"}</td>
                      <td style={tdStyle}>{item.cantidad_sistema ?? 0}</td>
                      <td style={tdStyle}>{item.cantidad_contada ?? 0}</td>
                      <td
                        style={{
                          ...tdStyle,
                          color:
                            Number(item.diferencia || 0) === 0 ? "#1f7a3d" : "#b42318",
                          fontWeight: 800,
                        }}
                      >
                        {item.diferencia ?? 0}
                      </td>
                      <td style={tdStyle}>
                        {item.coincide === true ? (
                          <span style={badgeOkStyle}>Sí</span>
                        ) : item.coincide === false ? (
                          <span style={badgeErrorStyle}>No</span>
                        ) : (
                          <span style={badgeNeutralStyle}>Pendiente</span>
                        )}
                      </td>
                      <td style={tdStyle}>{item.observacion || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={footerActionsStyle}>
            <div style={warningBoxStyle}>
              <div style={warningTitleStyle}>
                <GitCompare size={15} />
                Regla operativa
              </div>
              <div style={warningTextStyle}>
                Si existen diferencias, el backend cambia la tarea a
                <strong> RECONTEO_PENDIENTE </strong>
                y crea automáticamente una nueva tarea de reconteo.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={primaryButtonStyle}
                disabled={!task?.id || finalizing}
                onClick={handleFinalize}
              >
                <CheckCircle2 size={16} />
                {finalizing ? "Finalizando..." : "Finalizar tarea"}
              </button>

              <button
                style={secondaryButtonStyle}
                disabled={!task?.id}
                onClick={() =>
                  task?.id && navigate(`/inventarios/informe?tarea=${task.id}`)
                }
              >
                <FileBarChart2 size={16} />
                Ver informe
              </button>
            </div>
          </div>

          {finalInfo && (
            <div style={resultBoxStyle}>
              <div style={resultTitleStyle}>Resultado de finalización</div>
              <div style={resultGridStyle}>
                <MiniInfo label="Estado final" value={finalInfo.estado} />
                <MiniInfo label="Total líneas" value={finalInfo.total_lineas} />
                <MiniInfo label="Coinciden" value={finalInfo.total_coinciden} />
                <MiniInfo
                  label="No coinciden"
                  value={finalInfo.total_no_coinciden}
                />
                <MiniInfo
                  label="Exactitud"
                  value={`${finalInfo.porcentaje_exactitud}%`}
                />
                <MiniInfo
                  label="Genera reconteo"
                  value={finalInfo.genera_reconteo ? "Sí" : "No"}
                />
              </div>

              {finalInfo.reconteo_tarea_id && (
                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    style={primaryGhostBlueStyle}
                    onClick={() =>
                      navigate(
                        `/inventarios/reconteos?tarea=${finalInfo.reconteo_tarea_id}`
                      )
                    }
                  >
                    <AlertTriangle size={16} />
                    Abrir reconteo generado
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div style={miniInfoStyle}>
      <div style={miniInfoLabelStyle}>{label}</div>
      <div style={miniInfoValueStyle}>{String(value ?? "-")}</div>
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

const topFormRowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
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

const primaryGhostBlueStyle = {
  height: 40,
  borderRadius: 9,
  border: "1px solid #b9d0f7",
  background: "#eef5ff",
  color: "#0b57d0",
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

const summaryGridStyle = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  minWidth: 1450,
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

const badgeOkStyle = {
  display: "inline-flex",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: "#eaf7ee",
  color: "#1f7a3d",
  border: "1px solid #cfe7d5",
};

const badgeErrorStyle = {
  display: "inline-flex",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: "#fff0f0",
  color: "#b42318",
  border: "1px solid #f2c7c2",
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

const footerActionsStyle = {
  marginTop: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const warningBoxStyle = {
  flex: 1,
  minWidth: 260,
  border: "1px solid #ead9aa",
  background: "#fff9e8",
  borderRadius: 10,
  padding: 14,
};

const warningTitleStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 13,
  fontWeight: 800,
  color: "#8b6508",
  marginBottom: 8,
};

const warningTextStyle = {
  fontSize: 13,
  color: "#7b651a",
  lineHeight: 1.55,
};

const resultBoxStyle = {
  marginTop: 18,
  border: "1px solid #dce6f2",
  background: "#fbfdff",
  borderRadius: 12,
  padding: 16,
};

const resultTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#17324d",
  marginBottom: 12,
};

const resultGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};