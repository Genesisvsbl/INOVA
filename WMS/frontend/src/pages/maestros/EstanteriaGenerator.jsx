import { useMemo, useState } from "react";
import { crearUbicacionesBulk, borrarUbicacionesPorCodigo } from "../../api";
import { showWmsConfirm, showWmsAlert } from "../../wmsDialog.jsx";

const pad2 = (n) => String(n).padStart(2, "0");

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
  width: "100%",
  height: 40,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: "0 12px",
  fontSize: 14,
  color: "#0f172a",
  background: "#fff",
};
const field = { display: "flex", flexDirection: "column" };

export default function EstanteriaGenerator({ onDone = () => {} }) {
  const [cfg, setCfg] = useState({
    zona: "300",
    bodega: "",
    familias: "",
    modulos: 8,
    niveles: 7,
    posiciones: 5,
    profundidad: "sencilla",
    profEtiquetas: "A,B",
    modPrefix: "E",
    nivPrefix: "N",
    sep: "-",
  });
  const [generando, setGenerando] = useState(false);
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const depths = useMemo(() => {
    if (cfg.profundidad !== "doble") return [""];
    const labels = String(cfg.profEtiquetas || "A,B")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return labels.length ? labels : ["A", "B"];
  }, [cfg.profundidad, cfg.profEtiquetas]);

  const rows = useMemo(() => {
    const out = [];
    const M = Math.max(0, parseInt(cfg.modulos, 10) || 0);
    const N = Math.max(0, parseInt(cfg.niveles, 10) || 0);
    const P = Math.max(0, parseInt(cfg.posiciones, 10) || 0);
    const sep = cfg.sep;
    for (let m = 1; m <= M; m++) {
      for (let n = 1; n <= N; n++) {
        const base = `${cfg.zona}${sep}${cfg.modPrefix}${m}${sep}${cfg.nivPrefix}${n}`;
        for (let p = 1; p <= P; p++) {
          for (const d of depths) {
            const posicion = `${pad2(p)}${d}`;
            const ubicacion = `${base}${sep}${posicion}`;
            out.push({
              ubicacion,
              ubicacion_base: base,
              posicion,
              zona: cfg.zona,
              bodega: cfg.bodega,
              familias: cfg.familias,
            });
          }
        }
      }
    }
    return out;
  }, [cfg, depths]);

  const total = rows.length;
  const preview = rows.slice(0, 6).map((r) => r.ubicacion);
  const last = rows.length ? rows[rows.length - 1].ubicacion : "";

  const generar = async () => {
    if (!String(cfg.zona).trim()) {
      await showWmsAlert("Indica la zona.");
      return;
    }
    if (!total) {
      await showWmsAlert(
        "La configuración no genera ubicaciones. Revisa módulos, niveles y posiciones."
      );
      return;
    }
    const ok = await showWmsConfirm(
      `Se crearán hasta ${total} ubicaciones en la zona ${cfg.zona}. Las que ya existan se omiten. ¿Continuar?`
    );
    if (!ok) return;
    try {
      setGenerando(true);
      const res = await crearUbicacionesBulk(rows);
      await showWmsAlert(
        `Listo: ${res.creadas} ubicaciones creadas${
          res.yaExistian ? `, ${res.yaExistian} ya existían` : ""
        }.`
      );
      onDone();
    } catch (e) {
      await showWmsAlert("Error generando estantería:\n" + (e?.message || e));
    } finally {
      setGenerando(false);
    }
  };

  const borrar = async () => {
    if (!total) {
      await showWmsAlert("No hay ubicaciones en la configuración actual.");
      return;
    }
    const ok = await showWmsConfirm(
      `Se intentarán borrar ${total} ubicaciones de la zona ${cfg.zona} (según esta configuración). Las que tengan stock/movimientos NO se borran. ¿Continuar?`,
      { confirmLabel: "Sí, borrar" }
    );
    if (!ok) return;
    try {
      setGenerando(true);
      const res = await borrarUbicacionesPorCodigo(rows.map((r) => r.ubicacion));
      await showWmsAlert(
        `Borradas: ${res.borradas}${
          res.bloqueadas
            ? `. ${res.bloqueadas} no se pudieron borrar (tienen stock).`
            : ""
        }`
      );
      onDone();
    } catch (e) {
      await showWmsAlert("Error borrando:\n" + (e?.message || e));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: "#dcfce7",
            color: "#15803d",
            fontWeight: 900,
          }}
        >
          ▤
        </div>
        <div>
          <h3 style={{ margin: 0, color: "#0b1f14", fontSize: 18 }}>
            Generador de estanterías (super-admin)
          </h3>
          <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>
            Define la estructura y crea todas las ubicaciones de una. Ajusta el
            patrón y mira la vista previa antes de generar.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          marginTop: 14,
        }}
      >
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
          <span style={label}>Módulos</span>
          <input style={input} type="number" min="1" value={cfg.modulos} onChange={(e) => set("modulos", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Niveles</span>
          <input style={input} type="number" min="1" value={cfg.niveles} onChange={(e) => set("niveles", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Posiciones / nivel</span>
          <input style={input} type="number" min="1" value={cfg.posiciones} onChange={(e) => set("posiciones", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Profundidad</span>
          <select style={input} value={cfg.profundidad} onChange={(e) => set("profundidad", e.target.value)}>
            <option value="sencilla">Sencilla</option>
            <option value="doble">Doble profundidad</option>
          </select>
        </div>
        {cfg.profundidad === "doble" && (
          <div style={field}>
            <span style={label}>Etiquetas prof. (coma)</span>
            <input style={input} value={cfg.profEtiquetas} onChange={(e) => set("profEtiquetas", e.target.value)} />
          </div>
        )}
        <div style={field}>
          <span style={label}>Prefijo módulo</span>
          <input style={input} value={cfg.modPrefix} onChange={(e) => set("modPrefix", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Prefijo nivel</span>
          <input style={input} value={cfg.nivPrefix} onChange={(e) => set("nivPrefix", e.target.value)} />
        </div>
        <div style={field}>
          <span style={label}>Separador</span>
          <input style={input} value={cfg.sep} onChange={(e) => set("sep", e.target.value)} />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <strong style={{ color: "#15803d" }}>
            Vista previa · {total.toLocaleString("es-CO")} ubicaciones
          </strong>
          {last && <span style={{ color: "#64748b", fontSize: 13 }}>Última: {last}</span>}
        </div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {preview.map((u) => (
            <span
              key={u}
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                background: "#fff",
                border: "1px solid #d6e7dc",
                borderRadius: 8,
                padding: "4px 10px",
                color: "#0b1f14",
              }}
            >
              {u}
            </span>
          ))}
          {total > preview.length && <span style={{ color: "#64748b" }}>…</span>}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          onClick={borrar}
          disabled={generando || !total}
          title="Borra las ubicaciones de esta configuración que estén vacías (sin stock)"
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "12px 22px",
            fontWeight: 800,
            fontSize: 15,
            cursor: generando ? "not-allowed" : "pointer",
          }}
        >
          Borrar estas (solo vacías)
        </button>
        <button
          type="button"
          onClick={generar}
          disabled={generando || !total}
          style={{
            background: generando ? "#86efac" : "#15803d",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 26px",
            fontWeight: 800,
            fontSize: 15,
            cursor: generando ? "not-allowed" : "pointer",
            boxShadow: "0 12px 26px rgba(21,128,61,.26)",
          }}
        >
          {generando ? "Generando…" : `Generar ${total.toLocaleString("es-CO")} ubicaciones`}
        </button>
      </div>
    </div>
  );
}
