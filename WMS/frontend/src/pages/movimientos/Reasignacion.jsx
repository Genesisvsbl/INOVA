import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  getMotorPorUbicacion,
  getUbicaciones,
  registrarAjusteInterno,
  getPncBloqueado,
  desbloquearPnc,
  darDeBajaPnc,
} from "../../api";
import {
  Camera,
  ImagePlus,
  MapPin,
  RefreshCw,
  Search,
  ArrowRightLeft,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Package,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  bg: "#f3f6f9",
  text: "#1f2d3d",
  muted: "#6b7a90",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#2f6f44",
  bad: "#b42318",
  warn: "#b7791f",
};

function normalizeCode(v) {
  return String(v || "").trim().toUpperCase();
}

function fmtNumber(v) {
  const n = Number(v || 0);
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function Reasignacion() {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [ubicaciones, setUbicaciones] = useState([]);
  const [ubicacionOrigen, setUbicacionOrigen] = useState("");
  const [stock, setStock] = useState([]);
  const [ubicacionInfo, setUbicacionInfo] = useState(null);

  const [usuario, setUsuario] = useState(sessionStorage.getItem("usuario") || "");
  const [motivoGlobal, setMotivoGlobal] = useState("");
  const [search, setSearch] = useState("");
  const [acciones, setAcciones] = useState({});

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [readerControls, setReaderControls] = useState(null);

  // ----- PNC (bloqueado) -----
  const [pncRows, setPncRows] = useState([]);
  const [pncLoading, setPncLoading] = useState(false);
  const [pncUbic, setPncUbic] = useState({}); // { [movId]: codigoUbicacion }
  const [pncBusyId, setPncBusyId] = useState(null);
  const [pncAbierto, setPncAbierto] = useState(false); // cerrado por defecto

  const cargarPnc = async () => {
    setPncLoading(true);
    try {
      const data = await getPncBloqueado();
      setPncRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setToast({ type: "error", message: e.message });
    } finally {
      setPncLoading(false);
    }
  };

  const onDesbloquear = async (row) => {
    const ub = String(pncUbic[row.id] || "").trim();
    if (!ub) {
      setToast({ type: "error", message: "Escribe la ubicación destino para desbloquear." });
      return;
    }
    setPncBusyId(row.id);
    try {
      await desbloquearPnc(row.id, ub);
      setToast({ type: "success", message: `PNC desbloqueado y ubicado en ${ub}.` });
      await cargarPnc();
    } catch (e) {
      setToast({ type: "error", message: e.message || "No se pudo desbloquear." });
    } finally {
      setPncBusyId(null);
    }
  };

  const onDarDeBaja = async (row) => {
    if (!window.confirm(`¿Dar de baja el PNC de ${row.codigo_material} (${row.cantidad})? Queda registrado como salida.`)) return;
    setPncBusyId(row.id);
    try {
      await darDeBajaPnc(row);
      setToast({ type: "success", message: "PNC dado de baja (salida registrada)." });
      await cargarPnc();
    } catch (e) {
      setToast({ type: "error", message: e.message || "No se pudo dar de baja." });
    } finally {
      setPncBusyId(null);
    }
  };

  const leerRespuesta = async (res) => {
    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Respuesta inválida del servidor: ${text.slice(0, 180)}`);
    }
  };

  const cargarUbicaciones = async () => {
    const data = await getUbicaciones();
    setUbicaciones(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    cargarUbicaciones().catch((e) =>
      setToast({ type: "error", message: e.message })
    );
    cargarPnc();

    return () => cerrarCamara();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarStockUbicacion = async (codigo = ubicacionOrigen) => {
    const ubic = normalizeCode(codigo);

    if (!ubic) {
      setToast({
        type: "error",
        message: "Debe seleccionar, escribir o escanear una ubicación",
      });
      return;
    }

    try {
      setLoading(true);

      const data = await getMotorPorUbicacion(ubic);

      setUbicacionOrigen(data.ubicacion || ubic);
      setUbicacionInfo(data);
      setStock(Array.isArray(data.items) ? data.items : []);
      setAcciones({});

      setToast({
        type: "success",
        message: `Ubicación consultada: ${data.ubicacion || ubic}`,
      });
    } catch (err) {
      setStock([]);
      setUbicacionInfo(null);
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stock;

    return stock.filter((x) =>
      [
        x.codigo_material,
        x.descripcion_material,
        x.lote_almacen,
        x.lote_proveedor,
        x.fecha_vencimiento,
        x.familia,
        x.unidad_medida,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [stock, search]);

  const totalCantidad = useMemo(
    () => stock.reduce((acc, x) => acc + Number(x.cantidad_disponible || 0), 0),
    [stock]
  );

  const ubicacionesValidasSet = useMemo(() => {
    const set = new Set();

    ubicaciones.forEach((u) => {
      const codigo = normalizeCode(u.ubicacion);
      if (codigo) set.add(codigo);
    });

    return set;
  }, [ubicaciones]);

  const keyLinea = (item) =>
    [
      item.codigo_material,
      item.lote_almacen || "",
      item.lote_proveedor || "",
      item.fecha_vencimiento || "",
    ].join("|");

  const actualizarAccion = (item, patch) => {
    const key = keyLinea(item);

    setAcciones((prev) => ({
      ...prev,
      [key]: {
        tipo: "TRASLADO",
        cantidad: "",
        ubicacion_destino: "",
        motivo: "",
        ...prev[key],
        ...patch,
      },
    }));
  };

  const ejecutarAccion = async (item) => {
    const key = keyLinea(item);
    const accion = acciones[key] || {};
    const tipo = accion.tipo || "TRASLADO";
    const cantidad = Number(accion.cantidad);
    const motivo = String(accion.motivo || motivoGlobal || "").trim();

    if (!usuario.trim()) {
      setToast({ type: "error", message: "Usuario requerido" });
      return;
    }

    if (!motivo) {
      setToast({ type: "error", message: "Motivo requerido para auditoría" });
      return;
    }

    if (!cantidad || cantidad <= 0) {
      setToast({ type: "error", message: "Cantidad inválida" });
      return;
    }

    if (
      tipo !== "AJUSTE_POSITIVO" &&
      cantidad > Number(item.cantidad_disponible || 0)
    ) {
      setToast({
        type: "error",
        message: "Cantidad supera el stock disponible",
      });
      return;
    }

    const destino = normalizeCode(accion.ubicacion_destino);
    const nuevoLoteProv = String(accion.nuevo_lote_proveedor || "").trim();
    const nuevaVenc = String(accion.nueva_fecha_vencimiento || "").slice(0, 10);
    const hayCambioLote =
      (nuevoLoteProv && nuevoLoteProv !== String(item.lote_proveedor || "").trim()) ||
      (nuevaVenc && nuevaVenc !== String(item.fecha_vencimiento || "").slice(0, 10));

    if (tipo === "TRASLADO") {
      if (!destino) {
        setToast({ type: "error", message: "Ubicación destino requerida" });
        return;
      }

      if (destino === normalizeCode(ubicacionOrigen)) {
        setToast({
          type: "error",
          message: "Origen y destino no pueden ser iguales",
        });
        return;
      }

      if (!ubicacionesValidasSet.has(destino)) {
        setToast({
          type: "error",
          message: `La ubicación destino ${destino} no existe en datos maestros`,
        });
        return;
      }
    }

    if (tipo === "CAMBIO_LOTE" && !hayCambioLote) {
      setToast({ type: "error", message: "Indica el nuevo lote proveedor o el nuevo vencimiento" });
      return;
    }

    const payload = {
      tipo,
      usuario: usuario.trim(),
      motivo,
      codigo_material: item.codigo_material,
      ubicacion_origen: ubicacionOrigen,
      ubicacion_destino: tipo === "TRASLADO" ? destino : null,
      lote_almacen: item.lote_almacen,
      lote_proveedor: item.lote_proveedor,
      fecha_vencimiento: item.fecha_vencimiento,
      nuevo_lote_proveedor: nuevoLoteProv || null,
      nueva_fecha_vencimiento: nuevaVenc || null,
      cantidad,
    };

    try {
      setLoading(true);

      const data = await registrarAjusteInterno(payload);

      setToast({
        type: "success",
        message: data.mensaje || "Movimiento ejecutado correctamente",
      });

      await cargarStockUbicacion(ubicacionOrigen);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const crearReaderZXing = () => new BrowserMultiFormatReader();

  const procesarCodigoDetectado = async (valor) => {
    const codigo = normalizeCode(valor);

    if (!codigo) {
      setToast({ type: "error", message: "No se detectó código válido" });
      return;
    }

    setUbicacionOrigen(codigo);
    await cargarStockUbicacion(codigo);
  };

  const cerrarCamara = () => {
    try {
      if (readerControls?.stop) {
        readerControls.stop();
      }
    } catch {
      // no hacer nada
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch {
      // no hacer nada
    }

    setReaderControls(null);
    setCameraOpen(false);
  };

  const iniciarCamara = async () => {
    try {
      setCameraOpen(true);

      setTimeout(async () => {
        try {
          const reader = crearReaderZXing();

          const devices = await BrowserMultiFormatReader.listVideoInputDevices();
          const backCamera =
            devices.find((d) => /back|rear|environment|trasera/i.test(d.label)) ||
            devices[devices.length - 1];

          const selectedDeviceId = backCamera?.deviceId;

          const controls = await reader.decodeFromVideoDevice(
            selectedDeviceId,
            videoRef.current,
            async (result) => {
              const value = result?.getText?.() || result?.text || "";

              if (value) {
                cerrarCamara();
                await procesarCodigoDetectado(value);
              }
            }
          );

          setReaderControls(controls);
        } catch {
          cerrarCamara();
          setToast({
            type: "error",
            message: "No se pudo abrir la cámara. Escribe la ubicación manualmente.",
          });
        }
      }, 250);
    } catch {
      cerrarCamara();
      setToast({
        type: "error",
        message: "No se pudo iniciar la cámara",
      });
    }
  };

  const leerFoto = async (file) => {
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    try {
      const reader = crearReaderZXing();

      const img = document.createElement("img");
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const decodeCanvas = async (canvas) => {
        try {
          const result = await reader.decodeFromCanvas(canvas);
          return normalizeCode(result?.getText?.() || result?.text || "");
        } catch {
          return "";
        }
      };

      const makeCanvas = ({
        scale = 4,
        padding = 120,
        threshold = false,
        invert = false,
      }) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth * scale + padding * 2;
        canvas.height = img.naturalHeight * scale + padding * 2;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img,
          padding,
          padding,
          img.naturalWidth * scale,
          img.naturalHeight * scale
        );

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          let lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

          if (threshold) {
            lum = lum > 145 ? 255 : 0;
          }

          if (invert) {
            lum = 255 - lum;
          }

          data[i] = lum;
          data[i + 1] = lum;
          data[i + 2] = lum;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
      };

      const intentos = [
        { scale: 2, padding: 80, threshold: false },
        { scale: 4, padding: 120, threshold: false },
        { scale: 6, padding: 160, threshold: false },
        { scale: 4, padding: 120, threshold: true },
        { scale: 6, padding: 160, threshold: true },
        { scale: 8, padding: 200, threshold: true },
        { scale: 4, padding: 120, threshold: true, invert: true },
        { scale: 6, padding: 160, threshold: true, invert: true },
      ];

      for (const config of intentos) {
        const canvas = makeCanvas(config);
        const value = await decodeCanvas(canvas);

        if (value) {
          await procesarCodigoDetectado(value);
          return;
        }
      }

      try {
        const result = await reader.decodeFromImageElement(img);
        const value = normalizeCode(result?.getText?.() || result?.text || "");

        if (value) {
          await procesarCodigoDetectado(value);
          return;
        }
      } catch {
        // sigue al error final
      }

      setToast({
        type: "error",
        message: "No se pudo leer el código de la imagen. Escríbelo manualmente.",
      });
    } catch {
      setToast({
        type: "error",
        message: "No se pudo procesar la imagen",
      });
    } finally {
      URL.revokeObjectURL(imageUrl);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div style={{ padding: 18, background: colors.bg, minHeight: "100vh" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => leerFoto(e.target.files?.[0])}
      />

      <div style={{ ...card, marginBottom: 16, border: "1px solid #f3c7c7" }}>
        <div style={{ ...header, background: "#fdf0f0", borderBottom: "1px solid #f3c7c7" }}>
          <div>
            <div style={{ ...eyebrow, color: colors.bad }}>WMS / PRODUCTO NO CONFORME (PNC)</div>
            <h2 style={{ margin: "4px 0", color: colors.bad }}>Material bloqueado (PNC)</h2>
            <div style={{ color: colors.muted, fontSize: 13, fontWeight: 700 }}>
              Este stock NO cuenta para picking. Desbloquéalo dándole una ubicación, o dalo de baja.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setPncAbierto((v) => !v)}
              style={{ ...buttonSecondary, borderColor: colors.bad, color: colors.bad }}
              title={pncAbierto ? "Ocultar la tabla" : "Ver la tabla"}
            >
              {pncAbierto ? <EyeOff size={16} /> : <Eye size={16} />}
              {pncAbierto ? "Ocultar" : `Ver (${pncRows.length})`}
            </button>
            <button onClick={cargarPnc} style={buttonSecondary}>
              <RefreshCw size={16} /> Refrescar
            </button>
          </div>
        </div>

        {!pncAbierto ? (
          <div style={{ padding: 16, color: colors.muted, fontSize: 13, fontWeight: 700 }}>
            Tabla oculta. Haz clic en el ojo <Eye size={14} style={{ verticalAlign: "middle" }} /> para ver los {pncRows.length} materiales bloqueados.
          </div>
        ) : (
        <div style={{ padding: 16 }}>
          {pncLoading ? (
            <div style={{ color: colors.muted, fontWeight: 700 }}>Cargando PNC…</div>
          ) : pncRows.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: 13 }}>No hay material en PNC bloqueado.</div>
          ) : (
            <div style={{ overflowX: "auto", border: `1px solid ${colors.border}`, borderRadius: 10 }}>
              <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr>
                    {["Código", "Descripción", "Lote almacén", "Vence", "Zona", "Cantidad", "Ubicación destino", "Acciones"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Acciones" ? "center" : "left", padding: "8px 10px", background: "#0f2744", color: "#eaf1f8", fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pncRows.map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 ? "#fbfcfe" : "#fff" }}>
                      <td style={{ padding: "7px 10px", fontWeight: 800, color: colors.navy }}>{r.codigo_material}</td>
                      <td style={{ padding: "7px 10px" }}>{r.descripcion_material}</td>
                      <td style={{ padding: "7px 10px" }}>{r.lote_almacen}</td>
                      <td style={{ padding: "7px 10px" }}>{String(r.fecha_vencimiento || "").slice(0, 10)}</td>
                      <td style={{ padding: "7px 10px" }}>{r.zona}</td>
                      <td style={{ padding: "7px 10px", fontWeight: 800, textAlign: "right" }}>{new Intl.NumberFormat("es-CO").format(r.cantidad)}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <input
                          list="lista-ubicaciones"
                          value={pncUbic[r.id] || ""}
                          onChange={(e) => setPncUbic((p) => ({ ...p, [r.id]: normalizeCode(e.target.value) }))}
                          placeholder="Ubicación…"
                          style={{ width: 130, height: 30, borderRadius: 6, border: `1px solid ${colors.border}`, padding: "0 8px", fontSize: 12 }}
                        />
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                          <button
                            onClick={() => onDesbloquear(r)}
                            disabled={pncBusyId === r.id}
                            style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "1px solid #0f9d58", background: "linear-gradient(135deg,#22c55e,#12a150)", color: "#fff", fontWeight: 800, fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(18,161,80,.30)", opacity: pncBusyId === r.id ? 0.7 : 1 }}
                          >
                            <CheckCircle2 size={14} /> {pncBusyId === r.id ? "…" : "Desbloquear"}
                          </button>
                          <button
                            onClick={() => onDarDeBaja(r)}
                            disabled={pncBusyId === r.id}
                            style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid ${colors.bad}`, background: "#fff", color: colors.bad, fontWeight: 800, fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, opacity: pncBusyId === r.id ? 0.7 : 1 }}
                          >
                            <X size={14} /> Dar de baja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>

      <div style={card}>
        <div style={header}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              aria-label="INOVA"
              style={{
                display: "inline-block",
                width: 118,
                height: 38,
                flexShrink: 0,
                backgroundColor: colors.navy,
                WebkitMask: "url(/inova-azul.png) left center / contain no-repeat",
                mask: "url(/inova-azul.png) left center / contain no-repeat",
              }}
            />
            <div>
              <div style={eyebrow}>WMS / REASIGNACIÓN AUDITABLE</div>

              <h2 style={{ margin: "4px 0", color: colors.navy }}>
                Reasignación por ubicación
              </h2>

              <div style={{ color: colors.muted, fontSize: 13, fontWeight: 700 }}>
                Escanea o selecciona una ubicación. El sistema trae todo el stock
                almacenado allí.
              </div>
            </div>
          </div>

          <button onClick={() => cargarStockUbicacion()} style={buttonSecondary}>
            <RefreshCw size={16} />
            Refrescar
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={panelScanner}>
            <Field label="Ubicación origen">
              <input
                list="lista-ubicaciones"
                placeholder="Escanea o escribe ubicación..."
                value={ubicacionOrigen}
                onChange={(e) => setUbicacionOrigen(normalizeCode(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    cargarStockUbicacion(e.target.value);
                  }
                }}
                style={inputStyle}
              />
            </Field>

            <datalist id="lista-ubicaciones">
              {ubicaciones.map((u) => (
                <option key={u.id || u.ubicacion} value={normalizeCode(u.ubicacion)}>
                  {u.zona || ""} {u.bodega || ""}
                </option>
              ))}
            </datalist>

            <button onClick={() => cargarStockUbicacion()} style={buttonPrimary}>
              <MapPin size={16} />
              Consultar ubicación
            </button>

            <button onClick={iniciarCamara} style={buttonSecondary}>
              <Camera size={16} />
              Escanear
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={buttonSecondary}
            >
              <ImagePlus size={16} />
              Foto/Galería
            </button>
          </div>

          <div style={kpiGrid}>
            <Kpi
              icon={<Package size={18} />}
              label="Líneas en ubicación"
              value={stock.length}
            />

            <Kpi
              icon={<Package size={18} />}
              label="Cantidad total"
              value={fmtNumber(totalCantidad)}
            />

            <Kpi
              icon={<MapPin size={18} />}
              label="Ubicación"
              value={ubicacionInfo?.ubicacion || "-"}
            />
          </div>

          {ubicacionInfo && (
            <div style={ubicacionBox}>
              <b>{ubicacionInfo.ubicacion}</b>
              <span>Base: {ubicacionInfo.ubicacion_base || "-"}</span>
              <span>Zona: {ubicacionInfo.zona || "-"}</span>
              <span>Bodega: {ubicacionInfo.bodega || "-"}</span>
              <span>Total líneas: {ubicacionInfo.total_lineas || 0}</span>
            </div>
          )}

          <div style={auditBar}>
            <Field label="Usuario">
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Motivo general / auditoría">
              <input
                placeholder="Ej: Reubicación física, conteo, corrección operativa..."
                value={motivoGlobal}
                onChange={(e) => setMotivoGlobal(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              position: "relative",
              width: 420,
              maxWidth: "100%",
              marginBottom: 12,
            }}
          >
            <Search
              size={16}
              color={colors.muted}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />

            <input
              placeholder="Filtrar por SKU, descripción, lote, vencimiento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredStock.length === 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18, color: colors.muted, fontWeight: 800 }}>
                {loading ? "Cargando..." : "Escanea o selecciona una ubicación para ver su contenido."}
              </div>
            ) : (
              filteredStock.map((item, i) => {
                const key = keyLinea(item);
                const accion = acciones[key] || { tipo: "TRASLADO" };
                const tipo = accion.tipo || "TRASLADO";
                const editaLote = ["TRASLADO", "CAMBIO_LOTE"].includes(tipo);
                const miniLabel = { fontSize: 11, color: colors.muted, marginBottom: 4, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".03em" };
                const naDash = <div style={{ color: colors.muted, fontWeight: 800, fontSize: 12, height: 34, display: "flex", alignItems: "center" }}>—</div>;
                const chip = (txt) => (
                  <span style={{ fontSize: 11, background: "#eef2f7", color: colors.navy, padding: "2px 8px", borderRadius: 6, fontWeight: 700, whiteSpace: "nowrap" }}>{txt}</span>
                );
                return (
                  <div key={`${key}-${i}`} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ flex: "0 0 78px", fontFamily: "monospace", fontWeight: 800, color: colors.blue }}>{item.codigo_material}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.descripcion_material}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          {chip(`UM ${item.unidad_medida || "-"}`)}
                          {chip(item.familia || "-")}
                          {chip(`lote ${item.lote_almacen || "-"}`)}
                          {chip(`prov ${item.lote_proveedor || "-"}`)}
                          {chip(`vence ${String(item.fecha_vencimiento || "").slice(0, 10) || "-"}`)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: colors.muted }}>disponible</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: colors.navy }}>{fmtNumber(item.cantidad_disponible)}</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr)) auto", gap: 10, alignItems: "end", padding: "12px 16px", background: "#f7f9fc" }}>
                      <div>
                        <div style={miniLabel}>Acción</div>
                        <select value={tipo} onChange={(e) => actualizarAccion(item, { tipo: e.target.value })} style={{ ...miniInput, width: "100%" }}>
                          <option value="TRASLADO">Reasignar ubicación</option>
                          <option value="CAMBIO_LOTE">Cambiar lote/vencimiento</option>
                          <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
                          <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
                        </select>
                      </div>
                      <div>
                        <div style={miniLabel}>Destino</div>
                        {tipo === "TRASLADO" ? (
                          <input list="lista-ubicaciones" placeholder="Ubicación destino" value={accion.ubicacion_destino || ""} onChange={(e) => actualizarAccion(item, { ubicacion_destino: normalizeCode(e.target.value) })} style={{ ...miniInput, width: "100%" }} />
                        ) : naDash}
                      </div>
                      <div>
                        <div style={miniLabel}>Cantidad</div>
                        <input type="number" min="0" step="0.01" placeholder="0" value={accion.cantidad || ""} onChange={(e) => actualizarAccion(item, { cantidad: e.target.value })} style={{ ...miniInput, width: "100%", textAlign: "right" }} />
                      </div>
                      <div>
                        <div style={miniLabel}>Nuevo lote prov.</div>
                        {editaLote ? (
                          <input placeholder={item.lote_proveedor || "Lote prov."} value={accion.nuevo_lote_proveedor || ""} onChange={(e) => actualizarAccion(item, { nuevo_lote_proveedor: e.target.value })} style={{ ...miniInput, width: "100%" }} />
                        ) : naDash}
                      </div>
                      <div>
                        <div style={miniLabel}>Nuevo vencimiento</div>
                        {editaLote ? (
                          <input type="date" value={(accion.nueva_fecha_vencimiento || "").slice(0, 10)} onChange={(e) => actualizarAccion(item, { nueva_fecha_vencimiento: e.target.value })} style={{ ...miniInput, width: "100%" }} />
                        ) : naDash}
                      </div>
                      <button onClick={() => ejecutarAccion(item)} disabled={loading} style={{ ...buttonPrimary, height: 38, opacity: loading ? 0.65 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                        {tipo === "TRASLADO" ? <ArrowRightLeft size={15} /> : <SlidersHorizontal size={15} />} Ejecutar
                      </button>
                    </div>

                    <div style={{ padding: "0 16px 12px", background: "#f7f9fc" }}>
                      <div style={miniLabel}>Motivo línea</div>
                      <input placeholder="Motivo opcional por línea" value={accion.motivo || ""} onChange={(e) => actualizarAccion(item, { motivo: e.target.value })} style={{ ...miniInput, width: "100%" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {cameraOpen && (
        <div style={cameraModal}>
          <div style={cameraCard}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
                alignItems: "center",
              }}
            >
              <b style={{ color: colors.navy }}>Escanear ubicación</b>

              <button onClick={cerrarCamara} style={iconButton}>
                <X size={18} />
              </button>
            </div>

            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: "100%",
                maxHeight: 420,
                objectFit: "cover",
                borderRadius: 12,
                background: "#000",
              }}
            />

            <div
              style={{
                marginTop: 10,
                color: colors.muted,
                fontWeight: 800,
              }}
            >
              Apunta al código de barras o QR de la ubicación.
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: toast.type === "error" ? colors.bad : colors.good,
            color: "#fff",
            padding: "12px 14px",
            borderRadius: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontWeight: 900,
            zIndex: 9999,
            maxWidth: 520,
          }}
        >
          {toast.type === "error" ? (
            <AlertTriangle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}

          {toast.message}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div style={kpiCard}>
      {icon}

      <div>
        <div
          style={{
            fontSize: 19,
            fontWeight: 900,
            color: colors.navy,
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize: 12,
            color: colors.muted,
            fontWeight: 800,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function Th({ children, right }) {
  return (
    <th
      style={{
        padding: 12,
        textAlign: right ? "right" : "left",
        background: colors.soft,
        borderBottom: `1px solid ${colors.border}`,
        color: colors.navy,
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, right, strong }) {
  return (
    <td
      style={{
        padding: 10,
        textAlign: right ? "right" : "left",
        borderBottom: "1px solid #edf2f7",
        color: colors.text,
        fontSize: 13,
        fontWeight: strong ? 900 : 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}

const card = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  overflow: "hidden",
};

const header = {
  padding: 18,
  borderBottom: `1px solid ${colors.border}`,
  background: colors.soft,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const eyebrow = {
  fontSize: 12,
  fontWeight: 900,
  color: colors.muted,
  letterSpacing: ".08em",
};

const panelScanner = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) auto auto auto",
  gap: 12,
  alignItems: "end",
  marginBottom: 16,
};

const auditBar = {
  display: "grid",
  gridTemplateColumns: "240px 1fr",
  gap: 12,
  marginBottom: 16,
};

const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(180px, 240px))",
  gap: 12,
  marginBottom: 14,
};

const kpiCard = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: 14,
  display: "flex",
  gap: 12,
  alignItems: "center",
};

const ubicacionBox = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  background: "#eef6ff",
  border: "1px solid #cfe6ff",
  color: colors.navy,
  padding: 12,
  borderRadius: 12,
  fontWeight: 800,
  marginBottom: 16,
};

const tableWrap = {
  overflowX: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
};

const inputStyle = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  padding: "0 12px",
  outline: "none",
  fontWeight: 800,
  color: colors.text,
  background: "#fff",
  boxSizing: "border-box",
};

const miniInput = {
  width: "100%",
  height: 36,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  padding: "0 10px",
  outline: "none",
  fontWeight: 800,
  color: colors.text,
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11,
  color: colors.muted,
  fontWeight: 900,
  marginBottom: 6,
  textTransform: "uppercase",
};

const buttonPrimary = {
  height: 42,
  borderRadius: 10,
  border: `1px solid ${colors.blue}`,
  background: colors.blue,
  color: "#fff",
  padding: "0 16px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const buttonSecondary = {
  height: 42,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text,
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const buttonTiny = {
  height: 34,
  borderRadius: 8,
  border: `1px solid ${colors.blue}`,
  background: colors.blue,
  color: "#fff",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const cameraModal = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9998,
  padding: 20,
};

const cameraCard = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  width: 520,
  maxWidth: "100%",
};

const iconButton = {
  border: "none",
  background: colors.soft,
  borderRadius: 8,
  padding: 6,
  cursor: "pointer",
};
