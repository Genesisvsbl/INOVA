import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const DRAFT_KEY = "wms_recibo_draft";

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function serialItem(serial, idx) {
  return `${serial}-${String(idx + 1).padStart(2, "0")}`;
}

function loteProveedorFromLoteAlmacen(lote15) {
  const s = (lote15 ?? "").toString();
  return s.length >= 10 ? s.slice(0, 10) : "";
}

function normalizeISODate(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const short = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(short)) return short;

  return s;
}

function getISOWeek(dateInput) {
  const s = normalizeISODate(dateInput);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";

  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

  return String(weekNum).padStart(2, "0");
}

function dateISOToExcelSerial5(isoDate) {
  const iso = normalizeISODate(isoDate);
  if (!iso) return "";

  const parts = iso.split("-");
  if (parts.length !== 3) return "";

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";

  const base = Date.UTC(1899, 11, 30);
  const target = Date.UTC(y, m - 1, d);
  const diffDays = Math.round((target - base) / (1000 * 60 * 60 * 24));

  if (!Number.isFinite(diffDays) || diffDays <= 0) return "";
  return String(diffDays).padStart(5, "0").slice(-5);
}

function buildLoteAlmacen15(loteProveedor10, fechaVencISO) {
  const lp = (loteProveedor10 ?? "").toString().trim().slice(0, 10);
  const serial5 = dateISOToExcelSerial5(fechaVencISO);
  if (lp.length !== 10 || serial5.length !== 5) return "";
  return lp + serial5;
}

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatQty(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return fmtCO.format(x);
}

