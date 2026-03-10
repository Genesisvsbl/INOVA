import { useState } from "react";
import { getStock } from "../api";

export default function Stock() {
  const [codigo, setCodigo] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const consultar = async () => {
    setErr("");
    setData(null);
    try {
      const r = await getStock(codigo.trim());
      setData(r);
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div>
      <h1>📊 Stock</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Codigo material"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <button onClick={consultar}>Consultar</button>
      </div>

      {err && <p style={{ color: "red" }}>{err}</p>}

      {data && (
        <div style={{ marginTop: 16 }}>
          <p><b>Código:</b> {data.codigo}</p>
          <p><b>Descripción:</b> {data.descripcion}</p>
          <p><b>UM:</b> {data.unidad_medida}</p>
          <p><b>Familia:</b> {data.familia}</p>
          <p><b>Stock actual:</b> {data.stock_actual}</p>
        </div>
      )}
    </div>
  );
}