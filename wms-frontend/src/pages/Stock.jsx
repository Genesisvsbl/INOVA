import { useMemo, useState } from "react";
import {
  Search,
  PackageSearch,
  Boxes,
  Warehouse,
  Truck,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { getStock } from "../api";

const colors = {
  navy: "#133454",
  blue: "#0b57d0",
  bg: "#f3f6fa",
  text: "#203246",
  muted: "#6b7c8f",
  card: "#ffffff",
  border: "#d9e2ec",
  soft: "#f8fafc",
  good: "#1f7a3d",
  bad: "#c62828",
  warn: "#b26a00",
  goodBg: "#edf8f1",
  goodBd: "#cfe8d7",
  badBg: "#fdf0f0",
  badBd: "#f3c7c7",
  warnBg: "#fff6e5",
  warnBd: "#f1ddb0",
  infoBg: "#eaf3ff",
  infoBd: "#cfe0ff",
};

const fmtCO = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatQty(n) {
  const x = Number(n || 0);
  return fmtCO.format(x);
}

function Chip({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#eef2f6", bd: "#dbe4ec", tx: colors.text },
    blue: { bg: colors.infoBg, bd: colors.infoBd, tx: colors.blue },
    green: { bg: colors.goodBg, bd: colors.goodBd, tx: colors.good },
    red: { bg: colors.badBg, bd: colors.badBd, tx: colors.bad },
    amber: { bg: colors.warnBg, bd: colors.warnBd, tx: colors.warn },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.tx,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function SummaryBox({ label, value, helper, icon, tone = "default" }) {
  const toneStyles = {
    default: { color: colors.navy, bg: "#f5f8fb", bd: "#dde5ee" },
    green: { color: colors.good, bg: colors.goodBg, bd: colors.goodBd },
    red: { color: colors.bad, bg: colors.badBg, bd: colors.badBd },
    amber: { color: colors.warn, bg: colors.warnBg, bd: colors.warnBd },
    blue: { color: colors.blue, bg: colors.infoBg, bd: colors.infoBd },
  };

  const Icon = icon;
  const t = toneStyles[tone] || toneStyles.default;

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: colors.muted,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: t.color,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        {helper ? (
          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            {helper}
          </div>
        ) : null}
      </div>

      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          background: t.bg,
          border: `1px solid ${t.bd}`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={t.color} />
      </div>
    </div>
  );
}

function DataBox({ label, value }) {
  return (
    <div
      style={{
        background: "#fbfcfe",
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: colors.muted,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: colors.text,
          fontWeight: 800,
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function FrescuraCard({ data }) {
  const stockActual = Number(data?.stock_actual || 0);
  const stockAlmacenado = Number(data?.stock_almacenado || 0);
  const stockEnTransito = Number(data?.stock_en_transito || 0);

  const diagnostico = useMemo(() => {
    if (!data) {
      return {
        label: "Sin consulta",
        tone: "neutral",
        text: "Consulta un material para analizar disponibilidad y condición operativa.",
      };
    }

    if (stockActual <= 0) {
      return {
        label: "Sin stock",
        tone: "red",
        text: "El material no presenta inventario disponible actualmente.",
      };
    }

    if (stockAlmacenado > 0 && stockEnTransito > 0) {
      return {
        label: "Reposición en curso",
        tone: "blue",
        text: "El material tiene stock disponible y adicionalmente cuenta con inventario en tránsito.",
      };
    }

    if (stockAlmacenado > 0) {
      return {
        label: "Disponible",
        tone: "green",
        text: "El material tiene inventario disponible en almacén para operación.",
      };
    }

    if (stockEnTransito > 0) {
      return {
        label: "Solo en tránsito",
        tone: "amber",
        text: "El material no está almacenado aún, pero existen unidades en tránsito.",
      };
    }

    return {
      label: "Sin visibilidad completa",
      tone: "neutral",
      text: "Se encontró información parcial del material.",
    };
  }, [data, stockActual, stockAlmacenado, stockEnTransito]);

  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${colors.border}`,
          background: colors.soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: colors.navy,
            }}
          >
            Frescura / condición operativa
          </div>
          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              marginTop: 4,
            }}
          >
            Vista ejecutiva del material con enfoque WMS.
          </div>
        </div>

        <Chip label={diagnostico.label} tone={diagnostico.tone} />
      </div>

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${
              diagnostico.tone === "green"
                ? colors.goodBd
                : diagnostico.tone === "red"
                ? colors.badBd
                : diagnostico.tone === "amber"
                ? colors.warnBd
                : colors.infoBd
            }`,
            background:
              diagnostico.tone === "green"
                ? colors.goodBg
                : diagnostico.tone === "red"
                ? colors.badBg
                : diagnostico.tone === "amber"
                ? colors.warnBg
                : colors.infoBg,
            padding: 14,
            color:
              diagnostico.tone === "green"
                ? colors.good
                : diagnostico.tone === "red"
                ? colors.bad
                : diagnostico.tone === "amber"
                ? colors.warn
                : colors.blue,
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {diagnostico.text}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <DataBox
            label="Nivel de cobertura"
            value={
              stockActual > 0
                ? stockAlmacenado > 0
                  ? "Cobertura inmediata"
                  : "Cobertura pendiente"
                : "Sin cobertura"
            }
          />
          <DataBox
            label="Condición logística"
            value={
              stockEnTransito > 0 && stockAlmacenado > 0
                ? "Mixta"
                : stockEnTransito > 0
                ? "En tránsito"
                : stockAlmacenado > 0
                ? "Almacenado"
                : "No disponible"
            }
          />
          <DataBox
            label="Frescura FEFO"
            value="Pendiente de backend por lote/vencimiento"
          />
          <DataBox
            label="Observación"
            value="Este módulo ya quedó preparado para mostrar lotes, vencimientos y alertas de rotación."
          />
        </div>
      </div>
    </div>
  );
}

export default function Stock() {
  const [codigo, setCodigo] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const consultar = async () => {
    const cod = codigo.trim();
    if (!cod) {
      setErr("Debes escribir un código de material.");
      setData(null);
      return;
    }

    setErr("");
    setData(null);
    setLoading(true);

    try {
      const r = await getStock(cod);
      setData(r);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  const totalStock = Number(data?.stock_actual || 0);
  const stockAlmacenado = Number(data?.stock_almacenado || 0);
  const stockTransito = Number(data?.stock_en_transito || 0);

  return (
    <div
      style={{
        background: colors.bg,
        minHeight: "100%",
        display: "grid",
        gap: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${colors.border}`,
            background: colors.soft,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                fontWeight: 900,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Stock
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.1,
                color: colors.navy,
              }}
            >
              Consulta de inventario y condición de material
            </div>

            <div
              style={{
                marginTop: 6,
                color: colors.muted,
                fontSize: 13,
              }}
            >
              Visualiza disponibilidad, almacenamiento, tránsito y preparación para análisis de frescura.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {loading && <Chip label="Consultando..." tone="amber" />}
            {!loading && data && <Chip label="Consulta OK" tone="green" />}
            {!loading && !data && !err && <Chip label="Modo consulta" tone="blue" />}
            {err && <Chip label="Error de consulta" tone="red" />}
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr auto auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  fontWeight: 800,
                  marginBottom: 6,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                }}
              >
                Código material
              </div>

              <div style={{ position: "relative" }}>
                <PackageSearch
                  size={16}
                  color={colors.muted}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <input
                  placeholder="Ej: 421516"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") consultar();
                  }}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px 0 36px",
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: "#fff",
                    fontWeight: 700,
                    color: colors.text,
                    outline: "none",
                    boxSizing: "border-box",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            <button
              onClick={consultar}
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid #0b57d0",
                background: "#0b57d0",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Search size={15} />
              Consultar
            </button>

            <button
              onClick={() => {
                setCodigo("");
                setData(null);
                setErr("");
                setLoading(false);
              }}
              style={{
                height: 42,
                padding: "0 16px",
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: "#fff",
                color: colors.text,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <RefreshCcw size={15} />
              Limpiar
            </button>
          </div>

          {err ? (
            <div
              style={{
                marginTop: 14,
                border: `1px solid ${colors.badBd}`,
                background: colors.badBg,
                color: colors.bad,
                borderRadius: 10,
                padding: 14,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryBox
          label="Stock total"
          value={formatQty(totalStock)}
          helper="Inventario total del material"
          icon={Boxes}
          tone="blue"
        />
        <SummaryBox
          label="Stock almacenado"
          value={formatQty(stockAlmacenado)}
          helper="Disponible físicamente en ubicación"
          icon={Warehouse}
          tone="green"
        />
        <SummaryBox
          label="En tránsito"
          value={formatQty(stockTransito)}
          helper="Pendiente por ubicar o recibir"
          icon={Truck}
          tone="amber"
        />
        <SummaryBox
          label="Condición"
          value={
            !data
              ? "-"
              : totalStock <= 0
              ? "Crítico"
              : stockAlmacenado > 0
              ? "Operativo"
              : "Pendiente"
          }
          helper="Estado ejecutivo del inventario"
          icon={totalStock > 0 ? ShieldCheck : AlertTriangle}
          tone={!data ? "default" : totalStock <= 0 ? "red" : "green"}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 14,
        }}
      >
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${colors.border}`,
              background: colors.soft,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: colors.navy,
              }}
            >
              Ficha de material
            </div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                marginTop: 4,
              }}
            >
              Datos base del código consultado.
            </div>
          </div>

          <div style={{ padding: 16 }}>
            {!data ? (
              <div
                style={{
                  border: `1px dashed ${colors.border}`,
                  background: "#fbfcfe",
                  borderRadius: 10,
                  padding: 18,
                  color: colors.muted,
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Consulta un material para visualizar su ficha operativa de stock.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                <DataBox label="Código" value={data.codigo} />
                <DataBox label="Unidad de medida" value={data.unidad_medida} />
                <DataBox label="Familia" value={data.familia} />
                <DataBox label="Descripción" value={data.descripcion} />
                <DataBox label="Stock actual" value={formatQty(data.stock_actual)} />
                <DataBox label="Stock almacenado" value={formatQty(data.stock_almacenado)} />
                <DataBox label="Stock en tránsito" value={formatQty(data.stock_en_transito)} />
                <DataBox
                  label="Balance operativo"
                  value={
                    Number(data.stock_actual || 0) > 0
                      ? "Con inventario"
                      : "Sin inventario"
                  }
                />
              </div>
            )}
          </div>
        </div>

        <FrescuraCard data={data} />
      </div>
    </div>
  );
}