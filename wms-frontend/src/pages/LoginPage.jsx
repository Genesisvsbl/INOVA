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
    const estado = sessionStorage.getItem("estado");

    if (yaAutenticado && estado === "ACTIVO") {
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
      const usuariosMock = [
        {
          auth: "true",
          userId: "1",
          nombre: "Gineth Visbal",
          usuario: "Gvisbal",
          password: "768",
          rol: "SUPER_ADMIN",
          estado: "ACTIVO",
          permisos: [
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
          ],
        },
        {
          auth: "true",
          userId: "2",
          nombre: "Luis Florez",
          usuario: "Lflorez",
          password: "429",
          rol: "ADMIN_WMS",
          estado: "ACTIVO",
          permisos: [
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
          ],
        },
        {
          auth: "true",
          userId: "3",
          nombre: "Juan Griego",
          usuario: "Jgriego",
          password: "958",
          rol: "ADMIN_WMS",
          estado: "ACTIVO",
          permisos: [
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
          ],
        },
        {
          auth: "true",
          userId: "4",
          nombre: "Darwin Herrera",
          usuario: "Dherrera",
          password: "149",
          rol: "ADMIN_WMS",
          estado: "ACTIVO",
          permisos: [
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
          ],
        },
        {
          auth: "true",
          userId: "5",
          nombre: "Usuario Consulta",
          usuario: "CONSULTA",
          password: "123",
          rol: "CONSULTA",
          estado: "ACTIVO",
          permisos: [
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
          ],
        },
      ];

      const usuarioEncontrado = usuariosMock.find(
        (u) =>
          u.usuario.toLowerCase() === usuario.trim().toLowerCase() &&
          u.password === password.trim()
      );

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

      sessionStorage.setItem("auth", usuarioEncontrado.auth);
      sessionStorage.setItem("userId", usuarioEncontrado.userId);
      sessionStorage.setItem("nombre", usuarioEncontrado.nombre);
      sessionStorage.setItem("usuario", usuarioEncontrado.usuario);
      sessionStorage.setItem("rol", usuarioEncontrado.rol);
      sessionStorage.setItem("estado", usuarioEncontrado.estado);
      sessionStorage.setItem(
        "permisos",
        JSON.stringify(usuarioEncontrado.permisos)
      );

      window.location.href = "/";
    }, 500);
  };

  return (
    <div style={pageStyle}>
      <div style={backgroundGridStyle} />
      <div style={backgroundGlowTopStyle} />
      <div style={backgroundGlowBottomStyle} />
      <div style={backgroundCircleOneStyle} />
      <div style={backgroundCircleTwoStyle} />
      <div style={backgroundLineOneStyle} />
      <div style={backgroundLineTwoStyle} />

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
          <div style={heroBadgeStyle}>PLATAFORMA INTELIGENTE</div>

          <div style={heroTitleStyle}>
            Bienvenidos a INOVA: el sistema inteligente logístico que
            transforma la forma en que operamos.
          </div>

          <div style={heroTextBlockStyle}>
            <p style={heroParagraphStyle}>
              <strong>INOVA</strong> significa{" "}
              <strong>Inventario, Ocupación, Validación y Asignación</strong>.
              Cuatro pilares que redefinen la eficiencia operativa en cada
              movimiento.
            </p>

            <p style={heroParagraphStyle}>
              Con INOVA, cada entrada, salida y reasignación se gestiona con
              precisión. El índice de ocupación se actualiza en tiempo real, y
              la frescura de los productos se monitorea de forma continua.
            </p>

            <p style={heroParagraphStyle}>
              Este sistema está diseñado para equipos logísticos que exigen
              agilidad, trazabilidad y control total. INOVA no solo organiza:
              optimiza recursos, anticipa necesidades y potencia tu operación.
            </p>

            <p style={heroClosingStyle}>
              Es momento de evolucionar. Es momento de <strong>INOVA</strong>.
            </p>
          </div>
        </div>

        <div style={loginPanelWrapStyle}>
          <div style={loginCardStyle}>
            <div style={loginCardHeaderStyle}>
              <img
                src="/INOVA.png"
                alt="INOVA"
                style={{
                  height: 58,
                  objectFit: "contain",
                  marginBottom: 12,
                }}
              />

              <div style={loginTitleStyle}>Iniciar sesión</div>
              <div style={loginSubtitleStyle}>
                Ingrese sus credenciales para acceder al sistema.
              </div>
            </div>

            <div style={loginBodyStyle}>
              {error ? <div style={errorBoxStyle}>{error}</div> : null}

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

/* ================== ESTILOS ================== */

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 20% 20%, rgba(10,110,209,.08), transparent 28%), linear-gradient(135deg, #eef3f9 0%, #e8eef6 45%, #dde7f2 100%)",
  position: "relative",
  overflow: "hidden",
  fontFamily: '"Segoe UI", Arial, sans-serif',
};

