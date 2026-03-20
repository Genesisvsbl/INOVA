import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, getProveedores } from "../../api";
import {
  Inbox,
  RotateCcw,
  Printer,
  Save,
  Plus,
  Trash2,
  User,
  FileText,
  Truck,
  CalendarDays,
  Package,
} from "lucide-react";

// ===== Helpers =====
function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function clampMaxLen(s, max) {
  const str = (s ?? "").toString();
  return str.length > max ? str.slice(0, max) : str;
}

function onlyAlnumAndStar(s) {
  return (s ?? "").toString().replace(/[^a-zA-Z0-9*]/g, "");
}
function limit10(s) {
  return onlyAlnumAndStar(s).slice(0, 10);
}
function pad10WithStars(s) {
  const v = limit10(s);
  return (v + "**********").slice(0, 10);
}
function pad10WithStarsAny(s) {
  const v = limit10(s);
  return (v + "**********").slice(0, 10);
}

function serialItem(serial, idx) {
  return `${serial}-${String(idx + 1).padStart(2, "0")}`;
}

function formatDateDisplay(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const short = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(short)) return short;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDots(v) {
  const iso = formatDateDisplay(v);
  if (!iso) return "";
  return iso.replaceAll("-", ".");
}

function cleanBarcodeValue(v) {
  return String(v ?? "")
    .trim()
    .replaceAll("*", "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return fmtCO.format(x);
}

const USUARIOS = {
  "*768*": "Darwin Herrera",
  "*999*": "Admin",
};

const EMPAQUES = ["CAJA", "CANECA", "ROLLO", "BULTO", "PALLETS", "ISOTANQUES", "BIG BAG"];

const DRAFT_KEY = "wms_recibo_draft";

function createEmptyLinea() {
  return {
    fecha_recepcion: todayISODate(),
    codigo: "",
    descripcion: "",
    empaque: "",
    umb: "",
    umb_bloqueado: false,
    unidad_material: null,
    um: "",
    cantidad: "",
    total: 0,
    lote_proveedor: "",
    fecha_fabricacion: "",
    fecha_vencimiento: "",
    lote: "",
  };
}

function createInitialHeader() {
  return {
    serial: "13003",
    proveedor_id: "",
    proveedor: "",
    acreedor: "",
    remesa_transp: "",
    documento: "",
    orden_compra: "",
    fecha_recepcion: todayISODate(),
  };
}

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  text: "#1f2d3d",
  muted: "#6b7a90",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#2f6f44",
  goodBg: "#edf8f1",
  goodBd: "#cfe8d7",
  bad: "#b42318",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
  warn: "#9a6700",
  warnBg: "#fff6e5",
  warnBd: "#f1ddb0",
  infoBg: "#eaf3ff",
  infoBd: "#cfe0ff",
};

const panelStyle = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  overflow: "hidden",
};

const panelHeaderStyle = {
  padding: "12px 14px",
  borderBottom: `1px solid ${colors.border}`,
  background: colors.soft,
  fontWeight: 700,
  color: "#1f3448",
  fontSize: 14,
};

const panelBodyStyle = {
  padding: 16,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#7a8797",
  letterSpacing: ".04em",
  marginBottom: 6,
  textTransform: "uppercase",
};

const inputStyle = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  outline: "none",
  background: "#fff",
  color: colors.text,
  fontSize: 13,
  fontWeight: 500,
  boxSizing: "border-box",
};

const readOnlyInputStyle = {
  ...inputStyle,
  background: "#f8fafc",
};

const selectStyle = {
  ...inputStyle,
};

const primaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #0b57d0",
  background: "#0b57d0",
  color: "#fff",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const warnButtonStyle = {
  height: 38,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #e6a700",
  background: "#f59e0b",
  color: "#fff",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const dangerButtonStyle = {
  height: 32,
  padding: "0 10px",
  borderRadius: 7,
  border: `1px solid ${colors.badBd}`,
  background: colors.badBg,
  color: colors.bad,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 12,
};

function StatusChip({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#f1f5f9", bd: "#e2e8f0", tx: colors.text },
    blue: { bg: colors.infoBg, bd: colors.infoBd, tx: colors.blue },
    green: { bg: colors.goodBg, bd: colors.goodBd, tx: colors.good },
    amber: { bg: colors.warnBg, bd: colors.warnBd, tx: colors.warn },
    red: { bg: colors.badBg, bd: colors.badBd, tx: colors.bad },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
        background: t.bg,
        color: t.tx,
      }}
    >
      {label}
    </span>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 12,
  color: "#607080",
  borderBottom: `1px solid ${colors.border}`,
  fontWeight: 700,
  whiteSpace: "nowrap",
  background: "#fbfcfd",
};

