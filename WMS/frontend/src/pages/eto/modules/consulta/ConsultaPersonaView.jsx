import { useState } from "react";
import { Search, User } from "lucide-react";
import API from "../../api";

const ahora = new Date();

const estadoColor = (e) =>
  e === "ok"
    ? { bg: "#22c55e", fg: "#fff", label: "OK" }
    : e === "warning"
    ? { bg: "#f59e0b", fg: "#fff", label: "WARNING" }
    : e === "critical"
    ? { bg: "#ef4444", fg: "#fff", label: "CRÍTICO" }
    : { bg: "#e2e8f0", fg: "#64748b", label: "—" };

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
    <section style={{ padding: 20, maxWidth: 1150, margin: "0 auto" }}>
      <div style={{ marginBottom: 6, color: "#059669", fontWeight: 900, letterSpacing: ".08em", fontSize: 12 }}>
        CONSULTA 360
      </div>
      <h2 style={{ margin: 0, color: "#0f2744", fontSize: 26, fontWeight: 950 }}>
        ¿Cómo va una persona?
      </h2>
      <p style={{ margin: "6px 0 18px", color: "#64748b" }}>
        Escribe la cédula o el nombre y trae todos los indicadores donde está asociada.
      </p>

      {/* Buscador con lupa */}
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

      {personas.map((p) => (
        <div
          key={p.entity_id}
          style={{
            marginTop: 18,
            background: "#fff",
            border: "1px solid #d9e2ec",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 12px 30px rgba(15,23,42,.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "#0f2744", color: "#fff" }}>
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
              p.indicadores.map((ind) => {
                const est = estadoColor(ind.estado);
                return (
                  <div
                    key={ind.indicator_id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 12,
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
                        {ind.condiciones.map((c) => {
                          const cc = estadoColor(c.estado);
                          return (
                            <span
                              key={c.name}
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
                              }}
                              title={
                                c.meta != null
                                  ? `Meta: ${c.meta}`
                                  : "Sin meta (no evaluado)"
                              }
                            >
                              {c.name}: {c.value}
                              {c.meta != null ? ` / ${c.meta}` : ""}
                            </span>
                          );
                        })}
                        {ind.invalid > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", background: "#ede9fe", color: "#6d28d9", borderRadius: 10, padding: "6px 10px", fontWeight: 800, fontSize: 13 }}>
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
          </div>
        </div>
      ))}
    </section>
  );
}
