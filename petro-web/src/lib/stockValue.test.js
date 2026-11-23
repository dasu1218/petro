import test from 'node:test'
import assert from 'node:assert/strict'
import { initialStockValue } from './stockValue.js'
test('initial retail value sums size prices times stock without mutating drafts', () => {
  const variants = [{ label: 'Small', price: '1000', stock: '5' }, { label: 'Large', price: '2000', stock: '3' }]
  assert.deepEqual(initialStockValue(variants), { error: '', value: 11000 })
  assert.equal(variants[0].price, '1000')
  assert.equal(initialStockValue([{ label: 'Small', price: '1000', stock: '0' }]).value, 0)
})
test('invalid quantities, prices and duplicate size names never produce retail values', () => {
  for (const patch of [{ stock: '' }, { price: '1.5' }, { stock: '-1' }, { label: '' }]) {
    const result = initialStockValue([{ label: 'Small', price: '1000', stock: '5', ...patch }])
    assert.ok(result.error)
    assert.equal(result.value, undefined)
  }
  assert.ok(initialStockValue([{ label: 'Small', price: 1, stock: 1 }, { label: 'small', price: 1, stock: 1 }]).error)
})
