import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  ChevronDown,
  Compass,
  Eye,
  Layers3,
  MapPinned,
  Maximize2,
  Move3D,
  RotateCcw,
  Search,
  Truck,
  Warehouse,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { getMovimientos, getUbicaciones } from "../api";

const WMS_PURPLE = "#6d28d9";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function toNumber(value) {
  const numeric = Number(String(value ?? 0).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
}

function cleanZone(value) {
  const match = String(value || "").match(/\d+/);
  return match ? match[0] : "";
}

function locationCode(row) {
  return String(row?.ubicacion || [row?.ubicacion_base, row?.posicion].filter(Boolean).join("") || "").trim();
}

function parseLocation(row) {
  const code = locationCode(row);
  const base = cleanZone(row.ubicacion_base || row.zona || code.slice(0, 3));
  const raw = String(row.posicion || code.replace(base, "") || "").replace(/\s/g, "");
  const compact = raw.replace(/[´`]/g, "'");
  const match = compact.match(/^(\d{2})(\d)['’]?(\d{1,2})?$/);

  if (match) {
    return {
      base,
      module: Number(match[1]),
      level: Number(match[2]),
      depth: Number(match[3] || 1),
      position: compact,
    };
  }

  const nums = compact.match(/\d+/g)?.join("") || "0";
  return {
    base,
    module: Number(nums.slice(0, 2) || 0),
    level: Number(nums.slice(2, 3) || 1),
    depth: Number(nums.slice(3, 5) || 1),
    position: compact || row.posicion || "",
  };
}

function buildStock(movimientos) {
  const map = new Map();
  (movimientos || []).forEach((row) => {
    const type = normalize(row.tipo);
    const qty = toNumber(row.cantidad);
    const ubicacion = normalize(row.ubicacion_final || row.ubicacion || row.ubicacion_codigo);
    if (!ubicacion) return;
    const sign = type.includes("SALIDA") || type.includes("DESPACHO") ? -1 : 1;
    map.set(ubicacion, (map.get(ubicacion) || 0) + qty * sign);
  });
  return map;
}

function buildCells(ubicaciones, stockMap, zone) {
  return (ubicaciones || [])
    .map((row) => {
      const parsed = parseLocation(row);
      const code = locationCode(row);
      return {
        ...row,
        ...parsed,
        code,
        stock: stockMap.get(normalize(code)) || 0,
      };
    })
    .filter((row) => cleanZone(row.base) === cleanZone(zone))
    .sort((a, b) => a.module - b.module || b.level - a.level || a.depth - b.depth || a.code.localeCompare(b.code));
}

function groupByModule(cells) {
  const map = new Map();
  cells.forEach((cell) => {
    const key = cell.module || 0;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(cell);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([module, rows], index) => ({ module, rows, index }));
}

function slotTone(cell, maxStock) {
  if (cell.stock <= 0) return "empty";
  const pct = maxStock > 0 ? cell.stock / maxStock : 0;
  if (pct <= 0.25) return "low";
  if (pct <= 0.55) return "mid";
  if (pct <= 0.85) return "good";
  return "full";
}

function formatQty(value) {
  return Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => Number(a) - Number(b));
}

export default function LayoutZona() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [zone, setZone] = useState("300");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("iso");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ x: 58, z: -10 });
  const [drag, setDrag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const stageRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [ubicRows, movRows] = await Promise.all([getUbicaciones(), getMovimientos()]);
      setUbicaciones(Array.isArray(ubicRows) ? ubicRows : []);
      setMovimientos(Array.isArray(movRows) ? movRows : []);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el layout desde Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stockMap = useMemo(() => buildStock(movimientos), [movimientos]);
  const zones = useMemo(() => {
    const values = ["300"];
    ubicaciones.forEach((row) => {
      const z = cleanZone(row.ubicacion_base || row.zona || locationCode(row).slice(0, 3));
      if (z) values.push(z);
    });
    return uniqueSorted(values);
  }, [ubicaciones]);

  const cells = useMemo(() => buildCells(ubicaciones, stockMap, zone), [ubicaciones, stockMap, zone]);
  const maxStock = useMemo(() => Math.max(0, ...cells.map((cell) => cell.stock)), [cells]);
  const filteredCells = useMemo(() => {
    const q = normalize(query);
    if (!q) return cells;
    return cells.filter((cell) =>
      [cell.code, cell.position, cell.zona, cell.bodega, cell.familia, cell.familias]
        .map(normalize)
        .some((value) => value.includes(q))
    );
  }, [cells, query]);

  const modules = useMemo(() => groupByModule(filteredCells), [filteredCells]);
  const visibleModules = modules.slice(0, 42);
  const occupied = cells.filter((cell) => cell.stock > 0).length;
  const maxLevel = Math.max(1, ...cells.map((cell) => Number(cell.level) || 1));
  const available = Math.max(0, cells.length - occupied);
  const occupancy = cells.length ? Math.round((occupied / cells.length) * 100) : 0;

  function applyView(nextView) {
    setView(nextView);
    if (nextView === "iso") setRotation({ x: 58, z: -10 });
    if (nextView === "top") setRotation({ x: 72, z: 0 });
    if (nextView === "front") setRotation({ x: 18, z: 0 });
  }

  function startDrag(event) {
    if (event.button !== 0) return;
    setDrag({
      x: event.clientX,
      y: event.clientY,
      start: rotation,
    });
    stageRef.current?.setPointerCapture?.(event.pointerId);
  }

  function moveDrag(event) {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    setRotation({
      x: Math.max(18, Math.min(76, drag.start.x - dy * 0.12)),
      z: Math.max(-34, Math.min(34, drag.start.z + dx * 0.12)),
    });
  }

  function endDrag() {
    setDrag(null);
  }

  const stageStyle = {
    "--rx": `${rotation.x}deg`,
    "--rz": `${rotation.z}deg`,
    "--zoom": zoom,
  };

  return (
    <main className="layout-zone-page">
      <style>{layoutStyles}</style>

      <section className="layout-hero">
        <div>
          <span className="layout-kicker">WMS VISUAL TWIN</span>
          <h1>Layout 3D por zona</h1>
          <p>
            Render operativo conectado a Supabase: racks, modulos, niveles, ocupacion y seleccion por ubicacion real.
          </p>
        </div>
        <button type="button" className="layout-refresh" onClick={loadData}>
          <RotateCcw size={17} />
          Actualizar datos
        </button>
      </section>

      {error && <div className="layout-error">{error}</div>}

      <section className="layout-toolbar">
        <label className="layout-select">
          <span>Zona</span>
          <select value={zone} onChange={(event) => { setZone(event.target.value); setSelected(null); }}>
            {zones.map((item) => <option key={item} value={item}>Zona {item}</option>)}
          </select>
          <ChevronDown size={16} />
        </label>

        <label className="layout-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ubicacion, modulo, bodega, material..."
          />
        </label>

        <div className="layout-view-controls">
          <button type="button" className={view === "iso" ? "active" : ""} onClick={() => applyView("iso")}><Move3D size={16} /> 3D</button>
          <button type="button" className={view === "top" ? "active" : ""} onClick={() => applyView("top")}><Compass size={16} /> Superior</button>
          <button type="button" className={view === "front" ? "active" : ""} onClick={() => applyView("front")}><Eye size={16} /> Frontal</button>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.74, value - 0.08))}><ZoomOut size={16} /></button>
          <button type="button" onClick={() => setZoom((value) => Math.min(1.24, value + 0.08))}><ZoomIn size={16} /></button>
        </div>
      </section>

      <section className="layout-kpis">
        <Kpi icon={<MapPinned size={18} />} label="Zona activa" value={zone} />
        <Kpi icon={<Boxes size={18} />} label="Ubicaciones" value={cells.length} />
        <Kpi icon={<Warehouse size={18} />} label="Ocupadas" value={occupied} />
        <Kpi icon={<Layers3 size={18} />} label="Niveles" value={maxLevel} />
        <Kpi icon={<Maximize2 size={18} />} label="Ocupacion" value={`${occupancy}%`} />
      </section>

      <section className="warehouse-shell">
        <div className="warehouse-head">
          <div>
            <span>Escena operativa zona {zone}</span>
            <h2>Bodega selectiva doble profundidad</h2>
          </div>
          <div className="warehouse-legend">
            <span><i className="legend-empty" /> Libre</span>
            <span><i className="legend-low" /> Bajo</span>
            <span><i className="legend-mid" /> Medio</span>
            <span><i className="legend-good" /> Normal</span>
            <span><i className="legend-full" /> Alto</span>
            <span><i className="legend-selected" /> Seleccionada</span>
          </div>
        </div>

        <div
          ref={stageRef}
          className={`warehouse-viewport view-${view} ${drag ? "is-dragging" : ""}`}
          style={stageStyle}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="warehouse-scene">
            <div className="warehouse-floor">
              <div className="floor-grid" />
              <div className="receiving-zone">
                <Truck size={24} />
                <b>Recibo / despacho</b>
                <small>Flujo operacional</small>
              </div>
              <div className="agv-route route-a" />
              <div className="agv-route route-b" />
              <div className="agv-dot dot-a" />
              <div className="agv-dot dot-b" />

              {loading ? (
                <div className="layout-empty-state">Cargando layout desde Supabase...</div>
              ) : visibleModules.length ? (
                <div className="rack-banks">
                  <RackBank
                    title="Rack A"
                    modules={visibleModules.filter((_, index) => index % 2 === 0)}
                    selected={selected}
                    setSelected={setSelected}
                    maxStock={maxStock}
                  />
                  <div className="central-aisle">
                    <span>Pasillo operativo zona {zone}</span>
                  </div>
                  <RackBank
                    title="Rack B"
                    modules={visibleModules.filter((_, index) => index % 2 === 1)}
                    selected={selected}
                    setSelected={setSelected}
                    maxStock={maxStock}
                    mirrored
                  />
                </div>
              ) : (
                <div className="layout-empty-state">No hay ubicaciones creadas para la zona {zone}.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="layout-detail-grid">
        <article className="layout-detail-card">
          <span className="layout-kicker">Seleccion actual</span>
          <h3>{selected ? selected.code : "Ubicacion no seleccionada"}</h3>
          {selected ? (
            <div className="detail-list">
              <Detail label="Base" value={selected.base} />
              <Detail label="Modulo" value={`M${String(selected.module).padStart(2, "0")}`} />
              <Detail label="Nivel" value={selected.level} />
              <Detail label="Profundidad" value={selected.depth} />
              <Detail label="Bodega" value={selected.bodega || selected.zona || "Sin bodega"} />
              <Detail label="Stock calculado" value={formatQty(selected.stock)} />
            </div>
          ) : (
            <p>Selecciona una celda del rack para consultar el detalle operativo de la ubicacion.</p>
          )}
        </article>

        <article className="layout-detail-card">
          <span className="layout-kicker">Resumen visual</span>
          <h3>{available} libres / {occupied} ocupadas</h3>
          <p>
            Esta vista ya queda lista para evolucionar a recorridos, calor por ocupacion, rutas AGV y trazabilidad por SKU/reserva.
          </p>
        </article>
      </section>
    </main>
  );
}

function RackBank({ title, modules, selected, setSelected, maxStock, mirrored = false }) {
  return (
    <div className={`rack-bank ${mirrored ? "is-mirrored" : ""}`}>
      <div className="rack-bank-label">{title}</div>
      {modules.map((group) => (
        <RackModule
          key={group.module}
          group={group}
          selected={selected}
          setSelected={setSelected}
          maxStock={maxStock}
        />
      ))}
    </div>
  );
}

function RackModule({ group, selected, setSelected, maxStock }) {
  const levels = uniqueSorted(group.rows.map((item) => String(item.level))).sort((a, b) => Number(b) - Number(a));
  const depthGroups = uniqueSorted(group.rows.map((item) => String(item.depth))).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="rack-module">
      <div className="rack-frame">
        <div className="rack-post post-left" />
        <div className="rack-post post-right" />
        <div className="rack-beam beam-top" />
        <div className="rack-beam beam-bottom" />
        <div className="module-slots" style={{ "--levels": levels.length || 1, "--depths": depthGroups.length || 1 }}>
          {levels.map((level) =>
            depthGroups.map((depth) => {
              const cell = group.rows.find((item) => String(item.level) === String(level) && String(item.depth) === String(depth));
              if (!cell) {
                return <span key={`${level}-${depth}`} className="slot-placeholder" />;
              }
              const active = selected?.code === cell.code;
              return (
                <button
                  key={cell.code}
                  type="button"
                  className={`slot-cube tone-${slotTone(cell, maxStock)} ${active ? "is-active" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelected(cell);
                  }}
                  title={`${cell.code} | stock ${formatQty(cell.stock)}`}
                >
                  <span>{cell.level}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
      <strong>M{String(group.module).padStart(2, "0")}</strong>
      <small>{group.rows.length} posiciones</small>
    </div>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <article className="layout-kpi">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value || "Sin dato"}</strong>
    </div>
  );
}

