// Exportación de "Materiales en tránsito" a Excel con el MISMO diseño del
// reporte de análisis de diferencias: logo embebido, colores institucionales,
// KPIs, agrupado por familia y subtotales. Usa ExcelJS.

const C = {
  navy: "FF1F2D5C",
  blue: "FF0B3D91",
  green: "FF1F7A3D",
  head: "FFF1F5FA",
  sub: "FFF8FAFC",
  border: "FFE6ECF3",
  muted: "FF8A97A8",
  white: "FFFFFFFF",
  kpiBg: "FFFBFDFF",
  rowAlt: "FFFBFCFE",
};

const MONEY = "#,##0.00";

const MAT = 2, DESC = 3, LOTEA = 4, LOTEP = 5, VENC = 6, CANT = 7;
const CL = MAT, CR = CANT, ROW0 = 3;

const thin = (color = C.border) => ({ style: "thin", color: { argb: color } });
const medium = (color) => ({ style: "medium", color: { argb: color } });

function outerBorder(ws, top, left, bottom, right, color) {
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const cell = ws.getCell(row, col);
      const b = { ...(cell.border || {}) };
      if (row === top) b.top = medium(color);
      if (row === bottom) b.bottom = medium(color);
      if (col === left) b.left = medium(color);
      if (col === right) b.right = medium(color);
      cell.border = b;
    }
  }
}

const d10 = (v) => String(v ?? "").slice(0, 10);

