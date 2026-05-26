import { useEffect, useMemo, useState } from "react";
import { Boxes, Layers3, MapPinned, RotateCcw, Search, Warehouse } from "lucide-react";
import { getMovimientos, getUbicaciones } from "../api";

const colors = {
  navy: "#10162f",
  text: "#172033",
  muted: "#64748b",
  line: "#dbe4f0",
  soft: "#f8fbff",
  purple: "#6d28d9",
  purple2: "#8b5cf6",
  cyan: "#06b6d4",
  green: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  empty: "#e9eef8",
};

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
  const base = cleanZone(row.ubicacion_base || row.zona || locationCode(row).slice(0, 3));
  const rawPosition = String(row.posicion || locationCode(row).replace(base, "") || "").trim();
  const compact = rawPosition.replace(/\s/g, "");
  const match = compact.match(/^(\d{2})(\d)['´]?(\d{1,2})?$/);

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
    .sort((a, b) => a.module - b.module || a.depth - b.depth || b.level - a.level || a.code.localeCompare(b.code));
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
    .map(([module, rows]) => ({ module, rows }));
}

function cellColor(cell) {
  if (cell.stock > 0) return "linear-gradient(135deg, #7c3aed, #06b6d4)";
  return "linear-gradient(135deg, #f8fafc, #dbe4f0)";
}

export default function LayoutZona() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [zone, setZone] = useState("300");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    const values = new Set(["300"]);
    ubicaciones.forEach((row) => {
      const z = cleanZone(row.ubicacion_base || row.zona || locationCode(row).slice(0, 3));
      if (z) values.add(z);
    });
    return Array.from(values).sort((a, b) => Number(a) - Number(b));
  }, [ubicaciones]);

  const cells = useMemo(() => buildCells(ubicaciones, stockMap, zone), [ubicaciones, stockMap, zone]);
  const filteredCells = useMemo(() => {
    const q = normalize(query);
    if (!q) return cells;
    return cells.filter((cell) =>
      [cell.code, cell.posicion, cell.zona, cell.bodega, cell.familias]
        .map(normalize)
        .some((value) => value.includes(q))
    );
  }, [cells, query]);

  const modules = useMemo(() => groupByModule(filteredCells), [filteredCells]);
  const occupied = cells.filter((cell) => cell.stock > 0).length;
  const maxLevel = Math.max(1, ...cells.map((cell) => Number(cell.level) || 1));
  const visibleModules = modules.slice(0, 36);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroTitle}>
          <span style={styles.iconBox}><Warehouse size={22} /></span>
          <div>
            <div style={styles.eyebrow}>Layout operativo</div>
            <h1 style={styles.title}>Bodega por zona</h1>
            <p style={styles.subtitle}>Vista inicial de ubicaciones reales desde Supabase. Primer ejercicio enfocado en zona 300.</p>
          </div>
        </div>
        <button type="button" onClick={loadData} style={styles.secondaryButton}>
          <RotateCcw size={16} /> Actualizar
        </button>
      </section>

      {error && <div style={styles.error}>{error}</div>}

      <section style={styles.kpis}>
        <Kpi icon={<MapPinned size={18} />} label="Zona activa" value={zone} />
        <Kpi icon={<Boxes size={18} />} label="Ubicaciones" value={cells.length} />
        <Kpi icon={<Layers3 size={18} />} label="Niveles detectados" value={maxLevel} />
        <Kpi icon={<Warehouse size={18} />} label="Con stock" value={occupied} />
      </section>

      <section style={styles.toolbar}>
        <label style={styles.field}>
          <span>Zona</span>
          <select value={zone} onChange={(event) => { setZone(event.target.value); setSelected(null); }} style={styles.input}>
            {zones.map((item) => <option key={item} value={item}>Zona {item}</option>)}
          </select>
        </label>
        <label style={{ ...styles.field, flex: 1 }}>
          <span>Buscar ubicación</span>
          <div style={styles.searchWrap}>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. 300, 300111'01, bodega..." style={styles.searchInput} />
          </div>
        </label>
      </section>

      <section style={styles.sceneCard}>
        <div style={styles.sceneHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Render de bodega</h2>
            <p style={styles.sectionText}>Los bloques representan módulos; cada celda conserva la ubicación real para poder conectarla después con inventario, reservas y movimientos.</p>
          </div>
          <div style={styles.legend}>
            <span><i style={{ background: "#7c3aed" }} /> Ocupada</span>
            <span><i style={{ background: "#e9eef8" }} /> Libre</span>
            <span><i style={{ background: "#06b6d4" }} /> Seleccionada</span>
          </div>
        </div>

        <div style={styles.sceneOuter}>
          <div style={styles.floor}>
            <div style={styles.dockArea}>Ingreso / recibo</div>
            <div style={styles.aisleLabel}>Pasillo operativo zona {zone}</div>
            <div style={styles.rackGrid}>
              {loading ? (
                <div style={styles.emptyState}>Cargando layout desde Supabase...</div>
              ) : visibleModules.length ? (
                visibleModules.map((group) => (
                  <div key={group.module} style={styles.rackBlock}>
                    <div style={styles.moduleLabel}>M{String(group.module).padStart(2, "0")}</div>
                    <div style={styles.stack}>
                      {group.rows.slice(0, 18).map((cell) => {
                        const active = selected?.code === cell.code;
                        return (
                          <button
                            key={`${cell.code}-${cell.id}`}
                            type="button"
                            onClick={() => setSelected(cell)}
                            title={`${cell.code} · Stock ${cell.stock}`}
                            style={{
                              ...styles.cell,
                              background: active ? "linear-gradient(135deg, #06b6d4, #7c3aed)" : cellColor(cell),
                              borderColor: active ? "#0891b2" : cell.stock > 0 ? "#8b5cf6" : "#cbd5e1",
                              transform: active ? "translateY(-4px)" : undefined,
                            }}
                          >
                            <span>{cell.level}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyState}>No hay ubicaciones para la zona {zone}.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={styles.detailGrid}>
        <div style={styles.detailCard}>
          <h3 style={styles.cardTitle}>Ubicación seleccionada</h3>
          {selected ? (
            <div style={styles.detailRows}>
              <Detail label="Ubicación" value={selected.code} />
              <Detail label="Base" value={selected.base} />
              <Detail label="Posición" value={selected.position || selected.posicion} />
              <Detail label="Zona" value={selected.zona || `ZONA ${selected.base}`} />
              <Detail label="Bodega" value={selected.bodega || "Sin bodega"} />
              <Detail label="Stock calculado" value={selected.stock.toLocaleString("es-CO")} />
            </div>
          ) : (
            <p style={styles.sectionText}>Selecciona una celda del render para ver el detalle operativo.</p>
          )}
        </div>

        <div style={styles.detailCard}>
          <h3 style={styles.cardTitle}>Siguiente evolución</h3>
          <p style={styles.sectionText}>
            Esta base queda lista para pasar a 3D real con recorridos, AGV, zonas calientes y trazabilidad por ubicación sin depender del Excel.
          </p>
        </div>
      </section>
    </main>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div style={styles.kpi}>
      <span style={styles.kpiIcon}>{icon}</span>
      <span style={styles.kpiLabel}>{label}</span>
      <strong style={styles.kpiValue}>{value}</strong>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span>{label}</span>
      <strong>{value || "Sin dato"}</strong>
    </div>
  );
}

const styles = {
  page: {
    display: "grid",
    gap: 18,
    color: colors.text,
  },
  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 22,
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 58%, #f2eefe 100%)",
  },
  heroTitle: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: colors.purple,
    background: "#f2eefe",
    border: "1px solid #ddd6fe",
  },
  eyebrow: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.05,
    color: colors.navy,
  },
  subtitle: {
    margin: "7px 0 0",
    color: colors.muted,
    fontSize: 14,
  },
  secondaryButton: {
    border: `1px solid ${colors.line}`,
    background: "#fff",
    color: colors.navy,
    borderRadius: 8,
    padding: "11px 14px",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  error: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 8,
    padding: 14,
    fontWeight: 800,
  },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  kpi: {
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    background: "#fff",
    padding: 16,
    display: "grid",
    gap: 8,
  },
  kpiIcon: { color: colors.purple },
  kpiLabel: { color: colors.muted, fontWeight: 800, fontSize: 12 },
  kpiValue: { color: colors.navy, fontSize: 24 },
  toolbar: {
    display: "flex",
    alignItems: "end",
    gap: 12,
    border: `1px solid ${colors.line}`,
    background: "#fff",
    borderRadius: 8,
    padding: 14,
  },
  field: {
    display: "grid",
    gap: 7,
    minWidth: 180,
    color: colors.muted,
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  input: {
    height: 42,
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    padding: "0 12px",
    color: colors.navy,
    fontWeight: 800,
    background: "#fff",
  },
  searchWrap: {
    height: 42,
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    background: "#fff",
    color: colors.muted,
  },
  searchInput: {
    border: 0,
    outline: 0,
    width: "100%",
    color: colors.navy,
    fontWeight: 700,
    background: "transparent",
  },
  sceneCard: {
    border: `1px solid ${colors.line}`,
    borderRadius: 8,
    background: "#fff",
    overflow: "hidden",
  },
  sceneHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 18,
    borderBottom: `1px solid ${colors.line}`,
  },
  sectionTitle: {
    margin: 0,
    color: colors.navy,
    fontSize: 20,
  },
  sectionText: {
    margin: "6px 0 0",
    color: colors.muted,
    fontSize: 14,
    lineHeight: 1.5,
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: colors.muted,
    fontSize: 12,
    fontWeight: 800,
    flexWrap: "wrap",
  },
  sceneOuter: {
    overflow: "auto",
    background: "linear-gradient(180deg, #f8fbff 0%, #edf4ff 100%)",
  },
  floor: {
    minHeight: 520,
    minWidth: 980,
    padding: "44px 38px 70px",
    position: "relative",
    background:
      "radial-gradient(circle at 78% 20%, rgba(124, 58, 237, 0.12), transparent 30%), linear-gradient(135deg, rgba(255,255,255,.9), rgba(226,232,240,.7))",
  },
  dockArea: {
    position: "absolute",
    left: 38,
    bottom: 22,
    width: 190,
    height: 64,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "rgba(255,255,255,.78)",
    display: "grid",
    placeItems: "center",
    color: colors.muted,
    fontWeight: 900,
  },
  aisleLabel: {
    position: "absolute",
    right: 34,
    bottom: 28,
    color: colors.purple,
    fontWeight: 900,
    fontSize: 13,
  },
  rackGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(64px, 1fr))",
    gap: 14,
    transform: "skewY(-6deg)",
    transformOrigin: "center",
  },
  rackBlock: {
    display: "grid",
    gap: 8,
    alignContent: "start",
    padding: 8,
    border: "1px solid rgba(124,58,237,.18)",
    borderRadius: 8,
    background: "rgba(255,255,255,.64)",
    boxShadow: "0 20px 34px rgba(16, 22, 47, 0.08)",
  },
  moduleLabel: {
    textAlign: "center",
    color: colors.navy,
    fontSize: 10,
    fontWeight: 900,
    transform: "skewY(6deg)",
  },
  stack: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 18px)",
    gridAutoRows: 18,
    gap: 4,
    justifyContent: "center",
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 3,
    border: "1px solid #cbd5e1",
    padding: 0,
    cursor: "pointer",
    boxShadow: "inset -4px -5px 8px rgba(15, 23, 42, 0.13), 0 7px 10px rgba(15, 23, 42, 0.08)",
    transition: "transform .15s ease, border-color .15s ease",
  },
  emptyState: {
    gridColumn: "1 / -1",
    minHeight: 280,
    display: "grid",
    placeItems: "center",
    color: colors.muted,
    fontWeight: 900,
    transform: "skewY(6deg)",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1.1fr .9fr",
    gap: 14,
  },
  detailCard: {
    border: `1px solid ${colors.line}`,
    background: "#fff",
    borderRadius: 8,
    padding: 18,
  },
  cardTitle: {
    margin: "0 0 12px",
    color: colors.navy,
    fontSize: 18,
  },
  detailRows: {
    display: "grid",
    gap: 8,
  },
  detailRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: `1px solid ${colors.line}`,
    padding: "8px 0",
    color: colors.muted,
    fontSize: 14,
  },
};
