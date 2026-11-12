export function readCart(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    if (!Array.isArray(value)) return fallback
    return value.filter((item) => item && typeof item.slug === 'string' && typeof item.variantLabel === 'string' && Number.isSafeInteger(item.quantity) && item.quantity > 0 && Number.isFinite(item.price) && item.price >= 0 && Number.isSafeInteger(item.stock) && item.stock > 0)
      .map((item) => ({ ...item, key: `${item.slug}:${item.variantLabel}`, quantity: Math.min(item.quantity, item.stock) }))
  } catch {
    return fallback
  }
}

// Taking the larger quantity makes a retried login merge idempotent.
export function mergeCartItems(account, guest) {
  const merged = new Map(account.map((item) => [item.key, item]))
  for (const item of guest) {
    const existing = merged.get(item.key)
    const line = existing || item
    merged.set(item.key, { ...line, quantity: Math.min(line.stock, Math.max(existing?.quantity || 0, item.quantity)) })
  }
  return [...merged.values()]
}

export function getCartItemPath(item) {
  return item.kind === 'bundle' ? `/bundles#${item.slug}` : `/products/${item.slug}`
}

export function refreshCartProducts(items, products, unavailableSlugs = []) {
  let changed = false
  const next = items.flatMap((item) => {
    if (unavailableSlugs.includes(item.slug)) { changed = true; return [] }
    if (item.kind === 'bundle') return [item]
    const product = products.find((entry) => entry.slug === item.slug)
    const variant = product?.variants.find((entry) => entry.label === item.variantLabel)
    if (!variant) return [item]
    if (variant.stock <= 0) { changed = true; return [] }
    const update = { ...item, name: product.name || item.name, price: variant.price, stock: variant.stock, quantity: Math.min(item.quantity, variant.stock) }
    if (item.name !== update.name || item.price !== update.price || item.stock !== update.stock || item.quantity !== update.quantity) changed = true
    return [update]
  })
  return changed ? next : items
}
