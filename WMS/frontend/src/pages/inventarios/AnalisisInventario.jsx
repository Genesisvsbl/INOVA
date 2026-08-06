import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Upload,
  Search,
  Download,
  FileText,
  Save,
  Plus,
  ArrowLeft,
  FolderOpen,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Eraser,
} from "lucide-react";
import {
  generarAnalisisInventario,
  guardarAnalisisInventario,
  actualizarAnalisisInventario,
  listarAnalisisInventario,
  getAnalisisInventario,
  eliminarAnalisisInventario,
} from "../../api";

const colors = {
  navy: "#1f2d5c",
  blue: "#0b3d91",
  red: "#dc2626",
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
const fmtFecha = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// DIFERENCIA = (FISICO - TEORICO) - P.INGRESO + P.DESCARGAR - DEVOLUCION
function calcDiferencia(r) {
  return (
    (Number(r.fisico || 0) - Number(r.teorico || 0)) -
    Number(r.p_ingreso || 0) +
    Number(r.p_descargar || 0) -
    Number(r.devolucion || 0)
  );
}

const th = { padding: "8px 8px", fontSize: 10.5, fontWeight: 800, color: "#e8eefb", background: "#0b3d91", borderRight: "1px solid #2a56ad", whiteSpace: "nowrap", textAlign: "center" };
const thL = { ...th, textAlign: "center" };
const td = { padding: "5px 8px", fontSize: 11.5, borderBottom: "1px solid #eef2f7", borderRight: "1px solid #f1f5f9", textAlign: "right", color: "#24384d", whiteSpace: "nowrap" };
const tdL = { ...td, textAlign: "left" };
const editInput = { width: 96, height: 26, textAlign: "right", border: "1px solid #d9e2ec", borderRadius: 6, padding: "0 6px", fontSize: 11.5, outline: "none" };

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

// Filtro desplegable con checkboxes (multi-selección). Vacío = todas.
function MultiCheck({ options, selected, onChange, allLabel = "TODAS", searchable = false, placeholder = "Buscar…", minWidth = 220 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selSet = new Set(selected);
  const norm = (s) => String(s || "").toLowerCase();
  const visibles = searchable && q.trim()
    ? options.filter((o) => norm(o.label).includes(norm(q)) || norm(o.value).includes(norm(q)))
    : options;
  const toggle = (val) =>
    onChange(selSet.has(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  const resumen =
    selected.length === 0
      ? allLabel
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label || selected[0]
      : `${selected.length} seleccionadas`;

  const btn = {
    width: "100%", height: 38, padding: "0 10px", borderRadius: 8,
    border: `1px solid ${selected.length ? "#0b3d91" : "#d9e2ec"}`,
    background: "#fff", color: "#1f2d3d", fontSize: 13, fontWeight: 600,
    boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 8, cursor: "pointer",
  };
  const linkBtn = { border: "none", background: "transparent", color: "#0b3d91", fontWeight: 800, fontSize: 12, cursor: "pointer", padding: "2px 4px" };

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={btn}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumen}</span>
        <ChevronDown size={15} color="#6b7a90" style={{ transform: open ? "rotate(180deg)" : "none", transition: ".15s" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", zIndex: 41, top: "calc(100% + 4px)", left: 0, minWidth, maxWidth: 380, width: "max-content", maxHeight: 340, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 10, boxShadow: "0 12px 34px rgba(15,23,42,.18)", padding: 8, display: "flex", flexDirection: "column" }}>
            {searchable && (
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
                style={{ height: 32, border: `1px solid ${colors.border}`, borderRadius: 7, padding: "0 8px", fontSize: 12.5, outline: "none", marginBottom: 6 }} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px 6px" }}>
              <button type="button" onClick={() => onChange(options.map((o) => o.value))} style={linkBtn}>Seleccionar todas</button>
              <button type="button" onClick={() => onChange([])} style={linkBtn}>Limpiar</button>
            </div>
            <div style={{ overflowY: "auto", display: "grid", gap: 2 }}>
              {visibles.length === 0 && <div style={{ padding: 8, color: colors.muted, fontSize: 12 }}>Sin resultados.</div>}
              {visibles.map((o) => {
                const on = selSet.has(o.value);
                return (
                  <label key={o.value} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: on ? "#eef4ff" : "transparent", fontSize: 12.5 }}>
                    <input type="checkbox" checked={on} onChange={() => toggle(o.value)} style={{ width: 15, height: 15, cursor: "pointer" }} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label || o.value}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalisisInventario() {
  const fileRef = useRef(null);
  const creadoPor = (sessionStorage.getItem("usuario") || sessionStorage.getItem("nombre") || "SISTEMA").trim();

  const [vista, setVista] = useState("lista"); // "lista" | "trabajo"
  const [guardados, setGuardados] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const [famSel, setFamSel] = useState([]); // familias marcadas (vacío = todas)
  const [matSel, setMatSel] = useState([]); // códigos marcados (vacío = todos)
  const [fTexto, setFTexto] = useState("");

  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  // Análisis actualmente abierto (para "Guardar cambios" sobre el mismo registro).
  const [currentId, setCurrentId] = useState(null);
  const [currentNombre, setCurrentNombre] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const cargarLista = async () => {
    setLoadingList(true);
    try {
      const data = await listarAnalisisInventario();
      setGuardados(Array.isArray(data) ? data : []);
    } catch {
      setGuardados([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  const nuevo = () => {
    setRows([]);
    setFileName("");
    setError("");
    setOkMsg("");
    setCurrentId(null);
    setCurrentNombre("");
    setFamSel([]);
    setMatSel([]);
    setFTexto("");
    setVista("trabajo");
  };

  const abrirGuardado = async (id) => {
    setVista("trabajo");
    setLoading(true);
    setError("");
    setOkMsg("");
    try {
      const a = await getAnalisisInventario(id);
      const datos = Array.isArray(a?.datos) ? a.datos : [];
      setRows(datos.map((r) => ({ p_ingreso: 0, p_descargar: 0, devolucion: 0, ...r })));
      const nombre = a?.nombre || a?.archivo || `Análisis ${fmtFecha(a?.fecha)}`;
      setFileName(nombre);
      setCurrentId(a?.id ?? id);
      setCurrentNombre(a?.nombre || nombre);
    } catch (e) {
      setError(e?.message || "No se pudo abrir el análisis.");
    } finally {
      setLoading(false);
    }
  };

  const borrarGuardado = async (id) => {
    if (!window.confirm("¿Eliminar este análisis guardado?")) return;
    try {
      await eliminarAnalisisInventario(id);
      cargarLista();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar.");
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    setOkMsg("");
    try {
      const data = await generarAnalisisInventario(file);
      setRows(data.map((r) => ({ ...r, p_ingreso: 0, p_descargar: 0, devolucion: 0 })));
      setFileName(file.name);
      // Un archivo nuevo es un análisis nuevo: se guarda como registro aparte.
      setCurrentId(null);
      setCurrentNombre("");
    } catch (err) {
      setError(err?.message || "No se pudo procesar el archivo.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const setVal = (idx, key, num) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: Number.isFinite(num) ? num : 0 } : r)));
    if (okMsg) setOkMsg("");
  };

  const famOptions = useMemo(() => {
    const set = new Set(rows.map((r) => String(r.familia || "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map((f) => ({ value: f, label: f }));
  }, [rows]);

  // Los códigos disponibles dependen de las familias marcadas (si hay).
  const matOptions = useMemo(() => {
    const famSet = new Set(famSel);
    const map = new Map();
    rows.forEach((r) => {
      const cod = String(r.material || "").trim();
      if (!cod) return;
      if (famSet.size && !famSet.has(String(r.familia || "").trim())) return;
      if (!map.has(cod)) map.set(cod, `${cod} · ${r.texto || ""}`.trim());
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, label]) => ({ value, label }));
  }, [rows, famSel]);

  const hayFiltros = famSel.length > 0 || matSel.length > 0 || fTexto.trim() !== "";

  const limpiarFiltros = () => {
    setFamSel([]);
    setMatSel([]);
    setFTexto("");
  };

  const filtered = useMemo(() => {
    const txt = fTexto.trim().toLowerCase();
    const famSet = new Set(famSel);
    const matSet = new Set(matSel);
    return rows.filter((r) => {
      if (famSet.size && !famSet.has(String(r.familia || "").trim())) return false;
      if (matSet.size && !matSet.has(String(r.material || "").trim())) return false;
      if (txt && !String(r.texto || "").toLowerCase().includes(txt)) return false;
      return true;
    });
  }, [rows, famSel, matSel, fTexto]);

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
      ...filtered.map((r) => [r.familia, r.material, r.texto, Number(r.teorico || 0), Number(r.p_ingreso || 0), Number(r.p_descargar || 0), Number(r.devolucion || 0), Number(r.fisico || 0), calcDiferencia(r)]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analisis");
    XLSX.writeFile(wb, `analisis_inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  const abrirGuardar = () => {
    const ahora = new Date();
    setSaveName(`Análisis ${ahora.toLocaleDateString("es-CO")} ${ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`);
    setSaveModal(true);
  };

  // Arma los datos + totales a guardar a partir de las filas actuales.
  const construirPayload = (nombre) => {
    const datos = rows.map((r) => ({
      familia: r.familia,
      material: r.material,
      texto: r.texto,
      teorico: Number(r.teorico || 0),
      fisico: Number(r.fisico || 0),
      p_ingreso: Number(r.p_ingreso || 0),
      p_descargar: Number(r.p_descargar || 0),
      devolucion: Number(r.devolucion || 0),
    }));
    const difs = datos.map(calcDiferencia);
    return {
      nombre: nombre || null,
      archivo: fileName || null,
      creado_por: creadoPor,
      total_materiales: datos.length,
      total_faltantes: difs.filter((d) => d < 0).length,
      total_sobrantes: difs.filter((d) => d > 0).length,
      total_cuadrados: difs.filter((d) => d === 0).length,
      datos,
    };
  };

  // Guardar como NUEVO (desde el modal). Al terminar deja ese análisis abierto
  // para poder seguir editándolo y guardando cambios.
  const confirmarGuardar = async () => {
    setSaving(true);
    setError("");
    setOkMsg("");
    try {
      const nombre = saveName.trim() || null;
      const creado = await guardarAnalisisInventario(construirPayload(nombre));
      setSaveModal(false);
      if (creado?.id) {
        setCurrentId(creado.id);
        setCurrentNombre(nombre || fileName || "");
      }
      await cargarLista();
      setOkMsg("Análisis guardado. Puedes seguir editando y darle \"Guardar cambios\".");
    } catch (e) {
      setError(e?.message || "No se pudo guardar el análisis.");
    } finally {
      setSaving(false);
    }
  };

  // Guardar cambios SOBRE el análisis ya abierto (actualiza el mismo registro).
  const guardarCambios = async () => {
    if (!currentId) {
      abrirGuardar();
      return;
    }
    setSaving(true);
    setError("");
    setOkMsg("");
    try {
      await actualizarAnalisisInventario(currentId, construirPayload(currentNombre || fileName || null));
      await cargarLista();
      const hora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
      setOkMsg(`Cambios guardados (${hora}). Al reabrir este análisis verás lo actualizado.`);
    } catch (e) {
      setError(e?.message || "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const difBg = (v) => (v < 0 ? colors.red : v > 0 ? colors.blue : "transparent");

  // ---------------- Vista LISTA (guardados) ----------------
  if (vista === "lista") {
    return (
      <div style={{ padding: 24, display: "grid", gap: 16, color: colors.text }}>
        <div style={cardStyle}>
          <div style={headStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={iconBox}><BarChart3 size={20} color="#0b3d91" /></div>
              <div>
                <div style={kicker}>Inventarios</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#17324d" }}>Análisis</div>
                <div style={{ fontSize: 13, color: "#5b6b7c" }}>Sube existencias de SAP y compara contra el físico del WMS.</div>
              </div>
            </div>
            <button onClick={nuevo} style={btnPrimary(false)}>
              <Plus size={16} /> Nuevo análisis
            </button>
          </div>

          <div style={{ padding: 14 }}>
            {loadingList ? (
              <div style={{ color: colors.muted, fontWeight: 700 }}>Cargando análisis guardados…</div>
            ) : guardados.length === 0 ? (
              <div style={{ color: colors.muted, fontSize: 13, padding: "16px 4px" }}>
                Aún no hay análisis guardados. Dale a <b>Nuevo análisis</b>, sube el LX02 de SAP, revisa la diferencia y guárdalo.
              </div>
            ) : (
              <div className="table-tools-skip" style={{ overflowX: "auto", border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                <table className="table-tools-skip print-table" style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={thL}>Fecha y hora</th>
                      <th style={thL}>Nombre</th>
                      <th style={thL}>Creado por</th>
                      <th style={th}>Materiales</th>
                      <th style={th}>Faltantes</th>
                      <th style={th}>Sobrantes</th>
                      <th style={th}>Cuadrados</th>
                      <th style={{ ...th, borderRight: "none" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardados.map((g, i) => (
                      <tr key={g.id} style={{ background: i % 2 ? "#fbfcfe" : "#fff" }}>
                        <td style={{ ...tdL, fontWeight: 700, color: colors.navy }}>{fmtFecha(g.fecha)}</td>
                        <td style={tdL}>{g.nombre || "—"}</td>
                        <td style={tdL}>{g.creado_por || "—"}</td>
                        <td style={td}>{g.total_materiales}</td>
                        <td style={{ ...td, color: colors.red, fontWeight: 800 }}>{g.total_faltantes}</td>
                        <td style={{ ...td, color: colors.blue, fontWeight: 800 }}>{g.total_sobrantes}</td>
                        <td style={{ ...td, color: colors.green, fontWeight: 800 }}>{g.total_cuadrados}</td>
                        <td style={{ ...td, borderRight: "none" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => abrirGuardado(g.id)} style={miniBtn("#0b57d0")}><FolderOpen size={13} /> Abrir</button>
                            <button onClick={() => borrarGuardado(g.id)} style={miniBtn(colors.red)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Vista TRABAJO ----------------
  return (
    <div style={{ padding: 24, display: "grid", gap: 16, color: colors.text }}>
      <div style={cardStyle}>
        <div style={headStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setVista("lista")} style={{ ...miniBtn("#64748b"), height: 34 }}><ArrowLeft size={14} /> Volver</button>
            <div style={iconBox}><BarChart3 size={20} color="#0b3d91" /></div>
            <div>
              <div style={kicker}>Inventarios · Análisis</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#17324d" }}>Análisis (SAP vs físico)</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => fileRef.current?.click()} disabled={loading} style={btnPrimary(loading)}>
              {loading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
              {loading ? "Procesando…" : rows.length ? "Cambiar archivo" : "Subir existencias SAP"}
            </button>
            {rows.length > 0 && (
              <>
                {currentId ? (
                  <>
                    <button onClick={guardarCambios} disabled={saving} style={btnGreen}>
                      {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Guardar cambios
                    </button>
                    <button onClick={abrirGuardar} disabled={saving} style={btnGhost}><Plus size={15} /> Guardar como nuevo</button>
                  </>
                ) : (
                  <button onClick={abrirGuardar} disabled={saving} style={btnGreen}><Save size={15} /> Guardar</button>
                )}
                <button onClick={generarInforme} style={btnDark}><FileText size={15} /> Generar informe</button>
                <button onClick={exportar} style={btnGhost}><Download size={15} /> Excel</button>
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

          {okMsg && !error && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, fontWeight: 700, fontSize: 13, border: "1px solid #bfe3c9", background: "#eefaf1", color: "#1f7a3d", display: "flex", gap: 8, alignItems: "center" }}>
              <Save size={16} /> {okMsg}
            </div>
          )}

          {rows.length === 0 && !loading && !error && (
            <div style={{ color: colors.muted, fontSize: 13, padding: "20px 4px" }}>
              Sube el LX02 de SAP para generar el análisis: TEÓRICO (SAP) vs FÍSICO (WMS), columnas editables P. Ingreso, P. Descargar y Devolución, y la Diferencia calculada.
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) minmax(200px,1.2fr) minmax(200px,1.4fr) auto auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
                <div>
                  <div style={lbl}>Familia</div>
                  <MultiCheck options={famOptions} selected={famSel} onChange={setFamSel} allLabel="TODAS" searchable placeholder="Buscar familia…" />
                </div>
                <div>
                  <div style={lbl}>Material (código)</div>
                  <MultiCheck options={matOptions} selected={matSel} onChange={setMatSel} allLabel="TODOS" searchable placeholder="Buscar código o texto…" minWidth={300} />
                </div>
                <div>
                  <div style={lbl}>Texto</div>
                  <div style={searchBox}><Search size={14} color={colors.muted} /><input value={fTexto} onChange={(e) => setFTexto(e.target.value)} placeholder="Descripción…" style={searchInput} /></div>
                </div>
                <div>
                  <button
                    onClick={limpiarFiltros}
                    disabled={!hayFiltros}
                    title="Quitar todos los filtros"
                    style={{ ...btnGhost, height: 38, opacity: hayFiltros ? 1 : 0.5, cursor: hayFiltros ? "pointer" : "default" }}
                  >
                    <Eraser size={15} /> Limpiar filtro
                  </button>
                </div>
                <div style={{ fontSize: 12, color: colors.muted, fontWeight: 700, paddingBottom: 8, textAlign: "right" }}>
                  {fileName}<br />{filtered.length} de {rows.length} materiales
                </div>
              </div>

              <div className="table-tools-skip" style={{ overflowX: "auto", border: `1px solid ${colors.border}`, borderRadius: 10 }}>
                <table className="table-tools-skip print-table" style={{ width: "100%", minWidth: 1050, borderCollapse: "collapse" }}>
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
                      <th style={{ ...th, borderRight: "none", minWidth: 130 }}>DIFERENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => {
                      const realIdx = rows.indexOf(r);
                      const dif = calcDiferencia(r);
                      const bg = difBg(dif);
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
                          <td
                            style={{
                              ...td,
                              borderRight: "none",
                              textAlign: "center",
                              padding: 0,
                              background: bg,
                              color: dif === 0 ? "#334155" : "#fff",
                              fontWeight: 900,
                              fontSize: 14,
                            }}
                          >
                            {fmt(dif)}
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
                      <td style={{ ...td, borderRight: "none", textAlign: "center", background: difBg(totales.diferencia), color: totales.diferencia === 0 ? "#334155" : "#fff", fontWeight: 900, fontSize: 14 }}>{fmt(totales.diferencia)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ marginTop: 10, fontSize: 11.5, color: colors.muted }}>
                Fórmula: (FÍSICO − TEÓRICO) − P. Ingreso + P. Descargar − Devolución. Rojo = faltante, azul = sobrante, sin color = cuadrado.
              </div>
            </>
          )}
        </div>
      </div>

      {saveModal && (
        <div style={overlay} onClick={() => !saving && setSaveModal(false)}>
          <div style={{ ...cardStyle, width: "min(460px,96vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${colors.border}`, background: colors.soft, display: "flex", alignItems: "center", gap: 8 }}>
              <Save size={16} color={colors.green} />
              <span style={{ fontWeight: 900, color: "#17324d", fontSize: 16 }}>Guardar análisis</span>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 12.5, color: colors.muted, marginBottom: 12 }}>
                Se guardará con la fecha y hora actuales. Ponle un nombre para reconocerlo después.
              </div>
              <div style={lbl}>Nombre del análisis</div>
              <input value={saveName} onChange={(e) => setSaveName(e.target.value)} autoFocus style={{ ...selectStyle, fontWeight: 500 }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button onClick={() => setSaveModal(false)} disabled={saving} style={btnGhost}>Cancelar</button>
                <button onClick={confirmarGuardar} disabled={saving} style={btnGreen}>{saving ? "Guardando…" : "Guardar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite}`}</style>
    </div>
  );
}

const cardStyle = { background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" };
const headStyle = { padding: "16px 18px", borderBottom: `1px solid ${colors.border}`, background: "linear-gradient(to bottom,#fbfcfd,#f5f8fb)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" };
const iconBox = { width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "#eef2fb", border: "1px solid #d6e1ec" };
const kicker = { fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "#7a8797", textTransform: "uppercase" };
const lbl = { fontSize: 11, fontWeight: 800, color: "#7a8797", letterSpacing: ".04em", marginBottom: 6, textTransform: "uppercase" };
const selectStyle = { width: "100%", height: 38, padding: "0 10px", borderRadius: 8, border: "1px solid #d9e2ec", background: "#fff", color: "#1f2d3d", fontSize: 13, fontWeight: 600, boxSizing: "border-box" };
const searchBox = { display: "flex", alignItems: "center", gap: 8, border: "1px solid #d9e2ec", borderRadius: 8, background: "#fff", height: 38, padding: "0 10px" };
const searchInput = { border: "none", outline: "none", width: "100%", fontSize: 13, background: "transparent" };
const overlay = { position: "fixed", inset: 0, zIndex: 10001, display: "grid", placeItems: "center", background: "rgba(8,17,31,.55)", padding: 16 };
const btnGhost = { height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #d9e2ec", background: "#fff", color: "#1f2d3d", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const btnDark = { height: 40, padding: "0 14px", borderRadius: 8, border: "1px solid #1f2d5c", background: "#1f2d5c", color: "#fff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const btnGreen = { height: 40, padding: "0 16px", borderRadius: 9, border: "1px solid #0f9d58", background: "linear-gradient(135deg,#22c55e,#12a150)", color: "#fff", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 6px 16px rgba(18,161,80,.30)" };
function btnPrimary(loading) {
  return { height: 40, padding: "0 16px", borderRadius: 8, border: "1px solid #0b57d0", background: loading ? "#9dc0f0" : "#0b57d0", color: "#fff", fontWeight: 800, cursor: loading ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
}
function miniBtn(color) {
  return { height: 28, padding: "0 8px", borderRadius: 6, border: `1px solid ${color}`, background: "#fff", color, fontWeight: 800, fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 };
}

// ---------- Informe corporativo por FAMILIA ----------
function buildInformeHtml({ base, fileName }) {
  const logo = `${window.location.origin}/INOVA2026.png`;
  const nf = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v) => nf.format(Number(v || 0));
  const ahora = new Date();
  const hoy = ahora.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  const rows = Array.isArray(base) ? base : [];
  const gFalt = rows.filter((r) => r.diferencia < 0).length;
  const gSob = rows.filter((r) => r.diferencia > 0).length;
  const gCuad = rows.filter((r) => r.diferencia === 0).length;

  const byFam = new Map();
  rows.forEach((r) => {
    const f = String(r.familia || "(sin familia)");
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(r);
  });
  const familias = [...byFam.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const subTabla = (titulo, list, color) => {
    if (!list.length) {
      return `<div class="cat"><div class="cat-h" style="color:${color}"><span class="tag" style="background:${color}"></span>${titulo}<span class="cnt">0</span></div><div class="empty">Sin registros.</div></div>`;
    }
    const sub = list.reduce((a, r) => a + Number(r.diferencia || 0), 0);
    return `
      <div class="cat">
        <div class="cat-h" style="color:${color}"><span class="tag" style="background:${color}"></span>${titulo}<span class="cnt" style="background:${color}">${list.length}</span></div>
        <table class="t">
          <thead><tr><th>Material</th><th>Descripción</th><th class="r">Teórico</th><th class="r">Físico</th><th class="r">Diferencia</th></tr></thead>
          <tbody>
            ${list.map((r) => `<tr>
              <td class="mono">${r.material}</td>
              <td>${String(r.texto || "")}</td>
              <td class="r">${money(r.teorico)}</td>
              <td class="r">${money(r.fisico)}</td>
              <td class="r b" style="color:${color}">${money(r.diferencia)}</td>
            </tr>`).join("")}
            <tr class="sub"><td colspan="4" class="r">Subtotal</td><td class="r" style="color:${color}">${money(sub)}</td></tr>
          </tbody>
        </table>
      </div>`;
  };

  const bloques = familias.map(([fam, items]) => {
    const falt = items.filter((r) => r.diferencia < 0);
    const sob = items.filter((r) => r.diferencia > 0);
    const cuad = items.filter((r) => r.diferencia === 0);
    return `
      <section class="fam">
        <div class="fam-h"><span class="fam-n">${fam}</span><span class="fam-c">${items.length} material(es)</span></div>
        ${subTabla("Faltantes", falt, "#dc2626")}
        ${subTabla("Sobrantes", sob, "#0b3d91")}
        ${subTabla("Cuadrados", cuad, "#1f7a3d")}
      </section>`;
  }).join("");

  const kpi = (l, v, c) => `<div class="kpi"><span class="kl">${l}</span><span class="kv" style="color:${c}">${v}</span></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Informe de análisis de inventario</title>
  <style>
    @page { size: Letter; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#1f2d3d; margin:0; }
    .doc-head { display:flex; align-items:center; justify-content:space-between; padding-bottom:12px; border-bottom:3px solid #1f2d5c; }
    .doc-head .brand { display:flex; align-items:center; gap:14px; }
    .doc-head .brand .logo {
      display:inline-block; width:132px; height:42px;
      background-color:#1f2d5c;
      -webkit-mask: url("${logo}") left center / contain no-repeat;
      mask: url("${logo}") left center / contain no-repeat;
    }
    .doc-head .brand .sys { font-size:11px; font-weight:800; letter-spacing:.14em; color:#1f2d5c; }
    .doc-head .brand .sys small { display:block; color:#8a97a8; font-weight:700; letter-spacing:.08em; }
    .doc-head .meta { text-align:right; font-size:11px; color:#64748b; line-height:1.5; }
    .doc-head .meta b { color:#1f2d5c; }
    h1.title { font-size:24px; font-weight:800; color:#1f2d5c; margin:18px 0 2px; letter-spacing:.01em; }
    .sub { color:#64748b; font-size:12px; margin:0 0 6px; }
    .kpis { display:flex; gap:10px; flex-wrap:wrap; margin:14px 0 6px; }
    .kpi { flex:1; min-width:150px; border:1px solid #e6ecf3; border-radius:10px; padding:12px 14px; background:#fbfdff; display:flex; flex-direction:column; }
    .kpi .kl { font-size:10px; font-weight:800; letter-spacing:.06em; color:#7a8797; text-transform:uppercase; }
    .kpi .kv { font-size:22px; font-weight:900; margin-top:4px; }
    section.fam { margin:20px 0; page-break-inside:auto; }
    .fam-h { display:flex; align-items:baseline; gap:12px; border-bottom:2px solid #1f2d5c; padding-bottom:6px; margin-bottom:8px; }
    .fam-h .fam-n { font-size:17px; font-weight:900; color:#1f2d5c; letter-spacing:.02em; }
    .fam-h .fam-c { font-size:11px; font-weight:700; color:#8a97a8; }
    .cat { margin:8px 0 12px; }
    .cat-h { display:flex; align-items:center; gap:8px; font-weight:800; font-size:12.5px; margin-bottom:4px; }
    .cat-h .tag { width:10px; height:10px; border-radius:2px; display:inline-block; }
    .cat-h .cnt { color:#fff; border-radius:999px; font-size:10.5px; padding:1px 8px; }
    .cat-h .cat-total { margin-left:auto; font-weight:900; }
    table.t { width:100%; border-collapse:collapse; margin:2px 0; font-size:11px; }
    table.t th, table.t td { border:1px solid #e6ecf3; padding:5px 8px; }
    table.t thead th { background:#f1f5fa; color:#334155; font-size:10px; text-transform:uppercase; letter-spacing:.03em; }
    table.t tr { page-break-inside:avoid; }
    .r { text-align:right; } .b { font-weight:800; } .mono { font-weight:700; }
    tr.sub td { background:#f8fafc; font-weight:800; }
    .empty { padding:6px 10px; color:#8a97a8; font-size:11px; background:#fafbfc; border:1px dashed #e6ecf3; border-radius:6px; }
    .foot { margin-top:22px; text-align:center; color:#9aa7b5; font-size:10px; border-top:1px solid #e6ecf3; padding-top:8px; }
    @media print { .noprint { display:none; } }
    .noprint { text-align:center; margin:16px 0; }
    .noprint button { background:#1f2d5c; color:#fff; border:0; padding:11px 20px; border-radius:8px; font-weight:800; cursor:pointer; }
  </style></head>
  <body>
    <div class="doc-head">
      <div class="brand">
        <span class="logo" role="img" aria-label="INOVA"></span>
        <div class="sys">SISTEMA WMS<small>Gestión de inventarios</small></div>
      </div>
      <div class="meta">
        <div><b>Informe de análisis de inventario</b></div>
        <div>${hoy} · ${hora}</div>
        ${fileName ? `<div>Archivo: ${fileName}</div>` : ""}
      </div>
    </div>

    <h1 class="title">Análisis de inventario · SAP vs físico</h1>
    <p class="sub">Comparativo del teórico de SAP contra el físico real del WMS, desglosado por familia.</p>

    <div class="kpis">
      ${kpi("Faltantes", `${gFalt}`, "#dc2626")}
      ${kpi("Sobrantes", `${gSob}`, "#0b3d91")}
      ${kpi("Cuadrados", `${gCuad}`, "#1f7a3d")}
      ${kpi("Familias", `${familias.length}`, "#1f2d5c")}
    </div>

    ${bloques || '<div class="empty">No hay datos para el informe.</div>'}

    <div class="foot">Fórmula: (Físico − Teórico) − P. Ingreso + P. Descargar − Devolución · Generado por INOVA · Sistema WMS</div>

    <div class="noprint"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
    <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},450);};</script>
  </body></html>`;
}
