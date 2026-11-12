import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canCancelOrder } from './orderActions.js'
test('cancellation controls are only available for unpaid unshipped orders', () => {
  for (const status of ['placed', 'processing']) assert.equal(canCancelOrder({ status, paymentStatus: 'unpaid' }), true)
  for (const status of ['shipped', 'delivered', 'cancelled', 'unknown']) assert.equal(canCancelOrder({ status, paymentStatus: 'unpaid' }), false)
  assert.equal(canCancelOrder({ status: 'placed', paymentStatus: 'paid' }), false)
})
