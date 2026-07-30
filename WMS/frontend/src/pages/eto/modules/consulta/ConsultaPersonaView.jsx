import { useMemo, useState } from "react";
import { Search, User, Copy } from "lucide-react";
import API from "../../api";

const ahora = new Date();

const estadoColor = (e) =>
  e === "ok"
    ? { bg: "#22c55e", fg: "#fff", label: "OK", line: "#16a34a" }
    : e === "warning"
    ? { bg: "#f59e0b", fg: "#fff", label: "WARNING", line: "#d97706" }
    : e === "critical"
    ? { bg: "#ef4444", fg: "#fff", label: "CRÍTICO", line: "#dc2626" }
    : { bg: "#e2e8f0", fg: "#64748b", label: "—", line: "#94a3b8" };

const SEV = { critical: 0, warning: 1, ok: 2, none: 3 };
const META_OBJETIVO = 90;

function derivarIndicador(ind) {
  const conds = ind.condiciones || [];
  const evaluadas = conds.filter((c) => c.meta != null);
  const completos = evaluadas.filter((c) => Number(c.value) >= Number(c.meta)).length;
  const pendientes =
    evaluadas.reduce((s, c) => s + Math.max(0, Number(c.meta) - Number(c.value)), 0) +
    (evaluadas.length === 0 && ind.meta > 0 ? Math.max(0, ind.meta - ind.accumulated) : 0);
  const sobreMeta = evaluadas.reduce((s, c) => s + Math.max(0, Number(c.value) - Number(c.meta)), 0);
  const faltan = evaluadas.filter((c) => Number(c.value) < Number(c.meta));
  const pct = evaluadas.length
    ? Math.round((completos / evaluadas.length) * 100)
    : ind.meta > 0
    ? Math.min(100, Math.round((ind.accumulated / ind.meta) * 100))
    : 0;
  return { evaluadas, completos, pendientes, sobreMeta, faltan, pct };
}

