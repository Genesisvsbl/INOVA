import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showWmsAlert } from "../wmsDialog.jsx";
import { getUbicaciones, getUbicacionesVacias, getMateriales, getMovimientosLayoutStock } from "../api";
import { Search, Printer, FileText, MapPin, ArrowLeft, Check, Boxes } from "lucide-react";

const colors = {
  navy: "#0a1f52",
  blue: "#0b3d91",
  bg: "#f3f6f9",
  text: "#1f2d3d",
  muted: "#64748b",
  border: "#d9e2ec",
  good: "#16a34a",
};

// Nivel = dígito antes del apóstrofe; Módulo = dos antes; Pasillo = tres antes.
function codeUbic(u) {
  return String(u?.ubicacion || `${u?.ubicacion_base || ""}${u?.posicion || ""}`)
    .replace(/[´`’]/g, "'")
    .toUpperCase();
}
const nivelDe = (u) => { const c = codeUbic(u); const a = c.indexOf("'"); return a > 0 ? c[a - 1] : ""; };
const moduloDe = (u) => { const c = codeUbic(u); const a = c.indexOf("'"); return a > 1 ? c[a - 2] : ""; };
const pasilloDe = (u) => { const c = codeUbic(u); const a = c.indexOf("'"); return a > 2 ? c[a - 3] : ""; };
// Es posición de RACK real (tiene apóstrofe + módulo + nivel). Las áreas de
// piso tipo 300PISO / 300MALLA / ZONAREVISION no lo cumplen.
const esRack = (u) => { const c = codeUbic(u); return c.includes("'") && !!moduloDe(u) && !!nivelDe(u); };

// Columna / posición = número después del apóstrofe (ej. 500111'26 -> 26).
const columnaDe = (u) => {
  const c = codeUbic(u);
  const a = c.indexOf("'");
  if (a < 0) return null;
  const n = parseInt(c.slice(a + 1).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};
// RACK: cada pasillo tiene 2 racks. En el pasillo 1, las posiciones que
// terminan en IMPAR son el rack 1 y las PARES el rack 2; en el pasillo 2 el
// rack 3 (impares) y el rack 4 (pares), y así sucesivamente.
// rack = (pasillo - 1) * 2 + (impar ? 1 : 2)
const rackDe = (u) => {
  const p = parseInt(pasilloDe(u), 10);
  const col = columnaDe(u);
  if (!Number.isFinite(p) || col == null) return null;
  const impar = col % 2 !== 0;
  return (p - 1) * 2 + (impar ? 1 : 2);
};

const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const fmtDMY = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v || "");
};
const nfmt = (n) => Number(n || 0).toLocaleString("es-CO");

// ---- Rótulo(s) de ubicación vacía (con barcode). Uno o varios por hoja. ----
function labelCss() {
  return (
    `@page{size:10.16cm 5.08cm;margin:0}` +
    `html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
    `*{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
    `.lbl{width:10.16cm;height:5.08cm;overflow:hidden;display:flex;flex-direction:column;page-break-after:always}` +
    `.hd{background:#fff;color:#000;display:flex;align-items:center;gap:2mm;padding:1.8mm 3mm;border-bottom:2px solid #000}` +
    `.hd img{height:6mm}` +
    `.hd .t{font-size:12px;font-weight:800;letter-spacing:.3px;color:#000}` +
    `.bd{flex:1;display:flex;flex-direction:column;padding:1.4mm 3mm 1.4mm}` +
    `.meta{font-size:9px;color:#000}` +
    `.meta b{color:#000}` +
    `.ubwrap{text-align:center;margin-top:6mm}` +
    `.lab{font-size:7.5px;color:#000;text-transform:uppercase;letter-spacing:.5px}` +
    `.ub{font-size:34px;font-weight:900;color:#000;letter-spacing:2px;line-height:1}` +
    `.bcwrap{margin-top:auto}` +
    `.bcwrap svg{width:100%;height:50px;display:block}`
  );
}
function labelBody(loc, idx, logo) {
  const code = codeUbic(loc);
  return (
    `<div class="lbl">` +
    `<div class="hd"><img src="${logo}" onerror="this.style.display='none'"/><div class="t">UBICACIÓN</div></div>` +
    `<div class="bd">` +
    `<div class="meta">Base <b>${esc(loc.ubicacion_base || "-")}</b> · Zona <b>${esc(loc.zona || "-")}</b> · Pasillo <b>${esc(pasilloDe(loc) || "-")}</b> · Rack <b>${esc(rackDe(loc) ?? "-")}</b> · Módulo <b>${esc(moduloDe(loc) || "-")}</b> · Nivel <b>${esc(nivelDe(loc) || "-")}</b>${loc.familias ? ` · Familia <b>${esc(loc.familias)}</b>` : ""}</div>` +
    `<div class="ubwrap"><div class="lab">Ubicación</div><div class="ub">${esc(code)}</div></div>` +
    `<div class="bcwrap"><svg id="bc${idx}"></svg></div>` +
    `</div></div>`
  );
}
function imprimirRotulos(locs) {
  if (!locs.length) return;
  const w = window.open("", "_blank", "width=640,height=480");
  if (!w) { showWmsAlert("El navegador bloqueó la ventana de impresión."); return; }
  const logo = `${window.location.origin}/inova-azul.png`;
  const bodies = locs.map((l, i) => labelBody(l, i, logo)).join("");
  const codes = JSON.stringify(locs.map((l) => codeUbic(l)));
  const html =
    `<html><head><meta charset="utf-8"><title>Rótulos de ubicación</title>` +
    `<script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>` +
    `<style>${labelCss()}</style></head><body>${bodies}` +
    `<script>(function(){var C=${codes};function go(){for(var i=0;i<C.length;i++){try{JsBarcode("#bc"+i,C[i],{format:"CODE128",displayValue:false,height:44,width:1.4,margin:0});}catch(e){}}setTimeout(function(){try{window.focus();window.print();}catch(e){}},300);}if(document.readyState==="complete"){go();}else{window.addEventListener("load",go);}window.onafterprint=function(){setTimeout(function(){try{window.close();}catch(e){}},150);};})();<\/script>` +
    `</body></html>`;
  w.document.open(); w.document.write(html); w.document.close(); w.focus();
}

// ---- Informe corporativo de ubicaciones vacías ----
function imprimirInforme(locs, filtros) {
  if (!locs.length) return;
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) { showWmsAlert("El navegador bloqueó la ventana de impresión."); return; }
  const logo = `${window.location.origin}/INOVA2026.png`;
  const filaTxt = `${filtros.base ? `Base ${esc(filtros.base)} · ` : ""}${filtros.zona ? `Zona ${esc(filtros.zona)} · ` : ""}${filtros.familia ? `Familia ${esc(filtros.familia)} · ` : ""}${filtros.pasillo ? `Pasillo ${esc(filtros.pasillo)} · ` : ""}${filtros.rack ? `Rack ${esc(filtros.rack)} · ` : ""}${filtros.modulo ? `Módulo ${esc(filtros.modulo)} · ` : ""}${filtros.nivel ? `Nivel ${esc(filtros.nivel)}` : ""}`.replace(/ · $/, "");
  const logoAzul = `${window.location.origin}/inova-azul.png`;
  const rows = locs.map((l, i) =>
    `<tr><td class="chk"><span class="chkbox"></span></td><td class="num">${i + 1}</td><td class="cod">${esc(codeUbic(l))}</td><td>${esc(l.ubicacion_base || "-")}</td><td>${esc(l.zona || "-")}</td><td class="c">${esc(pasilloDe(l) || "-")}</td><td class="c">${esc(rackDe(l) ?? "-")}</td><td class="c">${esc(moduloDe(l) || "-")}</td><td class="c">${esc(nivelDe(l) || "-")}</td><td>${esc(l.familias || "-")}</td><td>${esc(l.bodega || "-")}</td></tr>`
  ).join("");
  const html =
    `<html><head><meta charset="utf-8"><title>Informe ubicaciones vacías</title><style>` +
    `@page{size:letter;margin:12mm}` +
    `*{font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}` +
    `body{margin:0;color:#0f172a}` +
    // Encabezado: logo INOVA en AZUL sobre blanco (se imprime siempre) con
    // regla azul inferior. Sin fondo de color, todo el texto en azul.
    `.hd{display:flex;align-items:center;gap:16px;padding:4px 2px 12px;border-bottom:3px solid #0a1f52}` +
    `.hd img{height:52px}` +
    `.hd .t{font-size:21px;font-weight:900;color:#0a1f52;letter-spacing:.4px}` +
    `.hd .s{font-size:12px;color:#0a1f52;font-weight:700;margin-top:3px}` +
    `table{border-collapse:collapse;width:100%;margin-top:12px}` +
    // Cabecera de tabla: relleno azul claro + texto azul (legible aunque el
    // relleno no se imprima).
    `th{background:#dbe6fb;color:#0a1f52;font-size:11px;text-align:left;padding:7px 8px;border:1px solid #9db3d6;font-weight:900;text-transform:uppercase;letter-spacing:.2px}` +
    `td{font-size:11.5px;padding:5px 8px;border:1px solid #c7d2e0;color:#0f172a}` +
    `td.cod{font-weight:900;color:#0a1f52;letter-spacing:.5px}` +
    `td.c{text-align:center}td.num{text-align:center;color:#64748b}` +
    `tr:nth-child(even) td{background:#f3f7fd}` +
    `.chk{width:26px;text-align:center}` +
    `.chkbox{display:inline-block;width:13px;height:13px;border:1.6px solid #334155;border-radius:3px;vertical-align:middle}` +
    `th.chk{color:#0a1f52}` +
    `.foot{margin-top:12px;padding-top:8px;border-top:1px solid #cbd5e1;font-size:11px;color:#64748b;display:flex;justify-content:space-between}` +
    `</style></head><body>` +
    `<div class="hd"><img src="${logoAzul}" onerror="this.onerror=null;this.src='${logo}'"/><div><div class="t">INFORME DE UBICACIONES VACÍAS</div>` +
    `<div class="s">${filaTxt || "Todas las ubicaciones libres"} · ${new Date().toLocaleString("es-CO")}</div></div></div>` +
    `<table><thead><tr><th class="chk">✓</th><th>#</th><th>Ubicación</th><th>Base</th><th>Zona</th><th>Pasillo</th><th>Rack</th><th>Módulo</th><th>Nivel</th><th>Familia</th><th>Bodega</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<div class="foot"><span>INOVA · WMS — Control logístico</span><span>Total de ubicaciones vacías: <b>${locs.length}</b></span></div>` +
    `<script>setTimeout(function(){try{window.focus();window.print();}catch(e){}},250);window.onafterprint=function(){setTimeout(function(){try{window.close();}catch(e){}},150);};<\/script>` +
    `</body></html>`;
  w.document.open(); w.document.write(html); w.document.close(); w.focus();
}

export default function ConsultaUbicacionesVacias() {
  const navigate = useNavigate();
  const [ubicaciones, setUbicaciones] = useState([]);
  const [familiasMaestro, setFamiliasMaestro] = useState([]);
  const [base, setBase] = useState("");
  const [zona, setZona] = useState("");
  const [familia, setFamilia] = useState("");
  const [pasillo, setPasillo] = useState("");
  const [modulo, setModulo] = useState("");
  const [nivel, setNivel] = useState("");
  const [rack, setRack] = useState("");
  const [texto, setTexto] = useState("");
  const [soloRack, setSoloRack] = useState(true); // ocultar áreas de piso
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [sel, setSel] = useState({});
  const [necesito, setNecesito] = useState("");
  const [modo, setModo] = useState("vacias"); // "vacias" | "ocupadas"
  const [stock, setStock] = useState([]);

  useEffect(() => {
    getUbicaciones().then((u) => setUbicaciones(Array.isArray(u) ? u : [])).catch(() => setUbicaciones([]));
    getMateriales()
      .then((m) => setFamiliasMaestro([...new Set((m || []).map((x) => String(x.familia || "").trim()).filter(Boolean))]))
      .catch(() => setFamiliasMaestro([]));
    getMovimientosLayoutStock()
      .then((s) => setStock(Array.isArray(s) ? s : []))
      .catch(() => setStock([]));
  }, []);

  // Mapa código de ubicación -> registro maestro (para base/zona/familia).
  const ubicMap = useMemo(() => {
    const m = new Map();
    (ubicaciones || []).forEach((u) => m.set(codeUbic(u), u));
    return m;
  }, [ubicaciones]);

  // Ubicaciones OCUPADAS: una fila por material/lote almacenado (varios
  // materiales por ubicación se ven como varias filas de la misma ubicación).
  const ocupadas = useMemo(() => {
    const map = new Map();
    (stock || []).forEach((s) => {
      const cant = Number(s.cantidad ?? s.cantidad_r ?? 0);
      if (cant <= 0) return;
      const code = String(s.ubicacion || "").toUpperCase();
      if (!code) return;
      const fv = String(s.fecha_vencimiento || "").slice(0, 10);
      const key = `${code}|${s.codigo_material}|${s.lote_almacen || ""}|${fv}`;
      if (!map.has(key)) {
        const u = ubicMap.get(code) || {};
        map.set(key, {
          id: key,
          ubicacion: code,
          ubicacion_base: u.ubicacion_base || "",
          zona: u.zona || "",
          familias: u.familias || "",
          bodega: u.bodega || s.bodega || "",
          codigo: s.codigo_material || "",
          descripcion: s.descripcion_material || "",
          lote: s.lote_almacen || s.lote_proveedor || "",
          fv,
          cantidad: 0,
        });
      }
      map.get(key).cantidad += cant;
    });
    let arr = Array.from(map.values()).filter((u) => {
      if (soloRack && !esRack(u)) return false;
      if (base && String(u.ubicacion_base || "").trim() !== base) return false;
      if (zona && String(u.zona || "").trim() !== zona) return false;
      if (pasillo && pasilloDe(u) !== pasillo) return false;
      if (rack && String(rackDe(u)) !== rack) return false;
      if (modulo && moduloDe(u) !== modulo) return false;
      if (nivel && nivelDe(u) !== nivel) return false;
      if (texto) {
        const t = texto.toLowerCase();
        if (
          !(`${u.ubicacion} ${u.zona} ${u.bodega} ${u.codigo} ${u.descripcion} ${u.lote}`
            .toLowerCase()
            .includes(t))
        )
          return false;
      }
      return true;
    });
    const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 9999; };
    arr.sort((a, b) => {
      const ra = rackDe(a); const rb = rackDe(b);
      if (ra != null && rb != null && ra !== rb) return ra - rb;
      if (ra != null && rb == null) return -1;
      if (ra == null && rb != null) return 1;
      if (num(moduloDe(a)) !== num(moduloDe(b))) return num(moduloDe(a)) - num(moduloDe(b));
      if (num(nivelDe(a)) !== num(nivelDe(b))) return num(nivelDe(a)) - num(nivelDe(b));
      const ca = columnaDe(a); const cb = columnaDe(b);
      if (ca != null && cb != null && ca !== cb) return ca - cb;
      return String(a.codigo).localeCompare(String(b.codigo));
    });
    return arr;
  }, [stock, ubicMap, soloRack, base, zona, pasillo, rack, modulo, nivel, texto]);

  const scope = useMemo(
    () => (ubicaciones || []).filter(
      (u) => (!base || String(u.ubicacion_base || "").trim() === base) && (!zona || String(u.zona || "").trim() === zona)
    ),
    [ubicaciones, base, zona]
  );
  const opt = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  const bases = useMemo(() => opt((ubicaciones || []).map((u) => String(u.ubicacion_base || "").trim())), [ubicaciones]);
  const zonas = useMemo(() => opt((ubicaciones || []).filter((u) => !base || String(u.ubicacion_base || "").trim() === base).map((u) => String(u.zona || "").trim())), [ubicaciones, base]);
  const familias = useMemo(
    () => opt([
      ...scope.flatMap((u) => String(u.familias || "").split(/[,;/]/).map((x) => x.trim())),
      ...familiasMaestro,
    ]),
    [scope, familiasMaestro]
  );
  // Al elegir una base, la zona por defecto es la que le corresponde (misma
  // numeración): base 300 -> zona 300 / "ZONA 300".
  const zonaParaBase = (b) => {
    const base0 = String(b || "").trim();
    if (!base0) return "";
    const zs = [...new Set(
      (ubicaciones || [])
        .filter((u) => String(u.ubicacion_base || "").trim() === base0)
        .map((u) => String(u.zona || "").trim())
        .filter(Boolean)
    )];
    if (!zs.length) return "";
    const num = base0.replace(/\D/g, "");
    return (
      zs.find((z) => z.replace(/\D/g, "") === num) ||
      zs.find((z) => z.includes(base0)) ||
      (zs.length === 1 ? zs[0] : "")
    );
  };

  const pasillos = useMemo(() => opt(scope.map(pasilloDe)), [scope]);
  const modulos = useMemo(() => opt(scope.map(moduloDe)), [scope]);
  const niveles = useMemo(() => opt(scope.map(nivelDe)), [scope]);
  const racks = useMemo(
    () => opt(scope.map((u) => { const r = rackDe(u); return r == null ? "" : String(r); })),
    [scope]
  );

  const filtrar = (arr) => {
    // ¿Las ubicaciones traen familia asignada? Si ninguna la tiene, el filtro de
    // familia no aplica (para no vaciar la lista). Cuando cargues la familia en
    // el maestro de ubicaciones, el filtro pasa a ser estricto automáticamente.
    const hayFamiliaEnUbic = arr.some((u) => String(u.familias || "").trim());
    return arr.filter((u) => {
      if (soloRack && !esRack(u)) return false;
      if (familia && hayFamiliaEnUbic && !String(u.familias || "").toUpperCase().includes(familia.toUpperCase())) return false;
      if (pasillo && pasilloDe(u) !== pasillo) return false;
      if (rack && String(rackDe(u)) !== rack) return false;
      if (modulo && moduloDe(u) !== modulo) return false;
      if (nivel && nivelDe(u) !== nivel) return false;
      if (texto) {
        const t = texto.toLowerCase();
        if (!(`${u.ubicacion || ""} ${u.zona || ""} ${u.bodega || ""} ${u.familias || ""}`.toLowerCase().includes(t))) return false;
      }
      return true;
    }).sort((a, b) => {
      // Orden: RACK → MÓDULO → NIVEL → posición (columna). Así, dentro de un
      // rack, las posiciones del mismo módulo y nivel quedan juntas y en
      // secuencia (ej. módulo 1 · nivel 3 · sus posiciones seguidas).
      const num = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 9999; };
      const ra = rackDe(a); const rb = rackDe(b);
      if (ra != null && rb != null && ra !== rb) return ra - rb;
      if (ra != null && rb == null) return -1;
      if (ra == null && rb != null) return 1;
      const ma = num(moduloDe(a)); const mb = num(moduloDe(b));
      if (ma !== mb) return ma - mb;
      const na = num(nivelDe(a)); const nb = num(nivelDe(b));
      if (na !== nb) return na - nb;
      const ca = columnaDe(a); const cb = columnaDe(b);
      if (ca != null && cb != null && ca !== cb) return ca - cb;
      return String(a.ubicacion || "").localeCompare(String(b.ubicacion || ""), undefined, { numeric: true });
    });
  };

  const consultar = async () => {
    setLoading(true); setBuscado(true); setSel({});
    try {
      const vac = await getUbicacionesVacias(base || null, zona || null);
      setLista(filtrar(vac || []));
    } catch (e) {
      showWmsAlert("Error consultando ubicaciones vacías:\n" + (e?.message || e));
      setLista([]);
    } finally { setLoading(false); }
  };

  const seleccionadas = lista.filter((u) => sel[u.id]);
  const toggle = (id) => setSel((p) => ({ ...p, [id]: !p[id] }));
  const seleccionarN = () => {
    const n = Math.max(0, parseInt(necesito, 10) || 0);
    const next = {};
    lista.slice(0, n).forEach((u) => { next[u.id] = true; });
    setSel(next);
    if (n > lista.length) showWmsAlert(`Solo hay ${lista.length} ubicación(es) vacía(s) con esos filtros; se seleccionaron todas.`);
  };
  const usadas = () => (seleccionadas.length ? seleccionadas : lista);

  const inputStyle = { height: 36, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: "#fff", fontWeight: 600, fontSize: 13, minWidth: 120 };
  const btn = (bg, brd) => ({ height: 38, padding: "0 14px", borderRadius: 8, border: `1px solid ${brd || bg}`, background: bg, color: bg === "#fff" ? colors.navy : "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 });

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)} style={{ ...btn("#fff", colors.border), marginBottom: 12 }}><ArrowLeft size={16} /> Volver</button>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        <div style={{ background: colors.navy, color: "#fff", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, fontWeight: 800, flexWrap: "wrap" }}>
          <MapPin size={18} /> Ubicaciones
          <div style={{ flex: 1 }} />
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,.14)", borderRadius: 10, padding: 3, gap: 3 }}>
            {[["vacias", "Vacías", MapPin], ["ocupadas", "Ocupadas", Boxes]].map(([val, lab, Icon]) => (
              <button
                key={val}
                onClick={() => setModo(val)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 800, fontSize: 13,
                  background: modo === val ? "#fff" : "transparent",
                  color: modo === val ? colors.navy : "#fff",
                }}
              >
                <Icon size={15} /> {lab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            {[["BASE", base, setBase, bases, (v) => { setBase(v); setZona(zonaParaBase(v)); }],
              ["ZONA", zona, setZona, zonas],
              ["FAMILIA", familia, setFamilia, familias],
              ["PASILLO", pasillo, setPasillo, pasillos, null, "Pasillo "],
              ["RACK", rack, setRack, racks, null, "Rack "],
              ["MÓDULO", modulo, setModulo, modulos, null, "Módulo "],
              ["NIVEL", nivel, setNivel, niveles, null, "Nivel "]].map(([lab, val, set, opts, custom, pref]) => (
              <div key={lab}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>{lab}</div>
                <select value={val} onChange={(e) => (custom ? custom(e.target.value) : set(e.target.value))} style={inputStyle}>
                  <option value="">Todas</option>
                  {opts.map((o) => <option key={o} value={o}>{pref ? pref + o : o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, marginBottom: 4 }}>TEXTO</div>
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar…" style={inputStyle} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: colors.text, height: 36, whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={soloRack} onChange={(e) => setSoloRack(e.target.checked)} />
              Solo posiciones de rack
            </label>
            <button onClick={consultar} disabled={loading} style={btn(colors.blue)}><Search size={15} /> {loading ? "Buscando…" : "Consultar"}</button>
          </div>

          {modo === "vacias" && buscado && !loading && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: colors.text }}><b>{lista.length}</b> ubicación(es) vacía(s) · <b style={{ color: colors.blue }}>{seleccionadas.length}</b> seleccionada(s)</div>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: colors.muted }}>Necesito</span>
                <input value={necesito} onChange={(e) => setNecesito(e.target.value.replace(/\D/g, ""))} placeholder="N" style={{ ...inputStyle, width: 70, minWidth: 70 }} />
                <button onClick={seleccionarN} style={btn("#fff", colors.blue)}>Seleccionar N estratégicas</button>
                <button onClick={() => imprimirRotulos(usadas())} disabled={!lista.length} style={btn(colors.navy)}><Printer size={15} /> Imprimir rótulos</button>
                <button onClick={() => imprimirInforme(usadas(), { base, zona, familia, pasillo, rack, modulo, nivel })} disabled={!lista.length} style={btn(colors.good)}><FileText size={15} /> Imprimir informe</button>
              </div>

              {lista.length === 0 ? (
                <div style={{ padding: 16, color: colors.muted, fontWeight: 600 }}>No hay ubicaciones vacías con esos filtros.</div>
              ) : (
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: "auto", maxHeight: 460 }}>
                  <table className="table-tools-skip" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["", "Ubicación", "Base", "Zona", "Pasillo", "Rack", "Módulo", "Nivel", "Familia", "Bodega", ""].map((h, i) => (
                          <th key={i} style={{ position: "sticky", top: 0, background: colors.blue, color: "#fff", fontSize: 12, textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((u) => (
                        <tr key={u.id} style={{ background: sel[u.id] ? "#eef4ff" : "#fff" }}>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}` }}>
                            <input type="checkbox" checked={!!sel[u.id]} onChange={() => toggle(u.id)} />
                          </td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, fontWeight: 800, color: colors.blue }}>{codeUbic(u)}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}` }}>{u.ubicacion_base || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}` }}>{u.zona || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center" }}>{pasilloDe(u) || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center", fontWeight: 800, color: colors.navy }}>{rackDe(u) ?? "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center" }}>{moduloDe(u) || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center" }}>{nivelDe(u) || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}` }}>{u.familias || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}` }}>{u.bodega || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}` }}>
                            <button onClick={() => imprimirRotulos([u])} title="Imprimir rótulo" style={{ ...btn(colors.navy), height: 28, padding: "0 8px", fontSize: 11 }}><Printer size={13} /> Rótulo</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {modo === "ocupadas" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: colors.text, marginBottom: 10 }}>
                <b>{ocupadas.length}</b> registro(s) ocupado(s){" "}
                <span style={{ color: colors.muted }}>
                  (una ubicación puede tener varios materiales)
                </span>
              </div>
              {ocupadas.length === 0 ? (
                <div style={{ padding: 16, color: colors.muted, fontWeight: 600 }}>
                  No hay ubicaciones ocupadas con esos filtros.
                </div>
              ) : (
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: "auto", maxHeight: 520 }}>
                  <table className="table-tools-skip" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Ubicación", "Rack", "Módulo", "Nivel", "Código", "Descripción", "Lote", "Vencimiento", "Cantidad"].map((h, i) => (
                          <th key={i} style={{ position: "sticky", top: 0, background: colors.navy, color: "#fff", fontSize: 12, textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ocupadas.map((u) => (
                        <tr key={u.id}>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, fontWeight: 800, color: colors.blue, whiteSpace: "nowrap" }}>{u.ubicacion}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center", fontWeight: 800, color: colors.navy }}>{rackDe(u) ?? "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center" }}>{moduloDe(u) || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center" }}>{nivelDe(u) || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, fontWeight: 800, color: colors.navy, whiteSpace: "nowrap" }}>{u.codigo || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}` }}>{u.descripcion || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, whiteSpace: "nowrap" }}>{u.lote || "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "center" }}>{u.fv ? fmtDMY(u.fv) : "-"}</td>
                          <td style={{ padding: "6px 10px", borderBottom: `1px solid ${colors.border}`, textAlign: "right", fontWeight: 800 }}>{nfmt(u.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
