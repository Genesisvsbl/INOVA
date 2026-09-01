import { useMemo, useState } from "react";
import { crearUbicacionesBulk, borrarUbicacionesPorCodigo, getUbicaciones } from "../../api";
import { showWmsAlert, showWmsConfirm } from "../../wmsDialog.jsx";

// Camino A: construye la estantería de una zona de verdad. Genera las
// ubicaciones en el formato que el plano 3D entiende (zona+pasillo+módulo+
// nivel'final) y marca la zona como dibujable. Límite del motor 3D actual:
// pasillos 1-2, módulos 1-9, niveles 1-6 (2 posiciones × 2 profundidades = 8
// posiciones internas por celda, fijas por ahora).

const pad2 = (n) => String(n).padStart(2, "0");
const FINALS = 8;
const cleanZone = (v) => {
  const m = String(v || "").match(/\d+/);
  return m ? m[0] : "";
};
const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));
const builtKey = (z) => `wms_layout_built_${cleanZone(z)}`;

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

export default function LayoutConfigurator({ initialZona = "300", onDone = () => {} }) {
  const [cfg, setCfg] = useState({
    zona: cleanZone(initialZona) || "300",
    bodega: "",
    familias: "",
    pasillos: 2,
    modulos: 9,
    niveles: 6,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const norm = useMemo(
    () => ({
      zona: cleanZone(cfg.zona),
      pasillos: clampInt(cfg.pasillos, 1, 2),
      modulos: clampInt(cfg.modulos, 1, 9),
      niveles: clampInt(cfg.niveles, 1, 6),
    }),
    [cfg]
  );

  const rows = useMemo(() => {
    const out = [];
    if (!norm.zona) return out;
    for (let p = 1; p <= norm.pasillos; p++) {
      for (let m = 1; m <= norm.modulos; m++) {
        for (let n = 1; n <= norm.niveles; n++) {
          const base = `${norm.zona}${p}${m}${n}`;
          for (let f = 1; f <= FINALS; f++) {
            out.push({
              ubicacion: `${base}'${pad2(f)}`,
              ubicacion_base: base,
              posicion: pad2(f),
              zona: norm.zona,
              bodega: cfg.bodega,
              familias: cfg.familias,
            });
          }
        }
      }
    }
    return out;
  }, [norm, cfg.bodega, cfg.familias]);

  const total = rows.length;
  const sample = rows.slice(0, 6).map((r) => r.ubicacion);

  const construir = async () => {
    if (!norm.zona) { await showWmsAlert("Indica la zona (solo números, ej. 400)."); return; }
    if (!total) { await showWmsAlert("La configuración no genera ubicaciones."); return; }
    const ok = await showWmsConfirm(
      `Se construirá la estantería de la zona ${norm.zona}: ${total} ubicaciones (las que ya existan se omiten). Al terminar, el plano 3D la dibujará. ¿Continuar?`,
      { confirmLabel: "Sí, construir" }
    );
    if (!ok) return;
    try {
      setBusy(true);
      const res = await crearUbicacionesBulk(rows);
      try { window.localStorage.setItem(builtKey(norm.zona), "true"); } catch (_) { /* noop */ }
      await showWmsAlert(
        `Estantería construida: ${res.creadas} ubicaciones nuevas${res.yaExistian ? `, ${res.yaExistian} ya existían` : ""}. Cierro y recargo el plano.`
      );
      onDone();
    } catch (e) {
      await showWmsAlert("Error construyendo la estantería:\n" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const borrarZona = async () => {
    if (!norm.zona) { await showWmsAlert("Indica la zona."); return; }
    const ok = await showWmsConfirm(
      `Se borrará TODA la estantería de la zona ${norm.zona} (solo ubicaciones sin stock; las ocupadas se conservan). ¿Continuar?`,
      { confirmLabel: "Sí, borrar la zona", tone: "danger" }
    );
    if (!ok) return;
    try {
      setBusy(true);
      const todas = await getUbicaciones();
      const delZona = (todas || []).filter(
        (u) => cleanZone(u.zona || u.ubicacion_base || u.ubicacion) === norm.zona
      );
      const codigos = delZona.map((u) => u.ubicacion).filter(Boolean);
      if (!codigos.length) { await showWmsAlert(`La zona ${norm.zona} no tiene ubicaciones registradas.`); return; }
      const res = await borrarUbicacionesPorCodigo(codigos);
      if (res.bloqueadas === 0) {
        try { window.localStorage.removeItem(builtKey(norm.zona)); } catch (_) { /* noop */ }
      }
      await showWmsAlert(
        `Zona ${norm.zona}: ${res.borradas} ubicaciones borradas${
          res.bloqueadas ? `. ${res.bloqueadas} no se borraron (tienen stock; reasigna y reintenta).` : ""
        }`
      );
      onDone();
    } catch (e) {
      await showWmsAlert("Error borrando la zona:\n" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#dcfce7", color: "#15803d", fontWeight: 900 }}>▦</div>
        <div>
          <h3 style={{ margin: 0, color: "#0b1f14", fontSize: 18 }}>Configurar estantería · Zona {norm.zona}</h3>
          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>
            Ajusta la estructura, míra la previsualización y constrúyela. El plano 3D se dibuja al terminar.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginTop: 14 }}>
        <div style={field}><span style={label}>Zona</span>
          <input style={input} value={cfg.zona} onChange={(e) => set("zona", e.target.value)} /></div>
        <div style={field}><span style={label}>Bodega</span>
          <input style={input} value={cfg.bodega} onChange={(e) => set("bodega", e.target.value)} /></div>
        <div style={field}><span style={label}>Familias (opcional)</span>
          <input style={input} value={cfg.familias} onChange={(e) => set("familias", e.target.value)} /></div>
        <div style={field}><span style={label}>Pasillos (1-2)</span>
          <input style={input} type="number" min="1" max="2" value={cfg.pasillos} onChange={(e) => set("pasillos", e.target.value)} /></div>
        <div style={field}><span style={label}>Módulos (1-9)</span>
          <input style={input} type="number" min="1" max="9" value={cfg.modulos} onChange={(e) => set("modulos", e.target.value)} /></div>
        <div style={field}><span style={label}>Niveles (1-6)</span>
          <input style={input} type="number" min="1" max="6" value={cfg.niveles} onChange={(e) => set("niveles", e.target.value)} /></div>
      </div>

      <div style={{ marginTop: 14, color: "#166534", fontWeight: 700, fontSize: 13 }}>
        {norm.pasillos} pasillo(s) · {norm.modulos} módulos · {norm.niveles} niveles · {total.toLocaleString("es-CO")} ubicaciones
      </div>

      {/* Previsualización: pasillos con sus módulos */}
      <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        {Array.from({ length: norm.pasillos }, (_, pi) => (
          <div key={pi} style={{ marginBottom: pi < norm.pasillos - 1 ? 10 : 0 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>Pasillo {pi + 1}</div>
            <div style={{ display: "flex", gap: 3, padding: 8, borderRadius: 10, background: "#eef7f1", border: "1px dashed #bbf7d0" }}>
              {Array.from({ length: norm.modulos }, (_, m) => (
                <div key={m} title={`Módulo ${m + 1} · ${norm.niveles} niveles`} style={{ display: "flex", flexDirection: "column-reverse", gap: 2 }}>
                  {Array.from({ length: norm.niveles }, (_, n) => (<div key={n} style={moduleBox} />))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sample.map((u) => (
            <span key={u} style={{ fontFamily: "monospace", fontSize: 12, background: "#fff", border: "1px solid #d6e7dc", borderRadius: 8, padding: "3px 8px", color: "#0b1f14" }}>{u}</span>
          ))}
          {total > sample.length && <span style={{ color: "#64748b" }}>…</span>}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={borrarZona} disabled={busy}
          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 20px", fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer" }}>
          Borrar estantería de la zona
        </button>
        <button type="button" onClick={construir} disabled={busy || !total}
          style={{ background: busy ? "#86efac" : "#15803d", color: "#fff", border: "none", borderRadius: 12, padding: "12px 26px", fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 12px 26px rgba(21,128,61,.26)" }}>
          {busy ? "Procesando…" : `Construir estantería (${total.toLocaleString("es-CO")})`}
        </button>
      </div>
    </div>
  );
}
