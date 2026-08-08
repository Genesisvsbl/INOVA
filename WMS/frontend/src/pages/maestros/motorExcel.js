// Exportación del Motor Principal a Excel con el MISMO diseño del reporte de
// análisis / tránsito: logo embebido, colores, KPIs, agrupado por familia y
// subtotales. Sirve para el modo movimientos y el modo stock. Usa ExcelJS.

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

// modo: "STOCK" | "MOV"
export async function exportarMotorExcel({ rows = [], modo = "MOV" }) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default && mod.default.Workbook ? mod.default : mod;

  const cols =
    modo === "STOCK"
      ? [
          { k: "codigo_material", l: "Material", w: 16, bold: true, color: C.navy },
          { k: "descripcion_material", l: "Descripción", w: 42, wrap: true },
          { k: "ubicacion", l: "Ubicación", w: 16 },
          { k: "lote_almacen", l: "Lote almacén", w: 18 },
          { k: "lote_proveedor", l: "Lote proveedor", w: 18 },
          { k: "fecha_vencimiento", l: "Vencimiento", w: 14, date: true },
          { k: "stock", l: "Stock", w: 14, num: true, total: true, align: "right", color: C.green, bold: true },
        ]
      : [
          { k: "codigo_material", l: "Material", w: 15, bold: true, color: C.navy },
          { k: "descripcion_material", l: "Descripción", w: 34, wrap: true },
          { k: "estado", l: "Estado", w: 13 },
          { k: "ubicacion", l: "Ubicación", w: 15 },
          { k: "lote_almacen", l: "Lote almacén", w: 16 },
          { k: "lote_proveedor", l: "Lote proveedor", w: 16 },
          { k: "fecha_vencimiento", l: "Vencimiento", w: 13, date: true },
          { k: "cantidad", l: "Cantidad", w: 14, num: true, total: true, align: "right", color: C.green, bold: true },
        ];

  const totalKey = (cols.find((c) => c.total) || {}).k;
  const CL = 2, CR = 1 + cols.length, ROW0 = 3;
  const merge = (row) => ws.mergeCells(row, CL, row, CR);

  const byFam = new Map();
  rows.forEach((r) => {
    const f = String(r.familia || "(sin familia)").trim() || "(sin familia)";
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(r);
  });
  const familias = [...byFam.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const totalReg = rows.length;
  const totalVal = rows.reduce((acc, r) => acc + Number(r[totalKey] || 0), 0);

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
  const third = Math.floor((CR - CL + 1) / 3);
  const k1a = CL, k1b = CL + third - 1;
  const k2a = k1b + 1, k2b = k1b + third;
  const k3a = k2b + 1, k3b = CR;
  ws.getRow(row).height = 18;
  ws.getRow(row + 1).height = 20;
  drawKpi(row, "Registros", totalReg, C.navy, k1a, k1b);
  drawKpi(row, modo === "STOCK" ? "Stock total" : "Cantidad total", Number(totalVal).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), C.blue, k2a, k2b);
  drawKpi(row, "Familias", familias.length, C.green, k3a, k3b);
  row += 3;

  familias.forEach(([fam, items]) => {
    merge(row);
    const fh = ws.getCell(row, CL);
    fh.value = `${fam}    ·    ${items.length} registro(s)`;
    fh.font = { bold: true, size: 13, color: C.navy };
    fh.alignment = { vertical: "middle" };
    ws.getRow(row).height = 22;
    for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { bottom: medium(C.navy) };
    row++;

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

    let sub = 0;
    items.forEach((r, idx) => {
      sub += Number(r[totalKey] || 0);
      const dr = ws.getRow(row);
      const alt = idx % 2 ? C.rowAlt : C.white;
      cols.forEach((c, i) => {
        const cell = dr.getCell(CL + i);
        const raw = c.date ? d10(r[c.k]) : c.num ? Number(r[c.k] || 0) : (r[c.k] ?? "");
        cell.value = raw;
        if (c.num) cell.numFmt = MONEY;
        cell.font = { size: 10.5, bold: !!c.bold, color: { argb: c.color || "FF24384D" } };
        cell.alignment = { vertical: "middle", horizontal: c.align === "right" ? "right" : "left", indent: c.align === "right" ? 0 : 1, wrapText: !!c.wrap };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: alt } };
        cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
      });
      row++;
    });

    // Subtotal (en la columna total)
    const totalIdx = cols.findIndex((c) => c.total);
    const totalCol = CL + totalIdx;
    if (totalCol - 1 >= CL) ws.mergeCells(row, CL, row, totalCol - 1);
    const stl = ws.getCell(row, CL);
    stl.value = "Subtotal";
    stl.font = { bold: true, size: 10.5, color: { argb: "FF334155" } };
    stl.alignment = { horizontal: "right", vertical: "middle" };
    stl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    const stv = ws.getCell(row, totalCol);
    stv.value = sub;
    stv.numFmt = MONEY;
    stv.font = { bold: true, size: 10.5, color: { argb: C.green } };
    stv.alignment = { horizontal: "right", vertical: "middle" };
    stv.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    for (let col = totalCol + 1; col <= CR; col++) ws.getCell(row, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    row += 2;
  });

  merge(row);
  const foot = ws.getCell(row, CL);
  foot.value = "Generado por INOVA · Sistema WMS · Motor Principal";
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
