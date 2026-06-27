function escapeCsvValue(value) {
  const raw = String(value ?? "");
  const escaped = raw.replaceAll("\"", "\"\"");
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function buildCsv(fields, records) {
  const headers = [...fields.map((field) => field.nombre), "Fecha creacion", "Fecha modificacion"];
  const rows = records.map((record) => {
    const dataColumns = fields.map((field) => escapeCsvValue(record.datos[field.id] ?? ""));
    return [
      ...dataColumns,
      escapeCsvValue(record.fecha_creacion ?? ""),
      escapeCsvValue(record.fecha_modificacion ?? "")
    ].join(",");
  });

  return [headers.map(escapeCsvValue).join(","), ...rows].join("\r\n");
}

export function buildExportFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `contactos_${date}.csv`;
}

export async function shareOrDownloadCsv(fileName, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const file = new File([blob], fileName, { type: "text/csv" });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: "Exportacion de contactos",
      files: [file]
    });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