export async function exportarTransitoExcel({ rows = [] }) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default && mod.default.Workbook ? mod.default : mod;

  const byFam = new Map();
  rows.forEach((r) => {
    const f = String(r.familia || "(sin familia)").trim() || "(sin familia)";
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(r);
  });
  const familias = [...byFam.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalLotes = rows.length;
  const totalUnidades = rows.reduce((acc, r) => acc + Number(r.cantidad || 0), 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = "INOVA · Sistema WMS";
  wb.created = new Date();
  const ws = wb.addWorksheet("Materiales en tránsito", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 1, orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  ws.columns = [
    { width: 3 }, { width: 16 }, { width: 46 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 16 }, { width: 3 },
  ];
  ws.getRow(1).height = 8;
  ws.getRow(2).height = 8;

  const merge = (row) => ws.mergeCells(row, CL, row, CR);
  const ahora = new Date();
  const hoy = ahora.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  // Encabezado con logo
  let row = ROW0;
  ws.getRow(row).height = 34;
  ws.getRow(row + 1).height = 16;
  ws.getRow(row + 2).height = 16;
  try {
    const resp = await fetch("/inova-azul.png");
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      const imgId = wb.addImage({ buffer: buf, extension: "png" });
      ws.addImage(imgId, { tl: { col: CL - 1 + 0.05, row: ROW0 - 1 + 0.1 }, ext: { width: 150, height: 46 } });
    }
  } catch { /* sin logo */ }

  [
    [row, "Materiales en tránsito", { bold: true, color: C.navy, size: 11 }],
    [row + 1, `${hoy} · ${hora}`, { color: C.muted, size: 10 }],
    [row + 2, "Pendientes por ubicar", { color: C.muted, size: 10 }],
  ].forEach(([r, val, font]) => {
    ws.mergeCells(r, LOTEA, r, CR);
    const c = ws.getCell(r, LOTEA);
    c.value = val;
    c.font = font;
    c.alignment = { horizontal: "right", vertical: "middle" };
  });
  row += 3;
  for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { bottom: medium(C.navy) };
  row++;

  merge(row);
  const t = ws.getCell(row, CL);
  t.value = "Materiales en tránsito · pendientes por ubicar";
  t.font = { bold: true, size: 18, color: C.navy };
  ws.getRow(row).height = 26;
  row += 2;

  // KPIs (3)
  const drawKpi = (r0, label, value, color, c1, c2) => {
    ws.mergeCells(r0, c1, r0 + 1, c2);
    const cell = ws.getCell(r0, c1);
    cell.value = { richText: [
      { text: `${label}\n`, font: { size: 9, bold: true, color: { argb: C.muted } } },
      { text: `${value}`, font: { size: 20, bold: true, color: { argb: color } } },
    ] };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.kpiBg } };
    outerBorder(ws, r0, c1, r0 + 1, c2, C.border);
  };
  ws.getRow(row).height = 18;
  ws.getRow(row + 1).height = 20;
  drawKpi(row, "Lotes", totalLotes, C.navy, MAT, DESC);
  drawKpi(row, "Unidades", Number(totalUnidades).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), C.blue, LOTEA, LOTEP);
  drawKpi(row, "Familias", familias.length, C.green, VENC, CANT);
  row += 3;

  const headers = ["Material", "Descripción", "Lote almacén", "Lote proveedor", "Vencimiento", "Cantidad"];

  familias.forEach(([fam, items]) => {
    merge(row);
    const fh = ws.getCell(row, CL);
    fh.value = `${fam}    ·    ${items.length} lote(s)`;
    fh.font = { bold: true, size: 13, color: C.navy };
    fh.alignment = { vertical: "middle" };
    ws.getRow(row).height = 22;
    for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { bottom: medium(C.navy) };
    row++;

    const hRow = ws.getRow(row);
    headers.forEach((h, i) => {
      const cell = hRow.getCell(CL + i);
      cell.value = h.toUpperCase();
      cell.font = { bold: true, size: 9, color: { argb: "FF334155" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.head } };
      cell.alignment = { vertical: "middle", horizontal: i === 5 ? "right" : "left", indent: i === 5 ? 0 : 1 };
      cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    });
    hRow.height = 16;
    row++;

    let sub = 0;
    items.forEach((r, idx) => {
      sub += Number(r.cantidad || 0);
      const dr = ws.getRow(row);
      const alt = idx % 2 ? C.rowAlt : C.white;
      const cells = [
        { v: r.codigo_material || "", align: "left", bold: true, color: C.navy },
        { v: r.descripcion_material || "", align: "left", wrap: true },
        { v: r.lote_almacen || "", align: "left" },
        { v: r.lote_proveedor || "", align: "left" },
        { v: d10(r.fecha_vencimiento), align: "left" },
        { v: Number(r.cantidad || 0), align: "right", num: true, bold: true, color: C.green },
      ];
      cells.forEach((cfg, i) => {
        const cell = dr.getCell(CL + i);
        cell.value = cfg.v;
        if (cfg.num) cell.numFmt = MONEY;
        cell.font = { size: 10.5, bold: !!cfg.bold, color: { argb: cfg.color || "FF24384D" } };
        cell.alignment = { vertical: "middle", horizontal: cfg.align, indent: cfg.align === "left" ? 1 : 0, wrapText: !!cfg.wrap };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: alt } };
        cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
      });
      row++;
    });

    ws.mergeCells(row, MAT, row, VENC);
    const stl = ws.getCell(row, MAT);
    stl.value = "Subtotal";
    stl.font = { bold: true, size: 10.5, color: { argb: "FF334155" } };
    stl.alignment = { horizontal: "right", vertical: "middle" };
    stl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    const stv = ws.getCell(row, CANT);
    stv.value = sub;
    stv.numFmt = MONEY;
    stv.font = { bold: true, size: 10.5, color: { argb: C.green } };
    stv.alignment = { horizontal: "right", vertical: "middle" };
    stv.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    row += 2;
  });

  merge(row);
  const foot = ws.getCell(row, CL);
  foot.value = "Generado por INOVA · Sistema WMS · Materiales pendientes por ubicar";
  foot.font = { size: 9, color: C.muted, italic: true };
  foot.alignment = { horizontal: "center", vertical: "middle" };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Materiales en transito ${ahora.toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
