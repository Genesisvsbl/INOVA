import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../api";
import {
  MapPin,
  Search,
  RefreshCw,
  Upload,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  bg: "#f3f6f9",
  text: "#1f2d3d",
  muted: "#6b7a90",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#2f6f44",
  goodBg: "#edf8f1",
  goodBd: "#cfe8d7",
  bad: "#b42318",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
  warn: "#9a6700",
  warnBg: "#fff6e5",
  warnBd: "#f1ddb0",
};

const pageStyle = {
  display: "grid",
  gap: 16,
  color: colors.text,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"',
};

const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  overflow: "hidden",
};

const panelHeaderStyle = {
  padding: "12px 14px",
  borderBottom: `1px solid ${colors.border}`,
  background: colors.soft,
  fontWeight: 700,
  color: "#1f3448",
  fontSize: 14,
};

const panelBodyStyle = {
  padding: 16,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7a8797",
  letterSpacing: ".04em",
  marginBottom: 6,
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  outline: "none",
  background: "#fff",
  color: colors.text,
  fontSize: 13,
  fontWeight: 500,
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  height: 38,
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
};

const secondaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const warnButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #e6a700",
  background: "#f59e0b",
  color: "#fff",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const tinyButtonStyle = {
  height: 32,
  padding: "0 10px",
  borderRadius: 7,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 12,
};

const dangerTinyButtonStyle = {
  ...tinyButtonStyle,
  border: `1px solid ${colors.badBd}`,
  background: colors.badBg,
  color: colors.bad,
};

