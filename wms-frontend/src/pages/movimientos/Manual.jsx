import { useState } from "react";
import { crearMovimiento } from "../../api";

export default function Manual() {
  const [mov, setMov] = useState({
    tipo: "ENTRADA",
    codigo_material: "",
    codigo_ubicacion: "",
    cantidad: "",
    usuario: "admin",
    documento: "",
  });

  const onGuardar = async () => {
    if (!mov.codigo_material || !mov.codigo_ubicacion || !mov.cantidad) {
      alert("codigo_material, codigo_ubicacion y cantidad son obligatorios");
      return;
    }

    const cantidadNum = Number(mov.cantidad);
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      alert("La cantidad debe ser > 0");
      return;
    }

    const payload = {
      fecha: new Date().toISOString(),
      usuario: mov.usuario || "admin",
      documento: mov.documento || null,
      codigo_material: mov.codigo_material.trim(),
      codigo_ubicacion: mov.codigo_ubicacion.trim(),
      lote_almacen: null,
      lote_proveedor: null,
      fecha_vencimiento: null,
      cantidad_r:
        mov.tipo === "SALIDA" ? -Math.abs(cantidadNum) : Math.abs(cantidadNum),
    };

    await crearMovimiento(payload);
    alert("Movimiento registrado ✅");

    setMov((prev) => ({ ...prev, cantidad: "", documento: "" }));
  };

  return (
    <div>
      <h2>✍️ Movimiento manual</h2>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select
          value={mov.tipo}
          onChange={(e) => setMov({ ...mov, tipo: e.target.value })}
        >
          <option value="ENTRADA">ENTRADA</option>
          <option value="SALIDA">SALIDA</option>
        </select>

        <input
          placeholder="Codigo material"
          value={mov.codigo_material}
          onChange={(e) =>
            setMov({ ...mov, codigo_material: e.target.value })
          }
        />

        <input
          placeholder="Ubicacion (ej: A-01-01)"
          value={mov.codigo_ubicacion}
          onChange={(e) =>
            setMov({ ...mov, codigo_ubicacion: e.target.value })
          }
        />

        <input
          type="number"
          placeholder="Cantidad"
          value={mov.cantidad}
          onChange={(e) => setMov({ ...mov, cantidad: e.target.value })}
        />

        <input
          placeholder="Documento (opcional)"
          value={mov.documento}
          onChange={(e) => setMov({ ...mov, documento: e.target.value })}
        />

        <input
          placeholder="Usuario"
          value={mov.usuario}
          onChange={(e) => setMov({ ...mov, usuario: e.target.value })}
        />

        <button onClick={onGuardar}>Guardar</button>
      </div>

      <p style={{ marginTop: 10, color: "#666" }}>
        ENTRADA suma stock. SALIDA resta stock.
      </p>
    </div>
  );
}