import { Link } from "react-router-dom";

export default function Inventarios() {
  return (
    <div>
      <h2>📦 Inventarios</h2>
      <p>Módulo de inventarios físicos, conciliación y reconteos.</p>

      <div style={{ display: "grid", gap: 12, maxWidth: 420, marginTop: 20 }}>
        <Link to="/inventarios/crear-tarea">
          <button style={{ width: "100%" }}>➕ Crear tarea</button>
        </Link>

        <Link to="/inventarios/mis-conteos">
          <button style={{ width: "100%" }}>📋 Mis conteos</button>
        </Link>

        <Link to="/inventarios/conteo-fisico">
          <button style={{ width: "100%" }}>📦 Conteo físico</button>
        </Link>

        <Link to="/inventarios/conciliacion">
          <button style={{ width: "100%" }}>⚖️ Conciliación</button>
        </Link>

        <Link to="/inventarios/reconteos">
          <button style={{ width: "100%" }}>🔁 Reconteos</button>
        </Link>

        <Link to="/inventarios/informe">
          <button style={{ width: "100%" }}>📊 Informe inventario</button>
        </Link>
      </div>
    </div>
  );
}