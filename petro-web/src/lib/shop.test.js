import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browseProducts, listingVariant, readShopFilters } from './shop.js'
const make = (slug, price, extra = {}) => ({ slug, name: slug, description: 'Daily pet care', category: 'Nutrition', badges: ['Gentle'], variants: [{ label: 'small', price, stock: 5 }], ...extra })
const products = [make('Alpha', 1000), make('Beta', 2000, { category: 'Skin Care', promotion: { label: 'Sale' } }), make('Gamma', 3000, { variants: [{ label: 'large', price: 3000, stock: 0 }] })]
const filters = (query = '') => readShopFilters(new URLSearchParams(query))
test('search is case-insensitive, matches multiple terms, and searches names and categories', () => {
  assert.deepEqual(browseProducts(products, filters('q=BETA+skin')).products.map((item) => item.slug), ['Beta'])
  assert.equal(browseProducts(products, filters('q=gentle+daily')).total, 3)
  assert.equal(browseProducts(products, filters('q=missing')).total, 0)
})
test('category, stock, active promotion and inclusive price filters combine', () => {
  assert.deepEqual(browseProducts(products, filters('category=Skin+Care&stock=1&offers=1&min=2000&max=2000')).products.map((item) => item.slug), ['Beta'])
  assert.equal(browseProducts(products, filters('stock=1')).total, 2)
  assert.equal(browseProducts(products, filters('min=2001&max=3000')).total, 1)
  const invalid = browseProducts(products, filters('min=3000&max=1000'))
  assert.equal(invalid.rangeError, true)
  assert.equal(invalid.total, 0)
})
test('price and name sorting preserve the original catalog order', () => {
  assert.deepEqual(browseProducts(products, filters('sort=price-high')).products.map((item) => item.slug), ['Gamma', 'Beta', 'Alpha'])
  assert.deepEqual(browseProducts([...products].reverse(), filters('sort=name')).products.map((item) => item.slug), ['Alpha', 'Beta', 'Gamma'])
  assert.equal(products[0].slug, 'Alpha')
})
test('from price uses the cheapest matching variant, including available sizes for stock-only searches', () => {
  const product = make('Sizes', 0, { variants: [{ label: 'small', price: 500, stock: 0 }, { label: 'large', price: 900, stock: 2 }] })
  assert.equal(listingVariant(product).price, 500)
  assert.equal(listingVariant(product, true).price, 900)
  assert.equal(browseProducts([product], filters('stock=1&max=800')).total, 0)
})
test('pagination clamps out-of-range pages after filtering and handles empty results', () => {
  const catalog = Array.from({ length: 14 }, (_, index) => make(`Product ${index}`, index + 1))
  const result = browseProducts(catalog, filters('page=99'))
  assert.equal(result.page, 3)
  assert.equal(result.pages, 3)
  assert.equal(result.products.length, 2)
  assert.equal(result.start, 12)
  const empty = browseProducts([], filters('page=99'))
  assert.equal(empty.page, 1)
  assert.equal(empty.pages, 1)
  assert.equal(empty.total, 0)
})
test('malformed URL filters fall back safely and search length is bounded', () => {
  const result = filters('page=-1&sort=unknown&min=-1&max=bad')
  assert.equal(result.page, 1)
  assert.equal(result.sort, 'featured')
  assert.equal(result.min, null)
  assert.equal(result.max, null)
  assert.equal(filters(`q=${'x'.repeat(200)}`).query.length, 120)
})
