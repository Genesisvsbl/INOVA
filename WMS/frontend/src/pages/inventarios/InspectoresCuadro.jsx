import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Warehouse,
  Boxes,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { crearTareaInventario, getMateriales, getUbicaciones } from "../../api";
import { listarUsuariosWms } from "../../adminApi";

const colors = {
  navy: "#0f2744",
  blue: "#0b57d0",
  text: "#1f2d3d",
  muted: "#6b7a90",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#1f7a3d",
  goodBg: "#eaf7ee",
  goodBd: "#cfe7d5",
  bad: "#b42318",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
};

const panel = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  overflow: "hidden",
};
const label = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7a8797",
  letterSpacing: ".04em",
  marginBottom: 6,
  textTransform: "uppercase",
};
const control = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  outline: "none",
  background: "#fff",
  color: colors.text,
  fontSize: 13,
  fontWeight: 600,
  boxSizing: "border-box",
};

export default function InspectoresCuadro() {
  const navigate = useNavigate();
  const creadoPor =
    (sessionStorage.getItem("usuario") || sessionStorage.getItem("nombre") || "SISTEMA").trim();

  const [usuarios, setUsuarios] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ usuario: "", bodega: "", familia: "", observacion: "" });
  const [saving, setSaving] = useState(false);
  const [asignaciones, setAsignaciones] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ubicaciones, materiales, users] = await Promise.all([
          getUbicaciones(),
          getMateriales(),
          listarUsuariosWms(),
        ]);
        const bods = [
          ...new Set((ubicaciones || []).map((x) => String(x.bodega || "").trim()).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b));
        const fams = [
          ...new Set((materiales || []).map((x) => String(x.familia || "").trim()).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b));
        setBodegas(bods);
        setFamilias(fams);
        setUsuarios(Array.isArray(users) ? users : []);
      } catch (e) {
        setError(e?.message || "No se pudieron cargar los catálogos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const usuarioSel = useMemo(
    () => usuarios.find((u) => String(u.usuario) === String(form.usuario)),
    [usuarios, form.usuario]
  );

  const asignar = async () => {
    setError("");
    if (!form.usuario) return setError("Selecciona el inspector.");
    if (!form.bodega) return setError("Selecciona la bodega.");
    setSaving(true);
    try {
      const tarea = await crearTareaInventario({
        tipo_conteo: "bodega_familia",
        bodega: form.bodega,
        familia: form.familia || null,
        asignado_a: form.usuario,
        creado_por: creadoPor,
        observacion: form.observacion.trim() || null,
      });
      setAsignaciones((prev) => [
        {
          id: tarea?.id,
          inspector: usuarioSel?.nombre || form.usuario,
          usuario: form.usuario,
          bodega: form.bodega,
          familia: form.familia || "Todas",
          lineas: tarea?.total_lineas ?? tarea?.detalles?.length ?? 0,
        },
        ...prev,
      ]);
      setForm((prev) => ({ ...prev, familia: "", observacion: "" }));
    } catch (e) {
      setError(e?.message || "No se pudo crear el conteo para ese inspector.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, color: colors.text }}>
      <div style={panel}>
        <div
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${colors.border}`,
            background: "linear-gradient(to bottom,#fbfcfd,#f5f8fb)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#eaf1f8",
              border: "1px solid #d6e1ec",
            }}
          >
            <Users size={20} color="#315a7d" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "#7a8797", textTransform: "uppercase" }}>
              Inventarios
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#17324d" }}>Cuadro de inspectores</div>
            <div style={{ fontSize: 13, color: "#5b6b7c" }}>
              Asigna a cada inspector una bodega y familia; se le crea automáticamente su conteo.
            </div>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          {loading ? (
            <div style={{ color: colors.muted, fontWeight: 700 }}>Cargando catálogos…</div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px,1.4fr) minmax(160px,1fr) minmax(160px,1fr) auto",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <div>
                  <div style={label}>Inspector</div>
                  <select value={form.usuario} onChange={(e) => set("usuario", e.target.value)} style={control}>
                    <option value="">Selecciona…</option>
                    {usuarios.map((u) => (
                      <option key={u.id || u.usuario} value={u.usuario}>
                        {u.nombre} {u.rol ? `· ${u.rol}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={label}>Bodega</div>
                  <select value={form.bodega} onChange={(e) => set("bodega", e.target.value)} style={control}>
                    <option value="">Selecciona…</option>
                    {bodegas.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={label}>Familia (opcional)</div>
                  <select value={form.familia} onChange={(e) => set("familia", e.target.value)} style={control}>
                    <option value="">Todas</option>
                    {familias.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={asignar}
                  disabled={saving || !form.usuario || !form.bodega}
                  style={{
                    height: 40,
                    padding: "0 16px",
                    borderRadius: 8,
                    border: "1px solid #0b57d0",
                    background: saving || !form.usuario || !form.bodega ? "#9dc0f0" : "#0b57d0",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: saving || !form.usuario || !form.bodega ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    whiteSpace: "nowrap",
                  }}
                >
                  <UserPlus size={16} />
                  {saving ? "Asignando…" : "Asignar y crear conteo"}
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <input
                  value={form.observacion}
                  onChange={(e) => set("observacion", e.target.value)}
                  placeholder="Observación (opcional): instrucción para el inspector…"
                  style={{ ...control, height: 38, fontWeight: 500 }}
                />
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    border: `1px solid ${colors.badBd}`,
                    background: colors.badBg,
                    color: colors.bad,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} /> {error}
                </div>
              )}

              {!usuarios.length && (
                <div style={{ marginTop: 12, color: colors.muted, fontSize: 12.5 }}>
                  No hay usuarios con acceso al WMS para asignar. Crea usuarios en Administración de accesos.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {asignaciones.length > 0 && (
        <div style={panel}>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${colors.border}`,
              background: colors.soft,
              fontWeight: 800,
              color: "#1f3448",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} color={colors.good} />
            Conteos asignados en esta sesión ({asignaciones.length})
          </div>
          <div style={{ padding: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Tarea", "Inspector", "Bodega", "Familia", "Líneas"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        fontSize: 11,
                        color: "#607080",
                        borderBottom: `1px solid ${colors.border}`,
                        fontWeight: 800,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asignaciones.map((a, i) => (
                  <tr key={`${a.id}-${i}`}>
                    <td style={cell}>INV-{String(a.id || 0).padStart(6, "0")}</td>
                    <td style={{ ...cell, fontWeight: 700, color: colors.navy }}>
                      <Users size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                      {a.inspector}
                    </td>
                    <td style={cell}>
                      <Warehouse size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                      {a.bodega}
                    </td>
                    <td style={cell}>
                      <Boxes size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                      {a.familia}
                    </td>
                    <td style={{ ...cell, fontWeight: 800 }}>{a.lineas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${colors.border}` }}>
            <button
              onClick={() => navigate("/inventarios")}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                color: colors.text,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ClipboardList size={15} /> Volver a inventarios <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const cell = {
  padding: "8px 10px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  fontSize: 12.5,
};
