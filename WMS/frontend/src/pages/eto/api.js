import {
  deleteById,
  empresaId,
  insertRow,
  selectRows,
  supabaseEnabled,
  updateById,
} from "../../supabaseRest";

const API_URL =
  import.meta.env.VITE_ETO_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8001";

const ETO_TABLES = {
  processes: "processes",
  indicators: "indicators",
  "daily-records": "daily_records",
  entities: "entities",
  "entity-indicator-targets": "entity_indicator_targets",
  "entity-records": "entity_records",
};

const STATUS_ORDER = ["ok", "warning", "critical"];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function firstRow(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function toIsoDate(value) {
  return String(value || "").slice(0, 10);
}

function getMonthRange(year, month) {
  const y = Number(year);
  const m = Number(month);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = new Date(y, m, 0).toISOString().slice(0, 10);
  return { start, end, days: new Date(y, m, 0).getDate() };
}

function normalizeShiftsValue(value) {
  if (Array.isArray(value)) return value.join(",");
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseShifts(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function compareValue(value, operator, ruleValue) {
  const left = Number(value);
  const right = Number(ruleValue);
  if (!Number.isFinite(left) || !Number.isFinite(right) || !operator) return false;
  if (operator === ">") return left > right;
  if (operator === ">=") return left >= right;
  if (operator === "<") return left < right;
  if (operator === "<=") return left <= right;
  if (operator === "=" || operator === "==") return left === right;
  return false;
}

function measuredValue(indicator, row) {
  if (indicator?.capture_mode === "single" || indicator?.scope_type === "entity") {
    return Number(row.single_value  -  row.value  -  0);
  }

  const shifts = parseShifts(indicator?.shifts);
  const values = [
    shifts.includes("A") ? row.shift_a : null,
    shifts.includes("B") ? row.shift_b : null,
    shifts.includes("C") ? row.shift_c : null,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(Number)
    .filter(Number.isFinite);

  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function calculateGeneral(indicator, value) {
  const target = Number(indicator?.target_value  -  0);
  const current = Number(value  -  0);
  const operator = indicator?.target_operator || ">=";

  if (!Number.isFinite(current)) return 0;
  if (operator === "=" || operator === "==") {
    if (target === 0) return current === 0 ? 100 : 0;
    return Math.max(0, Math.min(100, 100 - (Math.abs(current - target) / Math.abs(target)) * 100));
  }

  if (operator === ">" || operator === ">=") {
    if (target === 0) return current >= 0 ? 100 : 0;
    return Math.max(0, Math.min(100, (current / target) * 100));
  }

  if (current <= target) return 100;
  if (target === 0) return 0;
  return Math.max(0, Math.min(100, (target / current) * 100));
}

function calculateStatus(indicator, general) {
  if (
    indicator?.critical_operator &&
    indicator?.critical_value !== null &&
    indicator?.critical_value !== undefined &&
    compareValue(general, indicator.critical_operator, indicator.critical_value)
  ) {
    return "critical";
  }

  if (
    indicator?.warning_operator &&
    indicator?.warning_value !== null &&
    indicator?.warning_value !== undefined &&
    compareValue(general, indicator.warning_operator, indicator.warning_value)
  ) {
    return "warning";
  }

  return "ok";
}

function normalizeIndicatorPayload(payload) {
  return {
    ...payload,
    process_id: Number(payload.process_id),
    meeting_level: Number(payload.meeting_level || 1),
    target_value: Number(payload.target_value || 0),
    warning_value: cleanOptionalNumber(payload.warning_value),
    critical_value: cleanOptionalNumber(payload.critical_value),
    shifts: normalizeShiftsValue(payload.shifts),
  };
}

async function supabaseRows(table, params = {}) {
  return selectRows("eto_digital", table, {
    empresa_id: `eq.${empresaId}`,
    ...params,
  });
}

async function upsertByMatch(table, match, payload) {
  const existing = await supabaseRows(table, {
    ...Object.fromEntries(
      Object.entries(match).map(([key, value]) => [key, `eq.${value}`])
    ),
    select: "id",
    limit: "1",
  });

  if (existing[0]?.id) {
    return firstRow(await updateById("eto_digital", table, existing[0].id, payload));
  }

  return firstRow(await insertRow("eto_digital", table, {
    ...payload,
    ...match,
    empresa_id: empresaId,
  }));
}

async function nextEntityCode() {
  const rows = await supabaseRows("entities", { select: "code", order: "id.desc", limit: "1" });
  const lastNumber = Number(String(rows[0]?.code || "").replace(/\D/g, "")) || 0;
  return `ENT-${String(lastNumber + 1).padStart(4, "0")}`;
}

async function getProcessMap() {
  const rows = await supabaseRows("processes", { select: "*" });
  return new Map(rows.map((item) => [Number(item.id), item]));
}

async function getIndicatorMap() {
  const [indicators, processMap] = await Promise.all([
    supabaseRows("indicators", { select: "*" }),
    getProcessMap(),
  ]);

  const enriched = indicators.map((item) => enrichIndicator(item, processMap));
  return new Map(enriched.map((item) => [Number(item.id), item]));
}

function enrichIndicator(item, processMap) {
  const process = processMap.get(Number(item.process_id)) || {};
  return {
    ...item,
    process_name: process.name || "",
    process_level: Number(process.level || item.meeting_level || 0),
    shifts: normalizeShiftsValue(item.shifts),
  };
}

function enrichDailyRecord(item, indicatorMap) {
  const indicator = indicatorMap.get(Number(item.indicator_id)) || {};
  return {
    ...item,
    indicator_code: indicator.code || "",
    indicator_name: indicator.name || "",
    process_id: Number(indicator.process_id || 0),
    process_name: indicator.process_name || "",
    meeting_level: Number(indicator.meeting_level || 0),
    unit: indicator.unit || "%",
    frequency: indicator.frequency || "day",
    capture_mode: indicator.capture_mode || "single",
    shifts: normalizeShiftsValue(indicator.shifts),
    scope_type: indicator.scope_type || "standard",
  };
}

function filterDateParams(params) {
  const year = params.get("year");
  const month = params.get("month");
  const day = params.get("day");
  if (!year) return {};
  if (month) {
    const { start, end } = getMonthRange(year, month);
    if (day) return { record_date: `eq.${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` };
    return { record_date: `gte.${start}`, and: `(record_date.lte.${end})` };
  }
  return { record_date: `gte.${year}-01-01`, and: `(record_date.lte.${year}-12-31)` };
}

function filterRowsByContext(rows, params, indicatorMap) {
  const level = params.get("level");
  const processId = params.get("process_id");
  const indicatorId = params.get("indicator_id");
  const day = params.get("day");

  return rows.filter((row) => {
    const indicator = indicatorMap.get(Number(row.indicator_id));
    if (!indicator) return false;
    if (level && Number(indicator.meeting_level) !== Number(level)) return false;
    if (processId && Number(indicator.process_id) !== Number(processId)) return false;
    if (indicatorId && Number(row.indicator_id) !== Number(indicatorId)) return false;
    if (day && Number(toIsoDate(row.record_date).slice(8, 10)) !== Number(day)) return false;
    return true;
  });
}

function buildSummary(rows) {
  const total = rows.length;
  const average = total
    ? rows.reduce((sum, row) => sum + Number(row.general || 0), 0) / total
    : 0;
  return {
    total_records: total,
    average_general: average,
    ok_count: rows.filter((row) => row.status === "ok").length,
    warning_count: rows.filter((row) => row.status === "warning").length,
    critical_count: rows.filter((row) => row.status === "critical").length,
  };
}

function statusDistribution(rows) {
  const summary = buildSummary(rows);
  return [
    { status: "ok", label: "OK", value: summary.ok_count },
    { status: "warning", label: "Warning", value: summary.warning_count },
    { status: "critical", label: "Critical", value: summary.critical_count },
  ];
}

async function listIndicatorsSupabase(params) {
  const processMap = await getProcessMap();
  const rows = await supabaseRows("indicators", mapEtoParams("indicators", params));
  return rows.map((item) => enrichIndicator(item, processMap));
}

async function listDailyRecordsSupabase(params) {
  const indicatorMap = await getIndicatorMap();
  const baseParams = {
    select: "*",
    order: "record_date.desc",
  };
  const dateParams = filterDateParams(params);
  const rows = await supabaseRows("daily_records", {
    ...baseParams,
    ...dateParams,
    ...(params.get("record_date") ? { record_date: `eq.${params.get("record_date")}` } : {}),
    ...(params.get("indicator_id") ? { indicator_id: `eq.${params.get("indicator_id")}` } : {}),
  });

  return filterRowsByContext(rows, params, indicatorMap).map((item) =>
    enrichDailyRecord(item, indicatorMap)
  );
}

async function monthMatrixSupabase(params) {
  const indicatorId = Number(params.get("indicator_id"));
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));
  const indicatorMap = await getIndicatorMap();
  const indicator = indicatorMap.get(indicatorId);
  if (!indicator) throw new Error("Indicador no encontrado");
  const { start, end, days } = getMonthRange(year, month);
  const existing = await supabaseRows("daily_records", {
    select: "*",
    indicator_id: `eq.${indicatorId}`,
    record_date: `gte.${start}`,
    and: `(record_date.lte.${end})`,
  });
  const byDate = new Map(existing.map((row) => [toIsoDate(row.record_date), row]));
  return {
    indicator_id: indicatorId,
    indicator_code: indicator.code,
    indicator_name: indicator.name,
    process_name: indicator.process_name,
    unit: indicator.unit,
    frequency: indicator.frequency,
    capture_mode: indicator.capture_mode,
    shifts: normalizeShiftsValue(indicator.shifts),
    rows: Array.from({ length: days }, (_, index) => {
      const recordDate = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
      return {
        record_date: recordDate,
        ...(byDate.get(recordDate) || {}),
      };
    }),
  };
}

async function saveMonthMatrixSupabase(body) {
  const indicatorMap = await getIndicatorMap();
  const indicator = indicatorMap.get(Number(body.indicator_id));
  if (!indicator) throw new Error("Indicador no encontrado");

  const saved = [];
  for (const row of body.rows || []) {
    const cleanRow = {
      single_value: row.single_value === "" ? null : row.single_value,
      shift_a: row.shift_a === "" ? null : row.shift_a,
      shift_b: row.shift_b === "" ? null : row.shift_b,
      shift_c: row.shift_c === "" ? null : row.shift_c,
      observation: row.observation || "",
    };
    const value = measuredValue(indicator, cleanRow);
    const general = calculateGeneral(indicator, value);
    saved.push(
      await upsertByMatch(
        "daily_records",
        { indicator_id: Number(body.indicator_id), record_date: row.record_date },
        {
          ...cleanRow,
          general,
          status: calculateStatus(indicator, general),
        }
      )
    );
  }
  return saved;
}

async function entityTargetsSupabase(params) {
  const [targets, indicators, entities] = await Promise.all([
    supabaseRows("entity_indicator_targets", mapEtoParams("entity-indicator-targets", params)),
    listIndicatorsSupabase(new URLSearchParams()),
    supabaseRows("entities", { select: "*" }),
  ]);
  const indicatorMap = new Map(indicators.map((item) => [Number(item.id), item]));
  const entityMap = new Map(entities.map((item) => [Number(item.id), item]));
  return targets.map((item) => {
    const indicator = indicatorMap.get(Number(item.indicator_id)) || {};
    const entity = entityMap.get(Number(item.entity_id)) || {};
    return {
      ...item,
      indicator_code: indicator.code || "",
      indicator_name: indicator.name || "",
      entity_code: entity.code || "",
      entity_name: entity.name || "",
      entity_type: entity.entity_type || "",
    };
  });
}

async function entityRecordsSupabase(params) {
  const [records, indicators, entities] = await Promise.all([
    supabaseRows("entity_records", {
      select: "*",
      order: "record_date.desc",
      ...(params.get("indicator_id") ? { indicator_id: `eq.${params.get("indicator_id")}` } : {}),
      ...(params.get("entity_id") ? { entity_id: `eq.${params.get("entity_id")}` } : {}),
      ...filterDateParams(params),
    }),
    listIndicatorsSupabase(new URLSearchParams()),
    supabaseRows("entities", { select: "*" }),
  ]);
  const indicatorMap = new Map(indicators.map((item) => [Number(item.id), item]));
  const entityMap = new Map(entities.map((item) => [Number(item.id), item]));
  return records.map((item) => {
    const indicator = indicatorMap.get(Number(item.indicator_id)) || {};
    const entity = entityMap.get(Number(item.entity_id)) || {};
    return {
      ...item,
      indicator_code: indicator.code || "",
      indicator_name: indicator.name || "",
      entity_code: entity.code || "",
      entity_name: entity.name || "",
      entity_type: entity.entity_type || "",
    };
  });
}

async function entityCaptureGridSupabase(params) {
  const indicatorId = Number(params.get("indicator_id"));
  const recordDate = params.get("record_date");
  const indicatorMap = await getIndicatorMap();
  const indicator = indicatorMap.get(indicatorId);
  if (!indicator) throw new Error("Indicador no encontrado");

  const [targets, records] = await Promise.all([
    entityTargetsSupabase(new URLSearchParams({ indicator_id: String(indicatorId), active_only: "true" })),
    entityRecordsSupabase(new URLSearchParams({ indicator_id: String(indicatorId) })),
  ]);

  const recordMap = new Map(
    records
      .filter((item) => toIsoDate(item.record_date) === recordDate)
      .map((item) => [Number(item.entity_id), item])
  );

  return {
    indicator_id: indicatorId,
    indicator_code: indicator.code,
    indicator_name: indicator.name,
    process_id: indicator.process_id,
    process_name: indicator.process_name,
    meeting_level: indicator.meeting_level,
    unit: indicator.unit,
    frequency: indicator.frequency,
    scope_type: indicator.scope_type,
    record_date: recordDate,
    rows: targets.map((target) => {
      const record = recordMap.get(Number(target.entity_id)) || {};
      const value = Number(record.value || 0);
      const targetValue = Number(target.target_value || indicator.target_value || 0);
      const compliance = calculateGeneral({ ...indicator, target_value: targetValue }, value);
      return {
        entity_id: Number(target.entity_id),
        entity_code: target.entity_code,
        entity_name: target.entity_name,
        entity_type: target.entity_type,
        target_value: targetValue,
        day_value: value,
        accumulated: value,
        remaining: Math.max(0, targetValue - value),
        compliance,
        status: calculateStatus(indicator, compliance),
        observation: record.observation || "",
      };
    }),
  };
}

async function saveEntityGridSupabase(body) {
  const saved = [];
  for (const row of body.rows || []) {
    saved.push(
      await upsertByMatch(
        "entity_records",
        {
          indicator_id: Number(body.indicator_id),
          entity_id: Number(row.entity_id),
          record_date: body.record_date,
        },
        {
          value: row.value === "" || row.value === null || row.value === undefined ? 0 : Number(row.value),
          observation: row.observation || "",
        }
      )
    );
  }
  return saved;
}

async function historySupabase(params) {
  return listDailyRecordsSupabase(params);
}

async function historySummarySupabase(params) {
  return buildSummary(await historySupabase(params));
}

async function dashboardOverviewSupabase(params) {
  const rows = await historySupabase(params);
  const processes = await supabaseRows("processes", {
    select: "*",
    ...(params.get("level") ? { level: `eq.${params.get("level")}` } : {}),
    order: "id.asc",
  });
  const summary = buildSummary(rows);
  return {
    summary,
    status_distribution: statusDistribution(rows),
    process_cards: processes.map((process) => {
      const processRows = rows.filter((row) => Number(row.process_id) === Number(process.id));
      return {
        process_id: process.id,
        process_name: process.name,
        process_level: process.level,
        total_records: processRows.length,
        average_general: buildSummary(processRows).average_general,
        status: processRows.some((row) => row.status === "critical")
          ? "critical"
          : processRows.some((row) => row.status === "warning")
            ? "warning"
            : "ok",
      };
    }),
    process_ranking: processes.map((process) => {
      const processRows = rows.filter((row) => Number(row.process_id) === Number(process.id));
      return {
        process_id: process.id,
        process_name: process.name,
        average_general: buildSummary(processRows).average_general,
        total_records: processRows.length,
        status: processRows.some((row) => row.status === "critical") ? "critical" : "ok",
      };
    }),
  };
}

async function processDashboardSupabase(params) {
  const processId = Number(params.get("process_id"));
  const [processes, indicators, rows] = await Promise.all([
    supabaseRows("processes", { id: `eq.${processId}`, select: "*", limit: "1" }),
    listIndicatorsSupabase(new URLSearchParams({ process_id: String(processId) })),
    historySupabase(params),
  ]);
  const process = processes[0] || {};
  const summary = buildSummary(rows);
  return {
    process,
    summary,
    status_distribution: statusDistribution(rows),
    trend: rows
      .slice()
      .sort((a, b) => toIsoDate(a.record_date).localeCompare(toIsoDate(b.record_date)))
      .map((row) => ({
        date: toIsoDate(row.record_date),
        record_date: toIsoDate(row.record_date),
        value: Number(row.general || 0),
        status: row.status,
      })),
    indicator_cards: indicators.map((indicator) => {
      const indicatorRows = rows.filter((row) => Number(row.indicator_id) === Number(indicator.id));
      return {
        ...indicator,
        summary: buildSummary(indicatorRows),
        average_general: buildSummary(indicatorRows).average_general,
        total_records: indicatorRows.length,
      };
    }),
    indicator_trends: indicators.map((indicator) => ({
      ...indicator,
      trend: rows
        .filter((row) => Number(row.indicator_id) === Number(indicator.id))
        .map((row) => ({ date: toIsoDate(row.record_date), value: Number(row.general || 0), status: row.status })),
    })),
  };
}

async function entityDashboardSupabase(params) {
  const indicatorId = Number(params.get("indicator_id"));
  const records = await entityRecordsSupabase(params);
  const indicatorMap = await getIndicatorMap();
  const indicator = indicatorMap.get(indicatorId) || {};
  const targets = await entityTargetsSupabase(new URLSearchParams({ indicator_id: String(indicatorId), active_only: "true" }));
  const targetMap = new Map(targets.map((item) => [Number(item.entity_id), Number(item.target_value || 0)]));
  const ranking = records.map((record) => {
    const targetValue = targetMap.get(Number(record.entity_id))  -  Number(indicator.target_value || 0);
    const general = calculateGeneral({ ...indicator, target_value: targetValue }, Number(record.value || 0));
    return {
      ...record,
      target_value: targetValue,
      general,
      estado: calculateStatus(indicator, general),
    };
  });
  return {
    indicator_id: indicatorId,
    indicator_code: indicator.code,
    indicator_name: indicator.name,
    period_label: `${params.get("year") || ""}-${String(params.get("month") || "").padStart(2, "0")}`,
    summary: {
      total_entities: targets.length,
      total_records: ranking.length,
      average_general: buildSummary(ranking).average_general,
      ok_count: ranking.filter((item) => item.estado === "ok").length,
      warning_count: ranking.filter((item) => item.estado === "warning").length,
      critical_count: ranking.filter((item) => item.estado === "critical").length,
    },
    ranking,
  };
}

function mapEtoParams(resource, searchParams) {
  const params = {
    empresa_id: `eq.${empresaId}`,
    select: "*",
  };

  searchParams.forEach((value, key) => {
    if (key === "level" && resource === "indicators") {
      params.meeting_level = `eq.${value}`;
    } else if (key === "level" && resource === "processes") {
      params.level = `eq.${value}`;
    } else if (["process_id", "indicator_id", "entity_id", "year", "month"].includes(key)) {
      params[key] = `eq.${value}`;
    } else if (key === "record_date") {
      params.record_date = `eq.${value}`;
    } else if (key === "active_only") {
      params.is_active = "eq.true";
    } else if (key === "entity_type" || key === "scope_type") {
      params[key] = `eq.${value}`;
    }
  });

  if (resource === "processes") params.order = "id.asc";
  if (resource === "indicators") params.order = "name.asc";
  if (resource === "entities") params.order = "name.asc";
  if (resource === "daily-records" || resource === "entity-records") params.order = "record_date.desc";

  return params;
}

async function requestSupabase(path, options = {}) {
  const parsed = new URL(path, "http://local");
  const parts = parsed.pathname.replace(/^\/+/, "").split("/");
  const resource = parts[0];
  const id = parts[1];
  const table = ETO_TABLES[resource];

  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : undefined;

  if (method === "GET" && resource === "history" && id === "summary") {
    return historySummarySupabase(parsed.searchParams);
  }

  if (method === "GET" && resource === "history") {
    return historySupabase(parsed.searchParams);
  }

  if (method === "GET" && resource === "dashboard" && id === "overview") {
    return dashboardOverviewSupabase(parsed.searchParams);
  }

  if (method === "GET" && resource === "dashboard" && id === "process") {
    return processDashboardSupabase(parsed.searchParams);
  }

  if (method === "GET" && resource === "dashboard" && id === "entity") {
    return entityDashboardSupabase(parsed.searchParams);
  }

  if (method === "GET" && resource === "daily-records" && id === "by-date") {
    return listDailyRecordsSupabase(parsed.searchParams);
  }

  if (method === "GET" && resource === "daily-records" && id === "month") {
    return monthMatrixSupabase(parsed.searchParams);
  }

  if (method === "POST" && resource === "daily-records" && id === "month") {
    return saveMonthMatrixSupabase(body);
  }

  if (method === "GET" && resource === "entity-records" && id === "grid") {
    return entityCaptureGridSupabase(parsed.searchParams);
  }

  if (method === "POST" && resource === "entity-records" && id === "bulk") {
    return saveEntityGridSupabase(body);
  }

  if (!table) return null;

  if (method === "GET") {
    if (id && /^\d+$/.test(String(id))) {
      const rows = await selectRows("eto_digital", table, {
        empresa_id: `eq.${empresaId}`,
        id: `eq.${id}`,
        select: "*",
        limit: "1",
      });
      return rows[0] || null;
    }

    if (resource === "indicators") {
      return listIndicatorsSupabase(parsed.searchParams);
    }

    if (resource === "daily-records") {
      return listDailyRecordsSupabase(parsed.searchParams);
    }

    if (resource === "entity-indicator-targets") {
      return entityTargetsSupabase(parsed.searchParams);
    }

    if (resource === "entity-records") {
      return entityRecordsSupabase(parsed.searchParams);
    }

    return selectRows("eto_digital", table, mapEtoParams(resource, parsed.searchParams));
  }

  if (method === "POST") {
    if (resource === "indicators") {
      return firstRow(await insertRow("eto_digital", table, {
        ...normalizeIndicatorPayload(body),
        empresa_id: empresaId,
      }));
    }

    if (resource === "daily-records") {
      const indicatorMap = await getIndicatorMap();
      const indicator = indicatorMap.get(Number(body.indicator_id));
      const value = measuredValue(indicator, body);
      const general = calculateGeneral(indicator, value);
      return upsertByMatch(
        "daily_records",
        { indicator_id: Number(body.indicator_id), record_date: body.record_date },
        {
          ...body,
          general,
          status: calculateStatus(indicator, general),
        }
      );
    }

    if (resource === "entity-indicator-targets") {
      return upsertByMatch(
        "entity_indicator_targets",
        { indicator_id: Number(body.indicator_id), entity_id: Number(body.entity_id) },
        {
          target_value: Number(body.target_value || 0),
          is_active: body.is_active  -  true,
        }
      );
    }

    if (resource === "entities") {
      return firstRow(await insertRow("eto_digital", table, {
        ...body,
        code: String(body.code || "").trim() || await nextEntityCode(),
        document: body.document || null,
        empresa_id: empresaId,
      }));
    }

    return firstRow(await insertRow("eto_digital", table, { ...body, empresa_id: empresaId }));
  }

  if ((method === "PUT" || method === "PATCH") && id) {
    if (resource === "indicators") {
      return firstRow(await updateById("eto_digital", table, id, normalizeIndicatorPayload(body)));
    }

    if (resource === "daily-records") {
      const indicatorMap = await getIndicatorMap();
      const indicator = indicatorMap.get(Number(body.indicator_id));
      const value = measuredValue(indicator, body);
      const general = calculateGeneral(indicator, value);
      return firstRow(await updateById("eto_digital", table, id, {
        ...body,
        general,
        status: calculateStatus(indicator, general),
      }));
    }

    return firstRow(await updateById("eto_digital", table, id, body));
  }

  if (method === "DELETE" && id) {
    return deleteById("eto_digital", table, id);
  }

  return null;
}

async function request(path, options = {}) {
  if (supabaseEnabled) {
    const supabaseResult = await requestSupabase(path, options);
    if (supabaseResult !== null) return supabaseResult;
  }

  const url = `${API_URL}${path}`;

  const headers = {
    ...(options.headers || {}),
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  let res;

  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("Error de conexión API:", url, error);
    throw new Error(`No se pudo conectar con el servidor: ${url}`);
  }

  if (!res.ok) {
    let message = "Error en la solicitud";

    try {
      const data = await res.json();

      if (Array.isArray(data.detail)) {
        message = data.detail
          .map((item) => {
            const campo = Array.isArray(item.loc)
              ? item.loc.join(".")
              : "campo";
            return `${campo}: ${item.msg}`;
          })
          .join(" | ");
      } else {
        message = data.detail || data.message || message;
      }
    } catch {
      //
    }

    console.error("Error API:", {
      url,
      status: res.status,
      message,
    });

    throw new Error(`${message} (${res.status})`);
  }

  if (res.status === 204) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(typeof value === "boolean" && value === false)
    ) {
      query.append(key, value);
    }
  });

  return query.toString();
}

