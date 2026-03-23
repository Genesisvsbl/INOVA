import { useEffect, useState } from "react";
import { ShieldCheck, User, LockKeyhole, Eye, EyeOff } from "lucide-react";

const colors = {
  navy: "#0f2744",
  blue: "#0a6ed1",
  blueSoft: "#eaf3ff",
  text: "#1f2d3d",
  muted: "#6b7a90",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#2f6f44",
  bad: "#b42318",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
};

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const yaAutenticado = sessionStorage.getItem("auth") === "true";
    if (yaAutenticado) {
      window.location.href = "/";
    }
  }, []);

  const login = () => {
    setError("");

    if (!usuario.trim() || !password.trim()) {
      setError("Debes ingresar usuario y contraseña.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      if (usuario === "Gvisbal" && password === "768") {
        sessionStorage.setItem("auth", "true");
        sessionStorage.setItem("rol", "SUPER_ADMIN");
        sessionStorage.setItem("usuario", "Gvisbal");
        window.location.href = "/";
      } else {
        setError("Credenciales incorrectas.");
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div style={pageStyle}>
      <div style={backgroundGridStyle} />

      <div style={topBarStyle}>
        <div style={topBarBrandStyle}>
          <img
            src="/INOVA.png"
            alt="INOVA"
            style={{ height: 34, objectFit: "contain" }}
          />
          <div>
            <div style={topBarTitleStyle}>WMS INOVA</div>
            <div style={topBarSubtitleStyle}>Control logístico</div>
          </div>
        </div>

        <div style={topBarChipStyle}>
          <ShieldCheck size={14} />
          Acceso seguro
        </div>
      </div>

      <div style={mainWrapStyle}>
        <div style={leftPanelStyle}>
          <div style={heroBadgeStyle}>PLATAFORMA WMS</div>

          <div style={heroTitleStyle}>
            Gestión logística sobria, segura y profesional.
          </div>

          <div style={heroTextStyle}>
            Accede al sistema para administrar datos maestros, inventarios,
            movimientos, stock y operación logística en una sola plataforma.
          </div>

          <div style={featureGridStyle}>
            <FeatureItem title="Datos maestros" text="Materiales, proveedores, ubicaciones y parámetros base." />
            <FeatureItem title="Movimientos" text="Recibo, despacho, picking y trazabilidad operativa." />
            <FeatureItem title="Inventarios" text="Conteos, conciliación, reconteos e informes." />
            <FeatureItem title="Control de acceso" text="Sesión activa solo mientras el navegador permanezca abierto." />
          </div>
        </div>

        <div style={loginPanelWrapStyle}>
          <div style={loginCardStyle}>
            <div style={loginCardHeaderStyle}>
              <img
                src="/INOVA.png"
                alt="INOVA"
                style={{
                  height: 54,
                  objectFit: "contain",
                  marginBottom: 10,
                }}
              />

              <div style={loginTitleStyle}>Iniciar sesión</div>
              <div style={loginSubtitleStyle}>
                Ingrese sus credenciales para acceder al sistema.
              </div>
            </div>

            <div style={loginBodyStyle}>
              {error ? (
                <div style={errorBoxStyle}>{error}</div>
              ) : null}

              <div style={{ marginBottom: 14 }}>
                <div style={fieldLabelStyle}>Usuario</div>
                <div style={inputWrapStyle}>
                  <User size={16} color={colors.muted} />
                  <input
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && login()}
                    style={inputStyle}
                    placeholder="Ingrese su usuario"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={fieldLabelStyle}>Contraseña</div>
                <div style={inputWrapStyle}>
                  <LockKeyhole size={16} color={colors.muted} />
                  <input
                    type={mostrarClave ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && login()}
                    style={inputStyle}
                    placeholder="Ingrese su contraseña"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarClave((v) => !v)}
                    style={eyeButtonStyle}
                  >
                    {mostrarClave ? (
                      <EyeOff size={16} color={colors.muted} />
                    ) : (
                      <Eye size={16} color={colors.muted} />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={login}
                disabled={loading}
                style={{
                  ...submitBtnStyle,
                  opacity: loading ? 0.85 : 1,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Validando acceso..." : "ACCEDER"}
              </button>

              <div style={sessionNoticeStyle}>
                La sesión permanece activa mientras la pestaña o el navegador
                estén abiertos. Al cerrarlos, se solicitará acceso nuevamente.
              </div>
            </div>

            <div style={loginFooterStyle}>
              INOVA © {new Date().getFullYear()} · Warehouse Management System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ title, text }) {
  return (
    <div style={featureItemStyle}>
      <div style={featureTitleStyle}>{title}</div>
      <div style={featureTextStyle}>{text}</div>
    </div>
  );
}

/* ================== ESTILOS ================== */

const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f4f7fb 0%, #eef3f8 55%, #e7edf5 100%)",
  position: "relative",
  overflow: "hidden",
  fontFamily: '"Segoe UI", Arial, sans-serif',
};

const backgroundGridStyle = {
  position: "absolute",
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(15,39,68,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,39,68,0.05) 1px, transparent 1px)
  `,
  backgroundSize: "80px 80px",
  maskImage: "linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,.08))",
  pointerEvents: "none",
};

const topBarStyle = {
  position: "relative",
  zIndex: 2,
  height: 68,
  padding: "0 28px",
  borderBottom: "1px solid #dbe5ee",
  background: "rgba(255,255,255,0.74)",
  backdropFilter: "blur(10px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const topBarBrandStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const topBarTitleStyle = {
  fontSize: 16,
  fontWeight: 900,
  color: "#17324d",
  lineHeight: 1.05,
};

const topBarSubtitleStyle = {
  fontSize: 12,
  color: "#6b7a90",
  marginTop: 2,
};

const topBarChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eef8f1",
  color: "#2f6f44",
  border: "1px solid #cfe8d7",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const mainWrapStyle = {
  position: "relative",
  zIndex: 2,
  minHeight: "calc(100vh - 68px)",
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  alignItems: "center",
  gap: 28,
  padding: "30px 40px 40px",
};

const leftPanelStyle = {
  paddingRight: 10,
};

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eaf3ff",
  color: "#0a6ed1",
  border: "1px solid #cfe0ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".04em",
  marginBottom: 18,
};

const heroTitleStyle = {
  fontSize: 40,
  lineHeight: 1.08,
  fontWeight: 900,
  color: "#0f2744",
  maxWidth: 650,
  marginBottom: 16,
};

const heroTextStyle = {
  fontSize: 15,
  color: "#5d6e82",
  lineHeight: 1.7,
  maxWidth: 640,
  marginBottom: 24,
};

const featureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
  gap: 12,
  maxWidth: 760,
};

const featureItemStyle = {
  background: "rgba(255,255,255,0.75)",
  border: "1px solid #dbe5ee",
  borderRadius: 14,
  padding: 16,
  backdropFilter: "blur(6px)",
  boxShadow: "0 8px 22px rgba(15,39,68,0.04)",
};

const featureTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#17324d",
  marginBottom: 8,
};

const featureTextStyle = {
  fontSize: 13,
  color: "#6b7a90",
  lineHeight: 1.6,
};

const loginPanelWrapStyle = {
  display: "flex",
  justifyContent: "center",
};

const loginCardStyle = {
  width: "100%",
  maxWidth: 430,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #d9e2ec",
  borderRadius: 22,
  overflow: "hidden",
  boxShadow: "0 26px 60px rgba(2,6,23,.14)",
  backdropFilter: "blur(14px)",
};

const loginCardHeaderStyle = {
  padding: "28px 28px 18px",
  textAlign: "center",
  borderBottom: "1px solid #e6edf4",
  background: "linear-gradient(to bottom, #ffffff, #fbfdff)",
};

const loginTitleStyle = {
  fontSize: 26,
  fontWeight: 900,
  color: "#17324d",
  lineHeight: 1.05,
};

const loginSubtitleStyle = {
  fontSize: 13,
  color: "#6b7a90",
  marginTop: 8,
  lineHeight: 1.5,
};

const loginBodyStyle = {
  padding: 28,
};

const errorBoxStyle = {
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${colors.badBd}`,
  background: colors.badBg,
  color: colors.bad,
  fontSize: 13,
  fontWeight: 800,
};

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 900,
  color: colors.muted,
  letterSpacing: ".05em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const inputWrapStyle = {
  height: 48,
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  background: "#fff",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "0 12px",
  boxSizing: "border-box",
};

const inputStyle = {
  flex: 1,
  height: "100%",
  border: "none",
  outline: "none",
  fontSize: 14,
  fontWeight: 700,
  color: colors.text,
  background: "transparent",
};

const eyeButtonStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
};

const submitBtnStyle = {
  width: "100%",
  height: 50,
  borderRadius: 14,
  border: "1px solid #0b57d0",
  background: "linear-gradient(180deg, #0b57d0, #094db7)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(10,110,209,.24)",
  letterSpacing: ".02em",
};

const sessionNoticeStyle = {
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.6,
  textAlign: "center",
};

const loginFooterStyle = {
  padding: "14px 20px",
  borderTop: "1px solid #e6edf4",
  background: "#fbfdff",
  textAlign: "center",
  fontSize: 11,
  color: "#7b8a99",
  fontWeight: 700,
};