import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderCsv } from './orderCsv.js'
const order = { _id: 'saved-order', createdAt: '2026-11-19T10:00:00Z', status: 'placed', paymentMethod: 'cod', paymentStatus: 'unpaid', items: [{ name: 'Original product name', variantLabel: '250ml', quantity: 2, price: 1000 }], totals: { subtotal: 2000, delivery: 350, total: 2350 } }
test('CSV exports historical order quantities, prices, totals and unpaid COD amount', () => {
  const csv = orderCsv(order)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"Order reference","saved-order"\r\n'))
  assert.ok(csv.includes('"Original product name","250ml","2","1000","2000"\r\n'))
  assert.ok(csv.includes('"Total (LKR)","2350"\r\n'))
  assert.ok(csv.includes('"Amount due on delivery (LKR)","2350"\r\n'))
})
test('CSV preserves punctuation/newlines and neutralizes formula-like product names and sizes', () => {
  const csv = orderCsv({ ...order, items: [
    { ...order.items[0], name: 'Calm, "daily"\nCare', variantLabel: '100g' },
    { ...order.items[0], name: '\t=HYPERLINK("example")', variantLabel: '+CMD' },
    { ...order.items[0], name: '@SUM(1)', variantLabel: ' -Size' },
  ] })
  assert.ok(csv.includes('"Calm, ""daily""\nCare","100g"'))
  assert.ok(csv.includes('"\'\t=HYPERLINK(""example"")","\'+CMD"'))
  assert.ok(csv.includes('"\'@SUM(1)","\' -Size"'))
})
test('paid, cancelled and unknown-method orders never export a COD amount due', () => {
  for (const changes of [{ paymentStatus: 'paid' }, { status: 'cancelled' }, { paymentMethod: 'unknown' }]) assert.equal(orderCsv({ ...order, ...changes }).includes('Amount due on delivery'), false)
})