const layoutStyles = `
.layout-zone-page {
  display: grid;
  gap: 16px;
  color: #131a2f;
  min-width: 0;
}

.layout-hero,
.layout-toolbar,
.layout-kpis,
.warehouse-shell,
.layout-detail-card {
  border: 1px solid #dfe8f5;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 18px 44px rgba(17, 24, 39, .07);
}

.layout-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  border-radius: 20px;
}

.layout-kicker {
  color: ${WMS_PURPLE};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.layout-hero h1 {
  margin: 6px 0 6px;
  font-size: 34px;
  line-height: 1;
  letter-spacing: 0;
}

.layout-hero p,
.layout-detail-card p {
  margin: 0;
  color: #5f6f8a;
  font-weight: 650;
}

.layout-refresh,
.layout-view-controls button,
.layout-select,
.layout-search {
  border: 1px solid #d8e3f2;
  background: #fff;
  color: #17213b;
  border-radius: 14px;
}

.layout-refresh,
.layout-view-controls button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  font-weight: 900;
  cursor: pointer;
}

.layout-refresh {
  color: #fff;
  border: 0;
  background: linear-gradient(135deg, #4c1d95, ${WMS_PURPLE});
  box-shadow: 0 18px 32px rgba(109, 40, 217, .22);
}

.layout-error {
  padding: 14px 16px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fff1f2;
  color: #b91c1c;
  font-weight: 800;
}

.layout-toolbar {
  display: grid;
  grid-template-columns: 190px minmax(260px, 1fr) auto;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
}

.layout-select,
.layout-search {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
}

.layout-select span {
  color: #697891;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.layout-select select,
.layout-search input {
  width: 100%;
  border: 0;
  outline: 0;
  color: #17213b;
  background: transparent;
  font-weight: 850;
}

.layout-view-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.layout-view-controls button.active {
  color: #fff;
  border-color: ${WMS_PURPLE};
  background: linear-gradient(135deg, #4c1d95, #7c3aed);
}

.layout-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border-radius: 18px;
}

.layout-kpi {
  min-height: 92px;
  display: grid;
  align-content: center;
  gap: 4px;
  padding: 16px;
  background: #fff;
}

.layout-kpi > span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: ${WMS_PURPLE};
  border-radius: 12px;
  background: #f1edff;
}

.layout-kpi small {
  color: #687792;
  font-size: 12px;
  font-weight: 850;
}

.layout-kpi strong {
  font-size: 27px;
  line-height: 1;
}

.warehouse-shell {
  overflow: hidden;
  border-radius: 22px;
}

.warehouse-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid #dfe8f5;
}

.warehouse-head span {
  color: ${WMS_PURPLE};
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.warehouse-head h2 {
  margin: 5px 0 0;
  font-size: 24px;
}

.warehouse-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.warehouse-legend span {
  color: #66758e;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.warehouse-legend i {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
}

.legend-empty { background: #e6edf7; }
.legend-low { background: #ef4444; }
.legend-mid { background: #f59e0b; }
.legend-good { background: #22c55e; }
.legend-full { background: #2563eb; }
.legend-selected { background: #d946ef; }

.warehouse-viewport {
  height: min(68vh, 720px);
  min-height: 560px;
  overflow: auto;
  background:
    radial-gradient(circle at 78% 12%, rgba(124, 58, 237, .22), transparent 28%),
    radial-gradient(circle at 12% 72%, rgba(14, 165, 233, .14), transparent 30%),
    linear-gradient(180deg, #f7fbff 0%, #eaf2fb 100%);
  cursor: grab;
  perspective: 1400px;
}

.warehouse-viewport.is-dragging {
  cursor: grabbing;
}

.warehouse-scene {
  min-width: 1460px;
  min-height: 660px;
  padding: 80px 80px 40px;
  transform-style: preserve-3d;
}

.warehouse-floor {
  position: relative;
  width: 1320px;
  height: 520px;
  margin: 0 auto;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.78), rgba(239,245,255,.88)),
    linear-gradient(90deg, rgba(148,163,184,.2) 1px, transparent 1px),
    linear-gradient(0deg, rgba(148,163,184,.2) 1px, transparent 1px);
  background-size: auto, 64px 64px, 64px 64px;
  border: 1px solid rgba(203, 213, 225, .86);
  box-shadow:
    0 44px 70px rgba(15, 23, 42, .16),
    inset 0 0 0 1px rgba(255,255,255,.62);
  transform:
    scale(var(--zoom))
    rotateX(var(--rx))
    rotateZ(var(--rz));
  transform-origin: center center;
  transform-style: preserve-3d;
  transition: transform .18s ease;
}

.floor-grid {
  position: absolute;
  inset: 18px;
  border-radius: 22px;
  border: 1px dashed rgba(109, 40, 217, .18);
}

.receiving-zone {
  position: absolute;
  left: 38px;
  bottom: 34px;
  width: 180px;
  height: 92px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 4px;
  color: #17213b;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(240,245,255,.9));
  border: 1px solid rgba(203, 213, 225, .9);
  box-shadow: 0 18px 28px rgba(15, 23, 42, .10);
  transform: translateZ(18px);
}

.receiving-zone svg {
  color: ${WMS_PURPLE};
}

.receiving-zone b {
  font-size: 13px;
}

.receiving-zone small {
  color: #66758e;
  font-weight: 750;
}

.agv-route {
  position: absolute;
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(14, 165, 233, .72), transparent);
  transform: translateZ(9px);
}

.route-a {
  left: 250px;
  right: 120px;
  top: 250px;
}

.route-b {
  width: 500px;
  left: 600px;
  top: 350px;
  transform: translateZ(9px) rotate(90deg);
  transform-origin: left center;
}

.agv-dot {
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: radial-gradient(circle, #fff 0 20%, #22d3ee 22% 55%, #0891b2 56%);
  box-shadow: 0 0 0 7px rgba(34, 211, 238, .15), 0 14px 20px rgba(8, 145, 178, .22);
  transform: translateZ(22px);
}

.dot-a { left: 420px; top: 241px; }
.dot-b { left: 900px; top: 341px; }

.rack-banks {
  position: absolute;
  inset: 58px 250px 80px 250px;
  display: grid;
  grid-template-rows: minmax(0, 1fr) 72px minmax(0, 1fr);
  gap: 18px;
  transform-style: preserve-3d;
}

.rack-bank {
  position: relative;
  display: grid;
  grid-template-columns: repeat(12, 76px);
  gap: 12px;
  align-content: center;
  transform-style: preserve-3d;
}

.rack-bank.is-mirrored {
  align-content: start;
}

.rack-bank-label {
  position: absolute;
  left: -86px;
  top: 50%;
  transform: translateY(-50%) translateZ(18px);
  color: #4c1d95;
  font-weight: 950;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.central-aisle {
  position: relative;
  border-radius: 18px;
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,.8) 0 28px, rgba(191,219,254,.7) 28px 56px),
    linear-gradient(180deg, rgba(125, 211, 252, .35), rgba(59, 130, 246, .24));
  border: 1px solid rgba(96, 165, 250, .38);
  box-shadow: inset 0 0 28px rgba(14, 165, 233, .18);
  transform: translateZ(6px);
}

.central-aisle span {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.rack-module {
  position: relative;
  height: 142px;
  transform-style: preserve-3d;
}

.rack-frame {
  position: relative;
  height: 116px;
  border-radius: 10px;
  transform-style: preserve-3d;
  background: linear-gradient(180deg, rgba(255,255,255,.92), rgba(240,245,255,.78));
  border: 1px solid rgba(203, 213, 225, .85);
  box-shadow: 0 18px 24px rgba(15, 23, 42, .10);
}

.rack-frame::after {
  content: "";
  position: absolute;
  inset: auto 6px -10px 6px;
  height: 18px;
  border-radius: 50%;
  background: rgba(15, 23, 42, .15);
  filter: blur(8px);
}

.rack-post {
  position: absolute;
  top: 6px;
  bottom: 6px;
  width: 5px;
  border-radius: 5px;
  background: linear-gradient(180deg, #06111f, #172554);
  z-index: 4;
}

.post-left { left: 6px; }
.post-right { right: 6px; }

.rack-beam {
  position: absolute;
  left: 6px;
  right: 6px;
  height: 5px;
  border-radius: 5px;
  background: linear-gradient(90deg, #fb923c, #f97316);
  z-index: 5;
}

.beam-top { top: 10px; }
.beam-bottom { bottom: 10px; }

.module-slots {
  position: absolute;
  inset: 18px 13px 17px;
  display: grid;
  grid-template-columns: repeat(var(--depths), minmax(0, 1fr));
  grid-template-rows: repeat(var(--levels), minmax(0, 1fr));
  gap: 3px;
  z-index: 6;
}

.slot-cube,
.slot-placeholder {
  min-width: 0;
  min-height: 0;
  border-radius: 4px;
}

.slot-cube {
  border: 1px solid rgba(100, 116, 139, .32);
  color: #0f172a;
  display: grid;
  place-items: center;
  padding: 0;
  font-size: 10px;
  font-weight: 950;
  cursor: pointer;
  box-shadow:
    inset -2px -3px 4px rgba(15, 23, 42, .16),
    inset 2px 2px 3px rgba(255,255,255,.85),
    0 5px 8px rgba(15, 23, 42, .08);
  transition: transform .14s ease, box-shadow .14s ease, filter .14s ease;
}

.slot-cube:hover,
.slot-cube.is-active {
  transform: translateZ(22px) scale(1.18);
  box-shadow: 0 18px 24px rgba(109, 40, 217, .25), inset 0 0 0 1px rgba(255,255,255,.7);
  filter: saturate(1.15);
  z-index: 20;
}

.slot-cube.is-active {
  color: #fff;
  border-color: #d946ef;
  background: linear-gradient(135deg, #a21caf, #d946ef) !important;
}

.tone-empty { background: linear-gradient(135deg, #f8fafc, #dbe4f0); }
.tone-low { color: #fff; background: linear-gradient(135deg, #991b1b, #ef4444); }
.tone-mid { background: linear-gradient(135deg, #f59e0b, #facc15); }
.tone-good { color: #fff; background: linear-gradient(135deg, #047857, #22c55e); }
.tone-full { color: #fff; background: linear-gradient(135deg, #1d4ed8, #60a5fa); }

.rack-module > strong,
.rack-module > small {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) translateZ(16px);
  white-space: nowrap;
}

.rack-module > strong {
  bottom: 8px;
  font-size: 11px;
  color: #111827;
}

.rack-module > small {
  bottom: -8px;
  color: #6b7280;
  font-size: 9px;
  font-weight: 800;
}

.layout-empty-state {
  position: absolute;
  inset: 120px 260px;
  display: grid;
  place-items: center;
  color: #4c1d95;
  border: 1px dashed rgba(109, 40, 217, .36);
  border-radius: 24px;
  background: rgba(255,255,255,.72);
  font-weight: 950;
  transform: translateZ(30px);
}

.layout-detail-grid {
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 14px;
}

.layout-detail-card {
  min-height: 160px;
  padding: 20px;
  border-radius: 18px;
}

.layout-detail-card h3 {
  margin: 8px 0 14px;
  font-size: 24px;
}

.detail-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.detail-row {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.detail-row span,
.detail-row strong {
  display: block;
}

.detail-row span {
  color: #64748b;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.detail-row strong {
  margin-top: 5px;
  color: #17213b;
  font-size: 15px;
}

@media (max-width: 1400px) {
  .layout-toolbar {
    grid-template-columns: 180px minmax(220px, 1fr);
  }

  .layout-view-controls {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 900px) {
  .layout-hero,
  .warehouse-head {
    align-items: stretch;
    flex-direction: column;
  }

  .layout-toolbar,
  .layout-kpis,
  .layout-detail-grid,
  .detail-list {
    grid-template-columns: 1fr;
  }

  .layout-view-controls button,
  .layout-refresh {
    flex: 1 1 130px;
  }

  .warehouse-viewport {
    min-height: 520px;
  }
}
`;
