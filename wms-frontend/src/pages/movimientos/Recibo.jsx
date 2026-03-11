import { useEffect, useMemo, useRef, useState } from "react";
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

function formatPrintDateDots(v) {
  const s = String(v || "").trim();
  if (!s) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s.replaceAll("-", ".");
  }

  const short = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(short)) {
    return short.replaceAll("-", ".");
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function stripStars(value) {
  return String(value || "").replace(/\*/g, "").trim();
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
  const printRef = useRef(null);

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

  // ===== Cargar borrador si existe =====
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
    const el = printRef.current;
    if (!el) {
      window.print();
      return;
    }

    const w = window.open("", "_blank", "width=1600,height=1000");
    if (!w) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    const clone = el.cloneNode(true);

    const inputs = clone.querySelectorAll("input, select, textarea, button");
    inputs.forEach((node) => {
      const tag = node.tagName.toLowerCase();

      if (tag === "button") {
        node.remove();
        return;
      }

      let value = "";

      if (tag === "select") {
        value = node.options?.[node.selectedIndex]?.text || node.value || "";
      } else {
        value = node.value ?? node.getAttribute("value") ?? "";
      }

      const span = w.document.createElement("span");
      span.textContent = value || "";
      span.style.display = "inline-block";
      span.style.width = "100%";
      span.style.whiteSpace = "pre-wrap";
      span.style.wordBreak = "break-word";
      span.style.fontSize = "10.5px";
      span.style.lineHeight = "1.2";
      node.replaceWith(span);
    });

    const barcodeRowsHtml = lineas
      .map((ln, idx) => {
        const serial = serialItem(header.serial, idx);
        const cantidad = formatMoney(ln.total || 0);
        const loteProveedorTexto = stripStars(ln.lote_proveedor || "");
        const fechaVencTexto = formatPrintDateDots(ln.fecha_vencimiento || "");
        const proveedorTexto = header.proveedor || "";

        return `
          <div class="barcode-card">
            <div class="barcode-card-head">
              <div class="barcode-card-head-left">
                <div class="mini-label">CÓDIGO</div>
                <div class="mini-value">${ln.codigo || "-"}</div>
              </div>
              <div class="barcode-card-head-right">
                <div class="mini-label">CANTIDAD</div>
                <div class="mini-value">${cantidad || "0,00"}</div>
              </div>
            </div>

            <div class="barcode-meta-stack">
              <div><b>Fecha vencimiento:</b> ${fechaVencTexto || "-"}</div>
              <div><b>Proveedor:</b> ${proveedorTexto || "-"}</div>
              <div><b># Serial:</b> ${serial}</div>
            </div>

            <div class="barcode-grid">
              <div class="barcode-box">
                <div class="barcode-label">LOTE PROVEEDOR</div>
                <svg id="barcode-lote-${idx}"></svg>
                <div class="barcode-text">${loteProveedorTexto || "-"}</div>
              </div>

              <div class="barcode-box">
                <div class="barcode-label">FECHA VENCIMIENTO</div>
                <svg id="barcode-fv-${idx}"></svg>
                <div class="barcode-text">${fechaVencTexto || "-"}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const barcodeScript = lineas
      .map((ln, idx) => {
        const loteProveedor = JSON.stringify(stripStars(ln.lote_proveedor || "") || "VACIO");
        const fechaVenc = JSON.stringify(formatPrintDateDots(ln.fecha_vencimiento || "") || "SIN.FECHA");

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
          <title>Recibo ciego - ${header.serial}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            html, body {
              height: 100%;
            }

            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
            }

            .print-wrap {
              width: 100%;
            }

            .scale {
              transform-origin: top left;
              transform: scale(0.94);
              width: 106%;
            }

            .muted {
              color: #64748b;
              font-size: 12px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              page-break-inside: auto;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            th, td {
              border: 1px solid #111827;
              padding: 5px;
              font-size: 10.5px;
              vertical-align: top;
              word-wrap: break-word;
              overflow-wrap: anywhere;
            }

            th {
              background: #f1f5f9;
              text-align: left;
            }

            th:nth-child(1), td:nth-child(1) { width: 80px; }
            th:nth-child(2), td:nth-child(2) { width: 35px; }
            th:nth-child(3), td:nth-child(3) { width: 90px; }
            th:nth-child(4), td:nth-child(4) { width: 80px; }
            th:nth-child(5), td:nth-child(5) { width: 210px; }
            th:nth-child(6), td:nth-child(6) { width: 90px; }
            th:nth-child(7), td:nth-child(7) { width: 60px; }
            th:nth-child(8), td:nth-child(8) { width: 60px; }
            th:nth-child(9), td:nth-child(9) { width: 80px; }
            th:nth-child(10), td:nth-child(10) { width: 80px; }
            th:nth-child(11), td:nth-child(11) { width: 115px; }
            th:nth-child(12), td:nth-child(12) { width: 95px; }
            th:nth-child(13), td:nth-child(13) { width: 95px; }
            th:nth-child(14), td:nth-child(14) { width: 70px; }

            .titlebar {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 10px;
            }

            .logo {
              width: 46px;
              height: 46px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              overflow: hidden;
              display: grid;
              place-items: center;
            }

            .logo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .barcode-section {
              margin-top: 20px;
              page-break-before: always;
            }

            .barcode-section-title {
              font-size: 16px;
              font-weight: 900;
              margin-bottom: 12px;
              color: #072B5A;
            }

            .barcode-cards-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }

            .barcode-card {
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              padding: 12px;
              page-break-inside: avoid;
              min-height: 240px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .barcode-card-head {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              margin-bottom: 10px;
            }

            .barcode-card-head-left,
            .barcode-card-head-right {
              width: 48%;
            }

            .barcode-card-head-right {
              text-align: right;
            }

            .mini-label {
              font-size: 11px;
              font-weight: 900;
              color: #475569;
              margin-bottom: 4px;
            }

            .mini-value {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              word-break: break-word;
            }

            .barcode-meta-stack {
              margin-bottom: 10px;
              font-size: 12px;
              line-height: 1.5;
            }

            .barcode-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 10px;
            }

            .barcode-box {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
            }

            .barcode-label {
              font-size: 11px;
              font-weight: 900;
              margin-bottom: 8px;
              color: #334155;
            }

            .barcode-text {
              margin-top: 8px;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 0.5px;
              word-break: break-all;
            }

            svg {
              width: 100%;
              max-width: 100%;
              height: 62px;
            }
          </style>
        </head>
        <body>
          <div class="print-wrap">
            <div class="scale">
              <div class="titlebar">
                <div class="logo"><img src="/INOVA.png" alt="INOVA"/></div>
                <div>
                  <div style="font-weight:900; font-size:16px;">WMS INOVA</div>
                  <div class="muted">Recibo ciego • Serial ${header.serial} • Usuario ${usuario || ""}</div>
                </div>
              </div>

              ${clone.innerHTML}

              <div class="barcode-section">
                <div class="barcode-section-title">Tarjetas del recibo</div>
                <div class="barcode-cards-grid">
                  ${barcodeRowsHtml}
                </div>
              </div>
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
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

      <div ref={printRef}>
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
                {errores.remesa_transp && (
                  <div style={{ color: "crimson", marginTop: 4 }}>{errores.remesa_transp}</div>
                )}
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
                {errores.documento && (
                  <div style={{ color: "crimson", marginTop: 4 }}>{errores.documento}</div>
                )}
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
                {errores.orden_compra && (
                  <div style={{ color: "crimson", marginTop: 4 }}>{errores.orden_compra}</div>
                )}
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
                    {errores[`codigo_${idx}`] && (
                      <div style={{ color: "crimson" }}>{errores[`codigo_${idx}`]}</div>
                    )}
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
                    {errores[`empaque_${idx}`] && (
                      <div style={{ color: "crimson" }}>{errores[`empaque_${idx}`]}</div>
                    )}
                  </td>

                  <td>
                    <input
                      type="number"
                      value={ln.umb}
                      onChange={(e) => onUmbChange(idx, e.target.value)}
                      style={{ width: 90 }}
                    />
                    {errores[`umb_${idx}`] && (
                      <div style={{ color: "crimson" }}>{errores[`umb_${idx}`]}</div>
                    )}
                  </td>

                  <td>
                    <input
                      value={ln.um}
                      readOnly
                      style={{ width: 90, background: "#f3f3f3" }}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={ln.cantidad}
                      onChange={(e) => onCantidadChange(idx, e.target.value)}
                      style={{ width: 110 }}
                    />
                    {errores[`cantidad_${idx}`] && (
                      <div style={{ color: "crimson" }}>{errores[`cantidad_${idx}`]}</div>
                    )}
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
                        setLinea(idx, {
                          lote_proveedor: pad10WithStarsAny(ln.lote_proveedor),
                        })
                      }
                      maxLength={10}
                      placeholder="10 caracteres"
                      style={{ width: 160 }}
                    />
                    {errores[`loteprov_${idx}`] && (
                      <div style={{ color: "crimson" }}>{errores[`loteprov_${idx}`]}</div>
                    )}
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
                    {errores[`fv_${idx}`] && (
                      <div style={{ color: "crimson" }}>{errores[`fv_${idx}`]}</div>
                    )}
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