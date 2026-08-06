import { useMemo, useState } from "react";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cambiarMiClave } from "../adminApi";

// Panel de autoservicio para cambiar la contraseña del usuario logueado.
// Pide la clave actual, la nueva dos veces, valida y ejecuta el cambio.
export default function CambiarClaveModal({ open, onClose, usuario = "" }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [ver, setVer] = useState({ a: false, n: false, c: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  const fuerza = useMemo(() => calcularFuerza(nueva), [nueva]);

  if (!open) return null;

  const reset = () => {
    setActual("");
    setNueva("");
    setConfirmar("");
    setVer({ a: false, n: false, c: false });
    setError("");
    setSaving(false);
    setOk(false);
  };

  const cerrar = () => {
    if (saving) return;
    reset();
    onClose?.();
  };

  const enviar = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!actual.trim()) return setError("Escribe tu contraseña actual.");
    if (nueva.length < 8) return setError("La nueva contraseña debe tener mínimo 8 caracteres.");
    if (nueva !== confirmar) return setError("La confirmación no coincide con la nueva contraseña.");
    if (nueva === actual) return setError("La nueva contraseña debe ser distinta a la actual.");

    setSaving(true);
    try {
      await cambiarMiClave({ claveActual: actual, nuevaClave: nueva });
      setOk(true);
      setTimeout(cerrar, 1900);
    } catch (err) {
      setError(err?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.overlay} onMouseDown={cerrar}>
      <div style={S.card} onMouseDown={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div style={S.headIcon}><KeyRound size={20} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div style={S.title}>Cambiar contraseña</div>
            <div style={S.subtitle}>{usuario ? `Cuenta: ${usuario}` : "Tu acceso a INOVA"}</div>
          </div>
          <button type="button" onClick={cerrar} style={S.closeBtn} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {ok ? (
          <div style={S.okWrap}>
            <div style={S.okIcon}><CheckCircle2 size={40} color="#12a150" /></div>
            <div style={S.okTitle}>Contraseña actualizada</div>
            <div style={S.okText}>Tu nueva contraseña ya quedó activa. Úsala la próxima vez que inicies sesión.</div>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ padding: 20, display: "grid", gap: 14 }}>
            <Field
              label="Contraseña actual"
              value={actual}
              onChange={setActual}
              show={ver.a}
              onToggle={() => setVer((v) => ({ ...v, a: !v.a }))}
              placeholder="La que usas hoy"
              autoFocus
            />
            <Field
              label="Nueva contraseña"
              value={nueva}
              onChange={setNueva}
              show={ver.n}
              onToggle={() => setVer((v) => ({ ...v, n: !v.n }))}
              placeholder="Mínimo 8 caracteres"
            />
            {nueva.length > 0 && (
              <div style={{ marginTop: -6 }}>
                <div style={S.barTrack}>
                  <div style={{ ...S.barFill, width: `${fuerza.pct}%`, background: fuerza.color }} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: fuerza.color, marginTop: 4 }}>
                  Seguridad: {fuerza.label}
                </div>
              </div>
            )}
            <Field
              label="Confirmar nueva contraseña"
              value={confirmar}
              onChange={setConfirmar}
              show={ver.c}
              onToggle={() => setVer((v) => ({ ...v, c: !v.c }))}
              placeholder="Repite la nueva contraseña"
            />

            {error && (
              <div style={S.error}><AlertTriangle size={15} /> {error}</div>
            )}

            <div style={S.tips}>
              <ShieldCheck size={14} color="#0b3d91" />
              <span>Usa mínimo 8 caracteres. Combina mayúsculas, números y un símbolo para más seguridad.</span>
            </div>

            <div style={S.actions}>
              <button type="button" onClick={cerrar} disabled={saving} style={S.btnGhost}>Cancelar</button>
              <button type="submit" disabled={saving} style={S.btnPrimary}>
                {saving ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                {saving ? "Guardando…" : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, show, onToggle, placeholder, autoFocus }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={S.lbl}>{label}</span>
      <div style={S.inputWrap}>
        <Lock size={15} color="#8a97a8" />
        <input
          type={show ? "text" : "password"}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={S.input}
          autoComplete="off"
        />
        <button type="button" onClick={onToggle} style={S.eyeBtn} tabIndex={-1} aria-label="Mostrar/ocultar">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function calcularFuerza(pass) {
  const p = String(pass || "");
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (p.length < 8) return { pct: Math.min(100, (p.length / 8) * 40), color: "#dc2626", label: "Muy corta" };
  if (score <= 2) return { pct: 45, color: "#e08a00", label: "Débil" };
  if (score === 3) return { pct: 70, color: "#c8a200", label: "Aceptable" };
  if (score === 4) return { pct: 88, color: "#12a150", label: "Fuerte" };
  return { pct: 100, color: "#0f9d58", label: "Muy fuerte" };
}

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(8,14,30,.55)", backdropFilter: "blur(2px)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16,
  },
  card: {
    width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16, overflow: "hidden",
    boxShadow: "0 24px 70px rgba(8,14,30,.4)", border: "1px solid #e7ecf4",
  },
  header: {
    display: "flex", alignItems: "center", gap: 12, padding: "16px 18px",
    background: "linear-gradient(135deg, #0b1630, #163b73 55%, #6d28d9)", color: "#fff",
  },
  headIcon: {
    width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 16.5, fontWeight: 800, lineHeight: 1.1 },
  subtitle: { fontSize: 12, opacity: .9, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 9, border: "none", cursor: "pointer",
    background: "rgba(255,255,255,.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
  },
  lbl: { fontSize: 11.5, fontWeight: 800, color: "#5a6b80", textTransform: "uppercase", letterSpacing: ".03em" },
  inputWrap: {
    display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 10px",
    border: "1px solid #d9e2ec", borderRadius: 10, background: "#fbfcfe",
  },
  input: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#1f2d3d" },
  eyeBtn: { border: "none", background: "transparent", cursor: "pointer", color: "#6b7a90", display: "flex" },
  barTrack: { height: 6, borderRadius: 4, background: "#eef2f7", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width .2s, background .2s" },
  error: {
    display: "flex", gap: 8, alignItems: "center", background: "#fdf0f0", color: "#b42318",
    border: "1px solid #f3c7c7", borderRadius: 9, padding: "9px 11px", fontSize: 12.5, fontWeight: 700,
  },
  tips: {
    display: "flex", gap: 8, alignItems: "flex-start", background: "#eef4ff", color: "#28518f",
    border: "1px solid #d5e2fb", borderRadius: 9, padding: "9px 11px", fontSize: 11.5, fontWeight: 600,
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  btnGhost: {
    height: 42, padding: "0 16px", borderRadius: 10, border: "1px solid #d9e2ec", background: "#fff",
    color: "#1f2d3d", fontWeight: 800, cursor: "pointer",
  },
  btnPrimary: {
    height: 42, padding: "0 18px", borderRadius: 10, border: "1px solid #0f9d58",
    background: "linear-gradient(135deg,#22c55e,#12a150)", color: "#fff", fontWeight: 800, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 8px 18px rgba(18,161,80,.3)",
  },
  okWrap: { padding: "26px 22px 30px", textAlign: "center" },
  okIcon: {
    width: 72, height: 72, margin: "0 auto 12px", borderRadius: "50%", background: "#e9f9ef",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  okTitle: { fontSize: 17, fontWeight: 800, color: "#12324d" },
  okText: { fontSize: 13, color: "#5a6b80", marginTop: 6, lineHeight: 1.4 },
};
