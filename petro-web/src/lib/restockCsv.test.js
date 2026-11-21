import { test } from 'node:test'
import assert from 'node:assert/strict'
import { restockHistoryCsv } from './restockCsv.js'
const product = { name: 'Care product', slug: 'care-product' }
const history = [{ id: 'addition-1', createdAt: '2026-11-21T10:00:00Z', variantLabel: '250ml', quantity: 3, reason: 'Supplier, "Monday" delivery', stockAfter: 13 }, { id: 'addition-2', createdAt: '2026-11-20T10:00:00Z', variantLabel: '500ml', quantity: 2, reason: 'Delivery', stockAfter: 8 }]
test('stock CSV records only shown additions with product context and historical stock counts', () => {
  const csv = restockHistoryCsv(product, history)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"Product URL","care-product"\r\n'))
  assert.ok(csv.includes('"Additions exported","2"\r\n'))
  assert.ok(csv.includes('"Units added in shown entries","5"\r\n'))
  assert.ok(csv.includes('"250ml","3","Supplier, ""Monday"" delivery","13"'))
  assert.ok(csv.includes('"500ml","2","Delivery","8"'))
})
test('stock CSV neutralizes formula-like text and safely represents empty history', () => {
  const csv = restockHistoryCsv({ ...product, name: '=Product' }, [{ ...history[0], reason: '@Supplier' }])
  assert.ok(csv.includes('"Product name","\'=Product"'))
  assert.ok(csv.includes('"\'@Supplier"'))
  const empty = restockHistoryCsv(product, [])
  assert.ok(empty.includes('"Additions exported","0"'))
  assert.ok(empty.includes('"Units added in shown entries","0"'))
  assert.equal(empty.includes('addition-1'), false)
})
