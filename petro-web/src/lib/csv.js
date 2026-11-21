function cell(value) {
  let text = String(value ?? '')
  // Quoting alone does not prevent spreadsheet formula interpretation.
  if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/u.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export function csvDocument(rows) {
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}
export function downloadCsv(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  try { anchor.click() } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
