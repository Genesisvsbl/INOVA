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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="datos-maestros" replace />} />

          <Route path="datos-maestros" element={<DatosMaestros />}>
            <Route index element={<Navigate to="materiales" replace />} />
            <Route path="materiales" element={<Materiales />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="ubicaciones" element={<Ubicaciones />} />
            <Route path="motor" element={<MotorPrincipal />} />
            <Route path="rotulos" element={<Rotulos />} />
            <Route path="en-transito" element={<EnTransito />} />
          </Route>

          <Route path="movimientos" element={<Movimientos />}>
            <Route index element={<Navigate to="recibo" replace />} />
            <Route path="recibo" element={<Recibo />} />
            <Route path="despacho" element={<Despacho />} />
            <Route path="desde-recibo" element={<DesdeRecibo />} />
            <Route path="orden-picking/:reserva" element={<OrdenPicking />} />
          </Route>

          <Route path="inventarios" element={<Inventarios />} />

          <Route path="stock" element={<Stock />} />

          <Route path="*" element={<div>Ruta no encontrada</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}