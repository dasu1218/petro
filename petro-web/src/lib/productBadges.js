export function productBadges(value) {
  const entries = value.split(',').map((badge) => badge.trim()).filter(Boolean)
  if (entries.length > 6) return { badges: [], error: 'Use up to six badges.' }
  if (entries.some((badge) => badge.length > 40)) return { badges: [], error: 'Each badge must contain 40 characters or fewer.' }
  return { badges: [...new Set(entries)], error: '' }
}
