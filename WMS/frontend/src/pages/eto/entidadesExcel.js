// Exportación de Personal / Entidades (ETO) a Excel con diseño "wow" en VERDE
// y el logo de INOVA. Una hoja por llamada (Personas o Máquinas).

const C = {
  green: "FF15803D", // verde principal
  greenDeep: "FF166534",
  navy: "FF14532D", // verde muy oscuro (títulos)
  head: "FFE7F8EE", // encabezado tabla (verde claro)
  sub: "FFF4FBF6",
  border: "FFD6E7DC",
  line: "FFBBF7D0",
  muted: "FF6B7A72",
  white: "FFFFFFFF",
  kpiBg: "FFF6FDF9",
  rowAlt: "FFF7FCF9",
  red: "FFDC2626",
};

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

// titulo: "Personas" | "Máquinas" (o el que sea)
export async function exportarEntidadesExcel({ rows = [], titulo = "Personal" }) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default && mod.default.Workbook ? mod.default : mod;

  const cols = [
    { k: "code", l: "Código", w: 18, bold: true, color: C.navy },
    { k: "name", l: "Nombre", w: 42, wrap: true },
    { k: "entity_type", l: "Tipo", w: 16 },
    { k: "position", l: "Cargo", w: 20 },
    { k: "estado", l: "Estado", w: 14, center: true },
  ];

  const CL = 2;
  const CR = 1 + cols.length;
  const ROW0 = 3;
  const merge = (r) => ws.mergeCells(r, CL, r, CR);

  const data = (rows || []).map((r) => ({
    code: r.code || "",
    name: r.name || "",
    entity_type: r.entity_type || "",
    position: r.position || "",
    estado: r.is_active === false ? "Inactiva" : "Activa",
    _active: r.is_active !== false,
  }));

  const total = data.length;
  const activas = data.filter((r) => r._active).length;
  const inactivas = total - activas;

  const wb = new ExcelJS.Workbook();
  wb.creator = "INOVA · ETO";
  wb.created = new Date();
  const ws = wb.addWorksheet(titulo, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 1,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  ws.columns = [{ width: 3 }, ...cols.map((c) => ({ width: c.w })), { width: 3 }];
  ws.getRow(1).height = 8;
  ws.getRow(2).height = 8;

  const ahora = new Date();
  const hoy = ahora.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  let row = ROW0;
  ws.getRow(row).height = 34;
  ws.getRow(row + 1).height = 16;
  ws.getRow(row + 2).height = 16;
  // Logo INOVA tiñéndolo de VERDE (el PNG original es blanco): se dibuja en un
  // canvas y se rellena con verde usando "source-in" para que combine.
  try {
    const resp = await fetch("/INOVA2026.png");
    if (resp.ok) {
      const blob = await resp.blob();
      const img = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 300;
      canvas.height = img.height || 92;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = "#15803d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/png").split(",")[1];
      const imgId = wb.addImage({ base64, extension: "png" });
      ws.addImage(imgId, {
        tl: { col: CL - 1 + 0.05, row: ROW0 - 1 + 0.05 },
        ext: { width: 150, height: 48 },
      });
    }
  } catch {
    /* sin logo */
  }

  const metaCol = Math.max(CL, CR - 2);
  [
    [row, "Base de entidades · ETO", { bold: true, color: C.navy, size: 11 }],
    [row + 1, `${hoy} · ${hora}`, { color: C.muted, size: 10 }],
    [row + 2, titulo, { color: C.green, size: 10, bold: true }],
  ].forEach(([r, val, font]) => {
    ws.mergeCells(r, metaCol, r, CR);
    const c = ws.getCell(r, metaCol);
    c.value = val;
    c.font = font;
    c.alignment = { horizontal: "right", vertical: "middle" };
  });
  row += 3;
  for (let col = CL; col <= CR; col++) ws.getCell(row, col).border = { bottom: medium(C.green) };
  row++;

  merge(row);
  const t = ws.getCell(row, CL);
  t.value = `Base de entidades · ${titulo}`;
  t.font = { bold: true, size: 18, color: C.navy };
  ws.getRow(row).height = 26;
  row += 2;

  // KPIs
  const drawKpi = (r0, label, value, color, c1, c2) => {
    ws.mergeCells(r0, c1, r0 + 1, c2);
    const cell = ws.getCell(r0, c1);
    cell.value = {
      richText: [
        { text: `${label}\n`, font: { size: 9, bold: true, color: { argb: C.muted } } },
        { text: `${value}`, font: { size: 20, bold: true, color: { argb: color } } },
      ],
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.kpiBg } };
    outerBorder(ws, r0, c1, r0 + 1, c2, C.line);
  };
  const third = Math.max(1, Math.floor((CR - CL + 1) / 3));
  ws.getRow(row).height = 18;
  ws.getRow(row + 1).height = 20;
  drawKpi(row, "Total", total, C.navy, CL, CL + third - 1);
  drawKpi(row, "Activas", activas, C.green, CL + third, CL + 2 * third - 1);
  drawKpi(row, "Inactivas", inactivas, C.red, CL + 2 * third, CR);
  row += 3;

  // Encabezado de tabla
  const hRow = ws.getRow(row);
  cols.forEach((c, i) => {
    const cell = hRow.getCell(CL + i);
    cell.value = c.l.toUpperCase();
    cell.font = { bold: true, size: 9, color: { argb: C.greenDeep } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.head } };
    cell.alignment = {
      vertical: "middle",
      horizontal: c.center ? "center" : "left",
      indent: c.center ? 0 : 1,
    };
    cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
  });
  hRow.height = 16;
  row++;

  data.forEach((r, idx) => {
    const dr = ws.getRow(row);
    const alt = idx % 2 ? C.rowAlt : C.white;
    cols.forEach((c, i) => {
      const cell = dr.getCell(CL + i);
      cell.value = r[c.k] ?? "";
      let color = c.color || "FF24384D";
      if (c.k === "estado") color = r._active ? C.green : C.red;
      cell.font = { size: 10.5, bold: !!c.bold || c.k === "estado", color: { argb: color } };
      cell.alignment = {
        vertical: "middle",
        horizontal: c.center ? "center" : "left",
        indent: c.center ? 0 : 1,
        wrapText: !!c.wrap,
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: alt } };
      cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    });
    row++;
  });

  if (!data.length) {
    merge(row);
    const e = ws.getCell(row, CL);
    e.value = "Sin registros";
    e.font = { size: 10.5, italic: true, color: { argb: C.muted } };
    e.alignment = { horizontal: "center", vertical: "middle" };
    row++;
  }

  row += 1;
  merge(row);
  const foot = ws.getCell(row, CL);
  foot.value = "Generado por INOVA · ETO · Base de entidades";
  foot.font = { size: 9, color: { argb: C.muted }, italic: true };
  foot.alignment = { horizontal: "center", vertical: "middle" };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Base de entidades ${titulo} ${ahora.toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
