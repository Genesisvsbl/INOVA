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

  // IMPORTANTE:
  // No cargar tipoRecibo desde localStorage, para obligar a seleccionar siempre.
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

    // Fuerza que al entrar no haya selección previa
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
        </head>
        <body>
          <div>${reciboRowsHtml}</div>
          <div>${tarjetasHtml}</div>
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
        <h2 style={{ margin: 0 }}>
          📥 {!tipoRecibo
            ? "Selecciona tipo de movimiento"
            : tipoRecibo === "devolucion"
            ? "Devolución"
            : "Recibo ciego"}
        </h2>

        {tipoRecibo && (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onImprimir}>🖨️ Imprimir</button>
            <button onClick={onGuardarRecibo} style={{ fontWeight: 800 }}>
              Guardar (Asignar Ubicación)
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => setTipoRecibo("recibo")}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #d0d7de",
            background: tipoRecibo === "recibo" ? "#1976d2" : "#fff",
            color: tipoRecibo === "recibo" ? "#fff" : "#111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Recibo
        </button>

        <button
          type="button"
          onClick={() => setTipoRecibo("devolucion")}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #d0d7de",
            background: tipoRecibo === "devolucion" ? "#1976d2" : "#fff",
            color: tipoRecibo === "devolucion" ? "#fff" : "#111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Devolución
        </button>
      </div>

      {!tipoRecibo && (
        <div
          style={{
            border: "1px dashed #cbd5e1",
            borderRadius: 12,
            padding: 24,
            marginTop: 12,
            background: "#f8fafc",
            textAlign: "center",
            color: "#334155",
            fontWeight: 600,
          }}
        >
          Selecciona primero <b>Recibo</b> o <b>Devolución</b> para continuar.
        </div>
      )}

      {tipoRecibo && (
        <>
          <div style={{ marginBottom: 10, color: "#444" }}>
            <b>Usuario:</b> {usuario || "(sin usuario)"}
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
                </div>

                <div style={{ marginTop: 10 }}>
                  <b>Acreedor</b>
                  <input
                    value={header.acreedor}
                    readOnly
                    placeholder="Auto por proveedor"
                    style={{ width: "100%", marginTop: 6, background: "#f3f3f3" }}
                  />
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
                      disabled={tipoRecibo === "devolucion"}
                      style={{
                        width: "100%",
                        marginTop: 6,
                        background: tipoRecibo === "devolucion" ? "#f3f3f3" : "#fff",
                      }}
                    />
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
                  </div>

                  <div>
                    <b># Orden de Compra (10)</b>
                    <input
                      value={header.orden_compra}
                      onChange={(e) => onField10Change("orden_compra", e.target.value)}
                      onBlur={() => onField10Blur("orden_compra")}
                      maxLength={10}
                      disabled={tipoRecibo === "devolucion"}
                      style={{
                        width: "100%",
                        marginTop: 6,
                        background: tipoRecibo === "devolucion" ? "#f3f3f3" : "#fff",
                      }}
                    />
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
                        <input type="date" value={ln.fecha_recepcion} readOnly style={{ background: "#f3f3f3" }} />
                      </td>
                      <td>
                        <input
                          list="materialesList"
                          value={ln.codigo}
                          onChange={(e) => onCodigoChange(idx, e.target.value)}
                          placeholder="Código"
                          style={{ width: 120 }}
                        />
                      </td>
                      <td>
                        <input value={ln.descripcion} readOnly style={{ width: 260, background: "#f3f3f3" }} />
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
                      </td>
                      <td>
                        <input
                          type="number"
                          value={ln.umb}
                          onChange={(e) => onUmbChange(idx, e.target.value)}
                          readOnly={ln.umb_bloqueado}
                          style={{ width: 90 }}
                        />
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
                          onBlur={() => setLinea(idx, { lote_proveedor: pad10WithStarsAny(ln.lote_proveedor) })}
                          maxLength={10}
                          placeholder="10 caracteres"
                          style={{ width: 160 }}
                        />
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
        </>
      )}
    </div>
  );
}