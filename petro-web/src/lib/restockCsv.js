import { csvDocument } from './csv.js'
export function restockHistoryCsv(product, history) {
  return csvDocument([
    ['PETRO recent stock additions'], ['Product name', product.name], ['Product URL', product.slug],
    ['Additions exported', history.length], ['Units added in shown entries', history.reduce((sum, entry) => sum + entry.quantity, 0)], [],
    ['Addition reference', 'Added at', 'Size', 'Quantity added', 'Addition note', 'Stock immediately after addition'],
    ...history.map((entry) => [entry.id, entry.createdAt || '', entry.variantLabel, entry.quantity, entry.reason, entry.stockAfter]),
  ])
}