function ModuleHeader({ title, subtitle, helper }) {
  return (
    <div style={panelStyle}>
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${colors.border}`,
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
              flexShrink: 0,
            }}
          >
            <MapPin size={18} color="#315a7d" />
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".08em",
                color: "#7a8797",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Datos maestros
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.1,
                color: "#17324d",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#5b6b7c",
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <div
          style={{
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 12px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            background: "#fff",
            color: colors.muted,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {helper}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ label, tone = "neutral" }) {
  const tones = {
    neutral: {
      bg: "#f1f5f9",
      bd: "#e2e8f0",
      tx: colors.text,
    },
    blue: {
      bg: "#eaf3ff",
      bd: "#cfe0ff",
      tx: "#0a4fb3",
    },
    green: {
      bg: colors.goodBg,
      bd: colors.goodBd,
      tx: colors.good,
    },
    amber: {
      bg: colors.warnBg,
      bd: colors.warnBd,
      tx: colors.warn,
    },
    red: {
      bg: colors.badBg,
      bd: colors.badBd,
      tx: colors.bad,
    },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
        background: t.bg,
        color: t.tx,
      }}
    >
      {label}
    </span>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 12,
  color: "#607080",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 700,
  whiteSpace: "nowrap",
  background: "#fbfcfd",
};

const tdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "nowrap",
  fontSize: 13,
};

const tdStrongStyle = {
  ...tdStyle,
  fontWeight: 700,
  color: "#17324d",
};

export default function Ubicaciones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [importando, setImportando] = useState(false);

  const [nuevo, setNuevo] = useState({
    ubicacion: "",
    ubicacion_base: "",
    posicion: "",
    zona: "",
    bodega: "",
  });

  const filtered = useMemo(() => {
    const s = (search || "").trim().toLowerCase();
    if (!s) return items;

    return items.filter((x) => {
      const u = (x.ubicacion || "").toLowerCase();
      const ub = (x.ubicacion_base || "").toLowerCase();
      const p = (x.posicion || "").toLowerCase();
      const z = (x.zona || "").toLowerCase();
      const b = (x.bodega || "").toLowerCase();

      return u.includes(s) || ub.includes(s) || p.includes(s) || z.includes(s) || b.includes(s);
    });
  }, [items, search]);

  const cargar = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());

      const qs = params.toString();
      const r = await fetch(`${API_URL}/ubicaciones${qs ? `?${qs}` : ""}`);

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || `HTTP ${r.status}`);
      }

      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => cargar(), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    cargar();
  }, []);

  const onCrear = async () => {
    if (!nuevo.ubicacion.trim()) {
      alert("La ubicación final es obligatoria.");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch(`${API_URL}/ubicaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ubicacion: nuevo.ubicacion.trim(),
          ubicacion_base: nuevo.ubicacion_base.trim(),
          posicion: nuevo.posicion.trim(),
          zona: nuevo.zona.trim(),
          bodega: nuevo.bodega.trim(),
        }),
      });

      if (!r.ok) throw new Error(await r.text());

      setNuevo({
        ubicacion: "",
        ubicacion_base: "",
        posicion: "",
        zona: "",
        bodega: "",
      });

      await cargar();
      alert("Ubicación creada correctamente.");
    } catch (e) {
      alert("Error creando ubicación:\n" + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const onEditar = async (item) => {
    const ubicacion_base = prompt("Editar ubicación base:", item.ubicacion_base || "");
    if (ubicacion_base === null) return;

    const posicion = prompt("Editar posición:", item.posicion || "");
    if (posicion === null) return;

    const ubicacion = prompt(
      "Editar ubicación final:",
      item.ubicacion || `${(ubicacion_base || "").trim()}${(posicion || "").trim()}`
    );
    if (ubicacion === null) return;

    const zona = prompt("Editar zona:", item.zona || "");
    if (zona === null) return;

    const bodega = prompt("Editar bodega:", item.bodega || "");
    if (bodega === null) return;

    if (!ubicacion.trim()) {
      alert("La ubicación final es obligatoria.");
      return;
    }

    try {
      const r = await fetch(`${API_URL}/ubicaciones/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ubicacion: ubicacion.trim(),
          ubicacion_base: ubicacion_base.trim(),
          posicion: posicion.trim(),
          zona: zona.trim(),
          bodega: bodega.trim(),
        }),
      });

      if (!r.ok) throw new Error(await r.text());

      await cargar();
      alert("Ubicación actualizada.");
    } catch (e) {
      alert("Error editando ubicación:\n" + (e?.message || e));
    }
  };

  const onEliminar = async (item) => {
    const ok = window.confirm(`¿Seguro que deseas eliminar la ubicación "${item.ubicacion}"?`);
    if (!ok) return;

    try {
      const r = await fetch(`${API_URL}/ubicaciones/${item.id}`, {
        method: "DELETE",
      });

      if (!r.ok) throw new Error(await r.text());

      await cargar();
      alert("Ubicación eliminada.");
    } catch (e) {
      alert("Error eliminando ubicación:\n" + (e?.message || e));
    }
  };

  const onImportarExcel = async () => {
    if (!archivoExcel) {
      alert("Selecciona un archivo Excel.");
      return;
    }

    const nombre = archivoExcel.name.toLowerCase();
    if (!nombre.endsWith(".xlsx") && !nombre.endsWith(".xls")) {
      alert("El archivo debe ser Excel (.xlsx o .xls).");
      return;
    }

    setImportando(true);

    try {
      const formData = new FormData();
      formData.append("file", archivoExcel);

      const r = await fetch(`${API_URL}/ubicaciones/importar`, {
        method: "POST",
        body: formData,
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(data?.detail || "Error importando ubicaciones");
      }

      setArchivoExcel(null);

      const input = document.getElementById("input-ubicaciones-excel");
      if (input) input.value = "";

      await cargar();

      alert(
        `Importación completada.\nModo: ${data?.modo || "N/A"}\nUbicaciones nuevas: ${data?.ubicaciones_nuevas ?? 0}\nUbicaciones actualizadas: ${data?.ubicaciones_actualizadas ?? 0}`
      );
    } catch (e) {
      alert("Error importando Excel:\n" + (e?.message || e));
    } finally {
      setImportando(false);
    }
  };

  return (
    <div style={pageStyle}>
      <ModuleHeader
        title="Ubicaciones"
        subtitle="Administra, crea, edita, elimina e importa ubicación, posición, zona y bodega."
        helper="Gestión de ubicaciones"
      />

      <div style={panelStyle}>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 1.2fr) auto auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabelStyle}>Buscar</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  background: "#fff",
                  height: 38,
                  padding: "0 12px",
                }}
              >
                <Search size={15} color={colors.muted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por ubicación final, base, posición, zona o bodega..."
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    height: "100%",
                    color: colors.text,
                    fontSize: 13,
                    background: "transparent",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <StatusChip label={`Registros: ${filtered.length}`} tone="blue" />
              {loading && <StatusChip label="Cargando" tone="amber" />}
              {!loading && !error && <StatusChip label="Operativo" tone="green" />}
              {error && <StatusChip label="Error" tone="red" />}
            </div>

            <button onClick={cargar} style={secondaryButtonStyle}>
              <RefreshCw size={15} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Importación masiva</div>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 1.4fr) auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabelStyle}>Archivo Excel</div>
              <input
                id="input-ubicaciones-excel"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setArchivoExcel(e.target.files?.[0] || null)}
                style={{ ...inputStyle, paddingTop: 8 }}
              />
            </div>

            <button
              onClick={onImportarExcel}
              disabled={importando}
              style={{ ...warnButtonStyle, opacity: importando ? 0.7 : 1 }}
            >
              <Upload size={15} />
              {importando ? "Importando..." : "Importar Excel"}
            </button>
          </div>

          <div style={{ marginTop: 10, color: colors.muted, fontSize: 12, lineHeight: 1.55 }}>
            El archivo debe venir con: <b>ubicacion</b>, <b>posiciones</b>, <b>zona</b> y <b>bodega</b>.
            El sistema construye la ubicación final uniendo <b>ubicacion</b> + <b>posiciones</b>.
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Crear ubicación</div>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabelStyle}>Ubicación base</div>
              <input
                value={nuevo.ubicacion_base}
                onChange={(e) =>
                  setNuevo((p) => ({
                    ...p,
                    ubicacion_base: e.target.value,
                    ubicacion: `${e.target.value.trim()}${(p.posicion || "").trim()}`,
                  }))
                }
                placeholder="Ej: E1"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Posición</div>
              <input
                value={nuevo.posicion}
                onChange={(e) => {
                  const val = e.target.value;
                  setNuevo((p) => ({
                    ...p,
                    posicion: val,
                    ubicacion: `${(p.ubicacion_base || "").trim()}${val.trim()}`,
                  }));
                }}
                placeholder="Ej: 111"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Ubicación final</div>
              <input
                value={nuevo.ubicacion}
                onChange={(e) => setNuevo((p) => ({ ...p, ubicacion: e.target.value }))}
                placeholder="Ej: E111"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Zona</div>
              <input
                value={nuevo.zona}
                onChange={(e) => setNuevo((p) => ({ ...p, zona: e.target.value }))}
                placeholder="Ej: ZONA ESTANTERIA"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Bodega</div>
              <input
                value={nuevo.bodega}
                onChange={(e) => setNuevo((p) => ({ ...p, bodega: e.target.value }))}
                placeholder="Ej: BODEGA GENERAL"
                style={inputStyle}
              />
            </div>

            <button
              onClick={onCrear}
              disabled={saving}
              style={{ ...primaryButtonStyle, opacity: saving ? 0.7 : 1 }}
            >
              <Plus size={15} />
              {saving ? "Guardando..." : "Crear"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            color: colors.bad,
            fontWeight: 700,
            fontSize: 13,
            background: colors.badBg,
            border: `1px solid ${colors.badBd}`,
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          Error cargando ubicaciones: {error}
        </div>
      )}

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Listado de ubicaciones</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
            <thead>
              <tr>
                <th style={thStyle}>Ubicación base</th>
                <th style={thStyle}>Posición</th>
                <th style={thStyle}>Ubicación final</th>
                <th style={thStyle}>Zona</th>
                <th style={thStyle}>Bodega</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={tdStyle}>
                    No hay ubicaciones para mostrar.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={tdStrongStyle}>{u.ubicacion_base || ""}</td>
                    <td style={tdStyle}>{u.posicion || ""}</td>
                    <td style={tdStrongStyle}>{u.ubicacion || ""}</td>
                    <td style={tdStyle}>{u.zona || ""}</td>
                    <td style={tdStyle}>{u.bodega || ""}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => onEditar(u)} style={tinyButtonStyle}>
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button onClick={() => onEliminar(u)} style={dangerTinyButtonStyle}>
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderTop: `1px solid ${colors.border}`,
            background: "#fcfdff",
            color: colors.muted,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Esta tabla consume <b>GET /ubicaciones</b>. Ya puedes importar datos masivamente desde esta pantalla.
        </div>
      </div>
    </div>
  );
}