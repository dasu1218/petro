export function initialStockPreview(variants) {
  const labels = new Set()
  let units = 0
  let availableSizes = 0
  for (const [index, variant] of variants.entries()) {
    const label = variant.label.trim()
    if (!label || label.length > 40 || label === 'Care bundle') return { error: `Size ${index + 1}: enter a size name of up to 40 characters; “Care bundle” is reserved.` }
    if (labels.has(label.toLowerCase())) return { error: `Size ${index + 1}: use a unique size name.` }
    labels.add(label.toLowerCase())
    const stock = Number(variant.stock)
    if (String(variant.stock).trim() === '' || !Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) return { error: `Size ${index + 1}: enter whole stock units between 0 and 1,000,000.` }
    units += stock
    if (stock > 0) availableSizes += 1
  }
  return { error: '', units, availableSizes, sizes: variants.length }
}
