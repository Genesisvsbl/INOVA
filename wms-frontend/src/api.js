const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://inova-z7wy.onrender.com");

async function handle(res) {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getMateriales(search = "") {
  const url = new URL(`${API_URL}/materiales`);
  if (search) url.searchParams.set("search", search);
  return fetch(url).then(handle);
}

export function crearMaterial(payload) {
  return fetch(`${API_URL}/materiales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function editarMaterial(id, payload) {
  return fetch(`${API_URL}/materiales/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function eliminarMaterial(id) {
  return fetch(`${API_URL}/materiales/${id}`, {
    method: "DELETE",
  }).then(handle);
}

export function crearMovimiento(payload) {
  return fetch(`${API_URL}/movimientos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function getStock(codigo) {
  return fetch(`${API_URL}/stock/${encodeURIComponent(codigo)}`).then(handle);
}

export function getProveedores() {
  return fetch(`${API_URL}/proveedores`).then(handle);
}