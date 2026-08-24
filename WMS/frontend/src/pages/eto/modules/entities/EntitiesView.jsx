import { useMemo, useState } from "react";
import { exportarEntidadesExcel } from "../../entidadesExcel";

const EMPTY = {
  code: "",
  name: "",
  entity_type: "Persona",
  position: "",
  is_active: true,
};

const CARGOS_DEFAULT = ["Operador", "Supervisor"];

const isPersona = (e) =>
  String(e?.entity_type || "").toLowerCase().includes("persona");

export default function EntitiesView({
  entities = [],
  onSave = async () => {},
  onDelete = async () => {},
  loading = false,
}) {
  const [tab, setTab] = useState("personas");
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("");

  const list = useMemo(() => {
    const base = (entities || []).filter((e) =>
      tab === "personas" ? isPersona(e) : !isPersona(e)
    );
    const q = filter.trim().toLowerCase();
    if (!q) return base;
    return base.filter((e) =>
      [e.code, e.name, e.entity_type, e.position].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [entities, tab, filter]);

  const cargos = useMemo(() => {
    const set = new Set(CARGOS_DEFAULT);
    (entities || []).forEach((e) => {
      const c = String(e.position || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  const total = entities.length;
  const personasCount = entities.filter(isPersona).length;
  const maquinasCount = total - personasCount;

  const esPersonas = tab === "personas";

  const resetForm = () => {
    setForm({ ...EMPTY, entity_type: esPersonas ? "Persona" : "Máquina" });
    setEditingId(null);
  };

  const startEdit = (e) => {
    setForm({
      code: e.code || "",
      name: e.name || "",
      entity_type: e.entity_type || "",
      position: e.position || "",
      is_active: e.is_active !== false,
    });
    setEditingId(e.id);
  };

  const save = async () => {
    if (!String(form.name || "").trim()) {
      window.alert("Ingresa el nombre de la entidad");
      return;
    }
    const payload = {
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      entity_type:
        String(form.entity_type || "").trim() ||
        (esPersonas ? "Persona" : "Máquina"),
      position: String(form.position || "").trim() || null,
      is_active: !!form.is_active,
    };
    await onSave(payload, editingId);
    resetForm();
  };

  const remove = async (e) => {
    if (!window.confirm(`¿Eliminar "${e.name}"?`)) return;
    await onDelete(e.id);
    if (editingId === e.id) resetForm();
  };

  const exportar = () =>
    exportarEntidadesExcel({
      rows: list,
      titulo: esPersonas ? "Personas" : "Máquinas",
    });

  const changeTab = (next) => {
    setTab(next);
    setForm({ ...EMPTY, entity_type: next === "personas" ? "Persona" : "Máquina" });
    setEditingId(null);
    setFilter("");
  };

  return (
    <section className="ent-page">
      <header className="ent-header">
        <div className="ent-brand">
          <div className="ent-logo" aria-hidden="true" />
          <div>
            <div className="ent-kicker">DATOS MAESTROS</div>
            <h1 className="ent-title">Personal y Entidades</h1>
            <p className="ent-sub">
              Administra las personas y la maquinaria. Los cambios se reflejan
              automáticamente en Indicadores.
            </p>
          </div>
        </div>
        <div className="ent-kpis">
          <div className="ent-kpi">
            <span>Total</span>
            <strong>{total}</strong>
          </div>
          <div className="ent-kpi">
            <span>Personas</span>
            <strong>{personasCount}</strong>
          </div>
          <div className="ent-kpi">
            <span>Máquinas</span>
            <strong>{maquinasCount}</strong>
          </div>
        </div>
      </header>

      <div className="ent-tabs">
        <button
          type="button"
          className={esPersonas ? "ent-tab active" : "ent-tab"}
          onClick={() => changeTab("personas")}
        >
          Personas ({personasCount})
        </button>
        <button
          type="button"
          className={!esPersonas ? "ent-tab active" : "ent-tab"}
          onClick={() => changeTab("maquinas")}
        >
          Máquinas ({maquinasCount})
        </button>
      </div>

      <div className="ent-grid">
        <article className="ent-panel ent-form-panel">
          <h3>{editingId ? "Editar" : "Nueva"} {esPersonas ? "persona" : "máquina"}</h3>
          <p className="ent-panel-sub">
            {editingId
              ? "Actualiza los datos y guarda."
              : `Registra ${esPersonas ? "una persona" : "una máquina"} nueva.`}
          </p>

          <div className="ent-field">
            <label>Código / Documento</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="ent-field">
            <label>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={esPersonas ? "Ej. Juan Pérez" : "Ej. Selladora 01"}
            />
          </div>

          <div className="ent-field">
            <label>Tipo</label>
            <input
              value={form.entity_type}
              onChange={(e) => setForm({ ...form, entity_type: e.target.value })}
              placeholder={esPersonas ? "Persona" : "Máquina"}
            />
          </div>

          {esPersonas && (
            <div className="ent-field">
              <label>Cargo</label>
              <select
                value={form.position || ""}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              >
                <option value="">Sin cargo</option>
                {Array.from(
                  new Set([...cargos, ...(form.position ? [form.position] : [])])
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ent-field">
            <label>Estado</label>
            <select
              value={form.is_active ? "true" : "false"}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.value === "true" })
              }
            >
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </select>
          </div>

          <div className="ent-actions">
            <button
              type="button"
              className="ent-btn primary"
              onClick={save}
              disabled={loading}
            >
              {editingId ? "Guardar cambios" : "Agregar"}
            </button>
            {editingId && (
              <button type="button" className="ent-btn" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </article>

        <article className="ent-panel ent-list-panel">
          <div className="ent-list-head">
            <div>
              <h3>{esPersonas ? "Personas" : "Máquinas"}</h3>
              <p className="ent-panel-sub">
                Mostrando {list.length} de{" "}
                {esPersonas ? personasCount : maquinasCount}
              </p>
            </div>
            <div className="ent-list-tools">
              <input
                className="ent-search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar…"
              />
              <button
                type="button"
                className="ent-btn export"
                onClick={exportar}
                disabled={!list.length}
              >
                ⬇ Exportar Excel
              </button>
            </div>
          </div>

          <div className="ent-table-wrap">
            <table className="ent-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  {esPersonas && <th>Cargo</th>}
                  <th>Estado</th>
                  <th className="ent-actions-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td>{e.code}</td>
                    <td className="ent-name">{e.name}</td>
                    <td>{e.entity_type}</td>
                    {esPersonas && <td>{e.position || "-"}</td>}
                    <td>
                      <span
                        className={
                          e.is_active !== false
                            ? "ent-badge on"
                            : "ent-badge off"
                        }
                      >
                        {e.is_active !== false ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td>
                      <div className="ent-row-actions">
                        <button
                          type="button"
                          className="ent-tbtn edit"
                          onClick={() => startEdit(e)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="ent-tbtn del"
                          onClick={() => remove(e)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={esPersonas ? 6 : 5} className="ent-empty">
                      No hay registros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <style>{`
        .ent-page { position: relative; width: 100%; min-height: 100%; padding: clamp(20px, 2.2vw, 32px); color: #0f172a; background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(244,251,246,.94)); }
        .ent-header { display: flex; flex-direction: column; align-items: stretch; gap: 16px; margin-bottom: 18px; }
        .ent-brand { display: flex; align-items: center; gap: 18px; }
        .ent-logo { width: 156px; height: 48px; flex-shrink: 0; background-color: #15803d; -webkit-mask: url(/INOVA2026.png) left center / contain no-repeat; mask: url(/INOVA2026.png) left center / contain no-repeat; }
        .ent-kicker { color: #15803d; font-weight: 900; letter-spacing: .08em; font-size: 12px; }
        .ent-title { margin: 4px 0 6px; font-size: clamp(28px, 3vw, 42px); font-weight: 950; color: #0b1f14; }
        .ent-sub { color: #64748b; margin: 0; max-width: 520px; }
        .ent-kpis { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .ent-kpi { background: #f6fdf9; border: 1px solid #d6e7dc; border-radius: 16px; padding: 14px 22px; min-width: 96px; text-align: center; }
        .ent-kpi span { display: block; color: #15803d; font-weight: 800; font-size: 12px; letter-spacing: .04em; }
        .ent-kpi strong { font-size: 30px; color: #0b1f14; }
        .ent-tabs { display: flex; gap: 10px; margin-bottom: 16px; }
        .ent-tab { border: 1px solid #d6e7dc; background: #fff; color: #334155; border-radius: 12px; padding: 10px 20px; font-weight: 800; cursor: pointer; }
        .ent-tab.active { background: #15803d; border-color: #15803d; color: #fff; box-shadow: 0 10px 24px rgba(21,128,61,.24); }
        .ent-grid { display: grid; grid-template-columns: minmax(320px, 380px) minmax(0, 1fr); gap: 22px; align-items: start; }
        .ent-panel { border-radius: 20px; border: 1px solid rgba(214,231,220,.9); background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(255,255,255,.9)); box-shadow: 0 20px 50px rgba(15,23,42,.07); padding: 22px; }
        .ent-panel h3 { margin: 0; font-size: 20px; color: #0b1f14; }
        .ent-panel-sub { color: #64748b; margin: 4px 0 14px; font-size: 13px; }
        .ent-field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px; }
        .ent-field label { font-weight: 700; font-size: 13px; color: #334155; }
        .ent-field input, .ent-field select, .ent-search { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; font-size: 14px; background: #fff; color: #0f172a; }
        .ent-field input:focus, .ent-field select:focus, .ent-search:focus { outline: none; border-color: #15803d; box-shadow: 0 0 0 3px rgba(21,128,61,.12); }
        .ent-actions { display: flex; gap: 10px; margin-top: 6px; }
        .ent-btn { border: 1px solid #cbd5e1; background: #f1f5f9; color: #0f172a; border-radius: 10px; padding: 10px 18px; font-weight: 800; cursor: pointer; }
        .ent-btn.primary { background: #15803d; border-color: #15803d; color: #fff; box-shadow: 0 12px 26px rgba(21,128,61,.26); }
        .ent-btn.export { background: #16a34a; border-color: #16a34a; color: #fff; }
        .ent-btn:disabled { opacity: .55; cursor: not-allowed; }
        .ent-list-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
        .ent-list-tools { display: flex; gap: 10px; align-items: center; }
        .ent-search { min-width: 200px; }
        .ent-table-wrap { overflow: auto; border-radius: 14px; border: 1px solid #e2e8f0; max-height: 62vh; }
        .ent-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .ent-table th { position: sticky; top: 0; z-index: 2; text-align: left; background: #e7f8ee; color: #166534; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; font-weight: 900; padding: 12px 14px; border-bottom: 1px solid #d6e7dc; }
        .ent-table td { padding: 12px 14px; font-size: 13px; color: #1f2937; border-bottom: 1px solid #eef3f0; vertical-align: middle; }
        .ent-table tbody tr:hover { background: rgba(21,128,61,.04); }
        .ent-name { font-weight: 700; color: #0b1f14; }
        .ent-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; }
        .ent-badge.on { background: #dcfce7; color: #15803d; }
        .ent-badge.off { background: #fef2f2; color: #dc2626; }
        .ent-row-actions { display: flex; gap: 8px; }
        .ent-tbtn { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 800; cursor: pointer; color: #0f172a; }
        .ent-tbtn.edit { color: #15803d; border-color: #bbf7d0; background: #f0fdf4; }
        .ent-tbtn.del { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
        .ent-actions-col { text-align: right; }
        .ent-empty { text-align: center; color: #94a3b8; padding: 26px; }
        @media (max-width: 1100px) { .ent-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}
