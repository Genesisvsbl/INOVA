export default function ConteoFisico() {
  return (
    <div>
      <h2>📦 Conteo físico</h2>
      <p>Registro del conteo real en bodega.</p>

      <div style={{ marginTop: 20 }}>
        <label>SKU:</label>
        <input type="text" placeholder="Código material" />

        <label>Cantidad contada:</label>
        <input type="number" />

        <button style={{ marginTop: 10 }}>Guardar conteo</button>
      </div>
    </div>
  );
}