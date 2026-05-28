import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./Layout";
import Calidad5S from "./pages/5s/Calidad5S.jsx";
import EtoDigitalApp from "./pages/eto/App.jsx";
import "./pages/eto/index.css";

/* ================= PAGINAS ================= */
import Inicio from "./pages/Inicio";
import DatosMaestros from "./pages/DatosMaestros";
import Materiales from "./pages/Materiales";
import Stock from "./pages/Stock";
import Movimientos from "./pages/Movimientos";
import Inventarios from "./pages/Inventarios";
import LayoutZona from "./pages/LayoutZona";

/* ================= MOVIMIENTOS ================= */
import Recibo from "./pages/movimientos/Recibo";
import Despacho from "./pages/movimientos/Despacho";
import DesdeRecibo from "./pages/movimientos/DesdeRecibo";
import OrdenPicking from "./pages/movimientos/OrdenPicking";
import Reasignacion from "./pages/movimientos/Reasignacion";

/* ================= MAESTROS ================= */
import Proveedores from "./pages/maestros/Proveedores";
import Ubicaciones from "./pages/maestros/Ubicaciones";
import MotorPrincipal from "./pages/maestros/MotorPrincipal";
import Rotulos from "./pages/maestros/Rotulos";
import EnTransito from "./pages/maestros/EnTransito";

/* ================= INVENTARIOS ================= */
import CrearTarea from "./pages/inventarios/CrearTarea";
import MisConteos from "./pages/inventarios/MisConteos";
import ConteoFisico from "./pages/inventarios/ConteoFisico";
import Conciliacion from "./pages/inventarios/Conciliacion";
import Reconteos from "./pages/inventarios/Reconteos";
import InformeInventario from "./pages/inventarios/InformeInventario";

/* ================= LOGIN ================= */
import LoginPage from "./pages/LoginPage";
import AdminAccess from "./pages/admin/AdminAccess";


