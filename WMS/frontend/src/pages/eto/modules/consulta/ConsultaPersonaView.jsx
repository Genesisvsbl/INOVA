import { useState } from "react";
import { Search, User, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import API from "../../api";

const ahora = new Date();

const LINE_COLORS = [
  "#059669",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

const estadoColor = (e) =>
  e === "ok"
    ? { bg: "#22c55e", fg: "#fff", label: "OK" }
    : e === "warning"
    ? { bg: "#f59e0b", fg: "#fff", label: "WARNING" }
    : e === "critical"
    ? { bg: "#ef4444", fg: "#fff", label: "CRÍTICO" }
    : { bg: "#e2e8f0", fg: "#64748b", label: "—" };

const css = `
@keyframes c360-fadeUp {
  from { opacity: 0; transform: translateY(24px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes c360-pop {
  0% { opacity: 0; transform: scale(.6); }
  70% { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes c360-sheen {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.c360-card { animation: c360-fadeUp .55s cubic-bezier(.2,.8,.2,1) both; }
.c360-ind  { animation: c360-fadeUp .5s cubic-bezier(.2,.8,.2,1) both; }
.c360-chip { animation: c360-pop .45s cubic-bezier(.2,.9,.3,1.3) both; }
.c360-header {
  background: linear-gradient(110deg,#0f2744 0%,#12385e 45%,#0f2744 60%);
  background-size: 200% 100%;
  animation: c360-sheen 6s linear infinite;
}
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

  const buildChartData = (persona) => {
    const conSerie = persona.indicadores.filter(
      (i) => Array.isArray(i.serie) && i.serie.length
    );
    if (!conSerie.length) return { data: [], series: [] };
    const dias = Math.max(...conSerie.map((i) => i.serie.length));
    const data = [];
    for (let d = 1; d <= dias; d += 1) {
      const row = { dia: d };
      conSerie.forEach((ind) => {
        const pt = ind.serie.find((s) => s.dia === d);
        row[ind.indicator_code] = pt ? pt.pct : null;
      });
      data.push(row);
    }
    return { data, series: conSerie.map((i) => i.indicator_code) };
  };

  return (
    <section style={{ padding: 20, maxWidth: 1150, margin: "0 auto" }}>
      <style>{css}</style>
      <div style={{ marginBottom: 6, color: "#059669", fontWeight: 900, letterSpacing: ".08em", fontSize: 12 }}>
        CONSULTA 360
      </div>
      <h2 style={{ margin: 0, color: "#0f2744", fontSize: 26, fontWeight: 950 }}>
        ¿Cómo va una persona?
      </h2>
      <p style={{ margin: "6px 0 18px", color: "#64748b" }}>
        Escribe la cédula o el nombre y trae todos los indicadores donde está asociada.
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          background: "#fff",
          border: "1px solid #d9e2ec",
          borderRadius: 16,
          padding: 12,
          boxShadow: "0 12px 30px rgba(15,23,42,.06)",
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
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          title="Año"
          style={{ width: 90, padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }}
        />
        <input
          type="number"
          min="1"
          max="12"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          title="Mes"
          style={{ width: 70, padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }}
        />
        <button
          type="button"
          onClick={buscar}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "11px 20px",
            fontWeight: 800,
            cursor: "pointer",
            fontSize: 15,
          }}
        >
          <Search size={18} />
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 14, color: "#b45309", fontWeight: 700 }}>{error}</div>
      )}

      {buscado && !loading && personas.length === 0 && !error && (
        <div style={{ marginTop: 20, color: "#94a3b8" }}>
          No se encontró ninguna persona con “{q}”.
        </div>
      )}

      {personas.map((p, pi) => {
        const chart = buildChartData(p);
        return (
          <div
            key={p.entity_id}
            className="c360-card"
            style={{
              marginTop: 18,
              background: "#fff",
              border: "1px solid #d9e2ec",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 12px 30px rgba(15,23,42,.06)",
              animationDelay: `${pi * 0.08}s`,
            }}
          >
            <div className="c360-header" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", color: "#fff" }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,.15)", display: "grid", placeItems: "center" }}>
                <User size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{p.name}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {p.entity_type || "Persona"} · {p.code}
                </div>
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
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 12,
                        animationDelay: `${0.1 + ii * 0.07}s`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                        <strong style={{ color: "#0f2744" }}>
                          {ind.indicator_code} · {ind.indicator_name}
                        </strong>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{ind.proceso}</span>
                        <span
                          style={{
                            marginLeft: "auto",
                            background: est.bg,
                            color: est.fg,
                            borderRadius: 999,
                            padding: "3px 12px",
                            fontWeight: 900,
                            fontSize: 12,
                          }}
                        >
                          {est.label}
                        </span>
                      </div>

                      {ind.condiciones.length > 0 ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {ind.condiciones.map((c, ci) => {
                            const cc = estadoColor(c.estado);
                            return (
                              <span
                                key={c.name}
                                className="c360-chip"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: cc.bg,
                                  color: cc.fg,
                                  borderRadius: 10,
                                  padding: "6px 10px",
                                  fontWeight: 800,
                                  fontSize: 13,
                                  animationDelay: `${0.15 + ii * 0.07 + ci * 0.05}s`,
                                }}
                                title={c.meta != null ? `Meta: ${c.meta}` : "Sin meta (no evaluado)"}
                              >
                                {c.name}: {c.value}
                                {c.meta != null ? ` / ${c.meta}` : ""}
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
                        <div style={{ fontSize: 13, color: "#334155" }}>
                          Acumulado: <b>{ind.accumulated}</b>
                          {ind.meta > 0 ? ` · Meta: ${ind.meta}` : ""}
                          {ind.invalid > 0 ? ` · Invalidados: ${ind.invalid}` : ""}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {chart.series.length > 0 && (
                <div
                  className="c360-ind"
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 4,
                    animationDelay: "0.35s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <TrendingUp size={18} color="#059669" />
                    <strong style={{ color: "#0f2744" }}>
                      Comportamiento por días — % de cumplimiento del mes
                    </strong>
                  </div>
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart.data} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                        <XAxis dataKey="dia" tick={{ fontSize: 11 }} label={{ value: "Día", position: "insideBottom", offset: -2, fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(v) => (v == null ? "-" : `${v}%`)} labelFormatter={(l) => `Día ${l}`} />
                        <Legend />
                        {chart.series.map((code, i) => (
                          <Line
                            key={code}
                            type="monotone"
                            dataKey={code}
                            name={code}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            strokeWidth={2.5}
                            dot={false}
                            connectNulls
                            isAnimationActive
                            animationDuration={900}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                    Muestra el avance acumulado día a día como % de la meta del mes.
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
