import { useEffect, useState } from "react";

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
        🏭 Gestión de proveedores
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
      const res = await fetch(`http://127.0.0.1:8000/proveedores${qs ? `?${qs}` : ""}`);
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
      const res = await fetch("http://127.0.0.1:8000/proveedores", {
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
      alert("✅ Proveedor creado correctamente.");
    } catch (e) {
      alert("❌ Error creando proveedor:\n" + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const onEditar = async (item) => {
    const nombre = prompt("Editar nombre del proveedor:", item.nombre);
    if (nombre === null) return;

    const acreedor = prompt("Editar acreedor:", item.acreedor || "");
    if (acreedor === null) return;

    if (!nombre.trim() || !acreedor.trim()) {
      alert("Nombre y acreedor son obligatorios.");
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/proveedores/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          acreedor: acreedor.trim(),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      await cargar(search);
      alert("✅ Proveedor actualizado.");
    } catch (e) {
      alert("❌ Error editando proveedor:\n" + (e?.message || e));
    }
  };

  const onEliminar = async (item) => {
    const ok = window.confirm(`¿Seguro que deseas eliminar el proveedor "${item.nombre}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/proveedores/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(await res.text());

      await cargar(search);
      alert("✅ Proveedor eliminado.");
    } catch (e) {
      alert("❌ Error eliminando proveedor:\n" + (e?.message || e));
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

      const res = await fetch("http://127.0.0.1:8000/proveedores/importar", {
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

      alert(
        `✅ Importación completada.\nProveedores nuevos: ${data?.proveedores_nuevos ?? 0}`
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
        title="Proveedores"
        subtitle="Busca, visualiza, crea, edita, elimina e importa proveedores con su acreedor."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.9fr auto",
          gap: 12,
          marginBottom: 16,
          alignItems: "end",
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por proveedor o acreedor..."
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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Chip label={`Registros: ${items.length}`} tone="blue" />
          {loading && <Chip label="Cargando…" tone="amber" />}
          {!loading && !error && <Chip label="OK" tone="green" />}
          {error && <Chip label="Error" tone="red" />}
        </div>

        <button
          onClick={() => cargar(search)}
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
          Importar proveedores desde Excel
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
              id="input-proveedores-excel"
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
          El archivo debe contener las columnas: <b>nombre</b> y <b>acreedor</b>. También acepta encabezados como <b>nombre proveedor</b> y <b>codigo acreedor</b>.
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
        <div style={{ fontWeight: 1000, color: colors.navy, marginBottom: 12 }}>Crear proveedor</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              NOMBRE PROVEEDOR
            </div>
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: BAVARIA & CIA S C A"
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
              ACREEDOR
            </div>
            <input
              value={nuevo.acreedor}
              onChange={(e) => setNuevo((p) => ({ ...p, acreedor: e.target.value }))}
              placeholder="Ej: 491980"
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
            disabled={saving}
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
            {saving ? "Guardando..." : "➕ Crear"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: colors.bad, fontWeight: 900, marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}`, textAlign: "left" }}>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>ID</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>Proveedor</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>Acreedor</th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay proveedores para mostrar.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12, fontWeight: 900 }}>{p.id}</td>
                    <td style={{ padding: 12, fontWeight: 800, color: colors.navy }}>{p.nombre}</td>
                    <td style={{ padding: 12, fontWeight: 800 }}>{p.acreedor}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => onEditar(p)}
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
                          onClick={() => onEliminar(p)}
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
          Tip: ya puedes importar proveedores directamente desde esta pantalla sin usar Swagger ni CMD.
        </div>
      </div>
    </div>
  );
}