import { useMemo, useState } from "react";
import { Search, User } from "lucide-react";
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
@keyframes c360-fadeUp { from{opacity:0;transform:translateY(24px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes c360-pop { 0%{opacity:0;transform:scale(.6)} 70%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
@keyframes c360-drift1 { 50%{transform:translate(70px,60px) scale(1.12)} }
@keyframes c360-drift2 { 50%{transform:translate(-60px,-50px) scale(1.15)} }
@keyframes c360-drift3 { 50%{transform:translate(30px,-50px) scale(.92)} }
@keyframes c360-tw { 0%,100%{opacity:.15;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
@keyframes c360-pan { to{transform:translateX(-40px)} }
@keyframes c360-shoot { 0%{left:-15%;top:20px;opacity:0} 6%{opacity:1} 18%{left:70%;top:130px;opacity:0} 100%{opacity:0} }
@keyframes c360-spin { to{transform:rotate(360deg)} }
@keyframes c360-pulse { 0%{width:20px;height:20px;opacity:.9} 100%{width:260px;height:260px;opacity:0} }
@keyframes c360-blip { 0%,100%{opacity:0;transform:scale(.6)} 8%{opacity:1;transform:scale(1)} 45%{opacity:.15} }

.c360-card { animation: c360-fadeUp .55s cubic-bezier(.2,.8,.2,1) both; }
.c360-ind  { animation: c360-fadeUp .5s cubic-bezier(.2,.8,.2,1) both; }
.c360-chip { animation: c360-pop .45s cubic-bezier(.2,.9,.3,1.3) both; }

.c360-hero { position:relative; overflow:hidden; border-radius:22px;
  background:radial-gradient(140% 120% at 75% 30%, #0b5a3f 0%, #063829 35%, #041f18 70%, #02120e 100%);
  box-shadow:0 22px 55px rgba(2,18,14,.35); }
.c360-neb { position:absolute; border-radius:50%; filter:blur(90px); mix-blend-mode:screen; }
.c360-stars span{ position:absolute; background:#d1fae5; border-radius:50%; animation:c360-tw 3s ease-in-out infinite; }
.c360-starslayer{ position:absolute; inset:0; animation:c360-pan 60s linear infinite; }
.c360-shoot{ position:absolute; top:30px; width:120px; height:2px; border-radius:2px;
  background:linear-gradient(90deg,transparent,#6ee7b7,#fff); box-shadow:0 0 12px #6ee7b7; transform:rotate(18deg);
  animation:c360-shoot 8s ease-in infinite; }
.c360-radar{ position:absolute; right:70px; top:52%; transform:translateY(-50%); width:250px; height:250px; border-radius:50%;
  background:radial-gradient(circle,rgba(16,185,129,.14),transparent 70%); overflow:hidden;
  box-shadow:0 0 60px rgba(16,185,129,.25),inset 0 0 40px rgba(16,185,129,.15); }
.c360-ring{ position:absolute; border:1px solid rgba(110,231,183,.28); border-radius:50%; inset:0; margin:auto; }
.c360-cross{ position:absolute; left:50%; top:0; width:1px; height:100%; background:rgba(110,231,183,.18); }
.c360-cross2{ position:absolute; top:50%; left:0; height:1px; width:100%; background:rgba(110,231,183,.18); }
.c360-pulse{ position:absolute; inset:0; margin:auto; width:20px; height:20px; border:2px solid #34d399; border-radius:50%; animation:c360-pulse 3s ease-out infinite; opacity:0; }
.c360-sweep{ position:absolute; inset:0; border-radius:50%; background:conic-gradient(from 0deg,rgba(52,211,153,.6),rgba(52,211,153,0) 60deg,transparent); animation:c360-spin 3s linear infinite; }
.c360-blip{ position:absolute; width:8px; height:8px; border-radius:50%; background:#6ee7b7; box-shadow:0 0 12px #34d399; animation:c360-blip 3s linear infinite; opacity:0; }
.c360-grain{ position:absolute; inset:0; opacity:.07; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }
.c360-vig{ position:absolute; inset:0; box-shadow:inset 0 0 180px 50px rgba(0,0,0,.5); }
@media (max-width:820px){ .c360-radar{ display:none } }
`;

export default function ConsultaPersonaView() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState(ahora.getFullYear());
  const [month, setMonth] = useState(ahora.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState("");

  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        size: Math.random() < 0.8 ? 1.4 : 2.4,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
        opacity: 0.2 + Math.random() * 0.7,
      })),
    []
  );

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
    <section style={{ padding: 20, maxWidth: 1150, margin: "0 auto" }}>
      <style>{css}</style>

      {/* HERO galáctico + radar */}
      <div className="c360-hero" style={{ padding: "32px 34px" }}>
        <div className="c360-neb" style={{ width: 600, height: 520, top: -160, left: -120, background: "radial-gradient(circle,#16a34a,transparent 65%)", opacity: 0.55, animation: "c360-drift1 34s ease-in-out infinite" }} />
        <div className="c360-neb" style={{ width: 560, height: 520, bottom: -200, right: -140, background: "radial-gradient(circle,#0d9488,transparent 65%)", opacity: 0.45, animation: "c360-drift2 42s ease-in-out infinite" }} />
        <div className="c360-neb" style={{ width: 360, height: 340, top: 120, left: "38%", background: "radial-gradient(circle,#4ade80,transparent 62%)", opacity: 0.3, animation: "c360-drift3 30s ease-in-out infinite" }} />

        <div className="c360-starslayer">
          <div className="c360-stars">
            {stars.map((s, i) => (
              <span key={i} style={{ width: s.size, height: s.size, left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s`, opacity: s.opacity }} />
            ))}
          </div>
        </div>

        <div className="c360-shoot" style={{ left: "-10%" }} />

        <div className="c360-radar">
          <div className="c360-ring" style={{ width: 64, height: 64 }} />
          <div className="c360-ring" style={{ width: 140, height: 140 }} />
          <div className="c360-ring" style={{ width: 216, height: 216 }} />
          <div className="c360-cross" />
          <div className="c360-cross2" />
          <div className="c360-pulse" />
          <div className="c360-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="c360-sweep" />
          <div className="c360-blip" style={{ top: 64, left: 160, animationDelay: ".5s" }} />
          <div className="c360-blip" style={{ top: 160, left: 66, animationDelay: "1.5s" }} />
          <div className="c360-blip" style={{ top: 184, left: 180, animationDelay: "2.3s" }} />
        </div>

        <div className="c360-grain" />
        <div className="c360-vig" />

        <div style={{ position: "relative", zIndex: 9, maxWidth: 640 }}>
          <div style={{ color: "#6ee7b7", fontWeight: 900, letterSpacing: ".15em", fontSize: 11, textShadow: "0 0 12px rgba(110,231,183,.5)" }}>
            CONSULTA 360
          </div>
          <h2 style={{ margin: "6px 0 12px", color: "#ecfdf5", fontSize: 31, fontWeight: 950, textShadow: "0 2px 30px rgba(0,0,0,.6)" }}>
            ¿Cómo va una persona?
          </h2>
          <p style={{ margin: "0 0 16px", color: "#a7f3d0", fontSize: 13, opacity: 0.88 }}>
            Escribe la cédula o el nombre y escaneamos todos sus indicadores.
          </p>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 300px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(110,231,183,.32)", borderRadius: 14, padding: "12px 15px", backdropFilter: "blur(10px)" }}>
              <Search size={20} color="#6ee7b7" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
                placeholder="Cédula o nombre de la persona…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "#ecfdf5" }}
              />
            </div>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} title="Año" style={{ width: 90, padding: "11px", borderRadius: 10, border: "1px solid rgba(110,231,183,.3)", background: "rgba(255,255,255,.08)", color: "#ecfdf5", fontSize: 14 }} />
            <input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(Number(e.target.value))} title="Mes" style={{ width: 70, padding: "11px", borderRadius: 10, border: "1px solid rgba(110,231,183,.3)", background: "rgba(255,255,255,.08)", color: "#ecfdf5", fontSize: 14 }} />
            <button
              type="button"
              onClick={buscar}
              disabled={loading}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#10b981,#047857)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontWeight: 800, cursor: "pointer", fontSize: 15, boxShadow: "0 8px 22px rgba(4,120,87,.55)" }}
            >
              <Search size={18} />
              {loading ? "Escaneando…" : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {error && <div style={{ marginTop: 14, color: "#b45309", fontWeight: 700 }}>{error}</div>}

      {buscado && !loading && personas.length === 0 && !error && (
        <div style={{ marginTop: 20, color: "#64748b" }}>No se encontró ninguna persona con “{q}”.</div>
      )}

      {personas.map((p, pi) => (
        <div
          key={p.entity_id}
          className="c360-card"
          style={{ marginTop: 18, background: "#fff", border: "1px solid #d9e2ec", borderRadius: 18, overflow: "hidden", boxShadow: "0 14px 34px rgba(15,23,42,.08)", animationDelay: `${pi * 0.08}s` }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "linear-gradient(110deg,#04211a,#0b3d2e 60%)", color: "#fff" }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(110,231,183,.18)", display: "grid", placeItems: "center" }}>
              <User size={22} color="#6ee7b7" />
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
                          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: ind.ranking <= 3 ? "#fef3c7" : "#eef2f7", color: ind.ranking <= 3 ? "#92400e" : "#475569", border: `1px solid ${ind.ranking <= 3 ? "#fcd34d" : "#e2e8f0"}`, borderRadius: 999, padding: "3px 10px", fontWeight: 900, fontSize: 12 }}
                          title="Puesto entre todas las personas del indicador"
                        >
                          {ind.ranking <= 3 ? "🏆" : "#"} Puesto {ind.ranking} de {ind.ranking_total}
                        </span>
                      )}
                      <span style={{ marginLeft: ind.ranking ? 0 : "auto", background: est.bg, color: est.fg, borderRadius: 999, padding: "3px 12px", fontWeight: 900, fontSize: 12 }}>
                        {est.label}
                      </span>
                    </div>

                    {(() => {
                      const evaluadas = ind.condiciones.filter((c) => c.meta != null);
                      const okCount = evaluadas.filter((c) => c.estado === "ok").length;
                      const pct = evaluadas.length
                        ? Math.round((okCount / evaluadas.length) * 100)
                        : ind.meta > 0
                        ? Math.min(100, Math.round((ind.accumulated / ind.meta) * 100))
                        : 0;
                      const R = 34;
                      const CIRC = 2 * Math.PI * R;
                      return (
                        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                          {/* Anillo de cumplimiento */}
                          <div style={{ position: "relative", width: 92, height: 92, flex: "0 0 auto" }}>
                            <svg width="92" height="92">
                              <circle cx="46" cy="46" r={R} stroke="#e5e7eb" strokeWidth="9" fill="none" />
                              <circle
                                cx="46"
                                cy="46"
                                r={R}
                                stroke={est.line}
                                strokeWidth="9"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={CIRC}
                                strokeDashoffset={CIRC * (1 - pct / 100)}
                                transform="rotate(-90 46 46)"
                                style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" }}
                              />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                              <div style={{ textAlign: "center", lineHeight: 1 }}>
                                <div style={{ fontSize: 20, fontWeight: 950, color: est.line }}>{pct}%</div>
                                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>cumple</div>
                              </div>
                            </div>
                          </div>

                          {/* Barras por condición (valor / meta) */}
                          <div style={{ flex: "1 1 300px", minWidth: 260 }}>
                            {evaluadas.length > 0 ? (
                              evaluadas.map((c) => {
                                const cc = estadoColor(c.estado);
                                const fill = c.meta > 0 ? Math.min(100, (c.value / c.meta) * 100) : 0;
                                return (
                                  <div key={c.name} style={{ marginBottom: 9 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                                      <span style={{ fontWeight: 800, color: "#334155" }}>{c.name}</span>
                                      <span style={{ fontWeight: 800, color: cc.line }}>
                                        {c.value} / {c.meta}
                                      </span>
                                    </div>
                                    <div style={{ height: 10, borderRadius: 6, background: "#eef2f7", overflow: "hidden" }}>
                                      <div style={{ width: `${fill}%`, height: "100%", background: cc.bg, borderRadius: 6, transition: "width 1s cubic-bezier(.2,.8,.2,1)" }} />
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ fontSize: 13, color: "#334155" }}>
                                Acumulado: <b>{ind.accumulated}</b>
                                {ind.meta > 0 ? ` · Meta: ${ind.meta}` : ""}
                              </div>
                            )}
                            {(ind.condiciones.some((c) => c.meta == null) ||
                              ind.invalid > 0) && (
                              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {ind.condiciones
                                  .filter((c) => c.meta == null)
                                  .map((c) => (
                                    <span key={c.name} style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", borderRadius: 8, padding: "3px 8px", fontWeight: 700 }}>
                                      {c.name}: {c.value} (sin meta)
                                    </span>
                                  ))}
                                {ind.invalid > 0 && (
                                  <span style={{ fontSize: 11, color: "#6d28d9", background: "#ede9fe", borderRadius: 8, padding: "3px 8px", fontWeight: 800 }}>
                                    Invalidados: {ind.invalid}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
