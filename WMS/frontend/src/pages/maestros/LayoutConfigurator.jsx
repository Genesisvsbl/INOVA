import { useEffect, useMemo, useState } from "react";
import { showWmsAlert, showWmsConfirm } from "../../wmsDialog.jsx";

// Configurador de DISEÑO de estantería por zona. Es puramente visual: define
// cómo se DIBUJA el plano (racks/pasillos/módulos/niveles). NO crea ni borra
// ubicaciones ni stock. Se guarda por zona en el navegador (localStorage).
//   - Guardar diseño  -> guarda la config y enciende el 3D de la zona.
//   - Borrar diseño   -> quita la config (el 3D vuelve a "pendiente"). No toca datos.
//
// Pasillos = 0  -> racks pegados (sin pasillo). Pasillos >= 1 -> con pasillos.

const cleanZone = (v) => {
  const m = String(v || "").match(/\d+/);
  return m ? m[0] : "";
};
const cfgKey = (z) => `wms_layout_cfg_${cleanZone(z)}`;
const builtKey = (z) => `wms_layout_built_${cleanZone(z)}`;
const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));

const card = {
  border: "1px solid #d6e7dc", borderRadius: 18,
  background: "linear-gradient(135deg,#ffffff,#f4fbf6)",
  boxShadow: "0 14px 40px rgba(15,23,42,.07)", padding: 22, marginBottom: 4,
};
const label = { fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 6, display: "block" };
const input = {
  width: "100%", height: 40, borderRadius: 10, border: "1px solid #cbd5e1",
  padding: "0 12px", fontSize: 14, color: "#0f172a", background: "#fff",
};
const field = { display: "flex", flexDirection: "column" };
const moduleBox = { width: 15, height: 20, borderRadius: 3, background: "#bbf7d0", border: "1px solid #16a34a" };

const DEFAULT_CFG = { pasillos: 2, modulos: 9, niveles: 6, posiciones: 2, profundidad: 2 };

export default function LayoutConfigurator({ initialZona = "300", onDone = () => {} }) {
  const [zona, setZona] = useState(cleanZone(initialZona) || "300");
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cfgKey(zona));
      setCfg(raw ? { ...DEFAULT_CFG, ...JSON.parse(raw) } : DEFAULT_CFG);
    } catch (_) {
      setCfg(DEFAULT_CFG);
    }
  }, [zona]);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const norm = useMemo(
    () => ({
      pasillos: clampInt(cfg.pasillos, 0, 2),
      modulos: clampInt(cfg.modulos, 1, 9),
      niveles: clampInt(cfg.niveles, 1, 6),
      posiciones: clampInt(cfg.posiciones, 1, 2),
      profundidad: Number(cfg.profundidad) === 2 ? 2 : 1,
    }),
    [cfg]
  );
  const pegados = norm.pasillos === 0;

  const guardar = async () => {
    if (!cleanZone(zona)) { await showWmsAlert("Indica la zona (solo números, ej. 400)."); return; }
    try {
      setBusy(true);
      window.localStorage.setItem(cfgKey(zona), JSON.stringify(norm));
      window.localStorage.setItem(builtKey(zona), "true");
      await showWmsAlert(`Diseño de la zona ${cleanZone(zona)} guardado. Se dibuja al recargar el plano.`);
      onDone();
    } catch (e) {
      await showWmsAlert("No se pudo guardar el diseño:\n" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const borrarDiseno = async () => {
    if (!cleanZone(zona)) { await showWmsAlert("Indica la zona."); return; }
    const ok = await showWmsConfirm(
      `Se borrará el DISEÑO de la zona ${cleanZone(zona)} (cómo se dibuja). No se toca ninguna ubicación ni stock. ¿Continuar?`,
      { confirmLabel: "Sí, borrar diseño" }
    );
    if (!ok) return;
    try {
      setBusy(true);
      window.localStorage.removeItem(cfgKey(zona));
      window.localStorage.removeItem(builtKey(zona));
      await showWmsAlert(`Diseño de la zona ${cleanZone(zona)} borrado. Los datos quedan intactos.`);
      onDone();
    } catch (e) {
      await showWmsAlert("No se pudo borrar el diseño:\n" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#dcfce7", color: "#15803d", fontWeight: 900 }}>▦</div>
        <div>
          <h3 style={{ margin: 0, color: "#0b1f14", fontSize: 18 }}>Diseño de estantería · Zona {cleanZone(zona)}</h3>
          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>
            Solo cambia cómo se DIBUJA el plano. No toca ubicaciones ni stock. Pasillos = 0 → racks pegados.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginTop: 14 }}>
        <div style={field}><span style={label}>Zona</span>
          <input style={input} value={zona} onChange={(e) => setZona(e.target.value)} /></div>
        <div style={field}><span style={label}>Pasillos (0 = pegados, máx 2)</span>
          <input style={input} type="number" min="0" max="2" value={cfg.pasillos} onChange={(e) => set("pasillos", e.target.value)} /></div>
        <div style={field}><span style={label}>Módulos (1-9)</span>
          <input style={input} type="number" min="1" max="9" value={cfg.modulos} onChange={(e) => set("modulos", e.target.value)} /></div>
        <div style={field}><span style={label}>Niveles (1-6)</span>
          <input style={input} type="number" min="1" max="6" value={cfg.niveles} onChange={(e) => set("niveles", e.target.value)} /></div>
        <div style={field}><span style={label}>Posiciones por módulo (1-2)</span>
          <input style={input} type="number" min="1" max="2" value={cfg.posiciones} onChange={(e) => set("posiciones", e.target.value)} /></div>
        <div style={field}><span style={label}>Profundidad</span>
          <select style={input} value={cfg.profundidad} onChange={(e) => set("profundidad", Number(e.target.value))}>
            <option value={1}>Sencilla</option>
            <option value={2}>Doble</option>
          </select></div>
      </div>

      <div style={{ marginTop: 14, color: "#166534", fontWeight: 700, fontSize: 13 }}>
        {pegados ? "Racks pegados (sin pasillo)" : `${norm.pasillos} pasillo(s)`} · {norm.modulos} módulos · {norm.niveles} niveles
      </div>

      {/* Previsualización del alzado de un rack */}
      <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        <div style={{ fontWeight: 800, color: "#0b1f14", marginBottom: 10 }}>
          Alzado de un rack · {norm.niveles} niveles × {norm.modulos} módulos
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {Array.from({ length: norm.niveles }, (_, ni) => {
            const nivel = norm.niveles - ni;
            return (
              <div key={nivel} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 26, fontSize: 11, fontWeight: 800, color: "#64748b" }}>N{nivel}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: norm.modulos }, (_, m) => (<div key={m} style={moduleBox} />))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={borrarDiseno} disabled={busy}
          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 20px", fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer" }}>
          Borrar diseño
        </button>
        <button type="button" onClick={guardar} disabled={busy}
          style={{ background: busy ? "#86efac" : "#15803d", color: "#fff", border: "none", borderRadius: 12, padding: "12px 26px", fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 12px 26px rgba(21,128,61,.26)" }}>
          {busy ? "Guardando…" : "Guardar diseño"}
        </button>
      </div>
    </div>
  );
}
