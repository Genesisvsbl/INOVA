import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, Trash2, X } from "lucide-react";

function nativeEtoDialogFallback(options) {
  const message = options?.message || "";
  if (options?.type === "confirm") return Promise.resolve(window.confirm(message));
  window.alert(message);
  return Promise.resolve(true);
}

export function showEtoDialog(options = {}) {
  if (typeof window === "undefined") return Promise.resolve(options.type === "confirm" ? false : true);
  if (!window.__etoDialogReady) return nativeEtoDialogFallback(options);

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("eto:dialog", {
        detail: {
          type: "alert",
          tone: "info",
          confirmLabel: "Entendido",
          cancelLabel: "Cancelar",
          ...options,
          resolve,
        },
      })
    );
  });
}

export function showEtoConfirm(message, options = {}) {
  return showEtoDialog({
    type: "confirm",
    tone: options.tone || "danger",
    title: options.title || "Confirmar acción",
    message,
    confirmLabel: options.confirmLabel || "Aceptar",
    cancelLabel: options.cancelLabel || "Cancelar",
  });
}

export function showEtoAlert(message, options = {}) {
  return showEtoDialog({
    type: "alert",
    tone: options.tone || "info",
    title: options.title || "Atención ETO",
    message,
    confirmLabel: options.confirmLabel || "Entendido",
  });
}

function dialogIcon(tone, type) {
  if (type === "confirm" || tone === "danger") return Trash2;
  if (tone === "warning") return AlertTriangle;
  if (tone === "success") return CheckCircle2;
  if (tone === "secure") return ShieldCheck;
  return HelpCircle;
}

export function EtoDialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    window.__etoDialogReady = true;
    const handleDialog = (event) => setDialog(event.detail || null);
    window.addEventListener("eto:dialog", handleDialog);
    return () => {
      window.removeEventListener("eto:dialog", handleDialog);
      window.__etoDialogReady = false;
    };
  }, []);

  if (!dialog) return null;

  const Icon = dialogIcon(dialog.tone, dialog.type);
  const messageLines = String(dialog.message || "").split("\n").filter(Boolean);
  const closeValue = dialog.type === "confirm" ? false : true;
  const resolveDialog = (value) => {
    dialog.resolve?.(value);
    setDialog(null);
  };

  return (
    <div className="eto-dialog-layer" role="presentation">
      <section className={`eto-dialog-card tone-${dialog.tone || "info"}`} role="dialog" aria-modal="true" aria-labelledby="eto-dialog-title">
        <button type="button" className="eto-dialog-close" onClick={() => resolveDialog(closeValue)} aria-label="Cerrar mensaje">
          <X size={18} />
        </button>

        <div className="eto-dialog-main">
          <div className="eto-dialog-mark">
            <Icon size={24} />
          </div>
          <div className="eto-dialog-copy">
            <span>ETO</span>
            <h3 id="eto-dialog-title">{dialog.title || "Atención"}</h3>
            {messageLines.length ? messageLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p>Confirma la acción para continuar.</p>}
          </div>
        </div>

        <div className="eto-dialog-actions">
          {dialog.type === "confirm" && (
            <button type="button" className="eto-dialog-btn is-ghost" onClick={() => resolveDialog(false)}>
              {dialog.cancelLabel || "Cancelar"}
            </button>
          )}
          <button type="button" className="eto-dialog-btn is-primary" onClick={() => resolveDialog(true)}>
            {dialog.confirmLabel || "Aceptar"}
          </button>
        </div>
      </section>
    </div>
  );
}
