import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adminOrdersCsv } from './adminOrdersCsv.js'
const order = { _id: 'saved-order', status: 'delivered', paymentMethod: 'cod', paymentStatus: 'unpaid', createdAt: '2026-11-21T00:00:00Z', items: [{ name: 'Original, "saved" name', variantLabel: '250ml', quantity: 2, price: 1000 }], totals: { subtotal: 2000, delivery: 350, total: 2350 } }
test('admin CSV exports exactly the supplied page with filter context and saved amounts', () => {
  const csv = adminOrdersCsv([order], { page: 3, status: 'delivered', payment: 'unpaid', reference: '' })
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"Page","3"\r\n'))
  assert.ok(csv.includes('"Orders exported","1"\r\n'))
  assert.ok(csv.includes('"Payment status filter","unpaid"\r\n'))
  assert.ok(csv.includes('"2 × Original, ""saved"" name (250ml)"'))
  assert.ok(csv.includes('"2","2000","350","2350","2350"'))
})
test('admin CSV neutralizes formula text and leaves paid COD amount due empty', () => {
  const csv = adminOrdersCsv([{ ...order, _id: '=unsafe-reference', paymentStatus: 'paid' }], { page: 1, status: '', payment: '', reference: '@filter' })
  assert.ok(csv.includes('"\'=unsafe-reference"'))
  assert.ok(csv.includes('"Reference filter","\'@filter"'))
  assert.ok(csv.includes('"2350",""\r\n'))
})
