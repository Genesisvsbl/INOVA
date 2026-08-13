// Guarda/comparte una imagen (Blob PNG) de forma que funcione en PC Y en
// celular. En el teléfono el portapapeles de imágenes y la "descarga" con
// <a download> casi nunca funcionan; lo que sí funciona es el menú nativo de
// compartir (navigator.share), que ofrece Guardar en Fotos/Archivos, Imprimir,
// WhatsApp, etc. Devuelve el método usado.
export async function guardarOCompartirImagen(blob, nombre = "reporte") {
  if (!blob) return "error";
  const file = new File([blob], `${nombre}.png`, { type: "image/png" });

  // 1) MÓVIL (y navegadores compatibles): compartir nativo con archivo.
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: nombre });
      return "shared";
    }
  } catch {
    /* el usuario canceló o no se pudo: seguimos con las otras opciones */
  }

  // 2) ESCRITORIO: copiar al portapapeles.
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      return "copied";
    }
  } catch {
    /* sigue */
  }

  // 3) FALLBACK: descargar y, si no, abrir en una pestaña para guardar a mano.
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombre}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank");
  }
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  return "downloaded";
}
