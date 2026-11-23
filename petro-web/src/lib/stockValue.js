import { initialStockPreview } from './initialStock.js'
import { productPricePreview } from './pricePreview.js'
export function initialStockValue(variants) {
  const stock = initialStockPreview(variants)
  const prices = productPricePreview(variants, { enabled: false })
  if (stock.error || prices.error) return { error: 'Enter valid size names, whole LKR prices and stock quantities to preview stock value.' }
  return { error: '', value: variants.reduce((total, variant) => total + Number(variant.price) * Number(variant.stock), 0) }
}
