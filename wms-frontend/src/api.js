const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://inova-z7wy.onrender.com");

async function handle(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json();
  }

  return null;
}

function apiFetch(path, options = {}) {
  return fetch(`${API_URL}${path}`, options).then(handle);
}

export { API_URL, handle, apiFetch };

export function getMateriales(search = "") {
  const url = new URL(`${API_URL}/materiales`);

  if (search) {
    url.searchParams.set("search", search);
  }

  return fetch(url).then(handle);
}

export function crearMaterial(payload) {
  return apiFetch("/materiales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function editarMaterial(id, payload) {
  return apiFetch(`/materiales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function eliminarMaterial(id) {
  return apiFetch(`/materiales/${id}`, {
    method: "DELETE",
  });
}

export function importarMaterialesExcel(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/materiales/importar", {
    method: "POST",
    body: formData,
  });
}

export function crearMovimiento(payload) {
  return apiFetch("/movimientos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function crearMovimientosBulk(payload) {
  return apiFetch("/movimientos/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getMovimientos() {
  return apiFetch("/movimientos");
}

export function getEnTransito(q = "") {
  const url = new URL(`${API_URL}/movimientos/en-transito`);

  if (q) {
    url.searchParams.set("q", q);
  }

  return fetch(url).then(handle);
}

export function asignarUbicacionDesdeTransito(movimientoId, codigoUbicacion) {
  return apiFetch(`/movimientos/${movimientoId}/asignar-ubicacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo_ubicacion: codigoUbicacion }),
  });
}

export function getStock(codigo) {
  return apiFetch(`/stock/${encodeURIComponent(codigo)}`);
}

export function getProveedores(search = "") {
  const url = new URL(`${API_URL}/proveedores`);

  if (search) {
    url.searchParams.set("search", search);
  }

  return fetch(url).then(handle);
}

export function crearProveedor(payload) {
  return apiFetch("/proveedores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function editarProveedor(id, payload) {
  return apiFetch(`/proveedores/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function eliminarProveedor(id) {
  return apiFetch(`/proveedores/${id}`, {
    method: "DELETE",
  });
}

export function importarProveedoresExcel(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/proveedores/importar", {
    method: "POST",
    body: formData,
  });
}

export function getUbicaciones(search = "") {
  const url = new URL(`${API_URL}/ubicaciones`);

  if (search) {
    url.searchParams.set("search", search);
  }

  return fetch(url).then(handle);
}

export function crearUbicacion(payload) {
  return apiFetch("/ubicaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function editarUbicacion(id, payload) {
  return apiFetch(`/ubicaciones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function eliminarUbicacion(id) {
  return apiFetch(`/ubicaciones/${id}`, {
    method: "DELETE",
  });
}

export function importarUbicacionesExcel(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/ubicaciones/importar", {
    method: "POST",
    body: formData,
  });
}

export function getMotor() {
  return apiFetch("/motor");
}

export function getRotulos(params = {}) {
  const url = new URL(`${API_URL}/rotulos`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return fetch(url).then(handle);
}

export function crearRotulo(payload) {
  return apiFetch("/rotulos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function crearRotulosBulk(payload) {
  return apiFetch("/rotulos/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function eliminarRotulo(id) {
  return apiFetch(`/rotulos/${id}`, {
    method: "DELETE",
  });
}

export function imprimirRotulo(rotuloId, copias = 1) {
  return apiFetch("/rotulos/imprimir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rotulo_id: rotuloId,
      copias,
    }),
  });
}

export function importarInventarioInicial(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/movimientos/importar_inicial", {
    method: "POST",
    body: formData,
  });
}

export function importarDespachos(file) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch("/despachos/importar", {
    method: "POST",
    body: formData,
  });
}

export function getDespachos(params = {}) {
  const url = new URL(`${API_URL}/despachos`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return fetch(url).then(handle);
}

export function generarPicking(reserva) {
  return apiFetch(`/despachos/generar-picking/${encodeURIComponent(reserva)}`, {
    method: "POST",
  });
}

export function verPicking(reserva) {
  return apiFetch(`/despachos/picking/${encodeURIComponent(reserva)}`);
}

export function confirmarPicking(reserva, payload) {
  return apiFetch(`/despachos/confirmar-picking/${encodeURIComponent(reserva)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function marcarPickingImpreso(reserva) {
  return apiFetch(`/despachos/marcar-impreso/${encodeURIComponent(reserva)}`, {
    method: "POST",
  });
}