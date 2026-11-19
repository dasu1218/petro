import { test } from 'node:test'
import assert from 'node:assert/strict'
import { browseWishlist, readWishlistFilters } from './wishlistListing.js'
const products = [
  { name: 'Calm shampoo', slug: 'calm-shampoo', category: 'Skin Care', variants: [{ price: 2000, stock: 2 }, { price: 1000, stock: 0 }], promotion: null },
  { name: 'Daily treats', slug: 'daily-treats', category: 'Nutrition', variants: [{ price: 1500, stock: 0 }], promotion: { percent: 10 } },
  { name: 'Skin tonic', slug: 'skin-tonic', category: 'Skin Care', variants: [{ price: 1800, stock: 4 }], promotion: { percent: 10 } },
]
const defaults = readWishlistFilters(new URLSearchParams())
test('wishlist search matches all terms across names, slugs and categories and combines filters', () => {
  assert.deepEqual(browseWishlist(products, { ...defaults, query: '  SKIN tonic  ' }).map((p) => p.slug), ['skin-tonic'])
  assert.deepEqual(browseWishlist(products, { ...defaults, inStock: true, offersOnly: true }).map((p) => p.slug), ['skin-tonic'])
  assert.deepEqual(browseWishlist(products, { ...defaults, query: 'absent' }), [])
})
test('wishlist sorting uses the lowest size price without mutating the saved list', () => {
  assert.deepEqual(browseWishlist(products, { ...defaults, sort: 'price-low' }).map((p) => p.slug), ['calm-shampoo', 'daily-treats', 'skin-tonic'])
  assert.deepEqual(browseWishlist(products, { ...defaults, sort: 'price-high' }).map((p) => p.slug), ['skin-tonic', 'daily-treats', 'calm-shampoo'])
  assert.deepEqual(products.map((p) => p.slug), ['calm-shampoo', 'daily-treats', 'skin-tonic'])
})
test('wishlist URL filters bound search text and ignore unsupported values', () => {
  const filters = readWishlistFilters(new URLSearchParams({ q: 'x'.repeat(200), sort: 'bad', stock: 'yes', offers: '1' }))
  assert.equal(filters.query.length, 120)
  assert.equal(filters.sort, 'catalog')
  assert.equal(filters.inStock, false)
  assert.equal(filters.offersOnly, true)
})
