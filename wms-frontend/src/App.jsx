import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

import DatosMaestros from "./pages/DatosMaestros";
import Materiales from "./pages/Materiales";
import Stock from "./pages/Stock";
import Movimientos from "./pages/Movimientos";
import Inventarios from "./pages/Inventarios";

import Recibo from "./pages/movimientos/Recibo";
import Despacho from "./pages/movimientos/Despacho";
import DesdeRecibo from "./pages/movimientos/DesdeRecibo";
import OrdenPicking from "./pages/movimientos/OrdenPicking";

import Proveedores from "./pages/maestros/Proveedores";
import Ubicaciones from "./pages/maestros/Ubicaciones";
import MotorPrincipal from "./pages/maestros/MotorPrincipal";
import Rotulos from "./pages/maestros/Rotulos";
import EnTransito from "./pages/maestros/EnTransito";

/* ✅ INVENTARIOS (IMPORTS NUEVOS) */
import CrearTarea from "./pages/inventarios/CrearTarea";
import MisConteos from "./pages/inventarios/MisConteos";
import ConteoFisico from "./pages/inventarios/ConteoFisico";
import Conciliacion from "./pages/inventarios/Conciliacion";
import Reconteos from "./pages/inventarios/Reconteos";
import InformeInventario from "./pages/inventarios/InformeInventario";

/* ✅ LOGIN */
import LoginPage from "./pages/LoginPage";

/* ✅ PROTECTOR SIMPLE CON sessionStorage */
function PrivateRoute({ children }) {
  const isAuth = sessionStorage.getItem("auth") === "true";
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ LOGIN */}
        <Route path="/login" element={<LoginPage />} />

        {/* ✅ APP PROTEGIDA */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="datos-maestros" replace />} />

          {/* ================= DATOS MAESTROS ================= */}
          <Route path="datos-maestros" element={<DatosMaestros />}>
            <Route index element={<Navigate to="materiales" replace />} />
            <Route path="materiales" element={<Materiales />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="ubicaciones" element={<Ubicaciones />} />
            <Route path="motor" element={<MotorPrincipal />} />
            <Route path="rotulos" element={<Rotulos />} />
            <Route path="en-transito" element={<EnTransito />} />
          </Route>

          {/* ================= MOVIMIENTOS ================= */}
          <Route path="movimientos" element={<Movimientos />}>
            <Route index element={<Navigate to="recibo" replace />} />
            <Route path="recibo" element={<Recibo />} />
            <Route path="despacho" element={<Despacho />} />
            <Route path="desde-recibo" element={<DesdeRecibo />} />
            <Route path="orden-picking/:reserva" element={<OrdenPicking />} />
          </Route>

          {/* ================= INVENTARIOS (NUEVO) ================= */}
          <Route path="inventarios" element={<Inventarios />}>
            <Route path="crear-tarea" element={<CrearTarea />} />
            <Route path="mis-conteos" element={<MisConteos />} />
            <Route path="conteo-fisico" element={<ConteoFisico />} />
            <Route path="conciliacion" element={<Conciliacion />} />
            <Route path="reconteos" element={<Reconteos />} />
            <Route path="informe" element={<InformeInventario />} />
          </Route>

          {/* ================= STOCK ================= */}
          <Route path="stock" element={<Stock />} />

          {/* ================= 404 ================= */}
          <Route path="*" element={<div>Ruta no encontrada</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}