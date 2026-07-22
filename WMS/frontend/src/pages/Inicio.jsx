import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Boxes,
  ClipboardList,
  DollarSign,
  MapPin,
  Tag,
  Users,
} from "lucide-react";
import { countRows, empresaId, selectRows, supabaseEnabled } from "../supabaseRest";

const colors = {
  ink: "#111827",
  muted: "#64748b",
  line: "#e6edf7",
  violet: "#7c3aed",
  blue: "#38bdf8",
  sky: "#60a5fa",
  good: "#22c55e",
  warn: "#f59e0b",
  bad: "#ef4444",
};

const quickActions = [
  { label: "Nuevo material", to: "/datos-maestros/materiales", icon: Boxes },
  { label: "Nuevo proveedor", to: "/datos-maestros/proveedores", icon: Users },
  { label: "Nueva ubicacion", to: "/datos-maestros/ubicaciones", icon: MapPin },
  { label: "Registrar movimiento", to: "/movimientos/recibo", icon: ArrowRightLeft },
  { label: "Generar rótulo", to: "/datos-maestros/rotulos", icon: Tag },
  { label: "Consulta", to: "/stock", icon: ClipboardList },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getFirst(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return "";
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-CO").format(toNumber(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function todayKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function dateKey(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function movementType(row) {
  return String(getFirst(row, ["tipo", "tipo_movimiento", "movimiento", "clase"]) || "").toLowerCase();
}

function movementQty(row) {
  return Math.abs(toNumber(getFirst(row, ["cantidad", "qty", "cantidad_movimiento", "unidades"])));
}

function movementDate(row) {
  return getFirst(row, ["fecha", "created_at", "fecha_movimiento", "updated_at"]);
}

function materialStock(row) {
  return toNumber(getFirst(row, ["stock", "stock_actual", "cantidad", "cantidad_actual", "existencia"]));
}

function hasStockField(row) {
  return ["stock", "stock_actual", "cantidad", "cantidad_actual", "existencia"].some(
    (key) => row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== ""
  );
}

function materialMinStock(row) {
  return toNumber(getFirst(row, ["stock_minimo", "minimo", "stock_min"]));
}

function isMaterialCritical(row) {
  const status = String(getFirst(row, ["criticidad", "estado_stock", "estado", "clasificacion"]) || "").toLowerCase();
  if (status.includes("critico") || status.includes("crítico")) return true;
  const min = materialMinStock(row);
  return hasStockField(row) && min > 0 && materialStock(row) <= min;
}

function isMaterialNoStock(row) {
  return hasStockField(row) && materialStock(row) <= 0;
}

function isMaterialLowStock(row) {
  const stock = materialStock(row);
  const min = materialMinStock(row);
  return hasStockField(row) && stock > 0 && min > 0 && stock <= min;
}

function materialValue(row) {
  const qty = materialStock(row);
  const unit = toNumber(getFirst(row, ["valor_unitario", "precio", "costo", "costo_unitario"]));
  return qty * unit;
}

async function fetchTable(table, limit = 5000) {
  if (!supabaseEnabled) return [];
  return selectRows("wms", table, {
    empresa_id: `eq.${empresaId}`,
    select: "*",
    limit: String(limit),
  });
}

async function safeFetch(table, limit) {
  try {
    return await fetchTable(table, limit);
  } catch (error) {
    console.warn(`No se pudo cargar ${table}`, error);
    return [];
  }
}
async function safeCount(table) {
  try {
    return await countRows("wms", table, { empresa_id: `eq.${empresaId}` });
  } catch (error) {
    console.warn(`No se pudo contar ${table}`, error);
    return null;
  }
}
export default function Inicio() {
  const [data, setData] = useState({
    materiales: [],
    proveedores: [],
    ubicaciones: [],
    movimientos: [],
    rotulos: [],
  });
  const [counts, setCounts] = useState({
    materiales: null,
    proveedores: null,
    ubicaciones: null,
    movimientos: null,
    rotulos: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const [
        materiales,
        proveedores,
        ubicaciones,
        movimientos,
        rotulos,
        materialCount,
        providerCount,
        locationCount,
        movementCount,
        rotuloCount,
      ] = await Promise.all([
        safeFetch("materiales", 8000),
        safeFetch("proveedores", 8000),
        safeFetch("ubicaciones", 8000),
        safeFetch("movimientos", 8000),
        safeFetch("rotulos", 8000),
        safeCount("materiales"),
        safeCount("proveedores"),
        safeCount("ubicaciones"),
        safeCount("movimientos"),
        safeCount("rotulos"),
      ]);

      if (active) {
        setData({ materiales, proveedores, ubicaciones, movimientos, rotulos });
        setCounts({
          materiales: materialCount,
          proveedores: providerCount,
          ubicaciones: locationCount,
          movimientos: movementCount,
          rotulos: rotuloCount,
        });
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const dashboard = useMemo(() => {
    const { materiales, proveedores, ubicaciones, movimientos, rotulos } = data;
    const today = todayKey();
    const movementToday = movimientos.filter((row) => dateKey(movementDate(row)) === today);
    const inventoryValue = materiales.reduce((sum, row) => sum + materialValue(row), 0);
    const noStock = materiales.filter(isMaterialNoStock).length;
    const lowStock = materiales.filter(isMaterialLowStock).length;
    const critical = materiales.filter(isMaterialCritical).length;

    const movementSeries = Array.from({ length: 7 }, (_, index) => {
      const key = todayKey(index - 6);
      const rows = movimientos.filter((row) => dateKey(movementDate(row)) === key);
      return {
        day: key.slice(5),
        entradas: rows
          .filter((row) => movementType(row).includes("entrada") || movementType(row).includes("recibo"))
          .reduce((sum, row) => sum + movementQty(row), 0),
        salidas: rows
          .filter((row) => movementType(row).includes("salida") || movementType(row).includes("despacho"))
          .reduce((sum, row) => sum + movementQty(row), 0),
      };
    });

    const byLocationMap = ubicaciones.reduce((acc, row) => {
      const label = getFirst(row, ["bodega", "zona", "ubicacion_base", "ubicacion"]) || "Sin clasificar";
      acc.set(label, (acc.get(label) || 0) + 1);
      return acc;
    }, new Map());

    const locationRows = [...byLocationMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);

    const recentMovements = [...movimientos]
      .sort((a, b) => new Date(movementDate(b) || 0) - new Date(movementDate(a) || 0))
      .slice(0, 4);

    return {
      materialCount: counts.materiales ?? materiales.length,
      providerCount: counts.proveedores ?? proveedores.length,
      locationCount: counts.ubicaciones ?? ubicaciones.length,
      movementTodayCount: movementToday.length,
      inventoryValue,
      rotuloCount: counts.rotulos ?? rotulos.length,
      noStock,
      lowStock,
      critical,
      movementSeries,
      locationRows,
      recentMovements,
    };
  }, [data, counts]);

  const metricCards = [
    { title: "Materiales registrados", value: formatNumber(dashboard.materialCount), icon: Boxes, tone: colors.violet },
    { title: "Proveedores activos", value: formatNumber(dashboard.providerCount), icon: Users, tone: colors.violet },
    { title: "Ubicaciones", value: formatNumber(dashboard.locationCount), icon: MapPin, tone: colors.sky },
    { title: "Movimientos hoy", value: formatNumber(dashboard.movementTodayCount), icon: ArrowRightLeft, tone: colors.violet },
    { title: "Valor de inventario", value: formatCurrency(dashboard.inventoryValue), icon: DollarSign, tone: colors.violet },
    { title: "Rótulos generados", value: formatNumber(dashboard.rotuloCount), icon: Tag, tone: colors.violet },
  ];

  return (
    <div className="wms-dashboard">
      <div className="metric-grid">
        {metricCards.map((card) => (
          <MetricCard key={card.title} {...card} loading={loading} />
        ))}
      </div>

      <section className="dashboard-grid-main">
        <Panel title="Movimientos recientes" action="Últimos 7 días">
          <div className="chart-box">
            <LineChart data={dashboard.movementSeries} />
          </div>
        </Panel>

        <Panel title="Almacenamiento por ubicación" action="Base actual">
          <div className="storage-panel">
            <DonutChart data={dashboard.locationRows} total={dashboard.locationCount} />
            <div className="storage-list">
              <strong>{formatNumber(dashboard.locationCount)}</strong>
              <span>Total ubicaciones</span>
              {dashboard.locationRows.length ? (
                dashboard.locationRows.map((row, index) => (
                  <div className="storage-row" key={row.name}>
                    <i style={{ background: [colors.violet, colors.sky, "#93c5fd", "#a5b4fc"][index % 4] }} />
                    <span>{row.name}</span>
                    <b>{formatNumber(row.value)}</b>
                  </div>
                ))
              ) : (
                <Empty text="No hay ubicaciones registradas." />
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Accesos rápidos" action="WMS">
          <div className="quick-grid">
            {quickActions.map((item) => (
              <QuickAction key={item.label} item={item} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="dashboard-grid-bottom">
        <Panel title="Últimos movimientos" action="Ver todos">
          <div className="movement-list">
            {dashboard.recentMovements.length ? (
              dashboard.recentMovements.map((row, index) => {
                const type = movementType(row);
                const isOut = type.includes("salida") || type.includes("despacho");
                return (
                  <div className="movement-row" key={row.id || index}>
                    <span className={isOut ? "movement-icon out" : "movement-icon in"}>
                      {isOut ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                    </span>
                    <div>
                      <strong>{getFirst(row, ["descripcion", "material", "codigo_material", "codigo"]) || "Movimiento"}</strong>
                      <small>{dateKey(movementDate(row)) || "Sin fecha"}</small>
                    </div>
                    <b className={isOut ? "negative" : "positive"}>{isOut ? "-" : "+"}{formatNumber(movementQty(row))}</b>
                  </div>
                );
              })
            ) : (
              <Empty text="Aún no hay movimientos registrados." />
            )}
          </div>
        </Panel>

        <Panel title="Resumen de stock" action="Ver detalle">
          <SummaryRow label="Materiales criticos" value={dashboard.critical} tone="bad" />
          <SummaryRow label="Stock bajo" value={dashboard.lowStock} tone="warn" />
          <SummaryRow label="Sin stock" value={dashboard.noStock} tone="bad" />
          <SummaryRow label="Total SKUs" value={dashboard.materialCount} tone="blue" />
        </Panel>

        <Panel title="Tareas pendientes" action="Base actual">
          <div className="task-list">
            {dashboard.critical > 0 ? (
              <>
                <TaskRow label="Revisar materiales sin stock" priority="Alta" value={dashboard.noStock} />
                <TaskRow label="Validar stock bajo" priority="Media" value={dashboard.lowStock} />
              </>
            ) : (
              <Empty text="No hay tareas generadas por la base actual." />
            )}
          </div>
        </Panel>

        <Panel title="Alertas y notificaciones" action="Ver todas">
          <AlertRow
            tone="bad"
            title={`${formatNumber(dashboard.noStock)} materiales sin stock`}
            text="Requieren revisión operativa."
          />
          <AlertRow
            tone="warn"
            title={`${formatNumber(dashboard.lowStock)} materiales con stock bajo`}
            text="Por debajo del mínimo registrado."
          />
        </Panel>
      </section>

      <style>{css}</style>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, tone, loading }) {
  return (
    <article className="metric-card">
      <div>
        <span>{title}</span>
        <strong>{loading ? "..." : value}</strong>
        <small>Datos desde el sistema</small>
      </div>
      <div className="metric-icon" style={{ color: tone }}>
        <Icon size={26} />
      </div>
    </article>
  );
}

function QuickAction({ item }) {
  const Icon = item.icon;
  return (
    <Link className="quick-action" to={item.to}>
      <Icon size={25} />
      <span>{item.label}</span>
    </Link>
  );
}

function LineChart({ data }) {
  const width = 520;
  const height = 210;
  const padding = 24;
  const max = Math.max(1, ...data.flatMap((row) => [row.entradas, row.salidas]));

  const points = (key) =>
    data
      .map((row, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(1, data.length - 1);
        const y = height - padding - (toNumber(row[key]) / max) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="line-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Movimientos últimos 7 días">
        {[0, 1, 2, 3].map((row) => {
          const y = padding + (row * (height - padding * 2)) / 3;
          return <line key={row} x1={padding} x2={width - padding} y1={y} y2={y} className="chart-grid-line" />;
        })}
        <polyline points={points("entradas")} className="chart-line in" />
        <polyline points={points("salidas")} className="chart-line out" />
        {data.map((row, index) => {
          const x = padding + (index * (width - padding * 2)) / Math.max(1, data.length - 1);
          const yIn = height - padding - (toNumber(row.entradas) / max) * (height - padding * 2);
          const yOut = height - padding - (toNumber(row.salidas) / max) * (height - padding * 2);
          return (
            <g key={row.day}>
              <circle cx={x} cy={yIn} r="4" className="chart-dot in" />
              <circle cx={x} cy={yOut} r="4" className="chart-dot out" />
              <text x={x} y={height - 4} textAnchor="middle" className="chart-label">{row.day}</text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span><i className="in" />Entradas</span>
        <span><i className="out" />Salidas</span>
      </div>
    </div>
  );
}

function DonutChart({ data, total }) {
  const palette = [colors.violet, colors.sky, "#93c5fd", "#a5b4fc"];
  const safeTotal = Math.max(1, total);
  let offset = 25;

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 120 120" role="img" aria-label="Ubicaciones por grupo">
        <circle cx="60" cy="60" r="42" fill="none" stroke="#eef2ff" strokeWidth="18" />
        {data.map((row, index) => {
          const dash = (toNumber(row.value) / safeTotal) * 100;
          const circle = (
            <circle
              key={row.name}
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke={palette[index % palette.length]}
              strokeWidth="18"
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
              pathLength="100"
            />
          );
          offset -= dash;
          return circle;
        })}
      </svg>
      <div>
        <strong>{formatNumber(total)}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <article className="dash-panel">
      <header>
        <h2>{title}</h2>
        <span>{action}</span>
      </header>
      {children}
    </article>
  );
}

function SummaryRow({ label, value, tone }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <b className={tone}>{formatNumber(value)}</b>
    </div>
  );
}

function TaskRow({ label, priority, value }) {
  return (
    <div className="task-row">
      <i />
      <span>{label}</span>
      <b>{priority}</b>
      <small>{formatNumber(value)}</small>
    </div>
  );
}

function AlertRow({ tone, title, text }) {
  return (
    <div className="alert-row">
      <span className={tone}>
        <AlertTriangle size={18} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty-state">{text}</div>;
}

const css = `
.wms-dashboard {
  min-height: 100%;
  padding: 22px;
  display: grid;
  gap: 22px;
  color: ${colors.ink};
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 18px;
}
.metric-card,
.dash-panel {
  border: 1px solid rgba(226,232,240,.92);
  background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,251,255,.94));
  box-shadow: 0 18px 48px rgba(15,23,42,.08);
}
.metric-card {
  min-height: 140px;
  border-radius: 18px;
  padding: 22px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
}
.metric-card span,
.dash-panel h2 {
  font-size: 13px;
  font-weight: 900;
  color: #334155;
}
.metric-card strong {
  display: block;
  margin-top: 18px;
  font-size: 31px;
  line-height: 1;
  letter-spacing: 0;
}
.metric-card small {
  display: block;
  margin-top: 14px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 750;
}
.metric-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(124,58,237,.10), rgba(96,165,250,.10));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.92);
}
.dashboard-grid-main {
  display: grid;
  grid-template-columns: 1.15fr 1.15fr 1fr;
  gap: 22px;
}
.dashboard-grid-bottom {
  display: grid;
  grid-template-columns: 1fr .82fr 1fr 1fr;
  gap: 22px;
}
.dash-panel {
  min-height: 245px;
  border-radius: 18px;
  padding: 22px;
}
.dash-panel header {
  min-height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
  margin-bottom: 16px;
}
.dash-panel h2 {
  margin: 0;
}
.dash-panel header span {
  color: #7c3aed;
  font-size: 12px;
  font-weight: 850;
}
.chart-box {
  height: 220px;
}
.line-chart-wrap {
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
}
.line-chart-wrap svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.chart-grid-line {
  stroke: #eef2f7;
  stroke-width: 1;
}
.chart-line {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.chart-line.in { stroke: ${colors.violet}; }
.chart-line.out { stroke: ${colors.blue}; }
.chart-dot {
  stroke: #fff;
  stroke-width: 2;
}
.chart-dot.in { fill: ${colors.violet}; }
.chart-dot.out { fill: ${colors.blue}; }
.chart-label {
  fill: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}
.chart-legend {
  display: flex;
  justify-content: center;
  gap: 22px;
  color: #64748b;
  font-size: 12px;
  font-weight: 850;
}
.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.chart-legend i {
  width: 9px;
  height: 9px;
  border-radius: 99px;
}
.chart-legend .in { background: ${colors.violet}; }
.chart-legend .out { background: ${colors.blue}; }
.storage-panel {
  display: flex;
  align-items: center;
  gap: 22px;
}
.donut-chart {
  position: relative;
  width: 210px;
  height: 210px;
  flex: 0 0 210px;
  display: grid;
  place-items: center;
}
.donut-chart svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.donut-chart div {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
}
.donut-chart strong {
  font-size: 28px;
}
.donut-chart span {
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 850;
}
.storage-list {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 12px;
}
.storage-list > strong {
  font-size: 28px;
}
.storage-list > span {
  margin-top: -10px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 800;
}
.storage-row {
  display: grid;
  grid-template-columns: 12px minmax(0,1fr) auto;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 13px;
  font-weight: 800;
}
.storage-row i {
  width: 9px;
  height: 9px;
  border-radius: 99px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.quick-action {
  min-height: 92px;
  display: grid;
  place-items: center;
  gap: 10px;
  text-decoration: none;
  color: #334155;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  border: 1px solid rgba(226,232,240,.86);
  font-size: 12px;
  font-weight: 900;
  text-align: center;
  transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, color .16s ease;
}
.quick-action svg {
  color: #7c3aed;
}
.quick-action:hover {
  color: #4f46e5;
  border-color: rgba(124,58,237,.22);
  box-shadow: 0 14px 34px rgba(79,70,229,.10);
  transform: translateY(-1px);
}
.movement-list,
.task-list {
  display: grid;
  gap: 13px;
}
.movement-row,
.summary-row,
.task-row,
.alert-row {
  display: grid;
  align-items: center;
  gap: 12px;
}
.movement-row {
  grid-template-columns: 42px minmax(0,1fr) auto;
}
.movement-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 13px;
}
.movement-icon.in {
  color: #7c3aed;
  background: rgba(124,58,237,.10);
}
.movement-icon.out {
  color: #2563eb;
  background: rgba(37,99,235,.10);
}
.movement-row strong,
.alert-row strong {
  display: block;
  font-size: 13px;
}
.movement-row small,
.alert-row small {
  display: block;
  margin-top: 4px;
  color: ${colors.muted};
  font-size: 12px;
  font-weight: 750;
}
.positive { color: ${colors.good}; }
.negative { color: ${colors.bad}; }
.summary-row {
  min-height: 42px;
  grid-template-columns: minmax(0,1fr) auto;
  border-bottom: 1px solid ${colors.line};
  font-size: 13px;
  font-weight: 850;
  color: #475569;
}
.summary-row:last-child {
  border-bottom: 0;
}
.summary-row .bad { color: ${colors.bad}; }
.summary-row .warn { color: ${colors.warn}; }
.summary-row .blue { color: #2563eb; }
.task-row {
  min-height: 42px;
  grid-template-columns: 18px minmax(0,1fr) auto auto;
  color: #475569;
  font-size: 13px;
  font-weight: 850;
}
.task-row i {
  width: 15px;
  height: 15px;
  border: 2px solid #cbd5e1;
  border-radius: 99px;
}
.task-row b {
  color: ${colors.bad};
  font-size: 12px;
}
.task-row small {
  color: ${colors.muted};
  font-weight: 850;
}
.alert-row {
  grid-template-columns: 44px minmax(0,1fr);
  min-height: 62px;
}
.alert-row > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
}
.alert-row > span.bad {
  color: ${colors.bad};
  background: rgba(239,68,68,.10);
}
.alert-row > span.warn {
  color: ${colors.warn};
  background: rgba(245,158,11,.12);
}
.empty-state {
  min-height: 110px;
  display: grid;
  place-items: center;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 850;
  text-align: center;
}
@media (max-width: 1500px) {
  .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .dashboard-grid-main,
  .dashboard-grid-bottom { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .wms-dashboard { padding: 14px; }
  .metric-grid { grid-template-columns: 1fr; }
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
  .storage-panel { display: grid; }
}
`;


