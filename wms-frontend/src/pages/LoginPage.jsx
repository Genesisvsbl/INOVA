import { useState } from "react";

const colors = {
  navy: "#072B5A",
  blue: "#0A6ED1",
  bg: "#F5F7FB",
  text: "#0F172A",
  muted: "#64748B",
  card: "#FFFFFF",
  border: "#E2E8F0",
};

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  const login = () => {
    if (usuario === "Gvisbal" && password === "768") {
      localStorage.setItem("auth", "true");
      localStorage.setItem("rol", "SUPER_ADMIN"); // 🔥 futuro uso
      window.location.href = "/";
    } else {
      alert("❌ Credenciales incorrectas");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${colors.bg}, #e2e8f0)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 🔷 FONDO DECORATIVO */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          background: "rgba(10,110,209,.08)",
          borderRadius: "50%",
          top: -100,
          right: -100,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          background: "rgba(7,43,90,.08)",
          borderRadius: "50%",
          bottom: -120,
          left: -120,
          filter: "blur(80px)",
        }}
      />

      {/* 🔐 CARD LOGIN */}
      <div
        style={{
          width: 380,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 20,
          padding: 30,
          boxShadow: "0 20px 50px rgba(2,6,23,.15)",
          zIndex: 2,
        }}
      >
        {/* 🔷 LOGO */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src="/inova-logo.png"
            alt="INOVA"
            style={{ height: 50, marginBottom: 10 }}
          />
          <h2 style={{ margin: 0, color: colors.navy }}>
            WMS INOVA
          </h2>
          <div style={{ fontSize: 13, color: colors.muted }}>
            Control logístico
          </div>
        </div>

        {/* USUARIO */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: colors.muted }}>
            USUARIO
          </div>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              marginTop: 6,
              fontWeight: 800,
            }}
          />
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: colors.muted }}>
            CONTRASEÑA
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              height: 44,
              padding: "0 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              marginTop: 6,
              fontWeight: 800,
            }}
          />
        </div>

        {/* BOTÓN */}
        <button
          onClick={login}
          style={{
            width: "100%",
            height: 46,
            borderRadius: 14,
            border: "none",
            background: colors.navy,
            color: "#fff",
            fontWeight: 900,
            fontSize: 14,
            cursor: "pointer",
            transition: ".2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = colors.blue)}
          onMouseOut={(e) => (e.currentTarget.style.background = colors.navy)}
        >
          INICIAR SESIÓN
        </button>

        {/* FOOTER */}
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 11,
            color: colors.muted,
          }}
        >
          INOVA © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}