import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
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
  ClipboardList,
  ClipboardCheck,
  Clock3,
  Database,
  Edit3,
  Filter,
  Home,
  LayoutDashboard,
  Layers3,
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
  Sparkles,
  Target,
  UserRound,
  Users,
  Warehouse,
  Wrench,
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
  editarCronograma5S,
  editarPlanAccion5S,
  editarResponsable5S,
  editarSububicacion5S,
  editarUsuario5S,
  eliminarCatalogo5S,
  eliminarChecklistItem5S,
  eliminarBodega5S,
  eliminarCronograma5S,
  eliminarInspeccion5S,
  eliminarResponsable5S,
  eliminarSububicacion5S,
  getBodegas5S,
  getChecklist5S,
  getConfig5S,
  getCronograma5S,
  getDashboard5S,
  getInspeccionItems5S,
  getInspecciones5S,
  getPlanesAccion5S,
  getResponsables5S,
  getSububicaciones5S,
  getUsuario5S,
  guardarConfig5S,
  subirArchivo5S,
} from "./api5s";
import "./calidad5s.css";

const PRELOAD_IMAGES = ["/INOVA2026.png", "/INOVA2026.png", "/INOVA2026.png", "/INOVA2026.png"];

const TABS_5S = [
  { key: "portal", label: "Portal", icon: Home },
  { key: "cronograma", label: "Cronograma", icon: CalendarDays },
  { key: "inspeccion", label: "Inspección", icon: ClipboardCheck },
  { key: "responsables", label: "Responsables", icon: Users },
  { key: "auditorias", label: "Auditorías", icon: ShieldCheck },
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

const SUPPLY_RULES_5S = [
  {
    keywords: ["limpieza", "sucio", "polvo", "residuo", "basura", "derrame"],
    insumo: "Kit de limpieza",
    actividad: "Seiso / limpieza profunda",
  },
  {
    keywords: ["demarc", "señal", "senal", "rotulo", "rótulo", "identific"],
    insumo: "Cinta, rótulos y señalización",
    actividad: "Seiton / estándar visual",
  },
  {
    keywords: ["herramienta", "equipo", "utensilio", "organizador", "estante"],
    insumo: "Organizadores y soportes",
    actividad: "Seiton / ubicación fija",
  },
  {
    keywords: ["epp", "seguridad", "guante", "casco", "proteccion", "protección"],
    insumo: "EPP y elementos de control",
    actividad: "Seguridad operacional",
  },
  {
    keywords: ["documento", "registro", "formato", "procedimiento", "instructivo"],
    insumo: "Formato o estándar documental",
    actividad: "Seiketsu / estandarización",
  },
];

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function maturityLabel5S(score, openPlans, overduePlans) {
  if (score >= 92 && openPlans === 0) return "Clase mundial";
  if (score >= 88 && overduePlans === 0) return "Controlado";
  if (score >= 80) return "En estabilización";
  if (score > 0) return "Reactivo";
  return "Sin línea base";
}

function inferSupplyNeeds5S(planes = []) {
  const map = new Map();
  planes.forEach((plan) => {
    const text = normalizeKey(`${plan.punto || ""} ${plan.hallazgo || ""} ${plan.accion || ""}`);
    const rule = SUPPLY_RULES_5S.find((item) => item.keywords.some((word) => text.includes(normalizeKey(word)))) || {
      insumo: "Recurso de mejora 5S",
      actividad: "Acción correctiva",
    };
    const key = rule.insumo;
    if (!map.has(key)) map.set(key, { ...rule, cantidad: 0, bodegas: new Set(), criticidad: 0 });
    const current = map.get(key);
    current.cantidad += 1;
    if (plan.bodega) current.bodegas.add(plan.bodega);
    if (/alta|crit/i.test(String(plan.severidad || ""))) current.criticidad += 1;
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      bodegas: [...item.bodegas],
      prioridad: item.criticidad > 0 || item.cantidad > 2 ? "Alta" : "Media",
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6);
}

function dialogToneIcon(type, tone) {
  if (type === "confirm" || tone === "danger") return Trash2;
  if (tone === "success") return CheckCircle2;
  if (tone === "warning") return ShieldCheck;
  if (tone === "info") return Bell;
  return Sparkles;
}

function native5SDialogFallback(options) {
  const message = options?.message || "";
  if (options?.type === "confirm") return Promise.resolve(window.confirm(message));
  if (options?.type === "prompt") return Promise.resolve(window.prompt(message, options?.defaultValue || ""));
  window.alert(message);
  return Promise.resolve(true);
}

function show5SDialog(options = {}) {
  if (typeof window === "undefined") return Promise.resolve(options.type === "confirm" ? false : null);
  if (!window.__calidad5sDialogReady) return native5SDialogFallback(options);

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("calidad5s:dialog", {
        detail: {
          tone: "info",
          confirmLabel: "Entendido",
          cancelLabel: "Cancelar",
          ...options,
          resolve,
        },
      })
    );
  });
}

function show5SAlert(message, options = {}) {
  return show5SDialog({
    type: "alert",
    tone: options.tone || "info",
    title: options.title || "Atención 5S",
    message,
    confirmLabel: options.confirmLabel || "Entendido",
  });
}

function show5SConfirm(message, options = {}) {
  return show5SDialog({
    type: "confirm",
    tone: options.tone || "danger",
    title: options.title || "Confirmar acción",
    message,
    confirmLabel: options.confirmLabel || "Aceptar",
    cancelLabel: options.cancelLabel || "Cancelar",
  });
}

function show5SPrompt(message, defaultValue = "", options = {}) {
  return show5SDialog({
    type: "prompt",
    tone: options.tone || "info",
    title: options.title || "Completar información",
    message,
    defaultValue,
    placeholder: options.placeholder || "Escribe el comentario...",
    confirmLabel: options.confirmLabel || "Guardar",
    cancelLabel: options.cancelLabel || "Cancelar",
  });
}

function Calidad5SDialogHost() {
  const [dialog, setDialog] = useState(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    window.__calidad5sDialogReady = true;
    const handleDialog = (event) => {
      setDialog(event.detail || null);
      setPromptValue(event.detail?.defaultValue || "");
    };
    window.addEventListener("calidad5s:dialog", handleDialog);
    return () => {
      window.removeEventListener("calidad5s:dialog", handleDialog);
      window.__calidad5sDialogReady = false;
    };
  }, []);

  if (!dialog) return null;

  const Icon = dialogToneIcon(dialog.type, dialog.tone);
  const closeValue = dialog.type === "alert" ? true : dialog.type === "confirm" ? false : null;
  const resolveDialog = (value) => {
    dialog.resolve?.(value);
    setDialog(null);
  };
  const messageLines = String(dialog.message || "").split("\n").filter(Boolean);

  return (
    <div className="calidad5s-dialog-layer" role="presentation">
      <section className={`calidad5s-dialog-card tone-${dialog.tone || "info"}`} role="dialog" aria-modal="true" aria-labelledby="calidad5s-dialog-title">
        <button type="button" className="calidad5s-dialog-close" onClick={() => resolveDialog(closeValue)} aria-label="Cerrar mensaje">
          <X size={18} />
        </button>

        <div className="calidad5s-dialog-main">
          <div className="calidad5s-dialog-mark">
            <Icon size={24} />
          </div>
          <div className="calidad5s-dialog-copy">
            <span>WMS 5S</span>
            <h3 id="calidad5s-dialog-title">{dialog.title || "Atención 5S"}</h3>
            {messageLines.length ? messageLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p>Confirma la acción para continuar.</p>}
          </div>
        </div>

        {dialog.type === "prompt" && (
          <textarea
            className="calidad5s-dialog-input"
            value={promptValue}
            autoFocus
            placeholder={dialog.placeholder || "Escribe el comentario..."}
            onChange={(event) => setPromptValue(event.target.value)}
          />
        )}

        <div className="calidad5s-dialog-actions">
          {dialog.type !== "alert" && (
            <button type="button" className="calidad5s-dialog-btn is-ghost" onClick={() => resolveDialog(dialog.type === "confirm" ? false : null)}>
              {dialog.cancelLabel || "Cancelar"}
            </button>
          )}
          <button
            type="button"
            className="calidad5s-dialog-btn is-primary"
            onClick={() => resolveDialog(dialog.type === "prompt" ? promptValue : true)}
          >
            {dialog.confirmLabel || "Aceptar"}
          </button>
        </div>
      </section>
    </div>
  );
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

