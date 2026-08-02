import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Upload,
  Search,
  Download,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { generarAnalisisInventario } from "../../api";

const colors = {
  navy: "#0f2744",
  blue: "#1f4e9c",
  red: "#c0201a",
  green: "#1f7a3d",
  text: "#1f2d3d",
  muted: "#6b7a90",
  border: "#d9e2ec",
  soft: "#f8fafc",
};

const nf2 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const fmt = (v) => nf2.format(Number(v || 0));
const fmtInt = (v) => (v || v === 0 ? nf0.format(Number(v || 0)) : "");

// DIFERENCIA = (FISICO - TEORICO) - P.INGRESO + P.DESCARGAR - DEVOLUCION
function calcDiferencia(r) {
  return (
    (Number(r.fisico || 0) - Number(r.teorico || 0)) -
    Number(r.p_ingreso || 0) +
    Number(r.p_descargar || 0) -
    Number(r.devolucion || 0)
  );
}

const th = {
  padding: "8px 8px",
  fontSize: 10.5,
  fontWeight: 800,
  color: "#e8eefb",
  background: "#0f2744",
  borderRight: "1px solid #24405f",
  whiteSpace: "nowrap",
  textAlign: "right",
};
const thL = { ...th, textAlign: "left" };
const td = {
  padding: "5px 8px",
  fontSize: 11.5,
  borderBottom: "1px solid #eef2f7",
  borderRight: "1px solid #f1f5f9",
  textAlign: "right",
  color: "#24384d",
  whiteSpace: "nowrap",
};
const tdL = { ...td, textAlign: "left" };
const editInput = {
  width: 96,
  height: 26,
  textAlign: "right",
  border: "1px solid #d9e2ec",
  borderRadius: 6,
  padding: "0 6px",
  fontSize: 11.5,
  outline: "none",
};

// Input numérico que muestra puntos de mil mientras se escribe.
function NumInput({ value, onChange }) {
  const display = value || value === 0 ? nf0.format(Number(value || 0)) : "";
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value ? display : ""}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        onChange(digits ? parseInt(digits, 10) : 0);
      }}
      style={editInput}
    />
  );
}

