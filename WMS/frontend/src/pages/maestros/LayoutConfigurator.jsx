import { useEffect, useMemo, useState } from "react";
import { showWmsAlert } from "../../wmsDialog.jsx";

// Configurador de layout por ZONA (global): defines racks, módulos, niveles,
// posiciones, profundidad y cuántos racks van juntos por pasillo. Se ve un
// plano esquemático reconstruido y se guarda por zona (localStorage).
// Etapa 1 (esquema 2D). Etapa 2: alimentar el LayoutZona 3D con esta config.

const DEFAULT_CFG = {
  racks: 4,
  modulosPorRack: 9,
  niveles: 6,
  posiciones: 2,
  profundidad: 2, // 1 = sencilla, 2 = doble
  racksPorPasillo: 2,
};

const keyFor = (zona) => `wms_layout_cfg_${String(zona || "").trim() || "default"}`;

const card = {
  border: "1px solid #d6e7dc",
  borderRadius: 18,
  background: "linear-gradient(135deg,#ffffff,#f4fbf6)",
  boxShadow: "0 14px 40px rgba(15,23,42,.07)",
  padding: 22,
  marginBottom: 18,
};
const label = { fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 6, display: "block" };
const input = {
  width: "100%", height: 40, borderRadius: 10, border: "1px solid #cbd5e1",
  padding: "0 12px", fontSize: 14, color: "#0f172a", background: "#fff",
};
const field = { display: "flex", flexDirection: "column" };

const clampInt = (v, min, max) =>
  Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));

export default function LayoutConfigurator({ initialZona = "300" }) {
  const [zona, setZona] = useState(String(initialZona || "300"));
  const [cfg, setCfg] = useState(DEFAULT_CFG);

  // Carga la config guardada cuando cambia la zona.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(keyFor(zona));
      if (raw) {
        const parsed = JSON.parse(raw);
        setCfg({ ...DEFAULT_CFG, ...parsed });
      } else {
        setCfg(DEFAULT_CFG);
      }
    } catch (_) {
      setCfg(DEFAULT_CFG);
    }
  }, [zona]);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const norm = useMemo(
    () => ({
      racks: clampInt(cfg.racks, 1, 40),
      modulosPorRack: clampInt(cfg.modulosPorRack, 1, 40),
      niveles: clampInt(cfg.niveles, 1, 20),
      posiciones: clampInt(cfg.posiciones, 1, 10),
      profundidad: cfg.profundidad === 2 ? 2 : 1,
      racksPorPasillo: clampInt(cfg.racksPorPasillo, 1, 10),
    }),
    [cfg]
  );

  const totalUbic =
    norm.racks * norm.modulosPorRack * norm.niveles * norm.posiciones * norm.profundidad;
  const pasillos = Math.ceil(norm.racks / norm.racksPorPasillo);

  // Agrupa los racks en pasillos.
  const grupos = useMemo(() => {
    const out = [];
    for (let i = 0; i < norm.racks; i += norm.racksPorPasillo) {
      out.push(
        Array.from(
          { length: Math.min(norm.racksPorPasillo, norm.racks - i) },
          (_, j) => i + j + 1
        )
      );
    }
    return out;
  }, [norm.racks, norm.racksPorPasillo]);

  const guardar = async () => {
    try {
      window.localStorage.setItem(keyFor(zona), JSON.stringify(norm));
      await showWmsAlert(`Configuración de la zona ${zona} guardada.`);
    } catch (e) {
      await showWmsAlert("No se pudo guardar:\n" + (e?.message || e));
    }
  };

  const moduleBox = {
    width: 16,
    height: 22,
    borderRadius: 3,
    background: "#bbf7d0",
    border: "1px solid #16a34a",
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#dcfce7", color: "#15803d", fontWeight: 900 }}>
          ▦
        </div>
        <div>
          <h3 style={{ margin: 0, color: "#0b1f14", fontSize: 18 }}>Configurador de layout (super-admin)</h3>
          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>
            Define la estructura de la zona y mira el plano reconstruido. Se guarda por zona.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginTop: 14 }}>
        <div style={field}>
          <span style={label}>Zona</span>
          <input style={input} value={zona} onChange={(e) => setZona(e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Racks</span>
          <input style={input} type="number" min="1" value={cfg.racks} onChange={(e) => set("racks", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Módulos por rack</span>
          <input style={input} type="number" min="1" value={cfg.modulosPorRack} onChange={(e) => set("modulosPorRack", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Niveles</span>
          <input style={input} type="number" min="1" value={cfg.niveles} onChange={(e) => set("niveles", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Posiciones / módulo</span>
          <input style={input} type="number" min="1" value={cfg.posiciones} onChange={(e) => set("posiciones", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Profundidad</span>
          <select style={input} value={cfg.profundidad} onChange={(e) => set("profundidad", Number(e.target.value))}>
            <option value={1}>Sencilla</option>
            <option value={2}>Doble</option>
          </select>
        </div>
        <div style={field}>
          <span style={label}>Racks por pasillo</span>
          <input style={input} type="number" min="1" value={cfg.racksPorPasillo} onChange={(e) => set("racksPorPasillo", e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 18, flexWrap: "wrap", color: "#166534", fontWeight: 700, fontSize: 13 }}>
        <span>Pasillos: {pasillos}</span>
        <span>Ubicaciones totales: {totalUbic.toLocaleString("es-CO")}</span>
        <span>Profundidad: {norm.profundidad === 2 ? "Doble" : "Sencilla"}</span>
      </div>

      {/* PLANTA (vista superior): pasillos con sus racks */}
      <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        <div style={{ fontWeight: 800, color: "#0b1f14", marginBottom: 10 }}>Planta · Zona {zona}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grupos.map((racks, gi) => (
            <div key={gi}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
                Pasillo {gi + 1}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 10, background: "#eef7f1", border: "1px dashed #bbf7d0" }}>
                {racks.map((r) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 58, fontSize: 12, fontWeight: 800, color: "#15803d" }}>Rack {r}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: norm.modulosPorRack }, (_, m) => (
                        <div key={m} title={`Módulo ${m + 1}`} style={moduleBox} />
                      ))}
                    </div>
                    {norm.profundidad === 2 && (
                      <span style={{ fontSize: 11, color: "#64748b" }}>(doble prof.)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALZADO de un rack: niveles x módulos */}
      <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        <div style={{ fontWeight: 800, color: "#0b1f14", marginBottom: 10 }}>
          Alzado de un rack · {norm.niveles} niveles × {norm.modulosPorRack} módulos
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Array.from({ length: norm.niveles }, (_, ni) => {
            const nivel = norm.niveles - ni; // arriba el más alto
            return (
              <div key={nivel} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 26, fontSize: 11, fontWeight: 800, color: "#64748b" }}>N{nivel}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: norm.modulosPorRack }, (_, m) => (
                    <div key={m} style={{ display: "flex", gap: 1 }}>
                      {Array.from({ length: norm.posiciones * norm.profundidad }, (_, p) => (
                        <div key={p} style={{ width: 12, height: 18, borderRadius: 2, background: "#dcfce7", border: "1px solid #86efac" }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={guardar}
          style={{ background: "#15803d", color: "#fff", border: "none", borderRadius: 12, padding: "12px 26px", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 12px 26px rgba(21,128,61,.26)" }}
        >
          Guardar configuración de la zona {zona}
        </button>
      </div>
    </div>
  );
}
