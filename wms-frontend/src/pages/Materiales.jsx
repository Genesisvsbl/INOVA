import { useEffect, useState } from "react";
import {
  getMateriales,
  crearMaterial,
  editarMaterial,
  eliminarMaterial,
  importarMaterialesExcel,
} from "../api";

const colors = {
  navy: "#072B5A",
  blue: "#0A6ED1",
  bg: "#F5F7FB",
  text: "#0F172A",
  muted: "#64748B",
  card: "#FFFFFF",
  border: "#E2E8F0",
  good: "#16a34a",
  bad: "#dc2626",
  warn: "#f59e0b",
};

function LogoHeader({ badge = "DATOS MAESTROS", title, subtitle }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "end",
        gap: 16,
        marginBottom: 18,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${colors.border}`,
            background: "#fff",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 14px 34px rgba(2,6,23,.08)",
          }}
        >
          <img
            src="/INOVA.png"
            alt="INOVA"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900, letterSpacing: 1 }}>
            {badge}
          </div>
          <h1 style={{ margin: "6px 0 0", color: colors.navy, fontSize: 34, lineHeight: 1.05 }}>
            {title}
          </h1>
          <div style={{ marginTop: 6, color: colors.muted }}>{subtitle}</div>
        </div>
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          background: colors.card,
          color: colors.muted,
          fontSize: 12,
          fontWeight: 800,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        📦 Gestión de materiales
      </div>
    </div>
  );
}

function Chip({ label, tone = "neutral" }) {
  const stylesByTone = {
    neutral: { bg: "#F1F5F9", bd: "#E2E8F0", tx: colors.text },
    blue: { bg: "rgba(10,110,209,.10)", bd: "rgba(10,110,209,.25)", tx: colors.blue },
    green: { bg: "rgba(22,163,74,.10)", bd: "rgba(22,163,74,.25)", tx: colors.good },
    red: { bg: "rgba(220,38,38,.10)", bd: "rgba(220,38,38,.25)", tx: colors.bad },
    amber: { bg: "rgba(245,158,11,.10)", bd: "rgba(245,158,11,.28)", tx: colors.warn },
  };
  const st = stylesByTone[tone] || stylesByTone.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: st.bg,
        border: `1px solid ${st.bd}`,
        color: st.tx,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
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
      alert(String(e));
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
      alert("✅ Material creado correctamente.");
    } catch (e) {
      alert("❌ Error creando material:\n" + String(e));
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
      alert("✅ Material actualizado.");
    } catch (e) {
      alert("❌ Error editando material:\n" + String(e));
    }
  };

  const onEliminar = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este material?")) return;

    try {
      await eliminarMaterial(id);
      await cargar(busqueda);
      alert("✅ Material eliminado.");
    } catch (e) {
      alert("❌ Error eliminando material:\n" + String(e));
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
        `✅ Importación completada.\nMateriales nuevos: ${data?.materiales_nuevos ?? 0}\nMateriales actualizados: ${data?.materiales_actualizados ?? 0}`
      );
    } catch (e) {
      alert("❌ Error importando Excel:\n" + (e?.message || e));
    } finally {
      setImportando(false);
    }
  };

  return (
    <div>
      <LogoHeader
        title="Materiales"
        subtitle="Consulta, crea, edita, elimina e importa materiales del sistema."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr auto auto",
          gap: 12,
          alignItems: "end",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
            BUSCAR
          </div>
          <input
            placeholder="Buscar por código, descripción o familia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              outline: "none",
              fontWeight: 700,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={`Registros: ${materiales.length}`} tone="blue" />
          {cargando && <Chip label="Cargando…" tone="amber" />}
          {!cargando && <Chip label="OK" tone="green" />}
        </div>

        <button
          onClick={() => cargar(busqueda)}
          style={{
            height: 46,
            padding: "0 16px",
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.card,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 14px 34px rgba(2,6,23,.06)",
          }}
        >
          🔄 Actualizar
        </button>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <div style={{ fontWeight: 1000, color: colors.navy, marginBottom: 12 }}>
          Importar materiales desde Excel
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              ARCHIVO EXCEL
            </div>
            <input
              id="input-materiales-excel"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setArchivoExcel(e.target.files?.[0] || null)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                outline: "none",
                fontWeight: 700,
                background: "#fff",
              }}
            />
          </div>

          <button
            onClick={onImportarExcel}
            disabled={importando}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: "none",
              background: colors.warn,
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(245,158,11,.25)",
            }}
          >
            {importando ? "Importando..." : "⬆️ Importar Excel"}
          </button>
        </div>

        <div style={{ marginTop: 10, color: colors.muted, fontSize: 12, fontWeight: 700 }}>
          El archivo debe contener las columnas: <b>codigo</b>, <b>descripcion</b>, <b>unidad</b>, <b>unidad_medida</b> y <b>familia</b>.
        </div>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <div style={{ fontWeight: 1000, color: colors.navy, marginBottom: 12 }}>Crear material</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.8fr 1.8fr 0.7fr 0.8fr 1fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              CÓDIGO
            </div>
            <input
              value={nuevoMaterial.codigo}
              onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, codigo: e.target.value })}
              placeholder="Código"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                outline: "none",
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              DESCRIPCIÓN
            </div>
            <input
              value={nuevoMaterial.descripcion}
              onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, descripcion: e.target.value })}
              placeholder="Descripción"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                outline: "none",
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              UNIDAD
            </div>
            <input
              value={nuevoMaterial.unidad}
              onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, unidad: e.target.value })}
              placeholder="1,00"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                outline: "none",
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              UNIDAD_MEDIDA
            </div>
            <input
              value={nuevoMaterial.unidad_medida}
              onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, unidad_medida: e.target.value })}
              placeholder="KG"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                outline: "none",
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              FAMILIA
            </div>
            <input
              value={nuevoMaterial.familia}
              onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, familia: e.target.value })}
              placeholder="Familia"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                outline: "none",
                fontWeight: 700,
              }}
            />
          </div>

          <button
            onClick={onCrear}
            disabled={guardando}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: "none",
              background: colors.blue,
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(10,110,209,.25)",
            }}
          >
            {guardando ? "Guardando..." : "➕ Crear"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1150 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>ID</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>CÓDIGO</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>DESCRIPCIÓN</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>UNIDAD</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>UNIDAD_MEDIDA</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>FAMILIA</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && materiales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay materiales para mostrar.
                  </td>
                </tr>
              ) : (
                materiales.map((mat) => (
                  <tr key={mat.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12, fontWeight: 900 }}>{mat.id}</td>
                    <td style={{ padding: 12, fontWeight: 900, color: colors.navy }}>{mat.codigo}</td>
                    <td style={{ padding: 12, fontWeight: 700 }}>{mat.descripcion}</td>
                    <td style={{ padding: 12, fontWeight: 800 }}>{formatUnidad(mat.unidad)}</td>
                    <td style={{ padding: 12, fontWeight: 800 }}>{mat.unidad_medida}</td>
                    <td style={{ padding: 12, fontWeight: 800 }}>{mat.familia}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => onEditar(mat)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: `1px solid ${colors.border}`,
                            background: "#fff",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Editar
                        </button>

                        <button
                          onClick={() => onEliminar(mat.id)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: `1px solid rgba(220,38,38,.18)`,
                            background: "rgba(220,38,38,.06)",
                            color: colors.bad,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          🗑️ Eliminar
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
            padding: 12,
            color: colors.muted,
            fontSize: 12,
            fontWeight: 800,
            borderTop: `1px solid ${colors.border}`,
            background: "#FCFDFE",
          }}
        >
          Tip: ya puedes importar materiales directamente desde esta pantalla sin usar Swagger ni CMD.
        </div>
      </div>
    </div>
  );
}