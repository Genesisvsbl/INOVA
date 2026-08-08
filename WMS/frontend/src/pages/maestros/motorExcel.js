// Exportación del Motor Principal a Excel con el diseño del reporte (logo,
// colores, KPIs) pero en UNA sola tabla (sin agrupar por familia). Incluye
// columna Familia y colorea la cantidad: entradas en verde, salidas en rojo.

const C = {
  navy: "FF1F2D5C",
  blue: "FF0B3D91",
  green: "FF1F7A3D",
  red: "FFDC2626",
  head: "FFF1F5FA",
  sub: "FFF8FAFC",
  border: "FFE6ECF3",
  muted: "FF8A97A8",
  white: "FFFFFFFF",
  kpiBg: "FFFBFDFF",
  rowAlt: "FFFBFCFE",
};
const MONEY = "#,##0.00";

const thin = (color = C.border) => ({ style: "thin", color: { argb: color } });
const medium = (color) => ({ style: "medium", color: { argb: color } });
const d10 = (v) => String(v ?? "").slice(0, 10);

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

// Verde si es entrada, rojo si es salida.
function colorCantidad(r) {
  const tipo = String(r.tipo || "").toUpperCase();
  if (tipo === "SALIDA") return C.red;
  if (tipo === "ENTRADA") return C.green;
  return Number(r.cantidad || 0) < 0 ? C.red : C.green;
}

