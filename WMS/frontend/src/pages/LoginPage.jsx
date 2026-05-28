// LoginPage.jsx - INOVA landing + login por pilar
// Requiere: npm install lucide-react

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Menu,
  User,
  X,
} from "lucide-react";
import {
  autenticarUsuario,
  cambiarClaveObligatoria,
  consultarSolicitudAcceso,
  restablecerClaveConToken,
  solicitarAcceso,
  solicitarRecuperacionClave,
} from "../adminApi";
import { buildApprovalEmailHtml } from "../approvalEmailTemplate";
const fiveSImage = "/5S.png";
const etoImage = "/ETO.png";
const ALLOW_LEGACY_LOGIN = import.meta.env.VITE_ALLOW_LEGACY_LOGIN === "true";

const ADMIN_PERMISSIONS = [
  "usuarios.ver",
  "usuarios.crear",
  "usuarios.editar",
  "usuarios.bloquear",
  "usuarios.activar",
  "usuarios.resetear_clave",
  "roles.ver",
  "roles.crear",
  "roles.editar",
  "auditoria.ver",
  "materiales.ver",
  "materiales.crear",
  "materiales.editar",
  "materiales.eliminar",
  "proveedores.ver",
  "proveedores.crear",
  "proveedores.editar",
  "ubicaciones.ver",
  "ubicaciones.crear",
  "ubicaciones.editar",
  "movimientos.ver",
  "recibo.ver",
  "recibo.crear",
  "recibo.confirmar",
  "despacho.ver",
  "despacho.crear",
  "despacho.confirmar",
  "stock.ver",
  "inventarios.ver",
  "inventarios.crear",
  "inventarios.contar",
  "inventarios.conciliar",
];

const CONSULT_PERMISSIONS = [
  "usuarios.ver",
  "roles.ver",
  "auditoria.ver",
  "materiales.ver",
  "proveedores.ver",
  "ubicaciones.ver",
  "movimientos.ver",
  "recibo.ver",
  "despacho.ver",
  "stock.ver",
  "inventarios.ver",
];

const USERS_MOCK = [
  {
    auth: "true",
    userId: "1",
    nombre: "Gineth Visbal",
    usuario: "Gvisbal",
    password: "768",
    rol: "SUPER_ADMIN",
    estado: "ACTIVO",
    plataforma: "wms",
    permisos: ADMIN_PERMISSIONS,
  },
  {
    auth: "true",
    userId: "2",
    nombre: "Luis Florez",
    usuario: "Lflorez",
    password: "429",
    rol: "ADMIN_WMS",
    estado: "ACTIVO",
    plataforma: "wms",
    permisos: ADMIN_PERMISSIONS,
  },
  {
    auth: "true",
    userId: "3",
    nombre: "Juan Griego",
    usuario: "Jgriego",
    password: "958",
    rol: "ADMIN_WMS",
    estado: "ACTIVO",
    plataforma: "wms",
    permisos: ADMIN_PERMISSIONS,
  },
  {
    auth: "true",
    userId: "4",
    nombre: "Darwin Herrera",
    usuario: "Dherrera",
    password: "149",
    rol: "ADMIN_WMS",
    estado: "ACTIVO",
    plataforma: "wms",
    permisos: ADMIN_PERMISSIONS,
  },
  {
    auth: "true",
    userId: "5",
    nombre: "Usuario Consulta",
    usuario: "CONSULTA",
    password: "123",
    rol: "CONSULTA",
    estado: "ACTIVO",
    plataforma: "wms",
    permisos: CONSULT_PERMISSIONS,
  },
  {
    auth: "true",
    userId: "5S-1",
    nombre: "Administrador 5S",
    usuario: "5S",
    password: "5S",
    rol: "ADMIN_5S",
    estado: "ACTIVO",
    plataforma: "5s",
    permisos: [],
  },
  {
    auth: "true",
    userId: "ETO-1",
    nombre: "Usuario Nivel 1 ETO",
    usuario: "N1-ETO",
    password: "N1-ETO",
    rol: "NIVEL_1_ETO",
    estado: "ACTIVO",
    plataforma: "eto",
    accessLevel: "1",
    accessCode: "N1-ETO",
    permisos: [],
  },
  {
    auth: "true",
    userId: "ETO-2",
    nombre: "Usuario Nivel 2 ETO",
    usuario: "N2-ETO",
    password: "N2-ETO",
    rol: "NIVEL_2_ETO",
    estado: "ACTIVO",
    plataforma: "eto",
    accessLevel: "2",
    accessCode: "N2-ETO",
    permisos: [],
  },
];

const PILLARS = [
  {
    id: "wms",
    area: "Logística",
    title: "WMS",
    button: "Login WMS",
    route: "/",
    external: false,
    subtitle: "Control inteligente de inventarios y operaciones.",
    description:
      "Trazabilidad, ubicaciones, recibo, despacho, stock e inventarios en tiempo real.",
    accent: "#a855f7",
    accent2: "#d946ef",
    glow: "rgba(168,85,247,.42)",
    visualHue: "0deg",
    icon: Boxes,
    image: "/WMS.png",
  },
  {
    id: "5s",
    area: "Calidad",
    title: "5S",
    button: "Login 5S",
    route: "/5s",
    external: false,
    subtitle: "Auditorias, cronogramas y evidencias 5S.",
    description:
      "Gestiona bodegas, responsables, checklist, inspecciones y cumplimiento.",
    accent: "#2563eb",
    accent2: "#38bdf8",
    glow: "rgba(37,99,235,.38)",
    visualHue: "0deg",
    heroTint: "rgba(37,99,235,.34)",
    icon: ClipboardCheck,
    image: fiveSImage,
  },
  {
    id: "eto",
    area: "Gestion",
    title: "ETO",
    button: "Login ETO",
    route: "/eto",
    external: false,
    subtitle: "Gestion efectiva de proyectos y pedidos especiales.",
    description:
      "Seguimiento de procesos, indicadores, capturas e historicos operativos.",
    accent: "#16a34a",
    accent2: "#22c55e",
    glow: "rgba(34,197,94,.34)",
    visualHue: "-135deg",
    heroTint: "rgba(34,197,94,.42)",
    heroFilter:
      "hue-rotate(-118deg) saturate(1.55) contrast(1.12) brightness(.78)",
    icon: BarChart3,
    image: etoImage,
  },
];

