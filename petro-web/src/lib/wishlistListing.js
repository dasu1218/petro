import { listingVariant } from './shop.js'
const sorts = ['catalog', 'price-low', 'price-high', 'name']
export function readWishlistFilters(params) {
  return { query: (params.get('q') || '').slice(0, 120), sort: sorts.includes(params.get('sort')) ? params.get('sort') : 'catalog', inStock: params.get('stock') === '1', offersOnly: params.get('offers') === '1' }
}
export function browseWishlist(products, filters) {
  const terms = filters.query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean)
  const matches = products.filter((product) => {
    const text = `${product.name} ${product.slug} ${product.category}`.toLocaleLowerCase('en')
    return terms.every((term) => text.includes(term)) && (!filters.inStock || product.variants.some((variant) => variant.stock > 0)) && (!filters.offersOnly || Boolean(product.promotion))
  })
  if (filters.sort === 'price-low') matches.sort((a, b) => listingVariant(a).price - listingVariant(b).price)
  if (filters.sort === 'price-high') matches.sort((a, b) => listingVariant(b).price - listingVariant(a).price)
  if (filters.sort === 'name') matches.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  return matches
}
