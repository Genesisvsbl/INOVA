import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Boxes,
  Search,
  Save,
  RefreshCcw,
  ArrowRight,
  ClipboardCheck,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function ConteoFisico() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tareaQuery = searchParams.get("tarea") || "";

  const [taskIdInput, setTaskIdInput] = useState(tareaQuery);
  const [task, setTask] = useState(null);
  const [rows, setRows] = useState([]);
  const [usuario, setUsuario] = useState("");
  const [loadingTask, setLoadingTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadTask = async (taskIdValue) => {
    if (!String(taskIdValue).trim()) {
      setTask(null);
      setRows([]);
      return;
    }

    setLoadingTask(true);
    setError("");
    setSuccessMsg("");

    try {
      const [taskRes, blindRes] = await Promise.all([
        fetch(`${API_URL}/inventarios/tareas/${taskIdValue}`),
        fetch(`${API_URL}/inventarios/tareas/${taskIdValue}/conteo-ciego`),
      ]);

      const taskData = await taskRes.json();
      const blindData = await blindRes.json();

      if (!taskRes.ok) {
        throw new Error(taskData.detail || "No se pudo consultar la tarea");
      }

      if (!blindRes.ok) {
        throw new Error(blindData.detail || "No se pudo consultar el conteo ciego");
      }

      setTask(taskData);
      setRows(
        (Array.isArray(blindData) ? blindData : []).map((item) => ({
          ...item,
          cantidad_contada:
            item.cantidad_contada === null || item.cantidad_contada === undefined
              ? ""
              : item.cantidad_contada,
          observacion: item.observacion || "",
        }))
      );
    } catch (err) {
      setError(err.message || "Error cargando la tarea");
      setTask(null);
      setRows([]);
    } finally {
      setLoadingTask(false);
    }
  };

  useEffect(() => {
    if (tareaQuery) {
      setTaskIdInput(tareaQuery);
      loadTask(tareaQuery);
    }
  }, [tareaQuery]);

  const countedRows = useMemo(
    () => rows.filter((x) => x.contado || String(x.cantidad_contada).trim() !== "").length,
    [rows]
  );

  const pendingRows = useMemo(() => rows.length - countedRows, [rows, countedRows]);

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

  const updateRow = (id, key, value) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  };

  const handleSaveCounts = async () => {
    if (!task?.id) {
      setError("No hay tarea cargada");
      return;
    }

    if (!usuario.trim()) {
      setError("Debe indicar el usuario que registra el conteo");
      return;
    }

    const items = rows.map((row) => {
      const raw = String(row.cantidad_contada).trim();
      const cantidad = raw === "" ? 0 : Number(raw);

      return {
        detalle_id: row.id,
        cantidad_contada: Number.isNaN(cantidad) ? 0 : cantidad,
        observacion: row.observacion?.trim() || null,
      };
    });

    const invalid = items.find((x) => x.cantidad_contada < 0);
    if (invalid) {
      setError(`La cantidad no puede ser negativa en detalle ${invalid.detalle_id}`);
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(
        `${API_URL}/inventarios/tareas/${task.id}/registrar-conteo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            usuario: usuario.trim(),
            items,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "No se pudo registrar el conteo");
      }

      setSuccessMsg("Conteo registrado correctamente");
      await loadTask(task.id);
    } catch (err) {
      setError(err.message || "Error guardando conteo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Conteo físico"
      subtitle="Captura el conteo ciego por detalle. Sin mostrar cantidad sistema, tal como definiste en backend."
      icon={<Boxes size={18} color="#355b7e" />}
    >
      <div style={topGridStyle}>
        <section style={cardStyle}>
          <CardHeader
            title="Carga de tarea"
            subtitle="Busca por ID y el sistema detecta la tarea para trabajarla."
          />

          <div style={{ padding: 18 }}>
            <div style={finderRowStyle}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={labelStyle}>ID tarea</div>
                <input
                  value={taskIdInput}
                  onChange={(e) => setTaskIdInput(e.target.value)}
                  placeholder="Ej: 12"
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={labelStyle}>Usuario que registra</div>
                <input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ej: Josué"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <button style={primaryButtonStyle} onClick={handleSearchTask}>
                  <Search size={16} />
                  Cargar tarea
                </button>

                <button
                  style={secondaryButtonStyle}
                  onClick={() => task?.id && loadTask(task.id)}
                  disabled={!task?.id || loadingTask}
                >
                  <RefreshCcw size={16} />
                  Recargar
                </button>
              </div>
            </div>

            {error ? <MessageBox type="error" text={error} /> : null}
            {successMsg ? <MessageBox type="success" text={successMsg} /> : null}

            {task && (
              <div style={taskMetaGridStyle}>
                <MiniInfo label="ID" value={task.id} />
                <MiniInfo label="Tipo" value={task.tipo_conteo} />
                <MiniInfo label="Criterio" value={task.criterio} />
                <MiniInfo label="Estado" value={task.estado} />
                <MiniInfo label="Asignado a" value={task.asignado_a} />
                <MiniInfo label="Total líneas" value={rows.length} />
                <MiniInfo label="Capturadas" value={countedRows} />
                <MiniInfo label="Pendientes" value={pendingRows} />
              </div>
            )}
          </div>
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <CardHeader
          title="Hoja de conteo"
          subtitle="Aquí solo trabajas con la captura física del inventario."
        />

        <div style={{ padding: 18 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#fbfcfd" }}>
                  <th style={thStyle}>Detalle</th>
                  <th style={thStyle}>Ubicación</th>
                  <th style={thStyle}>Zona</th>
                  <th style={thStyle}>Código material</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Lote almacén</th>
                  <th style={thStyle}>Lote proveedor</th>
                  <th style={thStyle}>FV</th>
                  <th style={thStyle}>Cantidad contada</th>
                  <th style={thStyle}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {loadingTask ? (
                  <tr>
                    <td colSpan={10} style={emptyCellStyle}>
                      Cargando tarea...
                    </td>
                  </tr>
                ) : !task ? (
                  <tr>
                    <td colSpan={10} style={emptyCellStyle}>
                      Carga una tarea para iniciar el conteo.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={emptyCellStyle}>
                      Esta tarea no tiene líneas disponibles.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdCodeStyle}>{row.id}</td>
                      <td style={tdStyle}>{row.ubicacion || "-"}</td>
                      <td style={tdStyle}>{row.zona || "-"}</td>
                      <td style={tdStyle}>{row.codigo_material}</td>
                      <td style={tdStyle}>{row.descripcion_material || "-"}</td>
                      <td style={tdStyle}>{row.lote_almacen || "-"}</td>
                      <td style={tdStyle}>{row.lote_proveedor || "-"}</td>
                      <td style={tdStyle}>{formatDate(row.fecha_vencimiento)}</td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.cantidad_contada}
                          onChange={(e) =>
                            updateRow(row.id, "cantidad_contada", e.target.value)
                          }
                          style={{ ...inputStyle, minWidth: 110 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={row.observacion}
                          onChange={(e) =>
                            updateRow(row.id, "observacion", e.target.value)
                          }
                          placeholder="Observación"
                          style={{ ...inputStyle, minWidth: 180 }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={footerActionsStyle}>
            <button
              style={secondaryButtonStyle}
              disabled={!task?.id}
              onClick={() => task?.id && navigate(`/inventarios/mis-conteos?tarea=${task.id}`)}
            >
              <ClipboardCheck size={16} />
              Volver a mis conteos
            </button>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={primaryButtonStyle}
                disabled={!task?.id || saving}
                onClick={handleSaveCounts}
              >
                <Save size={16} />
                {saving ? "Guardando..." : "Guardar conteo"}
              </button>

              <button
                style={primaryGhostBlueStyle}
                disabled={!task?.id}
                onClick={() =>
                  task?.id && navigate(`/inventarios/conciliacion?tarea=${task.id}`)
                }
              >
                Ir a conciliación
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
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

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
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

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
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

const finderRowStyle = {
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

const taskMetaGridStyle = {
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
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  minWidth: 1400,
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

const footerActionsStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 16,
};