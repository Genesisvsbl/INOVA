import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, Trash2, X } from "lucide-react";

function nativeWmsDialogFallback(options) {
  const message = options?.message || "";
  if (options?.type === "confirm") return Promise.resolve(window.confirm(message));
  if (options?.type === "prompt") return Promise.resolve(window.prompt(message, options?.defaultValue || ""));
  window.alert(message);
  return Promise.resolve(true);
}

export function showWmsDialog(options = {}) {
  if (typeof window === "undefined") return Promise.resolve(options.type === "confirm" ? false : null);
  if (!window.__wmsDialogReady) return nativeWmsDialogFallback(options);

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("wms:dialog", {
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

export function showWmsAlert(message, options = {}) {
  return showWmsDialog({
    type: "alert",
    tone: options.tone || "info",
    title: options.title || "Atención WMS",
    message,
    confirmLabel: options.confirmLabel || "Entendido",
  });
}

export function showWmsConfirm(message, options = {}) {
  return showWmsDialog({
    type: "confirm",
    tone: options.tone || "danger",
    title: options.title || "Confirmar acción",
    message,
    confirmLabel: options.confirmLabel || "Aceptar",
    cancelLabel: options.cancelLabel || "Cancelar",
  });
}

export function showWmsPrompt(message, defaultValue = "", options = {}) {
  return showWmsDialog({
    type: "prompt",
    tone: options.tone || "info",
    title: options.title || "Completar información",
    message,
    defaultValue,
    placeholder: options.placeholder || "Escribe el valor...",
    confirmLabel: options.confirmLabel || "Guardar",
    cancelLabel: options.cancelLabel || "Cancelar",
  });
}

function dialogIcon(tone, type) {
  if (type === "confirm" || tone === "danger") return Trash2;
  if (tone === "warning") return AlertTriangle;
  if (tone === "success") return CheckCircle2;
  if (tone === "secure") return ShieldCheck;
  return HelpCircle;
}

export function WmsDialogHost() {
  const [dialog, setDialog] = useState(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    window.__wmsDialogReady = true;
    const handleDialog = (event) => {
      setDialog(event.detail || null);
      setPromptValue(event.detail?.defaultValue || "");
    };
    window.addEventListener("wms:dialog", handleDialog);
    return () => {
      window.removeEventListener("wms:dialog", handleDialog);
      window.__wmsDialogReady = false;
    };
  }, []);

  if (!dialog) return null;

  const Icon = dialogIcon(dialog.tone, dialog.type);
  const messageLines = String(dialog.message || "").split("\n").filter(Boolean);
  const closeValue = dialog.type === "alert" ? true : dialog.type === "confirm" ? false : null;
  const resolveDialog = (value) => {
    dialog.resolve?.(value);
    setDialog(null);
  };

  return (
    <div className="wms-dialog-layer" role="presentation">
      <section className={`wms-dialog-card tone-${dialog.tone || "info"}`} role="dialog" aria-modal="true" aria-labelledby="wms-dialog-title">
        <button type="button" className="wms-dialog-close" onClick={() => resolveDialog(closeValue)} aria-label="Cerrar mensaje">
          <X size={18} />
        </button>

        <div className="wms-dialog-main">
          <div className="wms-dialog-mark">
            <Icon size={24} />
          </div>
          <div className="wms-dialog-copy">
            <span>WMS</span>
            <h3 id="wms-dialog-title">{dialog.title || "Atención"}</h3>
            {messageLines.length ? messageLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>) : <p>Confirma la acción para continuar.</p>}
          </div>
        </div>

        {dialog.type === "prompt" && (
          <input
            className="wms-dialog-input"
            value={promptValue}
            autoFocus
            placeholder={dialog.placeholder || "Escribe el valor..."}
            onChange={(event) => setPromptValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") resolveDialog(promptValue);
            }}
          />
        )}

        <div className="wms-dialog-actions">
          {dialog.type !== "alert" && (
            <button type="button" className="wms-dialog-btn is-ghost" onClick={() => resolveDialog(dialog.type === "confirm" ? false : null)}>
              {dialog.cancelLabel || "Cancelar"}
            </button>
          )}
          <button type="button" className="wms-dialog-btn is-primary" onClick={() => resolveDialog(dialog.type === "prompt" ? promptValue : true)}>
            {dialog.confirmLabel || "Aceptar"}
          </button>
        </div>
      </section>
    </div>
  );
}
