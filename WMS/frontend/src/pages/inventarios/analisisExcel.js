// Exportación del análisis de inventario a Excel con el MISMO diseño del informe:
// logo, colores institucionales, KPIs, agrupado por familia, diferencias con
// formato condicional (rojo faltante, azul sobrante, verde cuadrado) y subtotales.
// Usa ExcelJS (soporta estilos, imágenes y celdas combinadas).
//
// Layout con margen: columna A (izquierda) y filas 1-2 (arriba) quedan como
// aire, para que el contenido no toque los bordes (igual que el informe PDF).

const C = {
  navy: "FF1F2D5C",
  red: "FFDC2626",
  blue: "FF0B3D91",
  green: "FF1F7A3D",
  head: "FFF1F5FA",
  sub: "FFF8FAFC",
  border: "FFE6ECF3",
  muted: "FF8A97A8",
  white: "FFFFFFFF",
  kpiBg: "FFFBFDFF",
  rowAlt: "FFFBFCFE",
  redBg: "FFFCE9E9",
  blueBg: "FFE7EEFA",
  greenBg: "FFE9F5EC",
};

const MONEY = "#,##0.00";

// Columnas de contenido (con margen a izquierda y derecha).
const MAT = 2, DESC = 3, TEO = 4, FIS = 5, DIF = 6, OBS = 7;
const CL = MAT;      // primera columna de contenido (B)
const CR = OBS;      // última columna de contenido (G)
const ROW0 = 3;      // primera fila de contenido (deja 1-2 de margen arriba)

const thin = (color = C.border) => ({ style: "thin", color: { argb: color } });
const medium = (color) => ({ style: "medium", color: { argb: color } });

function calcDif(r) {
  return (
    (Number(r.fisico || 0) - Number(r.teorico || 0)) -
    Number(r.p_ingreso || 0) +
    Number(r.p_descargar || 0) -
    Number(r.devolucion || 0)
  );
}

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