function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Dibuja el reporte de la persona a mano en un canvas (nítido, sin encimarse).
function buildReporteCanvas(p, month, year) {
  const MES = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"][month] || month;
  const dp = derivarPersona(p);
  const inds = [...p.indicadores].sort((a, b) => (SEV[a.estado] ?? 3) - (SEV[b.estado] ?? 3));
  const filasDe = (ind) => {
    const d = derivarIndicador(ind);
    return d.evaluadas.length
      ? d.evaluadas
      : ind.meta > 0
      ? [{ name: "Reportes", value: ind.accumulated, meta: ind.meta }]
      : [];
  };
  const W = 1000, pad = 26, scale = 2;
  const indH = inds.map((ind) => {
    const rows = filasDe(ind).length + (ind.invalid > 0 ? 1 : 0);
    return 56 + rows * 26 + 34;
  });
  const H = 100 + 100 + 34 + indH.reduce((a, b) => a + b, 0) + 46;

  const cv = document.createElement("canvas");
  cv.width = W * scale;
  cv.height = H * scale;
  const ctx = cv.getContext("2d");
  ctx.scale(scale, scale);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Encabezado
  ctx.fillStyle = "#0e3a2a";
  ctx.fillRect(0, 0, W, 100);
  ctx.textAlign = "left";
  ctx.fillStyle = "#8fd3b8";
  ctx.font = "bold 11px Arial";
  ctx.fillText(`EVALUACIÓN INDIVIDUAL · ${MES} ${year}`, pad, 16);
  ctx.fillStyle = "#f0fdf4";
  ctx.font = "900 25px Arial";
  ctx.fillText(String(p.name || "").toUpperCase(), pad, 34);
  ctx.fillStyle = "#9fc4b3";
  ctx.font = "13px Arial";
  ctx.fillText(`C.C. ${p.code} · ${p.entity_type || "Persona"} · ${p.indicadores.length} indicadores evaluados`, pad, 70);
  if (dp.requierePlan) {
    ctx.font = "bold 12px Arial";
    const t = "REQUIERE PLAN DE ACCIÓN";
    const w = ctx.measureText(t).width + 24;
    ctx.fillStyle = "#d97706";
    rrect(ctx, W - pad - w, 26, w, 30, 8);
    ctx.fill();
    ctx.fillStyle = "#1a1206";
    ctx.fillText(t, W - pad - w + 12, 35);
  }

  // Resumen
  let y = 100;
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, y, W, 100);
  ctx.strokeStyle = "#eef2f7";
  ctx.beginPath();
  ctx.moveTo(0, y + 100);
  ctx.lineTo(W, y + 100);
  ctx.stroke();

  const cx = pad + 38, cy = y + 50, R = 30;
  const cumplColor = dp.cumplimiento >= 80 ? "#16a34a" : dp.cumplimiento >= 50 ? "#d97706" : "#dc2626";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = cumplColor;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * dp.cumplimiento) / 100);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = "#0f2744";
  ctx.font = "900 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${dp.cumplimiento}%`, cx, cy - 8);
  ctx.textAlign = "left";

  const sx = cx + R + 18;
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 11px Arial";
  ctx.fillText("CUMPLIMIENTO GLOBAL", sx, y + 20);
  ctx.fillStyle = "#64748b";
  ctx.font = "13px Arial";
  ctx.fillText(`Meta ${META_OBJETIVO}%`, sx, y + 40);
  ctx.fillStyle = cumplColor;
  ctx.font = "bold 13px Arial";
  ctx.fillText(`Brecha ${dp.cumplimiento - META_OBJETIVO} pts`, sx, y + 60);

  const col = (x, label, big, bigColor, sub) => {
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 18);
    ctx.lineTo(x - 18, y + 82);
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px Arial";
    ctx.fillText(label, x, y + 20);
    ctx.fillStyle = bigColor;
    ctx.font = "900 20px Arial";
    ctx.fillText(big, x, y + 40);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px Arial";
    ctx.fillText(sub, x, y + 66);
  };
  col(360, "POSICIÓN GENERAL", `${dp.posicion ?? "-"} / ${dp.total || "-"}`, "#0f2744", dp.percentil != null ? `Percentil ${dp.percentil}` : "");
  col(560, "ESTADO", `${dp.criticos} crítico`, dp.criticos ? "#dc2626" : "#16a34a", `${dp.advertencias} en advertencia`);
  col(740, "PENDIENTES", `${dp.pendientesTotal}`, "#d97706", "reportes sin ejecutar");

  y += 100;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px Arial";
  ctx.fillText("INDICADORES ORDENADOS POR SEVERIDAD", pad, y + 12);
  y += 34;

  inds.forEach((ind, ii) => {
    const d = derivarIndicador(ind);
    const acc = ind.estado === "critical" ? "#dc2626" : ind.estado === "warning" ? "#d97706" : "#16a34a";
    ctx.fillStyle = acc;
    ctx.fillRect(0, y, 4, indH[ii]);
    ctx.fillStyle = acc;
    ctx.font = "900 26px Arial";
    ctx.fillText(`${d.pct}%`, pad, y + 8);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 9px Arial";
    ctx.fillText("CUMPLE", pad, y + 38);

    const nx = pad + 78;
    ctx.fillStyle = "#0f2744";
    ctx.font = "900 16px Arial";
    ctx.fillText(String(ind.indicator_name).toUpperCase(), nx, y + 8);
    const nameW = ctx.measureText(String(ind.indicator_name).toUpperCase()).width;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Arial";
    ctx.fillText(`  ${ind.indicator_code} · ${ind.proceso}`, nx + nameW + 6, y + 11);
    if (ind.ranking) {
      ctx.textAlign = "right";
      ctx.fillStyle = "#0f2744";
      ctx.font = "900 18px Arial";
      ctx.fillText(`#${ind.ranking}`, W - pad, y + 6);
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Arial";
      ctx.fillText(`de ${ind.ranking_total}`, W - pad, y + 28);
      ctx.textAlign = "left";
    }
    const linea = d.evaluadas.length
      ? `${d.completos} de ${d.evaluadas.length} componentes al 100%${d.faltan.length ? ` · falta ${String(d.faltan[0].name).toLowerCase()}` : ""}${ind.invalid ? ` · ${ind.invalid} reporte invalidado` : ""}`
      : `Acumulado ${ind.accumulated} de meta ${ind.meta}${ind.invalid ? ` · ${ind.invalid} reporte invalidado` : ""}`;
    ctx.fillStyle = "#64748b";
    ctx.font = "12px Arial";
    ctx.fillText(linea, nx, y + 34);

    let ry = y + 54;
    const barX = nx + 92, barW = 400;
    filasDe(ind).forEach((c) => {
      const M = Number(c.meta) || 0, V = Number(c.value) || 0, filled = Math.min(V, M);
      ctx.fillStyle = "#334155";
      ctx.font = "bold 13px Arial";
      ctx.fillText(c.name, nx, ry + 1);
      if (M > 0 && M <= 24) {
        const gap = 3, seg = (barW - (M - 1) * gap) / M;
        for (let k = 0; k < M; k++) {
          ctx.fillStyle = k < filled ? "#16a34a" : "#e5e7eb";
          rrect(ctx, barX + k * (seg + gap), ry, seg, 14, 3);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "#e5e7eb";
        rrect(ctx, barX, ry, barW, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#16a34a";
        rrect(ctx, barX, ry, barW * (M > 0 ? Math.min(1, V / M) : 0), 14, 4);
        ctx.fill();
      }
      const excede = Math.max(0, V - M);
      let numX = barX + barW + 70;
      if (excede > 0) {
        ctx.font = "bold 11px Arial";
        const t = `+${excede} sobre meta`;
        const w = ctx.measureText(t).width + 16;
        ctx.fillStyle = "#dcfce7";
        rrect(ctx, barX + barW + 10, ry - 1, w, 17, 6);
        ctx.fill();
        ctx.fillStyle = "#166534";
        ctx.fillText(t, barX + barW + 18, ry + 1);
        numX = barX + barW + 20 + w + 40;
      }
      ctx.fillStyle = V >= M ? "#16a34a" : acc;
      ctx.font = "900 13px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`${V} / ${M}`, numX, ry + 1);
      ctx.textAlign = "left";
      ry += 26;
    });

    if (ind.invalid > 0) {
      ctx.fillStyle = "#6d28d9";
      ctx.font = "bold 13px Arial";
      ctx.fillText("Invalidados", nx, ry + 1);
      const segN = Math.min(ind.invalid, 24), gap = 3, seg = (barW - (segN - 1) * gap) / segN;
      for (let k = 0; k < segN; k++) {
        ctx.fillStyle = "#8b5cf6";
        rrect(ctx, barX + k * (seg + gap), ry, seg, 14, 3);
        ctx.fill();
      }
      ctx.fillStyle = "#7c3aed";
      ctx.font = "900 13px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`${ind.invalid}`, barX + barW + 70, ry + 1);
      ctx.textAlign = "left";
      ry += 26;
    }

    let bx = nx;
    const badge = (text, bg, fg) => {
      ctx.font = "bold 12px Arial";
      const w = ctx.measureText(text).width + 18;
      ctx.fillStyle = bg;
      rrect(ctx, bx, ry, w, 22, 7);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.fillText(text, bx + 9, ry + 5);
      bx += w + 8;
    };
    if (d.pendientes > 0) badge(`${d.pendientes} reporte(s) pendiente(s)`, "#fee2e2", "#b91c1c");
    if (d.evaluadas.length > 1 && d.completos > 0) badge(`${d.completos} ítems completos`, "#dcfce7", "#166534");
    if (ind.invalid > 0) badge("Revisar invalidación", "#ede9fe", "#6d28d9");

    y += indH[ii];
    ctx.strokeStyle = "#eef2f7";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px Arial";
  ctx.fillText("Reporte generado por INOVA · ETO Indicadores", pad, y + 16);
  ctx.textAlign = "right";
  ctx.fillText(`Generado ${new Date().toLocaleDateString("es-CO")} · Periodo ${String(month).padStart(2, "0")}/${year}`, W - pad, y + 16);
  ctx.textAlign = "left";

  return cv;
}

function derivarPersona(p) {
  const inds = p.indicadores || [];
  const dv = inds.map(derivarIndicador);
  const cumplimiento = dv.length ? Math.round(dv.reduce((s, d) => s + d.pct, 0) / dv.length) : 0;
  const ranks = inds.map((i) => i.ranking).filter(Boolean);
  const total = Math.max(0, ...inds.map((i) => i.ranking_total || 0));
  const posicion = ranks.length ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : null;
  const percentil = total > 0 && posicion ? Math.round(((total - posicion) / total) * 100) : null;
  const criticos = inds.filter((i) => i.estado === "critical").length;
  const advertencias = inds.filter((i) => i.estado === "warning").length;
  const pendientesTotal = dv.reduce((s, d) => s + d.pendientes, 0);
  return {
    cumplimiento,
    posicion,
    percentil,
    total,
    criticos,
    advertencias,
    pendientesTotal,
    requierePlan: criticos > 0,
  };
}

const css = `
@keyframes c360-fadeUp { from{opacity:0;transform:translateY(24px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes c360-pop { 0%{opacity:0;transform:scale(.6)} 70%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
@keyframes c360-drift1 { 50%{transform:translate(70px,60px) scale(1.12)} }
@keyframes c360-drift2 { 50%{transform:translate(-60px,-50px) scale(1.15)} }
@keyframes c360-drift3 { 50%{transform:translate(30px,-50px) scale(.92)} }
@keyframes c360-tw { 0%,100%{opacity:.15;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
@keyframes c360-pan { to{transform:translateX(-40px)} }
@keyframes c360-shoot { 0%{left:-15%;top:20px;opacity:0} 6%{opacity:1} 18%{left:70%;top:130px;opacity:0} 100%{opacity:0} }
@keyframes c360-spin { to{transform:rotate(360deg)} }
@keyframes c360-pulse { 0%{width:20px;height:20px;opacity:.9} 100%{width:260px;height:260px;opacity:0} }
@keyframes c360-blip { 0%,100%{opacity:0;transform:scale(.6)} 8%{opacity:1;transform:scale(1)} 45%{opacity:.15} }
@keyframes c360-bounce { 0%,100%{transform:translateY(0);opacity:.35} 50%{transform:translateY(-7px);opacity:1} }
@keyframes c360-scanline { 0%{top:0} 100%{top:100%} }
.c360-overlay{ position:fixed; inset:0; z-index:9999; background:rgba(2,18,14,.80); backdrop-filter:blur(6px); display:grid; place-items:center; animation:c360-fadeUp .3s ease both; }

.c360-card { animation: c360-fadeUp .55s cubic-bezier(.2,.8,.2,1) both; }
.c360-ind  { animation: c360-fadeUp .5s cubic-bezier(.2,.8,.2,1) both; }
.c360-chip { animation: c360-pop .45s cubic-bezier(.2,.9,.3,1.3) both; }

.c360-hero { position:relative; overflow:hidden; border-radius:22px;
  background:radial-gradient(140% 120% at 75% 30%, #0b5a3f 0%, #063829 35%, #041f18 70%, #02120e 100%);
  box-shadow:0 22px 55px rgba(2,18,14,.35); }
.c360-neb { position:absolute; border-radius:50%; filter:blur(90px); mix-blend-mode:screen; }
.c360-stars span{ position:absolute; background:#d1fae5; border-radius:50%; animation:c360-tw 3s ease-in-out infinite; }
.c360-starslayer{ position:absolute; inset:0; animation:c360-pan 60s linear infinite; }
.c360-shoot{ position:absolute; top:30px; width:120px; height:2px; border-radius:2px;
  background:linear-gradient(90deg,transparent,#6ee7b7,#fff); box-shadow:0 0 12px #6ee7b7; transform:rotate(18deg);
  animation:c360-shoot 8s ease-in infinite; }
.c360-radar{ position:absolute; right:70px; top:52%; transform:translateY(-50%); width:250px; height:250px; border-radius:50%;
  background:radial-gradient(circle,rgba(16,185,129,.14),transparent 70%); overflow:hidden;
  box-shadow:0 0 60px rgba(16,185,129,.25),inset 0 0 40px rgba(16,185,129,.15); }
.c360-ring{ position:absolute; border:1px solid rgba(110,231,183,.28); border-radius:50%; inset:0; margin:auto; }
.c360-cross{ position:absolute; left:50%; top:0; width:1px; height:100%; background:rgba(110,231,183,.18); }
.c360-cross2{ position:absolute; top:50%; left:0; height:1px; width:100%; background:rgba(110,231,183,.18); }
.c360-pulse{ position:absolute; inset:0; margin:auto; width:20px; height:20px; border:2px solid #34d399; border-radius:50%; animation:c360-pulse 3s ease-out infinite; opacity:0; }
.c360-sweep{ position:absolute; inset:0; border-radius:50%; background:conic-gradient(from 0deg,rgba(52,211,153,.6),rgba(52,211,153,0) 60deg,transparent); animation:c360-spin 3s linear infinite; }
.c360-blip{ position:absolute; width:8px; height:8px; border-radius:50%; background:#6ee7b7; box-shadow:0 0 12px #34d399; animation:c360-blip 3s linear infinite; opacity:0; }
@keyframes c360-flow { to { stroke-dashoffset:-620; } }
.c360-flow{ fill:none; stroke-width:2.6; stroke-linecap:round; stroke-dasharray:80 540; animation:c360-flow 3.8s linear infinite; }
@keyframes c360-halo { 0%{transform:scale(1);opacity:.7} 70%{opacity:0} 100%{transform:scale(2.4);opacity:0} }
.c360-lupa{ position:relative; display:grid; place-items:center; width:34px; height:34px; border-radius:50%;
  background:rgba(52,211,153,.15); box-shadow:0 0 16px rgba(52,211,153,.5); }
.c360-lupa::before, .c360-lupa::after{ content:""; position:absolute; border-radius:50%; border:2px solid #34d399; }
.c360-lupa::before{ inset:-4px; animation:c360-halo 2.4s ease-out infinite; }
.c360-lupa::after{ inset:-4px; animation:c360-halo 2.4s ease-out infinite 1.2s; }
.c360-grain{ position:absolute; inset:0; opacity:.07; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }
.c360-vig{ position:absolute; inset:0; box-shadow:inset 0 0 180px 50px rgba(0,0,0,.5); }
@media (max-width:820px){ .c360-radar{ display:none } }
`;

export default function ConsultaPersonaView() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState(ahora.getFullYear());
  const [month, setMonth] = useState(ahora.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState(true);
  const [copyMsg, setCopyMsg] = useState("");

  const stars = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        size: Math.random() < 0.8 ? 1.4 : 2.4,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
        opacity: 0.2 + Math.random() * 0.7,
      })),
    []
  );

  const buscar = async () => {
    const query = q.trim();
    if (!query) {
      setError("Escribe la cédula o el nombre de la persona.");
      return;
    }
    setLoading(true);
    setError("");
    setExpandido(false);
    try {
      const res = await API.consultaPersona({ q: query, year, month });
      setPersonas(res?.personas || []);
      setBuscado(true);
    } catch (e) {
      setError(e?.message || "Error consultando.");
      setPersonas([]);
    } finally {
      setLoading(false);
    }
  };

  const flashCopy = (t) => {
    setCopyMsg(t);
    window.clearTimeout(flashCopy._t);
    flashCopy._t = window.setTimeout(() => setCopyMsg(""), 2600);
  };

  // Genera la imagen del reporte como Blob (dibujada a mano, nítida).
  const generarBlobReporte = (p) =>
    new Promise((res) =>
      buildReporteCanvas(p, month, year).toBlob((b) => res(b), "image/png")
    );

  // Copia la captura del reporte al portapapeles. Se pasa una PROMESA<Blob>
  // al ClipboardItem y se llama write DENTRO del clic (conserva el gesto),
  // que es la forma que funciona con imágenes generadas async en Chrome.
  const copiarReporte = (p) => {
    setCopyMsg("Copiando…");
    try {
      const item = new window.ClipboardItem({
        "image/png": generarBlobReporte(p),
      });
      navigator.clipboard
        .write([item])
        .then(() => flashCopy("✓ Reporte copiado · pégalo con Ctrl+V"))
        .catch(async () => {
          try {
            const blob = await generarBlobReporte(p);
            await navigator.clipboard.write([
              new window.ClipboardItem({ "image/png": blob }),
            ]);
            flashCopy("✓ Reporte copiado · pégalo con Ctrl+V");
          } catch {
            flashCopy("No se pudo copiar. Haz clic en Copiar de nuevo.");
          }
        });
    } catch {
      generarBlobReporte(p)
        .then(async (blob) => {
          await navigator.clipboard.write([
            new window.ClipboardItem({ "image/png": blob }),
          ]);
          flashCopy("✓ Reporte copiado · pégalo con Ctrl+V");
        })
        .catch(() => flashCopy("No se pudo copiar. Intenta de nuevo."));
    }
  };

  return (
    <section
      style={{
        padding: 16,
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: expandido ? "100%" : "auto",
        boxSizing: "border-box",
      }}
    >
      <style>{css}</style>

      {copyMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            background: "#0f2744",
            color: "#d1fae5",
            padding: "10px 18px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 13,
            boxShadow: "0 12px 30px rgba(15,23,42,.35)",
          }}
        >
          {copyMsg}
        </div>
      )}

      {loading && (
        <div className="c360-overlay">
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                width: 170,
                height: 170,
                margin: "0 auto 22px",
                borderRadius: "50%",
                overflow: "hidden",
                background: "radial-gradient(circle,rgba(16,185,129,.16),transparent 70%)",
                boxShadow: "0 0 70px rgba(16,185,129,.4),inset 0 0 44px rgba(16,185,129,.22)",
              }}
            >
              <div className="c360-ring" style={{ width: 54, height: 54 }} />
              <div className="c360-ring" style={{ width: 108, height: 108 }} />
              <div className="c360-ring" style={{ width: 162, height: 162 }} />
              <div className="c360-sweep" />
              <div className="c360-pulse" />
              <div className="c360-pulse" style={{ animationDelay: "1.5s" }} />
            </div>
            <div style={{ color: "#ecfdf5", fontWeight: 950, fontSize: 22, textShadow: "0 0 18px rgba(16,185,129,.5)" }}>
              Escaneando indicadores…
            </div>
            <div style={{ color: "#a7f3d0", marginTop: 8, fontSize: 14 }}>
              Cargando tu información, espera un momento
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 7, justifyContent: "center" }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#34d399",
                    boxShadow: "0 0 10px #34d399",
                    animation: "c360-bounce 1s ease-in-out infinite",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HERO galáctico + radar */}
      <div
        className="c360-hero"
        style={{
          padding: expandido ? "48px 34px" : "28px 34px",
          minHeight: expandido ? 420 : 0,
          flexGrow: expandido ? 1 : 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          transition:
            "min-height .75s cubic-bezier(.2,.85,.2,1), padding .75s cubic-bezier(.2,.85,.2,1)",
        }}
      >
        <div className="c360-neb" style={{ width: 600, height: 520, top: -160, left: -120, background: "radial-gradient(circle,#16a34a,transparent 65%)", opacity: 0.55, animation: "c360-drift1 34s ease-in-out infinite" }} />
        <div className="c360-neb" style={{ width: 560, height: 520, bottom: -200, right: -140, background: "radial-gradient(circle,#0d9488,transparent 65%)", opacity: 0.45, animation: "c360-drift2 42s ease-in-out infinite" }} />
        <div className="c360-neb" style={{ width: 360, height: 340, top: 120, left: "38%", background: "radial-gradient(circle,#4ade80,transparent 62%)", opacity: 0.3, animation: "c360-drift3 30s ease-in-out infinite" }} />

        <div className="c360-starslayer">
          <div className="c360-stars">
            {stars.map((s, i) => (
              <span key={i} style={{ width: s.size, height: s.size, left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s`, opacity: s.opacity }} />
            ))}
          </div>
        </div>

        <div className="c360-shoot" style={{ left: "-10%" }} />

        {/* Línea de energía: sale del buscador (izq) y llega al radar (der) */}
        {expandido && (
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }}
            viewBox="0 0 1600 600"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="c360glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="c360ga" x1="0" x2="1">
                <stop offset="0" stopColor="#10b981" stopOpacity="0" />
                <stop offset="0.5" stopColor="#34d399" />
                <stop offset="1" stopColor="#a7f3d0" />
              </linearGradient>
            </defs>
            <path className="c360-flow" style={{ stroke: "url(#c360ga)", filter: "url(#c360glow)" }} d="M250,430 C650,330 950,470 1350,300" />
            <path className="c360-flow" style={{ stroke: "url(#c360ga)", filter: "url(#c360glow)", animationDuration: "5.2s", opacity: 0.6 }} d="M250,470 C680,380 980,520 1350,300" />
          </svg>
        )}

        <div
          className="c360-radar"
          style={{
            transform: expandido ? "translateY(-50%) scale(1.55)" : "translateY(-50%) scale(1)",
            right: expandido ? 120 : 70,
            transition: "transform .75s cubic-bezier(.2,.85,.2,1), right .75s ease",
          }}
        >
          <div className="c360-ring" style={{ width: 64, height: 64 }} />
          <div className="c360-ring" style={{ width: 140, height: 140 }} />
          <div className="c360-ring" style={{ width: 216, height: 216 }} />
          <div className="c360-cross" />
          <div className="c360-cross2" />
          <div className="c360-pulse" />
          <div className="c360-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="c360-sweep" />
          <div className="c360-blip" style={{ top: 64, left: 160, animationDelay: ".5s" }} />
          <div className="c360-blip" style={{ top: 160, left: 66, animationDelay: "1.5s" }} />
          <div className="c360-blip" style={{ top: 184, left: 180, animationDelay: "2.3s" }} />
        </div>

        <div className="c360-grain" />
        <div className="c360-vig" />

        <div style={{ position: "relative", zIndex: 9, maxWidth: 640 }}>
          <div style={{ color: "#6ee7b7", fontWeight: 900, letterSpacing: ".15em", fontSize: 11, textShadow: "0 0 12px rgba(110,231,183,.5)" }}>
            CONSULTA 360
          </div>
          <h2 style={{ margin: "6px 0 12px", color: "#ecfdf5", fontSize: expandido ? 48 : 31, fontWeight: 950, textShadow: "0 2px 30px rgba(0,0,0,.6)", transition: "font-size .6s ease" }}>
            ¿Cómo va una persona?
          </h2>
          <p style={{ margin: "0 0 16px", color: "#a7f3d0", fontSize: 13, opacity: 0.88 }}>
            Escribe la cédula o el nombre y escaneamos todos sus indicadores.
          </p>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 300px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(110,231,183,.4)", borderRadius: 14, padding: "10px 15px", backdropFilter: "blur(10px)", boxShadow: "0 0 0 1px rgba(52,211,153,.15), 0 0 30px rgba(16,185,129,.25)" }}>
              <span className="c360-lupa">
                <Search size={18} color="#6ee7b7" />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
                placeholder="Cédula o nombre de la persona…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "#ecfdf5" }}
              />
            </div>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} title="Año" style={{ width: 90, padding: "11px", borderRadius: 10, border: "1px solid rgba(110,231,183,.3)", background: "rgba(255,255,255,.08)", color: "#ecfdf5", fontSize: 14 }} />
            <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value))} title="Mes" style={{ width: 70, padding: "11px", borderRadius: 10, border: "1px solid rgba(110,231,183,.3)", background: "rgba(255,255,255,.08)", color: "#ecfdf5", fontSize: 14 }} />
            <button
              type="button"
              onClick={buscar}
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#047857)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontWeight: 800, cursor: "pointer", fontSize: 15, boxShadow: "0 8px 22px rgba(4,120,87,.55)" }}
            >
              <Search size={18} />
              {loading ? "Escaneando…" : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {error && <div style={{ marginTop: 14, color: "#b45309", fontWeight: 700 }}>{error}</div>}

      {buscado && !loading && personas.length === 0 && !error && (
        <div style={{ marginTop: 20, color: "#64748b" }}>No se encontró ninguna persona con “{q}”.</div>
      )}

      {personas.map((p, pi) => {
        const dp = derivarPersona(p);
        const mesNombre = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][month] || month;
        const indsSort = [...p.indicadores].sort(
          (a, b) => (SEV[a.estado] ?? 3) - (SEV[b.estado] ?? 3)
        );
        const R = 32, CIRC = 2 * Math.PI * R;
        const cumplColor = dp.cumplimiento >= 80 ? "#16a34a" : dp.cumplimiento >= 50 ? "#d97706" : "#dc2626";
        return (
          <div
            key={p.entity_id}
            id={`c360-rep-${p.entity_id}`}
            className="c360-card"
            style={{ marginTop: 18, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", color: "#334155", boxShadow: "0 14px 34px rgba(15,23,42,.07)", animationDelay: `${pi * 0.08}s` }}
          >
            {/* Encabezado */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 22px", background: "linear-gradient(120deg,#0c2b20,#0e3a2a 70%)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, letterSpacing: ".14em", color: "#7fb79b", fontWeight: 800 }}>
                  EVALUACIÓN INDIVIDUAL · {String(mesNombre).toUpperCase()} {year}
                </div>
                <div style={{ fontSize: 26, fontWeight: 950, color: "#f0fdf4", marginTop: 2 }}>
                  {String(p.name || "").toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: "#9fc4b3", marginTop: 3 }}>
                  C.C. {p.code} · {p.entity_type || "Persona"} · {p.indicadores.length} indicadores evaluados
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {dp.requierePlan && (
                  <span style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)", color: "#1a1206", fontWeight: 900, fontSize: 12, letterSpacing: ".04em", borderRadius: 8, padding: "8px 14px" }}>
                    REQUIERE PLAN DE ACCIÓN
                  </span>
                )}
                <button
                  type="button"
                  data-html2canvas-ignore="true"
                  onClick={() => copiarReporte(p)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.1)", color: "#d1fae5", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "8px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                >
                  <Copy size={15} /> Copiar
                </button>
              </div>
            </div>

            {/* Resumen */}
            <div style={{ display: "flex", gap: 0, flexWrap: "wrap", padding: "16px 22px", borderBottom: "1px solid #eef2f7", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 26 }}>
                <div style={{ position: "relative", width: 76, height: 76 }}>
                  <svg width="76" height="76">
                    <circle cx="38" cy="38" r={R} stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle cx="38" cy="38" r={R} stroke={cumplColor} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - dp.cumplimiento / 100)} transform="rotate(-90 38 38)" style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 18, color: "#0f2744" }}>{dp.cumplimiento}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: ".08em", color: "#64748b", fontWeight: 800 }}>CUMPLIMIENTO GLOBAL</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Meta {META_OBJETIVO}%</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: cumplColor }}>Brecha {dp.cumplimiento - META_OBJETIVO} pts</div>
                </div>
              </div>

              <div style={{ borderLeft: "1px solid #e2e8f0", padding: "0 26px" }}>
                <div style={{ fontSize: 11, letterSpacing: ".08em", color: "#64748b", fontWeight: 800 }}>POSICIÓN GENERAL</div>
                <div style={{ fontSize: 22, fontWeight: 950, color: "#0f2744" }}>{dp.posicion ?? "-"} <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>/ {dp.total || "-"}</span></div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{dp.percentil != null ? `Percentil ${dp.percentil}` : ""}</div>
              </div>

              <div style={{ borderLeft: "1px solid #e2e8f0", padding: "0 26px" }}>
                <div style={{ fontSize: 11, letterSpacing: ".08em", color: "#64748b", fontWeight: 800 }}>ESTADO</div>
                <div style={{ fontSize: 22, fontWeight: 950, color: dp.criticos ? "#dc2626" : "#16a34a" }}>{dp.criticos} <span style={{ fontSize: 13, fontWeight: 700 }}>crítico</span></div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{dp.advertencias} en advertencia</div>
              </div>

              <div style={{ borderLeft: "1px solid #e2e8f0", padding: "0 26px" }}>
                <div style={{ fontSize: 11, letterSpacing: ".08em", color: "#64748b", fontWeight: 800 }}>PENDIENTES</div>
                <div style={{ fontSize: 22, fontWeight: 950, color: "#d97706" }}>{dp.pendientesTotal}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>reportes sin ejecutar</div>
              </div>
            </div>

            <div style={{ padding: "12px 22px 4px", fontSize: 11, letterSpacing: ".1em", color: "#94a3b8", fontWeight: 800 }}>
              INDICADORES ORDENADOS POR SEVERIDAD
            </div>

            {indsSort.length === 0 ? (
              <div style={{ padding: "8px 22px 18px", color: "#94a3b8" }}>No está asociada a ningún indicador.</div>
            ) : (
              indsSort.map((ind, ii) => {
                const d = derivarIndicador(ind);
                const acc = ind.estado === "critical" ? "#dc2626" : ind.estado === "warning" ? "#d97706" : "#16a34a";
                const evaluadas = d.evaluadas;
                const linea = evaluadas.length
                  ? `${d.completos} de ${evaluadas.length} componentes al 100%${d.faltan.length ? ` · falta ${String(d.faltan[0].name).toLowerCase()}` : ""}${ind.invalid ? ` · ${ind.invalid} reporte invalidado` : ""}`
                  : `Acumulado ${ind.accumulated} de meta ${ind.meta}${ind.invalid ? ` · ${ind.invalid} reporte invalidado` : ""}`;
                const filas = evaluadas.length
                  ? evaluadas
                  : ind.meta > 0
                  ? [{ name: "Reportes", value: ind.accumulated, meta: ind.meta, estado: ind.estado }]
                  : [];
                return (
                  <div key={ind.indicator_id} className="c360-ind" style={{ borderLeft: `4px solid ${acc}`, padding: "14px 22px", borderBottom: ii < indsSort.length - 1 ? "1px solid #eef2f7" : "none", animationDelay: `${0.08 + ii * 0.08}s` }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div style={{ width: 76, flex: "0 0 auto" }}>
                        <div style={{ fontSize: 28, fontWeight: 950, color: acc, lineHeight: 1 }}>{d.pct}%</div>
                        <div style={{ fontSize: 9, letterSpacing: ".1em", color: "#94a3b8", fontWeight: 800 }}>CUMPLE</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: "#0f2744" }}>{ind.indicator_name}</span>
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>{ind.indicator_code} · {ind.proceso}</span>
                          {ind.ranking && (
                            <span style={{ marginLeft: "auto", textAlign: "right", color: "#64748b" }}>
                              <span style={{ fontSize: 18, fontWeight: 950, color: "#0f2744" }}>#{ind.ranking}</span>
                              <span style={{ fontSize: 11, display: "block", marginTop: -2 }}>de {ind.ranking_total}</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", margin: "3px 0 10px" }}>{linea}</div>

                        {filas.map((c) => {
                          const M = Number(c.meta) || 0, V = Number(c.value) || 0;
                          const filled = Math.min(V, M);
                          const numCol = V >= M ? "#16a34a" : ind.estado === "critical" ? "#dc2626" : "#d97706";
                          const excede = Math.max(0, V - M);
                          return (
                            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                              <span style={{ width: 84, flex: "0 0 auto", fontSize: 13, color: "#334155", fontWeight: 700 }}>{c.name}</span>
                              <div style={{ display: "flex", gap: 3, flex: 1, maxWidth: 520 }}>
                                {M > 0 && M <= 24 ? (
                                  Array.from({ length: M }).map((_, k) => (
                                    <div key={k} style={{ flex: 1, minWidth: 5, height: 14, borderRadius: 3, background: k < filled ? "#16a34a" : "#e5e7eb" }} />
                                  ))
                                ) : (
                                  <div style={{ flex: 1, height: 14, borderRadius: 4, background: "#e5e7eb", overflow: "hidden" }}>
                                    <div style={{ width: `${M > 0 ? Math.min(100, (V / M) * 100) : 0}%`, height: "100%", background: "#16a34a" }} />
                                  </div>
                                )}
                              </div>
                              {excede > 0 && (
                                <span style={{ fontSize: 11, color: "#166534", background: "#dcfce7", borderRadius: 6, padding: "2px 7px", fontWeight: 900 }}>+{excede} sobre meta</span>
                              )}
                              <span style={{ width: 52, textAlign: "right", fontSize: 13, fontWeight: 900, color: numCol }}>{V} / {M}</span>
                            </div>
                          );
                        })}

                        {ind.invalid > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                            <span style={{ width: 84, flex: "0 0 auto", fontSize: 13, color: "#6d28d9", fontWeight: 700 }}>Invalidados</span>
                            <div style={{ display: "flex", gap: 3, flex: 1, maxWidth: 520 }}>
                              {Array.from({ length: Math.min(ind.invalid, 24) }).map((_, k) => (
                                <div key={k} style={{ flex: 1, minWidth: 5, height: 14, borderRadius: 3, background: "#8b5cf6" }} />
                              ))}
                            </div>
                            <span style={{ width: 52, textAlign: "right", fontSize: 13, fontWeight: 900, color: "#7c3aed" }}>{ind.invalid}</span>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          {d.pendientes > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c", background: "#fee2e2", borderRadius: 7, padding: "4px 10px" }}>{d.pendientes} reporte(s) pendiente(s)</span>
                          )}
                          {evaluadas.length > 1 && d.completos > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#166534", background: "#dcfce7", borderRadius: 7, padding: "4px 10px" }}>{d.completos} ítems completos</span>
                          )}
                          {ind.invalid > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#6d28d9", background: "#ede9fe", borderRadius: 7, padding: "4px 10px" }}>Revisar invalidación</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ padding: "12px 22px", borderTop: "1px solid #eef2f7", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#94a3b8" }}>
              <span>Reporte generado por INOVA · ETO Indicadores</span>
              <span>Generado {new Date().toLocaleDateString("es-CO")} · Periodo {String(month).padStart(2, "0")}/{year}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
