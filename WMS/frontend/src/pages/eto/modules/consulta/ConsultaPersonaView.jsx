import { useState } from "react";
import { Search, User, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import API from "../../api";

const ahora = new Date();

const estadoColor = (e) =>
  e === "ok"
    ? { bg: "#22c55e", fg: "#fff", label: "OK", line: "#16a34a" }
    : e === "warning"
    ? { bg: "#f59e0b", fg: "#fff", label: "WARNING", line: "#d97706" }
    : e === "critical"
    ? { bg: "#ef4444", fg: "#fff", label: "CRÍTICO", line: "#dc2626" }
    : { bg: "#e2e8f0", fg: "#64748b", label: "—", line: "#94a3b8" };

const css = `
@keyframes c360-fadeUp {
  from { opacity: 0; transform: translateY(24px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes c360-pop {
  0% { opacity: 0; transform: scale(.6); }
  70% { transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes c360-sheen { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes c360-blob1 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(120px,60px) scale(1.25)} 66%{transform:translate(-80px,120px) scale(.9)} 100%{transform:translate(0,0) scale(1)} }
@keyframes c360-blob2 { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(-140px,80px) scale(.85)} 66%{transform:translate(100px,-60px) scale(1.2)} 100%{transform:translate(0,0) scale(1)} }
@keyframes c360-blob3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(90px,-110px) scale(1.15)} 100%{transform:translate(0,0) scale(1)} }
.c360-card { animation: c360-fadeUp .55s cubic-bezier(.2,.8,.2,1) both; }
.c360-ind  { animation: c360-fadeUp .5s cubic-bezier(.2,.8,.2,1) both; }
.c360-chip { animation: c360-pop .45s cubic-bezier(.2,.9,.3,1.3) both; }
.c360-header {
  background: linear-gradient(110deg,#0f2744 0%,#12385e 45%,#0f2744 60%);
  background-size: 200% 100%;
  animation: c360-sheen 6s linear infinite;
}
.c360-bg { position:absolute; inset:0; overflow:hidden; z-index:0; pointer-events:none; }
.c360-blob { position:absolute; border-radius:50%; filter: blur(70px); opacity:.5; }
`;

export default function ConsultaPersonaView() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState(ahora.getFullYear());
  const [month, setMonth] = useState(ahora.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    const query = q.trim();
    if (!query) {
      setError("Escribe la cédula o el nombre de la persona.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await API.consultaPersona({ q: query, year, month });
      setPersonas(res?.personas || []);
      setBuscado(true);
    } catch (e) {
      setError(e?.message || "Error consultando.");
      setPersonas([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ position: "relative", padding: 20, minHeight: "100%", overflow: "hidden" }}>
      <style>{css}</style>

      {/* Fondo en movimiento tipo aurora */}
      <div className="c360-bg">
        <div className="c360-blob" style={{ width: 460, height: 460, top: -120, left: -80, background: "#22c55e", animation: "c360-blob1 18s ease-in-out infinite" }} />
        <div className="c360-blob" style={{ width: 520, height: 520, top: 80, right: -120, background: "#2563eb", animation: "c360-blob2 22s ease-in-out infinite" }} />
        <div className="c360-blob" style={{ width: 400, height: 400, bottom: -140, left: "40%", background: "#7c3aed", animation: "c360-blob3 26s ease-in-out infinite" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1150, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, color: "#047857", fontWeight: 900, letterSpacing: ".1em", fontSize: 12 }}>
          CONSULTA 360
        </div>
        <h2 style={{ margin: 0, color: "#0f2744", fontSize: 28, fontWeight: 950 }}>
          ¿Cómo va una persona?
        </h2>
        <p style={{ margin: "6px 0 18px", color: "#475569" }}>
          Escribe la cédula o el nombre y trae todos los indicadores donde está asociada.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            background: "rgba(255,255,255,.75)",
            backdropFilter: "blur(8px)",
            border: "1px solid #d9e2ec",
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 18px 44px rgba(15,23,42,.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: "1 1 320px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <Search size={20} color="#059669" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder="Cédula o nombre de la persona…"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16 }}
            />
          </div>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} title="Año" style={{ width: 90, padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }} />
          <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value))} title="Mes" style={{ width: 70, padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }} />
          <button
            type="button"
            onClick={buscar}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#059669", color: "#fff", border: "none", borderRadius: 12, padding: "11px 20px", fontWeight: 800, cursor: "pointer", fontSize: 15 }}
          >
            <Search size={18} />
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {error && <div style={{ marginTop: 14, color: "#b45309", fontWeight: 700 }}>{error}</div>}

        {buscado && !loading && personas.length === 0 && !error && (
          <div style={{ marginTop: 20, color: "#64748b" }}>No se encontró ninguna persona con “{q}”.</div>
        )}

        {personas.map((p, pi) => (
          <div
            key={p.entity_id}
            className="c360-card"
            style={{
              marginTop: 18,
              background: "rgba(255,255,255,.82)",
              backdropFilter: "blur(8px)",
              border: "1px solid #d9e2ec",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 18px 44px rgba(15,23,42,.10)",
              animationDelay: `${pi * 0.08}s`,
            }}
          >
            <div className="c360-header" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", color: "#fff" }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,.15)", display: "grid", placeItems: "center" }}>
                <User size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{p.name}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{p.entity_type || "Persona"} · {p.code}</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>
                {p.indicadores.length} indicador(es) · {String(month).padStart(2, "0")}/{year}
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {p.indicadores.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>No está asociada a ningún indicador.</div>
              ) : (
                p.indicadores.map((ind, ii) => {
                  const est = estadoColor(ind.estado);
                  const serie = Array.isArray(ind.serie) ? ind.serie : [];
                  return (
                    <div
                      key={ind.indicator_id}
                      className="c360-ind"
                      style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, marginBottom: 14, background: "#fff", animationDelay: `${0.1 + ii * 0.08}s` }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                        <strong style={{ color: "#0f2744" }}>{ind.indicator_code} · {ind.indicator_name}</strong>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{ind.proceso}</span>
                        {ind.ranking && (
                          <span
                            className="c360-chip"
                            style={{
                              marginLeft: "auto",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              background:
                                ind.ranking <= 3 ? "#fef3c7" : "#eef2f7",
                              color: ind.ranking <= 3 ? "#92400e" : "#475569",
                              border: `1px solid ${ind.ranking <= 3 ? "#fcd34d" : "#e2e8f0"}`,
                              borderRadius: 999,
                              padding: "3px 10px",
                              fontWeight: 900,
                              fontSize: 12,
                            }}
                            title="Puesto entre todas las personas del indicador"
                          >
                            {ind.ranking <= 3 ? "🏆" : "#"} Puesto {ind.ranking} de {ind.ranking_total}
                          </span>
                        )}
                        <span style={{ marginLeft: ind.ranking ? 0 : "auto", background: est.bg, color: est.fg, borderRadius: 999, padding: "3px 12px", fontWeight: 900, fontSize: 12 }}>
                          {est.label}
                        </span>
                      </div>

                      {ind.condiciones.length > 0 ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                          {ind.condiciones.map((c, ci) => {
                            const cc = estadoColor(c.estado);
                            return (
                              <span
                                key={c.name}
                                className="c360-chip"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: cc.bg, color: cc.fg, borderRadius: 10, padding: "6px 10px", fontWeight: 800, fontSize: 13, animationDelay: `${0.15 + ii * 0.08 + ci * 0.05}s` }}
                                title={c.meta != null ? `Meta: ${c.meta}` : "Sin meta (no evaluado)"}
                              >
                                {c.name}: {c.value}{c.meta != null ? ` / ${c.meta}` : ""}
                              </span>
                            );
                          })}
                          {ind.invalid > 0 && (
                            <span className="c360-chip" style={{ display: "inline-flex", alignItems: "center", background: "#ede9fe", color: "#6d28d9", borderRadius: 10, padding: "6px 10px", fontWeight: 800, fontSize: 13 }}>
                              Invalidados: {ind.invalid}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}>
                          Acumulado: <b>{ind.accumulated}</b>
                          {ind.meta > 0 ? ` · Meta: ${ind.meta}` : ""}
                          {ind.invalid > 0 ? ` · Invalidados: ${ind.invalid}` : ""}
                        </div>
                      )}

                      {/* Gráfico propio de este indicador con etiquetas de % */}
                      {serie.length > 0 && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <TrendingUp size={15} color={est.line} />
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
                              % de cumplimiento por día
                            </span>
                          </div>
                          <div style={{ width: "100%", height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={serie} margin={{ top: 22, right: 24, left: 0, bottom: 4 }}>
                                <defs>
                                  <linearGradient id={`grad-${ind.indicator_id}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={est.line} stopOpacity={0.6} />
                                    <stop offset="100%" stopColor={est.line} stopOpacity={1} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} width={40} />
                                <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l) => `Día ${l}`} />
                                <Line
                                  type="monotone"
                                  dataKey="pct"
                                  name="% cumplimiento"
                                  stroke={`url(#grad-${ind.indicator_id})`}
                                  strokeWidth={3}
                                  dot={{ r: 3, fill: est.line }}
                                  activeDot={{ r: 5 }}
                                  isAnimationActive
                                  animationDuration={1000}
                                >
                                  <LabelList
                                    dataKey="pct"
                                    position="top"
                                    formatter={(v) => (v ? `${v}%` : "")}
                                    style={{ fontSize: 10, fontWeight: 800, fill: "#0f2744" }}
                                  />
                                </Line>
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