const tdStyle = {
  padding: "12px 14px",
  borderBottom: "1px solid #edf2f7",
  color: "#24384d",
  whiteSpace: "nowrap",
  fontSize: 13,
  verticalAlign: "top",
};

export default function Recibo() {
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [usuario, setUsuario] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresError, setProveedoresError] = useState("");
  const [tipoRecibo, setTipoRecibo] = useState("");
  const [header, setHeader] = useState(createInitialHeader());
  const [materiales, setMateriales] = useState([]);
  const [lineas, setLineas] = useState([createEmptyLinea()]);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("wms_user");
    if (saved) {
      setUsuario(saved);
      return;
    }
    const clave = prompt('Ingrese su clave (ej: "*768*")');
    const nombre = USUARIOS[clave?.trim()] || "";
    if (!nombre) {
      alert("Clave inválida.");
      return;
    }
    localStorage.setItem("wms_user", nombre);
    setUsuario(nombre);
  }, []);

  useEffect(() => {
    getProveedores()
      .then((data) => {
        setProveedores(Array.isArray(data) ? data : []);
        setProveedoresError("");
      })
      .catch((e) => {
        setProveedores([]);
        setProveedoresError(String(e));
      });
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/materiales?limit=1000`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => setMateriales(Array.isArray(data) ? data : []))
      .catch(() => setMateriales([]));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);

      if (d?.header) {
        setHeader({
          ...createInitialHeader(),
          ...d.header,
          remesa_transp: "",
          documento: "",
          orden_compra: "",
        });
      }

      if (Array.isArray(d?.lineas) && d.lineas.length) {
        setLineas(
          d.lineas.map((ln) => ({
            umb_bloqueado: false,
            unidad_material: null,
            ...ln,
          }))
        );
      }
    } catch {
      // nada
    }

    setTipoRecibo("");
  }, []);

  useEffect(() => {
    if (tipoRecibo === "devolucion") {
      setHeader((prev) => ({
        ...prev,
        remesa_transp: "**********",
        orden_compra: "**********",
      }));

      setErrores((prev) => {
        const copy = { ...prev };
        delete copy.remesa_transp;
        delete copy.orden_compra;
        return copy;
      });
    }

    if (tipoRecibo === "recibo") {
      setHeader((prev) => ({
        ...prev,
        remesa_transp: prev.remesa_transp === "**********" ? "" : prev.remesa_transp,
        orden_compra: prev.orden_compra === "**********" ? "" : prev.orden_compra,
      }));
    }
  }, [tipoRecibo]);

  const totalRecibo = useMemo(
    () => lineas.reduce((acc, ln) => acc + (Number(ln.total) || 0), 0),
    [lineas]
  );

  const setHeaderField = (k, v) => setHeader((prev) => ({ ...prev, [k]: v }));

  const onProveedorSelect = (proveedorId) => {
    const p = proveedores.find((x) => String(x.id) === String(proveedorId));
    setHeader((prev) => ({
      ...prev,
      proveedor_id: proveedorId,
      proveedor: p ? p.nombre : "",
      acreedor: p ? p.acreedor : "",
    }));
  };

  const onField10Change = (key, raw) => {
    const v = limit10(raw);
    setHeaderField(key, v);

    if ((raw ?? "").toString().length > 10) {
      setErrores((e) => ({ ...e, [key]: "Máximo 10 caracteres." }));
    } else {
      setErrores((e) => {
        const copy = { ...e };
        delete copy[key];
        return copy;
      });
    }
  };

  const onField10Blur = (key) => {
    if (tipoRecibo === "devolucion" && (key === "remesa_transp" || key === "orden_compra")) {
      setHeaderField(key, "**********");
      return;
    }
    setHeaderField(key, pad10WithStars(header[key]));
  };

  const setLinea = (idx, patch) => {
    setLineas((prev) => prev.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  };

  const addLinea = () => {
    setLineas((prev) => [...prev, createEmptyLinea()]);
  };

  const removeLinea = (idx) => setLineas((prev) => prev.filter((_, i) => i !== idx));

  const recomputeTotal = (umb, cantidad) => {
    const u = Number(umb);
    const c = Number(cantidad);
    if (!Number.isFinite(u) || !Number.isFinite(c)) return 0;
    return u * c;
  };

  const onCodigoChange = (idx, codigo) => {
    const code = codigo.trim();
    const mat = materiales.find((m) => m.codigo === code);

    const unidadMaterial = mat?.unidad ?? null;
    const unidadNumero = Number(unidadMaterial);
    const bloquearUmb = Number.isFinite(unidadNumero) && unidadNumero > 1;
    const umbFinal = bloquearUmb ? String(unidadNumero) : "";

    setLinea(idx, {
      codigo: code,
      descripcion: mat ? mat.descripcion : "",
      unidad_material: unidadMaterial,
      umb: umbFinal,
      umb_bloqueado: bloquearUmb,
      um: mat ? mat.unidad_medida : "",
      total: recomputeTotal(umbFinal, lineas[idx]?.cantidad),
    });
  };

  const onUmbChange = (idx, value) => {
    setLineas((prev) =>
      prev.map((ln, i) => {
        if (i !== idx) return ln;
        if (ln.umb_bloqueado) return ln;

        return {
          ...ln,
          umb: value,
          total: recomputeTotal(value, ln.cantidad),
        };
      })
    );
  };

  const onCantidadChange = (idx, value) => {
    setLineas((prev) =>
      prev.map((ln, i) =>
        i === idx ? { ...ln, cantidad: value, total: recomputeTotal(ln.umb, value) } : ln
      )
    );
  };

  const onLoteProveedorChange = (idx, value) => {
    const clamped = limit10(value);
    setLinea(idx, {
      lote_proveedor: clamped,
      lote: "",
    });

    if ((value ?? "").toString().length > 10) {
      setErrores((e) => ({ ...e, [`loteprov_${idx}`]: "Lote proveedor máximo 10 caracteres." }));
    } else {
      setErrores((e) => {
        const copy = { ...e };
        delete copy[`loteprov_${idx}`];
        return copy;
      });
    }
  };

  const validarAntesDeContinuar = () => {
    const errs = {};

    if (!tipoRecibo) errs.tipoRecibo = "Debes seleccionar Recibo o Devolución.";

    ["documento"].forEach((k) => {
      if (!header[k] || header[k].length !== 10) {
        errs[k] = "Debe quedar exactamente de 10 caracteres (se rellena con *).";
      }
    });

    if (tipoRecibo === "recibo") {
      ["remesa_transp", "orden_compra"].forEach((k) => {
        if (!header[k] || header[k].length !== 10) {
          errs[k] = "Debe quedar exactamente de 10 caracteres (se rellena con *).";
        }
      });
    }

    if (tipoRecibo === "devolucion") {
      if (header.remesa_transp !== "**********") {
        errs.remesa_transp = "En devolución debe quedar en **********.";
      }
      if (header.orden_compra !== "**********") {
        errs.orden_compra = "En devolución debe quedar en **********.";
      }
    }

    if (!header.proveedor_id) errs.proveedor = "Proveedor obligatorio.";
    if (!header.acreedor) errs.acreedor = "Acreedor obligatorio.";
    if (!usuario) errs.usuario = "Usuario no identificado (clave).";

    lineas.forEach((ln, idx) => {
      if (!ln.codigo) errs[`codigo_${idx}`] = "Código obligatorio.";
      if (!ln.empaque) errs[`empaque_${idx}`] = "Empaque obligatorio.";
      if (!ln.cantidad || Number(ln.cantidad) <= 0) errs[`cantidad_${idx}`] = "Cantidad > 0 obligatoria.";
      if (!ln.umb || Number(ln.umb) <= 0) errs[`umb_${idx}`] = "UMB (valor) > 0 obligatoria.";

      if ((ln.lote_proveedor ?? "").toString().trim().length !== 10) {
        errs[`loteprov_${idx}`] = "Lote proveedor debe ser exactamente 10.";
      }
      if (!ln.fecha_vencimiento) errs[`fv_${idx}`] = "Fecha vencimiento obligatoria.";
    });

    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const onGuardarRecibo = async () => {
    if (!tipoRecibo) {
      alert("Debes seleccionar primero Recibo o Devolución.");
      return;
    }

    if (tipoRecibo === "devolucion") {
      setHeader((prev) => ({
        ...prev,
        remesa_transp: "**********",
        orden_compra: "**********",
        documento: pad10WithStars(prev.documento),
      }));
    } else {
      ["remesa_transp", "documento", "orden_compra"].forEach((k) => {
        setHeaderField(k, pad10WithStars(header[k]));
      });
    }

    setTimeout(() => {
      if (!validarAntesDeContinuar()) {
        alert("Hay errores. Revisa los campos marcados.");
        return;
      }

      const codigo_cita = header.serial;

      const headerFinal =
        tipoRecibo === "devolucion"
          ? {
              ...header,
              remesa_transp: "**********",
              orden_compra: "**********",
              documento: pad10WithStars(header.documento),
            }
          : {
              ...header,
              remesa_transp: pad10WithStars(header.remesa_transp),
              documento: pad10WithStars(header.documento),
              orden_compra: pad10WithStars(header.orden_compra),
            };

      const draft = {
        tipo: "ENTRADA",
        tipoRecibo,
        header: { ...headerFinal, usuario, codigo_cita },
        lineas: lineas.map((ln) => ({
          ...ln,
          lote: "",
          lote_proveedor: pad10WithStarsAny(ln.lote_proveedor),
          fecha_fabricacion: ln.fecha_fabricacion || "",
          fecha_vencimiento: ln.fecha_vencimiento || "",
        })),
        totalRecibo,
        createdAtISO: new Date().toISOString(),
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      navigate("/movimientos/desde-recibo");
    }, 0);
  };

  const buildReciboRowsHtml = () => {
    return lineas
      .map((ln, idx) => {
        const serial = serialItem(header.serial, idx);
        return `
          <tr>
            <td>${escapeHtml(serial)}</td>
            <td>${idx + 1}</td>
            <td>${escapeHtml(formatDateDisplay(ln.fecha_recepcion))}</td>
            <td>${escapeHtml(ln.codigo)}</td>
            <td>${escapeHtml(ln.descripcion)}</td>
            <td>${escapeHtml(ln.empaque)}</td>
            <td style="text-align:right;">${escapeHtml(ln.umb)}</td>
            <td>${escapeHtml(ln.um)}</td>
            <td style="text-align:right;">${escapeHtml(ln.cantidad)}</td>
            <td style="text-align:right;">${escapeHtml(formatMoney(ln.total || 0))}</td>
            <td>${escapeHtml(ln.lote_proveedor)}</td>
            <td>${escapeHtml(formatDateDisplay(ln.fecha_fabricacion))}</td>
            <td>${escapeHtml(formatDateDisplay(ln.fecha_vencimiento))}</td>
          </tr>
        `;
      })
      .join("");
  };

  const buildTarjetasHtml = () => {
    return lineas
      .map((ln, idx) => {
        const serial = serialItem(header.serial, idx);
        const codigo = (ln.codigo || "").trim();
        const cantidad = formatMoney(ln.total || 0);
        const fechaVenc = formatDateDots(ln.fecha_vencimiento);
        const loteProveedorClean = cleanBarcodeValue(ln.lote_proveedor || "");

        return `
          <div class="card">
            <div class="card-head">
              <div class="card-logo-wrap">
                <div class="card-logo">
                  <img src="/INOVA.png" alt="INOVA" />
                </div>
                <div class="card-brand">
                  <div class="card-brand-title">WMS INOVA</div>
                  <div class="card-brand-sub">Tarjeta de identificación</div>
                </div>
              </div>

              <div class="card-serial-box">
                <div class="mini-label"># SERIAL</div>
                <div class="serial-big">${escapeHtml(serial)}</div>
              </div>
            </div>

            <div class="row top-inline">
              <div class="half">
                <div class="mini-label">CÓDIGO</div>
                <div class="value-big left">${escapeHtml(codigo || "-")}</div>
              </div>
              <div class="half right-align">
                <div class="mini-label">CANTIDAD</div>
                <div class="value-big">${escapeHtml(cantidad || "0,00")}</div>
              </div>
            </div>

            <div class="barcode-block">
              <div class="mini-label">FECHA VENCIMIENTO</div>
              <svg id="barcode-fv-${idx}"></svg>
              <div class="barcode-text">${escapeHtml(fechaVenc || "-")}</div>
            </div>

            <div class="barcode-block">
              <div class="mini-label">LOTE PROVEEDOR</div>
              <svg id="barcode-lp-${idx}"></svg>
              <div class="barcode-text">${escapeHtml(loteProveedorClean || "-")}</div>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const buildBarcodeScript = () => {
    return lineas
      .map((ln, idx) => {
        const fechaVenc = JSON.stringify(formatDateDots(ln.fecha_vencimiento) || "SIN.FECHA");
        const loteProveedorClean = JSON.stringify(cleanBarcodeValue(ln.lote_proveedor || "") || "VACIO");

        return `
          try {
            JsBarcode("#barcode-fv-${idx}", ${fechaVenc}, {
              format: "CODE128",
              displayValue: false,
              height: 52,
              width: 1.5,
              margin: 0
            });
          } catch (e) {
            console.error("Error barcode fecha vencimiento ${idx}", e);
          }

          try {
            JsBarcode("#barcode-lp-${idx}", ${loteProveedorClean}, {
              format: "CODE128",
              displayValue: false,
              height: 52,
              width: 1.5,
              margin: 0
            });
          } catch (e) {
            console.error("Error barcode lote proveedor ${idx}", e);
          }
        `;
      })
      .join("\n");
  };

  const onImprimir = () => {
    if (!tipoRecibo) {
      alert("Debes seleccionar primero Recibo o Devolución.");
      return;
    }

    const w = window.open("", "_blank", "width=1600,height=1000");
    if (!w) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    const proveedorNombre =
      proveedores.find((x) => String(x.id) === String(header.proveedor_id))?.nombre ||
      header.proveedor ||
      "";

    const reciboRowsHtml = buildReciboRowsHtml();
    const tarjetasHtml = buildTarjetasHtml();
    const barcodeScript = buildBarcodeScript();

    const html = `
      <html>
        <head>
          <title>${escapeHtml(tipoRecibo === "devolucion" ? "Devolución" : "Recibo ciego")} - ${escapeHtml(header.serial)}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              padding: 24px;
            }
            h1, h2, h3, p { margin: 0; }
            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              margin-bottom: 20px;
              border-bottom: 2px solid #0f2744;
              padding-bottom: 12px;
            }
            .print-title {
              font-size: 24px;
              font-weight: 900;
              color: #0f2744;
            }
            .print-sub {
              margin-top: 6px;
              font-size: 12px;
              color: #64748b;
            }
            .meta {
              font-size: 12px;
              text-align: right;
              line-height: 1.6;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(180px, 1fr));
              gap: 12px;
              margin-bottom: 18px;
            }
            .box {
              border: 1px solid #d9e2ec;
              border-radius: 10px;
              padding: 10px 12px;
            }
            .box-label {
              font-size: 11px;
              font-weight: 800;
              color: #64748b;
            }
            .box-value {
              margin-top: 4px;
              font-size: 16px;
              font-weight: 800;
              color: #0f2744;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 22px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #d9e2ec;
              padding: 6px 8px;
              vertical-align: top;
            }
            th {
              background: #f8fafc;
              text-align: left;
              font-weight: 800;
            }
            .cards-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 14px;
            }
            .card {
              border: 1px solid #d9e2ec;
              border-radius: 12px;
              padding: 14px;
              page-break-inside: avoid;
            }
            .card-head {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 12px;
              margin-bottom: 12px;
            }
            .card-logo-wrap {
              display: flex;
              gap: 10px;
              align-items: center;
            }
            .card-logo {
              width: 56px;
              height: 56px;
              border: 1px solid #d9e2ec;
              border-radius: 10px;
              display: grid;
              place-items: center;
              overflow: hidden;
            }
            .card-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .card-brand-title {
              font-size: 14px;
              font-weight: 900;
              color: #0f2744;
            }
            .card-brand-sub {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .card-serial-box {
              min-width: 150px;
              text-align: right;
            }
            .mini-label {
              font-size: 10px;
              color: #64748b;
              font-weight: 800;
              letter-spacing: .04em;
            }
            .serial-big {
              font-size: 18px;
              font-weight: 900;
              color: #0f2744;
              margin-top: 4px;
            }
            .row.top-inline {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 12px;
            }
            .half {
              flex: 1;
            }
            .right-align {
              text-align: right;
            }
            .value-big {
              font-size: 18px;
              font-weight: 900;
              color: #0f2744;
              margin-top: 4px;
            }
            .value-big.left {
              text-align: left;
            }
            .barcode-block {
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
              margin-top: 10px;
            }
            .barcode-text {
              margin-top: 6px;
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div>
              <div class="print-title">${escapeHtml(tipoRecibo === "devolucion" ? "DEVOLUCIÓN" : "RECIBO CIEGO")}</div>
              <div class="print-sub">Proveedor: ${escapeHtml(proveedorNombre)} | Serial: ${escapeHtml(header.serial)}</div>
            </div>
            <div class="meta">
              <div><b>Usuario:</b> ${escapeHtml(usuario)}</div>
              <div><b>Documento:</b> ${escapeHtml(header.documento)}</div>
              <div><b>Fecha:</b> ${escapeHtml(header.fecha_recepcion)}</div>
            </div>
          </div>

          <div class="summary">
            <div class="box">
              <div class="box-label">PROVEEDOR</div>
              <div class="box-value">${escapeHtml(proveedorNombre || "-")}</div>
            </div>
            <div class="box">
              <div class="box-label">SERIAL</div>
              <div class="box-value">${escapeHtml(header.serial || "-")}</div>
            </div>
            <div class="box">
              <div class="box-label">LÍNEAS</div>
              <div class="box-value">${lineas.length}</div>
            </div>
            <div class="box">
              <div class="box-label">TOTAL</div>
              <div class="box-value">${escapeHtml(formatMoney(totalRecibo))}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th># Serial</th>
                <th>Item</th>
                <th>Fecha Recepción</th>
                <th>Código</th>
                <th>Texto breve material</th>
                <th>Empaque</th>
                <th>UMB</th>
                <th>UM</th>
                <th>Cantidad</th>
                <th>Total</th>
                <th>Lote Proveedor</th>
                <th>F. Fabricación</th>
                <th>F. Vencimiento</th>
              </tr>
            </thead>
            <tbody>${reciboRowsHtml}</tbody>
          </table>

          <div class="cards-grid">${tarjetasHtml}</div>

          <script>
            ${barcodeScript}
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const selectedTipoLabel =
    !tipoRecibo ? "Selecciona tipo de movimiento" : tipoRecibo === "devolucion" ? "Devolución" : "Recibo ciego";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={panelStyle}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${colors.border}`,
            background: "linear-gradient(to bottom, #fbfcfd, #f5f8fb)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: "#eaf1f8",
                border: "1px solid #d6e1ec",
                flexShrink: 0,
              }}
            >
              {tipoRecibo === "devolucion" ? (
                <RotateCcw size={18} color="#315a7d" />
              ) : (
                <Inbox size={18} color="#315a7d" />
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  color: "#7a8797",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Recibo
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#17324d",
                }}
              >
                {selectedTipoLabel}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#5b6b7c",
                  marginTop: 4,
                }}
              >
                Registro de entrada con impresión, trazabilidad y preparación para asignación de ubicación.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tipoRecibo && (
              <>
                <button onClick={onImprimir} style={secondaryButtonStyle}>
                  <Printer size={15} />
                  Imprimir
                </button>
                <button onClick={onGuardarRecibo} style={primaryButtonStyle}>
                  <Save size={15} />
                  Guardar y asignar ubicación
                </button>
              </>
            )}
          </div>
        </div>

        <div style={panelBodyStyle}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => setTipoRecibo("recibo")}
              style={{
                ...secondaryButtonStyle,
                borderColor: tipoRecibo === "recibo" ? "#cfe0ff" : colors.border,
                background: tipoRecibo === "recibo" ? "#eaf3ff" : "#fff",
                color: tipoRecibo === "recibo" ? colors.blue : colors.text,
              }}
            >
              <Inbox size={15} />
              Recibo
            </button>

            <button
              type="button"
              onClick={() => setTipoRecibo("devolucion")}
              style={{
                ...secondaryButtonStyle,
                borderColor: tipoRecibo === "devolucion" ? "#cfe0ff" : colors.border,
                background: tipoRecibo === "devolucion" ? "#eaf3ff" : "#fff",
                color: tipoRecibo === "devolucion" ? colors.blue : colors.text,
              }}
            >
              <RotateCcw size={15} />
              Devolución
            </button>

            {!tipoRecibo && <StatusChip label="Debes seleccionar tipo" tone="amber" />}
            {tipoRecibo === "recibo" && <StatusChip label="Modo recibo" tone="blue" />}
            {tipoRecibo === "devolucion" && <StatusChip label="Modo devolución" tone="green" />}
          </div>

          {!!errores.tipoRecibo && (
            <div
              style={{
                marginBottom: 12,
                color: colors.bad,
                background: colors.badBg,
                border: `1px solid ${colors.badBd}`,
                borderRadius: 8,
                padding: "10px 12px",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {errores.tipoRecibo}
            </div>
          )}

          {!tipoRecibo && (
            <div
              style={{
                border: `1px dashed ${colors.border}`,
                borderRadius: 10,
                padding: 24,
                background: "#f8fafc",
                textAlign: "center",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              Selecciona primero <b>Recibo</b> o <b>Devolución</b> para continuar.
            </div>
          )}
        </div>
      </div>

      {tipoRecibo && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>Cabecera del documento</div>
              <div style={panelBodyStyle}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={fieldLabelStyle}>Usuario</div>
                    <div
                      style={{
                        ...readOnlyInputStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <User size={14} color={colors.muted} />
                      <span>{usuario || "(sin usuario)"}</span>
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Serial</div>
                    <input
                      value={header.serial}
                      onChange={(e) => setHeaderField("serial", clampMaxLen(e.target.value, 10))}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Proveedor</div>
                    <select
                      value={header.proveedor_id}
                      onChange={(e) => onProveedorSelect(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Seleccione proveedor...</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                    {!!errores.proveedor && (
                      <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                        {errores.proveedor}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Acreedor</div>
                    <input
                      value={header.acreedor}
                      readOnly
                      placeholder="Auto por proveedor"
                      style={readOnlyInputStyle}
                    />
                    {!!errores.acreedor && (
                      <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                        {errores.acreedor}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Fecha recepción</div>
                    <div
                      style={{
                        ...readOnlyInputStyle,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CalendarDays size={14} color={colors.muted} />
                      <span>{header.fecha_recepcion}</span>
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Total recibo</div>
                    <div
                      style={{
                        ...readOnlyInputStyle,
                        fontWeight: 800,
                        color: colors.navy,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {formatMoney(totalRecibo)}
                    </div>
                  </div>
                </div>

                {proveedoresError && (
                  <div
                    style={{
                      marginTop: 12,
                      color: colors.bad,
                      background: colors.badBg,
                      border: `1px solid ${colors.badBd}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    Error cargando proveedores: {proveedoresError}
                  </div>
                )}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={panelHeaderStyle}>Campos de referencia</div>
              <div style={panelBodyStyle}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={fieldLabelStyle}>Remesa transporte (10)</div>
                    <input
                      value={header.remesa_transp}
                      onChange={(e) => onField10Change("remesa_transp", e.target.value)}
                      onBlur={() => onField10Blur("remesa_transp")}
                      maxLength={10}
                      disabled={tipoRecibo === "devolucion"}
                      style={{
                        ...inputStyle,
                        background: tipoRecibo === "devolucion" ? "#f8fafc" : "#fff",
                      }}
                    />
                    {!!errores.remesa_transp && (
                      <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                        {errores.remesa_transp}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Documento (10)</div>
                    <input
                      value={header.documento}
                      onChange={(e) => onField10Change("documento", e.target.value)}
                      onBlur={() => onField10Blur("documento")}
                      maxLength={10}
                      style={inputStyle}
                    />
                    {!!errores.documento && (
                      <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                        {errores.documento}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={fieldLabelStyle}>Orden de compra (10)</div>
                    <input
                      value={header.orden_compra}
                      onChange={(e) => onField10Change("orden_compra", e.target.value)}
                      onBlur={() => onField10Blur("orden_compra")}
                      maxLength={10}
                      disabled={tipoRecibo === "devolucion"}
                      style={{
                        ...inputStyle,
                        background: tipoRecibo === "devolucion" ? "#f8fafc" : "#fff",
                      }}
                    />
                    {!!errores.orden_compra && (
                      <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                        {errores.orden_compra}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <StatusChip label={`Líneas: ${lineas.length}`} tone="blue" />
                    <StatusChip label={`Usuario: ${usuario || "-"}`} tone="green" />
                    {tipoRecibo === "devolucion" && <StatusChip label="Remesa y OC bloqueadas" tone="amber" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div ref={printRef} style={panelStyle}>
            <div
              style={{
                ...panelHeaderStyle,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>Detalle de líneas</div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addLinea} style={secondaryButtonStyle}>
                  <Plus size={15} />
                  Agregar línea
                </button>
                <button onClick={onImprimir} style={secondaryButtonStyle}>
                  <Printer size={15} />
                  Imprimir
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1850 }}>
                <thead>
                  <tr>
                    <th style={thStyle}># Serial</th>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Fecha recepción</th>
                    <th style={thStyle}>Código</th>
                    <th style={thStyle}>Texto breve material</th>
                    <th style={thStyle}>Empaque</th>
                    <th style={thStyle}>UMB</th>
                    <th style={thStyle}>UM</th>
                    <th style={thStyle}>Cantidad</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>Lote proveedor (10)</th>
                    <th style={thStyle}>Fecha fabricación</th>
                    <th style={thStyle}>Fecha vencimiento</th>
                    <th style={thStyle}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((ln, idx) => (
                    <tr key={idx}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: colors.navy }}>
                          {serialItem(header.serial, idx)}
                        </div>
                      </td>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={ln.fecha_recepcion}
                          readOnly
                          style={{ ...readOnlyInputStyle, width: 145 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          list="materialesList"
                          value={ln.codigo}
                          onChange={(e) => onCodigoChange(idx, e.target.value)}
                          placeholder="Código"
                          style={{ ...inputStyle, width: 130 }}
                        />
                        {!!errores[`codigo_${idx}`] && (
                          <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                            {errores[`codigo_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={ln.descripcion}
                          readOnly
                          style={{ ...readOnlyInputStyle, width: 280 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={ln.empaque}
                          onChange={(e) => setLinea(idx, { empaque: e.target.value })}
                          style={{ ...selectStyle, width: 150 }}
                        >
                          <option value="">Seleccione...</option>
                          {EMPAQUES.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                        {!!errores[`empaque_${idx}`] && (
                          <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                            {errores[`empaque_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          value={ln.umb}
                          onChange={(e) => onUmbChange(idx, e.target.value)}
                          readOnly={ln.umb_bloqueado}
                          style={{
                            ...(ln.umb_bloqueado ? readOnlyInputStyle : inputStyle),
                            width: 95,
                          }}
                        />
                        {!!errores[`umb_${idx}`] && (
                          <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                            {errores[`umb_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={ln.um}
                          readOnly
                          style={{ ...readOnlyInputStyle, width: 95 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          value={ln.cantidad}
                          onChange={(e) => onCantidadChange(idx, e.target.value)}
                          style={{ ...inputStyle, width: 115 }}
                        />
                        {!!errores[`cantidad_${idx}`] && (
                          <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                            {errores[`cantidad_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={formatMoney(ln.total || 0)}
                          readOnly
                          style={{ ...readOnlyInputStyle, width: 125 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={ln.lote_proveedor}
                          onChange={(e) => onLoteProveedorChange(idx, e.target.value)}
                          onBlur={() =>
                            setLinea(idx, { lote_proveedor: pad10WithStarsAny(ln.lote_proveedor) })
                          }
                          maxLength={10}
                          placeholder="10 caracteres"
                          style={{ ...inputStyle, width: 165 }}
                        />
                        {!!errores[`loteprov_${idx}`] && (
                          <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                            {errores[`loteprov_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={ln.fecha_fabricacion}
                          onChange={(e) => setLinea(idx, { fecha_fabricacion: e.target.value })}
                          style={{ ...inputStyle, width: 145 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          type="date"
                          value={ln.fecha_vencimiento}
                          onChange={(e) => setLinea(idx, { fecha_vencimiento: e.target.value })}
                          style={{ ...inputStyle, width: 145 }}
                        />
                        {!!errores[`fv_${idx}`] && (
                          <div style={{ marginTop: 6, color: colors.bad, fontSize: 12, fontWeight: 700 }}>
                            {errores[`fv_${idx}`]}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => removeLinea(idx)}
                          disabled={lineas.length === 1}
                          style={{
                            ...dangerButtonStyle,
                            opacity: lineas.length === 1 ? 0.55 : 1,
                            cursor: lineas.length === 1 ? "not-allowed" : "pointer",
                          }}
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <datalist id="materialesList">
                {materiales.map((m) => (
                  <option key={m.id} value={m.codigo}>
                    {m.descripcion}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: colors.muted, fontSize: 12, fontWeight: 600 }}>
              El flujo, la impresión y el guardado hacia asignación de ubicación se conservan igual.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addLinea} style={secondaryButtonStyle}>
                <Plus size={15} />
                Agregar línea
              </button>
              <button onClick={onImprimir} style={secondaryButtonStyle}>
                <Printer size={15} />
                Imprimir
              </button>
              <button onClick={onGuardarRecibo} style={primaryButtonStyle}>
                <Save size={15} />
                Guardar y continuar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}