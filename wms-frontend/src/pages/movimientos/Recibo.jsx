import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, getProveedores } from "../../api";

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

function fmtDateOnly(v) {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
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

function formatFechaVencPrint(v) {
  const s = fmtDateOnly(v);
  if (!s) return "";
  return s.replaceAll("-", ".");
}

function cleanLoteProveedorPrint(v) {
  return (v ?? "").toString().replaceAll("*", "").trim();
}

function escapeHtml(v) {
  return (v ?? "")
    .toString()
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

// ===== Usuarios por clave (temporal) =====
const USUARIOS = {
  "*768*": "Darwin Herrera",
  "*999*": "Admin",
};

// ===== Empaques (dropdown) =====
const EMPAQUES = ["CAJA", "CANECA", "ROLLO", "BULTO", "PALLETS", "ISOTANQUES", "BIG BAG"];

const DRAFT_KEY = "wms_recibo_draft";

export default function Recibo() {
  const navigate = useNavigate();

  // ===== Usuario por clave =====
  const [usuario, setUsuario] = useState("");

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

  // ===== Proveedores desde BD =====
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresError, setProveedoresError] = useState("");

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

  // ===== Cabecera =====
  const [header, setHeader] = useState({
    serial: "13003",
    proveedor_id: "",
    proveedor: "",
    acreedor: "",
    remesa_transp: "",
    documento: "",
    orden_compra: "",
    fecha_recepcion: todayISODate(),
  });

  // ===== Materiales =====
  const [materiales, setMateriales] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/materiales?limit=1000`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => setMateriales(Array.isArray(data) ? data : []))
      .catch(() => setMateriales([]));
  }, []);

  // ===== Líneas =====
  const [lineas, setLineas] = useState([
    {
      fecha_recepcion: todayISODate(),
      codigo: "",
      descripcion: "",
      empaque: "",
      umb: "",
      um: "",
      cantidad: "",
      total: 0,
      lote_proveedor: "",
      fecha_fabricacion: "",
      fecha_vencimiento: "",
      lote: "",
    },
  ]);

  const [errores, setErrores] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d?.header) setHeader(d.header);
      if (Array.isArray(d?.lineas) && d.lineas.length) setLineas(d.lineas);
    } catch {
      // nada
    }
  }, []);

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

  const onField10Blur = (key) => setHeaderField(key, pad10WithStars(header[key]));

  const setLinea = (idx, patch) => {
    setLineas((prev) => prev.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  };

  const addLinea = () => {
    setLineas((prev) => [
      ...prev,
      {
        fecha_recepcion: todayISODate(),
        codigo: "",
        descripcion: "",
        empaque: "",
        umb: "",
        um: "",
        cantidad: "",
        total: 0,
        lote_proveedor: "",
        fecha_fabricacion: "",
        fecha_vencimiento: "",
        lote: "",
      },
    ]);
  };

  const removeLinea = (idx) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  const onCodigoChange = (idx, codigo) => {
    const code = codigo.trim();
    const mat = materiales.find((m) => m.codigo === code);
    setLinea(idx, {
      codigo: code,
      descripcion: mat ? mat.descripcion : "",
      umb: "",
      um: mat ? mat.unidad_medida : "",
    });
  };

  const recomputeTotal = (umb, cantidad) => {
    const u = Number(umb);
    const c = Number(cantidad);
    if (!Number.isFinite(u) || !Number.isFinite(c)) return 0;
    return u * c;
  };

  const onUmbChange = (idx, value) => {
    setLineas((prev) =>
      prev.map((ln, i) =>
        i === idx ? { ...ln, umb: value, total: recomputeTotal(value, ln.cantidad) } : ln
      )
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

    ["remesa_transp", "documento", "orden_compra"].forEach((k) => {
      if (!header[k] || header[k].length !== 10) {
        errs[k] = "Debe quedar exactamente de 10 caracteres (se rellena con *).";
      }
    });

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
    ["remesa_transp", "documento", "orden_compra"].forEach((k) => {
      setHeaderField(k, pad10WithStars(header[k]));
    });

    setTimeout(() => {
      if (!validarAntesDeContinuar()) {
        alert("Hay errores. Revisa los campos marcados.");
        return;
      }

      const codigo_cita = header.serial;

      const draft = {
        tipo: "ENTRADA",
        header: { ...header, usuario, codigo_cita },
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

  const onImprimir = () => {
    const w = window.open("", "_blank", "width=1700,height=1100");
    if (!w) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    const proveedorPrint = header.proveedor || "";
    const acreedorPrint = header.acreedor || "";
    const remesaPrint = pad10WithStars(header.remesa_transp || "");
    const documentoPrint = pad10WithStars(header.documento || "");
    const ordenCompraPrint = pad10WithStars(header.orden_compra || "");
    const fechaRecepPrint = fmtDateOnly(header.fecha_recepcion || todayISODate());

    const tableRowsHtml = lineas
      .map((ln, idx) => {
        return `
          <tr>
            <td>${escapeHtml(serialItem(header.serial, idx))}</td>
            <td>${idx + 1}</td>
            <td>${escapeHtml(fmtDateOnly(ln.fecha_recepcion || fechaRecepPrint))}</td>
            <td>${escapeHtml(ln.codigo || "")}</td>
            <td>${escapeHtml(ln.descripcion || "")}</td>
            <td>${escapeHtml(ln.empaque || "")}</td>
            <td style="text-align:right;">${escapeHtml(ln.umb || "")}</td>
            <td>${escapeHtml(ln.um || "")}</td>
            <td style="text-align:right;">${escapeHtml(ln.cantidad || "")}</td>
            <td style="text-align:right;">${escapeHtml(formatMoney(ln.total || 0))}</td>
            <td>${escapeHtml(ln.lote_proveedor || "")}</td>
            <td>${escapeHtml(fmtDateOnly(ln.fecha_fabricacion))}</td>
            <td>${escapeHtml(fmtDateOnly(ln.fecha_vencimiento))}</td>
          </tr>
        `;
      })
      .join("");

    const barcodeCardsHtml = lineas
      .map((ln, idx) => {
        const serial = serialItem(header.serial, idx);
        const cantidad = formatMoney(ln.total || 0);
        const loteProveedorText = cleanLoteProveedorPrint(ln.lote_proveedor) || "VACIO";
        const fechaVencText = formatFechaVencPrint(ln.fecha_vencimiento) || "SIN_FECHA";

        return `
          <div class="card">
            <div class="card-head">
              <div class="card-brand">
                <div class="mini-logo-wrap">
                  <img src="/INOVA.png" alt="INOVA" class="mini-logo" />
                </div>
                <div>
                  <div class="brand-title">WMS INOVA</div>
                  <div class="brand-sub">Tarjeta de identificación</div>
                </div>
              </div>
              <div class="card-serial-box">
                <div class="card-label"># SERIAL</div>
                <div class="card-serial">${escapeHtml(serial)}</div>
              </div>
            </div>

            <div class="card-mid">
              <div class="card-info">
                <span class="card-label">CANTIDAD</span>
                <span class="card-value">${escapeHtml(cantidad)}</span>
              </div>
              <div class="card-info">
                <span class="card-label">CÓDIGO</span>
                <span class="card-value">${escapeHtml(ln.codigo || "")}</span>
              </div>
            </div>

            <div class="barcode-box">
              <div class="barcode-title">LOTE PROVEEDOR</div>
              <svg id="barcode-lote-${idx}"></svg>
              <div class="barcode-text">${escapeHtml(loteProveedorText)}</div>
            </div>

            <div class="barcode-box">
              <div class="barcode-title">FECHA VENCIMIENTO</div>
              <svg id="barcode-fv-${idx}"></svg>
              <div class="barcode-text">${escapeHtml(fechaVencText)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    const barcodeScript = lineas
      .map((ln, idx) => {
        const loteProveedor = JSON.stringify(cleanLoteProveedorPrint(ln.lote_proveedor) || "VACIO");
        const fechaVenc = JSON.stringify(formatFechaVencPrint(ln.fecha_vencimiento) || "SIN_FECHA");

        return `
          try {
            JsBarcode("#barcode-lote-${idx}", ${loteProveedor}, {
              format: "CODE128",
              displayValue: false,
              height: 58,
              width: 1.9,
              margin: 0
            });
          } catch (e) {
            console.error("Error barcode lote ${idx}", e);
          }

          try {
            JsBarcode("#barcode-fv-${idx}", ${fechaVenc}, {
              format: "CODE128",
              displayValue: false,
              height: 58,
              width: 1.9,
              margin: 0
            });
          } catch (e) {
            console.error("Error barcode fv ${idx}", e);
          }
        `;
      })
      .join("\n");

    const html = `
      <html>
        <head>
          <title>Recibo ciego - ${escapeHtml(header.serial)}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html, body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }

            .page {
              width: 100%;
            }

            .page-break {
              page-break-before: always;
            }

            .titlebar {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            }

            .logo {
              width: 52px;
              height: 52px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              overflow: hidden;
              display: grid;
              place-items: center;
              flex: 0 0 auto;
            }

            .logo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .title-main {
              font-size: 16px;
              font-weight: 900;
              margin: 0;
            }

            .title-sub {
              color: #475569;
              font-size: 12px;
              margin-top: 4px;
            }

            .header-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 12px;
            }

            .header-box {
              border: 1px solid #dbe2ea;
              border-radius: 12px;
              padding: 12px;
              min-height: 138px;
            }

            .header-line {
              margin-bottom: 10px;
            }

            .header-label {
              font-size: 11px;
              font-weight: 900;
              color: #1e293b;
              margin-bottom: 2px;
              text-transform: uppercase;
            }

            .header-value {
              font-size: 12px;
              font-weight: 700;
              color: #0f172a;
            }

            .header-total {
              display: flex;
              justify-content: space-between;
              align-items: end;
              margin-top: 12px;
            }

            .header-total-value {
              font-size: 20px;
              font-weight: 900;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
            }

            th, td {
              border: 1px solid #111827;
              padding: 5px 6px;
              font-size: 9.5px;
              vertical-align: top;
              word-break: break-word;
            }

            th {
              background: #f1f5f9;
              text-align: left;
              font-weight: 900;
            }

            th:nth-child(1), td:nth-child(1) { width: 8.5%; }
            th:nth-child(2), td:nth-child(2) { width: 4.2%; }
            th:nth-child(3), td:nth-child(3) { width: 8.8%; }
            th:nth-child(4), td:nth-child(4) { width: 7.5%; }
            th:nth-child(5), td:nth-child(5) { width: 18.5%; }
            th:nth-child(6), td:nth-child(6) { width: 8.2%; }
            th:nth-child(7), td:nth-child(7) { width: 5.4%; }
            th:nth-child(8), td:nth-child(8) { width: 5.4%; }
            th:nth-child(9), td:nth-child(9) { width: 7.2%; }
            th:nth-child(10), td:nth-child(10) { width: 8%; }
            th:nth-child(11), td:nth-child(11) { width: 11.2%; }
            th:nth-child(12), td:nth-child(12) { width: 9.2%; }
            th:nth-child(13), td:nth-child(13) { width: 9.2%; }

            .cards-page {
              page-break-before: always;
            }

            .cards-title {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            }

            .cards-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }

            .card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 12px;
              min-height: 255px;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .card-head {
              display: flex;
              justify-content: space-between;
              align-items: start;
              gap: 10px;
              margin-bottom: 10px;
            }

            .card-brand {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .mini-logo-wrap {
              width: 40px;
              height: 40px;
              border: 1px solid #dbe2ea;
              border-radius: 10px;
              overflow: hidden;
              display: grid;
              place-items: center;
              flex: 0 0 auto;
            }

            .mini-logo {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .brand-title {
              font-size: 14px;
              font-weight: 900;
              color: #072B5A;
              line-height: 1.1;
            }

            .brand-sub {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }

            .card-serial-box {
              text-align: right;
              min-width: 110px;
            }

            .card-label {
              display: block;
              font-size: 10px;
              font-weight: 900;
              color: #64748b;
              margin-bottom: 2px;
            }

            .card-serial {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1;
            }

            .card-mid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 10px;
            }

            .card-info {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 8px 10px;
            }

            .card-value {
              display: block;
              font-size: 16px;
              font-weight: 900;
              color: #0f172a;
              margin-top: 3px;
            }

            .barcode-box {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px;
              text-align: center;
              margin-top: 8px;
            }

            .barcode-title {
              font-size: 11px;
              font-weight: 900;
              color: #334155;
              margin-bottom: 8px;
              text-transform: uppercase;
            }

            .barcode-text {
              margin-top: 8px;
              font-size: 12px;
              font-weight: 800;
              word-break: break-all;
            }

            svg {
              width: 100%;
              max-width: 100%;
              height: 64px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="titlebar">
              <div class="logo">
                <img src="/INOVA.png" alt="INOVA" />
              </div>
              <div>
                <div class="title-main">WMS INOVA</div>
                <div class="title-sub">
                  Recibo ciego • Serial ${escapeHtml(header.serial)} • Usuario ${escapeHtml(usuario || "")}
                </div>
              </div>
            </div>

            <div class="header-grid">
              <div class="header-box">
                <div class="header-line">
                  <div class="header-label"># Serial</div>
                  <div class="header-value">${escapeHtml(header.serial || "")}</div>
                </div>

                <div class="header-line">
                  <div class="header-label">Nombre Proveedor</div>
                  <div class="header-value">${escapeHtml(proveedorPrint)}</div>
                </div>

                <div class="header-line">
                  <div class="header-label">Acreedor</div>
                  <div class="header-value">${escapeHtml(acreedorPrint)}</div>
                </div>

                <div class="header-line">
                  <div class="header-label">Fecha recepción</div>
                  <div class="header-value">${escapeHtml(fechaRecepPrint)}</div>
                </div>
              </div>

              <div class="header-box">
                <div class="header-line">
                  <div class="header-label"># Remesa Transp (10)</div>
                  <div class="header-value">${escapeHtml(remesaPrint)}</div>
                </div>

                <div class="header-line">
                  <div class="header-label"># Documento (10)</div>
                  <div class="header-value">${escapeHtml(documentoPrint)}</div>
                </div>

                <div class="header-line">
                  <div class="header-label"># Orden de Compra (10)</div>
                  <div class="header-value">${escapeHtml(ordenCompraPrint)}</div>
                </div>

                <div class="header-total">
                  <div class="header-label" style="margin:0;">Total Recibo</div>
                  <div class="header-total-value">${escapeHtml(formatMoney(totalRecibo))}</div>
                </div>
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
                  <th>Lote Proveedor (10)</th>
                  <th>Fecha Fabricación</th>
                  <th>Fecha Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="cards-page">
            <div class="cards-title">
              <div class="logo">
                <img src="/INOVA.png" alt="INOVA" />
              </div>
              <div>
                <div class="title-main">Tarjetas del recibo</div>
                <div class="title-sub">4 por hoja • listas para escanear</div>
              </div>
            </div>

            <div class="cards-grid">
              ${barcodeCardsHtml}
            </div>
          </div>

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>📥 Recibo ciego</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onImprimir}>🖨️ Imprimir</button>
          <button onClick={onGuardarRecibo} style={{ fontWeight: 800 }}>
            Guardar (Asignar Ubicación)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10, color: "#444" }}>
        <b>Usuario:</b> {usuario || "(sin usuario)"}
        {errores.usuario && <span style={{ color: "crimson", marginLeft: 8 }}>{errores.usuario}</span>}
      </div>

      {proveedoresError && (
        <div style={{ color: "crimson", marginBottom: 10 }}>
          Error cargando proveedores: {proveedoresError}
        </div>
      )}

      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
            gap: 12,
            alignItems: "start",
            marginBottom: 12,
          }}
        >
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <b># Serial</b>
              <input
                value={header.serial}
                onChange={(e) => setHeaderField("serial", clampMaxLen(e.target.value, 10))}
                style={{ width: 140 }}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Nombre Proveedor</b>
              <select
                value={header.proveedor_id}
                onChange={(e) => onProveedorSelect(e.target.value)}
                style={{ width: "100%", marginTop: 6 }}
              >
                <option value="">Seleccione proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {errores.proveedor && <div style={{ color: "crimson", marginTop: 4 }}>{errores.proveedor}</div>}
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Acreedor</b>
              <input
                value={header.acreedor}
                readOnly
                placeholder="Auto por proveedor"
                style={{ width: "100%", marginTop: 6, background: "#f3f3f3" }}
              />
              {errores.acreedor && <div style={{ color: "crimson", marginTop: 4 }}>{errores.acreedor}</div>}
            </div>

            <div style={{ marginTop: 10 }}>
              <b>Fecha recepción</b>
              <input
                type="date"
                value={header.fecha_recepcion}
                readOnly
                style={{ width: "100%", marginTop: 6, background: "#f3f3f3" }}
              />
              <div style={{ color: "#666", marginTop: 4 }}>(Automática del día)</div>
            </div>
          </div>

          <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <b># Remesa Transp (10)</b>
                <input
                  value={header.remesa_transp}
                  onChange={(e) => onField10Change("remesa_transp", e.target.value)}
                  onBlur={() => onField10Blur("remesa_transp")}
                  maxLength={10}
                  style={{ width: "100%", marginTop: 6 }}
                />
                {errores.remesa_transp && <div style={{ color: "crimson", marginTop: 4 }}>{errores.remesa_transp}</div>}
              </div>

              <div>
                <b># Documento (10)</b>
                <input
                  value={header.documento}
                  onChange={(e) => onField10Change("documento", e.target.value)}
                  onBlur={() => onField10Blur("documento")}
                  maxLength={10}
                  style={{ width: "100%", marginTop: 6 }}
                />
                {errores.documento && <div style={{ color: "crimson", marginTop: 4 }}>{errores.documento}</div>}
              </div>

              <div>
                <b># Orden de Compra (10)</b>
                <input
                  value={header.orden_compra}
                  onChange={(e) => onField10Change("orden_compra", e.target.value)}
                  onBlur={() => onField10Blur("orden_compra")}
                  maxLength={10}
                  style={{ width: "100%", marginTop: 6 }}
                />
                {errores.orden_compra && <div style={{ color: "crimson", marginTop: 4 }}>{errores.orden_compra}</div>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b>Total Recibo</b>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{formatMoney(totalRecibo)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
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
                <th>Lote Proveedor (10)</th>
                <th>Fecha Fabricación</th>
                <th>Fecha Vencimiento</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {lineas.map((ln, idx) => (
                <tr key={idx}>
                  <td>{serialItem(header.serial, idx)}</td>
                  <td>{idx + 1}</td>

                  <td>
                    <input
                      type="date"
                      value={ln.fecha_recepcion}
                      readOnly
                      style={{ background: "#f3f3f3" }}
                    />
                  </td>

                  <td>
                    <input
                      list="materialesList"
                      value={ln.codigo}
                      onChange={(e) => onCodigoChange(idx, e.target.value)}
                      placeholder="Código"
                      style={{ width: 120 }}
                    />
                    {errores[`codigo_${idx}`] && <div style={{ color: "crimson" }}>{errores[`codigo_${idx}`]}</div>}
                  </td>

                  <td>
                    <input
                      value={ln.descripcion}
                      readOnly
                      style={{ width: 260, background: "#f3f3f3" }}
                    />
                  </td>

                  <td>
                    <select
                      value={ln.empaque}
                      onChange={(e) => setLinea(idx, { empaque: e.target.value })}
                      style={{ width: 150 }}
                    >
                      <option value="">Seleccione...</option>
                      {EMPAQUES.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    {errores[`empaque_${idx}`] && <div style={{ color: "crimson" }}>{errores[`empaque_${idx}`]}</div>}
                  </td>

                  <td>
                    <input
                      type="number"
                      value={ln.umb}
                      onChange={(e) => onUmbChange(idx, e.target.value)}
                      style={{ width: 90 }}
                    />
                    {errores[`umb_${idx}`] && <div style={{ color: "crimson" }}>{errores[`umb_${idx}`]}</div>}
                  </td>

                  <td>
                    <input value={ln.um} readOnly style={{ width: 90, background: "#f3f3f3" }} />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={ln.cantidad}
                      onChange={(e) => onCantidadChange(idx, e.target.value)}
                      style={{ width: 110 }}
                    />
                    {errores[`cantidad_${idx}`] && <div style={{ color: "crimson" }}>{errores[`cantidad_${idx}`]}</div>}
                  </td>

                  <td>
                    <input
                      value={formatMoney(ln.total || 0)}
                      readOnly
                      style={{ width: 120, background: "#f3f3f3" }}
                    />
                  </td>

                  <td>
                    <input
                      value={ln.lote_proveedor}
                      onChange={(e) => onLoteProveedorChange(idx, e.target.value)}
                      onBlur={() =>
                        setLinea(idx, { lote_proveedor: pad10WithStarsAny(ln.lote_proveedor) })
                      }
                      maxLength={10}
                      placeholder="10 caracteres"
                      style={{ width: 160 }}
                    />
                    {errores[`loteprov_${idx}`] && <div style={{ color: "crimson" }}>{errores[`loteprov_${idx}`]}</div>}
                  </td>

                  <td>
                    <input
                      type="date"
                      value={ln.fecha_fabricacion}
                      onChange={(e) => setLinea(idx, { fecha_fabricacion: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      value={ln.fecha_vencimiento}
                      onChange={(e) => setLinea(idx, { fecha_vencimiento: e.target.value })}
                    />
                    {errores[`fv_${idx}`] && <div style={{ color: "crimson" }}>{errores[`fv_${idx}`]}</div>}
                  </td>

                  <td>
                    <button onClick={() => removeLinea(idx)} disabled={lineas.length === 1}>
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

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button onClick={addLinea}>+ Agregar línea</button>
        <button onClick={onImprimir}>🖨️ Imprimir</button>
      </div>
    </div>
  );
}