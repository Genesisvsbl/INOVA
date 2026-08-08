import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMovimientosLayoutStock, getPncBloqueado } from "../api";
import { AlertTriangle, Clock, ArrowLeft, RefreshCw, ShieldAlert, Copy, Check } from "lucide-react";

const colors = {
  navy: "#0a1f52",
  blue: "#0b3d91",
  text: "#1f2d3d",
  muted: "#64748b",
  border: "#d9e2ec",
  bad: "#b42318",
  badBg: "#fdeaea",
  warn: "#b45309",
  warnBg: "#fff7e6",
  good: "#157347",
};

function diasHasta(fvIso) {
  const s = String(fvIso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fv = new Date(`${s}T00:00:00`);
  return Math.round((fv - hoy) / 86400000);
}
const fmtDMY = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || "");
};
const nf = (n) => Number(n || 0).toLocaleString("es-CO");

export default function ConsultaVencimientos() {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [pnc, setPnc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dias, setDias] = useState(60); // umbral por defecto
  const [copiado, setCopiado] = useState("");

  const cargar = async () => {
    setLoading(true);
    setErr("");
    try {
      const [st, pn] = await Promise.all([
        getMovimientosLayoutStock().catch(() => []),
        getPncBloqueado().catch(() => []),
      ]);
      setStock(Array.isArray(st) ? st : []);
      setPnc(Array.isArray(pn) ? pn : []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    cargar();
  }, []);

  // Agrega el stock por material + ubicación + lote + vencimiento.
  const agregado = useMemo(() => {
    const map = new Map();
    (stock || []).forEach((s) => {
      const fv = String(s.fecha_vencimiento || "").slice(0, 10);
      if (!fv) return;
      const cant = Number(s.cantidad ?? s.cantidad_r ?? 0);
      if (cant <= 0) return;
      const key = `${s.codigo_material}|${s.ubicacion}|${s.lote_almacen}|${fv}`;
      if (!map.has(key)) {
        map.set(key, {
          codigo: s.codigo_material,
          descripcion: s.descripcion_material,
          ubicacion: s.ubicacion,
          lote: s.lote_almacen || s.lote_proveedor || "",
          fv,
          cantidad: 0,
        });
      }
      map.get(key).cantidad += cant;
    });
    return Array.from(map.values())
      .map((x) => ({ ...x, dias: diasHasta(x.fv) }))
      .filter((x) => x.dias !== null)
      .sort((a, b) => a.dias - b.dias);
  }, [stock]);

  const vencidos = useMemo(() => agregado.filter((x) => x.dias < 0), [agregado]);
  const porVencer = useMemo(
    () => agregado.filter((x) => x.dias >= 0 && x.dias <= dias),
    [agregado, dias]
  );

  const btn = (bg, brd) => ({
    height: 36,
    padding: "0 14px",
    borderRadius: 8,
    border: `1px solid ${brd || bg}`,
    background: bg,
    color: bg === "#fff" ? colors.navy : "#fff",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  });
  const th = { position: "sticky", top: 0, background: colors.blue, color: "#fff", fontSize: 12, textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap" };
  const td = { padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, fontSize: 12.5 };

  const filaEstado = (d) => {
    if (d < 0) return { txt: `Vencido hace ${Math.abs(d)} d`, bg: colors.badBg, color: colors.bad };
    if (d <= 15) return { txt: `${d} días`, bg: colors.badBg, color: colors.bad };
    if (d <= dias) return { txt: `${d} días`, bg: colors.warnBg, color: colors.warn };
    return { txt: `${d} días`, bg: "#eef4ff", color: colors.blue };
  };

  const secRefs = useRef({});

  // Copia la IMAGEN de la tabla al portapapeles (para pegarla como foto en
  // WhatsApp, correo, etc.). Si el navegador no permite copiar imagen, la
  // descarga como PNG.
  const copiarTabla = async (rows, titulo) => {
    const el = secRefs.current[titulo];
    if (!el) return;
    const scroller = el.querySelector("[data-scroller]");
    const prev = scroller ? { m: scroller.style.maxHeight, o: scroller.style.overflow } : null;
    if (scroller) { scroller.style.maxHeight = "none"; scroller.style.overflow = "visible"; }
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        ignoreElements: (node) => node?.getAttribute?.("data-copy-btn") === "1",
      });
      await new Promise((res) =>
        canvas.toBlob(async (blob) => {
          if (!blob) return res();
          try {
            await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
          } catch {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${titulo}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
          }
          res();
        }, "image/png")
      );
      setCopiado(titulo);
      setTimeout(() => setCopiado(""), 1800);
    } catch (e) {
      showErr(e);
    } finally {
      if (scroller && prev) { scroller.style.maxHeight = prev.m; scroller.style.overflow = prev.o; }
    }
  };

  const showErr = (e) => {
    setErr("No se pudo copiar la imagen: " + (e?.message || e));
    setTimeout(() => setErr(""), 2500);
  };

  const tabla = (rows, titulo, icon, tone) => (
    <div style={{ marginBottom: 22 }} ref={(el) => { secRefs.current[titulo] = el; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ color: colors.navy, display: "inline-flex" }}>{icon}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: colors.navy }}>{titulo}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: colors.muted, background: "#eef2f7", padding: "1px 9px", borderRadius: 20 }}>{rows.length}</span>
        <button
          type="button"
          data-copy-btn="1"
          onClick={() => copiarTabla(rows, titulo)}
          disabled={rows.length === 0}
          title="Copiar la tabla como imagen (para pegar en WhatsApp, correo, etc.)"
          style={{
            marginLeft: "auto",
            height: 34,
            padding: "0 16px",
            borderRadius: 9,
            border: copiado === titulo ? "1px solid #0f9d58" : `1px solid ${colors.border}`,
            background: copiado === titulo ? "linear-gradient(135deg,#22c55e,#12a150)" : "#fff",
            color: copiado === titulo ? "#fff" : colors.navy,
            fontWeight: 800,
            fontSize: 12.5,
            cursor: rows.length === 0 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: copiado === titulo ? "0 6px 16px rgba(18,161,80,.3)" : "none",
            opacity: rows.length === 0 ? 0.5 : 1,
          }}
        >
          {copiado === titulo ? <Check size={14} /> : <Copy size={14} />}
          {copiado === titulo ? "Copiado" : "Copiar imagen"}
        </button>
      </div>

      <div data-scroller style={{ maxHeight: 460, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "16px", color: colors.muted, fontSize: 13 }}>
            Sin registros.
          </div>
        ) : (
          rows.map((r, i) => {
            const e = filaEstado(r.dias);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "#fff",
                  border: `1px solid ${colors.border}`,
                  borderLeft: `3px solid ${e.color}`,
                  padding: "11px 16px",
                }}
              >
                <div style={{ flex: "0 0 70px", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: colors.blue }}>
                  {r.codigo}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.descripcion}
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {r.ubicacion} · lote {r.lote || "-"} · vence {fmtDMY(r.fv)}
                  </div>
                </div>
                <div style={{ background: e.bg, color: e.color, fontWeight: 800, fontSize: 12, padding: "3px 12px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  {e.txt}
                </div>
                <div style={{ flex: "0 0 70px", textAlign: "right", fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: colors.text }}>
                  {nf(r.cantidad)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => navigate(-1)} style={btn("#fff", colors.border)}><ArrowLeft size={16} /> Volver</button>
        <div style={{ fontSize: 20, fontWeight: 900, color: colors.navy }}>Alertas de vencimiento</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: colors.muted }}>Próximos a vencer en</span>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))} style={{ height: 36, borderRadius: 8, border: `1px solid ${colors.border}`, padding: "0 8px", fontWeight: 600 }}>
          <option value={15}>15 días</option>
          <option value={30}>30 días</option>
          <option value={60}>60 días</option>
          <option value={90}>90 días</option>
          <option value={180}>180 días</option>
        </select>
        <button onClick={cargar} disabled={loading} style={btn(colors.blue)}><RefreshCw size={15} /> {loading ? "Cargando…" : "Actualizar"}</button>
      </div>

      {err && <div style={{ background: colors.badBg, color: colors.bad, padding: 12, borderRadius: 10, marginBottom: 14, fontWeight: 700 }}>Error: {err}</div>}

      {!loading && (
        <>
          {tabla(vencidos, "Vencidos (retirar / dar de baja)", <AlertTriangle size={18} />, colors.navy)}
          {tabla(porVencer, `Por vencer (≤ ${dias} días)`, <Clock size={18} />, colors.navy)}

          <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ background: colors.navy, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
              <ShieldAlert size={18} /> PNC bloqueado sin gestionar <span style={{ opacity: 0.85 }}>({pnc.length})</span>
            </div>
            <div style={{ maxHeight: 320, overflow: "auto" }}>
              <table className="table-tools-skip" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Código", "Descripción", "Lote", "Vencimiento", "Cantidad"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {pnc.length === 0 ? (
                    <tr><td style={{ ...td, color: colors.muted }} colSpan={5}>No hay material en PNC.</td></tr>
                  ) : (
                    pnc.map((p, i) => (
                      <tr key={i}>
                        <td style={{ ...td, fontWeight: 800, color: colors.blue }}>{p.codigo_material}</td>
                        <td style={td}>{p.descripcion_material}</td>
                        <td style={td}>{p.lote_almacen || p.lote_proveedor || "-"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{fmtDMY(p.fecha_vencimiento)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{nf(p.cantidad)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