export default function AnalisisInventario() {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const [fFamilia, setFFamilia] = useState("TODAS");
  const [fMaterial, setFMaterial] = useState("");
  const [fTexto, setFTexto] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await generarAnalisisInventario(file);
      setRows(data.map((r) => ({ ...r, p_ingreso: 0, p_descargar: 0, devolucion: 0 })));
      setFileName(file.name);
    } catch (err) {
      setError(err?.message || "No se pudo procesar el archivo.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const setVal = (idx, key, num) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: Number.isFinite(num) ? num : 0 } : r)));
  };

  const familias = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.familia || "").trim()).filter(Boolean));
    return ["TODAS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const mat = fMaterial.trim().toLowerCase();
    const txt = fTexto.trim().toLowerCase();
    return rows.filter((r) => {
      if (fFamilia !== "TODAS" && String(r.familia || "") !== fFamilia) return false;
      if (mat && !String(r.material || "").toLowerCase().includes(mat)) return false;
      if (txt && !String(r.texto || "").toLowerCase().includes(txt)) return false;
      return true;
    });
  }, [rows, fFamilia, fMaterial, fTexto]);

  const totales = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.teorico += Number(r.teorico || 0);
        acc.fisico += Number(r.fisico || 0);
        acc.p_ingreso += Number(r.p_ingreso || 0);
        acc.p_descargar += Number(r.p_descargar || 0);
        acc.devolucion += Number(r.devolucion || 0);
        acc.diferencia += calcDiferencia(r);
        return acc;
      },
      { teorico: 0, fisico: 0, p_ingreso: 0, p_descargar: 0, devolucion: 0, diferencia: 0 }
    );
  }, [filtered]);

  const exportar = async () => {
    const XLSX = await import("xlsx");
    const aoa = [
      ["FAMILIA", "MATERIAL", "TEXTO BREVE DEL MATERIAL", "TEORICO", "P. INGRESO", "P. DESCARGAR", "DEVOLUCION", "FISICO", "DIFERENCIA"],
      ...filtered.map((r) => [
        r.familia,
        r.material,
        r.texto,
        Number(r.teorico || 0),
        Number(r.p_ingreso || 0),
        Number(r.p_descargar || 0),
        Number(r.devolucion || 0),
        Number(r.fisico || 0),
        calcDiferencia(r),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analisis");
    const hoy = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `analisis_inventario_${hoy}.xlsx`);
  };

  // Color condicional: 0 => normal, negativo => rojo, sobrante => azul.
  const difStyle = (v) => {
    if (v < 0) return { background: colors.red, color: "#fff" };
    if (v > 0) return { background: colors.blue, color: "#fff" };
    return { background: "transparent", color: "#334155" };
  };

  const generarInforme = () => {
    const base = filtered.map((r) => ({ ...r, diferencia: calcDiferencia(r) }));
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) {
      setError("El navegador bloqueó la ventana del informe. Permite ventanas emergentes.");
      return;
    }
    win.document.write(buildInformeHtml({ base, fileName }));
    win.document.close();
  };

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, color: colors.text }}>
      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${colors.border}`,
            background: "linear-gradient(to bottom,#fbfcfd,#f5f8fb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "#eef2fb", border: "1px solid #d6e1ec" }}>
              <BarChart3 size={20} color="#1f4e9c" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "#7a8797", textTransform: "uppercase" }}>Inventarios</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#17324d" }}>Análisis (SAP vs físico)</div>
              <div style={{ fontSize: 13, color: "#5b6b7c" }}>
                Sube las existencias de SAP (LX02). El teórico sale del archivo y el físico de tu inventario real del WMS.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              style={btnPrimary(loading)}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              {loading ? "Procesando…" : "Subir existencias SAP"}
            </button>
            {rows.length > 0 && (
              <>
                <button onClick={generarInforme} style={btnDark}>
                  <FileText size={15} /> Generar informe
                </button>
                <button onClick={exportar} style={btnGhost}>
                  <Download size={15} /> Exportar Excel
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{ display: "none" }} />
          </div>
        </div>

        <div style={{ padding: 14 }}>
          {error && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, fontWeight: 700, fontSize: 13, border: "1px solid #f3c7c7", background: "#fdf0f0", color: "#b42318", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {rows.length === 0 && !loading && !error && (
            <div style={{ color: colors.muted, fontSize: 13, padding: "20px 4px" }}>
              Aún no has cargado el archivo. Al subir el LX02 de SAP se genera el análisis: TEÓRICO (SAP) vs FÍSICO
              (WMS), con columnas editables P. Ingreso, P. Descargar y Devolución, y la Diferencia calculada.
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) minmax(160px,1fr) minmax(220px,1.4fr) auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
                <div>
                  <div style={lbl}>Familia</div>
                  <select value={fFamilia} onChange={(e) => setFFamilia(e.target.value)} style={selectStyle}>
                    {familias.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={lbl}>Material</div>
                  <div style={searchBox}>
                    <Search size={14} color={colors.muted} />
                    <input value={fMaterial} onChange={(e) => setFMaterial(e.target.value)} placeholder="Código…" style={searchInput} />
                  </div>
                </div>
                <div>
                  <div style={lbl}>Texto</div>
                  <div style={searchBox}>
                    <Search size={14} color={colors.muted} />
                    <input value={fTexto} onChange={(e) => setFTexto(e.target.value)} placeholder="Descripción…" style={searchInput} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700, paddingBottom: 8, textAlign: "right" }}>
                  {fileName}<br />{filtered.length} de {rows.length} materiales
                </div>
              </div>

              <div style={{ overflowX: "auto", border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                <table style={{ width: "100%", minWidth: 1050, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thL}>FAMILIA</th>
                      <th style={thL}>MATERIAL</th>
                      <th style={thL}>TEXTO BREVE DEL MATERIAL</th>
                      <th style={th}>TEORICO</th>
                      <th style={th}>P. INGRESO</th>
                      <th style={th}>P. DESCARGAR</th>
                      <th style={th}>DEVOLUCION</th>
                      <th style={th}>FISICO</th>
                      <th style={{ ...th, borderRight: "none" }}>DIFERENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => {
                      const realIdx = rows.indexOf(r);
                      const dif = calcDiferencia(r);
                      return (
                        <tr key={`${r.material}-${idx}`} style={{ background: idx % 2 ? "#fbfcfe" : "#fff" }}>
                          <td style={{ ...tdL, fontWeight: 700, color: colors.navy }}>{r.familia}</td>
                          <td style={{ ...tdL, fontWeight: 700 }}>{r.material}</td>
                          <td style={tdL}>{r.texto}</td>
                          <td style={td}>{fmt(r.teorico)}</td>
                          <td style={td}><NumInput value={r.p_ingreso} onChange={(v) => setVal(realIdx, "p_ingreso", v)} /></td>
                          <td style={td}><NumInput value={r.p_descargar} onChange={(v) => setVal(realIdx, "p_descargar", v)} /></td>
                          <td style={td}><NumInput value={r.devolucion} onChange={(v) => setVal(realIdx, "devolucion", v)} /></td>
                          <td style={{ ...td, fontWeight: 700 }}>{fmt(r.fisico)}</td>
                          <td style={{ ...td, borderRight: "none" }}>
                            <span
                              style={{
                                display: "inline-block",
                                minWidth: 84,
                                textAlign: "right",
                                padding: "3px 9px",
                                borderRadius: 6,
                                fontWeight: 800,
                                background: dif < 0 ? colors.red : dif > 0 ? colors.blue : "transparent",
                                color: dif === 0 ? "#334155" : "#fff",
                              }}
                            >
                              {fmt(dif)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#eef2f7", fontWeight: 800 }}>
                      <td style={tdL} colSpan={3}>TOTALES ({filtered.length})</td>
                      <td style={td}>{fmt(totales.teorico)}</td>
                      <td style={td}>{fmtInt(totales.p_ingreso)}</td>
                      <td style={td}>{fmtInt(totales.p_descargar)}</td>
                      <td style={td}>{fmtInt(totales.devolucion)}</td>
                      <td style={td}>{fmt(totales.fisico)}</td>
                      <td style={{ ...td, borderRight: "none", color: totales.diferencia < 0 ? colors.red : totales.diferencia > 0 ? colors.blue : "#334155" }}>{fmt(totales.diferencia)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ marginTop: 10, fontSize: 11.5, color: colors.muted }}>
                Fórmula de la diferencia: (FÍSICO − TEÓRICO) − P. Ingreso + P. Descargar − Devolución. Rojo = faltante, azul = sobrante, sin color = cuadrado.
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}

const lbl = { fontSize: 11, fontWeight: 800, color: "#7a8797", letterSpacing: ".04em", marginBottom: 6, textTransform: "uppercase" };
const selectStyle = { width: "100%", height: 38, padding: "0 10px", borderRadius: 8, border: "1px solid #d9e2ec", background: "#fff", color: "#1f2d3d", fontSize: 13, fontWeight: 600, boxSizing: "border-box" };
const searchBox = { display: "flex", alignItems: "center", gap: 8, border: "1px solid #d9e2ec", borderRadius: 8, background: "#fff", height: 38, padding: "0 10px" };
const searchInput = { border: "none", outline: "none", width: "100%", fontSize: 13, background: "transparent" };
const btnGhost = { height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #d9e2ec", background: "#fff", color: "#1f2d3d", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const btnDark = { height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #0f2744", background: "#0f2744", color: "#fff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
function btnPrimary(loading) {
  return { height: 40, padding: "0 16px", borderRadius: 8, border: "1px solid #0b57d0", background: loading ? "#9dc0f0" : "#0b57d0", color: "#fff", fontWeight: 800, cursor: loading ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
}

// ---------- Informe corporativo por FAMILIA (con logo INOVA) ----------
function buildInformeHtml({ base, fileName }) {
  const logo = `${window.location.origin}/INOVA2026.png`;
  const nf = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v) => nf.format(Number(v || 0));
  const hoy = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });

  const rows = Array.isArray(base) ? base : [];
  const gFalt = rows.filter((r) => r.diferencia < 0).length;
  const gSob = rows.filter((r) => r.diferencia > 0).length;
  const gCuad = rows.filter((r) => r.diferencia === 0).length;

  // Agrupar por familia.
  const byFam = new Map();
  rows.forEach((r) => {
    const f = String(r.familia || "(sin familia)");
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(r);
  });
  const familias = [...byFam.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Sub-tabla de una categoría dentro de una familia.
  const subTabla = (titulo, list, color) => {
    if (!list.length) {
      return `<div class="cat"><div class="cat-h" style="background:${color}"><span class="dot"></span>${titulo} <b>0</b></div><div class="empty">Sin registros.</div></div>`;
    }
    const sub = list.reduce((a, r) => a + Number(r.diferencia || 0), 0);
    return `
      <div class="cat">
        <div class="cat-h" style="background:${color}"><span class="dot"></span>${titulo} <b>${list.length}</b>
          <span class="cat-total">${money(sub)}</span>
        </div>
        <table class="t">
          <thead><tr><th>Material</th><th>Descripción</th><th class="r">Teórico</th><th class="r">Físico</th><th class="r">Diferencia</th></tr></thead>
          <tbody>
            ${list
              .map(
                (r) => `<tr>
                  <td class="mono">${r.material}</td>
                  <td>${String(r.texto || "")}</td>
                  <td class="r">${money(r.teorico)}</td>
                  <td class="r">${money(r.fisico)}</td>
                  <td class="r b" style="color:${color}">${money(r.diferencia)}</td>
                </tr>`
              )
              .join("")}
            <tr class="sub"><td colspan="4" class="r">Subtotal</td><td class="r" style="color:${color}">${money(sub)}</td></tr>
          </tbody>
        </table>
      </div>`;
  };

  const bloquesFamilia = familias
    .map(([fam, items]) => {
      const falt = items.filter((r) => r.diferencia < 0);
      const sob = items.filter((r) => r.diferencia > 0);
      const cuad = items.filter((r) => r.diferencia === 0);
      return `
        <div class="fam-block">
          <div class="fam-title">
            <span>${fam}</span>
            <span class="fam-sub">${items.length} material(es)</span>
            <span class="fam-kpis">
              <em style="color:#c0201a">Faltantes ${falt.length}</em>
              <em style="color:#1f4e9c">Sobrantes ${sob.length}</em>
              <em style="color:#1f7a3d">Cuadrados ${cuad.length}</em>
            </span>
          </div>
          ${subTabla("Faltantes", falt, "#c0201a")}
          ${subTabla("Sobrantes", sob, "#1f4e9c")}
          ${subTabla("Cuadrados", cuad, "#1f7a3d")}
        </div>`;
    })
    .join("");

  const kpi = (label, value, color) =>
    `<div class="kpi"><div class="kpi-l">${label}</div><div class="kpi-v" style="color:${color}">${value}</div></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Informe de análisis de inventario</title>
  <style>
    @page { size: Letter; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#17324d; margin:0; }
    .cover { display:flex; align-items:center; gap:16px; background:linear-gradient(120deg,#0b2c5e,#123f83); color:#fff; padding:20px 22px; border-radius:12px; }
    .cover img { height:44px; background:#fff; padding:6px 10px; border-radius:8px; }
    .cover h1 { margin:0; font-size:22px; letter-spacing:.02em; }
    .cover p { margin:2px 0 0; font-size:12px; color:#cfe0ff; }
    .meta { display:flex; gap:10px; flex-wrap:wrap; margin:14px 0; }
    .kpi { flex:1; min-width:150px; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; background:#f8fafc; }
    .kpi-l { font-size:10px; font-weight:800; letter-spacing:.06em; color:#64748b; text-transform:uppercase; }
    .kpi-v { font-size:20px; font-weight:900; margin-top:3px; }
    .fam-block { margin:18px 0; page-break-inside:auto; }
    .fam-title { display:flex; align-items:center; gap:12px; background:#0f2744; color:#fff; padding:10px 14px; border-radius:8px 8px 0 0; font-size:16px; font-weight:900; }
    .fam-title .fam-sub { font-size:11px; font-weight:600; color:#9fb6cf; }
    .fam-title .fam-kpis { margin-left:auto; display:flex; gap:12px; font-size:11px; font-weight:800; }
    .fam-title .fam-kpis em { background:#fff; padding:2px 8px; border-radius:999px; font-style:normal; }
    .cat { margin:6px 0 12px; }
    .cat-h { display:flex; align-items:center; gap:8px; color:#fff; font-weight:800; font-size:12px; padding:5px 10px; border-radius:6px; }
    .cat-h b { background:rgba(255,255,255,.25); border-radius:999px; padding:1px 8px; }
    .cat-h .cat-total { margin-left:auto; }
    .cat-h .dot { width:9px; height:9px; border-radius:50%; background:rgba(255,255,255,.85); display:inline-block; }
    table.t { width:100%; border-collapse:collapse; margin:4px 0; font-size:11px; page-break-inside:auto; }
    table.t th, table.t td { border:1px solid #e2e8f0; padding:5px 7px; }
    table.t thead th { background:#eef2f7; color:#334155; font-size:10px; text-transform:uppercase; }
    table.t tr { page-break-inside:avoid; }
    .r { text-align:right; } .b { font-weight:800; } .mono { font-weight:700; }
    tr.sub td { background:#f8fafc; font-weight:800; }
    .empty { padding:6px 10px; color:#64748b; font-size:11px; background:#f8fafc; border:1px solid #eef2f7; border-top:0; }
    .foot { margin-top:18px; text-align:center; color:#94a3b8; font-size:10px; border-top:1px solid #e2e8f0; padding-top:8px; }
    @media print { .noprint { display:none; } }
    .noprint { text-align:center; margin:16px 0; }
    .noprint button { background:#0b57d0; color:#fff; border:0; padding:10px 18px; border-radius:8px; font-weight:800; cursor:pointer; }
  </style></head>
  <body>
    <div class="cover">
      <img src="${logo}" alt="INOVA" onerror="this.style.display='none'"/>
      <div>
        <h1>Informe de análisis de inventario</h1>
        <p>SAP (teórico) vs físico WMS · ${hoy}${fileName ? ` · Archivo: ${fileName}` : ""}</p>
      </div>
    </div>

    <div class="meta">
      ${kpi("Faltantes", `${gFalt}`, "#c0201a")}
      ${kpi("Sobrantes", `${gSob}`, "#1f4e9c")}
      ${kpi("Cuadrados", `${gCuad}`, "#1f7a3d")}
      ${kpi("Familias", `${familias.length}`, "#0f2744")}
    </div>

    ${bloquesFamilia || '<div class="empty">No hay datos para el informe.</div>'}

    <div class="foot">Fórmula: (Físico − Teórico) − P. Ingreso + P. Descargar − Devolución · Generado por INOVA WMS</div>

    <div class="noprint"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
    <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},400);};</script>
  </body></html>`;
}