export default function DesdeRecibo() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState(null);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [ubicacionesError, setUbicacionesError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ubicPorLinea, setUbicPorLinea] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);

    if (!raw) {
      alert("No hay recibo en proceso.");
      navigate("/movimientos/recibo");
      return;
    }

    try {
      const d = JSON.parse(raw);
      setDraft(d);

      const init = {};
      (d?.lineas || []).forEach((_, idx) => {
        init[idx] = "";
      });
      setUbicPorLinea(init);
    } catch {
      alert("Error leyendo el recibo.");
      navigate("/movimientos/recibo");
    }
  }, [navigate]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/ubicaciones?limit=2000")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo listar ubicaciones");
        return r.json();
      })
      .then((data) => {
        setUbicaciones(Array.isArray(data) ? data : []);
        setUbicacionesError("");
      })
      .catch((e) => {
        setUbicaciones([]);
        setUbicacionesError(String(e));
      });
  }, []);

  const filasMov = useMemo(() => {
    if (!draft) return [];

    const serial = draft?.header?.serial || "00000";
    const usuario = draft?.header?.usuario || "";
    const fecha = todayISODate();
    const movimiento = draft?.tipo === "SALIDA" ? "SALIDA" : "ENTRADA";

    return (draft.lineas || []).map((ln, idx) => {
      const codigoCita = serialItem(serial, idx);
      const sku = (ln.codigo || "").toString().trim();
      const texto = (ln.descripcion || "").toString().trim();

      const ff = normalizeISODate(ln.fecha_fabricacion);
      const fv = normalizeISODate(ln.fecha_vencimiento);

      const loteProv =
        (ln.lote_proveedor || "").toString().trim().slice(0, 10) ||
        loteProveedorFromLoteAlmacen(ln.lote);

      const loteAlm = buildLoteAlmacen15(loteProv, fv);
      const cantidadRaw = Number(ln.total || 0);
      const cantidadFmt = formatQty(cantidadRaw);

      const um = (
        ln.um ||
        ln.umm ||
        ln.unidad_medida ||
        draft?.header?.um ||
        ""
      ).toString().trim();

      const umb = (
        ln.umb ||
        draft?.header?.umb ||
        ""
      ).toString().trim();

      return {
        idx,
        ubicacion: ubicPorLinea[idx] ?? "",
        fecha,
        movimiento,
        id: "",
        usuario,
        codigoCita,
        sku,
        texto,
        loteAlm,
        loteProv,
        ff,
        fv,
        numeroSemana: getISOWeek(fv),
        um,
        umb,
        cantidadRaw,
        cantidadFmt,
        proveedor: (draft?.header?.proveedor || "").toString().trim(),
        documento: (draft?.header?.documento || "").toString().trim(),
        remesa: (
          draft?.header?.remesa ||
          draft?.header?.remesa_transp ||
          ""
        ).toString().trim(),
        ordenCompra: (draft?.header?.orden_compra || "").toString().trim(),
      };
    });
  }, [draft, ubicPorLinea]);

  if (!draft) return <div>Cargando...</div>;

  const onChangeUbic = (idx, value) => {
    setUbicPorLinea((prev) => ({ ...prev, [idx]: value }));
  };

  const validarDatosBase = () => {
    for (const ln of draft.lineas || []) {
      if (!ln?.codigo) return "Hay líneas sin SKU/código.";

      const fv = normalizeISODate(ln.fecha_vencimiento);
      const loteProv =
        (ln.lote_proveedor || "").toString().trim().slice(0, 10) ||
        loteProveedorFromLoteAlmacen(ln.lote);

      if (loteProv.length !== 10) {
        return "El Lote Proveedor debe ser exactamente 10 caracteres en todas las líneas.";
      }

      if (!fv) {
        return "Falta Fecha de Vencimiento en una o más líneas.";
      }

      const loteAlm = buildLoteAlmacen15(loteProv, fv);
      if (!loteAlm || loteAlm.length !== 15) {
        return "No se pudo generar Lote Almacén (15). Revisa lote proveedor y fecha vencimiento.";
      }
    }

    return "";
  };

  const validarConUbicacion = () => {
    const base = validarDatosBase();
    if (base) return base;

    for (let i = 0; i < (draft.lineas || []).length; i++) {
      if (!(ubicPorLinea[i] || "").trim()) {
        return `Falta ubicación en la línea #${i + 1}.`;
      }
    }

    return "";
  };

  const construirPayloadMovimiento = (linea, idx, opts = {}) => {
    const serial = (draft?.header?.serial || "").toString().trim();
    const proveedor = (draft?.header?.proveedor || "").toString().trim();
    const documento = (draft?.header?.documento || "").toString().trim();
    const usuario = (draft?.header?.usuario || "").toString().trim();
    const ordenCompra = (draft?.header?.orden_compra || "").toString().trim();
    const remesa = (
      draft?.header?.remesa ||
      draft?.header?.remesa_transp ||
      ""
    ).toString().trim();

    const loteProv =
      (linea.lote_proveedor || "").toString().trim().slice(0, 10) ||
      loteProveedorFromLoteAlmacen(linea.lote);

    const ff = normalizeISODate(linea.fecha_fabricacion);
    const fv = normalizeISODate(linea.fecha_vencimiento);
    const loteAlm = buildLoteAlmacen15(loteProv, fv);

    if (!loteAlm) {
      throw new Error(`No se pudo generar Lote Almacén en la línea #${idx + 1}`);
    }

    const umMovimiento = (
      linea.um ||
      linea.umm ||
      linea.unidad_medida ||
      draft?.header?.um ||
      ""
    ).toString().trim();

    const umbMovimiento = (
      linea.umb ||
      draft?.header?.umb ||
      ""
    ).toString().trim();

    return {
      fecha: new Date().toISOString(),
      usuario,
      documento,
      codigo_cita: serial,
      proveedor: proveedor || null,
      remesa: remesa || null,
      orden_compra: ordenCompra || null,
      um: umMovimiento || null,
      umb: umbMovimiento || null,
      codigo_material: (linea.codigo || "").toString().trim(),
      codigo_ubicacion: opts.codigo_ubicacion ?? null,
      estado: opts.estado ?? "ALMACENADO",
      lote_almacen: loteAlm,
      lote_proveedor: loteProv,
      fecha_fabricacion: ff || null,
      fecha_vencimiento: fv || null,
      cantidad_r: Number(linea.total || 0),
    };
  };

  const construirRotulosItems = () => {
    const serial = (draft?.header?.serial || "").toString().trim();
    const proveedor = (draft?.header?.proveedor || "").toString().trim();
    const documento = (draft?.header?.documento || "").toString().trim();
    const ordenCompra = (draft?.header?.orden_compra || "").toString().trim();
    const remesa = (
      draft?.header?.remesa ||
      draft?.header?.remesa_transp ||
      ""
    ).toString().trim();
    const fechaRecep = todayISODate();

    return draft.lineas.map((linea, i) => {
      const loteProv =
        (linea.lote_proveedor || "").toString().trim().slice(0, 10) ||
        loteProveedorFromLoteAlmacen(linea.lote);

      const ff = normalizeISODate(linea.fecha_fabricacion);
      const fv = normalizeISODate(linea.fecha_vencimiento);
      const loteAlm = buildLoteAlmacen15(loteProv, fv);
      const impresion = serialItem(serial, i);

      const sku = (linea.codigo || "").toString().trim();
      const cantidad = Number(linea.total || 0);
      const um = (
        linea.um ||
        linea.umm ||
        linea.unidad_medida ||
        draft?.header?.um ||
        ""
      ).toString().trim();

      return {
        impresion,
        codigo_cita: serial,
        fecha_recepcion: fechaRecep,
        numero_semana: getISOWeek(fv),

        proveedor: proveedor || "",
        documento: documento || "",
        remesa: remesa || "",
        orden_compra: ordenCompra || "",

        cantidad,
        sku,
        texto_breve: (linea.descripcion || "").toString().trim(),

        um,
        umb: (
          linea.umb ||
          draft?.header?.umb ||
          ""
        ).toString().trim(),

        fecha_fabricacion: ff || null,
        fecha_vencimiento: fv || null,
        lote_proveedor: loteProv,
        lote_almacen: loteAlm,
      };
    });
  };

  const guardarRotulos = async () => {
    const rotulosItems = construirRotulosItems();

    const rotRes = await fetch("http://127.0.0.1:8000/rotulos/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: rotulosItems }),
    });

    if (!rotRes.ok) {
      const txt = await rotRes.text();
      throw new Error("Movimientos OK, pero falló guardando rótulos:\n" + txt);
    }
  };

  const guardarMovimientos = async () => {
    const err = validarConUbicacion();
    if (err) {
      alert(err);
      return;
    }

    setGuardando(true);

    try {
      for (let i = 0; i < draft.lineas.length; i++) {
        const linea = draft.lineas[i];
        const ubic = (ubicPorLinea[i] || "").trim();

        const payload = construirPayloadMovimiento(linea, i, {
          codigo_ubicacion: ubic,
          estado: "ALMACENADO",
        });

        const res = await fetch("http://127.0.0.1:8000/movimientos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt);
        }
      }

      await guardarRotulos();

      localStorage.removeItem(DRAFT_KEY);
      alert("✅ Movimientos guardados con ubicación + historial de rótulos.");
      navigate("/datos-maestros/rotulos");
    } catch (e) {
      alert("❌ Error guardando:\n" + (e?.message || e));
    } finally {
      setGuardando(false);
    }
  };

  const guardarEnTransito = async () => {
    const err = validarDatosBase();
    if (err) {
      alert(err);
      return;
    }

    setGuardando(true);

    try {
      for (let i = 0; i < draft.lineas.length; i++) {
        const linea = draft.lineas[i];

        const payload = construirPayloadMovimiento(linea, i, {
          codigo_ubicacion: null,
          estado: "EN_TRANSITO",
        });

        const res = await fetch("http://127.0.0.1:8000/movimientos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt);
        }
      }

      await guardarRotulos();

      localStorage.removeItem(DRAFT_KEY);
      alert("✅ Material guardado en EN TRANSITO + historial de rótulos.");
      navigate("/datos-maestros/en-transito");
    } catch (e) {
      alert("❌ Error guardando en tránsito:\n" + (e?.message || e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <h2>🔄 Movimientos (desde Recibo)</h2>

      <div style={{ marginBottom: 12, color: "#444" }}>
        <b>Proveedor:</b> {draft.header.proveedor} <br />
        <b>Documento:</b> {draft.header.documento} <br />
        <b>Remesa:</b> {draft.header.remesa || draft.header.remesa_transp || ""} <br />
        <b>Usuario:</b> {draft.header.usuario} <br />
        <b>Serial (cita):</b> {draft.header.serial} <br />
        <b>Líneas:</b> {draft.lineas.length}
      </div>

      {ubicacionesError && (
        <div style={{ color: "crimson", marginBottom: 10 }}>
          Error cargando ubicaciones: {ubicacionesError}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Ubicación</th>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>ID</th>
              <th>Usuario</th>
              <th>Codigo Cita</th>
              <th>SKU</th>
              <th>Texto Breve del Material</th>
              <th>Lote Almacen</th>
              <th>Lote Proveedor</th>
              <th>Fecha de Fabricación</th>
              <th>Fecha de Vencimiento</th>
              <th>Semana</th>
              <th>UM</th>
              <th>UMB</th>
              <th>Cantidad</th>
            </tr>
          </thead>

          <tbody>
            {filasMov.map((r) => (
              <tr key={r.idx}>
                <td>
                  <input
                    list="ubicacionesList"
                    value={r.ubicacion}
                    onChange={(e) => onChangeUbic(r.idx, e.target.value)}
                    placeholder="Escriba o seleccione..."
                    style={{ width: 160 }}
                  />
                </td>
                <td><input value={r.fecha} readOnly style={{ width: 110, background: "#f3f3f3" }} /></td>
                <td><input value={r.movimiento} readOnly style={{ width: 110, background: "#f3f3f3" }} /></td>
                <td><input value={r.id} readOnly style={{ width: 80, background: "#f3f3f3" }} /></td>
                <td><input value={r.usuario} readOnly style={{ width: 170, background: "#f3f3f3" }} /></td>
                <td><input value={r.codigoCita} readOnly style={{ width: 120, background: "#f3f3f3" }} /></td>
                <td><input value={r.sku} readOnly style={{ width: 110, background: "#f3f3f3" }} /></td>
                <td><input value={r.texto} readOnly style={{ width: 360, background: "#f3f3f3" }} /></td>
                <td><input value={r.loteAlm} readOnly style={{ width: 160, background: "#f3f3f3" }} /></td>
                <td><input value={r.loteProv} readOnly style={{ width: 130, background: "#f3f3f3" }} /></td>
                <td><input value={r.ff} readOnly style={{ width: 130, background: "#f3f3f3" }} /></td>
                <td><input value={r.fv} readOnly style={{ width: 130, background: "#f3f3f3" }} /></td>
                <td><input value={r.numeroSemana} readOnly style={{ width: 80, background: "#f3f3f3" }} /></td>
                <td><input value={r.um} readOnly style={{ width: 100, background: "#f3f3f3" }} /></td>
                <td><input value={r.umb} readOnly style={{ width: 100, background: "#f3f3f3" }} /></td>
                <td>
                  <input
                    value={r.cantidadFmt}
                    readOnly
                    style={{ width: 130, background: "#f3f3f3", textAlign: "right" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <datalist id="ubicacionesList">
          {ubicaciones.map((u) => (
            <option key={u.id} value={u.ubicacion}>
              {u.ubicacion}
            </option>
          ))}
        </datalist>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/movimientos/recibo")}>🔙 Regresar al Recibo</button>

        <button onClick={guardarMovimientos} disabled={guardando} style={{ fontWeight: 800 }}>
          💾 Guardar con ubicación
        </button>

        <button
          onClick={guardarEnTransito}
          disabled={guardando}
          style={{ fontWeight: 800, background: "#f59e0b", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8 }}
        >
          🚚 Guardar en tránsito
        </button>
      </div>
    </div>
  );
}