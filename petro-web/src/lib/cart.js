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
