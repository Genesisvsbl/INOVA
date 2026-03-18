import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../api";

const DRAFT_KEY = "wms_recibo_draft";

const colors = {
  navy: "#072B5A",
  blue: "#0A6ED1",
  bg: "#F5F7FB",
  text: "#0F172A",
  muted: "#64748B",
  card: "#FFFFFF",
  border: "#E2E8F0",
  good: "#16a34a",
  bad: "#dc2626",
  warn: "#f59e0b",
};

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
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);

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

function Chip({ label, tone = "neutral" }) {
  const stylesByTone = {
    neutral: { bg: "#F1F5F9", bd: "#E2E8F0", tx: colors.text },
    blue: { bg: "rgba(10,110,209,.10)", bd: "rgba(10,110,209,.25)", tx: colors.blue },
    green: { bg: "rgba(22,163,74,.10)", bd: "rgba(22,163,74,.25)", tx: colors.good },
    red: { bg: "rgba(220,38,38,.10)", bd: "rgba(220,38,38,.25)", tx: colors.bad },
    amber: { bg: "rgba(245,158,11,.10)", bd: "rgba(245,158,11,.28)", tx: colors.warn },
  };

  const st = stylesByTone[tone] || stylesByTone.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        background: st.bg,
        border: `1px solid ${st.bd}`,
        color: st.tx,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function esMaterialAuto(linea) {
  const texto = [
    linea?.familia || "",
    linea?.descripcion || "",
    linea?.codigo || "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    texto.includes("lata") ||
    texto.includes("preforma") ||
    texto.includes("azucar") ||
    texto.includes("azúcar")
  );
}

function buildLineaExpandida({
  lineaOriginal,
  idxLineaOriginal,
  idxExpandido,
  ubicacionData,
  draft,
}) {
  const serial = draft?.header?.serial || "00000";
  const usuario = draft?.header?.usuario || "";
  const fecha = todayISODate();
  const movimiento = draft?.tipo === "SALIDA" ? "SALIDA" : "ENTRADA";

  const ff = normalizeISODate(lineaOriginal.fecha_fabricacion);
  const fv = normalizeISODate(lineaOriginal.fecha_vencimiento);

  const loteProv =
    (lineaOriginal.lote_proveedor || "").toString().trim().slice(0, 10) ||
    loteProveedorFromLoteAlmacen(lineaOriginal.lote);

  const loteAlm = buildLoteAlmacen15(loteProv, fv);

  const um = (
    lineaOriginal.um ||
    lineaOriginal.umm ||
    lineaOriginal.unidad_medida ||
    draft?.header?.um ||
    ""
  )
    .toString()
    .trim();

  const umb = (lineaOriginal.umb || draft?.header?.umb || "").toString().trim();

  const cantidadOriginal = Number(lineaOriginal.cantidad || 0);
  const totalOriginal = Number(lineaOriginal.total || 0);
  const totalUnitario = cantidadOriginal > 0 ? totalOriginal / cantidadOriginal : 0;

  return {
    rowKey: `${idxLineaOriginal}-${idxExpandido}-${ubicacionData?.ubicacion || "sin-ubi"}`,
    idxLineaOriginal,
    idxExpandido,
    auto: true,
    base: ubicacionData?.ubicacion_base || "",
    posicion: ubicacionData?.posicion || "",
    ubicacion: ubicacionData?.ubicacion || "",
    sugeridas: [],
    fecha,
    movimiento,
    id: "",
    usuario,
    codigoCita: serialItem(serial, idxLineaOriginal),
    sku: (lineaOriginal.codigo || "").toString().trim(),
    texto: (lineaOriginal.descripcion || "").toString().trim(),
    loteAlm,
    loteProv,
    ff,
    fv,
    numeroSemana: getISOWeek(fv),
    um,
    umb,
    cantidadRaw: 1,
    cantidadFmt: formatQty(totalUnitario),
    proveedor: (draft?.header?.proveedor || "").toString().trim(),
    documento: (draft?.header?.documento || "").toString().trim(),
    remesa: (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim(),
    ordenCompra: (draft?.header?.orden_compra || "").toString().trim(),
    lineaOriginal,
  };
}

function ActionButtons({ guardando, onBack, onGuardar, onTransito }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button
        onClick={onBack}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: `1px solid ${colors.border}`,
          background: colors.card,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        🔙 Regresar al Recibo
      </button>

      <button
        onClick={onGuardar}
        disabled={guardando}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: colors.blue,
          color: "#fff",
          fontWeight: 900,
          cursor: guardando ? "not-allowed" : "pointer",
          opacity: guardando ? 0.7 : 1,
        }}
      >
        {guardando ? "Guardando..." : "💾 Guardar con ubicación"}
      </button>

      <button
        onClick={onTransito}
        disabled={guardando}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: colors.warn,
          color: "#fff",
          fontWeight: 900,
          cursor: guardando ? "not-allowed" : "pointer",
          opacity: guardando ? 0.7 : 1,
        }}
      >
        🚚 Guardar en tránsito
      </button>
    </div>
  );
}