export default function LoginPage() {
  const [selectedPillarId, setSelectedPillarId] = useState("wms");
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [recordarme, setRecordarme] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [assetsReady, setAssetsReady] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [passwordChangeUser, setPasswordChangeUser] = useState(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [lookupOpen, setLookupOpen] = useState(false);

  const selectedPillar = useMemo(
    () => PILLARS.find((pillar) => pillar.id === selectedPillarId) || PILLARS[0],
    [selectedPillarId]
  );

  useEffect(() => {
    const imagesToPreload = [
      "/ICONOINOVA.ico",
      "/INOVA1.jpeg",
      "/INOVA.jpeg",
      "/INOVA2026.png",
      "/WMS.png",
      fiveSImage,
      etoImage,
      "/INOVA2026.png",
    ];

    let cancelled = false;

    const preloadImage = (src) =>
      new Promise((resolve) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = resolve;
        image.src = src;
      });

    Promise.all(imagesToPreload.map(preloadImage)).then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // IMPORTANTE:
    // Antes esto redirigía automáticamente al último pilar guardado.
    // Por eso, si tenías sesión WMS activa, abrías el login y te devolvía al WMS.
    // Ahora el login principal siempre deja escoger el pilar nuevamente.
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("nombre");
    sessionStorage.removeItem("usuario");
    sessionStorage.removeItem("rol");
    sessionStorage.removeItem("estado");
    sessionStorage.removeItem("permisos");
    sessionStorage.removeItem("recordarme");
    sessionStorage.removeItem("pilarSeleccionado");
    sessionStorage.removeItem("pilarNombre");
    sessionStorage.removeItem("pilarRuta");
    sessionStorage.removeItem("etoAuthorized");
    sessionStorage.removeItem("etoAccessLevel");
    sessionStorage.removeItem("etoAccessCode");
    sessionStorage.removeItem("etoUser");
    sessionStorage.removeItem("etoRole");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("resetPasswordToken");
    const resetEmail = params.get("email");
    const resetPilar = params.get("pilar");
    if (!resetToken || !resetEmail) return;

    if (resetPilar && PILLARS.some((pillar) => pillar.id === resetPilar)) {
      setSelectedPillarId(resetPilar);
    }
    setShowLogin(true);
    setRecoveryToken({ token: resetToken, email: resetEmail });
    setRecoveryOpen(true);
    window.history.replaceState({}, "", "/login");
  }, []);

  const selectPillar = (pillarId) => {
    setSelectedPillarId(pillarId);
    setShowLogin(true);
    setMenuOpen(false);
    setError("");
    setLoginNotice("");
    setUsuario("");
    setPassword("");
  };

  const login = async () => {
    setError("");

    if (!usuario.trim() || !password.trim()) {
      setError("Debes ingresar usuario y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const usuarioInput = usuario.trim();
      const passwordInput = password.trim();
      const plataformaSeleccionada = selectedPillar.id;
      let usuarioEncontrado;

      try {
        usuarioEncontrado = await autenticarUsuario({
          usuario: usuarioInput,
          password: passwordInput,
          pilar: plataformaSeleccionada,
        });
      } catch (supabaseError) {
        if (!ALLOW_LEGACY_LOGIN) throw supabaseError;

        usuarioEncontrado = USERS_MOCK.find((u) => {
          const samePlatform = u.plataforma === plataformaSeleccionada;
          const isGlobalAdmin = u.rol === "SUPER_ADMIN";
          const sameUser = u.usuario.toLowerCase() === usuarioInput.toLowerCase();
          const samePassword =
            u.plataforma === "eto"
              ? u.password.toUpperCase() === passwordInput.toUpperCase()
              : u.password === passwordInput;

          return (samePlatform || isGlobalAdmin) && sameUser && samePassword;
        });

        if (!usuarioEncontrado) throw supabaseError;
      }

      if (!usuarioEncontrado) {
        setError("Credenciales incorrectas.");
        setLoading(false);
        return;
      }

      if (usuarioEncontrado.estado !== "ACTIVO") {
        setError("Tu usuario no tiene acceso al sistema.");
        setLoading(false);
        return;
      }

      if (usuarioEncontrado.plataforma !== plataformaSeleccionada && usuarioEncontrado.rol !== "SUPER_ADMIN") {
        setError(`Este usuario no pertenece al pilar ${selectedPillar.title}.`);
        setLoading(false);
        return;
      }

      sessionStorage.setItem("auth", usuarioEncontrado.auth);
      sessionStorage.setItem("userId", usuarioEncontrado.userId);
      sessionStorage.setItem("empresaId", usuarioEncontrado.empresaId || "");
      sessionStorage.setItem("esPlatformAdmin", String(Boolean(usuarioEncontrado.esPlatformAdmin)));
      sessionStorage.setItem("esSuperAdmin", String(Boolean(usuarioEncontrado.esSuperAdmin)));
      sessionStorage.setItem("nombre", usuarioEncontrado.nombre);
      sessionStorage.setItem("usuario", usuarioEncontrado.usuario);
      sessionStorage.setItem("rol", usuarioEncontrado.rol);
      sessionStorage.setItem("estado", usuarioEncontrado.estado);
      sessionStorage.setItem(
        "permisos",
        JSON.stringify(usuarioEncontrado.permisos || [])
      );
      sessionStorage.setItem("recordarme", String(recordarme));
      sessionStorage.setItem("pilarSeleccionado", selectedPillar.id);
      sessionStorage.setItem(
        "pilarNombre",
        `${selectedPillar.area} - ${selectedPillar.title}`
      );
      sessionStorage.setItem("pilarRuta", selectedPillar.route);

      if (selectedPillar.id === "eto") {
        sessionStorage.setItem("etoAuthorized", "true");
        sessionStorage.setItem("etoAccessLevel", usuarioEncontrado.accessLevel);
        sessionStorage.setItem("etoAccessCode", usuarioEncontrado.accessCode);
        sessionStorage.setItem("etoUser", usuarioEncontrado.usuario);
        sessionStorage.setItem("etoRole", usuarioEncontrado.rol);
      } else {
        sessionStorage.removeItem("etoAuthorized");
        sessionStorage.removeItem("etoAccessLevel");
        sessionStorage.removeItem("etoAccessCode");
        sessionStorage.removeItem("etoUser");
        sessionStorage.removeItem("etoRole");
      }

      if (usuarioEncontrado.debeCambiarClave) {
        setPasswordChangeUser(usuarioEncontrado);
        setLoading(false);
        return;
      }

      if (usuarioEncontrado.esPlatformAdmin) {
        window.location.href = "/admin/configuracion";
        return;
      }

      window.location.href = selectedPillar.route;
    } catch (err) {
      setError(err?.message || "No se pudo validar el acceso.");
      setLoading(false);
    }
  };

  const submitAccessRequest = async (payload) => {
    setRequestStatus("");
    await solicitarAcceso(payload);
    setRequestOpen(false);
    setShowLogin(true);
    setLoginNotice("Solicitud enviada. Consulta tu aprobación dentro de las 24 horas con tu correo, documento y la clave que elegiste.");
  };

  return (
    <div className={`inova-shell ${assetsReady ? "assets-ready" : "assets-loading"}`}>
      <style>{css}</style>

      <div className="bg-grid" />
      <div className="bg-orb bg-orb-one" />
      <div className="bg-orb bg-orb-two" />
      <div className="bg-line bg-line-one" />
      <div className="bg-line bg-line-two" />

      <header className={`login-topbar ${showLogin ? "compact-login-topbar" : "landing-login-topbar"}`}>
        <button
          className="icon-button mobile-only"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        <div className="brand brand-single">
          <img
            src="/INOVA2026.png"
            alt="INOVA Innovamos Contigo"
            className="brand-logo brand-logo-wide"
            loading="eager"
            decoding="sync"
            onError={(event) => {
              if (event.currentTarget.src.includes("/INOVA2026.png")) {
                event.currentTarget.src = "/INOVA2026.png";
              }
            }}
          />
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="mobile-menu" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-menu-head">
              <strong>Menú INOVA</strong>
              <button
                className="icon-button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            {PILLARS.map((pillar) => (
              <button
                key={pillar.id}
                className="mobile-menu-item"
                onClick={() => selectPillar(pillar.id)}
              >
                {pillar.area} · {pillar.title}
              </button>
            ))}
          </aside>
        </div>
      )}

      {!showLogin ? (
        <LandingView onSelect={selectPillar} />
      ) : (
        <main className="main-grid login-mode">
          <section className="pillars-panel" aria-label="Pilares INOVA">
            {PILLARS.map((pillar) => (
              <PillarCard
                key={pillar.id}
                pillar={pillar}
                active={selectedPillar.id === pillar.id}
                compact
                onClick={() => selectPillar(pillar.id)}
              />
            ))}
          </section>

          <section className="login-panel visible">
            <LoginCard
              pillar={selectedPillar}
              usuario={usuario}
              setUsuario={setUsuario}
              password={password}
              setPassword={setPassword}
              mostrarClave={mostrarClave}
              setMostrarClave={setMostrarClave}
              recordarme={recordarme}
              setRecordarme={setRecordarme}
              error={error}
              notice={loginNotice}
              loading={loading}
              login={login}
              back={() => setShowLogin(false)}
              requestAccess={() => setRequestOpen(true)}
              lookupAccess={() => setLookupOpen(true)}
              recoverPassword={() => {
                setRecoveryToken(null);
                setRecoveryOpen(true);
              }}
            />
          </section>
        </main>
      )}

      {requestOpen && (
        <AccessRequestModal
          pillar={selectedPillar}
          status={requestStatus}
          onClose={() => {
            setRequestOpen(false);
            setRequestStatus("");
          }}
          onSubmit={submitAccessRequest}
        />
      )}

      {lookupOpen && (
        <AccessLookupModal
          pillar={selectedPillar}
          onClose={() => setLookupOpen(false)}
          onLookup={(payload) => consultarSolicitudAcceso({ ...payload, pilar: selectedPillar.id })}
        />
      )}

      {passwordChangeUser && (
        <ForcedPasswordModal
          user={passwordChangeUser}
          onCancel={() => setPasswordChangeUser(null)}
          onSubmit={async (newPassword) => {
            await cambiarClaveObligatoria(passwordChangeUser.userId, newPassword);
            setPasswordChangeUser(null);
            window.location.href = selectedPillar.route;
          }}
        />
      )}

      {recoveryOpen && (
        <PasswordRecoveryModal
          pillar={selectedPillar}
          defaultUser={recoveryToken?.email || usuario}
          tokenData={recoveryToken}
          onClose={() => {
            setRecoveryOpen(false);
            setRecoveryToken(null);
          }}
          onRequest={async (value) => {
            const result = await solicitarRecuperacionClave({ usuario: value, pilar: selectedPillar.id });
            setLoginNotice(result.message);
          }}
          onReset={async ({ email, token, password: newPassword }) => {
            await restablecerClaveConToken({ email, token, nuevaClave: newPassword, pilar: selectedPillar.id });
            setRecoveryOpen(false);
            setRecoveryToken(null);
            setLoginNotice("Contraseña actualizada. Ya puedes iniciar sesión.");
          }}
        />
      )}
    </div>
  );
}

