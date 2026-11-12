import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getPageMeta } from './pageMeta.js'
test('public storefront routes have distinct titles and relevant descriptions', () => {
  const paths = ['/', '/shop', '/bundles', '/wellness']
  const metadata = paths.map((path) => getPageMeta(path))
  assert.equal(new Set(metadata.map((meta) => meta.title)).size, paths.length)
  assert.ok(metadata.every((meta) => meta.indexable && meta.description.length > 20))
})
test('private, authentication and admin routes never use personal data in metadata', () => {
  for (const path of ['/account','/cart','/checkout','/wishlist','/orders','/orders/private-id','/login','/register','/admin/products','/admin/orders']) {
    const meta = getPageMeta(path)
    assert.equal(meta.indexable, false)
    assert.ok(!meta.title.includes('private-id'))
  }
})
test('product metadata uses the live product description and bounds its length', () => {
  const meta = getPageMeta('/products/shampoo', [{ slug: 'shampoo', name: 'Care Shampoo', description: 'a'.repeat(250) }])
  assert.equal(meta.title, 'Care Shampoo | PETRO')
  assert.equal(meta.description.length, 160)
  assert.equal(meta.indexable, true)
})
test('missing products and malformed paths are not indexed, while loading gets a neutral title', () => {
  assert.equal(getPageMeta('/products/missing', [], false).title, 'PETRO | Product')
  for (const path of ['/products/missing', '/products/%E0%A4', '/unknown']) {
    assert.equal(getPageMeta(path).indexable, false)
    assert.equal(getPageMeta(path).title, 'PETRO | Page not found')
  }
})
