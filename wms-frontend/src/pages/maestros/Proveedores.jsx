import { useEffect, useState } from "react";
import { API_URL } from "../../api";
import {
  Building2,
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
            <Building2 size={18} color="#315a7d" />
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
    neutral: { bg: "#f1f5f9", bd: "#e2e8f0", tx: colors.text },
    blue: { bg: "#eaf3ff", bd: "#cfe0ff", tx: "#0a4fb3" },
    green: { bg: colors.goodBg, bd: colors.goodBd, tx: colors.good },
    amber: { bg: colors.warnBg, bd: colors.warnBd, tx: colors.warn },
    red: { bg: colors.badBg, bd: colors.badBd, tx: colors.bad },
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

export default function Proveedores() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [importando, setImportando] = useState(false);

  const [nuevo, setNuevo] = useState({
    nombre: "",
    acreedor: "",
  });

  const cargar = async (searchText = "") => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set("search", searchText.trim());

      const qs = params.toString();
      const res = await fetch(`${API_URL}/proveedores${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => cargar(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    cargar("");
  }, []);

  const onCrear = async () => {
    if (!nuevo.nombre.trim() || !nuevo.acreedor.trim()) {
      alert("Nombre y acreedor son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/proveedores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevo.nombre.trim(),
          acreedor: nuevo.acreedor.trim(),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setNuevo({ nombre: "", acreedor: "" });
      await cargar(search);
      alert("Proveedor creado correctamente.");
    } catch (e) {
      alert("Error creando proveedor:\n" + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const onEditar = async (item) => {
    const nombre = prompt("Editar nombre del proveedor:", item.nombre || "");
    if (nombre === null) return;

    const acreedor = prompt("Editar acreedor:", item.acreedor || "");
    if (acreedor === null) return;

    if (!nombre.trim() || !acreedor.trim()) {
      alert("Nombre y acreedor son obligatorios.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/proveedores/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          acreedor: acreedor.trim(),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      await cargar(search);
      alert("Proveedor actualizado.");
    } catch (e) {
      alert("Error editando proveedor:\n" + (e?.message || e));
    }
  };

  const onEliminar = async (item) => {
    const ok = window.confirm(`¿Seguro que deseas eliminar el proveedor "${item.nombre}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/proveedores/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(await res.text());

      await cargar(search);
      alert("Proveedor eliminado.");
    } catch (e) {
      alert("Error eliminando proveedor:\n" + (e?.message || e));
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

      const res = await fetch(`${API_URL}/proveedores/importar`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.detail || "Error importando proveedores");
      }

      setArchivoExcel(null);

      const input = document.getElementById("input-proveedores-excel");
      if (input) input.value = "";

      await cargar(search);

      alert(`Importación completada.\nProveedores nuevos: ${data?.proveedores_nuevos ?? 0}`);
    } catch (e) {
      alert("Error importando Excel:\n" + (e?.message || e));
    } finally {
      setImportando(false);
    }
  };

  return (
    <div style={pageStyle}>
      <ModuleHeader
        title="Proveedores"
        subtitle="Busca, visualiza, crea, edita, elimina e importa proveedores con su acreedor."
        helper="Gestión de proveedores"
      />

      <div style={panelStyle}>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(320px, 1.4fr) auto auto",
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
                  placeholder="Buscar por proveedor o acreedor..."
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
              <StatusChip label={`Registros: ${items.length}`} tone="blue" />
              {loading && <StatusChip label="Cargando" tone="amber" />}
              {!loading && !error && <StatusChip label="Operativo" tone="green" />}
              {error && <StatusChip label="Error" tone="red" />}
            </div>

            <button onClick={() => cargar(search)} style={secondaryButtonStyle}>
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
                id="input-proveedores-excel"
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
            El archivo debe contener las columnas: <b>nombre</b> y <b>acreedor</b>. También acepta
            encabezados como <b>nombre proveedor</b> y <b>codigo acreedor</b>.
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Crear proveedor</div>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabelStyle}>Nombre proveedor</div>
              <input
                value={nuevo.nombre}
                onChange={(e) => setNuevo((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: BAVARIA & CIA S C A"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Acreedor</div>
              <input
                value={nuevo.acreedor}
                onChange={(e) => setNuevo((p) => ({ ...p, acreedor: e.target.value }))}
                placeholder="Ej: 491980"
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
          Error: {error}
        </div>
      )}

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Listado de proveedores</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Proveedor</th>
                <th style={thStyle}>Acreedor</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={tdStyle}>
                    No hay proveedores para mostrar.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStrongStyle}>{p.id}</td>
                    <td style={tdStrongStyle}>{p.nombre}</td>
                    <td style={tdStyle}>{p.acreedor}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => onEditar(p)} style={tinyButtonStyle}>
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button onClick={() => onEliminar(p)} style={dangerTinyButtonStyle}>
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
          Ya puedes importar proveedores directamente desde esta pantalla sin usar Swagger ni CMD.
        </div>
      </div>
    </div>
  );
}