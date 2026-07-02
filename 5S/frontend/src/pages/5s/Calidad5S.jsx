import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Trash2,
  Save,
  Printer,
  ImagePlus,
  FileDown,
  Eye,
  Download,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  Clock3,
  Database,
  Edit3,
  Filter,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Power,
  RefreshCw,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import {
  crearChecklistItem5S,
  crearBodega5S,
  crearCatalogo5S,
  crearCronograma5S,
  crearInspeccion5S,
  crearResponsable5S,
  crearSububicacion5S,
  editarCatalogo5S,
  editarChecklistItem5S,
  editarBodega5S,
  editarResponsable5S,
  editarSububicacion5S,
  eliminarCatalogo5S,
  eliminarChecklistItem5S,
  eliminarBodega5S,
  eliminarCronograma5S,
  eliminarSububicacion5S,
  getBodegas5S,
  getChecklist5S,
  getConfig5S,
  getCronograma5S,
  getDashboard5S,
  getInspecciones5S,
  getResponsables5S,
  getSububicaciones5S,
  guardarConfig5S,
} from "../../api";
import "./calidad5s.css";

const PRELOAD_IMAGES = ["/INOVA.png", "/INOVA-dark.png", "/inova-mark-dark.png", "/inova-logo.png"];

const TABS_5S = [
  { key: "portal", label: "Portal", icon: Home },
  { key: "cronograma", label: "Cronograma", icon: CalendarDays },
  { key: "inspeccion", label: "Inspección", icon: ClipboardCheck },
  { key: "responsables", label: "Responsables", icon: Users },
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "configuracion", label: "Configuración", icon: Settings },
];

function scoreLevel(score) {
  if (score >= 90) return "Óptimo";
  if (score >= 80) return "Atención";
  return "Crítico";
}

function reportStatus(score) {
  if (score >= 90) return "status-ok";
  if (score >= 80) return "status-warning";
  return "status-critical";
}

function preloadImages(sources) {
  if (typeof window === "undefined") return Promise.resolve();

  return Promise.all(
    sources.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    )
  );
}