function cleanOptionalOperator(value) {
  if (value === null || value === undefined) return null;

  const clean = String(value).trim();

  if (
    clean === "" ||
    clean === "-" ||
    clean.toLowerCase() === "opcional" ||
    clean.toLowerCase() === "none" ||
    clean.toLowerCase() === "null" ||
    clean.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return clean;
}

function cleanOptionalNumber(value) {
  if (value === null || value === undefined) return null;

  const clean = String(value).trim();

  if (
    clean === "" ||
    clean === "-" ||
    clean.toLowerCase() === "opcional" ||
    clean.toLowerCase() === "none" ||
    clean.toLowerCase() === "null" ||
    clean.toLowerCase() === "undefined"
  ) {
    return null;
  }

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildIndicatorPayload(payload) {
  const scopeType = payload.scope_type || "standard";
  const captureMode =
    scopeType === "entity" ? "single" : payload.capture_mode || "single";

  const warningOperator = cleanOptionalOperator(payload.warning_operator);
  const warningValue = cleanOptionalNumber(payload.warning_value);

  const criticalOperator = cleanOptionalOperator(payload.critical_operator);
  const criticalValue = cleanOptionalNumber(payload.critical_value);

  const hasWarning = warningOperator !== null && warningValue !== null;
  const hasCritical = criticalOperator !== null && criticalValue !== null;

  return {
    ...payload,

    process_id: Number(payload.process_id),
    meeting_level: Number(payload.meeting_level || 2),
    target_value: Number(payload.target_value),

    use_warning: hasWarning,
    warning_operator: hasWarning ? warningOperator : null,
    warning_value: hasWarning ? warningValue : null,

    use_critical: hasCritical,
    critical_operator: hasCritical ? criticalOperator : null,
    critical_value: hasCritical ? criticalValue : null,

    scope_type: scopeType,
    capture_mode: captureMode,
    shifts:
      scopeType === "entity" || captureMode === "single"
        ? []
        : payload.shifts || [],
  };
}

const API = {
  // =========================
  // PROCESOS
  // =========================
  getProcesses: (level) =>
    request(`/processes${level ? `?level=${level}` : ""}`),

  createProcess: (payload) =>
    request("/processes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateProcess: (id, payload) =>
    request(`/processes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteProcess: (id) =>
    request(`/processes/${id}`, {
      method: "DELETE",
    }),

  // =========================
  // INDICADORES
  // =========================
  getIndicators: (params = {}) => {
    const q = buildQuery({
      process_id: params.process_id,
      level: params.level,
      scope_type: params.scope_type,
    });

    return request(`/indicators${q ? `?${q}` : ""}`);
  },

  createIndicator: (payload) =>
    request("/indicators", {
      method: "POST",
      body: JSON.stringify(buildIndicatorPayload(payload)),
    }),

  updateIndicator: (id, payload) =>
    request(`/indicators/${id}`, {
      method: "PUT",
      body: JSON.stringify(buildIndicatorPayload(payload)),
    }),

  deleteIndicator: (id) =>
    request(`/indicators/${id}`, {
      method: "DELETE",
    }),

  // =========================
  // CAPTURA DIARIA ESTÁNDAR
  // =========================
  saveDailyRecord: (payload) =>
    request("/daily-records", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateDailyRecord: (id, payload) =>
    request(`/daily-records/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteDailyRecord: (id) =>
    request(`/daily-records/${id}`, {
      method: "DELETE",
    }),

  getDailyByDate: ({ record_date, process_id, level }) => {
    const q = buildQuery({
      record_date,
      process_id,
      level,
    });

    return request(`/daily-records/by-date?${q}`);
  },

  // =========================
  // MATRIZ / CARGA MASIVA ESTÁNDAR
  // =========================
  getMonthMatrix: ({ indicator_id, year, month }) => {
    const q = buildQuery({
      indicator_id,
      year,
      month,
    });

    return request(`/daily-records/month?${q}`);
  },

  saveMonthMatrix: ({ indicator_id, rows }) =>
    request("/daily-records/month", {
      method: "POST",
      body: JSON.stringify({
        indicator_id,
        rows,
      }),
    }),

  getPeriodMatrix: ({ indicator_id, year, month }) =>
    API.getMonthMatrix({ indicator_id, year, month }),

  savePeriodMatrix: ({ indicator_id, rows }) =>
    API.saveMonthMatrix({ indicator_id, rows }),

  // =========================
  // ENTIDADES
  // =========================
  getEntities: ({ active_only, entity_type } = {}) => {
    const q = buildQuery({
      active_only: active_only ? "true" : undefined,
      entity_type,
    });

    return request(`/entities${q ? `?${q}` : ""}`);
  },

  createEntity: (payload) =>
    request("/entities", {
      method: "POST",
      body: JSON.stringify({
        code: payload.code || "",
        name: payload.name || payload.full_name || "",
        entity_type: payload.entity_type || "persona",
        document: payload.document || null,
        position: payload.position || null,
        area: payload.area || null,
        is_active: payload.is_active  -  true,
      }),
    }),

  updateEntity: (id, payload) =>
    request(`/entities/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        code: payload.code || "",
        name: payload.name || payload.full_name || "",
        entity_type: payload.entity_type || "persona",
        document: payload.document || null,
        position: payload.position || null,
        area: payload.area || null,
        is_active: payload.is_active  -  true,
      }),
    }),

  deleteEntity: (id) =>
    request(`/entities/${id}`, {
      method: "DELETE",
    }),

  // =========================
  // METAS POR ENTIDAD
  // =========================
  getEntityTargets: ({ indicator_id, entity_id, active_only } = {}) => {
    const q = buildQuery({
      indicator_id,
      entity_id,
      active_only: active_only ? "true" : undefined,
    });

    return request(`/entity-indicator-targets${q ? `?${q}` : ""}`);
  },

  createOrUpdateEntityTarget: (payload) =>
    request("/entity-indicator-targets", {
      method: "POST",
      body: JSON.stringify({
        indicator_id: Number(payload.indicator_id),
        entity_id: Number(payload.entity_id),
        target_value: Number(payload.target_value),
        is_active: payload.is_active  -  true,
      }),
    }),

  deleteEntityTarget: (id) =>
    request(`/entity-indicator-targets/${id}`, {
      method: "DELETE",
    }),

  // =========================
  // CAPTURA POR ENTIDAD
  // =========================
  getEntityCaptureGrid: ({ indicator_id, record_date }) => {
    const q = buildQuery({
      indicator_id,
      record_date,
    });

    return request(`/entity-records/grid?${q}`);
  },

  saveEntityGrid: ({ indicator_id, record_date, rows }) =>
    request("/entity-records/bulk", {
      method: "POST",
      body: JSON.stringify({
        indicator_id: Number(indicator_id),
        record_date,
        rows: (rows || []).map((row) => ({
          entity_id: Number(row.entity_id),
          value:
            row.value === "" || row.value === null || row.value === undefined
              ? 0
              : Number(row.value),
          observation: row.observation || "",
        })),
      }),
    }),

  getEntityRecords: ({ indicator_id, entity_id, year, month } = {}) => {
    const q = buildQuery({
      indicator_id,
      entity_id,
      year,
      month,
    });

    return request(`/entity-records${q ? `?${q}` : ""}`);
  },

  // =========================
  // HISTÓRICO ESTÁNDAR
  // =========================
  getHistory: ({ year, month, day, level, process_id, indicator_id }) => {
    const q = buildQuery({
      year,
      month,
      day,
      level,
      process_id,
      indicator_id,
    });

    return request(`/history${q ? `?${q}` : ""}`);
  },

  getHistorySummary: ({
    year,
    month,
    day,
    level,
    process_id,
    indicator_id,
  }) => {
    const q = buildQuery({
      year,
      month,
      day,
      level,
      process_id,
      indicator_id,
    });

    return request(`/history/summary${q ? `?${q}` : ""}`);
  },

  // =========================
  // DASHBOARD
  // =========================
  getDashboardOverview: ({ year, month, day, level }) => {
    const q = buildQuery({
      year,
      month,
      day,
      level,
    });

    return request(`/dashboard/overview${q ? `?${q}` : ""}`);
  },

  getProcessDashboard: ({
    process_id,
    indicator_id,
    year,
    month,
    day,
    level,
    period,
  }) => {
    const q = buildQuery({
      process_id,
      indicator_id,
      year,
      month,
      day,
      level,
      period,
    });

    return request(`/dashboard/process?${q}`);
  },

  getEntityDashboard: ({ indicator_id, year, month }) => {
    const q = buildQuery({
      indicator_id,
      year,
      month,
    });

    return request(`/dashboard/entity?${q}`);
  },

  // =========================
  // COMPATIBILIDAD CON FRONTEND VIEJO
  // =========================
  getPersons: ({ active_only } = {}) =>
    API.getEntities({ active_only, entity_type: "persona" }),

  createPerson: (payload) =>
    API.createEntity({
      code: payload.code,
      name: payload.full_name || payload.name,
      entity_type: "persona",
      is_active: payload.is_active,
    }),

  updatePerson: (id, payload) =>
    API.updateEntity(id, {
      code: payload.code,
      name: payload.full_name || payload.name,
      entity_type: "persona",
      is_active: payload.is_active,
    }),

  deletePerson: (id) => API.deleteEntity(id),

  getPersonTargets: ({ indicator_id, person_id, active_only } = {}) =>
    API.getEntityTargets({
      indicator_id,
      entity_id: person_id,
      active_only,
    }),

  createOrUpdatePersonTarget: (payload) =>
    API.createOrUpdateEntityTarget({
      indicator_id: payload.indicator_id,
      entity_id: payload.person_id  -  payload.entity_id,
      target_value: payload.target_value,
      is_active: payload.is_active,
    }),

  deletePersonTarget: (id) => API.deleteEntityTarget(id),

  getPersonCaptureGrid: ({ indicator_id, record_date }) =>
    API.getEntityCaptureGrid({ indicator_id, record_date }),

  savePersonGrid: ({ indicator_id, record_date, rows }) =>
    API.saveEntityGrid({
      indicator_id,
      record_date,
      rows: (rows || []).map((row) => ({
        entity_id: row.person_id  -  row.entity_id,
        value: row.value,
        observation: row.observation,
      })),
    }),

  getPersonRecords: ({ indicator_id, person_id, year, month } = {}) =>
    API.getEntityRecords({
      indicator_id,
      entity_id: person_id,
      year,
      month,
    }),

  getPersonDashboard: ({ indicator_id, year, month }) =>
    API.getEntityDashboard({
      indicator_id,
      year,
      month,
    }),
};

export { API_URL };
export default API;
