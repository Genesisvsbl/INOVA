import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  Database,
  Loader2,
  Radar,
  ShieldCheck,
  Sparkles,
  Activity,
} from "lucide-react";

const ETO_API_URL =
  import.meta.env.VITE_ETO_API_URL || "http://127.0.0.1:8001";

const ETO_REAL_PORTAL_URL =
  import.meta.env.VITE_ETO_REAL_PORTAL_URL ||
  "http://127.0.0.1:5173";

const INOVA_LOGIN_URL =
  import.meta.env.VITE_INOVA_LOGIN_URL ||
  "https://inova-delta.vercel.app/login?resetLogin=true";

export default function EtoPortal() {
  const [status, setStatus] = useState("Preparando entorno ETO...");
  const [attempt, setAttempt] = useState(1);
  const [progress, setProgress] = useState(12);

  const session = useMemo(() => {
    const params = new URLSearchParams(window.location.search);

    return {
      authorized: params.get("etoAuthorized") === "true",
      accessLevel: params.get("etoAccessLevel") || "1",
      accessCode: params.get("etoAccessCode") || "N1-ETO",
      user: params.get("etoUser") || "N1-ETO",
      role: params.get("etoRole") || "NIVEL_1_ETO",
    };
  }, []);

  const finalUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const url = new URL(ETO_REAL_PORTAL_URL);

    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }, []);

  useEffect(() => {
    if (!session.authorized) {
      window.location.replace(INOVA_LOGIN_URL);
      return;
    }

    sessionStorage.setItem("etoAuthorized", "true");
    sessionStorage.setItem("etoAccessLevel", session.accessLevel);
    sessionStorage.setItem("etoAccessCode", session.accessCode);
    sessionStorage.setItem("etoUser", session.user);
    sessionStorage.setItem("etoRole", session.role);
  }, [session]);

  useEffect(() => {
    if (!session.authorized) return;

    let cancelled = false;

    async function wakeRender() {
      const maxAttempts = 30;

      for (let i = 1; i <= maxAttempts; i += 1) {
        if (cancelled) return;

        setAttempt(i);
        setProgress(Math.min(92, 12 + i * 3));

        if (i <= 2) {
          setStatus("Inicializando núcleo ETO...");
        } else if (i <= 5) {
          setStatus("Conectando con API segura...");
        } else if (i <= 10) {
          setStatus("Sincronizando servicio...");
        } else if (i <= 18) {
          setStatus("Preparando módulos del portal...");
        } else {
          setStatus("Últimos segundos, preparando acceso...");
        }

        try {
          const response = await fetch(`${ETO_API_URL}/api/version`, {
            method: "GET",
            cache: "no-store",
          });

          if (response.ok) {
            if (cancelled) return;

            setProgress(100);
            setStatus("Portal ETO listo. Abriendo experiencia...");

            setTimeout(() => {
              window.location.replace(finalUrl);
            }, 850);

            return;
          }
        } catch {
          // Render aún está despertando. Seguimos intentando.
        }

        await new Promise((resolve) => setTimeout(resolve, 2400));
      }

      if (!cancelled) {
        setProgress(100);
        setStatus("El servicio tardó más de lo esperado. Abriendo portal...");

        setTimeout(() => {
          window.location.replace(finalUrl);
        }, 1200);
      }
    }

    wakeRender();

    return () => {
      cancelled = true;
    };
  }, [session.authorized, finalUrl]);

  return (
    <main className="eto-loading-shell">
      <style>{css}</style>

      <div className="bg-grid" />
      <div className="digital-depth" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="orb orb-three" />
      <div className="scan-line" />
      <div className="floor-glow" />

      <section className="loader-card">
        <div className="logo-zone">
          <img
            src="/ICONOINOVA.ico"
            alt="INOVA"
            onError={(event) => {
              event.currentTarget.src = "/INOVA.png";
            }}
          />

          <div className="logo-ring ring-one" />
          <div className="logo-ring ring-two" />
          <div className="logo-ring ring-three" />
          <div className="logo-ring ring-four" />
        </div>

        <div className="loader-copy">
          <span className="kicker">
            <Sparkles size={15} />
            ACCESO AUTORIZADO
          </span>

          <h1>ETO</h1>

          <p>{status}</p>
        </div>

        <div className="status-row">
          <StatusPill icon={ShieldCheck} label="Sesión" value={session.user} />
          <StatusPill icon={Database} label="Nivel" value={session.accessLevel} />
          <StatusPill icon={Cpu} label="API" value={`Intento ${attempt}`} />
        </div>

        <div className="progress-shell">
          <div className="progress-head">
            <span>Preparando portal</span>
            <strong>{progress}%</strong>
          </div>

          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
            <i />
          </div>
        </div>

        <div className="loader-footer">
          <Loader2 size={17} className="spin" />
          <span>
            Por favor espera. El portal abrirá automáticamente cuando esté listo.
          </span>
        </div>
      </section>

      <section className="floating-panel panel-left">
        <Radar size={19} />
        <span>Validando servicio</span>
      </section>

      <section className="floating-panel panel-right">
        <Activity size={19} />
        <span>Sincronizando</span>
      </section>
    </main>
  );
}

