import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircle,
  ClipboardList,
  MapPinned,
  Boxes,
  PackageSearch,
  User,
  Save,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function CrearTarea() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tipo_conteo: "zona",
    zona: "",
    familia: "",
    codigo_material: "",
    asignado_a: "",
    creado_por: "",
    observacion: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [createdTask, setCreatedTask] = useState(null);

  const [zonas, setZonas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [materiales, setMateriales] = useState([]);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    setLoadingCatalogos(true);
    try {
      const [ubicacionesRes, materialesRes] = await Promise.all([
        fetch(`${API_URL}/ubicaciones?limit=5000`),
        fetch(`${API_URL}/materiales?limit=5000`),
      ]);

      const ubicacionesData = await ubicacionesRes.json();
      const materialesData = await materialesRes.json();

      if (!ubicacionesRes.ok) {
        throw new Error(ubicacionesData.detail || "No se pudieron cargar las ubicaciones");
      }

      if (!materialesRes.ok) {
        throw new Error(materialesData.detail || "No se pudieron cargar los materiales");
      }

      const zonasUnicas = [...new Set(
        (Array.isArray(ubicacionesData) ? ubicacionesData : [])
          .map((x) => (x.zona || "").trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));

      const familiasUnicas = [...new Set(
        (Array.isArray(materialesData) ? materialesData : [])
          .map((x) => (x.familia || "").trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));

      const materialesOrdenados = (Array.isArray(materialesData) ? materialesData : [])
        .filter((x) => x.codigo)
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));

      setZonas(zonasUnicas);
      setFamilias(familiasUnicas);
      setMateriales(materialesOrdenados);
    } catch (err) {
      setError(err.message || "Error cargando catálogos");
    } finally {
      setLoadingCatalogos(false);
    }
  };

  const criterioLabel = useMemo(() => {
    if (form.tipo_conteo === "zona") return "Zona";
    if (form.tipo_conteo === "familia") return "Familia";
    return "Código material";
  }, [form.tipo_conteo]);

  const criterioValue = useMemo(() => {
    if (form.tipo_conteo === "zona") return form.zona;
    if (form.tipo_conteo === "familia") return form.familia;
    return form.codigo_material;
  }, [form]);

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetMessages = () => {
    setError("");
    setSuccessMsg("");
  };

  const validate = () => {
    if (!form.asignado_a.trim()) return "Debe indicar el usuario asignado";
    if (!form.creado_por.trim()) return "Debe indicar el usuario creador";

    if (form.tipo_conteo === "zona" && !form.zona.trim()) {
      return "Debe seleccionar la zona";
    }

    if (form.tipo_conteo === "familia" && !form.familia.trim()) {
      return "Debe seleccionar la familia";
    }

    if (form.tipo_conteo === "material" && !form.codigo_material.trim()) {
      return "Debe seleccionar el material";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setCreatedTask(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tipo_conteo: form.tipo_conteo,
        zona: form.tipo_conteo === "zona" ? form.zona.trim() : null,
        familia: form.tipo_conteo === "familia" ? form.familia.trim() : null,
        codigo_material:
          form.tipo_conteo === "material" ? form.codigo_material.trim() : null,
        asignado_a: form.asignado_a.trim(),
        creado_por: form.creado_por.trim(),
        observacion: form.observacion.trim() || null,
      };

      const res = await fetch(`${API_URL}/inventarios/tareas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "No se pudo crear la tarea");
      }

      setCreatedTask(data);
      setSuccessMsg("Tarea creada correctamente");
    } catch (err) {
      setError(err.message || "Error creando la tarea");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Crear tarea de inventario"
      subtitle="Genera tareas por zona, familia o material respetando el criterio definido en el backend."
      icon={<PlusCircle size={18} color="#355b7e" />}
    >
      <div style={gridStyle}>
        <section style={cardStyle}>
          <CardHeader
            title="Datos de creación"
            subtitle="La tarea se construye con el stock almacenado actual."
          />

          <form onSubmit={handleSubmit} style={{ padding: 18 }}>
            <div style={formGrid}>
              <Field label="Tipo de conteo" required>
                <select
                  value={form.tipo_conteo}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      tipo_conteo: value,
                      zona: "",
                      familia: "",
                      codigo_material: "",
                    }));
                    resetMessages();
                  }}
                  style={inputStyle}
                >
                  <option value="zona">Zona</option>
                  <option value="familia">Familia</option>
                  <option value="material">Material</option>
                </select>
              </Field>

              {form.tipo_conteo === "zona" && (
                <Field label="Zona" required>
                  <select
                    value={form.zona}
                    onChange={(e) => handleChange("zona", e.target.value)}
                    style={inputStyle}
                    disabled={loadingCatalogos}
                  >
                    <option value="">
                      {loadingCatalogos ? "Cargando zonas..." : "Seleccione una zona"}
                    </option>
                    {zonas.map((zona) => (
                      <option key={zona} value={zona}>
                        {zona}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {form.tipo_conteo === "familia" && (
                <Field label="Familia" required>
                  <select
                    value={form.familia}
                    onChange={(e) => handleChange("familia", e.target.value)}
                    style={inputStyle}
                    disabled={loadingCatalogos}
                  >
                    <option value="">
                      {loadingCatalogos ? "Cargando familias..." : "Seleccione una familia"}
                    </option>
                    {familias.map((familia) => (
                      <option key={familia} value={familia}>
                        {familia}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {form.tipo_conteo === "material" && (
                <Field label="Código material" required>
                  <select
                    value={form.codigo_material}
                    onChange={(e) => handleChange("codigo_material", e.target.value)}
                    style={inputStyle}
                    disabled={loadingCatalogos}
                  >
                    <option value="">
                      {loadingCatalogos ? "Cargando materiales..." : "Seleccione un material"}
                    </option>
                    {materiales.map((material) => (
                      <option key={material.id} value={material.codigo}>
                        {material.codigo} - {material.descripcion}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Asignado a" required>
                <input
                  value={form.asignado_a}
                  onChange={(e) => handleChange("asignado_a", e.target.value)}
                  placeholder="Nombre del responsable del conteo"
                  style={inputStyle}
                />
              </Field>

              <Field label="Creado por" required>
                <input
                  value={form.creado_por}
                  onChange={(e) => handleChange("creado_por", e.target.value)}
                  placeholder="Usuario que genera la tarea"
                  style={inputStyle}
                />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Observación">
                  <textarea
                    value={form.observacion}
                    onChange={(e) => handleChange("observacion", e.target.value)}
                    placeholder="Comentario operativo"
                    style={{ ...inputStyle, minHeight: 88, resize: "vertical", paddingTop: 10 }}
                  />
                </Field>
              </div>
            </div>

            {error ? (
              <MessageBox type="error" text={error} />
            ) : successMsg ? (
              <MessageBox type="success" text={successMsg} />
            ) : null}

            <div style={actionRowStyle}>
              <button type="submit" disabled={loading} style={primaryButtonStyle}>
                <Save size={16} />
                {loading ? "Creando..." : "Crear tarea"}
              </button>
            </div>
          </form>
        </section>

        <section style={cardStyle}>
          <CardHeader
            title="Resumen operativo"
            subtitle="Validación visual antes de generar la tarea."
          />

          <div style={{ padding: 18 }}>
            <div style={summaryPanelStyle}>
              <SummaryRow
                icon={<ClipboardList size={16} color="#355b7e" />}
                label="Tipo"
                value={form.tipo_conteo.toUpperCase()}
              />
              <SummaryRow
                icon={
                  form.tipo_conteo === "zona" ? (
                    <MapPinned size={16} color="#355b7e" />
                  ) : form.tipo_conteo === "familia" ? (
                    <Boxes size={16} color="#355b7e" />
                  ) : (
                    <PackageSearch size={16} color="#355b7e" />
                  )
                }
                label={criterioLabel}
                value={criterioValue || "-"}
              />
              <SummaryRow
                icon={<User size={16} color="#355b7e" />}
                label="Asignado a"
                value={form.asignado_a || "-"}
              />
              <SummaryRow
                icon={<User size={16} color="#355b7e" />}
                label="Creado por"
                value={form.creado_por || "-"}
              />
            </div>

            <div style={noteBoxStyle}>
              <div style={noteTitleStyle}>
                <AlertTriangle size={15} />
                Reglas que ya respeta tu backend
              </div>
              <div style={noteTextStyle}>
                La tarea solo se crea si existe stock almacenado para el criterio
                seleccionado. Si no hay stock, el backend devuelve error y no se
                genera nada.
              </div>
            </div>

            {createdTask && (
              <div style={createdBoxStyle}>
                <div style={createdHeaderStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={18} color="#1f7a3d" />
                    <span style={{ fontWeight: 700, color: "#1f7a3d" }}>
                      Tarea creada
                    </span>
                  </div>
                  <span style={badgeBlueStyle}>ID {createdTask.id}</span>
                </div>

                <div style={createdMetaGrid}>
                  <MiniInfo label="Estado" value={createdTask.estado} />
                  <MiniInfo label="Criterio" value={createdTask.criterio} />
                  <MiniInfo
                    label="Total líneas"
                    value={String(createdTask.total_lineas ?? createdTask.detalles?.length ?? 0)}
                  />
                  <MiniInfo label="Asignado" value={createdTask.asignado_a} />
                </div>

                <div style={quickActionsStyle}>
                  <button
                    style={secondaryButtonStyle}
                    onClick={() => navigate(`/inventarios/mis-conteos?tarea=${createdTask.id}`)}
                  >
                    Ver en mis conteos
                  </button>

                  <button
                    style={primaryButtonStyle}
                    onClick={() =>
                      navigate(`/inventarios/conteo-fisico?tarea=${createdTask.id}`)
                    }
                  >
                    Ir a conteo físico
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function Field({ label, required, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={labelStyle}>
        {label} {required ? <span style={{ color: "#c0362c" }}>*</span> : null}
      </div>
      {children}
    </label>
  );
}

function SummaryRow({ icon, label, value }) {
  return (
    <div style={summaryRowStyle}>
      <div style={summaryIconStyle}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={summaryLabelStyle}>{label}</div>
        <div style={summaryValueStyle}>{value}</div>
      </div>
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

function MessageBox({ type, text }) {
  const isError = type === "error";

  return (
    <div
      style={{
        marginTop: 14,
        marginBottom: 4,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${isError ? "#f1c7c2" : "#cfe7d5"}`,
        background: isError ? "#fff5f4" : "#eef8f1",
        color: isError ? "#9f2f25" : "#1f7a3d",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {text}
    </div>
  );
}

function CardHeader({ title, subtitle }) {
  return (
    <div style={cardHeaderStyle}>
      <div>
        <div style={cardTitleStyle}>{title}</div>
        <div style={cardSubtitleStyle}>{subtitle}</div>
      </div>
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

const pageStyle = {
  padding: 24,
  background: "#f5f7fa",
  minHeight: "100%",
};

const pageTopStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 18,
};

const pageTopIconStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  background: "#eaf1f8",
  border: "1px solid #d6e1ec",
  display: "grid",
  placeItems: "center",
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

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(340px, 1.25fr) minmax(300px, 0.95fr)",
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

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
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

const actionRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 18,
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

const summaryPanelStyle = {
  border: "1px solid #e0e7ef",
  borderRadius: 12,
  background: "#fbfcfe",
  overflow: "hidden",
};

const summaryRowStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  borderBottom: "1px solid #edf2f7",
};

const summaryIconStyle = {
  width: 34,
  height: 34,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  background: "#eef3f8",
  border: "1px solid #dbe5ee",
  flexShrink: 0,
};

const summaryLabelStyle = {
  fontSize: 12,
  color: "#627385",
};

const summaryValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#17324d",
  marginTop: 3,
  wordBreak: "break-word",
};

const noteBoxStyle = {
  marginTop: 16,
  border: "1px solid #ead9aa",
  background: "#fff9e8",
  borderRadius: 10,
  padding: 14,
};

const noteTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 800,
  fontSize: 13,
  color: "#8b6508",
  marginBottom: 8,
};

const noteTextStyle = {
  fontSize: 13,
  lineHeight: 1.55,
  color: "#7b651a",
};

const createdBoxStyle = {
  marginTop: 18,
  border: "1px solid #cfe7d5",
  background: "#f7fcf8",
  borderRadius: 12,
  padding: 16,
};

const createdHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14,
};

const badgeBlueStyle = {
  padding: "5px 10px",
  borderRadius: 999,
  background: "#e8f1ff",
  border: "1px solid #cfe0ff",
  color: "#0b5ed7",
  fontSize: 12,
  fontWeight: 800,
};

const createdMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const miniInfoStyle = {
  background: "#fff",
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

const quickActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};