function LandingView({ onSelect }) {
  return (
    <main className="landing-view">
      <div className="landing-head">
        <p>Selecciona el pilar con el que deseas trabajar</p>
      </div>

      <section className="landing-cards" aria-label="Selección de pilares INOVA">
        {PILLARS.map((pillar) => (
          <LandingCard key={pillar.id} pillar={pillar} onClick={() => onSelect(pillar.id)} />
        ))}
      </section>
    </main>
  );
}

function LandingCard({ pillar, onClick }) {
  const Icon = pillar.icon;

  return (
    <button
      className="landing-card"
      onClick={onClick}
      style={{ "--accent": pillar.accent, "--accent2": pillar.accent2, "--glow": pillar.glow }}
    >
      <div className="landing-card-image">
        <img src={pillar.image} alt={`${pillar.area} ${pillar.title}`} loading="eager" decoding="sync" />
      </div>

      <div className="landing-card-content">
        <div className="pillar-area">{pillar.area}</div>
        <div className="landing-title-row">
          <h2>{pillar.title}</h2>
          <Icon size={34} />
        </div>
        <strong>{pillar.subtitle}</strong>
        <p>{pillar.description}</p>
      </div>

      <div className="landing-card-action">
        <span>{pillar.button}</span>
        <div className="landing-arrow">
          <ChevronRight size={26} />
        </div>
      </div>
    </button>
  );
}

function PillarCard({ pillar, active, compact, onClick }) {
  const Icon = pillar.icon;

  return (
    <button
      className={`${active ? "pillar-card active" : "pillar-card"} ${compact ? "compact-card" : ""}`}
      onClick={onClick}
      style={{ "--accent": pillar.accent, "--accent2": pillar.accent2, "--glow": pillar.glow }}
    >
      <div className="pillar-visual">
        <img src={pillar.image} alt={`${pillar.area} ${pillar.title}`} loading="eager" decoding="sync" />
        <div className="pillar-image-shade" />
      </div>

      <div className="pillar-content">
        <div className="pillar-area">{pillar.area}</div>
        <div className="pillar-title-row">
          <h2>{pillar.title}</h2>
          <Icon size={compact ? 21 : 28} />
        </div>
        <p>{pillar.subtitle}</p>
        <small>{pillar.description}</small>
      </div>

      <div className="pillar-arrow">
        <ChevronRight size={compact ? 21 : 26} />
      </div>
    </button>
  );
}

function LoginCard({
  pillar,
  usuario,
  setUsuario,
  password,
  setPassword,
  mostrarClave,
  setMostrarClave,
  recordarme,
  setRecordarme,
  error,
  notice,
  loading,
  login,
  back,
  requestAccess,
  lookupAccess,
  recoverPassword,
}) {
  const usuarioRef = useRef(null);
  const passwordRef = useRef(null);

  function focusPassword() {
    passwordRef.current?.focus();
    passwordRef.current?.select?.();
  }

  function focusUsuario() {
    usuarioRef.current?.focus();
    usuarioRef.current?.select?.();
  }

  function handleUsuarioKeyDown(event) {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      focusPassword();
    }
  }

  function handlePasswordKeyDown(event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusUsuario();
      return;
    }

    if (event.key === "Enter") {
      login();
    }
  }

  return (
    <div
      className="login-card"
      style={{
        "--accent": pillar.accent,
        "--accent2": pillar.accent2,
        "--glow": pillar.glow,
        "--visual-hue": pillar.visualHue,
        "--hero-tint": pillar.heroTint || "rgba(37,99,235,.20)",
        "--hero-filter":
          pillar.heroFilter ||
          "hue-rotate(var(--visual-hue, 0deg)) saturate(1.28) contrast(1.08) brightness(.82)",
      }}
    >
      <div className="login-hero">
        <button className="login-back" onClick={back} type="button">
          <ChevronLeft size={16} /> Volver a pilares
        </button>

        <div className="login-visual-mini">
          <img src={pillar.image} alt={`${pillar.area} ${pillar.title}`} loading="eager" decoding="sync" />
          <div className="login-visual-overlay" />
        </div>
      </div>

      <div className="login-body">
        <button className="mobile-login-back" onClick={back} type="button">
          <ChevronLeft size={16} /> Volver a pilares
        </button>

        <h2>Bienvenido</h2>
        <p>Ingresa tus credenciales para continuar en el pilar seleccionado.</p>

        {error ? <div className="error-box">{error}</div> : null}
        {notice ? <div className="success-box">{notice}</div> : null}

        <label className="field">
          <span><User size={16} /> Usuario</span>
          <input
            ref={usuarioRef}
            value={usuario}
            onChange={(event) => setUsuario(event.target.value)}
            onKeyDown={handleUsuarioKeyDown}
            placeholder="Ingresa tu usuario"
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span><LockKeyhole size={16} /> Contraseña</span>
          <div className="password-row">
            <input
              ref={passwordRef}
              type={mostrarClave ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={handlePasswordKeyDown}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setMostrarClave((value) => !value)} aria-label="Mostrar contraseña">
              {mostrarClave ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <div className="login-options">
          <label>
            <input type="checkbox" checked={recordarme} onChange={(event) => setRecordarme(event.target.checked)} />
            <span>Recordarme</span>
          </label>
          <button type="button" onClick={recoverPassword}>¿Olvidaste tu contraseña?</button>
        </div>

        <button className="login-submit" onClick={login} disabled={loading}>
          {loading ? "Validando acceso..." : "Iniciar sesión"}
        </button>

        <div className="divider"><span /> o continúa con <span /></div>

        <button className="microsoft-button" type="button">
          <span className="ms-grid"><i /><i /><i /><i /></span>
          Iniciar sesión con Microsoft
        </button>

        <small className="login-note">
          ¿No tienes acceso? <button type="button" className="request-link" onClick={requestAccess}>Solicitar acceso</button>
          <span className="login-note-separator">·</span>
          <button type="button" className="request-link" onClick={lookupAccess}>Consultar solicitud</button>
        </small>
      </div>
    </div>
  );
}