async function openPrintable5SDocument({ title, reportElement }) {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) {
    show5SAlert("No se pudo abrir la ventana de impresión. Revisa si el navegador bloqueó ventanas emergentes.");
    return;
  }

  win.document.write(`<!doctype html><html><head><title>${title}</title></head><body style="font-family:Arial,sans-serif;padding:24px;">Preparando PDF 5S...</body></html>`);
  win.document.close();

  const pages = Array.from(reportElement.querySelectorAll(".report-sheet"));
  const captureTargets = pages.length ? pages : [reportElement];
  const imagePages = [];

  for (const page of captureTargets) {
    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });
    imagePages.push(canvas.toDataURL("image/jpeg", 0.95));
  }

  const imagesHtml = imagePages
    .map((src, index) => `<section class="pdf-page"><img src="${src}" alt="Página ${index + 1}" /></section>`)
    .join("");

  win.document.open();
  win.document.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: Letter; margin: 0; }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pdf-page {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0;
            display: grid;
            place-items: stretch;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            background: #fff;
          }
          .pdf-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .pdf-page img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
        </style>
      </head>
      <body>
        ${imagesHtml}
        <script>
          Promise.all(Array.from(document.images).map(function (img) {
            if (img.complete) return Promise.resolve();
            return new Promise(function (resolve) {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })).then(function () {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                window.focus();
                window.print();
              });
            });
          });
        </script>
      </body>
    </html>`);
  win.document.close();
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
    sidebarExpanded: isMobile ? Math.min(width * 0.86, 340) : isTablet ? 300 : 342,
    gap: isMobile ? 10 : isTablet ? 14 : 18,
  };
}

function LogoImage({ className = "", tone = "light" }) {
  return (
    <img
      src={tone === "dark" ? "/INOVA2026.png" : "/INOVA2026.png"}
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
      <small>5S</small>
    </div>
  );
}

function BrandSidebar() {
  return (
    <div className="brand-sidebar">
      <LogoImage tone="dark" />
      <small>5S</small>
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

function getCurrentUserId() {
  return sessionStorage.getItem("userId") || sessionStorage.getItem("usuarioId") || "";
}

function isAdminRole(role) {
  return /SUPER_ADMIN|ADMIN|ADMINISTRADOR|SUPERVISOR_5S/i.test(String(role || ""));
}

function buildResponsableCode(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || `RESP_${Date.now()}`;
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
    minHeight: expanded ? 38 : 48,
    height: expanded ? 38 : 48,
    width: expanded ? "100%" : 48,
    display: "flex",
    alignItems: "center",
    justifyContent: expanded ? "flex-start" : "center",
    gap: 10,
    padding: expanded ? "0 12px" : 0,
    borderRadius: expanded ? 12 : 16,
    color: isActive ? "#0369a1" : "#17213b",
    background: isActive
      ? expanded
        ? "linear-gradient(135deg, rgba(14,165,233,.15), rgba(37,99,235,.08))"
        : "linear-gradient(145deg, rgba(255,255,255,.98), rgba(232,246,255,.95))"
      : "transparent",
    border: `1px solid ${isActive ? "rgba(14,165,233,.26)" : "transparent"}`,
    textDecoration: "none",
    fontWeight: isActive ? 900 : 750,
    fontSize: expanded ? 12 : 13,
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

function build5SScopes(bodegas = [], subbodegas = []) {
  const subbodegasByParent = new Map();
  subbodegas.forEach((item) => {
    const key = String(item.bodega_id);
    if (!subbodegasByParent.has(key)) subbodegasByParent.set(key, []);
    subbodegasByParent.get(key).push(item);
  });

  const scopes = [];
  bodegas.forEach((bodega) => {
    const children = subbodegasByParent.get(String(bodega.id)) || [];

    if (!children.length) {
      scopes.push({
        key: `bodega-${bodega.id}`,
        nombre: bodega.nombre,
        label: bodega.nombre,
        bodega_id: bodega.id,
      });
      return;
    }

    children.forEach((subbodega) => {
      scopes.push({
        key: `subbodega-${subbodega.id}`,
        nombre: subbodega.nombre,
        label: `${bodega.nombre} / ${subbodega.nombre}`,
        bodega_id: bodega.id,
      });
    });
  });

  return scopes;
}

async function loadBodegasFromApi(activeOnly = false) {
  const rows = await getBodegas5S({ activeOnly });
  return (rows || []).map(normalizeBodega5S);
}

function normalizeResponsable5S(item) {
  const isUserSource = String(item.id || "").startsWith("user-") || item.usuario_id;
  return {
    id: isUserSource && !String(item.id || "").startsWith("user-") ? `user-${item.id}` : item.id,
    usuario_id: item.usuario_id || (isUserSource ? String(item.id).replace("user-", "") : null),
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
    inspeccion_id: item.inspeccion_id || item.inspeccionId || null,
    fecha_ejecucion: item.fecha_ejecucion || item.fechaEjecucion || "",
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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function startOfWeekISO(date = todayISO()) {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function endOfWeekISO(date = todayISO()) {
  return addDays(startOfWeekISO(date), 6);
}

function weekLabel(date = todayISO()) {
  const d = new Date(`${date}T00:00:00`);
  const first = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - first) / 86400000);
  const week = Math.ceil((days + first.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
}

function datesBetween(start, end) {
  const total = diffDays(start, end);
  return Array.from({ length: total }, (_, index) => addDays(start, index));
}

function normalizeText(value) {
  return String(value || "").trim().toUpperCase();
}

function overlapsRange(item, start, end) {
  return item.fechaInicio <= end && item.fechaFin >= start;
}

function formatShortDate(date) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }).replace(".", "").toUpperCase();
}

function formatLongDate(date) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function diffDays(start, end) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function calendarDayDiff(start, end) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

function overdueText(days) {
  if (days <= 0) return "vence hoy";
  return days === 1 ? "1 día" : `${days} días`;
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

function statusColor(status) {
  const key = statusClass(status);
  if (key.includes("program") || key.includes("planific")) return "#1479c9";
  if (key.includes("curso") || key.includes("ejecucion")) return "#1d8fe3";
  if (key.includes("complet") || key.includes("final")) return "#18b981";
  if (key.includes("vencer")) return "#f59e0b";
  if (key.includes("venc") || key.includes("critic")) return "#ef4444";
  if (key.includes("pend")) return "#64748b";
  return "#0f6fbd";
}

function cronogramaEjecutado(programacion, inspecciones) {
  return Boolean(findCronogramaExecution(programacion, inspecciones));
}

function findCronogramaExecution(programacion, inspecciones = []) {
  const bodega = normalizeText(programacion.bodega);
  const responsable = normalizeText(programacion.responsable);
  const inicio = programacion.fechaInicio || programacion.fecha_inicio || "";
  const fin = programacion.fechaFin || programacion.fecha_fin || inicio;
  const hasta = addDays(fin || todayISO(), 30);

  return [...inspecciones]
    .filter((inspeccion) => {
      const fechaInspeccion = inspeccion.fecha || inspeccion.created_at?.slice(0, 10) || "";
      const sameBodega = normalizeText(inspeccion.bodega) === bodega;
      const sameResponsable = !responsable || !inspeccion.responsable || normalizeText(inspeccion.responsable) === responsable;
      return sameBodega && sameResponsable && fechaInspeccion >= inicio && fechaInspeccion <= hasta;
    })
    .sort((a, b) => String(a.fecha || a.created_at).localeCompare(String(b.fecha || b.created_at)))[0] || null;
}

function attachCronogramaExecution(cronograma = [], inspecciones = []) {
  return cronograma.map((item) => {
    const execution = findCronogramaExecution(item, inspecciones);
    const fechaEjecucion = item.fecha_ejecucion || execution?.fecha || execution?.created_at?.slice(0, 10) || "";
    const fechaFin = item.fechaFin || item.fecha_fin || item.fechaInicio || item.fecha_inicio;
    const retraso = fechaEjecucion && fechaFin ? Math.max(0, calendarDayDiff(fechaFin, fechaEjecucion)) : 0;

    return {
      ...item,
      ejecutada: Boolean(execution),
      fechaEjecucion,
      retrasoDias: retraso,
      inspeccionId: item.inspeccion_id || execution?.id || null,
    };
  });
}

function buildCronogramaAlerts(cronograma = [], inspecciones = []) {
  const hoy = todayISO();

  return cronograma
    .map(normalizeCronograma5S)
    .filter((item) => {
      const fechaLimite = item.fechaFin || item.fechaInicio;
      if (!fechaLimite || fechaLimite >= hoy) return false;
      return !cronogramaEjecutado(item, inspecciones);
    })
    .sort((a, b) => String(a.fechaFin || a.fechaInicio).localeCompare(String(b.fechaFin || b.fechaInicio)))
    .map((item) => {
      const fechaLimite = item.fechaFin || item.fechaInicio;
      return {
        ...item,
        tipo: "cronograma",
        fechaLimite,
        diasVencida: Math.max(0, calendarDayDiff(fechaLimite, hoy)),
      };
    });
}

function buildPlanAlerts(planes = []) {
  const hoy = todayISO();

  return (planes || [])
    .filter((item) => {
      const estado = normalizeText(item.estado);
      return item.fecha_compromiso && item.fecha_compromiso < hoy && !["CERRADO", "CERRADA", "FINALIZADO", "FINALIZADA"].includes(estado);
    })
    .sort((a, b) => String(a.fecha_compromiso).localeCompare(String(b.fecha_compromiso)))
    .map((item) => ({
      ...item,
      tipo: "plan",
      bodega: item.bodega,
      responsable: item.responsable,
      fechaLimite: item.fecha_compromiso,
      diasVencida: Math.max(0, calendarDayDiff(item.fecha_compromiso, hoy)),
    }));
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function inlineComputedStyles(source, target) {
  if (!(source instanceof Element) || !(target instanceof Element)) return;

  const computed = window.getComputedStyle(source);
  target.setAttribute(
    "style",
    Array.from(computed).map((key) => `${key}:${computed.getPropertyValue(key)};`).join("")
  );

  Array.from(source.children).forEach((child, index) => {
    inlineComputedStyles(child, target.children[index]);
  });
}

function syncScrollPositions(source, target) {
  if (!(source instanceof Element) || !(target instanceof Element)) return;
  target.scrollLeft = source.scrollLeft;
  target.scrollTop = source.scrollTop;
  Array.from(source.children).forEach((child, index) => {
    syncScrollPositions(child, target.children[index]);
  });
}

async function exportElementAsPng(element, filename) {
  const board = element.querySelector(".gantt-board");
  const root = document.querySelector(".layout-root");
  const previousElementWidth = element.style.width;
  const previousBoardWidth = board?.style.width || "";
  const previousBoardOverflow = board?.style.overflow || "";
  const previousBoardScrollLeft = board?.scrollLeft || 0;
  const exportWidth = board ? Math.max(element.scrollWidth, board.scrollWidth + 40) : element.scrollWidth;
  let canvas;

  try {
    root?.classList.add("is-capturing-gantt");
    element.classList.add("is-exporting");
    element.style.width = `${exportWidth}px`;
    if (board) {
      board.style.width = `${board.scrollWidth}px`;
      board.style.overflow = "visible";
      board.scrollLeft = 0;
    }

    await new Promise((resolve) => requestAnimationFrame(resolve));

    canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    root?.classList.remove("is-capturing-gantt");
    element.classList.remove("is-exporting");
    element.style.width = previousElementWidth;
    if (board) {
      board.style.width = previousBoardWidth;
      board.style.overflow = previousBoardOverflow;
      board.scrollLeft = previousBoardScrollLeft;
    }
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
      } else {
        reject(new Error("No se pudo generar el PNG del diagrama."));
      }
    }, "image/png");
  });

  const imageUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(imageUrl);
}

function PortalView({ setTab, canAdmin = false }) {
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
      requiresAdmin: true,
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
      requiresAdmin: true,
    },
  ];

  const puntosControl = bodegasPortal.reduce((sum, item) => sum + Number(item.puntos || 0), 0);

  const quickMetrics = [
    {
      label: "Bodegas activas",
      value: dashboard?.bodegas_activas ?? bodegasPortal.filter((item) => item.activo).length,
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
              const locked = item.requiresAdmin && !canAdmin;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`portal-shortcut-card tone-${item.tone}`}
                  disabled={locked}
                  title={locked ? "Solo administradores" : item.title}
                  onClick={() => {
                    if (locked) return;
                    setTab(item.key);
                  }}
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
                    <span>{locked ? "Solo administradores" : "Abrir módulo"}</span>
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

function CronogramaView({ canAdmin = false }) {
  const [version, setVersion] = useState(0);
  const [cronograma, setCronograma] = useState([]);
  const [bodegas, setBodegas] = useState([]);
  const [subbodegas, setSubbodegas] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [config5S, setConfig5S] = useState(null);
  const [editingCronogramaId, setEditingCronogramaId] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
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
  const [ganttFilter, setGanttFilter] = useState({
    mode: "rango",
    date: todayISO(),
    week: weekLabel(todayISO()),
  });
  const [showGanttFilters, setShowGanttFilters] = useState(false);

  const estadosCronograma = config5S?.estados_cronograma || [];
  const prioridadesCronograma = config5S?.prioridades_cronograma || [];

  const cronogramaScopes = useMemo(() => {
    const subbodegasByParent = new Map();
    subbodegas.forEach((item) => {
      const key = String(item.bodega_id);
      if (!subbodegasByParent.has(key)) subbodegasByParent.set(key, []);
      subbodegasByParent.get(key).push(item);
    });

    const scopes = [];
    bodegas.forEach((bodega) => {
      const children = subbodegasByParent.get(String(bodega.id)) || [];

      if (!children.length) {
        scopes.push({
          key: `bodega-${bodega.id}`,
          nombre: bodega.nombre,
          label: bodega.nombre,
          bodega_id: bodega.id,
        });
        return;
      }

      children.forEach((subbodega) => {
        scopes.push({
          key: `subbodega-${subbodega.id}`,
          nombre: subbodega.nombre,
          label: `${bodega.nombre} / ${subbodega.nombre}`,
          bodega_id: bodega.id,
        });
      });
    });

    return scopes;
  }, [bodegas, subbodegas]);

  const selectedCronogramaScope = useMemo(
    () => cronogramaScopes.find((item) => item.nombre === form.bodega) || null,
    [cronogramaScopes, form.bodega]
  );

  const baseFiltered = useMemo(() => {
    return cronograma.filter((item) => {
      const okBodega = filters.bodega === "Todas" || item.bodega === filters.bodega;
      const okResponsable = filters.responsable === "Todos" || item.responsable === filters.responsable;
      const okEstado = filters.estado === "Todos" || item.estado === filters.estado;
      const okPrioridad = filters.prioridad === "Todas" || item.prioridad === filters.prioridad;
      return okBodega && okResponsable && okEstado && okPrioridad;
    });
  }, [cronograma, filters, version]);

  const activeWeeks = useMemo(() => {
    const map = new Map();
    baseFiltered.forEach((item) => {
      datesBetween(item.fechaInicio, item.fechaFin).forEach((date) => {
        const label = weekLabel(date);
        const start = startOfWeekISO(date);
        const end = endOfWeekISO(date);
        if (!map.has(label)) {
          map.set(label, { label, start, end });
        }
      });
    });
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
  }, [baseFiltered]);

  const selectedWeek = activeWeeks.find((item) => item.label === ganttFilter.week) || activeWeeks[0] || {
    label: weekLabel(ganttFilter.date),
    start: startOfWeekISO(ganttFilter.date),
    end: endOfWeekISO(ganttFilter.date),
  };

  const filtered = useMemo(() => {
    if (ganttFilter.mode === "hoy") {
      return baseFiltered.filter((item) => overlapsRange(item, ganttFilter.date, ganttFilter.date));
    }

    if (ganttFilter.mode === "semana") {
      return baseFiltered.filter((item) => overlapsRange(item, selectedWeek.start, selectedWeek.end));
    }

    return baseFiltered;
  }, [baseFiltered, ganttFilter, selectedWeek.start, selectedWeek.end]);

  const timeline = useMemo(() => {
    if (ganttFilter.mode === "hoy") {
      return [ganttFilter.date];
    }

    if (ganttFilter.mode === "semana") {
      return datesBetween(selectedWeek.start, selectedWeek.end);
    }

    if (!filtered.length && !baseFiltered.length) {
      return datesBetween(todayISO(), addDays(todayISO(), 34));
    }

    return getTimelineDates(filtered.length ? filtered : baseFiltered);
  }, [filtered, baseFiltered, ganttFilter.mode, ganttFilter.date, selectedWeek.start, selectedWeek.end, version]);

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
  const responsablesActivosGantt = new Set(baseFiltered.map((item) => item.responsable).filter(Boolean)).size;
  const bodegasActivasGantt = new Set(baseFiltered.map((item) => item.bodega).filter(Boolean)).size;

  const proximas = [...cronograma]
    .sort((a, b) => String(a.fechaInicio).localeCompare(String(b.fechaInicio)))
    .slice(0, 4);

  async function refreshCatalogos() {
    setLoadingCatalogos(true);
    setCronogramaError("");

    try {
      const [nextBodegas, nextSubbodegasRaw, nextResponsablesRaw, nextCronogramaRaw, nextInspeccionesRaw, nextConfig] = await Promise.all([
        loadBodegasFromApi(true),
        getSububicaciones5S({ activeOnly: true }),
        getResponsables5S({ activo: true }),
        getCronograma5S(),
        getInspecciones5S(),
        getConfig5S(),
      ]);

      const nextSubbodegas = (nextSubbodegasRaw || []).map(normalizeSububicacion5S);
      const nextResponsables = (nextResponsablesRaw || []).map(normalizeResponsable5S);
      const nextCronograma = attachCronogramaExecution(
        (nextCronogramaRaw || []).map(normalizeCronograma5S),
        nextInspeccionesRaw || []
      );
      const nextEstados = nextConfig?.estados_cronograma || [];
      const nextPrioridades = nextConfig?.prioridades_cronograma || [];
      const nextScopes = build5SScopes(nextBodegas, nextSubbodegas);

      setBodegas(nextBodegas);
      setSubbodegas(nextSubbodegas);
      setResponsables(nextResponsables);
      setCronograma(nextCronograma);
      setConfig5S(nextConfig || null);

      setForm((prev) => ({
        ...prev,
        bodega: prev.bodega || nextScopes[0]?.nombre || nextBodegas[0]?.nombre || "",
        responsable: prev.responsable || nextResponsables[0]?.nombre || "",
        estado: prev.estado || nextEstados[0] || "",
        prioridad: prev.prioridad || nextPrioridades[0] || "",
      }));

      setVersion((value) => value + 1);
    } catch (error) {
      console.error("No se pudieron cargar datos 5S:", error);
      setBodegas([]);
      setSubbodegas([]);
      setResponsables([]);
      setCronograma([]);
      setCronogramaError(error.message || "No se pudieron cargar los datos desde la sistema.");
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

  function resetCronogramaForm() {
    setEditingCronogramaId(null);
    setForm({
      bodega: cronogramaScopes[0]?.nombre || form.bodega,
      responsable: responsables[0]?.nombre || form.responsable,
      fechaInicio: todayISO(),
      fechaFin: addDays(todayISO(), 6),
      estado: estadosCronograma[0] || "",
      prioridad: prioridadesCronograma[0] || "",
      actividad: "",
      observacion: "",
    });
  }

  function startEditCronograma(item) {
    if (!canAdmin || !item) return;
    setEditingCronogramaId(item.id);
    setForm({
      bodega: item.bodega || "",
      responsable: item.responsable || "",
      fechaInicio: item.fechaInicio || todayISO(),
      fechaFin: item.fechaFin || item.fechaInicio || todayISO(),
      estado: item.estado || estadosCronograma[0] || "",
      prioridad: item.prioridad || prioridadesCronograma[0] || "",
      actividad: item.actividad || "",
      observacion: item.observacion || "",
    });
    setTimeout(() => {
      document.querySelector(".cronograma-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  async function addCronograma(event) {
    event.preventDefault();

    if (!cronogramaScopes.length) {
      show5SAlert("Primero debes crear al menos una bodega o subbodega activa en el módulo Responsables.");
      return;
    }

    if (!responsables.length) {
      show5SAlert("Primero debes crear al menos un responsable activo en el módulo Responsables.");
      return;
    }

    if (!form.bodega || !form.responsable || !form.fechaInicio || !form.fechaFin || !form.estado || !form.prioridad) {
      show5SAlert("Debes completar bodega, responsable, fechas, estado y prioridad.");
      return;
    }

    const actividad = form.actividad.trim();

    if (!actividad) {
      show5SAlert("Debes escribir la actividad de la auditoría.");
      return;
    }

    const payload = {
      bodega_id: selectedCronogramaScope?.bodega_id || null,
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
      if (editingCronogramaId) {
        await editarCronograma5S(editingCronogramaId, payload);
      } else {
        await crearCronograma5S(payload);
      }
      await refreshCatalogos();
      window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
      resetCronogramaForm();
    } catch (error) {
      console.error("No se pudo guardar el cronograma 5S:", error);
      setCronogramaError(error.message || "No se pudo guardar el cronograma en la sistema.");
    } finally {
      setLoadingCatalogos(false);
    }
  }

  async function deleteCronograma(id) {
    if (!await show5SConfirm("¿Eliminar esta actividad del cronograma?")) return;

    try {
      await eliminarCronograma5S(id);
      setCronograma((prev) => prev.filter((item) => item.id !== id));
      setVersion((value) => value + 1);
      window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
    } catch (error) {
      console.error("No se pudo eliminar el cronograma 5S:", error);
      setCronogramaError(error.message || "No se pudo eliminar el cronograma de la sistema.");
    }
  }

  async function moveCronogramaItem(item, dayDelta) {
    if (!canAdmin || !item || !dayDelta) return;

    const nextStart = addDays(item.fechaInicio, dayDelta);
    const nextEnd = addDays(item.fechaFin || item.fechaInicio, dayDelta);

    try {
      await editarCronograma5S(item.id, {
        fecha_inicio: nextStart,
        fecha_fin: nextEnd,
      });

      setCronograma((prev) =>
        prev.map((current) =>
          current.id === item.id
            ? { ...current, fechaInicio: nextStart, fechaFin: nextEnd }
            : current
        )
      );
      setVersion((value) => value + 1);
      window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
    } catch (error) {
      console.error("No se pudo mover el cronograma 5S:", error);
      setCronogramaError(error.message || "No se pudo mover la auditoría en el Gantt.");
    }
  }

  function startDragCronograma(event, item) {
    if (!canAdmin || item.ejecutada) return;
    const track = event.currentTarget.closest(".gantt-track");
    if (!track) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragInfo({
      id: item.id,
      startX: event.clientX,
      currentX: event.clientX,
      trackWidth: track.clientWidth || 1,
      days: Math.max(1, timeline.length),
    });
  }

  function updateDragCronograma(event) {
    if (!dragInfo) return;
    setDragInfo((prev) => (prev ? { ...prev, currentX: event.clientX } : prev));
  }

  function endDragCronograma(item) {
    if (!dragInfo || dragInfo.id !== item.id) return;
    const dayWidth = dragInfo.trackWidth / dragInfo.days;
    const delta = Math.round((dragInfo.currentX - dragInfo.startX) / Math.max(dayWidth, 1));
    setDragInfo(null);
    if (delta) moveCronogramaItem(item, delta);
  }

  async function clearCronograma() {
    if (!await show5SConfirm("¿Eliminar todas las actividades del cronograma en sistema?")) return;

    try {
      await Promise.all(cronograma.map((item) => eliminarCronograma5S(item.id)));
      setCronograma([]);
      setVersion((value) => value + 1);
      window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
    } catch (error) {
      console.error("No se pudo vaciar el cronograma 5S:", error);
      setCronogramaError(error.message || "No se pudo vaciar el cronograma en la sistema.");
    }
  }

  function exportCronogramaExcel() {
    const rows = filtered;
    if (!rows.length) {
      show5SAlert("No hay actividades para exportar.");
      return;
    }

    const headers = [
      "Semana inicio",
      "Semana fin",
      "Fecha inicio",
      "Fecha fin",
      "Bodega",
      "Responsable",
      "Actividad",
      "Estado",
      "Prioridad",
      "Observación",
    ];

    const csv = [
      headers.map(csvCell).join(";"),
      ...rows.map((item) => [
        weekLabel(item.fechaInicio),
        weekLabel(item.fechaFin),
        item.fechaInicio,
        item.fechaFin,
        item.bodega,
        item.responsable,
        item.actividad,
        item.estado,
        item.prioridad,
        item.observacion,
      ].map(csvCell).join(";")),
    ].join("\r\n");

    downloadTextFile(
      `cronograma-5s-${weekLabel(rows[0]?.fechaInicio || todayISO())}.csv`,
      `\ufeff${csv}`,
      "text/csv;charset=utf-8"
    );
  }

  async function exportGanttImage() {
    const rows = filtered;
    if (!rows.length) {
      show5SAlert("No hay actividades para exportar.");
      return;
    }

    const panel = document.getElementById("gantt-export-panel");
    if (panel) {
      try {
        await exportElementAsPng(panel, `gantt-5s-${ganttFilter.mode === "semana" ? selectedWeek.label : weekLabel(timeline[0] || todayISO())}.png`);
        return;
      } catch (error) {
        console.error("No se pudo capturar el Gantt visible, se usará exportación alternativa:", error);
      }
    }

    const exportTimeline = timeline;
    const exportGrouped = [...new Set(rows.map((item) => item.responsable || "Sin responsable"))].map((name) => ({
      responsable: name,
      items: rows.filter((item) => (item.responsable || "Sin responsable") === name),
    }));
    const fromWeek = weekLabel(exportTimeline[0]);
    const toWeek = weekLabel(exportTimeline[exportTimeline.length - 1]);
    const leftWidth = 390;
    const dayWidth = 44;
    const topHeight = 136;
    const groupHeight = 38;
    const rowHeight = 64;
    const bottomPadding = 42;
    const width = Math.max(1500, leftWidth + exportTimeline.length * dayWidth + 60);
    const contentHeight = exportGrouped.reduce((sum, group) => sum + groupHeight + group.items.length * rowHeight, 0);
    const height = topHeight + contentHeight + bottomPadding;
    const timelineWidth = exportTimeline.length * dayWidth;

    let y = topHeight;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect width="100%" height="100%" fill="#f8fbff"/>`,
      `<rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="18" fill="#ffffff" stroke="#dbe7f4"/>`,
      `<text x="40" y="54" fill="#0f2137" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="900">Cronograma 5S</text>`,
      `<text x="40" y="86" fill="#0f2137" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="850">Diagrama de Gantt</text>`,
      `<text x="40" y="112" fill="#617089" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700">Rango: ${escapeXml(formatLongDate(exportTimeline[0]))} a ${escapeXml(formatLongDate(exportTimeline[exportTimeline.length - 1]))} · Semanas ${escapeXml(fromWeek)} / ${escapeXml(toWeek)}</text>`,
      `<rect x="${width - 230}" y="42" width="180" height="42" rx="15" fill="#eef7ff" stroke="#bdd8ef"/>`,
      `<text x="${width - 210}" y="69" fill="#0f6fbd" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="950">CALIDAD 5S</text>`,
      `<rect x="28" y="108" width="${leftWidth - 12}" height="42" rx="12" fill="#eef7ff" stroke="#d7e5f2"/>`,
      `<text x="48" y="135" fill="#31445d" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="900">Responsable / Bodega</text>`,
      `<rect x="${leftWidth}" y="108" width="${timelineWidth}" height="42" rx="12" fill="#eef7ff" stroke="#d7e5f2"/>`,
    ];

    exportTimeline.forEach((date, index) => {
      const x = leftWidth + index * dayWidth;
      const isWeekStart = index === 0 || new Date(`${date}T00:00:00`).getDay() === 1;
      parts.push(`<line x1="${x}" y1="108" x2="${x}" y2="${height - 30}" stroke="${isWeekStart ? "#b8d5ef" : "#edf4fb"}" stroke-width="${isWeekStart ? 1.4 : 1}"/>`);
      if (isWeekStart) {
        parts.push(`<text x="${x + 6}" y="126" fill="#0f6fbd" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="900">${escapeXml(weekLabel(date).replace("-", " "))}</text>`);
      }
      parts.push(`<text x="${x + 16}" y="144" fill="#617089" font-family="Inter, Arial, sans-serif" font-size="10" font-weight="850">${new Date(`${date}T00:00:00`).getDate()}</text>`);
    });

    exportGrouped.forEach((group) => {
      parts.push(`<rect x="28" y="${y + 4}" width="${width - 56}" height="${groupHeight - 6}" rx="10" fill="#f4f9ff"/>`);
      parts.push(`<text x="48" y="${y + 28}" fill="#0f2137" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="900">${escapeXml(group.responsable)}</text>`);
      y += groupHeight;

      group.items.forEach((item) => {
        const startIndex = Math.max(0, exportTimeline.indexOf(item.fechaInicio));
        const endIndex = Math.max(startIndex, exportTimeline.indexOf(item.fechaFin));
        const barX = leftWidth + startIndex * dayWidth + 6;
        const barWidth = Math.max(120, (endIndex - startIndex + 1) * dayWidth - 12);
        const color = statusColor(item.estado);
        const label = `${item.bodega} · ${item.actividad}`;
        const visibleLabel = label.length > Math.floor(barWidth / 7.4)
          ? `${label.slice(0, Math.max(12, Math.floor(barWidth / 7.4) - 1))}…`
          : label;

        parts.push(`<line x1="28" y1="${y + rowHeight}" x2="${width - 28}" y2="${y + rowHeight}" stroke="#edf4fb"/>`);
        parts.push(`<text x="48" y="${y + 24}" fill="#102033" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="900">${escapeXml(item.bodega)}</text>`);
        parts.push(`<text x="48" y="${y + 44}" fill="#617089" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="750">${escapeXml(item.estado)} · ${escapeXml(item.prioridad)}</text>`);
        parts.push(`<rect x="${barX}" y="${y + 12}" width="${barWidth}" height="38" rx="13" fill="${color}"/>`);
        parts.push(`<text x="${barX + 14}" y="${y + 35}" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="900">${escapeXml(visibleLabel)}</text>`);
        y += rowHeight;
      });
    });

    parts.push(`</svg>`);
    const svg = parts.join("");
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(2, 2);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const imageUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `gantt-5s-${fromWeek}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(imageUrl);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      downloadTextFile(`gantt-5s-${fromWeek}.svg`, svg, "image/svg+xml;charset=utf-8");
    };

    image.src = url;
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
              <strong>Error de sistema.</strong>
              <span>{cronogramaError}</span>
            </div>
          )}

          {!loadingCatalogos && !cronogramaError && (!cronogramaScopes.length || !responsables.length) && (
            <div className="cronograma-warning">
              <strong>Faltan datos maestros.</strong>
              <span>
                Para programar debes crear primero bodegas/subbodegas y responsables activos
                desde el módulo Responsables.
              </span>
            </div>
          )}

          <form className="cronograma-form" onSubmit={addCronograma}>
            <label>
              Bodega
              <select
                value={form.bodega}
                disabled={!cronogramaScopes.length}
                onChange={(e) => updateForm("bodega", e.target.value)}
              >
                {!cronogramaScopes.length && <option>Sin bodegas o subbodegas creadas</option>}
                {cronogramaScopes.map((scope) => (
                  <option key={scope.key} value={scope.nombre}>
                    {scope.label}
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
              {editingCronogramaId ? <Save size={18} /> : <Plus size={18} />}
              {editingCronogramaId ? "Guardar cambios de auditoría" : "Guardar auditoría programada"}
            </button>
            {editingCronogramaId && (
              <button className="cronograma-submit ghost span-2" type="button" onClick={resetCronogramaForm}>
                <X size={18} />
                Cancelar edición
              </button>
            )}
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

      {showGanttFilters && (
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
              {cronogramaScopes.map((scope) => <option key={scope.key}>{scope.nombre}</option>)}
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
      )}

      <section id="gantt-export-panel" className="portal-panel gantt-panel">
        <div className="gantt-head">
          <div>
            <span className="portal-panel-kicker">PROGRAMACIÓN DE AUDITORÍAS</span>
            <h3>Diagrama de Gantt por responsable</h3>
            <p>Visualice y gestione la programación de auditorías por responsable y bodega.</p>
          </div>
          <div className="gantt-actions">
            <button
              type="button"
              className={ganttFilter.mode === "hoy" ? "is-active" : ""}
              onClick={() => setGanttFilter((prev) => ({ ...prev, mode: "hoy", date: todayISO() }))}
            >
              Hoy
            </button>
            <label className="gantt-date-picker">
              <CalendarDays size={15} />
              <input
                type="date"
                value={ganttFilter.date}
                onChange={(event) => setGanttFilter((prev) => ({ ...prev, mode: "hoy", date: event.target.value }))}
              />
            </label>
            <button
              type="button"
              className={ganttFilter.mode === "semana" ? "is-active" : ""}
              onClick={() => setGanttFilter((prev) => ({
                ...prev,
                mode: "semana",
                week: activeWeeks[0]?.label || weekLabel(prev.date),
              }))}
            >
              Semanas
            </button>
            <select
              className="gantt-week-select"
              value={selectedWeek.label}
              onChange={(event) => setGanttFilter((prev) => ({ ...prev, mode: "semana", week: event.target.value }))}
            >
              {activeWeeks.length ? (
                activeWeeks.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label.replace("-", " ")} · {formatShortDate(item.start)} a {formatShortDate(item.end)}
                  </option>
                ))
              ) : (
                <option value={selectedWeek.label}>{selectedWeek.label.replace("-", " ")}</option>
              )}
            </select>
            <button
              type="button"
              className={ganttFilter.mode === "rango" ? "is-active" : ""}
              onClick={() => setGanttFilter((prev) => ({ ...prev, mode: "rango" }))}
            >
              Todo
            </button>
            <button type="button" onClick={() => setShowGanttFilters((value) => !value)}>
              <Filter size={15} />
              Filtros
              <ChevronDown size={14} />
            </button>
            <button type="button" onClick={exportGanttImage}>
              <Download size={15} />
              PNG
            </button>
            <button type="button" onClick={exportCronogramaExcel}>
              <FileDown size={15} />
              Excel
            </button>
          </div>
        </div>

        <div className="gantt-summary-strip">
          <div>
            <span><CalendarDays size={22} /></span>
            <small>Auditorías programadas</small>
            <strong>{filtered.length}</strong>
          </div>
          <div>
            <span><Users size={22} /></span>
            <small>Responsables activos</small>
            <strong>{responsablesActivosGantt}</strong>
          </div>
          <div>
            <span><Warehouse size={22} /></span>
            <small>Bodegas activas</small>
            <strong>{bodegasActivasGantt}</strong>
          </div>
          <div className="gantt-priority-legend">
            <span><i className="priority-high" /> Alta</span>
            <span><i className="priority-medium" /> Media</span>
            <span><i className="priority-low" /> Baja</span>
            <span><i className="priority-done" /> Completada</span>
          </div>
        </div>

        <div className="gantt-board" style={{ "--days": timeline.length }}>
          <div className="gantt-left-header">Responsable / Bodega</div>
          <div className="gantt-timeline-header">
            {timeline.map((date, index) => (
              <div key={date} className={index % 7 === 0 ? "week-start" : ""}>
                <strong>{new Date(`${date}T00:00:00`).getDate()}</strong>
                <small>{new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", { weekday: "short" }).slice(0, 3)}</small>
                {index % 7 === 0 && <em>{weekLabel(date).replace("-", " ")}</em>}
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
                      className={`gantt-bar status-${statusClass(item.estado)} ${canAdmin && !item.ejecutada ? "is-draggable" : ""} ${dragInfo?.id === item.id ? "is-dragging" : ""} ${item.ejecutada ? (item.retrasoDias ? "is-delayed" : "is-executed") : ""}`}
                      style={{
                        ...getBarStyle(item, timeline),
                        transform: dragInfo?.id === item.id ? `translateX(${dragInfo.currentX - dragInfo.startX}px)` : undefined,
                        background: item.ejecutada
                          ? item.retrasoDias
                            ? "linear-gradient(135deg, #f97316, #fb923c)"
                            : "linear-gradient(135deg, #16a34a, #22c55e)"
                          : `linear-gradient(135deg, ${statusColor(item.estado)}, ${statusColor(item.estado)}dd)`,
                      }}
                      title={`${item.actividad} · ${item.responsable}${item.ejecutada ? ` · Ejecutada ${formatShortDate(item.fechaEjecucion)}${item.retrasoDias ? ` · ${item.retrasoDias} días de retraso` : " · A tiempo"}` : ""}`}
                      onPointerDown={(event) => startDragCronograma(event, item)}
                      onPointerMove={updateDragCronograma}
                      onPointerUp={() => endDragCronograma(item)}
                      onPointerCancel={() => setDragInfo(null)}
                    >
                      <span>{item.bodega}</span>
                      <small>
                        {item.ejecutada
                          ? `Ejecutada ${formatShortDate(item.fechaEjecucion)}${item.retrasoDias ? ` · +${item.retrasoDias}d` : " · A tiempo"}`
                          : item.actividad}
                      </small>
                      <b>{item.ejecutada ? (item.retrasoDias ? "Retraso" : "OK") : item.prioridad}</b>
                      <div className="gantt-bar-actions">
                        {canAdmin && (
                          <button
                            type="button"
                            className="gantt-bar-action"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditCronograma(item);
                            }}
                            title="Editar auditoría"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="gantt-bar-action danger"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteCronograma(item.id);
                          }}
                          title="Eliminar auditoría"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="gantt-row-actions">
                    {canAdmin && (
                      <button type="button" className="gantt-edit" onClick={() => startEditCronograma(item)} title="Editar auditoría">
                        <Edit3 size={13} />
                      </button>
                    )}
                    <button type="button" className="gantt-delete" onClick={() => deleteCronograma(item.id)} title="Eliminar auditoría">
                      <X size={14} />
                    </button>
                  </div>
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
  const [editingResponsableId, setEditingResponsableId] = useState(null);
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
      setBodegaError(error.message || "No se pudo cargar la configuración desde la sistema.");
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
      setResponsableError(error.message || "No se pudieron cargar los responsables desde la sistema.");
    } finally {
      setResponsableLoading(false);
    }
  }

  function resetResponsableForm() {
    setEditingResponsableId(null);
    setForm({
      nombre: "",
      cargo: "",
      area: "",
      color: "",
    });
  }

  function editResponsable(item) {
    setEditingResponsableId(item.id);
    setForm({
      nombre: item.nombre || "",
      cargo: item.cargo || "",
      area: item.area || "",
      color: item.color || "",
    });
  }

  async function addResponsable(event) {
    event.preventDefault();

    if (!form.nombre.trim()) {
      show5SAlert("Debes ingresar el nombre del responsable.");
      return;
    }

    const payload = {
      codigo: editingResponsableId
        ? responsables.find((item) => item.id === editingResponsableId)?.codigo || buildResponsableCode(form.nombre)
        : buildResponsableCode(form.nombre),
      nombre: form.nombre.trim(),
      cargo: form.cargo.trim() || null,
      area: form.area.trim() || null,
      color: form.color || null,
      activo: true,
    };

    setResponsableLoading(true);
    setResponsableError("");

    try {
      if (editingResponsableId) {
        await editarResponsable5S(editingResponsableId, {
          ...payload,
          activo: responsables.find((item) => item.id === editingResponsableId)?.activo ?? true,
        });
      } else {
        await crearResponsable5S(payload);
      }
      await loadResponsableList();
      resetResponsableForm();
    } catch (error) {
      console.error("No se pudo guardar el responsable 5S:", error);
      setResponsableError(error.message || "No se pudo guardar o actualizar el responsable en la sistema.");
    } finally {
      setResponsableLoading(false);
    }
  }

  async function toggleResponsable(id) {
    const responsable = responsables.find((item) => item.id === id);
    if (!responsable) return;

    setResponsableLoading(true);
    setResponsableError("");

    try {
      await editarResponsable5S(id, {
        nombre: responsable.nombre,
        cargo: responsable.cargo,
        area: responsable.area,
        color: responsable.color,
        activo: !responsable.activo,
      });

      setResponsables((prev) => prev.map((item) => (
        item.id === id ? { ...item, activo: !responsable.activo } : item
      )));
      await loadResponsableList();
    } catch (error) {
      console.error("No se pudo actualizar el responsable 5S:", error);
      setResponsableError(error.message || "No se pudo actualizar el responsable.");
    } finally {
      setResponsableLoading(false);
    }
  }

  async function deleteResponsable(id) {
    const responsable = responsables.find((item) => item.id === id);
    if (!await show5SConfirm(`¿Eliminar ${responsable?.nombre || "este responsable"}?`)) return;

    setResponsableLoading(true);
    setResponsableError("");

    try {
      await eliminarResponsable5S(id);
      setResponsables((prev) => prev.filter((item) => item.id !== id));
      if (editingResponsableId === id) resetResponsableForm();
      await loadResponsableList();
    } catch (error) {
      console.error("No se pudo eliminar el responsable 5S:", error);
      setResponsableError(error.message || "No se pudo eliminar el responsable.");
    } finally {
      setResponsableLoading(false);
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
      setBodegaError("No se pudieron cargar las bodegas desde la sistema.");
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
      setSububicacionError(error.message || "No se pudieron cargar las subbodegas desde la sistema.");
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
      show5SAlert("Debes seleccionar la bodega principal.");
      return;
    }

    if (!sububicacionForm.nombre.trim()) {
      show5SAlert("Debes ingresar el nombre de la subbodega.");
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
    if (!await show5SConfirm(`¿Eliminar ${item?.nombre || "esta subbodega"}?`)) return;

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
      show5SAlert("Debes ingresar el nombre de la bodega.");
      return;
    }

    if (!bodegaForm.estado) {
      show5SAlert("Debes configurar y seleccionar un estado de bodega.");
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

    if (!await show5SConfirm(`¿Eliminar ${bodega?.nombre || "esta bodega"}?`)) return;

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
              <h3>{editingResponsableId ? "Editar responsable" : "Agregar responsable"}</h3>
              <p>
                {editingResponsableId
                  ? "Actualiza los datos del responsable seleccionado y guarda los cambios."
                  : "Crea un responsable 5S para asignarlo en cronogramas e inspecciones."}
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
                  type="color"
                  value={form.color || "#0ea5e9"}
                  onChange={(event) =>
                    setForm({ ...form, color: event.target.value })
                  }
                  aria-label="Seleccionar color del responsable"
                />
                <span>{form.color || "#0ea5e9"}</span>
              </div>
            </label>

            <button type="submit" className="responsable-submit" disabled={responsableLoading}>
              {editingResponsableId ? <Save size={18} /> : <Plus size={18} />}
              {responsableLoading
                ? "Guardando..."
                : editingResponsableId
                  ? "Actualizar responsable"
                  : "Agregar responsable"}
            </button>

            {editingResponsableId && (
              <button type="button" className="responsable-submit ghost" onClick={resetResponsableForm}>
                <X size={18} />
                Cancelar edición
              </button>
            )}
          </form>
        </article>

        <article className="portal-panel responsable-form-card">
          <div className="portal-panel-head">
            <div>
              <span className="portal-panel-kicker">NUEVA BODEGA</span>
              <h3>{editingBodegaId ? "Editar bodega" : "Crear bodega"}</h3>
              <p>
                Las bodegas se guardan en la sistema y alimentan los
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

                  <button type="button" className="mini-action" onClick={() => editResponsable(item)}>
                    <Edit3 size={15} />
                    Editar
                  </button>

                  <button
                    type="button"
                    className={`mini-action ${item.activo ? "danger" : "success"}`}
                    onClick={() => toggleResponsable(item.id)}
                    disabled={responsableLoading}
                  >
                    <Power size={15} />
                    {item.activo ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    type="button"
                    className="mini-action danger"
                    onClick={() => deleteResponsable(item.id)}
                    disabled={responsableLoading}
                  >
                    <Trash2 size={15} />
                    Eliminar
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
              placeholder="Ej. Pasillo A, Estantería 01"
            />
          </label>

          <label>
            Código
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
              placeholder="Zona o área"
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
            Descripción
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
              Cancelar edición
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
                      {parent?.nombre || "Sin bodega"} · {item.codigo || "Sin código"} · {item.zona || "Sin zona"}
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


function InspeccionView({ canAdmin = false }) {
  const [bodegas, setBodegas] = useState([]);
  const [subbodegas, setSubbodegas] = useState([]);
  const [bodegaError, setBodegaError] = useState("");
  const [responsables, setResponsables] = useState([]);
  const [config5S, setConfig5S] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [inspectionSaving, setInspectionSaving] = useState(false);
  const [inspectionHistory, setInspectionHistory] = useState([]);
  const [scheduledAudits, setScheduledAudits] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    periodo: "semana",
    desde: startOfWeekISO(),
    hasta: endOfWeekISO(),
    bodega: "Todas",
    responsable: "Todos",
    search: "",
  });
  const [historyReport, setHistoryReport] = useState(null);
  const [historyReportItems, setHistoryReportItems] = useState([]);
  const [historyReportLoading, setHistoryReportLoading] = useState(false);
  const [historyDeletingId, setHistoryDeletingId] = useState(null);
  const [mobileReportOpen, setMobileReportOpen] = useState(false);

  const [selectedBodega, setSelectedBodega] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [responsable, setResponsable] = useState("");
  const [area, setArea] = useState("");
  const [editingChecklist, setEditingChecklist] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [checklistRefreshKey, setChecklistRefreshKey] = useState(0);

  const checklist = checklistItems.map((item) => item.pregunta);
  const severidades = config5S?.severidades || [];
  const pilares = config5S?.pilares || [];
  const defaultSeveridad = severidades[1] || severidades[0] || "";
  const defaultPilar = pilares[0] || "";

  const [answers, setAnswers] = useState([]);

  function buildAnswersFromChecklist(nextItems, currentAnswers = []) {
    const currentById = new Map(currentAnswers.map((item) => [String(item.id), item]));
    return nextItems.map((item, index) => {
      const current = currentById.get(String(item.id));
      return {
        id: item.id,
        checklist_item_id: item.id,
        orden: item.orden || index + 1,
        pilar: item.pilar || defaultPilar,
        pregunta: item.pregunta,
        peso: item.peso || 1,
        requiere_evidencia: item.requiere_evidencia,
        estado: current?.estado || "na",
        severidad: current?.severidad || defaultSeveridad,
        observacion: current?.observacion || "",
        evidencias: current?.evidencias || [],
      };
    });
  }

  function notifyChecklistUpdated() {
    setChecklistRefreshKey((value) => value + 1);
    window.dispatchEvent(new Event("calidad5s:checklist-updated"));
    window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      loadBodegasFromApi(true),
      getSububicaciones5S({ activeOnly: true }),
      getResponsables5S({ activo: true }),
      getInspecciones5S(),
      getCronograma5S(),
      getConfig5S(),
    ])
      .then(([rows, subbodegaRows, responsablesRows, inspeccionesRows, cronogramaRows, configData]) => {
        if (!active) return;
        const nextResponsables = (responsablesRows || []).map(normalizeResponsable5S);
        const nextSubbodegas = (subbodegaRows || []).map(normalizeSububicacion5S);
        const nextCronograma = attachCronogramaExecution(
          (cronogramaRows || []).map(normalizeCronograma5S),
          inspeccionesRows || []
        );

        setBodegas(rows);
        setSubbodegas(nextSubbodegas);
        setResponsables(nextResponsables);
        setInspectionHistory(inspeccionesRows || []);
        setScheduledAudits(nextCronograma);
        setConfig5S(configData || null);
        setResponsable((current) => current || nextResponsables[0]?.nombre || "");
      })
      .catch((error) => {
        console.error("No se pudieron cargar los datos de inspección 5S:", error);
        if (active) setBodegaError("No se pudieron cargar los datos desde la sistema.");
      });

    return () => {
      active = false;
    };
  }, []);

  const bodegaById = useMemo(() => {
    const map = new Map();
    bodegas.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [bodegas]);

  const inspectionScopes = useMemo(() => {
    const subbodegasByParent = new Map();
    subbodegas.forEach((item) => {
      const key = String(item.bodega_id);
      if (!subbodegasByParent.has(key)) subbodegasByParent.set(key, []);
      subbodegasByParent.get(key).push(item);
    });

    const scopes = [];
    bodegas.forEach((bodega) => {
      const children = subbodegasByParent.get(String(bodega.id)) || [];

      if (!children.length) {
        scopes.push({
          key: `bodega-${bodega.id}`,
          type: "bodega",
          nombre: bodega.nombre,
          label: bodega.nombre,
          bodega_id: bodega.id,
          parentName: bodega.nombre,
        });
        return;
      }

      children.forEach((subbodega) => {
        scopes.push({
          key: `subbodega-${subbodega.id}`,
          type: "subbodega",
          nombre: subbodega.nombre,
          label: `${bodega.nombre} / ${subbodega.nombre}`,
          bodega_id: bodega.id,
          subbodega_id: subbodega.id,
          parentName: bodega.nombre,
        });
      });
    });

    return scopes;
  }, [bodegas, subbodegas]);

  useEffect(() => {
    if (!selectedBodega && inspectionScopes.length) {
      setSelectedBodega(inspectionScopes[0].nombre);
    }
  }, [inspectionScopes, selectedBodega]);

  const selectedScope = useMemo(
    () => inspectionScopes.find((item) => item.nombre === selectedBodega) || null,
    [inspectionScopes, selectedBodega]
  );

  const pendingScheduledAudits = useMemo(
    () => scheduledAudits
      .filter((item) => !item.ejecutada)
      .sort((a, b) => String(a.fechaInicio).localeCompare(String(b.fechaInicio))),
    [scheduledAudits]
  );

  const selectedProgram = useMemo(
    () => scheduledAudits.find((item) => String(item.id) === String(selectedProgramId)) || null,
    [scheduledAudits, selectedProgramId]
  );

  function selectScheduledAudit(id) {
    setSelectedProgramId(id);
    if (!id) return;

    const programacion = scheduledAudits.find((item) => String(item.id) === String(id));
    if (!programacion) return;

    setSelectedBodega(programacion.bodega || "");
    setResponsable(programacion.responsable || "");
    setFecha(todayISO());
    setArea(programacion.actividad || programacion.bodega || "");
  }

  useEffect(() => {
    const applyPendingProgram = () => {
      const pendingId = sessionStorage.getItem("calidad5s:selected-program-id");
      if (!pendingId || !scheduledAudits.length) return;

      const exists = scheduledAudits.some((item) => String(item.id) === String(pendingId));
      if (!exists) return;

      sessionStorage.removeItem("calidad5s:selected-program-id");
      selectScheduledAudit(pendingId);
      setTimeout(() => {
        document.querySelector(".inspeccion-control-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    };

    applyPendingProgram();
    window.addEventListener("calidad5s:select-program", applyPendingProgram);
    return () => window.removeEventListener("calidad5s:select-program", applyPendingProgram);
  }, [scheduledAudits]);

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
        setAnswers((prev) => buildAnswersFromChecklist(nextItems, prev));
      })
      .catch((error) => {
        console.error("No se pudo cargar el checklist 5S:", error);
        if (active) {
          setChecklistItems([]);
          setAnswers([]);
          setBodegaError(error.message || "No se pudo cargar el checklist desde la sistema.");
        }
      })
      .finally(() => {
        if (active) setChecklistLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedBodega, defaultSeveridad, defaultPilar, checklistRefreshKey]);

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
        bodega_id: selectedScope?.bodega_id || null,
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
      setAnswers((prev) =>
        prev.map((current) =>
          current.id === item.id ? { ...current, ...normalizeChecklistItem5S(updated) } : current
        )
      );
      notifyChecklistUpdated();
    } catch (error) {
      console.error("No se pudo actualizar el punto 5S:", error);
      setBodegaError(error.message || "No se pudo actualizar el checklist en la sistema.");
    }
  }

  async function addQuestion() {
    if (!selectedBodega) {
      show5SAlert("Selecciona una bodega activa antes de crear puntos de control.");
      return;
    }

    if (!newQuestion.trim()) {
      show5SAlert("Escribe la nueva pregunta del checklist.");
      return;
    }

    try {
      const created = await crearChecklistItem5S({
        bodega_id: selectedScope?.bodega_id || null,
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
      notifyChecklistUpdated();
    } catch (error) {
      console.error("No se pudo crear el punto 5S:", error);
      setBodegaError(error.message || "No se pudo guardar el checklist en la sistema.");
    }
  }

  async function deleteQuestion(index) {
    if (!await show5SConfirm("¿Eliminar esta pregunta del checklist?")) return;

    const item = checklistItems[index];
    if (!item) return;

    try {
      await eliminarChecklistItem5S(item.id);
      setChecklistItems((prev) => prev.filter((_, idx) => idx !== index));
      setAnswers((prev) => prev.filter((_, idx) => idx !== index));
      notifyChecklistUpdated();
    } catch (error) {
      console.error("No se pudo eliminar el punto 5S:", error);
      setBodegaError(error.message || "No se pudo eliminar el checklist en la sistema.");
    }
  }

  async function saveInspection() {
    if (!selectedBodega) {
      show5SAlert("Debes crear y seleccionar una bodega activa desde la sistema.");
      return;
    }

    const evaluados = answers.filter((item) => item.estado !== "na");

    if (!evaluados.length) {
      show5SAlert("Debes evaluar al menos un punto del checklist guardado en sistema.");
      return;
    }

    const payload = {
      fecha,
      semana: weekLabel(fecha),
      bodega_id: selectedScope?.bodega_id || null,
      bodega: selectedBodega,
      responsable,
      area,
      cumplimiento,
      meta_bodega: 90,
      items: evaluados.map((item) => ({
        id: item.checklist_item_id || item.id,
        checklist_item_id: item.checklist_item_id || item.id,
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

      if (selectedProgram) {
        const estadosCronograma = config5S?.estados_cronograma || [];
        const estadoEjecutado = estadosCronograma.find((item) =>
          /ejecut|complet|final/i.test(String(item))
        ) || "Ejecutada";
        const notaEjecucion = `Ejecutada el ${fecha}. Inspección registrada para ${selectedBodega}.`;

        try {
          await editarCronograma5S(selectedProgram.id, {
            estado: estadoEjecutado,
            fecha_ejecucion: fecha,
            inspeccion_id: saved.id,
            observacion: selectedProgram.observacion
              ? `${selectedProgram.observacion}\n${notaEjecucion}`
              : notaEjecucion,
          });
        } catch (programError) {
          console.warn("No existen aún las columnas de ejecución en cronograma; se actualizará solo estado/observación:", programError);
          try {
            await editarCronograma5S(selectedProgram.id, {
              estado: estadoEjecutado,
              observacion: selectedProgram.observacion
                ? `${selectedProgram.observacion}\n${notaEjecucion}`
                : notaEjecucion,
            });
          } catch (fallbackError) {
            console.error("La inspección se guardó, pero no se pudo actualizar el cronograma:", fallbackError);
          }
        }

        const savedWithDate = { ...saved, fecha, bodega: selectedBodega, responsable };
        setScheduledAudits((prev) =>
          attachCronogramaExecution(
            prev.map((item) => item.id === selectedProgram.id
              ? { ...item, estado: estadoEjecutado, fecha_ejecucion: fecha, inspeccion_id: saved.id, observacion: notaEjecucion }
              : item),
            [savedWithDate, ...inspectionHistory]
          )
        );
        setSelectedProgramId("");
      }

      window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
      show5SAlert("Inspeccion guardada correctamente en sistema.");
    } catch (error) {
      console.error("No se pudo guardar la inspeccion 5S:", error);
      show5SAlert(error.message || "No se pudo guardar la inspeccion en la sistema.");
    } finally {
      setInspectionSaving(false);
    }

  }

  async function openPrintReport() {
    const report = document.getElementById("informe5s-preview");
    if (!report) return;

    openPrintable5SDocument({
      title: `Informe 5S - ${selectedBodega}`,
      reportElement: report,
    });
  }

  function updateHistoryPeriod(periodo) {
    if (periodo === "semana") {
      setHistoryFilters((prev) => ({
        ...prev,
        periodo,
        desde: startOfWeekISO(),
        hasta: endOfWeekISO(),
      }));
      return;
    }

    if (periodo === "mes") {
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setHistoryFilters((prev) => ({ ...prev, periodo, desde, hasta }));
      return;
    }

    setHistoryFilters((prev) => ({ ...prev, periodo }));
  }

  async function openHistoryReport(item) {
    setHistoryReport(item);
    setHistoryReportItems([]);
    setHistoryReportLoading(true);

    try {
      const rows = await getInspeccionItems5S(item.id);
      setHistoryReportItems(rows || []);
    } catch (error) {
      console.error("No se pudo cargar el informe histórico de inspección:", error);
      setHistoryReportItems([]);
    } finally {
      setHistoryReportLoading(false);
    }
  }

  async function deleteHistoryInspection(item) {
    const fechaInspeccion = item.fecha || item.created_at?.slice(0, 10) || "sin fecha";
    const ok = await show5SConfirm(
      `¿Eliminar la inspección de ${item.bodega || "esta bodega"} del ${formatShortDate(fechaInspeccion)}?\n\nSe eliminarán sus puntos evaluados, evidencias registradas y planes de acción asociados.`
    );
    if (!ok) return;

    setHistoryDeletingId(item.id);

    try {
      await eliminarInspeccion5S(item.id);
      setInspectionHistory((prev) => prev.filter((row) => row.id !== item.id));
      if (historyReport?.id === item.id) {
        setHistoryReport(null);
        setHistoryReportItems([]);
      }
      window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
      show5SAlert("Inspección eliminada correctamente.");
    } catch (error) {
      console.error("No se pudo eliminar la inspección:", error);
      show5SAlert(error.message || "No se pudo eliminar la inspección.");
    } finally {
      setHistoryDeletingId(null);
    }
  }

  async function printHistoryReport() {
    const report = document.getElementById("inspection-history-report");
    if (!report || !historyReport) return;

    openPrintable5SDocument({
      title: `Informe 5S - ${historyReport.bodega}`,
      reportElement: report,
    });
  }

  useEffect(() => {
    if (!historyReport) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      document.querySelector(".inspection-history-report-card")?.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("inspection-history-report")?.scrollIntoView({ block: "start" });
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [historyReport]);

  const evidenciaTotal = answers.reduce((sum, item) => sum + item.evidencias.length, 0);
  const destacados = answers.filter((item) => item.evidencias.length).slice(0, 6);
  const hallazgosDetalle = answers.filter(
    (item) => item.estado === "no_cumple" || item.observacion.trim()
  );
  const evidenceItems = answers.flatMap((item, answerIndex) =>
    item.evidencias.map((ev, evidenceIndex) => ({
      ...ev,
      answerId: item.id,
      punto: item.orden || answerIndex + 1,
      pregunta: item.pregunta,
      index: evidenceIndex + 1,
    }))
  );
  const evidencePages = [];
  for (let index = 0; index < evidenceItems.length; index += 4) {
    evidencePages.push(evidenceItems.slice(index, index + 4));
  }
  const reportPageCount = 2 + evidencePages.length;
  const previewRows = answers.slice(0, 6);
  const cumplimientoClamped = Math.min(100, Math.max(0, Number(cumplimiento) || 0));
  const reportIsCritical = cumplimientoClamped < 90;
  const historyBodegas = useMemo(
    () => ["Todas", ...new Set(inspectionHistory.map((item) => item.bodega).filter(Boolean))],
    [inspectionHistory]
  );
  const historyResponsables = useMemo(
    () => ["Todos", ...new Set(inspectionHistory.map((item) => item.responsable).filter(Boolean))],
    [inspectionHistory]
  );
  const filteredHistory = useMemo(() => {
    const term = historyFilters.search.trim().toLowerCase();

    return inspectionHistory.filter((item) => {
      const fechaInspeccion = item.fecha || item.created_at?.slice(0, 10) || "";
      const okFecha = historyFilters.periodo === "todo"
        || (!fechaInspeccion ? false : fechaInspeccion >= historyFilters.desde && fechaInspeccion <= historyFilters.hasta);
      const okBodega = historyFilters.bodega === "Todas" || item.bodega === historyFilters.bodega;
      const okResponsable = historyFilters.responsable === "Todos" || item.responsable === historyFilters.responsable;
      const searchable = [
        item.id,
        item.fecha,
        item.semana,
        item.bodega,
        item.responsable,
        item.area,
        item.cumplimiento,
      ].filter(Boolean).join(" ").toLowerCase();

      return okFecha && okBodega && okResponsable && (!term || searchable.includes(term));
    });
  }, [inspectionHistory, historyFilters]);
  const historyReportScore = Number(historyReport?.cumplimiento || 0);
  const historyReportMeta = Number(historyReport?.meta_bodega || 90);
  const historyReportConformes = historyReportItems.filter((item) => Boolean(item.cumple)).length;
  const historyReportNoConformes = historyReportItems.filter((item) => !item.cumple).length;
  const historyReportHallazgos = historyReportItems.filter((item) => !item.cumple || String(item.observacion || "").trim()).length;
  const historyReportEvidenceItems = historyReportItems.flatMap((item, itemIndex) =>
    (item.evidencias || []).map((ev, evidenceIndex) => ({
      id: ev.id || `${item.id}-${evidenceIndex}`,
      src: ev.url || ev.src,
      name: ev.nombre_archivo || ev.name || `Evidencia ${evidenceIndex + 1}`,
      punto: itemIndex + 1,
      pregunta: item.punto,
    })).filter((ev) => Boolean(ev.src))
  );
  const historyReportEvidencePages = [];
  for (let index = 0; index < historyReportEvidenceItems.length; index += 4) {
    historyReportEvidencePages.push(historyReportEvidenceItems.slice(index, index + 4));
  }
  const historyReportPageCount = historyReport ? 2 + historyReportEvidencePages.length : 0;

  return (
    <div className="portal-shell inspeccion-shell">
      <section className="portal-hero inspeccion-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Inspección 5S</h2>
          <p>
            Realiza inspección por bodega, registra evidencias, edita checklist
            y genera informe ejecutivo con conteo estimado de páginas.
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
          <label className="span-2">
            Auditoría programada
            <select value={selectedProgramId} onChange={(e) => selectScheduledAudit(e.target.value)}>
              <option value="">Inspección manual / sin programación</option>
              {pendingScheduledAudits.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatShortDate(item.fechaInicio)} - {item.bodega} - {item.responsable || "Sin responsable"}
                </option>
              ))}
            </select>
            <small>
              {selectedProgram
                ? `Programada del ${formatShortDate(selectedProgram.fechaInicio)} al ${formatShortDate(selectedProgram.fechaFin)}. Al guardar quedará ejecutada en el Gantt.`
                : `${pendingScheduledAudits.length} auditorías pendientes por ejecutar.`}
            </small>
          </label>

          <label>
            1. Seleccionar bodega
            <select value={selectedBodega} onChange={(e) => {
              setSelectedBodega(e.target.value);
              setSelectedProgramId("");
            }}>
              {inspectionScopes.length ? (
                inspectionScopes.map((scope) => (
                  <option key={scope.key} value={scope.nombre}>
                    {scope.label}
                  </option>
                ))
              ) : (
                <option value="">Sin bodegas o subbodegas activas</option>
              )}
            </select>
            {bodegaError && <small>{bodegaError}</small>}
          </label>

          <label>
            2. Responsable
            <select value={responsable} onChange={(e) => {
              setResponsable(e.target.value);
              setSelectedProgramId("");
            }}>
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
          {canAdmin && (
            <button type="button" className="portal-secondary-btn" onClick={() => setEditingChecklist((value) => !value)}>
              <Edit3 size={17} />
              {editingChecklist ? "Cerrar edición" : "Editar checklist de la bodega"}
            </button>
          )}

          <button
            type="button"
            className="portal-secondary-btn"
            onClick={() => document.getElementById("inspeccion-historial")?.scrollIntoView({ behavior: "smooth" })}
          >
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

      {canAdmin && editingChecklist && (
        <section className="portal-panel checklist-editor-panel">
          <div className="portal-panel-head">
            <div>
              <span className="portal-panel-kicker">CHECKLIST EDITABLE</span>
              <h3>Preguntas asociadas a {selectedBodega}</h3>
              <p>Matriz viva: los cambios aplican a nuevas inspecciones y el histórico conserva la matriz evaluada.</p>
            </div>
            <span className="portal-status-pill status-ok">{checklistItems.length} puntos activos</span>
          </div>

          <div className="checklist-edit-list">
            {checklistItems.map((item, index) => (
              <div key={item.id || `${item.pregunta}-${index}`} className="checklist-edit-row">
                <span>{index + 1}</span>
                <select
                  value={item.pilar || ""}
                  onChange={(e) => updateChecklistMeta(index, "pilar", e.target.value)}
                  onBlur={() => saveQuestion({ ...item, pilar: checklistItems[index]?.pilar })}
                >
                  <option value="">Sin pilar</option>
                  {pilares.map((pilar) => (
                    <option key={pilar} value={pilar}>{pilar}</option>
                  ))}
                </select>
                <input
                  value={item.pregunta || ""}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  onBlur={(e) => saveQuestion({ ...checklistItems[index], pregunta: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveQuestion({ ...checklistItems[index], pregunta: e.currentTarget.value });
                    }
                  }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={item.peso || 1}
                  onChange={(e) => updateChecklistMeta(index, "peso", e.target.value)}
                  onBlur={() => saveQuestion({ ...item, peso: checklistItems[index]?.peso })}
                />
                <label className="checklist-requires-evidence">
                  <input
                    type="checkbox"
                    checked={Boolean(item.requiere_evidencia)}
                    onChange={(e) => {
                      const nextItem = { ...checklistItems[index], requiere_evidencia: e.target.checked };
                      updateChecklistMeta(index, "requiere_evidencia", e.target.checked);
                      saveQuestion(nextItem);
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

            {answers.map((item, index) => (
              <div className="checklist-row" key={item.id}>
                <span className="row-index">{item.orden || index + 1}</span>
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

      <section id="inspeccion-historial" className="portal-panel inspection-history-panel">
        <div className="portal-panel-head">
          <div>
            <span className="portal-panel-kicker">HISTORIAL DE INSPECCIONES</span>
            <h3>Buscar y consultar informes guardados</h3>
            <p>Filtra por fecha, bodega, responsable o texto exacto; luego abre el ojo para ver el informe.</p>
          </div>
          <button type="button" className="portal-secondary-btn" onClick={() => setHistoryFilters({
            periodo: "todo",
            desde: startOfWeekISO(),
            hasta: endOfWeekISO(),
            bodega: "Todas",
            responsable: "Todos",
            search: "",
          })}>
            <RefreshCw size={16} />
            Ver todo
          </button>
        </div>

        <div className="inspection-history-filters">
          <label>
            Periodo
            <select value={historyFilters.periodo} onChange={(event) => updateHistoryPeriod(event.target.value)}>
              <option value="semana">Semana actual</option>
              <option value="mes">Mes actual</option>
              <option value="rango">Rango de fechas</option>
              <option value="todo">Todo el histórico</option>
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={historyFilters.desde}
              disabled={historyFilters.periodo === "todo"}
              onChange={(event) => setHistoryFilters({ ...historyFilters, desde: event.target.value, periodo: "rango" })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={historyFilters.hasta}
              disabled={historyFilters.periodo === "todo"}
              onChange={(event) => setHistoryFilters({ ...historyFilters, hasta: event.target.value, periodo: "rango" })}
            />
          </label>
          <label>
            Bodega
            <select value={historyFilters.bodega} onChange={(event) => setHistoryFilters({ ...historyFilters, bodega: event.target.value })}>
              {historyBodegas.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Responsable
            <select value={historyFilters.responsable} onChange={(event) => setHistoryFilters({ ...historyFilters, responsable: event.target.value })}>
              {historyResponsables.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="inspection-history-search">
            Buscar
            <input
              value={historyFilters.search}
              onChange={(event) => setHistoryFilters({ ...historyFilters, search: event.target.value })}
              placeholder="Fecha, bodega, responsable, semana..."
            />
          </label>
        </div>

        <div className="inspection-history-table">
          <table className="print-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Semana</th>
                <th>Bodega</th>
                <th>Responsable</th>
                <th>Cumplimiento</th>
                <th>Estado</th>
                <th>Informe</th>
                <th>Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => {
                const score = Number(item.cumplimiento || 0);
                const fechaInspeccion = item.fecha || item.created_at?.slice(0, 10);
                return (
                  <tr key={item.id}>
                    <td>{fechaInspeccion ? formatLongDate(fechaInspeccion) : "Sin fecha"}</td>
                    <td>{item.semana || (fechaInspeccion ? weekLabel(fechaInspeccion) : "Sin semana")}</td>
                    <td>{item.bodega || "Sin bodega"}</td>
                    <td>{item.responsable || "Sin responsable"}</td>
                    <td><b>{score}%</b></td>
                    <td><span className={`portal-status-pill ${reportStatus(score)}`}>{scoreLevel(score)}</span></td>
                    <td>
                      <button type="button" className="dashboard-eye-btn" onClick={() => openHistoryReport(item)} title="Ver informe">
                        <Eye size={17} />
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dashboard-eye-btn danger"
                        onClick={() => deleteHistoryInspection(item)}
                        disabled={historyDeletingId === item.id}
                        title="Eliminar inspección"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filteredHistory.length && (
            <div className="dashboard-empty">No hay inspecciones guardadas que coincidan con el filtro actual.</div>
          )}
        </div>
      </section>

      <section className={`report-preview-shell ${mobileReportOpen ? "is-mobile-open" : ""}`}>
        <div className="report-preview-head">
          <div>
            <span className="portal-panel-kicker">INFORME EJECUTIVO 5S</span>
            <h3>Informe formal de inspección</h3>
            <p>{reportPageCount} {reportPageCount === 1 ? "página estimada" : "páginas estimadas"} según checklist y evidencias.</p>
          </div>

          <button type="button" className="portal-secondary-btn report-mobile-eye-btn" onClick={() => setMobileReportOpen(true)}>
            <Eye size={17} />
            Ver informe
          </button>

          <button type="button" className="portal-secondary-btn" onClick={openPrintReport}>
            <Download size={17} />
            Imprimir / guardar PDF
          </button>
        </div>

        <div className="report-preview-frame">
          <button type="button" className="report-mobile-close" onClick={() => setMobileReportOpen(false)} aria-label="Cerrar vista previa">
            <X size={18} />
          </button>

        <div id="informe5s-preview" className="letter-report-page report-book report-theme-reference table-tools-skip">
          <article className="report-sheet report-sheet-main">
            <div className="report-reference-cover">
              <div className="report-reference-brand">
                <LogoImage tone="light" />
                <span>Calidad 5S</span>
              </div>

              <div className="report-reference-title">
                <span>INFORME DE INSPECCIÓN 5S</span>
                <h2>{selectedBodega}</h2>
                <p>Evaluación formal de orden, limpieza, almacenamiento, condiciones de control y evidencias asociadas.</p>
              </div>

              <div className={`report-reference-score ${reportStatus(cumplimiento)}`}>
                <small>Cumplimiento general</small>
                <strong>{cumplimiento}%</strong>
                <b>{reportIsCritical ? "Crítico" : nivel}</b>
              </div>
            </div>

            <div className="report-reference-meta">
              <div><CalendarDays size={25} /><span><small>Fecha de inspección</small><strong>{formatLongDate(fecha)}</strong></span></div>
              <div><UserRound size={26} /><span><small>Responsable</small><strong>{responsable || "Sin responsable"}</strong></span></div>
              <div><Warehouse size={26} /><span><small>Área / Proceso</small><strong>{area || selectedBodega}</strong></span></div>
              <div><Target size={27} /><span><small>Meta requerida</small><strong>&gt;= 90%</strong></span></div>
            </div>

            <div className="report-reference-kpis">
              <div><ClipboardCheck size={26} /><span><small>Puntos evaluados</small><strong>{total}</strong></span></div>
              <div className="ok"><CheckCircle2 size={29} /><span><small>Puntos conformes</small><strong>{conformes}</strong></span></div>
              <div className="bad"><X size={27} /><span><small>No conformes</small><strong>{noConformes}</strong></span></div>
              <div className="neutral"><Circle size={28} /><span><small>No aplica (N/A)</small><strong>{na}</strong></span></div>
              <div className="warn"><Filter size={28} /><span><small>Hallazgos</small><strong>{hallazgos}</strong></span></div>
            </div>

            <section className="report-result-panel">
              <div>
                <h3>Resultado general</h3>
                <p>El cumplimiento de la inspección se encuentra en estado {nivel.toLowerCase()} frente a la meta requerida de = 90%.</p>
                <div className="report-progress">
                  <span>{cumplimiento}%</span>
                  <i><b style={{ width: `${cumplimientoClamped}%` }} /></i>
                  <em>90%<small>Meta</small></em>
                </div>
              </div>
              <div className="report-result-icon">
                <ClipboardCheck size={74} />
                <strong>!</strong>
              </div>
            </section>

            <section className="report-section report-reference-section">
              <h3>1. Matriz técnica de verificación</h3>
              <p>Resumen de cumplimiento por punto evaluado.</p>
              <table className="report-table report-reference-table print-table">
                <colgroup>
                  <col className="report-col-number" />
                  <col className="report-col-point" />
                  <col className="report-col-state" />
                  <col className="report-col-severity" />
                  <col className="report-col-notes" />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Punto evaluado</th>
                    <th>Estado</th>
                    <th>Severidad</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((item, index) => (
                    <tr key={item.id}>
                      <td>{item.orden || index + 1}</td>
                      <td>{item.pregunta}</td>
                      <td><span className="report-status-chip">{item.estado === "cumple" ? "Conforme" : item.estado === "no_cumple" ? "No conforme" : "N/A"}</span></td>
                      <td><span className="report-severity-dot" />{item.severidad}</td>
                      <td>{item.observacion || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {answers.length > previewRows.length && (
                <div className="report-table-more">Ver detalle completo en página 2</div>
              )}
            </section>

            <div className="report-reference-bottom">
              <section>
                <h3>2. Evidencias fotográficas destacadas</h3>
                <div className="report-empty-box report-reference-empty">
                  <ImagePlus size={36} />
                  <b>{destacados.length ? `${evidenciaTotal} evidencias cargadas.` : "Sin evidencias fotográficas cargadas."}</b>
                  <span>{destacados.length ? "El detalle se conserva en los anexos del informe." : "No se adjuntaron fotografías para esta inspección."}</span>
                </div>
              </section>
              <section>
                <h3>3. Hallazgos y acciones sugeridas</h3>
                <div className="report-empty-box report-reference-empty report-reference-action">
                  <ClipboardCheck size={34} />
                  <b>{hallazgos ? `${hallazgos} hallazgos registrados.` : "Sin hallazgos registrados."}</b>
                  <span>{hallazgos ? "Revisar acciones sugeridas en el detalle." : "Se recomienda validar los puntos N/A."}</span>
                </div>
              </section>
            </div>

            <div className="report-footer report-reference-footer">
              <span><LogoImage tone="light" /> Sistema 5S</span>
              <span>Informe generado automáticamente</span>
              <span>Página 1 de {reportPageCount}</span>
            </div>
          </article>

          <article className="report-sheet report-sheet-detail">
            <div className="report-detail-head">
              <span>INFORME DE INSPECCIÓN 5S · <b>{selectedBodega}</b></span>
            </div>

            <div className="report-detail-layout">
              <section className="report-section report-reference-section report-detail-table-box">
                <h3>1. Matriz técnica de verificación (detalle completo)</h3>
                <table className="report-table report-reference-table print-table">
                  <colgroup>
                    <col className="report-col-number" />
                    <col className="report-col-point" />
                    <col className="report-col-state" />
                    <col className="report-col-severity" />
                    <col className="report-col-notes" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Punto evaluado</th>
                      <th>Estado</th>
                      <th>Severidad</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answers.map((item, index) => (
                      <tr key={item.id}>
                        <td>{item.orden || index + 1}</td>
                        <td>{item.pregunta}</td>
                        <td><span className="report-status-chip">{item.estado === "cumple" ? "Conforme" : item.estado === "no_cumple" ? "No conforme" : "N/A"}</span></td>
                        <td><span className="report-severity-dot" />{item.severidad}</td>
                        <td>{item.observacion || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <aside className="report-detail-aside">
                <section>
                  <h3>2. Evidencias fotográficas</h3>
                  <div className="report-empty-box report-reference-empty">
                    <ImagePlus size={34} />
                    <b>{evidenceItems.length ? `${evidenceItems.length} evidencias anexadas.` : "Sin evidencias cargadas."}</b>
                    <span>{evidenceItems.length ? "Ver anexo fotográfico en las páginas siguientes." : "No se adjuntaron fotografías para esta inspección."}</span>
                  </div>
                </section>

                <section>
                  <h3>3. Observaciones generales</h3>
                  <div className="report-side-note">
                    <ClipboardCheck size={26} />
                    <b>{hallazgos ? `${hallazgos} observaciones registradas.` : "No se registraron observaciones adicionales."}</b>
                  </div>
                </section>

                <section>
                  <h3>4. Plan de acción sugerido</h3>
                  <div className="report-side-note report-side-note-ok">
                    <CheckCircle2 size={31} />
                    <p>Se recomienda generar un plan de acción enfocado en los puntos marcados como críticos o N/A, con el fin de alcanzar la meta requerida (= 90%).</p>
                  </div>
                </section>
              </aside>
            </div>

            <div className="report-footer report-reference-footer">
              <span><LogoImage tone="light" /> Sistema 5S</span>
              <span>Informe generado automáticamente</span>
              <span>Página 2 de {reportPageCount}</span>
            </div>
          </article>

          {evidencePages.map((page, pageIndex) => (
            <article className="report-sheet report-sheet-evidence" key={`evidence-page-${pageIndex}`}>
              <div className="report-detail-head">
                <span>ANEXO FOTOGRÁFICO 5S · <b>{selectedBodega}</b></span>
              </div>

              <section className="report-evidence-annex">
                <h3>{pageIndex === 0 ? "5. Evidencias fotográficas completas" : "5. Evidencias fotográficas completas (continuación)"}</h3>
                <p>{evidenceItems.length} evidencias anexadas a la inspección.</p>

                <div className="report-evidence-annex-grid">
                  {page.map((ev) => (
                    <figure key={`${ev.answerId}-${ev.id}`}>
                      <img src={ev.src} alt={ev.name} />
                      <figcaption>
                        <b>Punto {ev.punto}</b>
                        <span>{ev.pregunta}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>

              <div className="report-footer report-reference-footer">
                <span><LogoImage tone="light" /> Sistema 5S</span>
                <span>Informe generado automáticamente</span>
                <span>Página {pageIndex + 3} de {reportPageCount}</span>
              </div>
            </article>
          ))}
        </div>
        </div>
      </section>

      {historyReport && (
        <div className="dashboard-report-modal" role="dialog" aria-modal="true">
          <article className="portal-panel dashboard-report-card inspection-history-report-card">
            <div className="portal-panel-head">
              <div>
                <span className="portal-panel-kicker">INFORME HISTÓRICO</span>
                <h3>{historyReport.bodega || "Inspección 5S"}</h3>
                <p>
                  {historyReport.fecha ? formatLongDate(historyReport.fecha) : "Sin fecha"} · {historyReport.responsable || "Sin responsable"}
                </p>
              </div>
              <button type="button" className="top-icon-btn" onClick={() => setHistoryReport(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="dashboard-report-actions">
              <button type="button" className="portal-primary-btn" onClick={printHistoryReport}>
                <Printer size={17} />
                Imprimir / guardar PDF
              </button>
            </div>

            <div id="inspection-history-report" className="letter-report-page report-book report-theme-reference table-tools-skip">
              <article className="report-sheet report-sheet-main">
                <div className="report-reference-cover">
                  <div className="report-reference-brand">
                    <LogoImage tone="light" />
                    <span>Calidad 5S</span>
                  </div>

                  <div className="report-reference-title">
                    <span>INFORME DE INSPECCIÓN 5S</span>
                    <h2>{historyReport.bodega || "Inspección 5S"}</h2>
                    <p>Evaluación formal de orden, limpieza, almacenamiento, condiciones de control y evidencias asociadas.</p>
                  </div>

                  <div className={`report-reference-score ${reportStatus(historyReportScore)}`}>
                    <small>Cumplimiento general</small>
                    <strong>{historyReportScore}%</strong>
                    <b>{scoreLevel(historyReportScore)}</b>
                  </div>
                </div>

                <div className="report-reference-meta">
                  <div><CalendarDays size={25} /><span><small>Fecha de inspección</small><strong>{historyReport.fecha ? formatLongDate(historyReport.fecha) : "Sin fecha"}</strong></span></div>
                  <div><UserRound size={26} /><span><small>Responsable</small><strong>{historyReport.responsable || "Sin responsable"}</strong></span></div>
                  <div><Warehouse size={26} /><span><small>Área / Proceso</small><strong>{historyReport.area || historyReport.bodega || "Sin área"}</strong></span></div>
                  <div><Target size={27} /><span><small>Meta requerida</small><strong>&gt;= {historyReportMeta}%</strong></span></div>
                </div>

                <div className="report-reference-kpis">
                  <div><ClipboardCheck size={26} /><span><small>Puntos evaluados</small><strong>{historyReportItems.length}</strong></span></div>
                  <div className="ok"><CheckCircle2 size={29} /><span><small>Puntos conformes</small><strong>{historyReportConformes}</strong></span></div>
                  <div className="bad"><X size={27} /><span><small>No conformes</small><strong>{historyReportNoConformes}</strong></span></div>
                  <div className="neutral"><Circle size={28} /><span><small>Evidencias</small><strong>{historyReportEvidenceItems.length}</strong></span></div>
                  <div className="warn"><Filter size={28} /><span><small>Hallazgos</small><strong>{historyReportHallazgos}</strong></span></div>
                </div>

                <section className="report-result-panel">
                  <div>
                    <h3>Resultado general</h3>
                    <p>El cumplimiento de la inspección se encuentra en estado {scoreLevel(historyReportScore).toLowerCase()} frente a la meta requerida de = {historyReportMeta}%.</p>
                    <div className="report-progress">
                      <span>{historyReportScore}%</span>
                      <i><b style={{ width: `${Math.min(100, Math.max(0, historyReportScore))}%` }} /></i>
                      <em>{historyReportMeta}%<small>Meta</small></em>
                    </div>
                  </div>
                  <div className="report-result-icon">
                    <ClipboardCheck size={74} />
                    <strong>!</strong>
                  </div>
                </section>

                <section className="report-section report-reference-section">
                  <h3>1. Matriz técnica de verificación</h3>
                  <p>Resumen de cumplimiento por punto evaluado.</p>
                  {historyReportLoading ? (
                    <div className="dashboard-empty">Cargando matriz de la inspección...</div>
                  ) : historyReportItems.length ? (
                    <table className="report-table report-reference-table print-table">
                      <colgroup>
                        <col className="report-col-number" />
                        <col className="report-col-point" />
                        <col className="report-col-state" />
                        <col className="report-col-severity" />
                        <col className="report-col-notes" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Punto evaluado</th>
                          <th>Estado</th>
                          <th>Severidad</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyReportItems.slice(0, 6).map((item, index) => (
                          <tr key={item.id || index}>
                            <td>{index + 1}</td>
                            <td>{item.punto}</td>
                            <td><span className="report-status-chip">{item.cumple ? "Conforme" : "No conforme"}</span></td>
                            <td><span className="report-severity-dot" />{item.severidad || "-"}</td>
                            <td>{item.observacion || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="dashboard-report-note">Esta inspección no tiene matriz histórica guardada.</div>
                  )}
                  {historyReportItems.length > 6 && <div className="report-table-more">Ver detalle completo en página 2</div>}
                </section>

                <div className="report-reference-bottom">
                  <section>
                    <h3>2. Evidencias fotográficas destacadas</h3>
                    <div className="report-empty-box report-reference-empty">
                      <ImagePlus size={36} />
                      <b>{historyReportEvidenceItems.length ? `${historyReportEvidenceItems.length} evidencias anexadas.` : "Sin evidencias fotográficas cargadas."}</b>
                      <span>{historyReportEvidenceItems.length ? "El detalle se conserva en los anexos del informe." : "No se adjuntaron fotografías para esta inspección."}</span>
                    </div>
                  </section>
                  <section>
                    <h3>3. Hallazgos y acciones sugeridas</h3>
                    <div className="report-empty-box report-reference-empty report-reference-action">
                      <ClipboardCheck size={34} />
                      <b>{historyReportHallazgos ? `${historyReportHallazgos} hallazgos registrados.` : "Sin hallazgos registrados."}</b>
                      <span>{historyReportHallazgos ? "Revisar acciones sugeridas en el detalle." : "Se recomienda validar los puntos evaluados."}</span>
                    </div>
                  </section>
                </div>

                <div className="report-footer report-reference-footer">
                  <span><LogoImage tone="light" /> Sistema 5S</span>
                  <span>Informe generado desde Inspecciones</span>
                  <span>Página 1 de {historyReportPageCount}</span>
                </div>
              </article>

              <article className="report-sheet report-sheet-detail">
                <div className="report-detail-head">
                  <span>INFORME DE INSPECCIÓN 5S · <b>{historyReport.bodega || "Inspección 5S"}</b></span>
                </div>

                <div className="report-detail-layout">
                  <section className="report-section report-reference-section report-detail-table-box">
                    <h3>1. Matriz técnica de verificación (detalle completo)</h3>
                    {historyReportItems.length ? (
                      <table className="report-table report-reference-table print-table">
                        <colgroup>
                          <col className="report-col-number" />
                          <col className="report-col-point" />
                          <col className="report-col-state" />
                          <col className="report-col-severity" />
                          <col className="report-col-notes" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Punto evaluado</th>
                            <th>Estado</th>
                            <th>Severidad</th>
                            <th>Observaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyReportItems.map((item, index) => (
                            <tr key={item.id || index}>
                              <td>{index + 1}</td>
                              <td>{item.punto}</td>
                              <td><span className="report-status-chip">{item.cumple ? "Conforme" : "No conforme"}</span></td>
                              <td><span className="report-severity-dot" />{item.severidad || "-"}</td>
                              <td>{item.observacion || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="dashboard-report-note">Sin matriz histórica guardada para esta inspección.</div>
                    )}
                  </section>

                  <aside className="report-detail-aside">
                    <section>
                      <h3>2. Evidencias fotográficas</h3>
                      <div className="report-empty-box report-reference-empty">
                        <ImagePlus size={34} />
                        <b>{historyReportEvidenceItems.length ? `${historyReportEvidenceItems.length} evidencias anexadas.` : "Sin evidencias cargadas."}</b>
                        <span>{historyReportEvidenceItems.length ? "Ver anexo fotográfico en las páginas siguientes." : "No se adjuntaron fotografías para esta inspección."}</span>
                      </div>
                    </section>

                    <section>
                      <h3>3. Observaciones generales</h3>
                      <div className="report-side-note">
                        <ClipboardCheck size={26} />
                        <b>{historyReportHallazgos ? `${historyReportHallazgos} observaciones registradas.` : "No se registraron observaciones adicionales."}</b>
                      </div>
                    </section>

                    <section>
                      <h3>4. Plan de acción sugerido</h3>
                      <div className="report-side-note report-side-note-ok">
                        <CheckCircle2 size={31} />
                        <p>Se recomienda generar un plan de acción enfocado en los puntos no conformes, con el fin de alcanzar la meta requerida (= {historyReportMeta}%).</p>
                      </div>
                    </section>
                  </aside>
                </div>

                <div className="report-footer report-reference-footer">
                  <span><LogoImage tone="light" /> Sistema 5S</span>
                  <span>Informe generado desde Inspecciones</span>
                  <span>Página 2 de {historyReportPageCount}</span>
                </div>
              </article>

              {historyReportEvidencePages.map((page, pageIndex) => (
                <article className="report-sheet report-sheet-evidence" key={`history-evidence-page-${pageIndex}`}>
                  <div className="report-detail-head">
                    <span>ANEXO FOTOGRÁFICO 5S · <b>{historyReport.bodega || "Inspección 5S"}</b></span>
                  </div>

                  <section className="report-evidence-annex">
                    <h3>{pageIndex === 0 ? "5. Evidencias fotográficas completas" : "5. Evidencias fotográficas completas (continuación)"}</h3>
                    <p>{historyReportEvidenceItems.length} evidencias anexadas a la inspección.</p>

                    <div className="report-evidence-annex-grid">
                      {page.map((ev) => (
                        <figure key={ev.id}>
                          <img src={ev.src} alt={ev.name} />
                          <figcaption>
                            <b>Punto {ev.punto}</b>
                            <span>{ev.pregunta}</span>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </section>

                  <div className="report-footer report-reference-footer">
                    <span><LogoImage tone="light" /> Sistema 5S</span>
                    <span>Informe generado desde Inspecciones</span>
                    <span>Página {pageIndex + 3} de {historyReportPageCount}</span>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

function AuditoriasView({ setTab }) {
  const [dashboard, setDashboard] = useState(null);
  const [cronograma, setCronograma] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    periodo: "mes",
    desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    hasta: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    bodega: "Todas",
  });

  function loadAuditorias() {
    setLoading(true);
    setError("");
    Promise.all([
      getDashboard5S(),
      getCronograma5S(),
    ])
      .then(([data, cronogramaRows]) => {
        setDashboard(data);
        setCronograma((cronogramaRows || []).map(normalizeCronograma5S));
      })
      .catch((loadError) => {
        console.error("No se pudieron cargar las auditorías 5S:", loadError);
        setError(loadError.message || "No se pudieron cargar las auditorías desde el sistema.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAuditorias();
    window.addEventListener("calidad5s:checklist-updated", loadAuditorias);
    window.addEventListener("calidad5s:refresh-alerts", loadAuditorias);
    return () => {
      window.removeEventListener("calidad5s:checklist-updated", loadAuditorias);
      window.removeEventListener("calidad5s:refresh-alerts", loadAuditorias);
    };
  }, []);

  const inspecciones = dashboard?.inspecciones || [];
  const planes = dashboard?.planes_accion || [];
  const matrixItems = dashboard?.inspeccion_items || [];
  const checklistItems = dashboard?.checklist_items || [];
  const bodegasFiltro = useMemo(
    () => ["Todas", ...new Set([...inspecciones, ...cronograma].map((item) => item.bodega).filter(Boolean))],
    [inspecciones, cronograma]
  );

  const filteredInspections = useMemo(() => {
    return inspecciones.filter((item) => {
      const fecha = item.fecha || item.created_at?.slice(0, 10) || "";
      const okFecha = !fecha ? false : fecha >= filters.desde && fecha <= filters.hasta;
      const okBodega = filters.bodega === "Todas" || item.bodega === filters.bodega;
      return okFecha && okBodega;
    });
  }, [inspecciones, filters]);

  const filteredCronograma = useMemo(() => {
    return cronograma.filter((item) => {
      const okFecha = item.fechaInicio && item.fechaInicio <= filters.hasta && item.fechaFin >= filters.desde;
      const okBodega = filters.bodega === "Todas" || item.bodega === filters.bodega;
      return okFecha && okBodega;
    });
  }, [cronograma, filters]);

  function findInspectionForProgram(programacion, inspectionRows = filteredInspections) {
    if (programacion.inspeccion_id) {
      const direct = inspectionRows.find((item) => String(item.id) === String(programacion.inspeccion_id));
      if (direct) return direct;
    }

    return inspectionRows.find((item) => {
      const fecha = item.fecha || item.created_at?.slice(0, 10) || "";
      const sameBodega = normalizeText(item.bodega) === normalizeText(programacion.bodega);
      const sameResponsable = !programacion.responsable || normalizeText(item.responsable) === normalizeText(programacion.responsable);
      return sameBodega && sameResponsable && fecha >= programacion.fechaInicio && fecha <= programacion.fechaFin;
    });
  }

  function startInspectionFromAudit(programacion) {
    sessionStorage.setItem("calidad5s:selected-program-id", String(programacion.id));
    window.dispatchEvent(new Event("calidad5s:select-program"));
    setTab("inspeccion");
  }

  const auditCycles = useMemo(() => {
    const map = new Map();

    filteredCronograma.forEach((programacion) => {
      const semana = weekLabel(programacion.fechaInicio || todayISO());
      const key = `programa-${programacion.id}`;
      const inspection = findInspectionForProgram(programacion);
      map.set(key, {
        key,
        codigo: `AUD-5S-${semana}-${normalizeKey(programacion.bodega || "general").replace(/\s+/g, "-").toUpperCase()}`,
        semana,
        bodega: programacion.bodega || "Sin bodega",
        responsable: programacion.responsable || "Sin responsable",
        actividad: programacion.actividad || "Auditoría 5S",
        fechaInicio: programacion.fechaInicio,
        fechaFin: programacion.fechaFin,
        programacion,
        inspecciones: inspection ? [inspection] : [],
        cumplimiento: 0,
        soporte: 0,
        planesAbiertos: 0,
        estado: "Programada",
      });
    });

    filteredInspections.forEach((item) => {
      const linked = [...map.values()].some((audit) => audit.inspecciones.some((row) => String(row.id) === String(item.id)));
      if (linked) return;
      const semana = item.semana || weekLabel(item.fecha || item.created_at?.slice(0, 10) || todayISO());
      const key = `${semana}__${item.bodega || "Sin bodega"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          codigo: `AUD-5S-${semana}-${normalizeKey(item.bodega || "general").replace(/\s+/g, "-").toUpperCase()}`,
          semana,
          bodega: item.bodega || "Sin bodega",
          responsable: item.responsable || "Sin responsable",
          actividad: "Auditoría derivada",
          fechaInicio: item.fecha || item.created_at?.slice(0, 10) || "",
          fechaFin: item.fecha || item.created_at?.slice(0, 10) || "",
          programacion: null,
          inspecciones: [],
          cumplimiento: 0,
          soporte: 0,
          planesAbiertos: 0,
          estado: "Sin datos",
        });
      }
      map.get(key).inspecciones.push(item);
    });

    return [...map.values()].map((audit) => {
      const cumplimiento = audit.inspecciones.length
        ? Math.round((audit.inspecciones.reduce((sum, item) => sum + Number(item.cumplimiento || 0), 0) / audit.inspecciones.length) * 10) / 10
        : 0;
      const inspectionIds = new Set(audit.inspecciones.map((item) => String(item.id)));
      const soporte = matrixItems.filter((item) => inspectionIds.has(String(item.inspeccion_id))).length;
      const planesAbiertos = planes.filter((plan) => {
        const cerrado = ["Cerrado", "Cerrada", "Finalizado", "Finalizada"].includes(String(plan.estado || ""));
        return !cerrado && (!plan.bodega || plan.bodega === audit.bodega);
      }).length;
      const programada = Boolean(audit.programacion);
      const ejecutada = Boolean(audit.inspecciones.length);
      return {
        ...audit,
        cumplimiento,
        soporte,
        planesAbiertos,
        estado: !ejecutada ? "Pendiente de inspección" : planesAbiertos ? "Con hallazgos" : scoreLevel(cumplimiento),
        origen: programada ? "Gantt" : "Inspección libre",
      };
    }).sort((a, b) => String(b.semana).localeCompare(String(a.semana)) || a.bodega.localeCompare(b.bodega));
  }, [filteredCronograma, filteredInspections, matrixItems, planes]);

  const promedioAuditorias = auditCycles.length
    ? Math.round((auditCycles.reduce((sum, item) => sum + item.cumplimiento, 0) / auditCycles.length) * 10) / 10
    : 0;
  const soporteTotal = auditCycles.reduce((sum, item) => sum + item.soporte, 0);
  const abiertas = auditCycles.filter((item) => item.planesAbiertos > 0).length;
  const cerradas = auditCycles.filter((item) => item.planesAbiertos === 0 && item.inspecciones.length).length;
  const pendientes = auditCycles.filter((item) => !item.inspecciones.length).length;
  const coberturaMatriz = checklistItems.length;

  return (
    <div className="portal-shell auditorias-shell">
      <section className="portal-hero auditorias-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Auditorías apalancadas por inspecciones</h2>
          <p>
            Convierte las inspecciones guardadas en ciclos de auditoría por semana y bodega, con soporte de matriz, hallazgos y cierre.
          </p>

          <div className="portal-hero-actions">
            <button type="button" className="portal-secondary-btn" onClick={loadAuditorias} disabled={loading}>
              <RefreshCw size={17} />
              {loading ? "Actualizando..." : "Actualizar auditorías"}
            </button>
          </div>
        </div>

        <div className="portal-hero-side">
          <div className="portal-status-card auditorias-status-card">
            <div className="portal-status-top">
              <div className="portal-status-icon"><ShieldCheck size={18} /></div>
              <span className={`portal-status-pill ${reportStatus(promedioAuditorias)}`}>{scoreLevel(promedioAuditorias)}</span>
            </div>
            <div className="portal-status-body">
              <strong>{promedioAuditorias}%</strong>
            <p>Promedio de auditorías programadas en Gantt y soportadas por inspecciones.</p>
            </div>
            <div className="portal-status-grid">
              <div><small>Auditorías</small><b>{auditCycles.length}</b></div>
              <div><small>Programadas</small><b>{filteredCronograma.length}</b></div>
              <div><small>Matriz</small><b>{coberturaMatriz}</b></div>
              <div><small>Abiertas</small><b>{abiertas}</b></div>
            </div>
          </div>
        </div>
      </section>

      {error && <article className="portal-panel dashboard-error">{error}</article>}

      <section className="portal-panel auditorias-filters">
        <div className="dashboard-filter-head">
          <div>
            <span className="portal-panel-kicker">CONTROL DE AUDITORÍA</span>
            <h3>Alcance y periodo</h3>
            <p>La auditoría nace del Gantt, toma la matriz/checklist y se cierra con las inspecciones ejecutadas.</p>
          </div>
        </div>
        <div className="dashboard-filter-grid auditorias-filter-grid">
          <label>Desde<input type="date" value={filters.desde} onChange={(event) => setFilters({ ...filters, desde: event.target.value })} /></label>
          <label>Hasta<input type="date" value={filters.hasta} onChange={(event) => setFilters({ ...filters, hasta: event.target.value })} /></label>
          <label>
            Bodega
            <select value={filters.bodega} onChange={(event) => setFilters({ ...filters, bodega: event.target.value })}>
              {bodegasFiltro.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="dashboard-filter-clear"
            onClick={() => setFilters({
              periodo: "mes",
              desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
              hasta: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
              bodega: "Todas",
            })}
          >
            Limpiar
          </button>
        </div>
      </section>

      <section className="auditoria-board-grid">
        <article className="portal-panel auditoria-board-card">
          <span className="portal-panel-kicker">CICLO DE AUDITORÍA</span>
          <h3>Relación real del flujo</h3>
          <div className="audit-flow">
            <div><CalendarDays size={18} /><strong>Gantt</strong><small>{filteredCronograma.length} programadas</small></div>
            <div><Layers3 size={18} /><strong>Matriz</strong><small>{coberturaMatriz} puntos disponibles</small></div>
            <div><ClipboardCheck size={18} /><strong>Inspecciones</strong><small>{filteredInspections.length} ejecutadas</small></div>
            <div><ShieldCheck size={18} /><strong>Auditoría</strong><small>{cerradas} cerradas</small></div>
          </div>
        </article>

        <article className="portal-panel auditoria-board-card">
          <span className="portal-panel-kicker">LECTURA EJECUTIVA</span>
          <h3>Estado del sistema</h3>
          <div className="audit-score-grid">
            <div><strong>{auditCycles.length}</strong><small>Ciclos generados</small></div>
            <div><strong>{abiertas}</strong><small>Con hallazgos abiertos</small></div>
            <div><strong>{pendientes}</strong><small>Pendientes de inspección</small></div>
          </div>
        </article>
      </section>

      <section className="portal-panel auditorias-table-panel">
        <div className="portal-panel-head">
          <div>
            <span className="portal-panel-kicker">AUDITORÍAS OPERATIVAS</span>
            <h3>Ciclos generados desde inspecciones</h3>
            <p>Programación, matriz e inspección quedan en una misma línea para entender qué soporta cada auditoría.</p>
          </div>
        </div>

        <div className="dashboard-inspection-table">
          <table className="print-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Origen</th>
                <th>Semana</th>
                <th>Bodega</th>
                <th>Programación</th>
                <th>Inspecciones</th>
                <th>Matriz soporte</th>
                <th>Cumplimiento</th>
                <th>Hallazgos</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {auditCycles.map((audit) => (
                <tr key={audit.key}>
                  <td><b>{audit.codigo}</b></td>
                  <td>{audit.origen}</td>
                  <td>{audit.semana}</td>
                  <td>{audit.bodega}</td>
                  <td>{audit.fechaInicio ? `${formatShortDate(audit.fechaInicio)} - ${formatShortDate(audit.fechaFin || audit.fechaInicio)}` : "Sin Gantt"}</td>
                  <td>{audit.inspecciones.length}</td>
                  <td>{audit.soporte}</td>
                  <td><b>{audit.inspecciones.length ? `${audit.cumplimiento}%` : "Pendiente"}</b></td>
                  <td>{audit.planesAbiertos}</td>
                  <td><span className={`portal-status-pill ${!audit.inspecciones.length ? "status-warning" : audit.planesAbiertos ? "status-warning" : reportStatus(audit.cumplimiento)}`}>{audit.estado}</span></td>
                  <td>
                    {audit.programacion && !audit.inspecciones.length ? (
                      <button type="button" className="dashboard-eye-btn" onClick={() => startInspectionFromAudit(audit.programacion)} title="Ejecutar inspección desde esta auditoría">
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <span className="dashboard-muted">Relacionado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!auditCycles.length && <div className="dashboard-empty">No hay inspecciones en el periodo para generar auditorías.</div>}
        </div>
      </section>
    </div>
  );
}

function DashboardView() {
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedInspectionItems, setSelectedInspectionItems] = useState([]);
  const [selectedInspectionLoading, setSelectedInspectionLoading] = useState(false);
  const [planToClose, setPlanToClose] = useState(null);
  const planEvidenceInputRef = useRef(null);
  const [filters, setFilters] = useState({
    periodo: "semana",
    desde: startOfWeekISO(),
    hasta: endOfWeekISO(),
    bodega: "Todas",
    responsable: "Todos",
  });

  function loadDashboard() {
    setDashboardLoading(true);
    setDashboardError("");

    getDashboard5S()
      .then((data) => setDashboard(data))
      .catch((error) => {
        console.error("No se pudo cargar el dashboard 5S:", error);
        setDashboardError(error.message || "No se pudo cargar el dashboard desde la sistema.");
      })
      .finally(() => setDashboardLoading(false));
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    window.addEventListener("calidad5s:checklist-updated", loadDashboard);
    window.addEventListener("calidad5s:refresh-alerts", loadDashboard);
    return () => {
      window.removeEventListener("calidad5s:checklist-updated", loadDashboard);
      window.removeEventListener("calidad5s:refresh-alerts", loadDashboard);
    };
  }, []);

  useEffect(() => {
    if (!selectedInspection) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      document.querySelector(".dashboard-report-card")?.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("dashboard-inspection-report")?.scrollIntoView({ block: "start" });
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedInspection]);

  async function openDashboardReport(item) {
    setSelectedInspection(item);
    setSelectedInspectionItems([]);
    setSelectedInspectionLoading(true);

    try {
      const rows = await getInspeccionItems5S(item.id);
      setSelectedInspectionItems(rows || []);
    } catch (error) {
      console.error("No se pudo cargar el detalle de la inspección:", error);
      setSelectedInspectionItems([]);
    } finally {
      setSelectedInspectionLoading(false);
    }
  }

  async function printDashboardReport() {
    const report = document.getElementById("dashboard-inspection-report");
    if (!report || !selectedInspection) return;

    openPrintable5SDocument({
      title: `Informe 5S - ${selectedInspection.bodega}`,
      reportElement: report,
    });
  }

  const inspecciones = dashboard?.inspecciones || [];
  const planesAccion = dashboard?.planes_accion || [];
  const inspectionItemDetails = dashboard?.inspeccion_items || [];
  const checklistMasterItems = dashboard?.checklist_items || [];
  const bodegasFiltro = useMemo(
    () => ["Todas", ...new Set(inspecciones.map((item) => item.bodega).filter(Boolean))],
    [inspecciones]
  );
  const responsablesFiltro = useMemo(
    () => ["Todos", ...new Set(inspecciones.map((item) => item.responsable).filter(Boolean))],
    [inspecciones]
  );
  const filteredInspections = useMemo(() => {
    return inspecciones.filter((item) => {
      const fechaInspeccion = item.fecha || item.created_at?.slice(0, 10) || "";
      const okFecha = filters.periodo === "todo"
        || (!fechaInspeccion ? false : fechaInspeccion >= filters.desde && fechaInspeccion <= filters.hasta);
      const okBodega = filters.bodega === "Todas" || item.bodega === filters.bodega;
      const okResponsable = filters.responsable === "Todos" || item.responsable === filters.responsable;
      return okFecha && okBodega && okResponsable;
    });
  }, [inspecciones, filters]);

  const filteredPlanes = useMemo(() => {
    return planesAccion.filter((item) => {
      const fechaPlan = item.fecha_compromiso || item.fecha_creacion?.slice(0, 10) || "";
      const okFecha = filters.periodo === "todo"
        || (!fechaPlan ? false : fechaPlan >= filters.desde && fechaPlan <= filters.hasta);
      const okBodega = filters.bodega === "Todas" || item.bodega === filters.bodega;
      const okResponsable = filters.responsable === "Todos" || item.responsable === filters.responsable;
      return okFecha && okBodega && okResponsable;
    });
  }, [planesAccion, filters]);

  const promedio = filteredInspections.length
    ? Math.round((filteredInspections.reduce((sum, item) => sum + Number(item.cumplimiento || 0), 0) / filteredInspections.length) * 10) / 10
    : 0;
  const metaGeneral = Number(dashboard?.meta_general || 0);
  const estadoGeneral = scoreLevel(promedio);
  const bajoMeta = filteredInspections.filter((item) => Number(item.cumplimiento || 0) < Number(item.meta_bodega || metaGeneral || 90)).length;
  const criticas = filteredInspections.filter((item) => Number(item.cumplimiento || 0) < 80).length;
  const mejores = [...filteredInspections].sort((a, b) => Number(b.cumplimiento || 0) - Number(a.cumplimiento || 0)).slice(0, 3);
  const planesAbiertos = filteredPlanes.filter((item) => !["Cerrado", "Cerrada", "Finalizado", "Finalizada"].includes(String(item.estado || ""))).length;
  const planesVencidos = filteredPlanes.filter((item) => item.fecha_compromiso && item.fecha_compromiso < todayISO() && !["Cerrado", "Cerrada", "Finalizado", "Finalizada"].includes(String(item.estado || ""))).length;
  const planesCerrados = filteredPlanes.length - planesAbiertos;
  const cierreScore = filteredPlanes.length ? Math.round((planesCerrados / filteredPlanes.length) * 100) : 100;
  const filteredInspectionIds = useMemo(
    () => new Set(filteredInspections.map((item) => String(item.id))),
    [filteredInspections]
  );
  const filteredMatrixItems = useMemo(
    () => inspectionItemDetails.filter((item) => filteredInspectionIds.has(String(item.inspeccion_id))),
    [inspectionItemDetails, filteredInspectionIds]
  );
  const matrizPorPilar = useMemo(() => {
    const map = new Map();
    filteredMatrixItems.forEach((item) => {
      const key = item.pilar || "Sin pilar";
      if (!map.has(key)) map.set(key, { pilar: key, total: 0, conformes: 0, hallazgos: 0, peso: 0, pesoConforme: 0 });
      const current = map.get(key);
      const peso = Number(item.peso || 1);
      current.total += 1;
      current.peso += peso;
      if (item.cumple) {
        current.conformes += 1;
        current.pesoConforme += peso;
      } else {
        current.hallazgos += 1;
      }
    });
    return [...map.values()].map((item) => ({
      ...item,
      cumplimiento: item.peso ? Math.round((item.pesoConforme / item.peso) * 1000) / 10 : 0,
    })).sort((a, b) => a.cumplimiento - b.cumplimiento);
  }, [filteredMatrixItems]);
  const matrizMaestra = useMemo(() => {
    const map = new Map();
    checklistMasterItems.forEach((item) => {
      const key = item.pilar || "Sin pilar";
      if (!map.has(key)) map.set(key, { pilar: key, preguntas: 0, peso: 0, evidencia: 0, bodegas: new Set() });
      const current = map.get(key);
      current.preguntas += 1;
      current.peso += Number(item.peso || 1);
      if (item.requiere_evidencia) current.evidencia += 1;
      if (item.bodega) current.bodegas.add(item.bodega);
    });
    return [...map.values()].map((item) => ({
      ...item,
      bodegas: [...item.bodegas],
    })).sort((a, b) => b.preguntas - a.preguntas);
  }, [checklistMasterItems]);
  const hallazgosRecurrentes = useMemo(() => {
    const map = new Map();
    filteredPlanes.forEach((plan) => {
      const key = normalizeKey(plan.punto || plan.hallazgo || "Hallazgo 5S");
      if (!map.has(key)) {
        map.set(key, {
          key,
          punto: plan.punto || plan.hallazgo || "Hallazgo 5S",
          cantidad: 0,
          bodegas: new Set(),
          responsables: new Set(),
          severidad: plan.severidad || "Media",
        });
      }
      const current = map.get(key);
      current.cantidad += 1;
      if (plan.bodega) current.bodegas.add(plan.bodega);
      if (plan.responsable) current.responsables.add(plan.responsable);
      if (/alta|crit/i.test(String(plan.severidad || ""))) current.severidad = plan.severidad;
    });
    return [...map.values()]
      .map((item) => ({ ...item, bodegas: [...item.bodegas], responsables: [...item.responsables] }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [filteredPlanes]);
  const insumosSugeridos = useMemo(() => inferSupplyNeeds5S(filteredPlanes), [filteredPlanes]);
  const riesgoOperativo = clampScore((100 - promedio) * 0.45 + criticas * 14 + planesVencidos * 18 + planesAbiertos * 4);
  const madurez5S = maturityLabel5S(promedio, planesAbiertos, planesVencidos);
  const readinessScore = clampScore(promedio * 0.55 + cierreScore * 0.25 + Math.max(0, 100 - riesgoOperativo) * 0.2);
  const pilarCritico = matrizPorPilar[0]?.pilar || "Sin datos";
  const matrizCobertura = checklistMasterItems.length
    ? Math.round((new Set(checklistMasterItems.map((item) => item.bodega).filter(Boolean)).size || 1) * 10) / 10
    : 0;

  const porBodega = useMemo(() => {
    const map = new Map();
    filteredInspections.forEach((item) => {
      const key = item.bodega || "Sin bodega";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].map(([bodega, rows]) => {
      const score = rows.length ? rows.reduce((sum, item) => sum + Number(item.cumplimiento || 0), 0) / rows.length : 0;
      return {
        bodega,
        auditorias: rows.length,
        cumplimiento: Math.round(score * 10) / 10,
        meta: Number(rows[0]?.meta_bodega || metaGeneral || 90),
        estado: scoreLevel(score),
      };
    }).sort((a, b) => b.cumplimiento - a.cumplimiento);
  }, [filteredInspections, metaGeneral]);

  const porResponsable = useMemo(() => {
    const map = new Map();
    filteredInspections.forEach((item) => {
      const key = item.responsable || "Sin responsable";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].map(([responsable, rows]) => {
      const score = rows.length ? rows.reduce((sum, item) => sum + Number(item.cumplimiento || 0), 0) / rows.length : 0;
      return {
        responsable,
        auditorias: rows.length,
        cumplimiento: Math.round(score * 10) / 10,
        estado: scoreLevel(score),
      };
    }).sort((a, b) => b.cumplimiento - a.cumplimiento);
  }, [filteredInspections]);

  const tendencia = useMemo(() => {
    const map = new Map();
    filteredInspections.forEach((item) => {
      const key = item.fecha || item.created_at?.slice(0, 10) || "Sin fecha";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([fechaKey, rows]) => ({
      fecha: formatShortDate(fechaKey),
      cumplimiento: Math.round((rows.reduce((sum, item) => sum + Number(item.cumplimiento || 0), 0) / rows.length) * 10) / 10,
      auditorias: rows.length,
    }));
  }, [filteredInspections]);

  const estadoData = [
    { name: "Óptimo", value: filteredInspections.filter((item) => Number(item.cumplimiento || 0) >= 90).length, color: "#16a34a" },
    { name: "Atención", value: filteredInspections.filter((item) => Number(item.cumplimiento || 0) >= 80 && Number(item.cumplimiento || 0) < 90).length, color: "#f59e0b" },
    { name: "Crítico", value: filteredInspections.filter((item) => Number(item.cumplimiento || 0) < 80).length, color: "#dc2626" },
  ];

  function updatePeriod(periodo) {
    if (periodo === "semana") {
      setFilters((prev) => ({ ...prev, periodo, desde: startOfWeekISO(), hasta: endOfWeekISO() }));
      return;
    }
    if (periodo === "mes") {
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setFilters((prev) => ({ ...prev, periodo, desde, hasta }));
      return;
    }
    setFilters((prev) => ({ ...prev, periodo }));
  }

  function requestClosePlanAccion(plan) {
    setPlanToClose(plan);
    planEvidenceInputRef.current?.click();
  }

  async function closePlanAccion(plan, file = null) {
    const comentario = await show5SPrompt("Comentario de cierre del plan de acción:", "Cerrado desde dashboard 5S.");
    if (comentario === null) return;

    try {
      let evidencia = null;
      if (file) {
        evidencia = await subirArchivo5S({
          file,
          folder: `planes-cierre/${plan.id}`,
          bucket: "evidencias-5s",
        });
      }

      await editarPlanAccion5S(plan.id, {
        estado: "Cerrado",
        fecha_cierre: todayISO(),
        evidencia_cierre_url: evidencia?.url || plan.evidencia_cierre_url || null,
        comentario_cierre: comentario,
      });
      await loadDashboard();
      window.dispatchEvent(new Event("calidad5s:refresh-alerts"));
    } catch (error) {
      show5SAlert(error.message || "No se pudo cerrar el plan de acción.");
    }
  }

  async function handlePlanEvidenceChange(event) {
    const file = event.target.files?.[0] || null;
    const plan = planToClose;
    event.target.value = "";
    setPlanToClose(null);
    if (!plan) return;
    await closePlanAccion(plan, file);
  }

  return (
    <div className="portal-shell dashboard-shell">
      <section className="portal-hero dashboard-hero">
        <div className="portal-hero-copy">
          <span className="section-kicker">MÓDULO 5S</span>
          <h2>Dashboard ejecutivo</h2>
          <p>
            Consulta 5S por fechas, semanas, bodegas, responsables, ranking, tendencias e informes generados.
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
                <b>{filteredInspections.length}</b>
              </div>
              <div>
                <small>Bodegas activas</small>
                <b>{dashboard?.bodegas_activas ?? 0}</b>
              </div>
              <div>
                <small>Bajo meta</small>
                <b>{bajoMeta}</b>
              </div>
              <div>
                <small>Meta bodega</small>
                <b>{dashboard?.meta_bodega ?? 0}%</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {dashboardError && <article className="portal-panel dashboard-error">{dashboardError}</article>}

      <section className="portal-panel dashboard-filters">
        <div className="dashboard-filter-head">
          <div>
            <span className="portal-panel-kicker">CONSULTOR 5S</span>
            <h3>Filtros de consulta</h3>
            <p>{filteredInspections.length} inspecciones dentro del filtro actual.</p>
          </div>
        </div>

        <div className="dashboard-filter-grid">
          <label>
            Periodo
            <select value={filters.periodo} onChange={(event) => updatePeriod(event.target.value)}>
              <option value="semana">Semana actual</option>
              <option value="mes">Mes actual</option>
              <option value="rango">Rango de fechas</option>
              <option value="todo">Todo el histórico</option>
            </select>
          </label>
          <label>
            Desde
            <input type="date" value={filters.desde} disabled={filters.periodo === "todo"} onChange={(event) => setFilters({ ...filters, desde: event.target.value, periodo: "rango" })} />
          </label>
          <label>
            Hasta
            <input type="date" value={filters.hasta} disabled={filters.periodo === "todo"} onChange={(event) => setFilters({ ...filters, hasta: event.target.value, periodo: "rango" })} />
          </label>
          <label>
            Bodega
            <select value={filters.bodega} onChange={(event) => setFilters({ ...filters, bodega: event.target.value })}>
              {bodegasFiltro.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Responsable
            <select value={filters.responsable} onChange={(event) => setFilters({ ...filters, responsable: event.target.value })}>
              {responsablesFiltro.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="dashboard-filter-clear"
            onClick={() => setFilters({
              periodo: "todo",
              desde: startOfWeekISO(),
              hasta: endOfWeekISO(),
              bodega: "Todas",
              responsable: "Todos",
            })}
          >
            Limpiar
          </button>
        </div>
      </section>

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
          <strong>{dashboard?.total_inspecciones ?? 0}</strong>
          <small>{filteredInspections.length} dentro del filtro actual</small>
        </article>

        <article className="portal-panel dashboard-metric-card">
          <span className="portal-panel-kicker">BAJO META</span>
          <strong>{bajoMeta}</strong>
          <small>{criticas} inspecciones críticas</small>
        </article>

        <article className="portal-panel dashboard-metric-card">
          <span className="portal-panel-kicker">PLANES ABIERTOS</span>
          <strong>{planesAbiertos}</strong>
          <small>{planesVencidos} vencidos por cerrar</small>
        </article>
      </section>

      <section className="portal-panel control-tower-5s">
        <div className="portal-panel-head">
          <div>
            <span className="portal-panel-kicker">CENTRO DE CONTROL 5S</span>
            <h3>Auditoría, matriz, insumos y riesgo operativo</h3>
            <p>Lectura ejecutiva construida con inspecciones, matriz/checklist, planes de acción e histórico actual.</p>
          </div>
          <span className={`portal-status-pill ${reportStatus(readinessScore)}`}>Preparación {readinessScore}%</span>
        </div>

        <div className="control-tower-grid">
          <article className="control-tower-card primary">
            <div className="control-tower-icon"><Sparkles size={20} /></div>
            <span>Madurez 5S</span>
            <strong>{madurez5S}</strong>
            <p>{promedio}% de cumplimiento, {cierreScore}% de cierre y {planesVencidos} vencidos.</p>
          </article>

          <article className="control-tower-card">
            <div className="control-tower-icon"><ShieldCheck size={20} /></div>
            <span>Riesgo operativo</span>
            <strong>{riesgoOperativo}%</strong>
            <p>{criticas} críticas, {planesAbiertos} planes abiertos y {bajoMeta} bajo meta.</p>
          </article>

          <article className="control-tower-card">
            <div className="control-tower-icon"><Layers3 size={20} /></div>
            <span>Matriz viva</span>
            <strong>{checklistMasterItems.length}</strong>
            <p>{matrizMaestra.length} pilares activos en {matrizCobertura} alcance(s).</p>
          </article>

          <article className="control-tower-card">
            <div className="control-tower-icon"><Target size={20} /></div>
            <span>Pilar crítico</span>
            <strong>{pilarCritico}</strong>
            <p>{matrizPorPilar[0] ? `${matrizPorPilar[0].cumplimiento}% de cumplimiento ponderado.` : "Aún sin matriz evaluada."}</p>
          </article>
        </div>

        <div className="control-tower-detail-grid">
          <article className="control-detail-panel">
            <div className="control-detail-head">
              <ClipboardList size={18} />
              <div>
                <strong>Matriz por pilar</strong>
                <span>Detecta dónde se rompe el estándar.</span>
              </div>
            </div>
            <div className="matrix-health-list">
              {matrizPorPilar.slice(0, 6).map((item) => (
                <div key={item.pilar} className="matrix-health-row">
                  <div>
                    <b>{item.pilar}</b>
                    <small>{item.total} puntos evaluados · {item.hallazgos} hallazgos</small>
                  </div>
                  <span className={`portal-status-pill ${reportStatus(item.cumplimiento)}`}>{item.cumplimiento}%</span>
                </div>
              ))}
              {!matrizPorPilar.length && <div className="dashboard-empty compact">Las próximas inspecciones alimentarán esta matriz.</div>}
            </div>
          </article>

          <article className="control-detail-panel">
            <div className="control-detail-head">
              <Boxes size={18} />
              <div>
                <strong>Insumos sugeridos</strong>
                <span>Necesidades inferidas por hallazgos, sin mover inventario.</span>
              </div>
            </div>
            <div className="supply-list-5s">
              {insumosSugeridos.map((item) => (
                <div key={item.insumo} className="supply-row-5s">
                  <div>
                    <b>{item.insumo}</b>
                    <small>{item.actividad} · {item.bodegas.length || 1} zona(s)</small>
                  </div>
                  <span className={`portal-status-pill ${item.prioridad === "Alta" ? "status-critical" : "status-warning"}`}>{item.cantidad}</span>
                </div>
              ))}
              {!insumosSugeridos.length && <div className="dashboard-empty compact">Sin faltantes inferidos en el filtro actual.</div>}
            </div>
          </article>

          <article className="control-detail-panel">
            <div className="control-detail-head">
              <Wrench size={18} />
              <div>
                <strong>Hallazgos recurrentes</strong>
                <span>Patrones que deben convertirse en acciones de auditoría.</span>
              </div>
            </div>
            <div className="recurrence-list-5s">
              {hallazgosRecurrentes.map((item) => (
                <div key={item.key} className="recurrence-row-5s">
                  <b>{item.punto}</b>
                  <small>{item.cantidad} vez/veces · {item.bodegas.join(", ") || "Sin bodega"}</small>
                </div>
              ))}
              {!hallazgosRecurrentes.length && <div className="dashboard-empty compact">No hay reincidencias dentro del filtro.</div>}
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-chart-grid">
        <article className="portal-panel dashboard-chart-card">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">TENDENCIA</span>
            <h3>Cumplimiento por fecha</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe7f4" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="cumplimiento" stroke="#0f6fbd" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="portal-panel dashboard-chart-card">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">BODEGAS</span>
            <h3>Ranking por cumplimiento</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porBodega.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe7f4" />
              <XAxis dataKey="bodega" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cumplimiento" fill="#1d8fe3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="portal-panel dashboard-chart-card">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">ESTADO</span>
            <h3>Distribución</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={estadoData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88}>
                {estadoData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
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
              <div className="dashboard-empty">Cargando datos desde el sistema...</div>
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
              <div className="dashboard-empty">Sin bodegas o auditorías registradas en sistema.</div>
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
              <div className="dashboard-empty">Cargando responsables desde el sistema...</div>
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

      <section className="portal-panel dashboard-inspections-panel">
        <div className="portal-panel-head">
          <span className="portal-panel-kicker">PLANES DE ACCIÓN</span>
          <h3>Hallazgos abiertos y vencidos</h3>
          <p>Todo punto no conforme genera un plan automático para gestionar el cierre.</p>
        </div>

        <input
          ref={planEvidenceInputRef}
          type="file"
          accept="image/*,.pdf"
          hidden
          onChange={handlePlanEvidenceChange}
        />

        <div className="dashboard-inspection-table">
          <table className="print-table">
            <thead>
              <tr>
                <th>Compromiso</th>
                <th>Bodega</th>
                <th>Responsable</th>
                <th>Hallazgo</th>
                <th>Estado</th>
                <th>Cierre</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanes.slice(0, 12).map((item) => {
                const cerrado = ["Cerrado", "Cerrada", "Finalizado", "Finalizada"].includes(String(item.estado || ""));
                const vencido = item.fecha_compromiso && item.fecha_compromiso < todayISO() && !cerrado;
                return (
                  <tr key={item.id}>
                    <td>{item.fecha_compromiso ? formatLongDate(item.fecha_compromiso) : "Sin fecha"}</td>
                    <td>{item.bodega}</td>
                    <td>{item.responsable}</td>
                    <td>{item.hallazgo}</td>
                    <td><span className={`portal-status-pill ${cerrado ? "status-ok" : vencido ? "status-critical" : "status-warning"}`}>{vencido ? "Vencido" : item.estado}</span></td>
                    <td>
                      {!cerrado ? (
                        <button type="button" className="dashboard-eye-btn" onClick={() => requestClosePlanAccion(item)} title="Cerrar plan con evidencia">
                          <CheckCircle2 size={17} />
                        </button>
                      ) : (
                        <span className="dashboard-muted">Cerrado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredPlanes.length && <div className="dashboard-empty">Sin planes de acción dentro del filtro actual.</div>}
        </div>
      </section>

      <section className="portal-panel dashboard-inspections-panel">
        <div className="portal-panel-head">
          <span className="portal-panel-kicker">INSPECCIONES</span>
          <h3>Histórico filtrado</h3>
          <p>Selecciona el ojo para consultar el informe/resumen de una inspección guardada.</p>
        </div>

        <div className="dashboard-inspection-table">
          <table className="print-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Bodega</th>
                <th>Responsable</th>
                <th>Cumplimiento</th>
                <th>Estado</th>
                <th>Informe</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((item) => {
                const score = Number(item.cumplimiento || 0);
                return (
                  <tr key={item.id}>
                    <td>{formatLongDate(item.fecha || item.created_at?.slice(0, 10))}</td>
                    <td>{item.bodega}</td>
                    <td>{item.responsable}</td>
                    <td><b>{score}%</b></td>
                    <td><span className={`portal-status-pill ${reportStatus(score)}`}>{scoreLevel(score)}</span></td>
                    <td>
                      <button type="button" className="dashboard-eye-btn" onClick={() => openDashboardReport(item)} title="Ver informe">
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredInspections.length && <div className="dashboard-empty">Sin inspecciones para el filtro seleccionado.</div>}
        </div>
      </section>

      {selectedInspection && (
        <div className="dashboard-report-modal" role="dialog" aria-modal="true">
          <article className="portal-panel dashboard-report-card">
            <div className="portal-panel-head">
              <div>
                <span className="portal-panel-kicker">INFORME GENERADO</span>
                <h3>{selectedInspection.bodega}</h3>
                <p>{formatLongDate(selectedInspection.fecha || selectedInspection.created_at?.slice(0, 10))} · {selectedInspection.responsable}</p>
              </div>
              <button type="button" className="top-icon-btn" onClick={() => setSelectedInspection(null)} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="dashboard-report-actions">
              <button type="button" className="portal-primary-btn" onClick={printDashboardReport}>
                <Printer size={17} />
                Imprimir / guardar PDF
              </button>
            </div>

            <div id="dashboard-inspection-report" className="dashboard-print-report">
              <div className="report-reference-cover dashboard-print-cover">
                <div className="report-reference-brand">
                  <LogoImage tone="light" />
                  <span>Calidad 5S</span>
                </div>

                <div className="report-reference-title">
                  <span>INFORME DE INSPECCIÓN 5S</span>
                  <h2>{selectedInspection.bodega}</h2>
                  <p>Informe histórico generado desde el dashboard ejecutivo 5S.</p>
                </div>

                <div className={`report-reference-score ${reportStatus(Number(selectedInspection.cumplimiento || 0))}`}>
                  <small>Cumplimiento</small>
                  <strong>{Number(selectedInspection.cumplimiento || 0)}%</strong>
                  <b>{scoreLevel(selectedInspection.cumplimiento)}</b>
                </div>
              </div>

              <div className="report-reference-meta dashboard-print-meta">
                <div><CalendarDays size={24} /><span><small>Fecha de inspección</small><strong>{formatLongDate(selectedInspection.fecha || selectedInspection.created_at?.slice(0, 10))}</strong></span></div>
                <div><UserRound size={25} /><span><small>Responsable</small><strong>{selectedInspection.responsable || "Sin responsable"}</strong></span></div>
                <div><Warehouse size={25} /><span><small>Área / Proceso</small><strong>{selectedInspection.area || selectedInspection.bodega}</strong></span></div>
                <div><Target size={26} /><span><small>Meta requerida</small><strong>&gt;= {Number(selectedInspection.meta_bodega || metaGeneral || 90)}%</strong></span></div>
              </div>

              <section className="dashboard-print-section">
                <h3>1. Matriz técnica de verificación</h3>
                {selectedInspectionLoading ? (
                  <div className="dashboard-empty">Cargando matriz de la inspección...</div>
                ) : selectedInspectionItems.length ? (
                  <table className="report-table report-reference-table print-table">
                    <colgroup>
                      <col className="report-col-number" />
                      <col className="report-col-point" />
                      <col className="report-col-state" />
                      <col className="report-col-severity" />
                      <col className="report-col-notes" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Punto evaluado</th>
                        <th>Estado</th>
                        <th>Severidad</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInspectionItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>{index + 1}</td>
                          <td>{item.punto}</td>
                          <td><span className="report-status-chip">{item.cumple ? "Conforme" : "No conforme"}</span></td>
                          <td><span className="report-severity-dot" />{item.severidad || "-"}</td>
                          <td>{item.observacion || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="dashboard-report-note">
                    Esta inspección no tiene matriz histórica guardada. Las nuevas inspecciones guardan los puntos evaluados para poder reimprimir el informe desde el Dashboard.
                  </div>
                )}
              </section>

              <div className="report-footer report-reference-footer dashboard-print-footer">
                <span><LogoImage tone="light" /> Sistema 5S</span>
                <span>Informe generado desde Dashboard</span>
                <span>{selectedInspection.semana || weekLabel(selectedInspection.fecha)}</span>
              </div>
            </div>
          </article>
        </div>
      )}
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
        setConfigError(error.message || "No se pudo cargar la configuración desde la sistema.");
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
          <p>Consulta parámetros, estados y catálogos que consume el portal desde la sistema.</p>

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
                <b>{config5S?.meta_bodega ?? 0}%</b>
              </div>
              <div>
                <small>Meta general</small>
                <b>{config5S?.meta_general ?? 0}%</b>
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
            <p>Valores publicados por el sistema para cronograma, inspeccion y bodegas.</p>
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
            <p>Listado consultado desde la sistema.</p>
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
                    <b>{bodega.meta_bodega ?? config5S?.meta_bodega ?? 0}%</b>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">Sin bodegas registradas en sistema.</div>
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
          meta_bodega: next.meta_bodega ?? "",
          meta_general: next.meta_general ?? "",
        });
        setCatalogForm((prev) => ({
          ...prev,
          tipo: prev.tipo || firstTipo,
        }));
      })
      .catch((loadError) => {
        console.error("No se pudo cargar configuración 5S:", loadError);
        setError(loadError.message || "No se pudo cargar la configuración desde la sistema.");
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
      setError(saveError.message || "No se pudieron guardar las metas en la sistema.");
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
      setError(saveError.message || "No se pudo guardar el catalogo en la sistema.");
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
      setError(toggleError.message || "No se pudo actualizar el catalogo en la sistema.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCatalogo(item) {
    if (!await show5SConfirm(`¿Eliminar ${item.nombre}?`)) return;

    setSaving(true);
    setError("");

    try {
      await eliminarCatalogo5S(item.id);
      await loadConfig();
    } catch (deleteError) {
      console.error("No se pudo eliminar el catalogo 5S:", deleteError);
      setError(deleteError.message || "No se pudo eliminar el catalogo de la sistema.");
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
          <p>Administra metas y catálogos maestros. Cronograma, inspecciones y dashboard consumen estos valores desde el sistema.</p>

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
                <b>{config5S?.meta_bodega ?? 0}%</b>
              </div>
              <div>
                <small>Meta general</small>
                <b>{config5S?.meta_general ?? 0}%</b>
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
          <p>Todo lo que ves aquí está leyendo y escribiendo en sistema.</p>
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
                        <small>Orden {item.orden ?? 0} · {item.activo ? "Activo" : "Inactivo"}</small>
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

function PerfilView({
  usuario,
  rol,
  userPhoto,
  profileForm,
  setProfileForm,
  photoInputRef,
  updateUserPhoto,
  removeUserPhoto,
  saveProfile,
}) {
  return (
    <div className="portal-shell profile-page-shell">
      <section className="profile-page-hero">
        <div className="profile-page-copy">
          <span className="section-kicker">PERFIL DE USUARIO</span>
          <h2>Configuración de perfil</h2>
          <p>Administra tu imagen de perfil y correo corporativo. El usuario y el rol quedan protegidos por seguridad.</p>
        </div>

        <div className="profile-page-summary">
          <button type="button" className="profile-page-photo" onClick={() => photoInputRef.current?.click()}>
            {userPhoto ? <img src={userPhoto} alt={usuario} /> : <UserRound size={46} />}
            <span><Camera size={18} /></span>
          </button>
          <div>
            <strong>{usuario}</strong>
            <small>{rol}</small>
          </div>
        </div>
      </section>

      <section className="profile-page-grid">
        <article className="profile-page-card">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">FOTO</span>
            <h3>Imagen de perfil</h3>
            <p>Esta foto se muestra en la barra superior y en el menú del usuario.</p>
          </div>

          <div className="profile-photo-editor">
            <button type="button" className="profile-photo-preview" onClick={() => photoInputRef.current?.click()}>
              {userPhoto ? <img src={userPhoto} alt={usuario} /> : <UserRound size={54} />}
            </button>
            <div className="profile-photo-actions">
              <button type="button" className="portal-primary-btn" onClick={() => photoInputRef.current?.click()}>
                <Camera size={17} />
                Cambiar foto
              </button>
              <button type="button" className="portal-secondary-btn danger-soft" onClick={removeUserPhoto} disabled={!userPhoto}>
                <X size={17} />
                Quitar foto
              </button>
            </div>
          </div>

          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={updateUserPhoto} />
        </article>

        <article className="profile-page-card">
          <div className="portal-panel-head">
            <span className="portal-panel-kicker">DATOS</span>
            <h3>Información de cuenta</h3>
            <p>Solo el correo es editable. El usuario queda fijo para evitar errores de acceso.</p>
          </div>

          <form className="profile-page-form" onSubmit={saveProfile}>
            <label>
              Nombre
              <input value={profileForm.nombre || usuario} readOnly />
            </label>
            <label>
              Usuario
              <input value={profileForm.usuario || usuario} readOnly />
            </label>
            <label>
              Rol
              <input value={rol} readOnly />
            </label>
            <label>
              Correo
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="correo@empresa.com"
              />
            </label>
            <button type="submit" className="profile-page-save">
              <Save size={17} />
              Guardar correo
            </button>
          </form>
        </article>
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
  const [assetsReady, setAssetsReady] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cronogramaAlerts, setCronogramaAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(() => localStorage.getItem("calidad5s:user-photo") || "");
  const [profileForm, setProfileForm] = useState({ nombre: "", email: "", usuario: "" });
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const photoInputRef = useRef(null);

  const usuario = getCurrentUser();
  const rol = getCurrentRole();
  const currentUserId = getCurrentUserId();
  const canAdmin = isAdminRole(rol);

  async function refreshCronogramaAlerts() {
    setAlertsLoading(true);
    try {
      const [cronogramaRows, inspeccionRows, planesRows] = await Promise.all([
        getCronograma5S(),
        getInspecciones5S(),
        getPlanesAccion5S().catch(() => []),
      ]);
      setCronogramaAlerts([
        ...buildCronogramaAlerts(cronogramaRows || [], inspeccionRows || []),
        ...buildPlanAlerts(planesRows || []),
      ]);
    } catch (error) {
      console.error("No se pudieron cargar las alertas 5S:", error);
      setCronogramaAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }

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
    if (!currentUserId) return;

    getUsuario5S(currentUserId)
      .then((row) => {
        const avatar = row?.avatar_url || row?.foto_url || row?.imagen_url || "";
        setProfileForm({
          nombre: row?.nombre || usuario,
          email: row?.email || "",
          usuario: row?.usuario || "",
        });
        if (avatar) {
          setUserPhoto(avatar);
          localStorage.setItem("calidad5s:user-photo", avatar);
        }
      })
      .catch((error) => {
        console.warn("No se pudo cargar la foto de perfil desde el sistema:", error);
      });
  }, [currentUserId]);

  useEffect(() => {
    setProfileForm((prev) => ({
      nombre: prev.nombre || usuario,
      email: prev.email || "",
      usuario: prev.usuario || "",
    }));
  }, [usuario]);

  useEffect(() => {
    refreshCronogramaAlerts();

    const onRefresh = () => refreshCronogramaAlerts();
    const onFocus = () => refreshCronogramaAlerts();
    const interval = window.setInterval(refreshCronogramaAlerts, 60000);

    window.addEventListener("focus", onFocus);
    window.addEventListener("calidad5s:refresh-alerts", onRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("calidad5s:refresh-alerts", onRefresh);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (notificationsOpen && notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }

      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [notificationsOpen, profileOpen]);

  function updateUserPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setUserPhoto(value);
      localStorage.setItem("calidad5s:user-photo", value);
      if (currentUserId) {
        editarUsuario5S(currentUserId, { avatar_url: value }).catch((error) => {
          console.warn("La foto quedó local; falta aplicar la columna avatar_url en public.usuarios:", error);
        });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeUserPhoto() {
    setUserPhoto("");
    localStorage.removeItem("calidad5s:user-photo");
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }

    if (currentUserId) {
      editarUsuario5S(currentUserId, { avatar_url: null }).catch((error) => {
        console.warn("No se pudo quitar la foto de perfil en sistema:", error);
      });
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!currentUserId) {
      show5SAlert("No se encontró el ID del usuario actual para actualizar el perfil.");
      return;
    }

    try {
      await editarUsuario5S(currentUserId, {
        email: profileForm.email.trim() || null,
      });
      show5SAlert("Correo actualizado correctamente.");
      setProfileOpen(false);
    } catch (error) {
      show5SAlert(error.message || "No se pudo actualizar el correo del perfil.");
    }
  }

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
  const uiScale = 1;

  const closeMobileMenu = () => {
    if (config.isMobile) {
      setMobileSidebarOpen(false);
      setSidebarPinned(false);
    }
  };

  function renderContent() {
    if (tab === "portal") return <PortalView setTab={setTab} canAdmin={canAdmin} />;

    if (tab === "cronograma") {
      return <CronogramaView canAdmin={canAdmin} />;
    }

    if (tab === "inspeccion") {
      return <InspeccionView canAdmin={canAdmin} />;
    }

    if (tab === "responsables") {
      return canAdmin ? <ResponsablesView /> : <DashboardView />;
    }

    if (tab === "auditorias") {
      return <AuditoriasView setTab={setTab} />;
    }

    if (tab === "dashboard") {
      return <DashboardView />;
    }

    if (tab === "perfil") {
      return (
        <PerfilView
          usuario={usuario}
          rol={rol}
          userPhoto={userPhoto}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          photoInputRef={photoInputRef}
          updateUserPhoto={updateUserPhoto}
          removeUserPhoto={removeUserPhoto}
          saveProfile={saveProfile}
        />
      );
    }

    return canAdmin ? <ConfigViewAdmin /> : <DashboardView />;
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
        "--ui-scale": uiScale,
        "--header-height": `${config.headerHeight}px`,
      }}
    >
      <Calidad5SDialogHost />
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
          <div className="notification-wrap" ref={notificationRef}>
            <button
              type="button"
              className={`top-icon-btn notification-btn ${cronogramaAlerts.length ? "has-alerts" : ""}`}
              aria-label="Notificaciones"
              onClick={() => setNotificationsOpen((value) => !value)}
            >
              <Bell size={18} />
              {cronogramaAlerts.length ? <span>{cronogramaAlerts.length}</span> : <i />}
            </button>

            {notificationsOpen && (
              <div className="notification-panel">
                <div className="notification-panel-head">
                  <span>Alertas 5S</span>
                  <strong>{cronogramaAlerts.length}</strong>
                </div>

                {alertsLoading && !cronogramaAlerts.length ? (
                  <div className="notification-empty">Validando cronograma...</div>
                ) : cronogramaAlerts.length ? (
                  <div className="notification-list">
                    {cronogramaAlerts.map((item) => (
                      <button
                        type="button"
                        className="notification-item"
                        key={item.id || `${item.bodega}-${item.fechaInicio}-${item.responsable}`}
                        onClick={() => {
                          if (item.tipo === "plan") {
                            setTab("dashboard");
                          } else {
                            sessionStorage.setItem("calidad5s:selected-program-id", String(item.id));
                            setTab("inspeccion");
                            window.dispatchEvent(new Event("calidad5s:select-program"));
                          }
                          setNotificationsOpen(false);
                        }}
                      >
                        <span className="notification-dot" />
                        <div>
                          <strong>{item.tipo === "plan" ? "Plan de acción vencido" : "Inspección vencida"}</strong>
                          <p>{item.bodega}</p>
                          <small>
                            {item.responsable || "Sin responsable"} · Venció {formatShortDate(item.fechaLimite)} · {overdueText(item.diasVencida)}
                          </small>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="notification-empty">
                    Sin inspecciones programadas vencidas.
                  </div>
                )}

                <div className="notification-panel-foot">
                  La alerta se retira únicamente cuando se guarde la inspección de la bodega.
                </div>
              </div>
            )}
          </div>

          <div className="user-menu-wrap" ref={profileRef}>
            <button type="button" className="user-chip" onClick={() => setProfileOpen((value) => !value)}>
              <div className="user-avatar">
                {userPhoto ? <img src={userPhoto} alt={usuario} /> : <UserRound size={17} />}
              </div>
              <div className="user-info">
                <strong>{usuario}</strong>
                <small>{rol}</small>
              </div>
              <ChevronDown className="user-chevron" size={16} />
            </button>

            {profileOpen && (
              <div className="profile-panel">
                <div className="profile-card-head">
                  <button type="button" className="profile-photo" onClick={() => {
                    setTab("perfil");
                    setProfileOpen(false);
                  }}>
                    {userPhoto ? <img src={userPhoto} alt={usuario} /> : <UserRound size={28} />}
                    <span><Settings size={14} /></span>
                  </button>
                  <div>
                    <strong>{usuario}</strong>
                    <small>{rol}</small>
                  </div>
                </div>

                <button type="button" className="profile-action" onClick={() => {
                  setTab("perfil");
                  setProfileOpen(false);
                }}>
                  <UserRound size={16} />
                  Perfil
                </button>
                <button type="button" className="profile-action danger" onClick={closeSession}>
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {!config.isMobile && !sidebarPinned && (
        <div
          className="sidebar-hotzone-global"
          onMouseEnter={() => setSidebarHover(true)}
        />
      )}

      <section className="workspace">
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
                <img className="sidebar-logo-mini" src="/INOVA2026.png" alt="INOVA" loading="eager" decoding="sync" fetchPriority="high" />
              )}
            </div>

            <div className="sidebar-nav">
              {sidebarExpanded && <SectionTitle>Gestión 5S</SectionTitle>}

              {TABS_5S.map((item) => {
                const Icon = item.icon || Activity;
                const active = tab === item.key;

                const locked = (item.key === "configuracion" || item.key === "responsables") && !canAdmin;

                return (
                  <button
                    key={item.key}
                    type="button"
                    style={tabButtonStyle(active, sidebarExpanded)}
                    title={locked ? "Solo administradores" : item.label}
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
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