const backgroundGridStyle = {
  position: "absolute",
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(15,39,68,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,39,68,0.045) 1px, transparent 1px)
  `,
  backgroundSize: "76px 76px",
  pointerEvents: "none",
};

const backgroundGlowTopStyle = {
  position: "absolute",
  width: 680,
  height: 680,
  top: -250,
  left: -120,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(10,110,209,.18) 0%, rgba(10,110,209,.06) 35%, rgba(10,110,209,0) 72%)",
  filter: "blur(18px)",
  pointerEvents: "none",
};

const backgroundGlowBottomStyle = {
  position: "absolute",
  width: 760,
  height: 760,
  bottom: -330,
  right: -180,
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(15,39,68,.16) 0%, rgba(15,39,68,.05) 34%, rgba(15,39,68,0) 70%)",
  filter: "blur(24px)",
  pointerEvents: "none",
};

const backgroundCircleOneStyle = {
  position: "absolute",
  top: 100,
  right: 210,
  width: 260,
  height: 260,
  borderRadius: "50%",
  border: "1px solid rgba(15,39,68,.08)",
  boxShadow: "0 0 0 28px rgba(15,39,68,.03), 0 0 0 56px rgba(15,39,68,.02)",
  pointerEvents: "none",
};

const backgroundCircleTwoStyle = {
  position: "absolute",
  bottom: 60,
  left: 80,
  width: 170,
  height: 170,
  borderRadius: "50%",
  border: "1px solid rgba(15,39,68,.08)",
  boxShadow: "0 0 0 20px rgba(15,39,68,.03), 0 0 0 40px rgba(15,39,68,.02)",
  pointerEvents: "none",
};

const backgroundLineOneStyle = {
  position: "absolute",
  left: 0,
  top: 170,
  width: "44%",
  height: 2,
  background:
    "linear-gradient(90deg, rgba(15,39,68,0) 0%, rgba(15,39,68,.08) 20%, rgba(15,39,68,0) 100%)",
  pointerEvents: "none",
};

const backgroundLineTwoStyle = {
  position: "absolute",
  right: 0,
  bottom: 150,
  width: "38%",
  height: 2,
  background:
    "linear-gradient(90deg, rgba(15,39,68,0) 0%, rgba(15,39,68,.08) 25%, rgba(15,39,68,0) 100%)",
  pointerEvents: "none",
};

const topBarStyle = {
  position: "relative",
  zIndex: 2,
  height: 68,
  padding: "0 28px",
  borderBottom: "1px solid #dbe5ee",
  background: "rgba(255,255,255,0.68)",
  backdropFilter: "blur(12px)",
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
  width: "100%",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(420px, 0.85fr)",
  alignItems: "center",
  gap: 32,
  padding: "34px 42px 42px",
  boxSizing: "border-box",
};

const leftPanelStyle = {
  paddingRight: 10,
  width: "100%",
  maxWidth: "none",
  minWidth: 0,
};

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(10,110,209,.10)",
  color: "#0a6ed1",
  border: "1px solid rgba(10,110,209,.22)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".05em",
  marginBottom: 22,
  boxShadow: "0 8px 18px rgba(10,110,209,.08)",
};

const heroTitleStyle = {
  fontSize: 42,
  lineHeight: 1.08,
  fontWeight: 900,
  color: "#0f2744",
  maxWidth: 760,
  marginBottom: 20,
  textShadow: "0 1px 0 rgba(255,255,255,.65)",
};

const heroTextBlockStyle = {
  width: "100%",
  maxWidth: "none",
  background: "rgba(255,255,255,0.42)",
  border: "1px solid rgba(217,226,236,.75)",
  borderRadius: 18,
  padding: "22px 24px",
  backdropFilter: "blur(10px)",
  boxShadow: "0 16px 35px rgba(15,39,68,.05)",
  boxSizing: "border-box",
};

const heroParagraphStyle = {
  margin: "0 0 14px",
  fontSize: 15,
  color: "#55687b",
  lineHeight: 1.8,
};

const heroClosingStyle = {
  margin: "8px 0 0",
  fontSize: 16,
  color: "#17324d",
  lineHeight: 1.7,
  fontWeight: 800,
};

const loginPanelWrapStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  minWidth: 0,
};

const loginCardStyle = {
  width: "100%",
  maxWidth: 430,
  background: "rgba(255,255,255,0.93)",
  border: "1px solid #d9e2ec",
  borderRadius: 24,
  overflow: "hidden",
  boxShadow: "0 28px 65px rgba(2,6,23,.16)",
  backdropFilter: "blur(16px)",
};

const loginCardHeaderStyle = {
  padding: "30px 28px 18px",
  textAlign: "center",
  borderBottom: "1px solid #e6edf4",
  background: "linear-gradient(to bottom, #ffffff, #fbfdff)",
};

const loginTitleStyle = {
  fontSize: 28,
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
  boxShadow: "inset 0 1px 0 rgba(15,39,68,.02)",
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
  boxShadow: "0 14px 28px rgba(10,110,209,.24)",
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