function useViewport() {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

function getConfig(width) {
  const isMobile = width <= 760;
  const isTablet = width > 760 && width <= 1180;

  return {
    isMobile,
    isTablet,
    scale: isMobile ? 1 : isTablet ? 0.92 : 0.82,
    headerHeight: isMobile ? 68 : isTablet ? 78 : 78,
    sidebarCollapsed: isMobile ? 0 : isTablet ? 76 : 86,
    sidebarExpanded: isMobile ? Math.min(width * 0.86, 330) : isTablet ? 282 : 300,
    gap: isMobile ? 10 : isTablet ? 14 : 18,
  };
}

function LogoImage({ className = "", tone = "light" }) {
  return (
    <img
      src={tone === "dark" ? "/INOVA-dark.png" : "/INOVA.png"}
      alt="INOVA"
      className={className}
      loading="eager"
      decoding="sync"
      fetchPriority="high"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function BrandHeader() {
  return (
    <div className="brand-header">
      <LogoImage />
      <div>
        <small>CALIDAD 5S</small>
      </div>
    </div>
  );
}

function BrandSidebar() {
  return (
    <div className="brand-sidebar">
      <LogoImage tone="dark" />
      <div>
        <small>CALIDAD 5S</small>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>;
}

function getCurrentUser() {
  return (
    sessionStorage.getItem("usuario") ||
    sessionStorage.getItem("userId") ||
    sessionStorage.getItem("nombre") ||
    "GVISBAL"
  );
}

function getCurrentRole() {
  return sessionStorage.getItem("rol") || "ADMIN_5S";
}

function closeSession() {
  sessionStorage.removeItem("auth");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("nombre");
  sessionStorage.removeItem("usuario");
  sessionStorage.removeItem("rol");
  sessionStorage.removeItem("estado");
  sessionStorage.removeItem("permisos");
  sessionStorage.removeItem("recordarme");
  sessionStorage.removeItem("pilarSeleccionado");
  sessionStorage.removeItem("pilarNombre");
  sessionStorage.removeItem("pilarRuta");

  window.location.replace("/login?resetLogin=true");
}

function tabButtonStyle(isActive, expanded) {
  return {
    minHeight: expanded ? 44 : 48,
    height: expanded ? 44 : 48,
    width: expanded ? "100%" : 48,
    display: "flex",
    alignItems: "center",
    justifyContent: expanded ? "flex-start" : "center",
    gap: 12,
    padding: expanded ? "0 14px" : 0,
    borderRadius: expanded ? 14 : 16,
    color: isActive ? "#0369a1" : "#17213b",
    background: isActive
      ? expanded
        ? "linear-gradient(135deg, rgba(14,165,233,.15), rgba(37,99,235,.08))"
        : "linear-gradient(145deg, rgba(255,255,255,.98), rgba(232,246,255,.95))"
      : "transparent",
    border: `1px solid ${isActive ? "rgba(14,165,233,.26)" : "transparent"}`,
    textDecoration: "none",
    fontWeight: isActive ? 900 : 750,
    fontSize: 13,
    letterSpacing: "-.01em",
    boxShadow: isActive
      ? expanded
        ? "inset 4px 0 0 #0ea5e9, 0 10px 24px rgba(14,165,233,.10)"
        : "0 8px 18px rgba(14,165,233,.20), inset 0 0 0 1px rgba(255,255,255,.82)"
      : "none",
    outline: "none",
    transition: "background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease",
    cursor: "pointer",
  };
}

function normalizeBodega5S(item) {
  const estado = item.estado || "";

  return {
    id: item.id,
    nombre: item.nombre || "",
    puntos: Number(item.puntos || 0),
    area: item.area || "",
    estado,
    activo: item.activo !== false,
    meta_bodega: Number(item.meta_bodega || 0),
  };
}

function normalizeSububicacion5S(item) {
  return {
    id: item.id,
    bodega_id: item.bodega_id,
    nombre: item.nombre || "",
    codigo: item.codigo || "",
    descripcion: item.descripcion || "",
    zona: item.zona || "",
    estado: item.estado || "Activa",
    activo: item.activo !== false,
  };
}

async function loadBodegasFromApi(activeOnly = false) {
  const rows = await getBodegas5S({ activeOnly });
  return (rows || []).map(normalizeBodega5S);
}

function normalizeResponsable5S(item) {
  return {
    id: item.id,
    codigo: item.codigo || "",
    nombre: item.nombre || "",
    cargo: item.cargo || "",
    area: item.area || "",
    color: item.color || "",
    activo: item.activo !== false,
  };
}

function normalizeCronograma5S(item) {
  return {
    id: item.id,
    bodega: item.bodega || "",
    responsable: item.responsable || "",
    actividad: item.actividad || "",
    fechaInicio: item.fecha_inicio || item.fechaInicio || "",
    fechaFin: item.fecha_fin || item.fechaFin || item.fecha_inicio || "",
    estado: item.estado || "",
    prioridad: item.prioridad || "",
    meta_bodega: Number(item.meta_bodega || 0),
    observacion: item.observacion || "",
  };
}

function normalizeChecklistItem5S(item) {
  return {
    id: item.id,
    bodega: item.bodega || "",
    pilar: item.pilar || "",
    pregunta: item.pregunta || "",
    orden: Number(item.orden || 0),
    peso: Number(item.peso || 1),
    requiere_evidencia: Boolean(item.requiere_evidencia),
    activo: item.activo !== false,
  };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatShortDate(date) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }).replace(".", "").toUpperCase();
}

function diffDays(start, end) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function getTimelineDates(items) {
  const starts = items.map((item) => item.fechaInicio).filter(Boolean);
  const ends = items.map((item) => item.fechaFin).filter(Boolean);

  const minDate = starts.length ? starts.sort()[0] : todayISO();
  const maxDate = ends.length ? ends.sort().reverse()[0] : addDays(todayISO(), 30);

  const from = addDays(minDate, -3);
  const to = addDays(maxDate, 3);
  const total = diffDays(from, to);

  return Array.from({ length: total }, (_, i) => addDays(from, i));
}

function getBarStyle(item, timeline) {
  const startIndex = Math.max(0, timeline.indexOf(item.fechaInicio));
  const endIndex = Math.max(startIndex, timeline.indexOf(item.fechaFin));
  const start = (startIndex / timeline.length) * 100;
  const width = Math.max(4, ((endIndex - startIndex + 1) / timeline.length) * 100);

  return {
    left: `${start}%`,
    width: `${width}%`,
  };
}

function statusClass(status) {
  return String(status || "Sin estado")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function PortalView({ setTab }) {
  const [bodegasPortal, setBodegasPortal] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [config5S, setConfig5S] = useState({ meta_general: 90 });

  useEffect(() => {
    let active = true;

    Promise.all([
      loadBodegasFromApi(),
      getDashboard5S(),
      getConfig5S(),
    ])
      .then(([rows, dashboardData, configData]) => {
        if (!active) return;
        setBodegasPortal(rows);
        setDashboard(dashboardData);
        setConfig5S(configData || { meta_general: 90 });
      })
      .catch(() => {
        if (!active) return;
        setBodegasPortal([]);
        setDashboard(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const shortcuts = [
    {
      key: "cronograma",
      title: "Cronograma",
      subtitle: "Planifica auditorías, fechas, responsables y prioridad.",
      icon: CalendarDays,
      meta: "Planificación",
      tone: "blue",
    },
    {
      key: "inspeccion",
      title: "Inspección",
      subtitle: "Registra checklist, evidencias y cumplimiento por bodega.",
      icon: ClipboardCheck,
      meta: "Operación diaria",
      tone: "cyan",
    },
    {
      key: "responsables",
      title: "Responsables",
      subtitle: "Administra líderes, áreas y responsables del sistema 5S.",
      icon: Users,
      meta: "Equipo 5S",
      tone: "sky",
    },
    {
      key: "dashboard",
      title: "Dashboard",
      subtitle: "Visualiza cumplimiento, tendencias y alertas ejecutivas.",
      icon: LayoutDashboard,
      meta: "Vista ejecutiva",
      tone: "dark",
    },
    {
      key: "configuracion",
      title: "Configuración",
      subtitle: "Consulta, parametriza y controla los registros del sistema.",
      icon: Settings,
      meta: "Administración",
      tone: "slate",
    },
  ];

  const puntosControl = bodegasPortal.reduce((sum, item) => sum + Number(item.puntos || 0), 0);

  const quickMetrics = [
    {
      label: "Bodegas activas",
      value: dashboard?.bodegas_activas  -  bodegasPortal.filter((item) => item.activo).length,
      icon: Warehouse,
    },
    {
      label: "Puntos de control",
      value: puntosControl,
      icon: Target,
    },
    {
      label: "Meta general",
      value: `${Number(config5S.meta_general || 90)}%`,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="portal-shell">
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">VISIÓN GENERAL</span>
          <h2>Centro de control 5S</h2>
          <p>
            Plataforma corporativa para gestionar el sistema 5S: orden,
            limpieza, disciplina, inspecciones, hallazgos y cumplimiento por
            bodega.
          </p>

          <div className="portal-hero-actions">
            <button
              type="button"
              className="portal-primary-btn"
              onClick={() => setTab("dashboard")}
            >
              <LayoutDashboard size={18} />
              Ir al dashboard
            </button>

            <button
              type="button"
              className="portal-secondary-btn"
              onClick={() => setTab("inspeccion")}
            >
              <ClipboardCheck size={18} />
              Nueva inspección
            </button>
          </div>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card">
            <div className="portal-status-top">
              <div className="portal-status-icon">
                <Database size={18} />
              </div>
              <span className="portal-status-pill">Sistema 5S</span>
            </div>

            <div className="portal-status-body">
              <strong>Operación lista</strong>
              <p>
                El módulo está preparado para administrar cronogramas,
                inspecciones, responsables y seguimiento ejecutivo.
              </p>
            </div>

            <div className="portal-status-grid">
              <div>
                <small>Estado</small>
                <b>Activo</b>
              </div>
              <div>
                <small>Sesión</small>
                <b>CALIDAD 5S</b>
              </div>
              <div>
                <small>Monitoreo</small>
                <b>En línea</b>
              </div>
              <div>
                <small>Meta</small>
                <b>&gt;= 90%</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-kpi-grid">
        {quickMetrics.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="portal-kpi-card">
              <div className="portal-kpi-icon">
                <Icon size={20} />
              </div>
              <div className="portal-kpi-text">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="portal-content-grid">
        <article className="portal-panel portal-panel-large">
          <div className="portal-panel-head">
            <div>
              <span className="portal-panel-kicker">ACCESO RÁPIDO</span>
              <h3>Módulos disponibles</h3>
              <p>
                Ingresa directamente al flujo de trabajo que necesitas gestionar.
              </p>
            </div>
          </div>

          <div className="portal-shortcuts-grid">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`portal-shortcut-card tone-${item.tone}`}
                  onClick={() => setTab(item.key)}
                >
                  <div className="portal-shortcut-top">
                    <div className="portal-shortcut-icon">
                      <Icon size={19} />
                    </div>
                    <span>{item.meta}</span>
                  </div>

                  <div className="portal-shortcut-body">
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>

                  <div className="portal-shortcut-link">
                    <span>Abrir módulo</span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        <aside className="portal-side-stack">
          <article className="portal-panel portal-info-card">
            <div className="portal-panel-kicker">RESUMEN OPERATIVO</div>
            <h3>Control centralizado</h3>
            <ul className="portal-bullet-list">
              <li>
                <span><Clock3 size={15} /></span>
                Gestión rápida de cronograma e inspecciones.
              </li>
              <li>
                <span><ClipboardCheck size={15} /></span>
                Captura diaria y evidencia fotográfica en un solo lugar.
              </li>
              <li>
                <span><BarChart3 size={15} /></span>
                Visión ejecutiva con KPIs y cumplimiento por bodega.
              </li>
            </ul>
          </article>

          <article className="portal-panel portal-highlight-card">
            <div className="portal-highlight-icon">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <div className="portal-panel-kicker">RECOMENDADO</div>
              <h3>Explora el dashboard</h3>
              <p>
                Visualiza tendencias, resultados y desempeño consolidado de tus
                auditorías 5S.
              </p>
            </div>
            <button
              type="button"
              className="portal-cta-link"
              onClick={() => setTab("dashboard")}
            >
              Ver dashboard
              <ArrowRight size={16} />
            </button>
          </article>
        </aside>
      </section>
    </div>
  );
}

function CronogramaView() {
  const [version, setVersion] = useState(0);
  const [cronograma, setCronograma] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [config5S, setConfig5S] = useState(null);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [cronogramaError, setCronogramaError] = useState("");

  useEffect(() => {
    refreshCatalogos();
  }, []);

  const [form, setForm] = useState({
    bodega: "",
    responsable: "",
    fechaInicio: todayISO(),
    fechaFin: addDays(todayISO(), 6),
    estado: "",
    prioridad: "",
    actividad: "",
    observacion: "",
  });

  const [filters, setFilters] = useState({
    bodega: "Todas",
    responsable: "Todos",
    estado: "Todos",
    prioridad: "Todas",
  });

  const estadosCronograma = config5S?.estados_cronograma || [];
  const prioridadesCronograma = config5S?.prioridades_cronograma || [];

  const filtered = useMemo(() => {
    return cronograma.filter((item) => {
      const okBodega = filters.bodega === "Todas" || item.bodega === filters.bodega;
      const okResponsable = filters.responsable === "Todos" || item.responsable === filters.responsable;
      const okEstado = filters.estado === "Todos" || item.estado === filters.estado;
      const okPrioridad = filters.prioridad === "Todas" || item.prioridad === filters.prioridad;
      return okBodega && okResponsable && okEstado && okPrioridad;
    });
  }, [cronograma, filters, version]);

  const timeline = useMemo(() => {
    if (!filtered.length && !cronograma.length) {
      const start = todayISO();
      return Array.from({ length: 35 }, (_, i) => addDays(start, i));
    }

    return getTimelineDates(filtered.length ? filtered : cronograma);
  }, [filtered, cronograma, version]);

  const grouped = useMemo(() => {
    const names = [...new Set(filtered.map((item) => item.responsable))];
    return names.map((name) => ({
      responsable: name,
      items: filtered.filter((item) => item.responsable === name),
    }));
  }, [filtered]);

  const stats = {
    total: cronograma.length,
    segundoEstado: cronograma.filter((item) => item.estado === estadosCronograma[1]).length,
    tercerEstado: cronograma.filter((item) => item.estado === estadosCronograma[2]).length,
    cuartoEstado: cronograma.filter((item) => item.estado === estadosCronograma[3]).length,
  };

  const proximas = [...cronograma]
    .sort((a, b) => String(a.fechaInicio).localeCompare(String(b.fechaInicio)))
    .slice(0, 4);

  async function refreshCatalogos() {
    setLoadingCatalogos(true);
    setCronogramaError("");

    try {
      const [nextBodegas, nextResponsablesRaw, nextCronogramaRaw, nextConfig] = await Promise.all([
        loadBodegasFromApi(true),
        getResponsables5S({ activo: true }),
        getCronograma5S(),
        getConfig5S(),
      ]);

      const nextResponsables = (nextResponsablesRaw || []).map(normalizeResponsable5S);
      const nextCronograma = (nextCronogramaRaw || []).map(normalizeCronograma5S);
      const nextEstados = nextConfig?.estados_cronograma || [];
      const nextPrioridades = nextConfig?.prioridades_cronograma || [];

      setBodegas(nextBodegas);
      setResponsables(nextResponsables);
      setCronograma(nextCronograma);
      setConfig5S(nextConfig || null);

      setForm((prev) => ({
        ...prev,
        bodega: prev.bodega || nextBodegas[0]?.nombre || "",
        responsable: prev.responsable || nextResponsables[0]?.nombre || "",
        estado: prev.estado || nextEstados[0] || "",
        prioridad: prev.prioridad || nextPrioridades[0] || "",
      }));

      setVersion((value) => value + 1);
    } catch (error) {
      console.error("No se pudieron cargar datos 5S:", error);
      setBodegas([]);
      setResponsables([]);
      setCronograma([]);
      setCronogramaError(error.message || "No se pudieron cargar los datos desde la base de datos.");
    } finally {
      setLoadingCatalogos(false);
    }
  }

  function updateForm(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "fechaInicio" && next.fechaFin < value) {
        next.fechaFin = value;
      }

      return next;
    });
  }

  async function addCronograma(event) {
    event.preventDefault();

    if (!bodegas.length) {
      alert("Primero debes crear al menos una bodega en el módulo Responsables.");
      return;
    }

    if (!responsables.length) {
      alert("Primero debes crear al menos un responsable activo en el módulo Responsables.");
      return;
    }

    if (!form.bodega || !form.responsable || !form.fechaInicio || !form.fechaFin || !form.estado || !form.prioridad) {
      alert("Debes completar bodega, responsable, fechas, estado y prioridad.");
      return;
    }

    const actividad = form.actividad.trim();

    if (!actividad) {
      alert("Debes escribir la actividad de la auditoría.");
      return;
    }

    const payload = {
      bodega: form.bodega,
      responsable: form.responsable,
      actividad,
      fecha_inicio: form.fechaInicio,
      fecha_fin: form.fechaFin,
      estado: form.estado,
      prioridad: form.prioridad,
      observacion: form.observacion,
    };

    setLoadingCatalogos(true);
    setCronogramaError("");

    try {
      await crearCronograma5S(payload);
      await refreshCatalogos();

      setForm({
        bodega: bodegas[0]?.nombre || form.bodega,
        responsable: responsables[0]?.nombre || form.responsable,
        fechaInicio: todayISO(),
        fechaFin: addDays(todayISO(), 6),
        estado: estadosCronograma[0] || "",
        prioridad: prioridadesCronograma[0] || "",
        actividad: "",
        observacion: "",
      });
    } catch (error) {
      console.error("No se pudo guardar el cronograma 5S:", error);
      setCronogramaError(error.message || "No se pudo guardar el cronograma en la base de datos.");
    } finally {
      setLoadingCatalogos(false);
    }
  }

  async function deleteCronograma(id) {
    if (!window.confirm("¿Eliminar esta actividad del cronograma?")) return;

    try {
      await eliminarCronograma5S(id);
      setCronograma((prev) => prev.filter((item) => item.id !== id));
      setVersion((value) => value + 1);
    } catch (error) {
      console.error("No se pudo eliminar el cronograma 5S:", error);
      setCronogramaError(error.message || "No se pudo eliminar el cronograma de la base de datos.");
    }
  }

  async function clearCronograma() {
    if (!window.confirm("¿Eliminar todas las actividades del cronograma en base de datos?")) return;

    try {
      await Promise.all(cronograma.map((item) => eliminarCronograma5S(item.id)));
      setCronograma([]);
      setVersion((value) => value + 1);
    } catch (error) {
      console.error("No se pudo vaciar el cronograma 5S:", error);
      setCronogramaError(error.message || "No se pudo vaciar el cronograma en la base de datos.");
    }
  }

  return (
    <div className="portal-shell cronograma-shell">
      <section className="portal-hero cronograma-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Cronograma 5S</h2>
          <p>
            Crea auditorías por fecha, bodega y responsable. La lista de bodegas
            viene de las bodegas que crees en Responsables y el Gantt arranca vacío
            para que construyas tu programación real.
          </p>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card cronograma-status-card">
            <div className="portal-status-top">
              <div className="portal-status-icon">
                <CalendarDays size={18} />
              </div>
              <span className="portal-status-pill">Activo</span>
            </div>

            <div className="cronograma-status-grid">
              <div>
                <strong>{stats.total}</strong>
                <small>Actividades</small>
              </div>
              <div>
                <strong>{stats.segundoEstado}</strong>
                <small>{estadosCronograma[1] || "Estado 2"}</small>
              </div>
              <div>
                <strong>{stats.tercerEstado}</strong>
                <small>{estadosCronograma[2] || "Estado 3"}</small>
              </div>
              <div>
                <strong>{stats.cuartoEstado}</strong>
                <small>{estadosCronograma[3] || "Estado 4"}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cronograma-form-grid">
        <article className="portal-panel cronograma-form-panel">
          <div className="portal-panel-head cronograma-form-head">
            <div>
              <span className="portal-panel-kicker">CREAR PROGRAMACIÓN</span>
              <h3>Asignar auditoría 5S</h3>
              <p>
                Define fecha, bodega, responsable, estado, prioridad y alcance de la actividad.
              </p>
            </div>

            <button type="button" className="catalog-refresh-btn" onClick={refreshCatalogos}>
              <RefreshCw size={16} />
              {loadingCatalogos ? "Actualizando..." : "Actualizar listas"}
            </button>
          </div>

          {cronogramaError && (
            <div className="cronograma-warning">
              <strong>Error de base de datos.</strong>
              <span>{cronogramaError}</span>
            </div>
          )}

          {(!bodegas.length || !responsables.length) && (
            <div className="cronograma-warning">
              <strong>Faltan datos maestros.</strong>
              <span>
                Para programar debes crear primero bodegas y responsables activos
                desde el módulo Responsables.
              </span>
            </div>
          )}

          <form className="cronograma-form" onSubmit={addCronograma}>
            <label>
              Bodega
              <select
                value={form.bodega}
                disabled={!bodegas.length}
                onChange={(e) => updateForm("bodega", e.target.value)}
              >
                {!bodegas.length && <option>Sin bodegas creadas</option>}
                {bodegas.map((bodega) => (
                  <option key={bodega.id} value={bodega.nombre}>
                    {bodega.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Responsable
              <select
                value={form.responsable}
                disabled={!responsables.length}
                onChange={(e) => updateForm("responsable", e.target.value)}
              >
                {!responsables.length && <option>Sin responsables activos</option>}
                {responsables.map((persona) => (
                  <option key={persona.id} value={persona.nombre}>
                    {persona.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha inicio
              <input type="date" value={form.fechaInicio} onChange={(e) => updateForm("fechaInicio", e.target.value)} />
            </label>

            <label>
              Fecha fin
              <input type="date" value={form.fechaFin} min={form.fechaInicio} onChange={(e) => updateForm("fechaFin", e.target.value)} />
            </label>

            <label>
              Estado
              <select value={form.estado} onChange={(e) => updateForm("estado", e.target.value)}>
                {!estadosCronograma.length && <option value="">Sin estados configurados</option>}
                {estadosCronograma.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </label>

            <label>
              Prioridad
              <select value={form.prioridad} onChange={(e) => updateForm("prioridad", e.target.value)}>
                {!prioridadesCronograma.length && <option value="">Sin prioridades configuradas</option>}
                {prioridadesCronograma.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>{prioridad}</option>
                ))}
              </select>
            </label>

            <label className="span-2">
              Actividad
              <input value={form.actividad} onChange={(e) => updateForm("actividad", e.target.value)} placeholder="Actividad de auditoría" />
            </label>

            <label className="span-2">
              Observación / alcance
              <textarea value={form.observacion} onChange={(e) => updateForm("observacion", e.target.value)} placeholder="Describe el alcance, zonas críticas o notas del cronograma..." />
            </label>

            <button className="cronograma-submit span-2" type="submit">
              <Plus size={18} />
              Guardar auditoría programada
            </button>
          </form>
        </article>

        <aside className="cronograma-side-stack">
          <article className="portal-panel cronograma-next-card">
            <div className="portal-panel-kicker">PRÓXIMAS ACTIVIDADES</div>

            <div className="cronograma-next-list">
              {proximas.length ? proximas.map((item) => (
                <div key={item.id} className="cronograma-next-item">
                  <span className={`next-dot status-${statusClass(item.estado)}`} />
                  <div>
                    <strong>{item.actividad}</strong>
                    <small>{item.responsable} · {formatShortDate(item.fechaInicio)} · {item.prioridad}</small>
                  </div>
                </div>
              )) : (
                <div className="empty-next">
                  <CalendarDays size={28} />
                  <strong>Sin actividades</strong>
                  <span>Crea la primera auditoría para verla aquí.</span>
                </div>
              )}
            </div>
          </article>

          <article className="portal-panel cronograma-legend-card">
            <div className="portal-panel-kicker">LEYENDA</div>
            <div className="legend-grid">
              {estadosCronograma.length ? (
                estadosCronograma.map((estado) => (
                  <span key={estado}><i className={`status-${statusClass(estado)}`} /> {estado}</span>
                ))
              ) : (
                <span>Sin estados configurados</span>
              )}
            </div>
          </article>
        </aside>
      </section>

      <section className="portal-panel cronograma-filter-panel">
        <div className="filter-title">
          <Filter size={17} />
          Filtros del cronograma
        </div>

        <div className="filter-grid">
          <label>
            Bodega
            <select value={filters.bodega} onChange={(e) => setFilters({ ...filters, bodega: e.target.value })}>
              <option>Todas</option>
              {bodegas.map((bodega) => <option key={bodega.id}>{bodega.nombre}</option>)}
            </select>
          </label>

          <label>
            Responsable
            <select value={filters.responsable} onChange={(e) => setFilters({ ...filters, responsable: e.target.value })}>
              <option>Todos</option>
              {responsables.map((persona) => <option key={persona.id}>{persona.nombre}</option>)}
            </select>
          </label>

          <label>
            Estado
            <select value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })}>
              <option>Todos</option>
              {estadosCronograma.map((estado) => <option key={estado}>{estado}</option>)}
            </select>
          </label>

          <label>
            Prioridad
            <select value={filters.prioridad} onChange={(e) => setFilters({ ...filters, prioridad: e.target.value })}>
              <option>Todas</option>
              {prioridadesCronograma.map((prioridad) => <option key={prioridad}>{prioridad}</option>)}
            </select>
          </label>

          <button type="button" onClick={clearCronograma}>
            <X size={16} />
            Vaciar cronograma
          </button>
        </div>
      </section>

      <section className="portal-panel gantt-panel">
        <div className="gantt-head">
          <div>
            <span className="portal-panel-kicker">PROGRAMACIÓN DE AUDITORÍAS</span>
            <h3>Diagrama de Gantt por responsable</h3>
          </div>
          <div className="gantt-actions">
            <button type="button">Hoy</button>
            <button type="button">Semanas</button>
          </div>
        </div>

        <div className="gantt-board" style={{ "--days": timeline.length }}>
          <div className="gantt-left-header">Responsable / Bodega</div>
          <div className="gantt-timeline-header">
            {timeline.map((date, index) => (
              <div key={date} className={index % 7 === 0 ? "week-start" : ""}>
                <strong>{new Date(`${date}T00:00:00`).getDate()}</strong>
                <small>{new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", { weekday: "short" }).slice(0, 3)}</small>
              </div>
            ))}
          </div>

          {grouped.length ? grouped.map((group) => (
            <div className="gantt-group" key={group.responsable}>
              <div className="gantt-person">
                <UserRound size={15} />
                <strong>{group.responsable}</strong>
              </div>

              <div className="gantt-person-line" />

              {group.items.map((item) => (
                <div className="gantt-row" key={item.id}>
                  <div className="gantt-label">
                    <Warehouse size={14} />
                    <span>{item.bodega}</span>
                  </div>

                  <div className="gantt-track">
                    {timeline.map((date) => (
                      <i key={`${item.id}-${date}`} className={date === todayISO() ? "is-today" : ""} />
                    ))}

                    <div
                      className={`gantt-bar status-${statusClass(item.estado)}`}
                      style={getBarStyle(item, timeline)}
                      title={`${item.actividad} · ${item.responsable}`}
                    >
                      <span>{item.actividad}</span>
                      <b>{item.prioridad}</b>
                    </div>
                  </div>

                  <button type="button" className="gantt-delete" onClick={() => deleteCronograma(item.id)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )) : (
            <div className="gantt-empty">
              <CalendarDays size={44} />
              <strong>Gantt vacío</strong>
              <span>
                Crea bodegas y responsables, luego programa tu primera auditoría 5S.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ResponsablesView() {
  const [responsables, setResponsables] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [subbodegas, setSububicaciones] = useState([]);
  const [editingBodegaId, setEditingBodegaId] = useState(null);
  const [editingSububicacionId, setEditingSububicacionId] = useState(null);
  const [bodegaLoading, setBodegaLoading] = useState(false);
  const [bodegaError, setBodegaError] = useState("");
  const [sububicacionLoading, setSububicacionLoading] = useState(false);
  const [sububicacionError, setSububicacionError] = useState("");
  const [responsableLoading, setResponsableLoading] = useState(false);
  const [responsableError, setResponsableError] = useState("");
  const [config5S, setConfig5S] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    cargo: "",
    area: "",
    color: "",
  });

  const [bodegaForm, setBodegaForm] = useState({
    nombre: "",
    puntos: 10,
    area: "",
    estado: "",
  });

  const [sububicacionForm, setSububicacionForm] = useState({
    bodega_id: "",
    nombre: "",
    codigo: "",
    zona: "",
    descripcion: "",
    estado: "Activa",
  });

  useEffect(() => {
    loadConfig5SForResponsables();
    loadResponsableList();
    loadBodegaList();
    loadSububicacionList();
  }, []);

  const estadosBodega = config5S?.estados_bodega || [];
  const estadoActivo = estadosBodega[0] || "";
  const estadoInactivo = estadosBodega[1] || "";

  async function loadConfig5SForResponsables() {
    try {
      const configData = await getConfig5S();
      setConfig5S(configData || null);
      setBodegaForm((prev) => ({
        ...prev,
        estado: prev.estado || configData?.estados_bodega?.[0] || "",
      }));
    } catch (error) {
      console.error("No se pudo cargar configuración 5S:", error);
      setBodegaError(error.message || "No se pudo cargar la configuración desde la base de datos.");
    }
  }

  const activos = responsables.filter((item) => item.activo).length;
  const inactivos = responsables.length - activos;
  const subbodegasActivas = subbodegas.filter((item) => item.activo).length;
  const bodegaById = useMemo(() => {
    const map = new Map();
    bodegas.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [bodegas]);
  const areas = [...new Set(responsables.map((item) => item.area).filter(Boolean))];

  async function loadResponsableList() {
    setResponsableLoading(true);
    setResponsableError("");

    try {
      const rows = await getResponsables5S();
      setResponsables((rows || []).map(normalizeResponsable5S));
    } catch (error) {
      console.error("No se pudieron cargar los responsables 5S:", error);
      setResponsableError(error.message || "No se pudieron cargar los responsables desde la base de datos.");
    } finally {
      setResponsableLoading(false);
    }
  }

  async function addResponsable(event) {
    event.preventDefault();

    if (!form.nombre.trim()) {
      alert("Debes ingresar el nombre del responsable.");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      cargo: form.cargo.trim() || null,
      area: form.area.trim() || null,
      color: form.color || null,
      activo: true,
    };

    setResponsableLoading(true);
    setResponsableError("");

    try {
      await crearResponsable5S(payload);
      await loadResponsableList();

      setForm({
        nombre: "",
        cargo: "",
        area: "",
        color: "",
      });
    } catch (error) {
      console.error("No se pudo guardar el responsable 5S:", error);
      setResponsableError(error.message || "No se pudo guardar el responsable en la base de datos.");
    } finally {
      setResponsableLoading(false);
    }
  }

  async function toggleResponsable(id) {
    const responsable = responsables.find((item) => item.id === id);
    if (!responsable) return;

    try {
      const updated = await editarResponsable5S(id, {
        nombre: responsable.nombre,
        cargo: responsable.cargo,
        area: responsable.area,
        color: responsable.color,
        activo: !responsable.activo,
      });

      setResponsables((prev) =>
        prev.map((item) => (item.id === id ? normalizeResponsable5S(updated) : item))
      );
    } catch (error) {
      console.error("No se pudo actualizar el responsable 5S:", error);
      setResponsableError(error.message || "No se pudo actualizar el responsable.");
    }
  }

  function resetBodegaForm() {
    setEditingBodegaId(null);
    setBodegaForm({
      nombre: "",
      puntos: 10,
      area: "",
      estado: estadoActivo,
    });
  }

  async function loadBodegaList() {
    setBodegaLoading(true);
    setBodegaError("");

    try {
      const rows = await loadBodegasFromApi(false);
      setBodegas(rows);
      setSububicacionForm((prev) => ({ ...prev, bodega_id: prev.bodega_id || rows[0]?.id || "" }));
    } catch (error) {
      console.error("No se pudieron cargar las bodegas 5S:", error);
      setBodegaError("No se pudieron cargar las bodegas desde la base de datos.");
    } finally {
      setBodegaLoading(false);
    }
  }

  async function loadSububicacionList() {
    setSububicacionLoading(true);
    setSububicacionError("");

    try {
      const rows = await getSububicaciones5S();
      setSububicaciones((rows || []).map(normalizeSububicacion5S));
    } catch (error) {
      console.error("No se pudieron cargar las subbodegas 5S:", error);
      setSububicacionError(error.message || "No se pudieron cargar las subbodegas desde la base de datos.");
    } finally {
      setSububicacionLoading(false);
    }
  }

  function resetSububicacionForm() {
    setEditingSububicacionId(null);
    setSububicacionForm({
      bodega_id: bodegas[0]?.id || "",
      nombre: "",
      codigo: "",
      zona: "",
      descripcion: "",
      estado: estadoActivo || "Activa",
    });
  }

  async function addSububicacion(event) {
    event.preventDefault();

    if (!sububicacionForm.bodega_id) {
      alert("Debes seleccionar la bodega principal.");
      return;
    }

    if (!sububicacionForm.nombre.trim()) {
      alert("Debes ingresar el nombre de la subbodega.");
      return;
    }

    const payload = {
      bodega_id: Number(sububicacionForm.bodega_id),
      nombre: sububicacionForm.nombre.trim(),
      codigo: sububicacionForm.codigo.trim() || null,
      zona: sububicacionForm.zona.trim() || null,
      descripcion: sububicacionForm.descripcion.trim() || null,
      estado: sububicacionForm.estado || estadoActivo || "Activa",
      activo: sububicacionForm.estado ? sububicacionForm.estado === estadoActivo : true,
    };

    setSububicacionLoading(true);
    setSububicacionError("");

    try {
      if (editingSububicacionId) {
        await editarSububicacion5S(editingSububicacionId, payload);
      } else {
        await crearSububicacion5S(payload);
      }

      resetSububicacionForm();
      await loadSububicacionList();
    } catch (error) {
      console.error("No se pudo guardar la subbodega 5S:", error);
      setSububicacionError(error.message || "No se pudo guardar la subbodega.");
    } finally {
      setSububicacionLoading(false);
    }
  }

  function editSububicacion(item) {
    setEditingSububicacionId(item.id);
    setSububicacionForm({
      bodega_id: item.bodega_id || "",
      nombre: item.nombre || "",
      codigo: item.codigo || "",
      zona: item.zona || "",
      descripcion: item.descripcion || "",
      estado: item.estado || estadoActivo || "Activa",
    });
  }

  async function toggleSububicacion(id) {
    const item = subbodegas.find((sub) => sub.id === id);
    if (!item) return;

    const estado = item.activo ? (estadoInactivo || "Inactiva") : (estadoActivo || "Activa");

    try {
      await editarSububicacion5S(id, {
        bodega_id: item.bodega_id,
        nombre: item.nombre,
        codigo: item.codigo || null,
        zona: item.zona || null,
        descripcion: item.descripcion || null,
        estado,
        activo: !item.activo,
      });
      await loadSububicacionList();
    } catch (error) {
      console.error("No se pudo actualizar la subbodega 5S:", error);
      setSububicacionError(error.message || "No se pudo actualizar la subbodega.");
    }
  }

  async function deleteSububicacion(id) {
    const item = subbodegas.find((sub) => sub.id === id);
    if (!window.confirm(`?Eliminar ${item?.nombre || "esta subbodega"}?`)) return;

    try {
      await eliminarSububicacion5S(id);
      setSububicaciones((prev) => prev.filter((sub) => sub.id !== id));
      if (editingSububicacionId === id) resetSububicacionForm();
    } catch (error) {
      console.error("No se pudo eliminar la subbodega 5S:", error);
      setSububicacionError(error.message || "No se pudo eliminar la subbodega.");
    }
  }

  async function addBodega(event) {
    event.preventDefault();

    const nombre = bodegaForm.nombre.trim();

    if (!nombre) {
      alert("Debes ingresar el nombre de la bodega.");
      return;
    }

    if (!bodegaForm.estado) {
      alert("Debes configurar y seleccionar un estado de bodega.");
      return;
    }

    const payload = {
      nombre,
      puntos: Number(bodegaForm.puntos) || 0,
      area: bodegaForm.area.trim() || null,
      estado: bodegaForm.estado,
    };

    setBodegaLoading(true);
    setBodegaError("");

    try {
      if (editingBodegaId) {
        await editarBodega5S(editingBodegaId, payload);
      } else {
        await crearBodega5S(payload);
      }

      resetBodegaForm();
      await loadBodegaList();
    } catch (error) {
      console.error("No se pudo guardar la bodega 5S:", error);
      setBodegaError(error.message || "No se pudo guardar la bodega.");
    } finally {
      setBodegaLoading(false);
    }
  }

  function editBodega(item) {
    setEditingBodegaId(item.id);
    setBodegaForm({
      nombre: item.nombre,
      puntos: item.puntos || 0,
      area: item.area || "",
      estado: item.estado || estadoActivo,
    });
  }

  async function toggleBodega(id) {
    const bodega = bodegas.find((item) => item.id === id);
    if (!bodega) return;

    if (!estadoActivo || !estadoInactivo) {
      setBodegaError("Configura primero los estados de bodega activo e inactivo.");
      return;
    }

    const estado = bodega.activo ? estadoInactivo : estadoActivo;

    try {
      const updated = await editarBodega5S(id, {
        nombre: bodega.nombre,
        puntos: bodega.puntos || 0,
        area: bodega.area || null,
        estado,
      });

      setBodegas((prev) =>
        prev.map((item) => (item.id === id ? normalizeBodega5S(updated) : item))
      );
    } catch (error) {
      console.error("No se pudo actualizar la bodega 5S:", error);
      setBodegaError(error.message || "No se pudo actualizar la bodega.");
    }
  }

  async function deleteBodega(id) {
    const bodega = bodegas.find((item) => item.id === id);

    if (!window.confirm(`¿Eliminar ${bodega?.nombre || "esta bodega"}?`)) return;

    try {
      await eliminarBodega5S(id);
      setBodegas((prev) => prev.filter((item) => item.id !== id));
      if (editingBodegaId === id) resetBodegaForm();
    } catch (error) {
      console.error("No se pudo eliminar la bodega 5S:", error);
      setBodegaError(error.message || "No se pudo eliminar la bodega.");
    }
  }

  return (
    <div className="portal-shell responsables-shell">
      <section className="portal-hero responsables-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Responsables y bodegas</h2>
          <p>
            Administra responsables activos y crea las bodegas que después
            aparecerán en la lista desplegable del cronograma 5S.
          </p>

          <div className="responsables-hero-metrics">
            <div>
              <small>Responsables</small>
              <strong>{responsables.length}</strong>
            </div>
            <div>
              <small>Activos</small>
              <strong>{activos}</strong>
            </div>
            <div>
              <small>Bodegas</small>
              <strong>{bodegas.length}</strong>
            </div>
            <div>
              <small>Subbodegas</small>
              <strong>{subbodegas.length}</strong>
            </div>
          </div>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card responsables-status-card">
            <div className="portal-status-top">
              <div className="portal-status-icon">
                <Warehouse size={18} />
              </div>
              <span className="portal-status-pill">Datos maestros</span>
            </div>

            <div className="portal-status-body">
              <strong>Base del cronograma</strong>
              <p>
                Las bodegas creadas aquí alimentan automáticamente el selector
                del módulo Cronograma.
              </p>
            </div>

            <div className="portal-status-grid">
              <div>
                <small>Responsables</small>
                <b>{responsables.length}</b>
              </div>
              <div>
                <small>Bodegas</small>
                <b>{bodegas.length}</b>
              </div>
              <div>
                <small>Áreas</small>
                <b>{areas.length || 1}</b>
              </div>
              <div>
                <small>Estado</small>
                <b>En línea</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="responsables-grid responsables-master-grid">
        <article className="portal-panel responsable-form-card">
          <div className="portal-panel-head">
            <div>
              <span className="portal-panel-kicker">NUEVO RESPONSABLE</span>
              <h3>Agregar responsable</h3>
              <p>
                Crea un responsable 5S para asignarlo en cronogramas e
                inspecciones.
              </p>
            </div>
          </div>

          {responsableError && <div className="empty-inline">{responsableError}</div>}

          <form className="responsable-form" onSubmit={addResponsable}>
            <label>
              Nombre completo
              <input
                value={form.nombre}
                onChange={(event) =>
                  setForm({ ...form, nombre: event.target.value })
                }
                placeholder="Ej. Nuevo responsable"
              />
            </label>

            <label>
              Cargo
              <input
                value={form.cargo}
                onChange={(event) =>
                  setForm({ ...form, cargo: event.target.value })
                }
                placeholder="Cargo"
              />
            </label>

            <label>
              Área
              <input
                value={form.area}
                onChange={(event) =>
                  setForm({ ...form, area: event.target.value })
                }
                placeholder="Área"
              />
            </label>

            <label>
              Color visual
              <div className="color-control">
                <input
                  value={form.color}
                  onChange={(event) =>
                    setForm({ ...form, color: event.target.value })
                  }
                  placeholder="Color hex"
                />
                <span>{form.color}</span>
              </div>
            </label>

            <button type="submit" className="responsable-submit" disabled={responsableLoading}>
              <Plus size={18} />
              {responsableLoading ? "Guardando..." : "Agregar responsable"}
            </button>
          </form>
        </article>

        <article className="portal-panel responsable-form-card">
          <div className="portal-panel-head">
            <div>
              <span className="portal-panel-kicker">NUEVA BODEGA</span>
              <h3>{editingBodegaId ? "Editar bodega" : "Crear bodega"}</h3>
              <p>
                Las bodegas se guardan en la base de datos y alimentan los
                selectores de 5S.
              </p>
            </div>
          </div>

          {bodegaError && <div className="empty-inline">{bodegaError}</div>}

          <form className="responsable-form" onSubmit={addBodega}>
            <label>
              Nombre de bodega
              <input
                value={bodegaForm.nombre}
                onChange={(event) =>
                  setBodegaForm({ ...bodegaForm, nombre: event.target.value })
                }
                placeholder="Ej. Bodega Materia Prima"
              />
            </label>

            <label>
              Puntos de control
              <input
                type="number"
                min="0"
                value={bodegaForm.puntos}
                onChange={(event) =>
                  setBodegaForm({ ...bodegaForm, puntos: event.target.value })
                }
                placeholder="10"
              />
            </label>

            <label>
              Área
              <input
                value={bodegaForm.area}
                onChange={(event) =>
                  setBodegaForm({ ...bodegaForm, area: event.target.value })
                }
                placeholder="Área"
              />
            </label>

            <label>
              Estado
              <select
                value={bodegaForm.estado}
                onChange={(event) =>
                  setBodegaForm({ ...bodegaForm, estado: event.target.value })
                }
              >
                {!estadosBodega.length && <option value="">Configura estados en Configuración</option>}
                {estadosBodega.map((estado) => (
                  <option key={estado} value={estado}>{estado}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="responsable-submit" disabled={bodegaLoading}>
              <Plus size={18} />
              {editingBodegaId ? "Guardar cambios" : "Crear bodega"}
            </button>

            {editingBodegaId && (
              <button type="button" className="responsable-submit ghost" onClick={resetBodegaForm}>
                <X size={18} />
                Cancelar edicion
              </button>
            )}
          </form>
        </article>
      </section>

      <section className="responsables-grid responsables-list-grid">
        <article className="portal-panel responsables-list-card">
          <div className="portal-panel-head responsable-list-head">
            <div>
              <span className="portal-panel-kicker">EQUIPO 5S</span>
              <h3>Responsables activos</h3>
              <p>
                Visualiza el equipo disponible para auditorías y seguimiento
                operativo.
              </p>
            </div>

            <div className="responsable-count-pill">
              <Users size={16} />
              {activos} activos
            </div>
          </div>

          <div className="responsables-list">
            {responsables.map((item) => (
              <article
                key={item.id}
                className={`responsable-card ${item.activo ? "is-active" : "is-inactive"}`}
              >
                <div className="responsable-main">
                  <div
                    className="responsable-color"
                    style={{ background: item.color }}
                  />

                  <div className="responsable-info">
                    <strong>{item.nombre}</strong>
                    <span>
                      {item.cargo} · {item.area}
                    </span>
                  </div>
                </div>

                <div className="responsable-state">
                  {item.activo ? (
                    <span className="state-pill active">
                      <CheckCircle2 size={14} />
                      Activo
                    </span>
                  ) : (
                    <span className="state-pill inactive">
                      <Circle size={14} />
                      Inactivo
                    </span>
                  )}

                  <button type="button" className="mini-action">
                    <Edit3 size={15} />
                    Editar
                  </button>

                  <button
                    type="button"
                    className={`mini-action ${item.activo ? "danger" : "success"}`}
                    onClick={() => toggleResponsable(item.id)}
                  >
                    <Power size={15} />
                    {item.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="portal-panel responsables-list-card">
          <div className="portal-panel-head responsable-list-head">
            <div>
              <span className="portal-panel-kicker">BODEGAS 5S</span>
              <h3>Bodegas creadas</h3>
              <p>
                Estas bodegas son las que aparecerán en el selector del
                cronograma.
              </p>
            </div>

            <div className="responsable-count-pill">
              <Warehouse size={16} />
              {bodegas.length} bodegas
            </div>
          </div>

          <div className="responsables-list">
            {bodegas.length ? bodegas.map((item) => (
              <article
                key={item.id}
                className={`responsable-card bodega-card ${item.activo ? "is-active" : "is-inactive"}`}
              >
                <div className="responsable-main">
                  <div className="bodega-icon-dot">
                    <Warehouse size={18} />
                  </div>

                  <div className="responsable-info">
                    <strong>{item.nombre}</strong>
                    <span>
                      {item.area} · {item.puntos || 0} puntos de control
                    </span>
                  </div>
                </div>

                <div className="responsable-state">
                  <span className={item.activo ? "state-pill active" : "state-pill inactive"}>
                    {item.activo ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {item.estado}
                  </span>

                  <button
                    type="button"
                    className="mini-action"
                    onClick={() => editBodega(item)}
                  >
                    <Edit3 size={15} />
                    Editar
                  </button>

                  <button
                    type="button"
                    className={`mini-action ${item.activo ? "danger" : "success"}`}
                    onClick={() => toggleBodega(item.id)}
                  >
                    <Power size={15} />
                    {item.activo ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    type="button"
                    className="mini-action danger"
                    onClick={() => deleteBodega(item.id)}
                  >
                    <X size={15} />
                    Eliminar
                  </button>
                </div>
              </article>
            )) : (
              <div className="empty-next empty-bodegas">
                <Warehouse size={32} />
                <strong>Sin bodegas creadas</strong>
                <span>Crea tu primera bodega para poder programar auditorías.</span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="portal-panel responsables-list-card subbodegas-panel">
        <div className="portal-panel-head responsable-list-head">
          <div>
            <span className="portal-panel-kicker">SUBBODEGAS 5S</span>
            <h3>Subbodegas por bodega</h3>
            <p>
              Crea subbodegas dentro de Bodega General, Bodegas Externas o cualquier bodega 5S.
            </p>
          </div>

          <div className="responsable-count-pill">
            <Warehouse size={16} />
            {subbodegas.length} subbodegas
          </div>
        </div>

        {sububicacionError && <div className="empty-inline">{sububicacionError}</div>}

        <form className="responsable-form subbodega-form" onSubmit={addSububicacion}>
          <label>
            Bodega principal
            <select
              value={sububicacionForm.bodega_id}
              onChange={(event) => setSububicacionForm({ ...sububicacionForm, bodega_id: event.target.value })}
              disabled={!bodegas.length}
            >
              {!bodegas.length && <option value="">Crea primero una bodega</option>}
              {bodegas.map((bodega) => (
                <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Nombre de subbodega
            <input
              value={sububicacionForm.nombre}
              onChange={(event) => setSububicacionForm({ ...sububicacionForm, nombre: event.target.value })}
              placeholder="Ej. Pasillo A, Estanter?a 01"
            />
          </label>

          <label>
            C?digo
            <input
              value={sububicacionForm.codigo}
              onChange={(event) => setSububicacionForm({ ...sububicacionForm, codigo: event.target.value })}
              placeholder="Ej. BG-A01"
            />
          </label>

          <label>
            Zona
            <input
              value={sububicacionForm.zona}
              onChange={(event) => setSububicacionForm({ ...sububicacionForm, zona: event.target.value })}
              placeholder="Zona o ?rea"
            />
          </label>

          <label>
            Estado
            <select
              value={sububicacionForm.estado}
              onChange={(event) => setSububicacionForm({ ...sububicacionForm, estado: event.target.value })}
            >
              {!estadosBodega.length && <option value="Activa">Activa</option>}
              {estadosBodega.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </label>

          <label className="subbodega-description-field">
            Descripcion
            <input
              value={sububicacionForm.descripcion}
              onChange={(event) => setSububicacionForm({ ...sububicacionForm, descripcion: event.target.value })}
              placeholder="Detalle opcional"
            />
          </label>

          <button type="submit" className="responsable-submit" disabled={sububicacionLoading || !bodegas.length}>
            <Plus size={18} />
            {editingSububicacionId ? "Guardar subbodega" : "Crear subbodega"}
          </button>

          {editingSububicacionId && (
            <button type="button" className="responsable-submit ghost" onClick={resetSububicacionForm}>
              <X size={18} />
              Cancelar edicion
            </button>
          )}
        </form>

        <div className="responsables-list subbodegas-list">
          {subbodegas.length ? subbodegas.map((item) => {
            const parent = bodegaById.get(String(item.bodega_id));
            return (
              <article
                key={item.id}
                className={`responsable-card bodega-card subbodega-card ${item.activo ? "is-active" : "is-inactive"}`}
              >
                <div className="responsable-main">
                  <div className="bodega-icon-dot">
                    <MapPin size={18} />
                  </div>

                  <div className="responsable-info">
                    <strong>{item.nombre}</strong>
                    <span>
                      {parent?.nombre || "Sin bodega"} ? {item.codigo || "Sin codigo"} ? {item.zona || "Sin zona"}
                    </span>
                  </div>
                </div>

                <div className="responsable-state">
                  <span className={item.activo ? "state-pill active" : "state-pill inactive"}>
                    {item.activo ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    {item.estado}
                  </span>

                  <button type="button" className="mini-action" onClick={() => editSububicacion(item)}>
                    <Edit3 size={15} />
                    Editar
                  </button>

                  <button
                    type="button"
                    className={`mini-action ${item.activo ? "danger" : "success"}`}
                    onClick={() => toggleSububicacion(item.id)}
                  >
                    <Power size={15} />
                    {item.activo ? "Desactivar" : "Activar"}
                  </button>

                  <button type="button" className="mini-action danger" onClick={() => deleteSububicacion(item.id)}>
                    <X size={15} />
                    Eliminar
                  </button>
                </div>
              </article>
            );
          }) : (
            <div className="empty-next empty-bodegas">
              <MapPin size={32} />
              <strong>Sin subbodegas creadas</strong>
              <span>Crea subbodegas dentro de tus bodegas 5S.</span>
            </div>
          )}
        </div>
      </section>

      <section className="portal-panel responsables-summary">
        <div>
          <span className="portal-panel-kicker">RESUMEN DEL SISTEMA</span>
          <h3>Datos maestros 5S</h3>
        </div>

        <div className="summary-grid">
          <div>
            <small>Total responsables</small>
            <strong>{responsables.length}</strong>
          </div>
          <div>
            <small>Activos</small>
            <strong>{activos}</strong>
          </div>
          <div>
            <small>Bodegas creadas</small>
            <strong>{bodegas.length}</strong>
          </div>
          <div>
            <small>Subbodegas</small>
            <strong>{subbodegas.length}</strong>
          </div>
          <div>
            <small>Inactivos</small>
            <strong>{inactivos}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}


function InspeccionView() {
  const [bodegas, setBodegas] = useState([]);
  const [bodegaError, setBodegaError] = useState("");
  const [responsables, setResponsables] = useState([]);
  const [config5S, setConfig5S] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [inspectionSaving, setInspectionSaving] = useState(false);
  const [inspectionHistory, setInspectionHistory] = useState([]);

  const [selectedBodega, setSelectedBodega] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [responsable, setResponsable] = useState("");
  const [area, setArea] = useState("");
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");

  const checklist = checklistItems.map((item) => item.pregunta);
  const severidades = config5S?.severidades || [];
  const pilares = config5S?.pilares || [];
  const defaultSeveridad = severidades[1] || severidades[0] || "";
  const defaultPilar = pilares[0] || "";

  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      loadBodegasFromApi(true),
      getResponsables5S({ activo: true }),
      getInspecciones5S(),
      getConfig5S(),
    ])
      .then(([rows, responsablesRows, inspeccionesRows, configData]) => {
        if (!active) return;
        const nextResponsables = (responsablesRows || []).map(normalizeResponsable5S);

        setBodegas(rows);
        setResponsables(nextResponsables);
        setInspectionHistory(inspeccionesRows || []);
        setConfig5S(configData || null);
        setSelectedBodega((current) => current || rows[0]?.nombre || "");
        setResponsable((current) => current || nextResponsables[0]?.nombre || "");
      })
      .catch((error) => {
        console.error("No se pudieron cargar los datos de inspección 5S:", error);
        if (active) setBodegaError("No se pudieron cargar los datos desde la base de datos.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBodega) {
      setChecklistItems([]);
      setAnswers([]);
      return;
    }

    let active = true;
    setChecklistLoading(true);

    getChecklist5S({ bodega: selectedBodega, activeOnly: true })
      .then((rows) => {
        if (!active) return;
        const nextItems = (rows || []).map(normalizeChecklistItem5S);
        setChecklistItems(nextItems);
        setAnswers(nextItems.map((item, index) => ({
          id: item.id,
          orden: item.orden || index + 1,
          pilar: item.pilar || defaultPilar,
          pregunta: item.pregunta,
          peso: item.peso || 1,
          requiere_evidencia: item.requiere_evidencia,
          estado: "na",
          severidad: defaultSeveridad,
          observacion: "",
          evidencias: [],
        })));
      })
      .catch((error) => {
        console.error("No se pudo cargar el checklist 5S:", error);
        if (active) {
          setChecklistItems([]);
          setAnswers([]);
          setBodegaError(error.message || "No se pudo cargar el checklist desde la base de datos.");
        }
      })
      .finally(() => {
        if (active) setChecklistLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBodega, defaultSeveridad, defaultPilar]);

  const total = answers.length;
  const conformes = answers.filter((item) => item.estado === "cumple").length;
  const noConformes = answers.filter((item) => item.estado === "no_cumple").length;
  const na = answers.filter((item) => item.estado === "na").length;
  const pesoEvaluable = answers
    .filter((item) => item.estado !== "na")
    .reduce((sum, item) => sum + Number(item.peso || 1), 0);
  const pesoConforme = answers
    .filter((item) => item.estado === "cumple")
    .reduce((sum, item) => sum + Number(item.peso || 1), 0);
  const cumplimiento = pesoEvaluable > 0 ? Math.round((pesoConforme / pesoEvaluable) * 1000) / 10 : 0;
  const hallazgos = answers.filter((item) => item.observacion.trim() || item.estado === "no_cumple").length;
  const nivel = scoreLevel(cumplimiento);

  function updateAnswer(id, key, value) {
    setAnswers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  }

  function addEvidence(id, files) {
    const selected = Array.from(files || []).slice(0, 8);
    if (!selected.length) return;

    const readers = selected.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: `${Date.now()}_${file.name}`,
              name: file.name,
              src: reader.result,
            });
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((evidencias) => {
      setAnswers((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, evidencias: [...item.evidencias, ...evidencias] }
            : item
        )
      );
    });
  }

  function removeEvidence(answerId, evidenceId) {
    setAnswers((prev) =>
      prev.map((item) =>
        item.id === answerId
          ? { ...item, evidencias: item.evidencias.filter((ev) => ev.id !== evidenceId) }
          : item
      )
    );
  }

  function updateQuestion(index, value) {
    setChecklistItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, pregunta: value } : item))
    );

    setAnswers((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, pregunta: value } : item))
    );
  }

  function updateChecklistMeta(index, key, value) {
    setChecklistItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );

    setAnswers((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
  }

  async function saveQuestion(item) {
    if (!selectedBodega || !item?.pregunta?.trim()) return;

    try {
      const updated = await editarChecklistItem5S(item.id, {
        bodega: selectedBodega,
        pilar: item.pilar || null,
        pregunta: item.pregunta.trim(),
        orden: item.orden,
        peso: Number(item.peso || 1),
        requiere_evidencia: Boolean(item.requiere_evidencia),
        activo: item.activo,
      });

      setChecklistItems((prev) =>
        prev.map((current) =>
          current.id === item.id ? normalizeChecklistItem5S(updated) : current
        )
      );
    } catch (error) {
      console.error("No se pudo actualizar el punto 5S:", error);
      setBodegaError(error.message || "No se pudo actualizar el checklist en la base de datos.");
    }
  }

  async function addQuestion() {
    if (!selectedBodega) {
      alert("Selecciona una bodega activa antes de crear puntos de control.");
      return;
    }

    if (!newQuestion.trim()) {
      alert("Escribe la nueva pregunta del checklist.");
      return;
    }

    try {
      const created = await crearChecklistItem5S({
        bodega: selectedBodega,
        pilar: defaultPilar || null,
        pregunta: newQuestion.trim(),
        orden: checklistItems.length + 1,
        peso: 1,
        requiere_evidencia: false,
        activo: true,
      });

      const nextItem = normalizeChecklistItem5S(created);
      setChecklistItems((prev) => [...prev, nextItem]);
      setAnswers((prev) => [
        ...prev,
        {
          id: nextItem.id,
          orden: nextItem.orden || prev.length + 1,
          pilar: nextItem.pilar || defaultPilar,
          pregunta: nextItem.pregunta,
          peso: nextItem.peso || 1,
          requiere_evidencia: nextItem.requiere_evidencia,
          estado: "na",
          severidad: defaultSeveridad,
          observacion: "",
          evidencias: [],
        },
      ]);
      setNewQuestion("");
    } catch (error) {
      console.error("No se pudo crear el punto 5S:", error);
      setBodegaError(error.message || "No se pudo guardar el checklist en la base de datos.");
    }
  }

  async function deleteQuestion(index) {
    if (!window.confirm("¿Eliminar esta pregunta del checklist?")) return;

    const item = checklistItems[index];
    if (!item) return;

    try {
      await eliminarChecklistItem5S(item.id);
      setChecklistItems((prev) => prev.filter((_, idx) => idx !== index));
      setAnswers((prev) => prev.filter((_, idx) => idx !== index));
    } catch (error) {
      console.error("No se pudo eliminar el punto 5S:", error);
      setBodegaError(error.message || "No se pudo eliminar el checklist en la base de datos.");
    }
  }

  async function saveInspection() {
    if (!selectedBodega) {
      alert("Debes crear y seleccionar una bodega activa desde la base de datos.");
      return;
    }

    const evaluados = answers.filter((item) => item.estado !== "na");

    if (!evaluados.length) {
      alert("Debes evaluar al menos un punto del checklist guardado en base de datos.");
      return;
    }

    const payload = {
      fecha,
      bodega: selectedBodega,
      responsable,
      area,
      items: evaluados.map((item) => ({
        punto: item.pregunta,
        pilar: item.pilar || null,
        peso: Number(item.peso || 1),
        cumple: item.estado === "cumple",
        severidad: item.severidad,
        observacion: item.observacion || null,
        evidencias: item.evidencias.map((ev) => ({
          nombre_archivo: ev.name,
          url: ev.src,
        })),
      })),
    };

    setInspectionSaving(true);

    try {
      const saved = await crearInspeccion5S(payload);
      setInspectionHistory((prev) => [saved, ...prev]);
      alert("Inspeccion guardada correctamente en base de datos.");
    } catch (error) {
      console.error("No se pudo guardar la inspeccion 5S:", error);
      alert(error.message || "No se pudo guardar la inspeccion en la base de datos.");
    } finally {
      setInspectionSaving(false);
    }

  }

  function openPrintReport() {
    const report = document.getElementById("informe5s-preview");
    if (!report) return;

    const win = window.open("", "_blank", "width=1100,height=800");
    win.document.write(`
      <html>
        <head>
          <title>Informe 5S - ${selectedBodega}</title>
          <style>
            @page { size: Letter; margin: 12mm; }
            body { margin: 0; background: #eef3f8; font-family: Inter, Arial, sans-serif; }
            .letter-report-page { width: 216mm; min-height: 279mm; margin: 0 auto 12px; box-shadow: none !important; border-radius: 0 !important; }
            .report-actions-screen { display: none !important; }
            img { max-width: 100%; }
          </style>
          <link rel="stylesheet" href="/src/pages/5s/calidad5s.css">
        </head>
        <body>${report.outerHTML}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  }

  const evidenciaTotal = answers.reduce((sum, item) => sum + item.evidencias.length, 0);
  const destacados = answers.filter((item) => item.evidencias.length).slice(0, 6);
  const hallazgosDetalle = answers.filter(
    (item) => item.estado === "no_cumple" || item.observacion.trim()
  );

  return (
    <div className="portal-shell inspeccion-shell">
      <section className="portal-hero inspeccion-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Inspección 5S</h2>
          <p>
            Realiza inspección por bodega, registra evidencias, edita checklist
            y genera informe ejecutivo en hoja carta.
          </p>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card inspeccion-status-card">
            <div className="portal-status-top">
              <div className="portal-status-icon">
                <ClipboardCheck size={18} />
              </div>
              <span className={`portal-status-pill ${reportStatus(cumplimiento)}`}>{nivel}</span>
            </div>

            <div className="portal-status-body">
              <strong>Información de la inspección</strong>
              <p>Control por bodega con cumplimiento, hallazgos y evidencia fotográfica.</p>
            </div>

            <div className="portal-status-grid">
              <div>
                <small>Fecha</small>
                <b>{fecha}</b>
              </div>
              <div>
                <small>Bodega</small>
                <b>{selectedBodega}</b>
              </div>
              <div>
                <small>Responsable</small>
                <b>{responsable || "Sin asignar"}</b>
              </div>
              <div>
                <small>Cumplimiento</small>
                <b>{cumplimiento}%</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-panel inspeccion-control-panel">
        <div className="inspeccion-control-grid">
          <label>
            1. Seleccionar bodega
            <select value={selectedBodega} onChange={(e) => setSelectedBodega(e.target.value)}>
              {bodegas.length ? (
                bodegas.map((bodega) => (
                  <option key={bodega.id} value={bodega.nombre}>
                    {bodega.nombre}
                  </option>
                ))
              ) : (
                <option value="">Sin bodegas activas</option>
              )}
            </select>
            {bodegaError && <small>{bodegaError}</small>}
          </label>

          <label>
            2. Responsable
            <select value={responsable} onChange={(e) => setResponsable(e.target.value)}>
              {responsables.length ? (
                responsables.map((item) => (
                  <option key={item.id} value={item.nombre}>
                    {item.nombre}
                  </option>
                ))
              ) : (
                <option value="">Sin responsables activos</option>
              )}
            </select>
          </label>

          <label>
            3. Fecha de inspección
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>

          <label>
            4. Área / proceso
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Área / proceso" />
          </label>
        </div>

        <div className="inspeccion-actions-row">
          <button type="button" className="portal-secondary-btn" onClick={() => setEditingChecklist((value) => !value)}>
            <Edit3 size={17} />
            {editingChecklist ? "Cerrar edición" : "Editar checklist de la bodega"}
          </button>

          <button type="button" className="portal-secondary-btn">
            <Clock3 size={17} />
            Ver historial
          </button>

          <button
            type="button"
            className="portal-primary-btn"
            onClick={saveInspection}
            disabled={inspectionSaving || checklistLoading}
          >
            <Save size={17} />
            {inspectionSaving ? "Guardando..." : "Guardar inspección"}
          </button>

          <button type="button" className="portal-secondary-btn" onClick={openPrintReport}>
            <Printer size={17} />
            Imprimir informe carta
          </button>
        </div>
      </section>

      {editingChecklist && (
        <section className="portal-panel checklist-editor-panel">
          <div className="portal-panel-head">
            <div>
              <span className="portal-panel-kicker">CHECKLIST EDITABLE</span>
              <h3>Preguntas asociadas a {selectedBodega}</h3>
              <p>Edita, agrega o elimina puntos de control para esta bodega.</p>
            </div>
          </div>

          <div className="checklist-edit-list">
            {checklist.map((pregunta, index) => (
              <div key={checklistItems[index]?.id || `${pregunta}-${index}`} className="checklist-edit-row">
                <span>{index + 1}</span>
                <select
                  value={checklistItems[index]?.pilar || ""}
                  onChange={(e) => updateChecklistMeta(index, "pilar", e.target.value)}
                  onBlur={() => saveQuestion(checklistItems[index])}
                >
                  <option value="">Sin pilar</option>
                  {pilares.map((pilar) => (
                    <option key={pilar} value={pilar}>{pilar}</option>
                  ))}
                </select>
                <input
                  value={pregunta}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  onBlur={() => saveQuestion(checklistItems[index])}
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={checklistItems[index]?.peso || 1}
                  onChange={(e) => updateChecklistMeta(index, "peso", e.target.value)}
                  onBlur={() => saveQuestion(checklistItems[index])}
                />
                <label className="checklist-requires-evidence">
                  <input
                    type="checkbox"
                    checked={Boolean(checklistItems[index]?.requiere_evidencia)}
                    onChange={(e) => {
                      updateChecklistMeta(index, "requiere_evidencia", e.target.checked);
                      setTimeout(() => saveQuestion({ ...checklistItems[index], requiere_evidencia: e.target.checked }), 0);
                    }}
                  />
                  Evidencia
                </label>
                <button type="button" onClick={() => deleteQuestion(index)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="checklist-add-row">
            <input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Nueva pregunta del checklist..."
            />
            <button type="button" onClick={addQuestion}>
              <Plus size={16} />
              Agregar pregunta
            </button>
          </div>
        </section>
      )}

      <section className="inspeccion-work-grid">
        <article className="portal-panel checklist-panel">
          <div className="checklist-head">
            <div>
              <span className="portal-panel-kicker">CHECKLIST 5S</span>
              <h3>{selectedBodega}</h3>
            </div>

            <div className="progress-mini">
              <span>Progreso total</span>
              <div>
                <i style={{ width: `${cumplimiento}%` }} />
              </div>
              <strong>{cumplimiento}%</strong>
            </div>
          </div>

          <div className="checklist-table">
            <div className="checklist-table-head">
              <span>#</span>
              <span>Requisito / Actividad</span>
              <span>Cumple</span>
              <span>No cumple</span>
              <span>N/A</span>
              <span>Observación</span>
              <span>Evidencia</span>
            </div>

            {answers.map((item) => (
              <div className="checklist-row" key={item.id}>
                <span className="row-index">{item.id}</span>
                <strong className="checklist-question-cell">
                  <span>{item.pilar || "Sin pilar"}</span>
                  {item.pregunta}
                  <small>Peso {item.peso || 1}{item.requiere_evidencia ? " · Evidencia requerida" : ""}</small>
                </strong>

                <label className="radio-cell">
                  <input
                    type="radio"
                    name={`estado_${item.id}`}
                    checked={item.estado === "cumple"}
                    onChange={() => updateAnswer(item.id, "estado", "cumple")}
                  />
                </label>

                <label className="radio-cell">
                  <input
                    type="radio"
                    name={`estado_${item.id}`}
                    checked={item.estado === "no_cumple"}
                    onChange={() => updateAnswer(item.id, "estado", "no_cumple")}
                  />
                </label>

                <label className="radio-cell">
                  <input
                    type="radio"
                    name={`estado_${item.id}`}
                    checked={item.estado === "na"}
                    onChange={() => updateAnswer(item.id, "estado", "na")}
                  />
                </label>

                <div className="row-observation">
                  <select
                    value={item.severidad}
                    onChange={(e) => updateAnswer(item.id, "severidad", e.target.value)}
                  >
                    {!severidades.length && <option value="">Sin severidades configuradas</option>}
                    {severidades.map((severidad) => (
                      <option key={severidad} value={severidad}>{severidad}</option>
                    ))}
                  </select>
                  <textarea
                    value={item.observacion}
                    onChange={(e) => updateAnswer(item.id, "observacion", e.target.value)}
                    placeholder="Hallazgo, novedad o acción correctiva requerida..."
                  />
                </div>

                <div className="evidence-cell">
                  <label className="evidence-upload">
                    <Camera size={16} />
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => addEvidence(item.id, e.target.files)}
                    />
                  </label>

                  <span>{item.evidencias.length}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="inspeccion-side-stack">
          <article className="portal-panel inspection-summary-card">
            <div className="portal-panel-kicker">RESUMEN DE LA INSPECCIÓN</div>

            <div className="inspection-donut">
              <div className={`donut-ring ${reportStatus(cumplimiento)}`} style={{ "--score": `${cumplimiento * 3.6}deg` }}>
                <div>
                  <strong>{cumplimiento}%</strong>
                  <span>Cumplimiento</span>
                </div>
              </div>
            </div>

            <div className="inspection-score-list">
              <span className="ok"><CheckCircle2 size={15} /> Cumple <b>{conformes}</b></span>
              <span className="bad"><X size={15} /> No cumple <b>{noConformes}</b></span>
              <span className="na"><Circle size={15} /> N/A <b>{na}</b></span>
              <span>Total items <b>{total}</b></span>
            </div>
          </article>

          <article className="portal-panel inspection-evidence-card">
            <div className="portal-panel-kicker">EVIDENCIAS FOTOGRÁFICAS</div>

            <div className="evidence-preview-grid">
              {answers.flatMap((item) =>
                item.evidencias.map((ev) => ({ ...ev, pregunta: item.pregunta, answerId: item.id }))
              ).slice(0, 5).map((ev) => (
                <div key={ev.id} className="evidence-thumb">
                  <img src={ev.src} alt={ev.name} />
                  <button type="button" onClick={() => removeEvidence(ev.answerId, ev.id)}>
                    <X size={12} />
                  </button>
                </div>
              ))}

              <div className="evidence-add-tile">
                <ImagePlus size={22} />
                <span>{evidenciaTotal} evidencias</span>
              </div>
            </div>

            <small>Puedes subir múltiples evidencias por cada punto del checklist.</small>
          </article>

          <article className="portal-panel inspection-actions-card">
            <div className="portal-panel-kicker">ACCIONES</div>

            <button
              type="button"
              className="portal-primary-btn"
              onClick={saveInspection}
              disabled={inspectionSaving || checklistLoading}
            >
              <Save size={17} />
              {inspectionSaving ? "Guardando..." : "Guardar inspección"}
            </button>

            <button type="button" className="portal-secondary-btn" onClick={openPrintReport}>
              <Eye size={17} />
              Vista previa / imprimir
            </button>

            <button type="button" className="portal-secondary-btn" onClick={openPrintReport}>
              <FileDown size={17} />
              Generar informe PDF
            </button>
          </article>
        </aside>
      </section>

      <section className="report-preview-shell">
        <div className="report-preview-head">
          <div>
            <span className="portal-panel-kicker">INFORME EJECUTIVO 5S</span>
            <h3>Propuesta mejorada - Hoja carta</h3>
          </div>

          <button type="button" className="portal-secondary-btn" onClick={openPrintReport}>
            <Download size={17} />
            Imprimir / guardar PDF
          </button>
        </div>

        <div id="informe5s-preview" className="letter-report-page">
          <div className="report-cover">
            <div className="report-brand">
              <LogoImage tone="dark" />
              <div>
                <strong>INOVA</strong>
                <span>CALIDAD 5S</span>
              </div>
            </div>

            <div className="report-title-block">
              <span>INFORME EJECUTIVO DE AUDITORÍA 5S</span>
              <h2>{selectedBodega}</h2>
              <p>Control visual, cumplimiento por bodega, hallazgos y evidencias fotográficas.</p>
            </div>

            <div className={`report-score-card ${reportStatus(cumplimiento)}`}>
              <small>Cumplimiento</small>
              <strong>{cumplimiento}%</strong>
              <span>{nivel}</span>
            </div>
          </div>

          <div className="report-meta-grid">
            <div>
              <small>Fecha de inspección</small>
              <strong>{fecha}</strong>
            </div>
            <div>
              <small>Responsable</small>
              <strong>{responsable}</strong>
            </div>
            <div>
              <small>Área / Proceso</small>
              <strong>{area}</strong>
            </div>
            <div>
              <small>Meta requerida</small>
              <strong>&gt;= 90%</strong>
            </div>
          </div>

          <div className="report-kpi-row">
            <div><small>Puntos evaluados</small><strong>{total}</strong></div>
            <div><small>Puntos conformes</small><strong>{conformes}</strong></div>
            <div><small>No conformes</small><strong>{noConformes}</strong></div>
            <div><small>N/A</small><strong>{na}</strong></div>
            <div><small>Hallazgos</small><strong>{hallazgos}</strong></div>
          </div>

          <div className="report-section">
            <h3>1. Matriz técnica de verificación</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Punto evaluado</th>
                  <th>Estado</th>
                  <th>Severidad</th>
                  <th>Observación</th>
                  <th>Fotos</th>
                </tr>
              </thead>
              <tbody>
                {answers.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.pregunta}</td>
                    <td>{item.estado === "cumple" ? "Conforme" : item.estado === "no_cumple" ? "No conforme" : "N/A"}</td>
                    <td>{item.severidad}</td>
                    <td>{item.observacion || "-"}</td>
                    <td>{item.evidencias.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-section">
            <h3>2. Evidencias fotográficas destacadas</h3>
            {destacados.length ? (
              <div className="report-evidence-grid">
                {destacados.map((item) =>
                  item.evidencias.slice(0, 3).map((ev) => (
                    <figure key={ev.id}>
                      <img src={ev.src} alt={ev.name} />
                      <figcaption>Punto {item.id}: {item.pregunta}</figcaption>
                    </figure>
                  ))
                )}
              </div>
            ) : (
              <div className="report-empty-box">Sin evidencias fotográficas cargadas.</div>
            )}
          </div>

          <div className="report-section">
            <h3>3. Hallazgos y acciones sugeridas</h3>
            {hallazgosDetalle.length ? (
              <div className="report-findings">
                {hallazgosDetalle.map((item) => (
                  <article key={item.id}>
                    <b>{item.id}. {item.pregunta}</b>
                    <span>Estado: {item.estado === "cumple" ? "Conforme con observación" : item.estado === "no_cumple" ? "No conforme" : "N/A"}</span>
                    <span>Severidad: {item.severidad}</span>
                    <p>{item.observacion || "Revisar condición y documentar seguimiento preventivo."}</p>
                    <small>Acción sugerida: ejecutar acción correctiva y validar cierre en próxima auditoría.</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="report-empty-box">Sin hallazgos registrados.</div>
            )}
          </div>

          <div className="report-footer">
            <span>INOVA · Sistema 5S</span>
            <span>Informe generado automáticamente</span>
            <span>Hoja carta</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardView() {
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  function loadDashboard() {
    setDashboardLoading(true);
    setDashboardError("");

    getDashboard5S()
      .then((data) => setDashboard(data))
      .catch((error) => {
        console.error("No se pudo cargar el dashboard 5S:", error);
        setDashboardError(error.message || "No se pudo cargar el dashboard desde la base de datos.");
      })
      .finally(() => setDashboardLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const porBodega = dashboard?.por_bodega || [];
  const porResponsable = dashboard?.por_responsable || [];
  const promedio = Number(dashboard?.promedio_general || 0);
  const metaGeneral = Number(dashboard?.meta_general || 0);
  const estadoGeneral = dashboard?.estado_general || "Sin auditoría";

  return (
    <div className="portal-shell dashboard-shell">
      <section className="portal-hero dashboard-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Dashboard ejecutivo</h2>
          <p>
            Indicadores calculados desde inspecciones, bodegas activas y responsables registrados en base de datos.
          </p>

          <div className="portal-hero-actions">
            <button type="button" className="portal-secondary-btn" onClick={loadDashboard} disabled={dashboardLoading}>
              <RefreshCw size={17} />
              {dashboardLoading ? "Actualizando..." : "Actualizar datos"}
            </button>
          </div>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card dashboard-status-card">
            <div className="portal-status-top">
              <div className="portal-status-icon">
                <BarChart3 size={18} />
              </div>
              <span className={`portal-status-pill ${reportStatus(promedio)}`}>{estadoGeneral}</span>
            </div>

            <div className="portal-status-body">
              <strong>{promedio}%</strong>
              <p>Promedio general contra meta de {metaGeneral}%.</p>
            </div>

            <div className="portal-status-grid">
              <div>
                <small>Auditorias</small>
                <b>{dashboard?.total_inspecciones  -  0}</b>
              </div>
              <div>
                <small>Bodegas activas</small>
                <b>{dashboard?.bodegas_activas  -  0}</b>
              </div>
              <div>
                <small>Bajo meta</small>
                <b>{dashboard?.bajo_meta  -  0}</b>
              </div>
              <div>
                <small>Meta bodega</small>
                <b>{dashboard?.meta_bodega  -  0}%</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {dashboardError && <article className="portal-panel dashboard-error">{dashboardError}</article>}

      <section className="dashboard-summary-grid">
        <article className="portal-panel dashboard-metric-card">
          <span className="portal-panel-kicker">CUMPLIMIENTO</span>
          <strong>{promedio}%</strong>
          <div className="dashboard-progress">
            <i style={{ width: `${Math.min(promedio, 100)}%` }} />
          </div>
          <small>{estadoGeneral}</small>
        </article>

        <article className="portal-panel dashboard-metric-card">
          <span className="portal-panel-kicker">AUDITORÍAS</span>
          <strong>{dashboard?.total_inspecciones  -  0}</strong>
          <small>Registros guardados en base de datos</small>
        </article>

        <article className="portal-panel dashboard-metric-card">
          <span className="portal-panel-kicker">COBERTURA</span>
          <strong>{dashboard?.bodegas_activas  -  0}</strong>
          <small>Bodegas activas configuradas</small>
        </article>
      </section>

      <section className="dashboard-content-grid">
        <article className="portal-panel dashboard-table-panel">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">POR BODEGA</span>
            <h3>Cumplimiento por bodega</h3>
            <p>Promedio, auditorías y estado por cada bodega registrada.</p>
          </div>

          <div className="dashboard-list">
            {dashboardLoading ? (
              <div className="dashboard-empty">Cargando datos desde base de datos...</div>
            ) : porBodega.length ? (
              porBodega.map((item) => {
                const score = Number(item.cumplimiento || 0);
                return (
                  <div className="dashboard-row" key={item.bodega}>
                    <div>
                      <strong>{item.bodega}</strong>
                      <small>{item.auditorias} auditorías · Meta {item.meta}%</small>
                    </div>
                    <div className="dashboard-row-score">
                      <span className={`portal-status-pill ${reportStatus(score)}`}>{item.estado}</span>
                      <b>{score}%</b>
                    </div>
                    <div className="dashboard-progress">
                      <i style={{ width: `${Math.min(score, 100)}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="dashboard-empty">Sin bodegas o auditorías registradas en base de datos.</div>
            )}
          </div>
        </article>

        <article className="portal-panel dashboard-table-panel">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">POR RESPONSABLE</span>
            <h3>Ranking de responsables</h3>
            <p>Resultado promedio de las inspecciones asignadas.</p>
          </div>

          <div className="dashboard-list">
            {dashboardLoading ? (
              <div className="dashboard-empty">Cargando responsables desde base de datos...</div>
            ) : porResponsable.length ? (
              porResponsable.map((item) => {
                const score = Number(item.cumplimiento || 0);
                return (
                  <div className="dashboard-row compact" key={item.responsable}>
                    <div>
                      <strong>{item.responsable}</strong>
                      <small>{item.auditorias} auditorías</small>
                    </div>
                    <div className="dashboard-row-score">
                      <span className={`portal-status-pill ${reportStatus(score)}`}>{item.estado}</span>
                      <b>{score}%</b>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="dashboard-empty">Sin inspecciones asociadas a responsables.</div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function ConfigView() {
  const [config5S, setConfig5S] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");

  function loadConfig() {
    setConfigLoading(true);
    setConfigError("");

    getConfig5S()
      .then((data) => setConfig5S(data || null))
      .catch((error) => {
        console.error("No se pudo cargar la configuración 5S:", error);
        setConfigError(error.message || "No se pudo cargar la configuración desde la base de datos.");
      })
      .finally(() => setConfigLoading(false));
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const bodegas = config5S?.bodegas || [];
  const estadosBodega = config5S?.estados_bodega || [];
  const estadosCronograma = config5S?.estados_cronograma || [];
  const prioridades = config5S?.prioridades_cronograma || [];
  const severidades = config5S?.severidades || [];

  return (
    <div className="portal-shell config-shell">
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Configuración</h2>
          <p>Consulta parámetros, estados y catálogos que consume el portal desde la base de datos.</p>

          <div className="portal-hero-actions">
            <button type="button" className="portal-secondary-btn" onClick={loadConfig} disabled={configLoading}>
              <RefreshCw size={17} />
              {configLoading ? "Actualizando..." : "Actualizar configuración"}
            </button>
          </div>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card compact">
            <div className="portal-status-top">
              <div className="portal-status-icon">
                <Settings size={18} />
              </div>
              <span className="portal-status-pill">BD</span>
            </div>

            <div className="portal-status-grid">
              <div>
                <small>Meta bodega</small>
                <b>{config5S?.meta_bodega  -  0}%</b>
              </div>
              <div>
                <small>Meta general</small>
                <b>{config5S?.meta_general  -  0}%</b>
              </div>
              <div>
                <small>Bodegas</small>
                <b>{bodegas.length}</b>
              </div>
              <div>
                <small>Estados</small>
                <b>{estadosCronograma.length}</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {configError && <article className="portal-panel dashboard-error">{configError}</article>}

      <section className="dashboard-content-grid">
        <article className="portal-panel dashboard-table-panel">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">CATÁLOGOS</span>
            <h3>Estados y parámetros</h3>
            <p>Valores publicados por el backend para cronograma, inspeccion y bodegas.</p>
          </div>

          <div className="config-token-grid">
            <div>
              <strong>Estados de bodega</strong>
              <span>{estadosBodega.length ? estadosBodega.join(" · ") : "Sin datos"}</span>
            </div>
            <div>
              <strong>Estados de cronograma</strong>
              <span>{estadosCronograma.length ? estadosCronograma.join(" · ") : "Sin datos"}</span>
            </div>
            <div>
              <strong>Prioridades</strong>
              <span>{prioridades.length ? prioridades.join(" · ") : "Sin datos"}</span>
            </div>
            <div>
              <strong>Severidades</strong>
              <span>{severidades.length ? severidades.join(" · ") : "Sin datos"}</span>
            </div>
          </div>
        </article>

        <article className="portal-panel dashboard-table-panel">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">BODEGAS</span>
            <h3>Bodegas configuradas</h3>
            <p>Listado consultado desde la base de datos.</p>
          </div>

          <div className="dashboard-list">
            {configLoading ? (
              <div className="dashboard-empty">Cargando configuración...</div>
            ) : bodegas.length ? (
              bodegas.map((bodega) => (
                <div className="dashboard-row compact" key={bodega.id || bodega.nombre}>
                  <div>
                    <strong>{bodega.nombre}</strong>
                    <small>{bodega.area || "Sin área"} · {bodega.estado || "Sin estado"}</small>
                  </div>
                  <div className="dashboard-row-score">
                    <b>{bodega.meta_bodega  -  config5S?.meta_bodega  -  0}%</b>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">Sin bodegas registradas en base de datos.</div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function ConfigViewAdmin() {
  const [config5S, setConfig5S] = useState(null);
  const [configForm, setConfigForm] = useState({ meta_bodega: "", meta_general: "" });
  const [catalogForm, setCatalogForm] = useState({
    id: null,
    tipo: "",
    nombre: "",
    orden: 0,
    activo: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function loadConfig() {
    setLoading(true);
    setError("");

    getConfig5S()
      .then((data) => {
        const next = data || {};
        const firstTipo = next.catalog_types?.[0]?.tipo || "";

        setConfig5S(next);
        setConfigForm({
          meta_bodega: next.meta_bodega  -  "",
          meta_general: next.meta_general  -  "",
        });
        setCatalogForm((prev) => ({
          ...prev,
          tipo: prev.tipo || firstTipo,
        }));
      })
      .catch((loadError) => {
        console.error("No se pudo cargar configuración 5S:", loadError);
        setError(loadError.message || "No se pudo cargar la configuración desde la base de datos.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const catalogTypes = config5S?.catalog_types || [];
  const catalogos = config5S?.catalogos || [];
  const bodegas = config5S?.bodegas || [];

  const catalogosPorTipo = catalogTypes.map((type) => ({
    ...type,
    items: catalogos.filter((item) => item.tipo === type.tipo),
  }));

  async function saveMetas(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const updated = await guardarConfig5S({
        meta_bodega: configForm.meta_bodega === "" ? null : Number(configForm.meta_bodega),
        meta_general: configForm.meta_general === "" ? null : Number(configForm.meta_general),
      });
      setConfig5S(updated);
    } catch (saveError) {
      console.error("No se pudieron guardar las metas 5S:", saveError);
      setError(saveError.message || "No se pudieron guardar las metas en la base de datos.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCatalogo(event) {
    event.preventDefault();

    if (!catalogForm.tipo || !catalogForm.nombre.trim()) {
      setError("Selecciona un tipo y escribe el nombre del valor.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      tipo: catalogForm.tipo,
      nombre: catalogForm.nombre.trim(),
      orden: Number(catalogForm.orden || 0),
      activo: Boolean(catalogForm.activo),
    };

    try {
      if (catalogForm.id) {
        await editarCatalogo5S(catalogForm.id, payload);
      } else {
        await crearCatalogo5S(payload);
      }

      setCatalogForm((prev) => ({
        id: null,
        tipo: prev.tipo,
        nombre: "",
        orden: 0,
        activo: true,
      }));
      await loadConfig();
    } catch (saveError) {
      console.error("No se pudo guardar el catalogo 5S:", saveError);
      setError(saveError.message || "No se pudo guardar el catalogo en la base de datos.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCatalogo(item) {
    setSaving(true);
    setError("");

    try {
      await editarCatalogo5S(item.id, {
        tipo: item.tipo,
        nombre: item.nombre,
        orden: item.orden,
        activo: !item.activo,
      });
      await loadConfig();
    } catch (toggleError) {
      console.error("No se pudo actualizar el catalogo 5S:", toggleError);
      setError(toggleError.message || "No se pudo actualizar el catalogo en la base de datos.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCatalogo(item) {
    if (!window.confirm(`¿Eliminar ${item.nombre}?`)) return;

    setSaving(true);
    setError("");

    try {
      await eliminarCatalogo5S(item.id);
      await loadConfig();
    } catch (deleteError) {
      console.error("No se pudo eliminar el catalogo 5S:", deleteError);
      setError(deleteError.message || "No se pudo eliminar el catalogo de la base de datos.");
    } finally {
      setSaving(false);
    }
  }

  function editCatalogo(item) {
    setCatalogForm({
      id: item.id,
      tipo: item.tipo,
      nombre: item.nombre,
      orden: item.orden || 0,
      activo: item.activo !== false,
    });
  }

  return (
    <div className="portal-shell config-shell">
      <section className="portal-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Configuración</h2>
          <p>Administra metas y catálogos maestros. Cronograma, inspecciones y dashboard consumen estos valores desde base de datos.</p>

          <div className="portal-hero-actions">
            <button type="button" className="portal-secondary-btn" onClick={loadConfig} disabled={loading || saving}>
              <RefreshCw size={17} />
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card compact">
            <div className="portal-status-top">
              <div className="portal-status-icon">
                <Settings size={18} />
              </div>
              <span className="portal-status-pill">BD</span>
            </div>

            <div className="portal-status-grid">
              <div>
                <small>Meta bodega</small>
                <b>{config5S?.meta_bodega  -  0}%</b>
              </div>
              <div>
                <small>Meta general</small>
                <b>{config5S?.meta_general  -  0}%</b>
              </div>
              <div>
                <small>Catálogos</small>
                <b>{catalogos.length}</b>
              </div>
              <div>
                <small>Bodegas</small>
                <b>{bodegas.length}</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <article className="portal-panel dashboard-error">{error}</article>}

      <section className="config-admin-grid">
        <article className="portal-panel">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">METAS</span>
            <h3>Parámetros generales</h3>
            <p>Define los porcentajes usados por dashboard, bodegas e inspecciones.</p>
          </div>

          <form className="config-form-grid" onSubmit={saveMetas}>
            <label>
              Meta por bodega
              <input
                type="number"
                min="0"
                step="0.01"
                value={configForm.meta_bodega}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, meta_bodega: e.target.value }))}
              />
            </label>

            <label>
              Meta general
              <input
                type="number"
                min="0"
                step="0.01"
                value={configForm.meta_general}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, meta_general: e.target.value }))}
              />
            </label>

            <button type="submit" className="portal-primary-btn" disabled={saving}>
              <Save size={17} />
              {saving ? "Guardando..." : "Guardar metas"}
            </button>
          </form>
        </article>

        <article className="portal-panel">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">CATÁLOGOS</span>
            <h3>Crear valor maestro</h3>
            <p>Estados, prioridades, severidades y pilares se administran aquí.</p>
          </div>

          <form className="config-form-grid" onSubmit={saveCatalogo}>
            <label>
              Tipo
              <select
                value={catalogForm.tipo}
                onChange={(e) => setCatalogForm((prev) => ({ ...prev, tipo: e.target.value }))}
              >
                {!catalogTypes.length && <option value="">Sin tipos disponibles</option>}
                {catalogTypes.map((type) => (
                  <option key={type.tipo} value={type.tipo}>{type.nombre}</option>
                ))}
              </select>
            </label>

            <label>
              Nombre
              <input
                value={catalogForm.nombre}
                onChange={(e) => setCatalogForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Valor del catálogo"
              />
            </label>

            <label>
              Orden
              <input
                type="number"
                min="0"
                value={catalogForm.orden}
                onChange={(e) => setCatalogForm((prev) => ({ ...prev, orden: e.target.value }))}
              />
            </label>

            <label className="config-check">
              <input
                type="checkbox"
                checked={catalogForm.activo}
                onChange={(e) => setCatalogForm((prev) => ({ ...prev, activo: e.target.checked }))}
              />
              Activo
            </label>

            <button type="submit" className="portal-primary-btn" disabled={saving || !catalogTypes.length}>
              <Plus size={17} />
              {catalogForm.id ? "Guardar catálogo" : "Crear catálogo"}
            </button>
          </form>
        </article>
      </section>

      <section className="portal-panel">
        <div className="portal-panel-head">
          <span className="portal-panel-kicker">VALORES CONFIGURADOS</span>
          <h3>Catálogos maestros</h3>
          <p>Todo lo que ves aquí está leyendo y escribiendo en base de datos.</p>
        </div>

        <div className="catalog-admin-grid">
          {loading ? (
            <div className="dashboard-empty">Cargando configuración...</div>
          ) : catalogosPorTipo.length ? (
            catalogosPorTipo.map((group) => (
              <article className="catalog-group" key={group.tipo}>
                <div className="catalog-group-head">
                  <strong>{group.nombre}</strong>
                  <span>{group.items.length}</span>
                </div>

                <div className="catalog-value-list">
                  {group.items.length ? group.items.map((item) => (
                    <div className={item.activo ? "catalog-value active" : "catalog-value"} key={item.id}>
                      <div>
                        <strong>{item.nombre}</strong>
                        <small>Orden {item.orden  -  0} · {item.activo ? "Activo" : "Inactivo"}</small>
                      </div>
                      <div className="catalog-actions">
                        <button type="button" onClick={() => editCatalogo(item)} title="Editar">
                          <Edit3 size={15} />
                        </button>
                        <button type="button" onClick={() => toggleCatalogo(item)} title="Activar o desactivar">
                          <Power size={15} />
                        </button>
                        <button type="button" onClick={() => deleteCatalogo(item)} title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="dashboard-empty">Sin valores registrados.</div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="dashboard-empty">No hay tipos de catálogo disponibles.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Calidad5S() {
  const viewportWidth = useViewport();
  const config = useMemo(() => getConfig(viewportWidth), [viewportWidth]);

  const [tab, setTab] = useState("portal");
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  const usuario = getCurrentUser();
  const rol = getCurrentRole();

  useEffect(() => {
    let active = true;

    preloadImages(PRELOAD_IMAGES).then(() => {
      if (active) setAssetsReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (config.isMobile) {
      setSidebarPinned(false);
      setSidebarHover(false);
    } else {
      setMobileSidebarOpen(false);
    }
  }, [config.isMobile, tab]);

  const sidebarExpanded = config.isMobile
    ? sidebarPinned || mobileSidebarOpen
    : sidebarPinned || sidebarHover;

  const contentPaddingLeft = config.isMobile
    ? config.gap
    : (sidebarExpanded ? config.sidebarExpanded : config.sidebarCollapsed) + config.gap * 2;

  const closeMobileMenu = () => {
    if (config.isMobile) {
      setMobileSidebarOpen(false);
      setSidebarPinned(false);
    }
  };

  function renderContent() {
    if (tab === "portal") return <PortalView setTab={setTab} />;

    if (tab === "cronograma") {
      return <CronogramaView />;
    }

    if (tab === "inspeccion") {
      return <InspeccionView />;
    }

    if (tab === "responsables") {
      return <ResponsablesView />;
    }

    if (tab === "dashboard") {
      return <DashboardView />;
    }

    return <ConfigViewAdmin />;
  }

  if (!assetsReady) {
    return (
      <div className="loading-screen-5s">
        <div>
          <strong>Preparando CALIDAD 5S...</strong>
          <span>Cargando recursos visuales.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="layout-root s5-layout"
      style={{
        "--ui-scale": config.scale,
        "--header-height": `${config.headerHeight}px`,
      }}
    >
      <header className="topbar" style={{ height: config.headerHeight }}>
        <div className="topbar-left">
          <button
            type="button"
            className="top-icon-btn"
            onClick={() => {
              if (config.isMobile) {
                setMobileSidebarOpen((value) => !value);
                setSidebarPinned((value) => !value);
              } else {
                setSidebarPinned((value) => !value);
              }
            }}
            aria-label={sidebarExpanded ? "Cerrar menú" : "Abrir menú"}
          >
            {config.isMobile ? (
              sidebarExpanded ? <X size={20} /> : <Menu size={21} />
            ) : sidebarPinned ? (
              <PanelLeftClose size={19} />
            ) : (
              <PanelLeftOpen size={19} />
            )}
          </button>

          <BrandHeader />
        </div>

        <div className="topbar-right">
          <button type="button" className="top-icon-btn notification-btn" aria-label="Notificaciones">
            <Bell size={18} />
            <i />
          </button>

          <div className="user-chip">
            <div className="user-avatar">
              <UserRound size={17} />
            </div>
            <div className="user-info">
              <strong>{usuario}</strong>
              <small>{rol}</small>
            </div>
            <ChevronDown className="user-chevron" size={16} />
          </div>
        </div>
      </header>

      {!config.isMobile && !sidebarPinned && (
        <div
          className="sidebar-hotzone-global"
          onMouseEnter={() => setSidebarHover(true)}
        />
      )}

      <section className="workspace" style={{ height: `calc(100dvh - ${config.headerHeight}px)` }}>
        <main className="content-area">
          <div
            className="content-wrap"
            style={{
              paddingLeft: contentPaddingLeft,
              paddingRight: config.gap,
              paddingTop: config.gap,
              paddingBottom: config.gap,
            }}
          >
            <div className="content-card">
              {renderContent()}
            </div>
          </div>
        </main>

        {config.isMobile && sidebarExpanded && (
          <button
            type="button"
            className="mobile-backdrop"
            aria-label="Cerrar menú"
            onClick={() => {
              setMobileSidebarOpen(false);
              setSidebarPinned(false);
            }}
          />
        )}

        <aside
          className={sidebarExpanded ? "sidebar expanded" : "sidebar collapsed"}
          style={{
            width: sidebarExpanded ? config.sidebarExpanded : config.sidebarCollapsed,
            left: config.gap,
            top: config.gap,
            height: `calc(100% - ${config.gap * 2}px)`,
            transform:
              config.isMobile && !sidebarExpanded
                ? `translateX(-${config.sidebarExpanded + config.gap}px)`
                : "translateX(0)",
          }}
          onMouseEnter={() => {
            if (!config.isMobile) setSidebarHover(true);
          }}
          onMouseLeave={() => {
            if (!config.isMobile && !sidebarPinned) setSidebarHover(false);
          }}
        >
          <div className="sidebar-inner">
            <div className="sidebar-top">
              {sidebarExpanded ? (
                <BrandSidebar />
              ) : (
                <img className="sidebar-logo-mini" src="/inova-mark-dark.png" alt="INOVA" loading="eager" decoding="sync" fetchPriority="high" />
              )}
            </div>

            <div className="sidebar-nav">
              {sidebarExpanded && <SectionTitle>Gestión 5S</SectionTitle>}

              {TABS_5S.map((item) => {
                const Icon = item.icon || Activity;
                const active = tab === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    style={tabButtonStyle(active, sidebarExpanded)}
                    title={item.label}
                    onClick={() => {
                      setTab(item.key);
                      closeMobileMenu();
                    }}
                  >
                    <Icon size={18} />
                    {sidebarExpanded && <span>{item.label}</span>}
                  </button>
                );
              })}

              {sidebarExpanded && <SectionTitle>Sesión</SectionTitle>}

              <button
                type="button"
                style={tabButtonStyle(false, sidebarExpanded)}
                title="Salir"
                onClick={closeSession}
              >
                <LogOut size={18} />
                {sidebarExpanded && <span>Cerrar sesión</span>}
              </button>
            </div>

            {sidebarExpanded && (
              <div className="sidebar-bottom-card">
                <div className="circuit-bg" />
                <Activity size={17} />
                <span>Sistema 5S activo</span>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}