function useGlobalTableTools() {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const getRows = (table) => Array.from(table.tBodies?.[0]?.rows || []);
    const getCellValue = (row, index) => normalize(row.children[index]?.textContent || "");

    const updateCount = (table, countNode) => {
      if (!countNode) return;
      const rows = getRows(table);
      const visible = rows.filter((row) => row.style.display !== "none").length;
      countNode.textContent = `${visible} / ${rows.length}`;
    };

    const applyFilter = (table, input, select, countNode) => {
      if (!input || !select) return;
      const query = normalize(input.value);
      const column = select.value;
      getRows(table).forEach((row) => {
        const text = column === "all" ? normalize(row.textContent) : getCellValue(row, Number(column));
        row.style.display = !query || text.includes(query) ? "" : "none";
      });
      updateCount(table, countNode);
    };

    const parseSortValue = (value) => {
      const raw = String(value || "").trim();
      const numeric = Number(raw.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", "."));
      return Number.isFinite(numeric) && /\d/.test(raw) ? numeric : normalize(raw);
    };

    const sortTable = (table, header, index) => {
      const tbody = table.tBodies?.[0];
      if (!tbody) return;
      const current = header.dataset.sortDirection === "asc" ? "desc" : "asc";
      table.querySelectorAll("th").forEach((th) => {
        th.dataset.sortDirection = "";
        th.classList.remove("table-sort-asc", "table-sort-desc");
      });
      header.dataset.sortDirection = current;
      header.classList.add(current === "asc" ? "table-sort-asc" : "table-sort-desc");

      const rows = getRows(table).map((row, originalIndex) => ({ row, originalIndex }));
      rows.sort((a, b) => {
        const av = parseSortValue(a.row.children[index]?.textContent || "");
        const bv = parseSortValue(b.row.children[index]?.textContent || "");
        if (av === bv) return a.originalIndex - b.originalIndex;
        if (typeof av === "number" && typeof bv === "number") return current === "asc" ? av - bv : bv - av;
        return current === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
      rows.forEach(({ row }) => tbody.appendChild(row));
      const toolbar = table.previousElementSibling?.classList?.contains("table-tools-bar") ? table.previousElementSibling : null;
      if (toolbar) applyFilter(table, toolbar.querySelector("input"), toolbar.querySelector("select"), toolbar.querySelector(".table-tools-count"));
    };

    let enhanceScheduled = false;

    const enhance = () => {
      enhanceScheduled = false;
      const isEtoRoute = location.pathname.startsWith("/eto");
      document.querySelectorAll("table").forEach((table) => {
        const skip = table.closest(".table-tools-skip") || table.classList.contains("print-table") || table.classList.contains("receipt-table");
        if (skip) return;
        const headers = Array.from(table.querySelectorAll("thead th"));
        const hasBody = Boolean(table.tBodies?.[0]);
        if (!headers.length || !hasBody) return;

        table.classList.toggle("table-tools-eto", isEtoRoute);
        table.classList.toggle("table-tools-wms", !isEtoRoute);

        if (table.dataset.tableTools === "1") {
          const toolbar = table.previousElementSibling?.classList?.contains("table-tools-bar") ? table.previousElementSibling : null;
          toolbar?.classList.toggle("table-tools-eto", isEtoRoute);
          toolbar?.classList.toggle("table-tools-wms", !isEtoRoute);
          const count = toolbar?.querySelector(".table-tools-count");
          updateCount(table, count);
          return;
        }

        table.dataset.tableTools = "1";
        table.classList.add("table-tools-ready", "inova-data-table");

        const toolbar = document.createElement("div");
        toolbar.className = "table-tools-bar";
        toolbar.classList.add(isEtoRoute ? "table-tools-eto" : "table-tools-wms");

        const inputWrap = document.createElement("label");
        inputWrap.className = "table-tools-search";
        inputWrap.innerHTML = `<span>Filtrar</span><input type="search" placeholder="Buscar en la tabla..." autocomplete="off" />`;

        const selectWrap = document.createElement("label");
        selectWrap.className = "table-tools-select";
        const select = document.createElement("select");
        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "Todas las columnas";
        select.appendChild(allOption);
        headers.forEach((header, index) => {
          const label = (header.textContent || `Columna ${index + 1}`).trim();
          if (!label) return;
          const option = document.createElement("option");
          option.value = String(index);
          option.textContent = label;
          select.appendChild(option);
        });
        selectWrap.innerHTML = "<span>Columna</span>";
        selectWrap.appendChild(select);

        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "table-tools-clear";
        clear.textContent = "Limpiar";

        const count = document.createElement("strong");
        count.className = "table-tools-count";

        toolbar.append(inputWrap, selectWrap, clear, count);
        table.parentElement?.insertBefore(toolbar, table);

        const input = inputWrap.querySelector("input");
        input.addEventListener("input", () => applyFilter(table, input, select, count));
        select.addEventListener("change", () => applyFilter(table, input, select, count));
        clear.addEventListener("click", () => {
          input.value = "";
          select.value = "all";
          applyFilter(table, input, select, count);
          input.focus();
        });

        headers.forEach((header, index) => {
          header.classList.add("table-sortable-header");
          header.tabIndex = 0;
          header.title = "Ordenar columna";
          header.addEventListener("click", () => sortTable(table, header, index));
          header.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              sortTable(table, header, index);
            }
          });
        });

        updateCount(table, count);
      });
    };

    const scheduleEnhance = () => {
      if (enhanceScheduled) return;
      enhanceScheduled = true;
      window.setTimeout(enhance, 180);
    };

    enhance();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) {
        scheduleEnhance();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);
}
function PrivateRoute({ children }) {
  const isAuth = sessionStorage.getItem("auth") === "true";
  const selectedPillar = sessionStorage.getItem("pilarSeleccionado");
  return isAuth && selectedPillar === "wms" ? children : <Navigate to="/login" replace />;
}

function PillarRoute({ pillar, children }) {
  const isAuth = sessionStorage.getItem("auth") === "true";
  const selectedPillar = sessionStorage.getItem("pilarSeleccionado");

  return isAuth && selectedPillar === pillar ? children : <Navigate to="/login" replace />;
}

