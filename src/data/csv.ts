export type DownloadValue = string | number | null
export type DownloadRow = Record<string, DownloadValue>

/** Escapa una celda CSV y neutraliza fórmulas de hoja de cálculo (=, +, -, @) en textos. */
export function csvCell(value: DownloadValue): string {
  if (value === null) return ""
  let text = String(value)
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(value)) {
    text = `'${text}`
  }
  return `"${text.replace(/"/g, '""')}"`
}

/** Convierte filas con las mismas columnas en texto CSV; los vacíos se conservan vacíos. */
export function toCsv(rows: DownloadRow[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0]!)
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? null)).join(",")),
  ].join("\r\n")
}
