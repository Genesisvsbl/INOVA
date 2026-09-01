import { useMemo, useState } from "react";
import { crearUbicacionesBulk, borrarUbicacionesPorCodigo, getUbicaciones } from "../../api";
import { showWmsAlert, showWmsConfirm } from "../../wmsDialog.jsx";

// Configurador de estantería por ZONA (Etapa 1): genera las ubicaciones en el
// formato que el plano 3D entiende (zona+pasillo+módulo+nivel'final) y permite
// crear o borrar la estantería de la zona. El stock se reasigna después.
// Límite del motor 3D actual: pasillos 1-2, módulos 1-9, niveles 1-9, y 8
// posiciones internas por celda (2 racks × 2 posiciones × 2 profundidades).

const pad2 = (n) => String(n).padStart(2, "0");
const FINALS = 8; // 2 racks (lados) × 2 posiciones × 2 profundidades

const cleanZone = (v) => {
  const m = String(v || "").match(/\d+/);
  return m ? m[0] : "";
};

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
const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));

export default function LayoutConfigurator({ initialZona = "300" }) {
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
      niveles: clampInt(cfg.niveles, 1, 9),
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
            const posicion = pad2(f);
            out.push({
              ubicacion: `${base}'${posicion}`,
              ubicacion_base: base,
              posicion,
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
  const preview = rows.slice(0, 6).map((r) => r.ubicacion);

  const crear = async () => {
    if (!norm.zona) {
      await showWmsAlert("Indica la zona (solo números, ej. 400).");
      return;
    }
    if (!total) {
      await showWmsAlert("La configuración no genera ubicaciones.");
      return;
    }
    const ok = await showWmsConfirm(
      `Se crearán ${total} ubicaciones para la estantería de la zona ${norm.zona} (las que ya existan se omiten). ¿Continuar?`,
      { confirmLabel: "Sí, crear" }
    );
    if (!ok) return;
    try {
      setBusy(true);
      const res = await crearUbicacionesBulk(rows);
      await showWmsAlert(
        `Estantería creada: ${res.creadas} ubicaciones nuevas${
          res.yaExistian ? `, ${res.yaExistian} ya existían` : ""
        }. Recarga el layout para verla.`
      );
    } catch (e) {
      await showWmsAlert("Error creando la estantería:\n" + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const borrarZona = async () => {
    if (!norm.zona) {
      await showWmsAlert("Indica la zona.");
      return;
    }
    const ok = await showWmsConfirm(
      `Se borrará TODA la estantería de la zona ${norm.zona} (solo las ubicaciones sin stock; las ocupadas se conservan). ¿Continuar?`,
      { confirmLabel: "Sí, borrar la zona", tone: "danger" }
    );
    if (!ok) return;
    try {
      setBusy(true);
      const todas = await getUbicaciones();
      const codigos = (todas || [])
        .filter((u) => cleanZone(u.zona || u.ubicacion_base || u.ubicacion) === norm.zona)
        .map((u) => u.ubicacion)
        .filter(Boolean);
      if (!codigos.length) {
        await showWmsAlert(`La zona ${norm.zona} no tiene ubicaciones registradas.`);
        return;
      }
      const res = await borrarUbicacionesPorCodigo(codigos);
      await showWmsAlert(
        `Zona ${norm.zona}: ${res.borradas} ubicaciones borradas${
          res.bloqueadas
            ? `. ${res.bloqueadas} no se borraron (tienen stock; reasigna y vuelve a intentar).`
            : ""
        }`
      );
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
            Crea la estantería de la zona (o bórrala y rehazla). Genera las ubicaciones en el formato del plano 3D.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginTop: 14 }}>
        <div style={field}>
          <span style={label}>Zona</span>
          <input style={input} value={cfg.zona} onChange={(e) => set("zona", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Bodega</span>
          <input style={input} value={cfg.bodega} onChange={(e) => set("bodega", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Familias (opcional)</span>
          <input style={input} value={cfg.familias} onChange={(e) => set("familias", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Pasillos (1-2)</span>
          <input style={input} type="number" min="1" max="2" value={cfg.pasillos} onChange={(e) => set("pasillos", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Módulos (1-9)</span>
          <input style={input} type="number" min="1" max="9" value={cfg.modulos} onChange={(e) => set("modulos", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Niveles (1-9)</span>
          <input style={input} type="number" min="1" max="9" value={cfg.niveles} onChange={(e) => set("niveles", e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <strong style={{ color: "#15803d" }}>Vista previa · {total.toLocaleString("es-CO")} ubicaciones</strong>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {preview.map((u) => (
            <span key={u} style={{ fontFamily: "monospace", fontSize: 13, background: "#fff", border: "1px solid #d6e7dc", borderRadius: 8, padding: "4px 10px", color: "#0b1f14" }}>{u}</span>
          ))}
          {total > preview.length && <span style={{ color: "#64748b" }}>…</span>}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={borrarZona}
          disabled={busy}
          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 22px", fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer" }}
        >
          Borrar estantería de la zona
        </button>
        <button
          type="button"
          onClick={crear}
          disabled={busy || !total}
          style={{ background: busy ? "#86efac" : "#15803d", color: "#fff", border: "none", borderRadius: 12, padding: "12px 26px", fontWeight: 800, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", boxShadow: "0 12px 26px rgba(21,128,61,.26)" }}
        >
          {busy ? "Procesando…" : `Crear estantería (${total.toLocaleString("es-CO")})`}
        </button>
      </div>
    </div>
  );
}
