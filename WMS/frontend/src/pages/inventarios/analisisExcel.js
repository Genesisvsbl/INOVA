// Exportación del análisis a Excel con el MISMO diseño del informe:
// logo, colores institucionales, KPIs, agrupado por familia, diferencias con
// formato condicional (rojo faltante, azul sobrante, verde cuadrado) y subtotales.
//
// Se genera como HTML con estilos que Excel abre de forma nativa (sin librerías
// externas, para no romper el build). Los números llevan mso-number-format para
// que Excel los trate como valores numéricos (se pueden sumar / filtrar).

const C = {
  navy: "#1F2D5C",
  red: "#DC2626",
  blue: "#0B3D91",
  green: "#1F7A3D",
  head: "#F1F5FA",
  sub: "#F8FAFC",
  border: "#E6ECF3",
  muted: "#8A97A8",
  redBg: "#FCE9E9",
  blueBg: "#E7EEFA",
  greenBg: "#E9F5EC",
  kpiBg: "#FBFDFF",
  rowAlt: "#FBFCFE",
};

const NUMFMT = "mso-number-format:'#,##0.00';";

function calcDif(r) {
  return (
    (Number(r.fisico || 0) - Number(r.teorico || 0)) -
    Number(r.p_ingreso || 0) +
    Number(r.p_descargar || 0) -
    Number(r.devolucion || 0)
  );
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const num = (v) => Number(v || 0); // valor crudo para Excel

export async function exportarAnalisisExcel({ rows = [], fileName = "" }) {
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

  const ahora = new Date();
  const hoy = ahora.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  const cellBase = `border:1px solid ${C.border};padding:5px 8px;font-size:11px;font-family:Segoe UI,Arial,sans-serif;`;

  const seccion = (titulo, list, color, bgTint) => {
    const head =
      `<tr><td colspan="6" style="padding:8px 4px 3px;font-weight:800;color:${color};font-size:12px;">` +
      `&#9632; ${titulo} (${list.length})</td></tr>`;
    if (!list.length) {
      return (
        head +
        `<tr><td colspan="6" style="${cellBase}color:${C.muted};font-style:italic;background:${C.sub};">Sin registros.</td></tr>`
      );
    }
    const th =
      `<tr>` +
      [`Material`, `Descripción`].map((h) => `<td style="${cellBase}background:${C.head};font-weight:800;color:#334155;text-transform:uppercase;font-size:10px;">${h}</td>`).join("") +
      [`Teórico`, `Físico`, `Diferencia`].map((h) => `<td style="${cellBase}background:${C.head};font-weight:800;color:#334155;text-transform:uppercase;font-size:10px;text-align:right;">${h}</td>`).join("") +
      `<td style="${cellBase}background:${C.head};font-weight:800;color:#334155;text-transform:uppercase;font-size:10px;">Observación</td>` +
      `</tr>`;
    let sub = 0;
    const body = list
      .map((r, i) => {
        sub += num(r.diferencia);
        const alt = i % 2 ? C.rowAlt : "#FFFFFF";
        return (
          `<tr>` +
          `<td style="${cellBase}background:${alt};font-weight:700;color:${C.navy};">${esc(r.material)}</td>` +
          `<td style="${cellBase}background:${alt};">${esc(r.texto || "")}</td>` +
          `<td style="${cellBase}background:${alt};text-align:right;${NUMFMT}">${num(r.teorico)}</td>` +
          `<td style="${cellBase}background:${alt};text-align:right;${NUMFMT}">${num(r.fisico)}</td>` +
          `<td style="${cellBase}background:${bgTint};text-align:right;font-weight:800;color:${color};${NUMFMT}">${num(r.diferencia)}</td>` +
          `<td style="${cellBase}background:${alt};">${esc(r.observacion || "")}</td>` +
          `</tr>`
        );
      })
      .join("");
    const subtotal =
      `<tr>` +
      `<td colspan="4" style="${cellBase}background:${C.sub};text-align:right;font-weight:800;color:#334155;">Subtotal</td>` +
      `<td style="${cellBase}background:${C.sub};text-align:right;font-weight:800;color:${color};${NUMFMT}">${sub}</td>` +
      `<td style="${cellBase}background:${C.sub};"></td>` +
      `</tr>`;
    return head + th + body + subtotal;
  };

  const bloques = familias
    .map(([fam, items]) => {
      const falt = items.filter((r) => r.diferencia < 0);
      const sob = items.filter((r) => r.diferencia > 0);
      const cuad = items.filter((r) => r.diferencia === 0);
      const famHead =
        `<tr><td colspan="6" style="padding:14px 2px 6px;font-weight:900;color:${C.navy};font-size:15px;border-bottom:2px solid ${C.navy};">` +
        `${esc(fam)} &#183; ${items.length} material(es)</td></tr>`;
      return (
        famHead +
        seccion("Faltantes", falt, C.red, C.redBg) +
        seccion("Sobrantes", sob, C.blue, C.blueBg) +
        seccion("Cuadrados", cuad, C.green, C.greenBg) +
        `<tr><td colspan="6" style="height:8px;"></td></tr>`
      );
    })
    .join("");

  const kpi = (label, value, color, colspan) =>
    `<td colspan="${colspan}" style="${cellBase}background:${C.kpiBg};border:1px solid ${C.border};">` +
    `<span style="font-size:10px;font-weight:800;color:${C.muted};text-transform:uppercase;">${label}</span><br/>` +
    `<span style="font-size:22px;font-weight:900;color:${color};">${value}</span></td>`;

  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="utf-8"/>` +
    `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>` +
    `<x:Name>Análisis SAP vs físico</x:Name>` +
    `<x:WorksheetOptions><x:DoNotDisplayGridlines/></x:WorksheetOptions>` +
    `</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->` +
    `</head><body>` +
    `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;">` +
    `<colgroup><col style="width:120px"/><col style="width:340px"/><col style="width:110px"/><col style="width:110px"/><col style="width:120px"/><col style="width:260px"/></colgroup>` +
    // Encabezado con logo
    `<tr>` +
    `<td colspan="3" style="padding:6px 2px 10px;border-bottom:3px solid ${C.navy};">` +
    `<span style="font-size:24px;font-weight:900;color:${C.navy};">&#9673; INOVA</span>` +
    `<span style="font-size:11px;font-weight:800;color:${C.blue};"> &nbsp; SISTEMA WMS</span>` +
    `<br/><span style="font-size:10px;font-weight:700;color:${C.muted};">Gestión de inventarios</span>` +
    `</td>` +
    `<td colspan="3" style="padding:4px 2px 10px;border-bottom:3px solid ${C.navy};text-align:right;font-size:11px;color:#64748b;">` +
    `<b style="color:${C.navy};">Informe de análisis de inventario</b><br/>${hoy} &#183; ${hora}` +
    (fileName ? `<br/>Archivo: ${esc(fileName)}` : "") +
    `</td></tr>` +
    // Título
    `<tr><td colspan="6" style="padding:14px 2px 0;font-size:22px;font-weight:900;color:${C.navy};">Análisis de inventario &#183; SAP vs físico</td></tr>` +
    `<tr><td colspan="6" style="padding:2px 2px 10px;font-size:12px;color:#64748b;">Comparativo del teórico de SAP contra el físico real del WMS, desglosado por familia.</td></tr>` +
    // KPIs
    `<tr>` +
    kpi("Faltantes", gFalt, C.red, 2) +
    kpi("Sobrantes", gSob, C.blue, 1) +
    kpi("Cuadrados", gCuad, C.green, 1) +
    kpi("Familias", familias.length, C.navy, 2) +
    `</tr>` +
    `<tr><td colspan="6" style="height:10px;"></td></tr>` +
    (bloques || `<tr><td colspan="6" style="${cellBase}color:${C.muted};">No hay datos para el informe.</td></tr>`) +
    `<tr><td colspan="6" style="padding-top:14px;text-align:center;color:#9aa7b5;font-size:10px;">Fórmula: (Físico &#8722; Teórico) &#8722; P. Ingreso + P. Descargar &#8722; Devolución &#183; Generado por INOVA &#183; Sistema WMS</td></tr>` +
    `</table></body></html>`;

  const blob = new Blob(["﻿", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Analisis SAP vs fisico ${ahora.toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
