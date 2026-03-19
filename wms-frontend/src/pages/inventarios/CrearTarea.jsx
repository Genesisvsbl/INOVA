export default function CrearTarea() {
  return (
    <div>
      <h2>➕ Crear tarea de inventario</h2>
      <p>Aquí podrás crear nuevas tareas de conteo físico.</p>

      <div style={{ marginTop: 20 }}>
        <label>Ubicación:</label>
        <input type="text" placeholder="Ej: A01" style={{ display: "block", marginBottom: 10 }} />

        <label>Tipo de conteo:</label>
        <select style={{ display: "block", marginBottom: 10 }}>
          <option>Cíclico</option>
          <option>General</option>
        </select>

        <button>Crear tarea</button>
      </div>
    </div>
  );
}