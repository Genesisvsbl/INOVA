export default function Conciliacion() {
  return (
    <div>
      <h2>⚖️ Conciliación</h2>
      <p>Comparación entre sistema y conteo físico.</p>

      <table border="1" cellPadding="8" style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Sistema</th>
            <th>Físico</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>MAT001</td>
            <td>100</td>
            <td>95</td>
            <td>-5</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}