import test from 'node:test'
import assert from 'node:assert/strict'
import { initialStockPreview } from './initialStock.js'
test('initial stock summary counts available sizes without changing drafts', () => {
  const variants = [{ label: 'Small', stock: '5' }, { label: 'Large', stock: '0' }]
  assert.deepEqual(initialStockPreview(variants), { error: '', units: 5, sizes: 2, availableSizes: 1 })
  assert.equal(variants[0].stock, '5')
})
test('size names reject duplicates, empty and reserved labels', () => {
  for (const label of ['', 'Care bundle', 'a'.repeat(41)]) assert.ok(initialStockPreview([{ label, stock: '0' }]).error)
  assert.match(initialStockPreview([{ label: ' Small ', stock: '0' }, { label: 'small', stock: '1' }]).error, /unique/)
})
test('initial stock rejects missing, fractional and out-of-range quantities', () => {
  for (const stock of ['', ' ', '-1', '1.5', '1000001', 'invalid']) assert.ok(initialStockPreview([{ label: 'Small', stock }]).error)
  assert.equal(initialStockPreview([{ label: 'Small', stock: '1000000' }]).units, 1000000)
})