function PasswordRecoveryModal({ pillar, defaultUser, tokenData, onClose, onRequest, onReset }) {
  const [identifier, setIdentifier] = useState(defaultUser || "");
  const [passwordOne, setPasswordOne] = useState("");
  const [passwordTwo, setPasswordTwo] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const confirmMode = Boolean(tokenData?.token && tokenData?.email);

  const submitRequest = async () => {
    setError("");
    setStatus("");
    if (!identifier.trim()) {
      setError("Ingresa tu correo o usuario.");
      return;
    }
    setSending(true);
    try {
      await onRequest(identifier.trim());
      setStatus("Si el usuario existe y está activo, enviaremos el enlace de recuperación a su correo.");
    } catch (err) {
      setError(err?.message || "No se pudo enviar la recuperación.");
    } finally {
      setSending(false);
    }
  };

  const submitReset = async () => {
    setError("");
    setStatus("");
    if (passwordOne.length < 8) {
      setError("La nueva contraseña debe tener mínimo 8 caracteres.");
      return;
    }
    if (passwordOne !== passwordTwo) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSending(true);
    try {
      await onReset({ email: tokenData.email, token: tokenData.token, password: passwordOne });
      setStatus("Contraseña actualizada correctamente.");
    } catch (err) {
      setError(err?.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="access-modal-backdrop">
      <section
        className="access-modal password-change-modal"
        style={{ "--accent": pillar.accent, "--accent2": pillar.accent2, "--glow": pillar.glow }}
      >
        <button type="button" className="access-close" onClick={onClose} aria-label="Cerrar recuperación">
          <X size={18} />
        </button>
        <span>Seguridad de acceso</span>
        <h2>{confirmMode ? "Crear nueva contraseña" : "Recuperar contraseña"}</h2>
        <p>
          {confirmMode
            ? "Escribe una contraseña nueva para tu cuenta INOVA."
            : "Te enviaremos un enlace seguro al correo registrado. El enlace vence en 30 minutos."}
        </p>

        {error ? <div className="error-box">{error}</div> : null}
        {status ? <div className="success-box">{status}</div> : null}

        <div className="access-form-grid">
          {!confirmMode ? (
            <label className="full">Correo o usuario<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" /></label>
          ) : (
            <>
              <label className="full">Correo<input value={tokenData.email} readOnly /></label>
              <label>Nueva contraseña<input type="password" value={passwordOne} onChange={(event) => setPasswordOne(event.target.value)} autoComplete="new-password" /></label>
              <label>Confirmar contraseña<input type="password" value={passwordTwo} onChange={(event) => setPasswordTwo(event.target.value)} autoComplete="new-password" /></label>
            </>
          )}
        </div>

        <button type="button" className="login-submit" onClick={confirmMode ? submitReset : submitRequest} disabled={sending}>
          {sending ? "Procesando..." : confirmMode ? "Guardar nueva contraseña" : "Enviar enlace de recuperación"}
        </button>
      </section>
    </div>
  );
}

function AccessLookupModal({ pillar, onClose, onLookup }) {
  const [form, setForm] = useState({
    email: "",
    documento: "",
    claveConsulta: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError("");
    setResult(null);
    if (!form.email.trim() || !form.documento.trim() || !form.claveConsulta.trim()) {
      setError("Ingresa correo, documento y clave de consulta.");
      return;
    }

    setChecking(true);
    try {
      const response = await onLookup(form);
      setResult(response);
    } catch (err) {
      setError(err?.message || "No se pudo consultar la solicitud.");
    } finally {
      setChecking(false);
    }
  };

  const approved = result?.estado === "APROBADA";

  return (
    <div className="access-modal-backdrop">
      <section
        className="access-modal access-lookup-modal"
        style={{ "--accent": pillar.accent, "--accent2": pillar.accent2, "--glow": pillar.glow }}
      >
        <button type="button" className="access-close" onClick={onClose} aria-label="Cerrar consulta">
          <X size={18} />
        </button>
        <span>Consulta de solicitud</span>
        <h2>{pillar.title}</h2>
        <p>Valida tu solicitud con el correo, documento y la clave que elegiste al registrarte.</p>

        {error ? <div className="error-box">{error}</div> : null}
        {result?.mensaje ? (
          <div className={approved ? "success-box" : "lookup-pending-box"}>
            <strong>{approved ? "Acceso aprobado" : "Solicitud en revisión"}</strong>
            <span>{result.mensaje}</span>
          </div>
        ) : null}

        <div className="access-form-grid">
          <label>Correo electrónico<input value={form.email} onChange={(event) => setValue("email", event.target.value)} autoComplete="email" /></label>
          <label>Cédula / documento<input value={form.documento} onChange={(event) => setValue("documento", event.target.value)} /></label>
          <label className="full">Clave de consulta<input type="password" value={form.claveConsulta} onChange={(event) => setValue("claveConsulta", event.target.value)} placeholder="La clave que elegiste al solicitar acceso" /></label>
        </div>

        <button type="button" className="login-submit" onClick={submit} disabled={checking}>
          {checking ? "Consultando..." : "Consultar estado"}
        </button>

        {result ? (
          <div className="lookup-result">
            <div className="lookup-meta">
              <div>
                <span>Consulta</span>
                <strong>Validada</strong>
              </div>
              <div>
                <span>Estado</span>
                <strong>{result.estado}</strong>
              </div>
              {result.user?.usuario ? (
                <div>
                  <span>Usuario</span>
                  <strong>{result.user.usuario}</strong>
                </div>
              ) : null}
              {result.claveTemporal ? (
                <div>
                  <span>Clave temporal</span>
                  <strong>{result.claveTemporal}</strong>
                </div>
              ) : null}
            </div>

            {approved && result.payload ? (
              <>
                <div className="lookup-security-note">
                  La clave temporal solo se muestra mientras la cuenta aún debe cambiar contraseña.
                </div>
                <iframe
                  className="lookup-preview"
                  title="Vista de aprobación INOVA"
                  srcDoc={buildApprovalEmailHtml(result.payload)}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function AccessRequestModal({ pillar, status, onClose, onSubmit }) {
  const [form, setForm] = useState({
    nombre_completo: "",
    documento: "",
    email: "",
    telefono: "",
    empresa_nombre: "",
    cargo: "",
    pilar: pillar.id,
    eto_nivel: "1",
    clave_consulta: "",
    clave_consulta_confirm: "",
    motivo: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((prev) => ({ ...prev, pilar: pillar.id }));
  }, [pillar.id]);

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError("");
    if (!form.nombre_completo.trim() || !form.documento.trim() || !form.email.trim() || !form.empresa_nombre.trim()) {
      setError("Completa nombre, documento, correo y empresa.");
      return;
    }
    if (form.clave_consulta.trim().length < 6) {
      setError("Crea una clave de consulta de mínimo 6 caracteres.");
      return;
    }
    if (form.clave_consulta !== form.clave_consulta_confirm) {
      setError("Las claves de consulta no coinciden.");
      return;
    }

    setSending(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err?.message || "No se pudo enviar la solicitud.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="access-modal-backdrop">
      <section
        className="access-modal"
        style={{ "--accent": pillar.accent, "--accent2": pillar.accent2, "--glow": pillar.glow }}
      >
        <button type="button" className="access-close" onClick={onClose} aria-label="Cerrar solicitud">
          <X size={18} />
        </button>
        <span>Solicitud de acceso</span>
        <h2>{pillar.title}</h2>
        <p>Tu solicitud quedará pendiente para aprobación de la super administradora.</p>

        {error ? <div className="error-box">{error}</div> : null}
        {status ? <div className="success-box">{status}</div> : null}

        <div className="access-form-grid">
          <label>Nombre completo<input value={form.nombre_completo} onChange={(event) => setValue("nombre_completo", event.target.value)} /></label>
          <label>Cédula / documento<input value={form.documento} onChange={(event) => setValue("documento", event.target.value)} /></label>
          <label>Correo electrónico<input value={form.email} onChange={(event) => setValue("email", event.target.value)} /></label>
          <label>Teléfono<input value={form.telefono} onChange={(event) => setValue("telefono", event.target.value)} /></label>
          <label>Empresa<input value={form.empresa_nombre} onChange={(event) => setValue("empresa_nombre", event.target.value)} /></label>
          <label>Cargo<input value={form.cargo} onChange={(event) => setValue("cargo", event.target.value)} /></label>
          <label>Clave de consulta<input type="password" value={form.clave_consulta} onChange={(event) => setValue("clave_consulta", event.target.value)} placeholder="Crea una clave para consultar" /></label>
          <label>Confirmar clave<input type="password" value={form.clave_consulta_confirm} onChange={(event) => setValue("clave_consulta_confirm", event.target.value)} placeholder="Repite tu clave" /></label>
          {pillar.id === "eto" && (
            <label>Nivel ETO<select value={form.eto_nivel} onChange={(event) => setValue("eto_nivel", event.target.value)}><option value="1">Nivel 1</option><option value="2">Nivel 2</option></select></label>
          )}
          <label className="full">Motivo<textarea value={form.motivo} onChange={(event) => setValue("motivo", event.target.value)} /></label>
        </div>

        <button type="button" className="login-submit" onClick={submit} disabled={sending || Boolean(status)}>
          {sending ? "Enviando solicitud..." : "Enviar solicitud"}
        </button>
      </section>
    </div>
  );
}

function ForcedPasswordModal({ user, onCancel, onSubmit }) {
  const [passwordOne, setPasswordOne] = useState("");
  const [passwordTwo, setPasswordTwo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (passwordOne.length < 8) {
      setError("La nueva contraseña debe tener mínimo 8 caracteres.");
      return;
    }
    if (passwordOne !== passwordTwo) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(passwordOne);
    } catch (err) {
      setError(err?.message || "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="access-modal-backdrop">
      <section className="access-modal password-change-modal">
        <button type="button" className="access-close" onClick={onCancel} aria-label="Cerrar cambio de contraseña">
          <X size={18} />
        </button>
        <span>Seguridad de acceso</span>
        <h2>Cambia tu contraseña</h2>
        <p>Hola {user.nombre}. Tu acceso fue aprobado con una contraseña temporal. Debes crear una nueva para continuar.</p>

        {error ? <div className="error-box">{error}</div> : null}

        <div className="access-form-grid">
          <label>Nueva contraseña<input type="password" value={passwordOne} onChange={(event) => setPasswordOne(event.target.value)} autoComplete="new-password" /></label>
          <label>Confirmar contraseña<input type="password" value={passwordTwo} onChange={(event) => setPasswordTwo(event.target.value)} autoComplete="new-password" /></label>
        </div>

        <button type="button" className="login-submit" onClick={submit} disabled={saving}>
          {saving ? "Guardando contraseña..." : "Cambiar contraseña y continuar"}
        </button>
      </section>
    </div>
  );
}

const css = `
:root {
  color-scheme: dark;
  --bg: #05040f;
  --text: #ffffff;
  --muted: rgba(255,255,255,.68);
  --topbar-height: 118px;
}

* { box-sizing: border-box; }
html, body, #root { width: 100%; min-height: 100%; margin: 0; }
body { background: var(--bg); overflow: hidden; }
button, input { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }

.inova-shell {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  position: relative;
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 12% 12%, rgba(139,92,246,.30), transparent 26%),
    radial-gradient(circle at 82% 12%, rgba(34,211,238,.10), transparent 23%),
    radial-gradient(circle at 52% 105%, rgba(217,70,239,.15), transparent 34%),
    linear-gradient(135deg, #03020a 0%, #08041c 42%, #061936 100%);
  display: flex;
  flex-direction: column;
}

.inova-shell .login-topbar,
.inova-shell .landing-view,
.inova-shell .main-grid {
  opacity: 1;
}

.bg-grid {
  position: fixed;
  inset: 0;
  opacity: .10;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px);
  background-size: 70px 70px;
  mask-image: radial-gradient(circle at center, black, transparent 72%);
}

.bg-orb,
.bg-line { position: fixed; pointer-events: none; }
.bg-orb { width: 520px; height: 520px; border-radius: 999px; filter: blur(44px); opacity: .42; }
.bg-orb-one { top: -230px; left: -130px; background: #7c3aed; }
.bg-orb-two { right: -180px; bottom: -220px; background: #0891b2; }
.bg-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(168,85,247,.75), transparent); opacity: .50; }
.bg-line-one { top: 20%; left: 0; width: 54%; transform: rotate(-8deg); }
.bg-line-two { bottom: 19%; right: 0; width: 50%; transform: rotate(-7deg); }

.login-topbar {
  position: relative;
  z-index: 30;
  width: min(1760px, calc(100% - 68px));
  height: var(--topbar-height);
  margin: 0 auto;
  padding-top: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 18px;
  flex: 0 0 var(--topbar-height);
}
.compact-login-topbar { justify-content: flex-start; }

.brand { display: flex; align-items: center; gap: 0; min-width: 0; }
.brand-single { gap: 0; }
.brand-logo {
  width: clamp(170px, 13vw, 235px);
  height: clamp(44px, 3.8vw, 64px);
  object-fit: contain;
  object-position: center;
  display: block;
  image-rendering: auto;
  filter: drop-shadow(0 10px 24px rgba(0,0,0,.32));
}
.brand-logo-wide { width: clamp(170px, 13vw, 235px); height: clamp(44px, 3.8vw, 64px); }

.icon-button {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
}
.mobile-only { display: none; }

.landing-view {
  position: relative;
  z-index: 2;
  width: min(1760px, calc(100% - 70px));
  height: calc(100vh - var(--topbar-height));
  margin: 0 auto;
  padding: 8px 0 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.landing-head {
  text-align: center;
  display: grid;
  justify-items: center;
  gap: 8px;
  margin-top: 0;
  margin-bottom: 18px;
}
.landing-head p {
  margin: 0;
  color: rgba(255,255,255,.76);
  font-size: clamp(17px, 1.2vw, 22px);
  letter-spacing: .01em;
}

.landing-cards {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(24px, 2vw, 36px);
  align-items: stretch;
  padding: 10px 16px 0;
}
.landing-card {
  --accent: #a855f7;
  --accent2: #d946ef;
  position: relative;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(230px, 42%) auto 72px;
  overflow: hidden;
  border-radius: 32px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025)),
    rgba(4,7,19,.88);
  border: 1px solid color-mix(in srgb, var(--accent2) 74%, transparent);
  box-shadow:
    0 26px 70px rgba(0,0,0,.38),
    0 0 44px color-mix(in srgb, var(--accent) 30%, transparent),
    inset 0 1px 0 rgba(255,255,255,.08);
  color: #fff;
  text-align: left;
  cursor: pointer;
  outline: none;
  padding: 0;
  transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
}
.landing-card:hover {
  transform: translateY(-5px);
  border-color: color-mix(in srgb, var(--accent2) 92%, white 8%);
  box-shadow:
    0 30px 90px rgba(0,0,0,.48),
    0 0 62px color-mix(in srgb, var(--accent) 42%, transparent),
    inset 0 1px 0 rgba(255,255,255,.10);
}
.landing-card-image {
  position: relative;
  overflow: hidden;
  margin: 18px 18px 0;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: inset 0 -80px 90px rgba(0,0,0,.35);
}
.landing-card-image::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.42));
  pointer-events: none;
}
.landing-card-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
  filter: saturate(1.12) contrast(1.05) brightness(.94);
}
.landing-card-content {
  padding: clamp(22px, 1.8vw, 34px) clamp(24px, 2vw, 38px) 10px;
  align-self: start;
}
.landing-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0 14px;
}
.landing-title-row h2 {
  margin: 0;
  font-size: clamp(62px, 4.7vw, 88px);
  line-height: .88;
  letter-spacing: -.055em;
}
.landing-title-row svg {
  color: var(--accent2);
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--accent) 65%, transparent));
}
.pillar-area {
  color: var(--accent2);
  font-size: clamp(15px, 1.1vw, 20px);
  font-weight: 950;
  letter-spacing: .055em;
  text-transform: uppercase;
}
.landing-card-content strong {
  display: block;
  max-width: 430px;
  color: #fff;
  font-size: clamp(17px, 1.15vw, 22px);
  line-height: 1.35;
}
.landing-card-content p {
  margin: 16px 0 0;
  max-width: 460px;
  color: rgba(255,255,255,.72);
  font-size: clamp(14px, 1vw, 18px);
  line-height: 1.55;
}
.landing-card-action {
  align-self: end;
  margin: 0 clamp(24px, 2vw, 38px) 26px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 8px 0 24px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent2) 64%, transparent);
  background: rgba(255,255,255,.035);
  color: #fff;
  font-weight: 900;
  font-size: 16px;
}
.landing-arrow {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #06111f;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  box-shadow: 0 0 28px color-mix(in srgb, var(--accent) 58%, transparent);
}

.main-grid {
  position: relative;
  z-index: 2;
  width: min(1740px, calc(100% - 68px));
  height: calc(100vh - var(--topbar-height));
  margin: 0 auto;
  padding: 10px 0 22px;
  display: grid;
  align-items: center;
  flex: 1 1 auto;
  overflow: visible;
}
.main-grid.login-mode {
  grid-template-columns: minmax(540px, 660px) minmax(740px, 920px);
  justify-content: center;
  align-items: center;
  gap: 34px;
}

.pillars-panel {
  display: grid;
  gap: clamp(14px, 1.75vh, 22px);
  align-content: center;
  max-height: 100%;
  overflow: visible;
  padding: 6px 3px;
}

.pillar-card {
  --accent: #a855f7;
  --accent2: #d946ef;
  --glow: rgba(168,85,247,.36);
  position: relative;
  width: 100%;
  height: clamp(166px, 20.2vh, 222px);
  display: grid;
  grid-template-columns: minmax(280px, 42%) 1fr 58px;
  align-items: stretch;
  gap: clamp(18px, 1.8vw, 28px);
  overflow: hidden;
  padding: clamp(12px, 1vw, 16px);
  border-radius: clamp(24px, 2vw, 34px);
  background:
    radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 35%),
    linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.035));
  border: 1px solid color-mix(in srgb, var(--accent) 78%, transparent);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.04) inset,
    0 18px 42px rgba(0,0,0,.26),
    0 0 34px color-mix(in srgb, var(--accent) 28%, transparent);
  color: #fff;
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.pillar-card:focus,
.pillar-card:focus-visible,
.pillar-card:active { outline: none; }
.pillar-card:hover,
.pillar-card.active {
  transform: none;
  border-color: color-mix(in srgb, var(--accent2) 90%, white 10%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.05) inset,
    0 22px 56px rgba(0,0,0,.34),
    0 0 42px color-mix(in srgb, var(--accent) 40%, transparent);
}
.pillar-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 5;
  border-radius: inherit;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--accent) 74%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}
.pillar-card.active::after { border-color: color-mix(in srgb, var(--accent2) 90%, white 10%); }

.pillar-visual,
.pillar-content,
.pillar-arrow { position: relative; z-index: 1; }
.pillar-visual {
  width: 100%;
  height: 100%;
  border-radius: clamp(18px, 1.5vw, 24px);
  overflow: hidden;
  background: rgba(3,2,12,.72);
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: inset 0 -32px 52px rgba(0,0,0,.20), 0 0 24px color-mix(in srgb, var(--accent) 24%, transparent);
}
.pillar-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
  filter: saturate(1.1) contrast(1.04) brightness(.96);
}
.pillar-image-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, rgba(255,255,255,.08), transparent 34%);
  pointer-events: none;
}
.pillar-content { align-self: center; min-width: 0; overflow: visible; }
.pillar-title-row { display: flex; align-items: center; gap: 12px; margin-top: 3px; }
.pillar-title-row h2 { margin: 0; font-size: clamp(48px, 4.15vw, 72px); line-height: .9; letter-spacing: -.05em; }
.pillar-title-row svg { color: var(--accent2); filter: drop-shadow(0 0 14px color-mix(in srgb, var(--accent) 60%, transparent)); }
.pillar-content p { margin: 12px 0 0; max-width: 440px; color: rgba(255,255,255,.88); line-height: 1.38; font-weight: 750; font-size: clamp(14px, .98vw, 18px); }
.pillar-content small { display: block; margin-top: 9px; max-width: 460px; color: rgba(255,255,255,.62); line-height: 1.38; font-size: clamp(12px, .82vw, 15px); }
.pillar-arrow { align-self: center; justify-self: center; width: clamp(44px, 3.2vw, 58px); height: clamp(44px, 3.2vw, 58px); display: grid; place-items: center; border-radius: 999px; color: #120827; background: linear-gradient(135deg, var(--accent), var(--accent2)); box-shadow: 0 0 28px color-mix(in srgb, var(--accent) 58%, transparent); }

.login-panel {
  display: flex;
  align-items: stretch;
  height: min(76vh, 700px);
  min-height: 560px;
}
.login-mode .pillars-panel {
  height: min(76vh, 700px);
  min-height: 560px;
  max-height: min(76vh, 700px);
  width: 100%;
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-content: stretch;
  align-self: center;
  padding: 0;
  margin: 0;
  overflow: visible;
}
.login-mode .pillar-card,
.login-mode .compact-card {
  height: 100%;
  min-height: 0;
  max-height: none;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(235px, 42%) 1fr 46px;
  align-items: stretch;
  gap: 16px;
  padding: 12px;
  border-radius: 26px;
  overflow: hidden;
}
.login-mode .pillar-visual { height: 100%; min-height: 0; width: 100%; border-radius: 18px; }
.login-mode .pillar-visual img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
.login-mode .pillar-content { align-self: center; overflow: hidden; }
.login-mode .pillar-area,
.login-mode .compact-card .pillar-area { font-size: 14px; line-height: 1.05; }
.login-mode .pillar-title-row { margin-top: 3px; gap: 9px; }
.login-mode .pillar-title-row h2,
.login-mode .compact-card .pillar-title-row h2 { font-size: 42px; line-height: .9; }
.login-mode .pillar-content p,
.login-mode .compact-card .pillar-content p { margin-top: 8px; font-size: 13px; line-height: 1.28; max-width: 330px; }
.login-mode .pillar-content small,
.login-mode .compact-card .pillar-content small { display: block; margin-top: 6px; font-size: 11px; line-height: 1.25; max-width: 340px; }
.login-mode .pillar-arrow,
.login-mode .compact-card .pillar-arrow { width: 38px; height: 38px; align-self: center; justify-self: center; position: relative; right: auto; bottom: auto; }

.login-card {
  width: 100%;
  max-width: 920px;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid color-mix(in srgb, var(--accent2) 78%, rgba(255,255,255,.22));
  background: rgba(8,12,28,.92);
  box-shadow:
    0 34px 90px rgba(0,0,0,.48),
    0 0 42px color-mix(in srgb, var(--accent) 26%, transparent),
    inset 0 1px 0 rgba(255,255,255,.08);
  backdrop-filter: blur(20px);
}
.login-hero {
  position: relative;
  min-height: 100%;
  padding: 42px;
  background: #050614;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,.06);
}
.login-back {
  position: relative;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 13px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.82);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  outline: none;
}
.login-visual-mini { position: absolute; inset: 0; overflow: hidden; }
.login-visual-mini img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: center; filter: var(--hero-filter); transform: scale(1.01); }
.login-visual-overlay { position: absolute; inset: 0; background: radial-gradient(circle at 34% 44%, color-mix(in srgb, var(--accent) 58%, transparent), transparent 44%), linear-gradient(135deg, color-mix(in srgb, var(--accent) 48%, transparent), transparent 48%), linear-gradient(90deg, color-mix(in srgb, var(--accent) 28%, rgba(3,3,15,.18)), rgba(3,3,15,.08) 52%, rgba(3,3,15,.38)), linear-gradient(180deg, rgba(3,3,15,.04), rgba(3,3,15,.34)); mix-blend-mode: screen; pointer-events: none; }
.login-body { min-width: 0; width: 100%; padding: 34px 56px 32px; align-self: stretch; display: flex; flex-direction: column; justify-content: center; overflow: hidden; background: radial-gradient(circle at 90% 18%, rgba(20,80,160,.18), transparent 34%), linear-gradient(180deg, rgba(8,13,32,.96), rgba(4,7,19,.94)); }
.login-body h2 { margin: 0; font-size: clamp(34px, 2.7vw, 46px); line-height: 1; text-transform: uppercase; letter-spacing: -.025em; white-space: nowrap; color: #fff; text-shadow: 0 0 18px rgba(255,255,255,.10); }
.login-body p { max-width: 390px; margin: 14px 0 20px; color: rgba(255,255,255,.70); line-height: 1.48; font-size: 14px; }
.error-box { margin-bottom: 16px; padding: 12px 14px; border-radius: 16px; color: #fecaca; background: rgba(185,28,28,.16); border: 1px solid rgba(248,113,113,.34); font-weight: 850; }
.field { display: block; margin-bottom: 14px; }
.field span { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 7px; color: rgba(255,255,255,.90); font-size: 13px; font-weight: 900; }
.field input,
.password-row { width: 100%; height: 48px; border-radius: 14px; border: 1px solid rgba(255,255,255,.13); background: rgba(255,255,255,.045); color: #fff; outline: none; box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
.field input { padding: 0 18px; font-size: 15px; }
.field input:focus,
.password-row:focus-within { border-color: var(--accent2); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent); }
.field input::placeholder { color: rgba(255,255,255,.38); }
.password-row { display: flex; align-items: center; }
.password-row input { flex: 1; height: 100%; border: 0; background: transparent; box-shadow: none; }
.password-row button { width: 52px; height: 100%; display: grid; place-items: center; border: 0; background: transparent; color: rgba(255,255,255,.65); cursor: pointer; }
.login-options { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 0 0 20px; font-size: 13px; color: rgba(255,255,255,.76); }
.login-options label { display: inline-flex; align-items: center; gap: 8px; line-height: 1; white-space: nowrap; }
.login-options input { accent-color: var(--accent); margin: 0; width: 14px; height: 14px; flex: 0 0 auto; }
.login-options button { border: 0; background: transparent; color: var(--accent2); cursor: pointer; font-weight: 850; line-height: 1; text-align: right; white-space: nowrap; }
.login-submit { width: 100%; height: 52px; border: 0; border-radius: 14px; color: #fff; cursor: pointer; text-transform: uppercase; letter-spacing: .02em; font-weight: 950; background: linear-gradient(135deg, var(--accent), var(--accent2)); box-shadow: 0 16px 38px color-mix(in srgb, var(--accent) 35%, transparent); }
.login-submit:disabled { opacity: .72; cursor: wait; }
.divider { display: grid; grid-template-columns: 1fr auto 1fr; gap: 14px; align-items: center; margin: 20px 0 16px; color: rgba(255,255,255,.46); font-size: 12px; }
.divider span { height: 1px; background: rgba(255,255,255,.14); }
.microsoft-button { width: 100%; height: 50px; display: flex; align-items: center; justify-content: center; gap: 11px; border-radius: 14px; border: 1px solid rgba(255,255,255,.13); background: rgba(255,255,255,.045); color: #fff; cursor: pointer; font-weight: 850; }
.ms-grid { width: 20px; height: 20px; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); gap: 2px; }
.ms-grid i:nth-child(1) { background: #f25022; }
.ms-grid i:nth-child(2) { background: #7fba00; }
.ms-grid i:nth-child(3) { background: #00a4ef; }
.ms-grid i:nth-child(4) { background: #ffb900; }
.login-note { display: block; margin-top: 14px; text-align: center; color: rgba(255,255,255,.52); line-height: 1.35; }
.request-link { border: 0; background: transparent; color: #fff; padding: 0; font-weight: 950; text-decoration: underline; cursor: pointer; }
.success-box { color: #064e3b; background: #dcfce7; border: 1px solid #86efac; border-radius: 14px; padding: 11px 12px; font-size: 13px; font-weight: 850; }
.access-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 18px; background: rgba(3,7,18,.66); backdrop-filter: blur(8px); }
.access-modal { position: relative; width: min(760px, 100%); max-height: calc(100vh - 36px); overflow: auto; border: 1px solid rgba(255,255,255,.16); border-radius: 26px; background: linear-gradient(135deg, rgba(12,18,35,.98), rgba(22,31,52,.96)); box-shadow: 0 34px 90px rgba(0,0,0,.42); padding: 28px; }
.access-modal > span { color: var(--accent); text-transform: uppercase; letter-spacing: .14em; font-size: 11px; font-weight: 950; }
.access-modal h2 { margin: 6px 0 4px; font-size: 32px; }
.access-modal p { margin: 0 0 18px; color: rgba(255,255,255,.68); }
.access-close { position: absolute; top: 16px; right: 16px; width: 38px; height: 38px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #fff; display: grid; place-items: center; cursor: pointer; }
.access-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
.access-form-grid label { display: grid; gap: 7px; color: rgba(255,255,255,.76); font-size: 12px; font-weight: 850; }
.access-form-grid .full { grid-column: 1 / -1; }
.access-form-grid input, .access-form-grid select, .access-form-grid textarea { width: 100%; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #fff; border-radius: 14px; padding: 11px 12px; outline: none; }
.access-form-grid textarea { min-height: 86px; resize: vertical; }
.access-form-grid option { color: #111827; }
.access-lookup-modal { width: min(920px, 100%); }
.lookup-pending-box { display: grid; gap: 4px; margin-bottom: 16px; padding: 12px 14px; border-radius: 16px; color: #92400e; background: #fef3c7; border: 1px solid #fbbf24; font-weight: 850; }
.lookup-result { margin-top: 18px; display: grid; gap: 14px; }
.lookup-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.lookup-meta div { min-width: 0; padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.07); }
.lookup-meta span { display: block; margin-bottom: 4px; color: rgba(255,255,255,.58); font-size: 11px; font-weight: 950; text-transform: uppercase; letter-spacing: .08em; }
.lookup-meta strong { display: block; color: #fff; font-size: 14px; word-break: break-word; }
.lookup-security-note { padding: 12px 14px; border-radius: 16px; color: color-mix(in srgb, var(--accent2) 70%, #fff); border: 1px solid color-mix(in srgb, var(--accent2) 42%, transparent); background: color-mix(in srgb, var(--accent) 16%, rgba(255,255,255,.05)); font-weight: 850; }
.lookup-preview { width: 100%; height: min(72vh, 760px); border: 1px solid rgba(255,255,255,.14); border-radius: 18px; background: #f4f6fb; }

.mobile-login-back {
  display: none;
  width: fit-content;
  align-items: center;
  gap: 7px;
  margin: 0 0 18px;
  padding: 9px 13px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.82);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  outline: none;
}

.mobile-menu-backdrop { position: fixed; z-index: 60; inset: 0; background: rgba(0,0,0,.54); backdrop-filter: blur(8px); }
.mobile-menu { width: min(340px, 86vw); height: 100%; padding: 18px; background: rgba(11,7,30,.96); border-right: 1px solid rgba(255,255,255,.12); }
.mobile-menu-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.mobile-menu-item { width: 100%; text-align: left; padding: 15px; margin-bottom: 10px; border-radius: 16px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); font-weight: 850; color: #fff; }

@media (max-height: 830px) and (min-width: 1281px) {
  :root { --topbar-height: 104px; }
  .login-topbar { padding-top: 12px; }
  .landing-view { padding-top: 6px; padding-bottom: 18px; }
  .landing-head { margin-top: 0; margin-bottom: 12px; gap: 6px; }
  .brand-logo { height: 58px; width: 220px; }
  .landing-card { grid-template-rows: minmax(190px, 39%) auto 64px; }
  .landing-card-content { padding-top: 20px; }
  .landing-title-row h2 { font-size: 66px; }
  .landing-card-action { height: 52px; margin-bottom: 20px; }

  .main-grid { padding: 8px 0 18px; }
  .main-grid.login-mode { grid-template-columns: minmax(520px, 640px) minmax(720px, 900px); gap: 30px; padding: 6px 0 14px; }
  .login-panel,
  .login-mode .pillars-panel { height: min(78vh, 660px); min-height: 520px; max-height: min(78vh, 660px); }
  .login-mode .pillar-card,
  .login-mode .compact-card { grid-template-columns: minmax(215px, 40%) 1fr 44px; gap: 13px; padding: 10px; }
  .login-mode .pillar-title-row h2,
  .login-mode .compact-card .pillar-title-row h2 { font-size: 38px; }
  .login-mode .pillar-content p,
  .login-mode .compact-card .pillar-content p { font-size: 12px; margin-top: 6px; }
  .login-mode .pillar-content small,
  .login-mode .compact-card .pillar-content small { font-size: 10px; margin-top: 4px; }
}

@media (max-width: 1280px) {
  body { overflow-y: auto; }
  .inova-shell { height: auto; min-height: 100vh; overflow-x: hidden; overflow-y: auto; }
  .login-topbar,
  .main-grid,
  .main-grid.login-mode,
  .landing-view { width: min(1180px, calc(100% - 32px)); }
  .landing-view { height: auto; min-height: calc(100vh - var(--topbar-height)); overflow: visible; }
  .landing-cards { grid-template-columns: 1fr; max-width: 820px; padding-inline: 0; }
  .landing-card { min-height: 620px; }
  .main-grid,
  .main-grid.login-mode { height: auto; min-height: auto; grid-template-columns: 1fr; align-items: stretch; }
  .pillars-panel { max-width: 820px; width: 100%; margin-inline: auto; }
  .login-panel,
  .login-mode .pillars-panel { height: auto; min-height: auto; max-height: none; }
  .login-mode .pillars-panel { grid-template-rows: none; }
  .login-card { max-width: 1040px; width: 100%; margin-inline: auto; grid-template-columns: 1fr 1fr; height: auto; min-height: 580px; }
  .compact-card { height: 175px; grid-template-columns: minmax(170px, 40%) 1fr 46px; }
}

@media (max-width: 860px) {
  :root { --topbar-height: 92px; }
  .login-topbar { width: min(100% - 24px, 680px); padding-top: 12px; }
  .mobile-only { display: grid; }
  .brand-logo { width: min(58vw, 250px); height: 62px; }
  .landing-view { padding-top: 16px; }
  .landing-head { margin-top: 0; }
  .landing-head p { font-size: 14px; }
  .landing-card { min-height: 560px; border-radius: 26px; }
  .landing-cards { gap: 18px; }
  .landing-card-content { padding: 20px; }
  .landing-title-row h2 { font-size: 56px; }
  .landing-card-action { margin: 0 20px 20px; }
  .main-grid,
  .main-grid.login-mode { width: min(100% - 24px, 680px); padding-top: 18px; gap: 20px; }
  .pillar-card,
  .compact-card { height: auto; min-height: 160px; grid-template-columns: minmax(118px, 40%) 1fr 40px; gap: 12px; padding: 10px; border-radius: 22px; }
  .pillar-visual { border-radius: 16px; }
  .pillar-area { font-size: 12px; }
  .pillar-title-row h2,
  .compact-card .pillar-title-row h2 { font-size: clamp(30px, 8vw, 46px); }
  .pillar-content p,
  .compact-card .pillar-content p { font-size: 12px; margin-top: 7px; }
  .pillar-content small,
  .compact-card .pillar-content small { display: none; }
  .pillar-arrow,
  .compact-card .pillar-arrow { width: 34px; height: 34px; }
  .login-card { height: auto; min-height: auto; grid-template-columns: 1fr; border-radius: 28px; }
  .login-hero { min-height: 320px; border-right: 0; border-bottom: 1px solid rgba(255,255,255,.10); }
  .login-body { padding: 26px; }
  .login-body h2 { white-space: normal; font-size: clamp(30px, 9vw, 44px); }
  .login-options { align-items: center; }
}

@media (max-width: 760px) {
  .main-grid.login-mode {
    grid-template-columns: 1fr !important;
    align-items: center;
    justify-content: center;
    gap: 0 !important;
    padding-top: 12px;
  }

  .main-grid.login-mode .pillars-panel {
    display: none !important;
  }

  .login-panel {
    width: 100%;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-card {
    width: 100%;
    max-width: 430px;
    height: auto !important;
    min-height: auto !important;
    grid-template-columns: 1fr !important;
    border-radius: 28px;
  }

  .login-hero {
    display: none !important;
  }

  .login-body {
    padding: 28px 24px 26px;
    justify-content: center;
    overflow: visible;
  }

  .mobile-login-back {
    display: inline-flex;
  }
}

@media (max-width: 500px) {
  .main-grid,
  .main-grid.login-mode,
  .landing-view { width: min(100% - 18px, 430px); }
  .landing-card { min-height: 520px; }
  .landing-card-image { min-height: 190px; }
  .pillar-card,
  .compact-card { grid-template-columns: 1fr; }
  .pillar-visual { height: 190px; }
  .pillar-arrow { position: absolute; right: 16px; bottom: 16px; }
  .login-hero { min-height: 250px; padding: 22px; }
  .login-body h2 { font-size: 32px; }
  .field input,
  .password-row,
  .login-submit,
  .microsoft-button { height: 50px; }
}
`;


