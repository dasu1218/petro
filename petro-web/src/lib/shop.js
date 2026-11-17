export const SHOP_PAGE_SIZE = 6
export const SHOP_SORTS = ['featured', 'price-low', 'price-high', 'name']
const money = (value) => value !== null && /^\d{1,8}$/.test(value) ? Number(value) : null
export function readShopFilters(params) {
  const rawPage = Number(params.get('page') || 1)
  return {
    query: (params.get('q') || '').slice(0, 120),
    category: (params.get('category') || '').slice(0, 80),
    sort: SHOP_SORTS.includes(params.get('sort')) ? params.get('sort') : 'featured',
    min: money(params.get('min')), max: money(params.get('max')),
    inStock: params.get('stock') === '1', offersOnly: params.get('offers') === '1',
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  }
}
export function listingVariant(product, inStock = false) {
  const candidates = product.variants.filter((variant) => !inStock || variant.stock > 0)
  return candidates.reduce((best, variant) => !best || variant.price < best.price ? variant : best, null)
}
export function browseProducts(products, filters) {
  const rangeError = filters.min !== null && filters.max !== null && filters.min > filters.max
  const terms = filters.query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean)
  const matches = rangeError ? [] : products.filter((product) => {
    const variant = listingVariant(product, filters.inStock)
    if (!variant) return false
    const text = `${product.name} ${product.description} ${product.category} ${(product.badges || []).join(' ')}`.toLocaleLowerCase('en')
    return terms.every((term) => text.includes(term))
      && (!filters.category || product.category === filters.category)
      && (!filters.offersOnly || Boolean(product.promotion))
      && (filters.min === null || variant.price >= filters.min)
      && (filters.max === null || variant.price <= filters.max)
  })
  const price = (product) => listingVariant(product, filters.inStock).price
  if (filters.sort === 'price-low') matches.sort((a, b) => price(a) - price(b))
  if (filters.sort === 'price-high') matches.sort((a, b) => price(b) - price(a))
  if (filters.sort === 'name') matches.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  const pages = Math.max(1, Math.ceil(matches.length / SHOP_PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const start = (page - 1) * SHOP_PAGE_SIZE
  return { products: matches.slice(start, start + SHOP_PAGE_SIZE), total: matches.length, page, pages, start, rangeError }
}
