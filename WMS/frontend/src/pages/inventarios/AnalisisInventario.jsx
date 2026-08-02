import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Upload,
  Search,
  Download,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { generarAnalisisInventario } from "../../api";

const colors = {
  navy: "#0f2744",
  blue: "#1f4e9c",
  blueBg: "#1f4e9c",
  red: "#c0201a",
  text: "#1f2d3d",
  muted: "#6b7a90",
  border: "#d9e2ec",
  soft: "#f8fafc",
};

const nf = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (v) => nf.format(Number(v || 0));

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
  width: 90,
  height: 26,
  textAlign: "right",
  border: "1px solid #d9e2ec",
  borderRadius: 6,
  padding: "0 6px",
  fontSize: 11.5,
  outline: "none",
};

export default function AnalisisInventario() {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [q, setQ] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await generarAnalisisInventario(file);
      setRows(
        data.map((r) => ({ ...r, p_ingreso: 0, p_descargar: 0, devolucion: 0 }))
      );
      setFileName(file.name);
    } catch (err) {
      setError(err?.message || "No se pudo procesar el archivo.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const setVal = (idx, key, value) => {
    const num = value === "" ? 0 : Number(value);
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: Number.isFinite(num) ? num : 0 } : r)));
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.familia, r.material, r.texto].map((x) => String(x || "").toLowerCase()).join(" ").includes(needle)
    );
  }, [rows, q]);

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

  const difColor = (v) => (v < 0 ? colors.red : v > 0 ? colors.blue : "#64748b");

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
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid #0b57d0",
                background: loading ? "#9dc0f0" : "#0b57d0",
                color: "#fff",
                fontWeight: 800,
                cursor: loading ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              {loading ? "Procesando…" : "Subir existencias SAP"}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportar}
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: "#fff",
                  color: colors.text,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Download size={15} /> Exportar Excel
              </button>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${colors.border}`, borderRadius: 8, background: "#fff", height: 36, padding: "0 10px", minWidth: 280 }}>
                  <Search size={15} color={colors.muted} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por familia, material o texto…" style={{ border: "none", outline: "none", width: "100%", fontSize: 13 }} />
                </div>
                <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700 }}>
                  {fileName} · {filtered.length} materiales
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
                          <td style={td}>
                            <input type="number" value={r.p_ingreso} onChange={(e) => setVal(realIdx, "p_ingreso", e.target.value)} style={editInput} />
                          </td>
                          <td style={td}>
                            <input type="number" value={r.p_descargar} onChange={(e) => setVal(realIdx, "p_descargar", e.target.value)} style={editInput} />
                          </td>
                          <td style={td}>
                            <input type="number" value={r.devolucion} onChange={(e) => setVal(realIdx, "devolucion", e.target.value)} style={editInput} />
                          </td>
                          <td style={{ ...td, fontWeight: 700 }}>{fmt(r.fisico)}</td>
                          <td style={{ ...td, borderRight: "none", fontWeight: 800, color: "#fff", background: difColor(dif) }}>{fmt(dif)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#eef2f7", fontWeight: 800 }}>
                      <td style={tdL} colSpan={3}>TOTALES ({filtered.length})</td>
                      <td style={td}>{fmt(totales.teorico)}</td>
                      <td style={td}>{fmt(totales.p_ingreso)}</td>
                      <td style={td}>{fmt(totales.p_descargar)}</td>
                      <td style={td}>{fmt(totales.devolucion)}</td>
                      <td style={td}>{fmt(totales.fisico)}</td>
                      <td style={{ ...td, borderRight: "none", color: difColor(totales.diferencia) }}>{fmt(totales.diferencia)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ marginTop: 10, fontSize: 11.5, color: colors.muted }}>
                Fórmula de la diferencia: (FÍSICO − TEÓRICO) − P. Ingreso + P. Descargar − Devolución. Rojo = faltante, azul = sobrante.
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}