export default function DesdeRecibo() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState(null);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [ubicacionesError, setUbicacionesError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [ubicPorLinea, setUbicPorLinea] = useState({});
  const [sugiriendoLinea, setSugiriendoLinea] = useState({});

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
      (d?.lineas || []).forEach((ln, idx) => {
        init[idx] = {
          auto: esMaterialAuto(ln),
          base: "",
          posicion: "",
          ubicacion: "",
          sugeridas: [],
        };
      });
      setUbicPorLinea(init);
    } catch {
      alert("Error leyendo el recibo.");
      navigate("/movimientos/recibo");
    }
  }, [navigate]);

  useEffect(() => {
    fetch(`${API_URL}/ubicaciones?limit=5000`)
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

  const basesDisponibles = useMemo(() => {
    const set = new Set();

    ubicaciones.forEach((u) => {
      const base = (u.ubicacion_base || "").toString().trim();
      if (base) set.add(base);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ubicaciones]);

  const posicionesPorBase = useMemo(() => {
    const map = {};

    ubicaciones.forEach((u) => {
      const base = (u.ubicacion_base || "").toString().trim();
      const pos = (u.posicion || "").toString().trim();
      if (!base || !pos) return;

      if (!map[base]) map[base] = [];
      if (!map[base].includes(pos)) map[base].push(pos);
    });

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.localeCompare(b);
      });
    });

    return map;
  }, [ubicaciones]);

  const filasMov = useMemo(() => {
    if (!draft) return [];

    const serial = draft?.header?.serial || "00000";
    const usuario = draft?.header?.usuario || "";
    const fecha = todayISODate();
    const movimiento = draft?.tipo === "SALIDA" ? "SALIDA" : "ENTRADA";

    const filas = [];

    (draft.lineas || []).forEach((ln, idx) => {
      const codigoCita = serialItem(serial, idx);
      const sku = (ln.codigo || "").toString().trim();
      const texto = (ln.descripcion || "").toString().trim();

      const ff = normalizeISODate(ln.fecha_fabricacion);
      const fv = normalizeISODate(ln.fecha_vencimiento);

      const loteProv =
        (ln.lote_proveedor || "").toString().trim().slice(0, 10) ||
        loteProveedorFromLoteAlmacen(ln.lote);

      const loteAlm = buildLoteAlmacen15(loteProv, fv);

      const cantidadPallets = Number(ln.cantidad || 0);
      const totalLinea = Number(ln.total || 0);

      const um = (
        ln.um ||
        ln.umm ||
        ln.unidad_medida ||
        draft?.header?.um ||
        ""
      )
        .toString()
        .trim();

      const umb = (ln.umb || draft?.header?.umb || "").toString().trim();

      const estadoUbic = ubicPorLinea[idx] || {
        auto: esMaterialAuto(ln),
        base: "",
        posicion: "",
        ubicacion: "",
        sugeridas: [],
      };

      if (estadoUbic.auto && Array.isArray(estadoUbic.sugeridas) && estadoUbic.sugeridas.length > 0) {
        estadoUbic.sugeridas.forEach((sug, subIdx) => {
          filas.push(
            buildLineaExpandida({
              lineaOriginal: ln,
              idxLineaOriginal: idx,
              idxExpandido: subIdx,
              ubicacionData: sug,
              draft,
            })
          );
        });
      } else {
        filas.push({
          rowKey: `${idx}`,
          idx,
          idxLineaOriginal: idx,
          idxExpandido: 0,
          auto: estadoUbic.auto,
          base: estadoUbic.base,
          posicion: estadoUbic.posicion,
          ubicacion: estadoUbic.ubicacion,
          sugeridas: estadoUbic.sugeridas || [],
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
          cantidadRaw: cantidadPallets,
          cantidadFmt: formatQty(totalLinea),
          proveedor: (draft?.header?.proveedor || "").toString().trim(),
          documento: (draft?.header?.documento || "").toString().trim(),
          remesa: (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim(),
          ordenCompra: (draft?.header?.orden_compra || "").toString().trim(),
          lineaOriginal: ln,
        });
      }
    });

    return filas;
  }, [draft, ubicPorLinea]);

  if (!draft) return <div>Cargando...</div>;

  const onChangeBase = (idx, value) => {
    setUbicPorLinea((prev) => {
      const actual = prev[idx] || {};
      const next = {
        ...actual,
        base: value,
      };

      if (!actual.auto) {
        next.ubicacion = `${value || ""}${actual.posicion || ""}`;
      } else {
        next.sugeridas = [];
      }

      return { ...prev, [idx]: next };
    });
  };

  const onChangePosicion = (idx, value) => {
    setUbicPorLinea((prev) => {
      const actual = prev[idx] || {};
      return {
        ...prev,
        [idx]: {
          ...actual,
          posicion: value,
          ubicacion: `${actual.base || ""}${value || ""}`,
        },
      };
    });
  };

  const sugerirLinea = async (idx, cantidadRaw) => {
    const conf = ubicPorLinea[idx] || {};
    const base = (conf.base || "").trim();

    if (!base) {
      alert(`Selecciona ubicación base en la línea #${idx + 1}.`);
      return;
    }

    const cantidad = Number(cantidadRaw || 0);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      alert(`La línea #${idx + 1} debe tener cantidad entera > 0 para auto ubicación.`);
      return;
    }

    setSugiriendoLinea((p) => ({ ...p, [idx]: true }));

    try {
      const payload = {
        ubicacion_base: base,
        cantidad_pallets: cantidad,
      };

      const res = await fetch(`${API_URL}/ubicaciones/sugerir`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      let rawText = "";

      try {
        rawText = await res.text();
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          data?.detail ||
            rawText ||
            `Error ${res.status}: ${res.statusText || "No se pudo sugerir posiciones"}`
        );
      }

      const posiciones = Array.isArray(data?.posiciones) ? data.posiciones : [];

      if (posiciones.length !== cantidad) {
        throw new Error(
          `El sistema devolvió ${posiciones.length} posiciones y se necesitaban ${cantidad}.`
        );
      }

      setUbicPorLinea((prev) => ({
        ...prev,
        [idx]: {
          ...(prev[idx] || {}),
          sugeridas: posiciones,
        },
      }));
    } catch (e) {
      alert(`❌ Error sugiriendo línea #${idx + 1}:\n${e?.message || e}`);
    } finally {
      setSugiriendoLinea((p) => ({ ...p, [idx]: false }));
    }
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
      const ln = draft.lineas[i];
      const conf = ubicPorLinea[i] || {};
      const auto = esMaterialAuto(ln);

      if (auto) {
        if (!(conf.base || "").trim()) {
          return `Falta ubicación base en la línea #${i + 1}.`;
        }

        const cant = Number(ln.cantidad || 0);
        if (!Number.isInteger(cant) || cant <= 0) {
          return `La línea #${i + 1} debe tener cantidad entera > 0 para auto ubicación.`;
        }

        if (!Array.isArray(conf.sugeridas) || conf.sugeridas.length !== cant) {
          return `Debes generar sugerencia completa en la línea #${i + 1}.`;
        }
      } else {
        if (!(conf.base || "").trim()) {
          return `Falta ubicación base en la línea #${i + 1}.`;
        }
        if (!(conf.posicion || "").trim()) {
          return `Falta posición en la línea #${i + 1}.`;
        }
        if (!(conf.ubicacion || "").trim()) {
          return `No se pudo construir la ubicación final en la línea #${i + 1}.`;
        }
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
    const remesa = (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim();

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
    )
      .toString()
      .trim();

    const umbMovimiento = (linea.umb || draft?.header?.umb || "").toString().trim();

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
      cantidad_r: Number(opts.cantidad_r ?? linea.total ?? 0),
    };
  };

  const construirRotulosItems = () => {
    const serial = (draft?.header?.serial || "").toString().trim();
    const proveedor = (draft?.header?.proveedor || "").toString().trim();
    const documento = (draft?.header?.documento || "").toString().trim();
    const ordenCompra = (draft?.header?.orden_compra || "").toString().trim();
    const remesa = (draft?.header?.remesa || draft?.header?.remesa_transp || "").toString().trim();
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
      )
        .toString()
        .trim();

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
        umb: (linea.umb || draft?.header?.umb || "").toString().trim(),
        fecha_fabricacion: ff || null,
        fecha_vencimiento: fv || null,
        lote_proveedor: loteProv,
        lote_almacen: loteAlm,
      };
    });
  };

  const guardarRotulos = async () => {
    const rotulosItems = construirRotulosItems();

    const rotRes = await fetch(`${API_URL}/rotulos/bulk`, {
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
        const conf = ubicPorLinea[i] || {};
        const auto = esMaterialAuto(linea);

        if (auto) {
          for (const sug of conf.sugeridas || []) {
            const cantidadPallets = Number(linea.cantidad || 0);
            const totalLinea = Number(linea.total || 0);
            const valorUnitario =
              cantidadPallets > 0 ? totalLinea / cantidadPallets : 0;

            const payload = construirPayloadMovimiento(linea, i, {
              codigo_ubicacion: sug.ubicacion,
              estado: "ALMACENADO",
              cantidad_r: valorUnitario,
            });

            const res = await fetch(`${API_URL}/movimientos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt);
            }
          }
        } else {
          const ubic = (conf.ubicacion || "").trim();

          const payload = construirPayloadMovimiento(linea, i, {
            codigo_ubicacion: ubic,
            estado: "ALMACENADO",
            cantidad_r: Number(linea.total || 0),
          });

          const res = await fetch(`${API_URL}/movimientos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
          }
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
          cantidad_r: Number(linea.total || 0),
        });

        const res = await fetch(`${API_URL}/movimientos`, {
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: colors.muted, fontWeight: 900 }}>
            🔄 MOVIMIENTOS DESDE RECIBO
          </div>
          <h1 style={{ margin: "6px 0 0", color: colors.navy }}>
            Confirmación de movimientos
          </h1>
          <div style={{ marginTop: 6, color: colors.muted }}>
            Para lata/preforma/azúcar eliges base y el sistema sugiere posiciones.
            Para el resto eliges base + posición manual.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Chip label={`Líneas: ${draft.lineas.length}`} tone="blue" />
          <Chip label={`Serial: ${draft.header.serial || ""}`} tone="green" />
          {guardando && <Chip label="Guardando..." tone="amber" />}
        </div>
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>PROVEEDOR</div>
            <div style={{ marginTop: 4, fontWeight: 800, color: colors.text }}>
              {draft.header.proveedor}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>DOCUMENTO</div>
            <div style={{ marginTop: 4, fontWeight: 800, color: colors.text }}>
              {draft.header.documento}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>REMESA</div>
            <div style={{ marginTop: 4, fontWeight: 800, color: colors.text }}>
              {draft.header.remesa || draft.header.remesa_transp || ""}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>USUARIO</div>
            <div style={{ marginTop: 4, fontWeight: 800, color: colors.text }}>
              {draft.header.usuario}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>SERIAL (CITA)</div>
            <div style={{ marginTop: 4, fontWeight: 800, color: colors.text }}>
              {draft.header.serial}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: colors.muted, fontWeight: 900 }}>LÍNEAS</div>
            <div style={{ marginTop: 4, fontWeight: 800, color: colors.text }}>
              {draft.lineas.length}
            </div>
          </div>
        </div>
      </div>

      {ubicacionesError && (
        <div style={{ color: colors.bad, marginBottom: 10, fontWeight: 800 }}>
          Error cargando ubicaciones: {ubicacionesError}
        </div>
      )}

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: colors.muted, fontWeight: 800, fontSize: 12 }}>
          Acciones rápidas
        </div>

        <ActionButtons
          guardando={guardando}
          onBack={() => navigate("/movimientos/recibo")}
          onGuardar={guardarMovimientos}
          onTransito={guardarEnTransito}
        />
      </div>

      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 14px 34px rgba(2,6,23,.06)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 2600 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.border}` }}>
                <th style={{ padding: 12, textAlign: "left" }}>Modo</th>
                <th style={{ padding: 12, textAlign: "left" }}>Ubicación base</th>
                <th style={{ padding: 12, textAlign: "left" }}>Posición manual</th>
                <th style={{ padding: 12, textAlign: "left" }}>Ubicación final / sugeridas</th>
                <th style={{ padding: 12, textAlign: "left" }}>Fecha</th>
                <th style={{ padding: 12, textAlign: "left" }}>Movimiento</th>
                <th style={{ padding: 12, textAlign: "left" }}>ID</th>
                <th style={{ padding: 12, textAlign: "left" }}>Usuario</th>
                <th style={{ padding: 12, textAlign: "left" }}>Codigo Cita</th>
                <th style={{ padding: 12, textAlign: "left" }}>SKU</th>
                <th style={{ padding: 12, textAlign: "left" }}>Texto Breve del Material</th>
                <th style={{ padding: 12, textAlign: "left" }}>Lote Almacen</th>
                <th style={{ padding: 12, textAlign: "left" }}>Lote Proveedor</th>
                <th style={{ padding: 12, textAlign: "left" }}>Fecha de Fabricación</th>
                <th style={{ padding: 12, textAlign: "left" }}>Fecha de Vencimiento</th>
                <th style={{ padding: 12, textAlign: "left" }}>Semana</th>
                <th style={{ padding: 12, textAlign: "left" }}>UM</th>
                <th style={{ padding: 12, textAlign: "left" }}>UMB</th>
                <th style={{ padding: 12, textAlign: "right" }}>Cantidad</th>
              </tr>
            </thead>

            <tbody>
              {filasMov.map((r) => {
                const posicionesManual = posicionesPorBase[r.base] || [];
                const editableManual = !r.auto;

                return (
                  <tr key={r.rowKey} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 12 }}>
                      {r.auto ? (
                        <Chip label="AUTO" tone="amber" />
                      ) : (
                        <Chip label="MANUAL" tone="blue" />
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      <select
                        value={r.base}
                        onChange={(e) => onChangeBase(r.idxLineaOriginal, e.target.value)}
                        style={{ width: 130 }}
                        disabled={r.auto && r.sugeridas.length > 0}
                      >
                        <option value="">Seleccione...</option>
                        {basesDisponibles.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: 12 }}>
                      {r.auto ? (
                        <input
                          value={r.posicion}
                          readOnly
                          style={{ width: 140, background: "#f3f3f3" }}
                        />
                      ) : (
                        <select
                          value={r.posicion}
                          onChange={(e) => onChangePosicion(r.idxLineaOriginal, e.target.value)}
                          style={{ width: 140 }}
                          disabled={!r.base || !editableManual}
                        >
                          <option value="">Seleccione...</option>
                          {posicionesManual.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      {r.auto && r.sugeridas.length === 0 ? (
                        <div>
                          <button
                            onClick={() => sugerirLinea(r.idxLineaOriginal, r.cantidadRaw)}
                            disabled={!!sugiriendoLinea[r.idxLineaOriginal] || !r.base}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "none",
                              background: colors.warn,
                              color: "#fff",
                              fontWeight: 900,
                              cursor: !r.base ? "not-allowed" : "pointer",
                              opacity: !r.base ? 0.6 : 1,
                            }}
                          >
                            {sugiriendoLinea[r.idxLineaOriginal] ? "Sugiriendo..." : "Sugerir"}
                          </button>

                          <div style={{ marginTop: 8, fontSize: 12, color: colors.text, fontWeight: 700 }}>
                            Sin sugerencia
                          </div>
                        </div>
                      ) : (
                        <input
                          value={r.ubicacion}
                          readOnly
                          style={{ width: 160, background: "#f3f3f3" }}
                        />
                      )}
                    </td>

                    <td style={{ padding: 12 }}>
                      <input value={r.fecha} readOnly style={{ width: 110, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.movimiento} readOnly style={{ width: 110, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.id} readOnly style={{ width: 80, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.usuario} readOnly style={{ width: 170, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.codigoCita} readOnly style={{ width: 120, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.sku} readOnly style={{ width: 110, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.texto} readOnly style={{ width: 360, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.loteAlm} readOnly style={{ width: 160, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.loteProv} readOnly style={{ width: 130, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.ff} readOnly style={{ width: 130, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.fv} readOnly style={{ width: 130, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.numeroSemana} readOnly style={{ width: 80, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.um} readOnly style={{ width: 100, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input value={r.umb} readOnly style={{ width: 100, background: "#f3f3f3" }} />
                    </td>
                    <td style={{ padding: 12 }}>
                      <input
                        value={r.cantidadFmt}
                        readOnly
                        style={{ width: 130, background: "#f3f3f3", textAlign: "right" }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <ActionButtons
          guardando={guardando}
          onBack={() => navigate("/movimientos/recibo")}
          onGuardar={guardarMovimientos}
          onTransito={guardarEnTransito}
        />
      </div>
    </div>
  );
}