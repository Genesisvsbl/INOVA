import { useEffect, useMemo, useState } from "react";
import { showWmsAlert } from "../../wmsDialog.jsx";

// Previsualización + configuración de la estantería por ZONA. Muestra en vivo
// cómo queda la estructura (planta y alzado) a medida que cambias los valores.
// Se guarda por zona. La creación real en el sistema + render 3D es la Etapa 2.
//
// Regla de pasillos:
//   - "Racks por pasillo" = 0 (o vacío)  -> todos los racks van PEGADOS (un bloque).
//   - "Racks por pasillo" = N (>=1)       -> se agrupan de a N por pasillo.

const cleanZone = (v) => {
  const m = String(v || "").match(/\d+/);
  return m ? m[0] : "";
};
const keyFor = (zona) => `wms_layout_cfg_${cleanZone(zona) || "default"}`;
const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));

const card = {
  border: "1px solid #d6e7dc", borderRadius: 18,
  background: "linear-gradient(135deg,#ffffff,#f4fbf6)",
  boxShadow: "0 14px 40px rgba(15,23,42,.07)", padding: 22, marginBottom: 18,
};
const label = { fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 6, display: "block" };
const input = {
  width: "100%", height: 40, borderRadius: 10, border: "1px solid #cbd5e1",
  padding: "0 12px", fontSize: 14, color: "#0f172a", background: "#fff",
};
const field = { display: "flex", flexDirection: "column" };
const moduleBox = { width: 16, height: 22, borderRadius: 3, background: "#bbf7d0", border: "1px solid #16a34a" };

const DEFAULT_CFG = {
  racks: 5,
  modulosPorRack: 9,
  niveles: 6,
  posiciones: 1,
  profundidad: 1,
  racksPorPasillo: 0, // 0 = pegados
};

export default function LayoutConfigurator({ initialZona = "300" }) {
  const [zona, setZona] = useState(cleanZone(initialZona) || "300");
  const [cfg, setCfg] = useState(DEFAULT_CFG);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(keyFor(zona));
      setCfg(raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG);
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
      racksPorPasillo: clampInt(cfg.racksPorPasillo, 0, 40),
    }),
    [cfg]
  );

  const totalUbic =
    norm.racks * norm.modulosPorRack * norm.niveles * norm.posiciones * norm.profundidad;

  // Agrupa los racks en pasillos. Si racksPorPasillo = 0 -> un solo bloque (pegados).
  const grupos = useMemo(() => {
    const porGrupo = norm.racksPorPasillo === 0 ? norm.racks : norm.racksPorPasillo;
    const out = [];
    for (let i = 0; i < norm.racks; i += porGrupo) {
      out.push(Array.from({ length: Math.min(porGrupo, norm.racks - i) }, (_, j) => i + j + 1));
    }
    return out;
  }, [norm.racks, norm.racksPorPasillo]);

  const pegados = norm.racksPorPasillo === 0;

  const guardar = async () => {
    try {
      window.localStorage.setItem(keyFor(zona), JSON.stringify(norm));
      await showWmsAlert(`Configuración de la zona ${zona} guardada.`);
    } catch (e) {
      await showWmsAlert("No se pudo guardar:\n" + (e?.message || e));
    }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#dcfce7", color: "#15803d", fontWeight: 900 }}>▦</div>
        <div>
          <h3 style={{ margin: 0, color: "#0b1f14", fontSize: 18 }}>Configurar estantería · Zona {zona}</h3>
          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>
            Ajusta los valores y ve la previsualización en vivo. Racks por pasillo = 0 → racks pegados.
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
          <span style={label}>Racks por pasillo (0 = pegados)</span>
          <input style={input} type="number" min="0" value={cfg.racksPorPasillo} onChange={(e) => set("racksPorPasillo", e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 18, flexWrap: "wrap", color: "#166534", fontWeight: 700, fontSize: 13 }}>
        <span>{pegados ? "Racks pegados (sin pasillo)" : `Pasillos: ${grupos.length}`}</span>
        <span>Ubicaciones totales: {totalUbic.toLocaleString("es-CO")}</span>
        <span>Profundidad: {norm.profundidad === 2 ? "Doble" : "Sencilla"}</span>
      </div>

      {/* PLANTA (vista superior) */}
      <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        <div style={{ fontWeight: 800, color: "#0b1f14", marginBottom: 10 }}>Planta · Zona {zona}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {grupos.map((racks, gi) => (
            <div key={gi}>
              {!pegados && (
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>Pasillo {gi + 1}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: pegados ? 2 : 6, padding: 8, borderRadius: 10, background: "#eef7f1", border: "1px dashed #bbf7d0" }}>
                {racks.map((r) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 58, fontSize: 12, fontWeight: 800, color: "#15803d" }}>Rack {r}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: norm.modulosPorRack }, (_, m) => (
                        <div key={m} title={`Módulo ${m + 1}`} style={moduleBox} />
                      ))}
                    </div>
                    {norm.profundidad === 2 && <span style={{ fontSize: 11, color: "#64748b" }}>(doble prof.)</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALZADO de un rack */}
      <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        <div style={{ fontWeight: 800, color: "#0b1f14", marginBottom: 10 }}>
          Alzado de un rack · {norm.niveles} niveles × {norm.modulosPorRack} módulos
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Array.from({ length: norm.niveles }, (_, ni) => {
            const nivel = norm.niveles - ni;
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
