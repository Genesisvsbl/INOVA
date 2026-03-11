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
  if (search) url.searchParams.set("search", search);
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

export function crearMovimiento(payload) {
  return apiFetch("/movimientos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getStock(codigo) {
  return apiFetch(`/stock/${encodeURIComponent(codigo)}`);
}

export function getProveedores() {
  return apiFetch("/proveedores");
}

export function getMotor(limit = 2000) {
  return apiFetch(`/motor?limit=${limit}`);
}