function StatusPill({ icon: Icon, label, value }) {
  return (
    <div className="status-pill">
      <Icon size={17} />
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

const css = `
:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
  background: #020807;
}

.eto-loading-shell {
  min-height: 100vh;
  width: 100%;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #ffffff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 50% -4%, rgba(74,222,128,.30), transparent 24%),
    radial-gradient(circle at 16% 24%, rgba(34,197,94,.20), transparent 28%),
    radial-gradient(circle at 86% 36%, rgba(34,197,94,.20), transparent 30%),
    radial-gradient(circle at 50% 112%, rgba(34,197,94,.26), transparent 36%),
    linear-gradient(135deg, #010806 0%, #03140f 36%, #041827 72%, #020617 100%);
}

.bg-grid {
  position: fixed;
  inset: 0;
  opacity: .17;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(74,222,128,.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56,189,248,.08) 1px, transparent 1px);
  background-size: 74px 74px;
  mask-image: radial-gradient(circle at center, black, transparent 74%);
}

.digital-depth {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .34;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent 42px,
      rgba(74,222,128,.07) 43px,
      transparent 44px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 54px,
      rgba(56,189,248,.055) 55px,
      transparent 56px
    );
  transform: perspective(700px) rotateX(62deg) translateY(230px) scale(1.8);
  transform-origin: bottom center;
  filter: blur(.2px);
}

.orb {
  position: fixed;
  border-radius: 999px;
  filter: blur(52px);
  pointer-events: none;
}

.orb-one {
  width: 560px;
  height: 560px;
  top: -260px;
  left: -140px;
  background: #16a34a;
  opacity: .34;
}

.orb-two {
  width: 540px;
  height: 540px;
  right: -180px;
  bottom: -220px;
  background: #0891b2;
  opacity: .34;
}

.orb-three {
  width: 430px;
  height: 430px;
  left: 50%;
  bottom: -220px;
  transform: translateX(-50%);
  background: #22c55e;
  opacity: .28;
}

.scan-line {
  position: fixed;
  left: -10%;
  top: 0;
  width: 120%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(74,222,128,.95), transparent);
  box-shadow: 0 0 32px rgba(74,222,128,.72);
  animation: scan 3.2s linear infinite;
  pointer-events: none;
}

.floor-glow {
  position: fixed;
  left: 50%;
  bottom: -22px;
  width: 52vw;
  height: 180px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34,197,94,.42), transparent 68%);
  filter: blur(18px);
  opacity: .72;
  pointer-events: none;
}

.loader-card {
  position: relative;
  z-index: 2;
  width: min(92vw, 700px);
  padding: clamp(28px, 4vw, 48px);
  border-radius: 40px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(34,197,94,.19), transparent 30%),
    radial-gradient(circle at top right, rgba(56,189,248,.12), transparent 32%),
    linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.038));
  border: 1px solid rgba(74,222,128,.28);
  box-shadow:
    0 36px 100px rgba(0,0,0,.58),
    0 0 90px rgba(34,197,94,.22),
    0 0 34px rgba(56,189,248,.13),
    inset 0 1px 0 rgba(255,255,255,.11);
  backdrop-filter: blur(26px);
  overflow: hidden;
}

.loader-card::before {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: 39px;
  border: 1px solid rgba(255,255,255,.07);
  pointer-events: none;
}

.loader-card::after {
  content: "";
  position: absolute;
  left: -30%;
  top: -30%;
  width: 60%;
  height: 160%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.105), transparent);
  transform: rotate(18deg);
  animation: shine 4.2s ease-in-out infinite;
  pointer-events: none;
}

.logo-zone {
  position: relative;
  width: 158px;
  height: 158px;
  margin: 0 auto 24px;
  display: grid;
  place-items: center;
}

.logo-zone img {
  width: 96px;
  height: 96px;
  object-fit: contain;
  position: relative;
  z-index: 4;
  filter: brightness(0) invert(1) drop-shadow(0 0 28px rgba(255,255,255,.24));
  animation: logoPulse 1.7s ease-in-out infinite;
}

.logo-ring {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(74,222,128,.36);
  box-shadow: 0 0 40px rgba(34,197,94,.22);
}

.ring-one {
  inset: 0;
  border-top-color: rgba(34,197,94,.95);
  animation: spinRing 8s linear infinite;
}

.ring-two {
  inset: 14px;
  border-color: rgba(56,189,248,.28);
  border-right-color: rgba(56,189,248,.88);
  animation: spinRingReverse 6.5s linear infinite;
}

.ring-three {
  inset: 28px;
  border-color: rgba(74,222,128,.32);
  border-left-color: rgba(74,222,128,.95);
  animation: spinRing 5.2s linear infinite;
}

.ring-four {
  inset: 42px;
  border-color: rgba(255,255,255,.08);
  border-bottom-color: rgba(34,197,94,.78);
  animation: spinRingReverse 4.4s linear infinite;
}

.loader-copy {
  position: relative;
  z-index: 3;
}

.kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #4ade80;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .19em;
}

.loader-copy h1 {
  margin: 12px 0 12px;
  font-size: clamp(50px, 8vw, 88px);
  line-height: .84;
  letter-spacing: -.065em;
  text-shadow:
    0 0 22px rgba(255,255,255,.18),
    0 0 34px rgba(34,197,94,.18);
}

.loader-copy p {
  max-width: 530px;
  margin: 0 auto;
  color: rgba(255,255,255,.75);
  font-size: clamp(15px, 2vw, 18px);
  font-weight: 750;
  line-height: 1.5;
}

.status-row {
  position: relative;
  z-index: 3;
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.status-pill {
  min-height: 76px;
  padding: 14px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(74,222,128,.16);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
}

.status-pill svg {
  color: #22c55e;
  flex: 0 0 auto;
  filter: drop-shadow(0 0 12px rgba(34,197,94,.38));
}

.status-pill small,
.status-pill strong {
  display: block;
  line-height: 1.1;
}

.status-pill small {
  color: rgba(255,255,255,.50);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.status-pill strong {
  margin-top: 5px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  word-break: break-word;
}

.progress-shell {
  position: relative;
  z-index: 3;
  margin-top: 28px;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  color: rgba(255,255,255,.72);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.progress-head strong {
  color: #4ade80;
}

.progress-track {
  position: relative;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255,255,255,.095);
  border: 1px solid rgba(74,222,128,.18);
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #16a34a, #22c55e, #4ade80, #86efac, #bbf7d0);
  box-shadow:
    0 0 24px rgba(34,197,94,.58),
    0 0 12px rgba(56,189,248,.32);
  transition: width .45s ease;
}

.progress-track i {
  position: absolute;
  inset: 0;
  width: 38%;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
  animation: progressGlow 1.4s ease-in-out infinite;
}

.loader-footer {
  position: relative;
  z-index: 3;
  margin-top: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: rgba(255,255,255,.56);
  font-size: 13px;
  line-height: 1.45;
}

.spin {
  animation: rotate 1s linear infinite;
}

.floating-panel {
  position: fixed;
  z-index: 1;
  min-width: 190px;
  height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  border-radius: 18px;
  color: rgba(255,255,255,.78);
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(74,222,128,.22);
  backdrop-filter: blur(16px);
  font-size: 13px;
  font-weight: 850;
  box-shadow:
    0 20px 50px rgba(0,0,0,.22),
    0 0 28px rgba(34,197,94,.13);
}

.floating-panel::before {
  content: "";
  position: absolute;
  width: 9vw;
  max-width: 180px;
  height: 1px;
  top: 50%;
  background: linear-gradient(90deg, rgba(74,222,128,.82), transparent);
}

.panel-left::before {
  right: -9vw;
}

.panel-right::before {
  left: -9vw;
  transform: rotate(180deg);
}

.floating-panel svg {
  color: #4ade80;
  filter: drop-shadow(0 0 10px rgba(34,197,94,.52));
}

.panel-left {
  left: 7vw;
  bottom: 16vh;
  animation: floatPanel 4s ease-in-out infinite;
}

.panel-right {
  right: 7vw;
  top: 20vh;
  animation: floatPanel 4.6s ease-in-out infinite reverse;
}

@keyframes scan {
  0% {
    transform: translateY(-12vh);
    opacity: 0;
  }
  10% {
    opacity: .75;
  }
  90% {
    opacity: .75;
  }
  100% {
    transform: translateY(112vh);
    opacity: 0;
  }
}

@keyframes shine {
  0%, 45% {
    transform: translateX(-120%) rotate(18deg);
  }
  70%, 100% {
    transform: translateX(260%) rotate(18deg);
  }
}

@keyframes logoPulse {
  0%, 100% {
    opacity: .80;
    transform: scale(.98);
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}

@keyframes spinRing {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spinRingReverse {
  from {
    transform: rotate(360deg);
  }
  to {
    transform: rotate(0deg);
  }
}

@keyframes progressGlow {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(310%);
  }
}

@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}

@keyframes floatPanel {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

@media (max-width: 900px) {
  .floating-panel {
    display: none;
  }

  .status-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  body {
    overflow-y: auto;
  }

  .eto-loading-shell {
    min-height: 100dvh;
    padding: 18px 0;
  }

  .loader-card {
    width: min(100% - 22px, 430px);
    padding: 28px 20px;
    border-radius: 30px;
  }

  .logo-zone {
    width: 124px;
    height: 124px;
    margin-bottom: 18px;
  }

  .logo-zone img {
    width: 76px;
    height: 76px;
  }

  .loader-copy h1 {
    font-size: 48px;
  }

  .loader-footer {
    align-items: flex-start;
    text-align: left;
  }
}
`;
