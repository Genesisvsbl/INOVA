import { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../api";

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
        📍 Gestión de ubicaciones
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
    familias: "",
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
      const f = (x.familias || "").toLowerCase();
      const b = (x.bodega || "").toLowerCase();

      return (
        u.includes(s) ||
        ub.includes(s) ||
        p.includes(s) ||
        z.includes(s) ||
        f.includes(s) ||
        b.includes(s)
      );
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
          familias: nuevo.familias.trim(),
          bodega: nuevo.bodega.trim(),
        }),
      });

      if (!r.ok) throw new Error(await r.text());

      setNuevo({
        ubicacion: "",
        ubicacion_base: "",
        posicion: "",
        zona: "",
        familias: "",
        bodega: "",
      });

      await cargar();
      alert("✅ Ubicación creada correctamente.");
    } catch (e) {
      alert("❌ Error creando ubicación:\n" + (e?.message || e));
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

    const familias = prompt("Editar familias:", item.familias || "");
    if (familias === null) return;

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
          familias: familias.trim(),
          bodega: bodega.trim(),
        }),
      });

      if (!r.ok) throw new Error(await r.text());

      await cargar();
      alert("✅ Ubicación actualizada.");
    } catch (e) {
      alert("❌ Error editando ubicación:\n" + (e?.message || e));
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
      alert("✅ Ubicación eliminada.");
    } catch (e) {
      alert("❌ Error eliminando ubicación:\n" + (e?.message || e));
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
        `✅ Importación completada.\nModo: ${data?.modo || "N/A"}\nUbicaciones nuevas: ${data?.ubicaciones_nuevas ?? 0}\nUbicaciones actualizadas: ${data?.ubicaciones_actualizadas ?? 0}`
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
        title="Ubicaciones"
        subtitle="Administra, crea, edita, elimina e importa ubicación, posición, zona, familias y bodega."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr auto auto",
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
            placeholder="Buscar por ubicación final, base, posición, zona, familias o bodega..."
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
          <Chip label={`Registros: ${filtered.length}`} tone="blue" />
          {loading && <Chip label="Cargando…" tone="amber" />}
          {!loading && !error && <Chip label="OK" tone="green" />}
          {error && <Chip label="Error" tone="red" />}
        </div>

        <button
          onClick={cargar}
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
          Importar ubicaciones desde Excel
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
              id="input-ubicaciones-excel"
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
              cursor: importando ? "not-allowed" : "pointer",
              opacity: importando ? 0.7 : 1,
              boxShadow: "0 10px 24px rgba(245,158,11,.25)",
            }}
          >
            {importando ? "Importando..." : "⬆️ Importar Excel"}
          </button>
        </div>

        <div style={{ marginTop: 10, color: colors.muted, fontSize: 12, fontWeight: 700 }}>
          El archivo debe venir en este formato:
          <br />
          <b>Layout:</b> <b>ubicacion</b> + <b>posiciones</b> + <b>zona</b> + <b>bodega</b>
          <br />
          El sistema construye la ubicación final uniendo <b>ubicacion</b> + <b>posiciones</b>.
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
        <div style={{ fontWeight: 1000, color: colors.navy, marginBottom: 12 }}>
          Crear ubicación
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: colors.muted, marginBottom: 6 }}>
              UBICACIÓN BASE
            </div>
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
              POSICIÓN
            </div>
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
              UBICACIÓN FINAL
            </div>
            <input
              value={nuevo.ubicacion}
              onChange={(e) => setNuevo((p) => ({ ...p, ubicacion: e.target.value }))}
              placeholder="Ej: E111"
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
              ZONA
            </div>
            <input
              value={nuevo.zona}
              onChange={(e) => setNuevo((p) => ({ ...p, zona: e.target.value }))}
              placeholder="Ej: ZONA ESTANTERIA"
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
              FAMILIAS
            </div>
            <input
              value={nuevo.familias}
              onChange={(e) => setNuevo((p) => ({ ...p, familias: e.target.value }))}
              placeholder="Opcional"
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
              BODEGA
            </div>
            <input
              value={nuevo.bodega}
              onChange={(e) => setNuevo((p) => ({ ...p, bodega: e.target.value }))}
              placeholder="Ej: BODEGA GENERAL"
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
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              boxShadow: "0 10px 24px rgba(10,110,209,.25)",
            }}
          >
            {saving ? "Guardando..." : "➕ Crear"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: colors.bad, marginBottom: 12, fontWeight: 900 }}>
          Error cargando ubicaciones: {error}
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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1500 }}>
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  borderBottom: `1px solid ${colors.border}`,
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>
                  UBICACIÓN
                </th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>
                  POSICIÓN
                </th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>
                  UBICACIÓN FINAL
                </th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>
                  ZONA
                </th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>
                  FAMILIAS
                </th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>
                  BODEGA
                </th>
                <th style={{ padding: 12, color: colors.muted, fontSize: 12, fontWeight: 1000 }}>
                  ACCIONES
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 18, color: colors.muted, fontWeight: 800 }}>
                    No hay ubicaciones para mostrar.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12, fontWeight: 900, color: colors.navy }}>
                      {u.ubicacion_base || ""}
                    </td>
                    <td style={{ padding: 12, fontWeight: 900, color: colors.text }}>
                      {u.posicion || ""}
                    </td>
                    <td style={{ padding: 12, fontWeight: 900, color: colors.blue }}>
                      {u.ubicacion || ""}
                    </td>
                    <td style={{ padding: 12 }}>{u.zona || ""}</td>
                    <td style={{ padding: 12 }}>{u.familias || ""}</td>
                    <td style={{ padding: 12 }}>{u.bodega || ""}</td>
                    <td style={{ padding: 12 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => onEditar(u)}
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
                          onClick={() => onEliminar(u)}
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
            marginTop: 0,
            padding: 12,
            borderTop: `1px solid ${colors.border}`,
            color: colors.muted,
            fontSize: 12,
            background: "#FBFDFF",
            fontWeight: 800,
          }}
        >
          Esta tabla sale de <b>GET /ubicaciones</b>. Ya puedes importar datos masivamente desde
          esta misma pantalla sin usar Swagger ni CMD.
        </div>
      </div>
    </div>
  );
}