export async function exportarAnalisisExcel({ rows = [], fileName = "" }) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default && mod.default.Workbook ? mod.default : mod;

  const data = rows.map((r) => ({ ...r, diferencia: calcDif(r) }));
  const gFalt = data.filter((r) => r.diferencia < 0).length;
  const gSob = data.filter((r) => r.diferencia > 0).length;
  const gCuad = data.filter((r) => r.diferencia === 0).length;

  const byFam = new Map();
  data.forEach((r) => {
    const f = String(r.familia || "(sin familia)");
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(r);
  });
  const familias = [...byFam.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "INOVA · Sistema WMS";
  wb.created = new Date();
  const ws = wb.addWorksheet("Análisis SAP vs físico", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 1, orientation: "portrait", fitToPage: true, fitToWidth: 1, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });

  // A = margen izq, B..G = contenido, H = margen der
  ws.columns = [
    { width: 3 }, { width: 16 }, { width: 46 }, { width: 15 }, { width: 15 }, { width: 16 }, { width: 34 }, { width: 3 },
  ];
  // Margen superior
  ws.getRow(1).height = 8;
  ws.getRow(2).height = 8;

  const merge = (row) => ws.mergeCells(row, CL, row, CR);

  const ahora = new Date();
  const hoy = ahora.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  // ---- Encabezado con logo ----
  let row = ROW0; // 3
  ws.getRow(row).height = 34;
  ws.getRow(row + 1).height = 16;
  ws.getRow(row + 2).height = 16;
  try {
    const resp = await fetch("/inova-azul.png");
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      const imgId = wb.addImage({ buffer: buf, extension: "png" });
      // Anclado en la columna B (index 1), fila de contenido (index ROW0-1)
      ws.addImage(imgId, { tl: { col: CL - 1 + 0.05, row: ROW0 - 1 + 0.1 }, ext: { width: 150, height: 46 } });
    }
  } catch { /* sin logo si falla la carga */ }

  const meta = [
    [row, "Informe de análisis de inventario", { bold: true, color: C.navy, size: 11 }],
    [row + 1, `${hoy} · ${hora}`, { color: C.muted, size: 10 }],
    [row + 2, fileName ? `Archivo: ${fileName}` : "", { color: C.muted, size: 10 }],
  ];
  meta.forEach(([r, val, font]) => {
    ws.mergeCells(r, TEO, r, CR); // lado derecho (D..G)
    const c = ws.getCell(r, TEO);
    c.value = val;
    c.font = font;
    c.alignment = { horizontal: "right", vertical: "middle" };
  });
  row += 3; // -> 6

  // Línea separadora bajo el encabezado
  for (let col = CL; col <= CR; col++) {
    ws.getCell(row, col).border = { bottom: medium(C.navy) };
  }
  row++; // -> 7

  // ---- Título ----
  merge(row);
  const tCell = ws.getCell(row, CL);
  tCell.value = "Análisis de inventario · SAP vs físico";
  tCell.font = { bold: true, size: 18, color: C.navy };
  ws.getRow(row).height = 26;
  row++;
  merge(row);
  const sCell = ws.getCell(row, CL);
  sCell.value = "Comparativo del teórico de SAP contra el físico real del WMS, desglosado por familia.";
  sCell.font = { size: 10.5, color: C.muted };
  row += 2; // deja una fila de aire -> KPIs

  // ---- KPIs (2 x 2) ----
  const drawKpi = (r0, label, value, color, c1, c2) => {
    ws.mergeCells(r0, c1, r0 + 1, c2);
    const cell = ws.getCell(r0, c1);
    cell.value = {
      richText: [
        { text: `${label}\n`, font: { size: 9, bold: true, color: { argb: C.muted } } },
        { text: `${value}`, font: { size: 20, bold: true, color: { argb: color } } },
      ],
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.kpiBg } };
    outerBorder(ws, r0, c1, r0 + 1, c2, C.border);
  };
  const kRow1 = row;
  const kRow2 = row + 3;
  [kRow1, kRow1 + 1, kRow2, kRow2 + 1].forEach((rr) => (ws.getRow(rr).height = 19));
  drawKpi(kRow1, "Faltantes", gFalt, C.red, MAT, TEO);   // B..D
  drawKpi(kRow1, "Sobrantes", gSob, C.blue, FIS, CR);    // E..G
  drawKpi(kRow2, "Cuadrados", gCuad, C.green, MAT, TEO);
  drawKpi(kRow2, "Familias", familias.length, C.navy, FIS, CR);
  row = kRow2 + 3; // deja aire tras los KPIs

  // ---- Bloques por familia ----
  const headers = ["Material", "Descripción", "Teórico", "Físico", "Diferencia", "Observación"];

  const seccion = (titulo, list, color, bgTint) => {
    merge(row);
    const th = ws.getCell(row, CL);
    th.value = `● ${titulo}  (${list.length})`;
    th.font = { bold: true, size: 11, color: { argb: color } };
    th.alignment = { vertical: "middle" };
    ws.getRow(row).height = 18;
    row++;

    if (!list.length) {
      merge(row);
      const e = ws.getCell(row, CL);
      e.value = "Sin registros.";
      e.font = { italic: true, size: 10, color: C.muted };
      e.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
      e.alignment = { vertical: "middle", indent: 1 };
      row++;
      return;
    }

    const hRow = ws.getRow(row);
    headers.forEach((h, i) => {
      const cell = hRow.getCell(CL + i);
      cell.value = h.toUpperCase();
      cell.font = { bold: true, size: 9, color: { argb: "FF334155" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.head } };
      cell.alignment = { vertical: "middle", horizontal: i >= 2 && i <= 4 ? "right" : "left", indent: i < 2 || i === 5 ? 1 : 0 };
      cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    });
    hRow.height = 16;
    row++;

    let sub = 0;
    list.forEach((r, idx) => {
      sub += Number(r.diferencia || 0);
      const dr = ws.getRow(row);
      const alt = idx % 2 ? C.rowAlt : C.white;
      const cells = [
        { v: r.material, num: false, align: "left", bold: true, color: C.navy },
        { v: r.texto || "", num: false, align: "left" },
        { v: Number(r.teorico || 0), num: true, align: "right" },
        { v: Number(r.fisico || 0), num: true, align: "right" },
        { v: Number(r.diferencia || 0), num: true, align: "right", bold: true, color, fill: bgTint },
        { v: r.observacion || "", num: false, align: "left" },
      ];
      cells.forEach((cfg, i) => {
        const cell = dr.getCell(CL + i);
        cell.value = cfg.v;
        if (cfg.num) cell.numFmt = MONEY;
        cell.font = { size: 10.5, bold: !!cfg.bold, color: { argb: cfg.color || "FF24384D" } };
        cell.alignment = { vertical: "middle", horizontal: cfg.align, indent: cfg.align === "left" ? 1 : 0, wrapText: i === 1 || i === 5 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cfg.fill || alt } };
        cell.border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
      });
      row++;
    });

    // Subtotal
    ws.mergeCells(row, MAT, row, FIS); // B..E
    const stLabel = ws.getCell(row, MAT);
    stLabel.value = "Subtotal";
    stLabel.font = { bold: true, size: 10.5, color: { argb: "FF334155" } };
    stLabel.alignment = { horizontal: "right", vertical: "middle" };
    stLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    const stVal = ws.getCell(row, DIF);
    stVal.value = sub;
    stVal.numFmt = MONEY;
    stVal.font = { bold: true, size: 10.5, color: { argb: color } };
    stVal.alignment = { horizontal: "right", vertical: "middle" };
    stVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    ws.getCell(row, OBS).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.sub } };
    for (let col = CL; col <= CR; col++) {
      ws.getCell(row, col).border = { top: thin(), bottom: thin(), left: thin(), right: thin() };
    }
    row += 2; // espacio
  };

  familias.forEach(([fam, items]) => {
    merge(row);
    const fh = ws.getCell(row, CL);
    fh.value = `${fam}    ·    ${items.length} material(es)`;
    fh.font = { bold: true, size: 13, color: C.navy };
    fh.alignment = { vertical: "middle" };
    ws.getRow(row).height = 22;
    for (let col = CL; col <= CR; col++) {
      ws.getCell(row, col).border = { bottom: medium(C.navy) };
    }
    row++;

    const falt = items.filter((r) => r.diferencia < 0);
    const sob = items.filter((r) => r.diferencia > 0);
    const cuad = items.filter((r) => r.diferencia === 0);
    seccion("Faltantes", falt, C.red, C.redBg);
    seccion("Sobrantes", sob, C.blue, C.blueBg);
    seccion("Cuadrados", cuad, C.green, C.greenBg);
  });

  // ---- Pie ----
  merge(row);
  const foot = ws.getCell(row, CL);
  foot.value = "Fórmula: (Físico − Teórico) − P. Ingreso + P. Descargar − Devolución · Generado por INOVA · Sistema WMS";
  foot.font = { size: 9, color: C.muted, italic: true };
  foot.alignment = { horizontal: "center", vertical: "middle" };

  // ---- Descargar ----
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Analisis SAP vs fisico ${ahora.toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
