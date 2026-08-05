import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// --- Ajuste global de modales / toolbox ---------------------------------
// Cuando se abre cualquier modal o toolbox, lo llevamos a la vista y hacemos
// que quepa en la pantalla (scroll interno si es muy alto), para que el
// usuario siempre lo vea desde arriba sin tener que desplazarse.
(function initModalAutoFit() {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") return;

  const esOverlayFijo = (el) => {
    try {
      if (getComputedStyle(el).position !== "fixed") return false;
      const r = el.getBoundingClientRect();
      return r.width >= window.innerWidth * 0.72 && r.height >= window.innerHeight * 0.72;
    } catch {
      return false;
    }
  };

  const ajustar = (el) => {
    if (!(el instanceof HTMLElement)) return;
    requestAnimationFrame(() => {
      try {
        const rolDialogo =
          el.getAttribute("role") === "dialog" || el.getAttribute("aria-modal") === "true";

        if (esOverlayFijo(el)) {
          // Overlay a pantalla completa: permitir scroll y, si el contenido es
          // más alto que la ventana, alinearlo arriba para no cortar el inicio.
          el.style.overflowY = "auto";
          const hijoAlto = Array.from(el.children).some(
            (c) =>
              c instanceof HTMLElement &&
              c.getBoundingClientRect().height > window.innerHeight - 20
          );
          if (hijoAlto && getComputedStyle(el).alignItems === "center") {
            el.style.alignItems = "flex-start";
          }
          el.scrollTop = 0;
        } else if (rolDialogo) {
          // Modal/toolbox en el flujo de la página: centrarlo en la vista.
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        }
      } catch {
        /* no-op */
      }
    });
  };

  const candidato = (n) =>
    n instanceof HTMLElement &&
    ((n.style && n.style.position === "fixed") ||
      n.getAttribute("role") === "dialog" ||
      n.getAttribute("aria-modal") === "true");

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (candidato(n)) ajustar(n);
        // por si el overlay/dialogo viene anidado dentro del nodo agregado
        const anidados = n.querySelectorAll
          ? n.querySelectorAll('[role="dialog"],[aria-modal="true"]')
          : [];
        anidados.forEach(ajustar);
      }
    }
  });

  const start = () => obs.observe(document.body, { childList: true, subtree: true });
  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start);
})();