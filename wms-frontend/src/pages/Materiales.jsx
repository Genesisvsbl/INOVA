import { useEffect, useState } from "react";
import {
  getMateriales,
  crearMaterial,
  editarMaterial,
  eliminarMaterial,
  importarMaterialesExcel,
} from "../api";
import {
  Package,
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
            <Package size={18} color="#315a7d" />
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

function formatUnidad(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

export default function Materiales() {
  const [materiales, setMateriales] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [archivoExcel, setArchivoExcel] = useState(null);
  const [importando, setImportando] = useState(false);

  const [nuevoMaterial, setNuevoMaterial] = useState({
    codigo: "",
    descripcion: "",
    unidad: "",
    unidad_medida: "",
    familia: "",
  });

  const cargar = async (search = "") => {
    setCargando(true);
    try {
      const data = await getMateriales(search);
      setMateriales(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando materiales:", e);
      setMateriales([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const onCrear = async () => {
    if (
      !nuevoMaterial.codigo.trim() ||
      !nuevoMaterial.descripcion.trim() ||
      String(nuevoMaterial.unidad).trim() === "" ||
      !nuevoMaterial.unidad_medida.trim() ||
      !nuevoMaterial.familia.trim()
    ) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    const unidadNumerica = parseFloat(String(nuevoMaterial.unidad).replace(",", "."));

    if (Number.isNaN(unidadNumerica)) {
      alert("La columna Unidad debe ser numérica.");
      return;
    }

    setGuardando(true);
    try {
      await crearMaterial({
        codigo: nuevoMaterial.codigo.trim(),
        descripcion: nuevoMaterial.descripcion.trim(),
        unidad: unidadNumerica,
        unidad_medida: nuevoMaterial.unidad_medida.trim(),
        familia: nuevoMaterial.familia.trim(),
      });

      setNuevoMaterial({
        codigo: "",
        descripcion: "",
        unidad: "",
        unidad_medida: "",
        familia: "",
      });

      await cargar(busqueda);
      alert("Material creado correctamente.");
    } catch (e) {
      alert("Error creando material:\n" + String(e));
    } finally {
      setGuardando(false);
    }
  };

  const onEditar = async (mat) => {
    const nuevoCodigo = prompt("Nuevo código:", mat.codigo);
    if (nuevoCodigo === null) return;

    const nuevaDescripcion = prompt("Nueva descripción:", mat.descripcion);
    if (nuevaDescripcion === null) return;

    const nuevaUnidad = prompt("Nueva unidad:", mat.unidad ?? "");
    if (nuevaUnidad === null) return;

    const nuevaUnidadMedida = prompt("Nueva unidad de medida:", mat.unidad_medida);
    if (nuevaUnidadMedida === null) return;

    const nuevaFamilia = prompt("Nueva familia:", mat.familia ?? "");
    if (nuevaFamilia === null) return;

    if (
      !nuevoCodigo.trim() ||
      !nuevaDescripcion.trim() ||
      String(nuevaUnidad).trim() === "" ||
      !nuevaUnidadMedida.trim() ||
      !nuevaFamilia.trim()
    ) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    const unidadNumerica = parseFloat(String(nuevaUnidad).replace(",", "."));

    if (Number.isNaN(unidadNumerica)) {
      alert("La columna Unidad debe ser numérica.");
      return;
    }

    try {
      await editarMaterial(mat.id, {
        codigo: nuevoCodigo.trim(),
        descripcion: nuevaDescripcion.trim(),
        unidad: unidadNumerica,
        unidad_medida: nuevaUnidadMedida.trim(),
        familia: nuevaFamilia.trim(),
      });

      await cargar(busqueda);
      alert("Material actualizado.");
    } catch (e) {
      alert("Error editando material:\n" + String(e));
    }
  };

  const onEliminar = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este material?")) return;

    try {
      await eliminarMaterial(id);
      await cargar(busqueda);
      alert("Material eliminado.");
    } catch (e) {
      alert("Error eliminando material:\n" + String(e));
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
      const data = await importarMaterialesExcel(archivoExcel);

      setArchivoExcel(null);

      const input = document.getElementById("input-materiales-excel");
      if (input) input.value = "";

      await cargar(busqueda);

      alert(
        `Importación completada.\nMateriales nuevos: ${data?.materiales_nuevos ?? 0}\nMateriales actualizados: ${data?.materiales_actualizados ?? 0}`
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
        title="Materiales"
        subtitle="Consulta, crea, edita, elimina e importa materiales del sistema."
        helper="Gestión de materiales"
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
                  placeholder="Buscar por código, descripción o familia..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
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

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <StatusChip label={`Registros: ${materiales.length}`} tone="blue" />
              {cargando && <StatusChip label="Cargando" tone="amber" />}
              {!cargando && <StatusChip label="Operativo" tone="green" />}
            </div>

            <button onClick={() => cargar(busqueda)} style={secondaryButtonStyle}>
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
                id="input-materiales-excel"
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
            El archivo debe contener las columnas: <b>codigo</b>, <b>descripcion</b>, <b>unidad</b>,{" "}
            <b>unidad_medida</b> y <b>familia</b>.
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Crear material</div>
        <div style={panelBodyStyle}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.8fr 1.8fr 0.7fr 0.8fr 1fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabelStyle}>Código</div>
              <input
                value={nuevoMaterial.codigo}
                onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, codigo: e.target.value })}
                placeholder="Código"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Descripción</div>
              <input
                value={nuevoMaterial.descripcion}
                onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, descripcion: e.target.value })}
                placeholder="Descripción"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Unidad</div>
              <input
                value={nuevoMaterial.unidad}
                onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, unidad: e.target.value })}
                placeholder="1,00"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Unidad medida</div>
              <input
                value={nuevoMaterial.unidad_medida}
                onChange={(e) =>
                  setNuevoMaterial({ ...nuevoMaterial, unidad_medida: e.target.value })
                }
                placeholder="KG"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Familia</div>
              <input
                value={nuevoMaterial.familia}
                onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, familia: e.target.value })}
                placeholder="Familia"
                style={inputStyle}
              />
            </div>

            <button
              onClick={onCrear}
              disabled={guardando}
              style={{ ...primaryButtonStyle, opacity: guardando ? 0.7 : 1 }}
            >
              <Plus size={15} />
              {guardando ? "Guardando..." : "Crear"}
            </button>
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <div style={panelHeaderStyle}>Listado de materiales</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1150 }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Unidad</th>
                <th style={thStyle}>Unidad medida</th>
                <th style={thStyle}>Familia</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && materiales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={tdStyle}>
                    No hay materiales para mostrar.
                  </td>
                </tr>
              ) : (
                materiales.map((mat) => (
                  <tr key={mat.id}>
                    <td style={tdStrongStyle}>{mat.id}</td>
                    <td style={tdStrongStyle}>{mat.codigo}</td>
                    <td style={tdStyle}>{mat.descripcion}</td>
                    <td style={tdStyle}>{formatUnidad(mat.unidad)}</td>
                    <td style={tdStyle}>{mat.unidad_medida}</td>
                    <td style={tdStyle}>{mat.familia}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => onEditar(mat)} style={tinyButtonStyle}>
                          <Pencil size={14} />
                          Editar
                        </button>

                        <button onClick={() => onEliminar(mat.id)} style={dangerTinyButtonStyle}>
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
          Ya puedes importar materiales directamente desde esta pantalla sin usar Swagger ni CMD.
        </div>
      </div>
    </div>
  );
}