// modo: "STOCK" | "MOV"
export async function exportarMotorExcel({ rows = [], modo = "MOV" }) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default && mod.default.Workbook ? mod.default : mod;

  const cols =
    modo === "STOCK"
      ? [
          { k: "codigo_material", l: "Material", w: 16, bold: true, color: C.navy },
          { k: "descripcion_material", l: "Descripción", w: 40, wrap: true },
          { k: "familia", l: "Familia", w: 15 },
          { k: "ubicacion", l: "Ubicación", w: 16 },
          { k: "lote_almacen", l: "Lote almacén", w: 18 },
          { k: "lote_proveedor", l: "Lote proveedor", w: 18 },
          { k: "fecha_vencimiento", l: "Vencimiento", w: 14, date: true },
          { k: "stock", l: "Stock", w: 14, num: true, total: true, align: "right", bold: true, color: C.green },
        ]
      : [
          { k: "codigo_material", l: "Material", w: 15, bold: true, color: C.navy },
          { k: "descripcion_material", l: "Descripción", w: 32, wrap: true },
          { k: "familia", l: "Familia", w: 14 },
          { k: "estado", l: "Estado", w: 12 },
          { k: "ubicacion", l: "Ubicación", w: 14 },
          { k: "lote_almacen", l: "Lote almacén", w: 16 },
          { k: "lote_proveedor", l: "Lote proveedor", w: 16 },
          { k: "fecha_vencimiento", l: "Vencimiento", w: 13, date: true },
          { k: "cantidad", l: "Cantidad", w: 14, num: true, total: true, align: "right", bold: true, colorByTipo: true },
        ];

  const totalKey = (cols.find((c) => c.total) || {}).k;
  const CL = 2, CR = 1 + cols.length, ROW0 = 3;
  const merge = (r) => ws.mergeCells(r, CL, r, CR);

  const totalReg = rows.length;
  const totalVal = rows.reduce((acc, r) => acc + Number(r[totalKey] || 0), 0);
  const familiasCount = new Set(rows.map((r) => String(r.familia || "").trim()).filter(Boolean)).size;

  const wb = new ExcelJS.Workbook();
  wb.creator = "INOVA · Sistema WMS";
  wb.created = new Date();
  const ws = wb.addWorksheet(modo === "STOCK" ? "Stock" : "Movimientos", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 1, orientation: "landscape", fitToPage: true, fitToWidth: 1, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  ws.columns = [{ width: 3 }, ...cols.map((c) => ({ width: c.w })), { width: 3 }];
  ws.getRow(1).height = 8;
  ws.getRow(2).height = 8;

  const ahora = new Date();
  const hoy = ahora.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  const tituloTxt = modo === "STOCK" ? "Motor principal · Stock por ubicación" : "Motor principal · Movimientos";

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

  const metaCol = Math.max(CL, CR - 2);
  [
    [row, "Reporte Motor Principal", { bold: true, color: C.navy, size: 11 }],
    [row + 1, `${hoy} · ${hora}`, { color: C.muted, size: 10 }],
    [row + 2, modo === "STOCK" ? "Stock disponible" : "Movimientos registrados", { color: C.muted, size: 10 }],
  ].forEach(([r, val, font]) => {
    ws.mergeCells(r, metaCol, r, CR);
    const c = ws.getCell(r, metaCol);
    c.value = val;
    c.font = font;
    c.alignment = { horizontal: "right", vertical: "middle" };
  });
  row += 3;
  for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { bottom: medium(C.navy) };
  row++;

  merge(row);
  const t = ws.getCell(row, CL);
  t.value = tituloTxt;
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
  const third = Math.max(1, Math.floor((CR - CL + 1) / 3));
  ws.getRow(row).height = 18;
  ws.getRow(row + 1).height = 20;
  drawKpi(row, "Registros", totalReg, C.navy, CL, CL + third - 1);
  drawKpi(row, modo === "STOCK" ? "Stock total" : "Cantidad total", Number(totalVal).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), C.blue, CL + third, CL + 2 * third - 1);
  drawKpi(row, "Familias", familiasCount, C.green, CL + 2 * third, CR);
  row += 3;

  // Encabezado de tabla (una sola tabla)
  const hRow = ws.getRow(row);
  cols.forEach((c, i) => {
    const cell = hRow.getCell(CL + i);
    cell.value = c.l.toUpperCase();
    cell.font = { bold: true, size: 9, color: { argb: "FF334155" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.head } };
    cell.alignment = { vertical: "middle", horizontal: c.align === "right" ? "right" : "left", indent: c.align === "right" ? 0 : 1 };
    cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
  });
  hRow.height = 16;
  row++;

  rows.forEach((r, idx) => {
    const dr = ws.getRow(row);
    const alt = idx % 2 ? C.rowAlt : C.white;
    cols.forEach((c, i) => {
      const cell = dr.getCell(CL + i);
      const raw = c.date ? d10(r[c.k]) : c.num ? Number(r[c.k] || 0) : (r[c.k] ?? "");
      cell.value = raw;
      if (c.num) cell.numFmt = MONEY;
      const color = c.colorByTipo ? colorCantidad(r) : (c.color || "FF24384D");
      cell.font = { size: 10.5, bold: !!c.bold, color: { argb: color } };
      cell.alignment = { vertical: "middle", horizontal: c.align === "right" ? "right" : "left", indent: c.align === "right" ? 0 : 1, wrapText: !!c.wrap };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: alt } };
      cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    });
    row++;
  });

  // Total general
  const totalIdx = cols.findIndex((c) => c.total);
  const totalCol = CL + totalIdx;
  if (totalCol - 1 >= CL) ws.mergeCells(row, CL, row, totalCol - 1);
  const gl = ws.getCell(row, CL);
  gl.value = "TOTAL";
  gl.font = { bold: true, size: 11, color: { argb: C.navy } };
  gl.alignment = { horizontal: "right", vertical: "middle" };
  gl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
  const gv = ws.getCell(row, totalCol);
  gv.value = totalVal;
  gv.numFmt = MONEY;
  gv.font = { bold: true, size: 11, color: { argb: C.navy } };
  gv.alignment = { horizontal: "right", vertical: "middle" };
  gv.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
  for (let col = totalCol + 1; col <= CR; col++) ws.getCell(row, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
  for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
  row += 2;

  merge(row);
  const foot = ws.getCell(row, CL);
  foot.value = "Generado por INOVA · Sistema WMS · Motor Principal · Entradas en verde, salidas en rojo";
  foot.font = { size: 9, color: C.muted, italic: true };
  foot.alignment = { horizontal: "center", vertical: "middle" };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Motor principal ${modo === "STOCK" ? "stock" : "movimientos"} ${ahora.toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