function isAdminSession() {
  const role = String(sessionStorage.getItem("rol") || "").toUpperCase();
  const permisos = JSON.parse(sessionStorage.getItem("permisos") || "[]");
  return (
    sessionStorage.getItem("esPlatformAdmin") === "true" ||
    sessionStorage.getItem("esSuperAdmin") === "true" ||
    ["SUPER_ADMIN", "ADMIN_INOVA", "INOVA_ADMIN", "ADMIN_PLATAFORMA", "PLATFORM_ADMIN"].includes(role) ||
    role.includes("ADMIN") ||
    permisos.includes("admin.usuarios.gestionar") ||
    permisos.includes("admin.roles.gestionar")
  );
}

function isPlatformAdminSession() {
  const role = String(sessionStorage.getItem("rol") || "").toUpperCase();
  return (
    sessionStorage.getItem("esPlatformAdmin") === "true" ||
    ["ADMIN_INOVA", "INOVA_ADMIN", "ADMIN_PLATAFORMA", "PLATFORM_ADMIN"].includes(role)
  );
}

function AdminRoute({ children }) {
  const isAuth = sessionStorage.getItem("auth") === "true";
  const selectedPillar = sessionStorage.getItem("pilarSeleccionado");
  return isAuth && selectedPillar === "wms" && isAdminSession() ? children : <Navigate to="/" replace />;
}

function OperationalRoute({ children }) {
  return isPlatformAdminSession() ? <Navigate to="/admin/configuracion" replace /> : children;
}

function AppRoutes() {
  useGlobalTableTools();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

        <Route
          path="/5s/*"
          element={
            <PillarRoute pillar="5s">
              <Calidad5S />
            </PillarRoute>
          }
        />

        <Route
          path="/eto/*"
          element={
            <PillarRoute pillar="eto">
              <EtoDigitalApp />
            </PillarRoute>
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<OperationalRoute><Inicio /></OperationalRoute>} />

          <Route path="datos-maestros" element={<OperationalRoute><DatosMaestros /></OperationalRoute>}>
            <Route index element={<Navigate to="materiales" replace />} />
            <Route path="materiales" element={<Materiales />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="ubicaciones" element={<Ubicaciones />} />
            <Route path="motor" element={<MotorPrincipal />} />
            <Route path="rotulos" element={<Rotulos />} />
            <Route path="en-transito" element={<EnTransito />} />
          </Route>

          <Route path="movimientos" element={<OperationalRoute><Movimientos /></OperationalRoute>}>
            <Route index element={<Navigate to="recibo" replace />} />
            <Route path="recibo" element={<Recibo />} />
            <Route path="despacho" element={<Despacho />} />
            <Route path="desde-recibo" element={<DesdeRecibo />} />
            <Route path="orden-picking/:reserva" element={<OrdenPicking />} />
            <Route path="reasignacion" element={<Reasignacion />} />
          </Route>

          <Route path="inventarios" element={<OperationalRoute><Inventarios /></OperationalRoute>}>
            <Route index element={<Navigate to="crear-tarea" replace />} />
            <Route path="crear-tarea" element={<CrearTarea />} />
            <Route path="mis-conteos" element={<MisConteos />} />
            <Route path="conteo-fisico" element={<ConteoFisico />} />
            <Route path="conciliacion" element={<Conciliacion />} />
            <Route path="reconteos" element={<Reconteos />} />
            <Route path="informe" element={<InformeInventario />} />
          </Route>

          <Route path="stock" element={<OperationalRoute><Stock /></OperationalRoute>} />
          <Route path="layout-zona" element={<OperationalRoute><LayoutZona /></OperationalRoute>} />
          <Route path="admin/usuarios" element={<AdminRoute><AdminAccess view="usuarios" /></AdminRoute>} />
          <Route path="admin/roles" element={<AdminRoute><AdminAccess view="roles" /></AdminRoute>} />
          <Route path="admin/auditoria" element={<AdminRoute><AdminAccess view="auditoria" /></AdminRoute>} />
          <Route path="admin/configuracion" element={<AdminRoute><AdminAccess view="empresas" /></AdminRoute>} />
          <Route path="*" element={<div>Ruta no encontrada</div>} />
        </Route>
      </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
