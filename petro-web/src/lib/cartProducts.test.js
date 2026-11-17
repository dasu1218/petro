import assert from 'node:assert/strict'
import { test } from 'node:test'
import { refreshCartProducts } from './cart.js'
const item = { slug: 'shampoo', variantLabel: '250ml', price: 2000, stock: 10, quantity: 4 }
test('catalog refresh updates cart prices and stock, caps quantity, and leaves fixed-price bundles alone', () => {
  const bundle = { ...item, kind: 'bundle', price: 4990 }
  const updated = refreshCartProducts([item, bundle], [{ slug: 'shampoo', variants: [{ label: '250ml', price: 1600, stock: 3 }] }])
  assert.equal(updated[0].price, 1600)
  assert.equal(updated[0].quantity, 3)
  assert.equal(updated[1], bundle)
})
test('catalog refresh avoids unnecessary cart saves and removes sold-out lines', () => {
  const items = [item]
  assert.equal(refreshCartProducts(items, []), items)
  assert.equal(refreshCartProducts(items, [{ slug: 'shampoo', variants: [{ label: '250ml', price: 2000, stock: 10 }] }]), items)
  assert.deepEqual(refreshCartProducts(items, [{ slug: 'shampoo', variants: [{ label: '250ml', price: 2000, stock: 0 }] }]), [])
})

test('renaming a product refreshes cart display names without changing product keys or quantities', () => {
  const original = { ...item, name: 'Original name', key: 'shampoo:250ml' }
  const updated = refreshCartProducts([original], [{ slug: 'shampoo', name: 'Updated name', variants: [{ label: '250ml', price: 2000, stock: 10 }] }])
  assert.equal(updated[0].name, 'Updated name')
  assert.equal(updated[0].key, original.key)
  assert.equal(updated[0].quantity, original.quantity)
})

test('explicitly archived products leave the cart but a missing/loading catalog does not clear it', () => {
  const items = [{ ...item }]
  assert.equal(refreshCartProducts(items, []), items)
  assert.deepEqual(refreshCartProducts(items, [], [item.slug]), [])
})
