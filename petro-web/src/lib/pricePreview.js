export function productPricePreview(prices, promotion) {
  const values = prices.map((entry) => ({ label: entry.label, regularPrice: Number(entry.price) }))
  if (values.some((entry) => !Number.isSafeInteger(entry.regularPrice) || entry.regularPrice < 1 || entry.regularPrice > 10000000)) return { rows: [], error: 'Enter whole LKR prices between 1 and 10,000,000 to preview.' }
  const percent = promotion.enabled ? Number(promotion.percent) : 0
  if (promotion.enabled && (!Number.isInteger(percent) || percent < 1 || percent > 90)) return { rows: [], error: 'Enter a whole discount between 1% and 90% to preview.' }
  return { error: '', rows: values.map(({ label, regularPrice }) => {
    const price = promotion.enabled ? Math.max(1, Math.round(regularPrice * (100 - percent) / 100)) : regularPrice
    return { label, regularPrice, price, saving: regularPrice - price }
  }) }
}
