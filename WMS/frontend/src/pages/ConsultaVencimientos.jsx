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

  const escHtml = (s) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Construye una tabla LIMPIA oculta (solo para la imagen). html2canvas maneja
  // mal el layout flex con nowrap/ellipsis (junta las palabras), por eso se
  // captura esta tabla simple en su lugar.
  const buildTablaImagen = (rows, titulo) => {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;left:-12000px;top:0;width:1180px;background:#ffffff;padding:22px;font-family:Arial,Helvetica,sans-serif;color:#1f2d3d;letter-spacing:normal;word-spacing:normal;";
    let html =
      `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">` +
      `<span style="font-size:20px;font-weight:bold;color:#0a1f52;">${escHtml(titulo)}</span>` +
      `<span style="font-size:13px;font-weight:bold;color:#64748b;background:#eef2f7;padding:2px 11px;border-radius:20px;">${rows.length}</span>` +
      `</div>`;
    html +=
      `<table style="width:100%;border-collapse:collapse;font-size:14px;">` +
      `<thead><tr style="background:#0b3d91;color:#ffffff;">` +
      `<th style="padding:9px 10px;text-align:left;">Código</th>` +
      `<th style="padding:9px 10px;text-align:left;">Descripción</th>` +
      `<th style="padding:9px 10px;text-align:left;">Ubicación</th>` +
      `<th style="padding:9px 10px;text-align:left;">Lote</th>` +
      `<th style="padding:9px 10px;text-align:center;">Vence</th>` +
      `<th style="padding:9px 10px;text-align:center;">Estado</th>` +
      `<th style="padding:9px 10px;text-align:right;">Cantidad</th>` +
      `</tr></thead><tbody>`;
    rows.forEach((r, i) => {
      const e = filaEstado(r.dias);
      const bg = i % 2 ? "#f7f9fc" : "#ffffff";
      html +=
        `<tr style="background:${bg};border-bottom:1px solid #e6ecf3;">` +
        `<td style="padding:8px 10px;font-weight:bold;color:#0b3d91;">${escHtml(r.codigo)}</td>` +
        `<td style="padding:8px 10px;">${escHtml(r.descripcion)}</td>` +
        `<td style="padding:8px 10px;">${escHtml(r.ubicacion)}</td>` +
        `<td style="padding:8px 10px;">${escHtml(r.lote || "-")}</td>` +
        `<td style="padding:8px 10px;text-align:center;">${escHtml(fmtDMY(r.fv))}</td>` +
        `<td style="padding:8px 10px;text-align:center;"><span style="background:${e.bg};color:${e.color};font-weight:bold;padding:2px 8px;border-radius:6px;">${escHtml(e.txt)}</span></td>` +
        `<td style="padding:8px 10px;text-align:right;font-weight:bold;">${escHtml(nf(r.cantidad))}</td>` +
        `</tr>`;
    });
    html += `</tbody></table>`;
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    return wrap;
  };

  // Tabla limpia de PNC (columnas propias) para la imagen.
  const buildTablaImagenPnc = (rows, titulo) => {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;left:-12000px;top:0;width:1180px;background:#ffffff;padding:22px;font-family:Arial,Helvetica,sans-serif;color:#1f2d3d;";
    let html =
      `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">` +
      `<span style="font-size:20px;font-weight:bold;color:#0a1f52;">${escHtml(titulo)}</span>` +
      `<span style="font-size:13px;font-weight:bold;color:#64748b;background:#eef2f7;padding:2px 11px;border-radius:20px;">${rows.length}</span>` +
      `</div>` +
      `<table style="width:100%;border-collapse:collapse;font-size:14px;">` +
      `<thead><tr style="background:#0b3d91;color:#ffffff;">` +
      `<th style="padding:9px 10px;text-align:left;">Código</th>` +
      `<th style="padding:9px 10px;text-align:left;">Descripción</th>` +
      `<th style="padding:9px 10px;text-align:left;">Lote</th>` +
      `<th style="padding:9px 10px;text-align:center;">Vencimiento</th>` +
      `<th style="padding:9px 10px;text-align:right;">Cantidad</th>` +
      `</tr></thead><tbody>`;
    rows.forEach((p, i) => {
      const bg = i % 2 ? "#f7f9fc" : "#ffffff";
      html +=
        `<tr style="background:${bg};border-bottom:1px solid #e6ecf3;">` +
        `<td style="padding:8px 10px;font-weight:bold;color:#0b3d91;">${escHtml(p.codigo_material)}</td>` +
        `<td style="padding:8px 10px;">${escHtml(p.descripcion_material)}</td>` +
        `<td style="padding:8px 10px;">${escHtml(p.lote_almacen || p.lote_proveedor || "-")}</td>` +
        `<td style="padding:8px 10px;text-align:center;">${escHtml(fmtDMY(p.fecha_vencimiento))}</td>` +
        `<td style="padding:8px 10px;text-align:right;font-weight:bold;">${escHtml(nf(p.cantidad))}</td>` +
        `</tr>`;
    });
    html += `</tbody></table>`;
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
    return wrap;
  };

  const capturarYCopiar = async (node, titulo) => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(node, { backgroundColor: "#ffffff", scale: 2 });
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
      setErr("No se pudo copiar la imagen: " + (e?.message || e));
      setTimeout(() => setErr(""), 2500);
    } finally {
      node.remove();
    }
  };

  const copiarTabla = async (rows, titulo) => {
    if (!rows.length) return;
    await capturarYCopiar(buildTablaImagen(rows, titulo), titulo);
  };

  const copiarPnc = async (rows, titulo) => {
    if (!rows.length) return;
    await capturarYCopiar(buildTablaImagenPnc(rows, titulo), titulo);
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

          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ color: colors.navy, display: "inline-flex" }}><ShieldAlert size={18} /></span>
              <span style={{ fontSize: 16, fontWeight: 800, color: colors.navy }}>PNC bloqueado sin gestionar</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: colors.muted, background: "#eef2f7", padding: "1px 9px", borderRadius: 20 }}>{pnc.length}</span>
              <button
                type="button"
                onClick={() => copiarPnc(pnc, "PNC bloqueado sin gestionar")}
                disabled={pnc.length === 0}
                title="Copiar la tabla como imagen"
                style={{
                  marginLeft: "auto", height: 34, padding: "0 16px", borderRadius: 9,
                  border: copiado === "PNC bloqueado sin gestionar" ? "1px solid #0f9d58" : `1px solid ${colors.border}`,
                  background: copiado === "PNC bloqueado sin gestionar" ? "linear-gradient(135deg,#22c55e,#12a150)" : "#fff",
                  color: copiado === "PNC bloqueado sin gestionar" ? "#fff" : colors.navy,
                  fontWeight: 800, fontSize: 12.5, cursor: pnc.length === 0 ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: copiado === "PNC bloqueado sin gestionar" ? "0 6px 16px rgba(18,161,80,.3)" : "none",
                  opacity: pnc.length === 0 ? 0.5 : 1,
                }}
              >
                {copiado === "PNC bloqueado sin gestionar" ? <Check size={14} /> : <Copy size={14} />}
                {copiado === "PNC bloqueado sin gestionar" ? "Copiado" : "Copiar imagen"}
              </button>
            </div>
            <div style={{ maxHeight: 420, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {pnc.length === 0 ? (
                <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "16px", color: colors.muted, fontSize: 13 }}>
                  No hay material en PNC.
                </div>
              ) : (
                pnc.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.navy}`, padding: "11px 16px" }}>
                    <div style={{ flex: "0 0 70px", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: colors.blue }}>{p.codigo_material}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.descripcion_material}</div>
                      <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>lote {p.lote_almacen || p.lote_proveedor || "-"} · vence {fmtDMY(p.fecha_vencimiento)}</div>
                    </div>
                    <div style={{ flex: "0 0 70px", textAlign: "right", fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: colors.text }}>{nf(p.cantidad)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
