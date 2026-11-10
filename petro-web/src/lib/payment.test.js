import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getOrderPayment } from './payment.js'
import { getCheckoutFingerprint, validateCheckout } from './checkout.js'

const codOrder = { paymentMethod: 'cod', paymentStatus: 'unpaid', status: 'placed', totals: { total: 2800 } }

test('unpaid COD displays the full confirmed amount due on delivery', () => {
  const payment = getOrderPayment(codOrder)
  assert.equal(payment.methodLabel, 'Cash on Delivery')
  assert.equal(payment.statusLabel, 'Due on delivery')
  assert.equal(payment.amountDue, 2800)
  assert.match(payment.message, /cash/)
})
test('paid COD orders do not ask for another payment', () => {
  const payment = getOrderPayment({ ...codOrder, paymentStatus: 'paid' })
  assert.equal(payment.statusLabel, 'Paid')
  assert.equal(payment.amountDue, null)
  assert.equal(payment.message, 'Payment has been recorded.')
})
test('cancelled orders do not request delivery payment', () => {
  const payment = getOrderPayment({ ...codOrder, status: 'cancelled' })
  assert.equal(payment.amountDue, null)
  assert.match(payment.message, /No delivery payment is due/)
})
test('legacy and unknown payment methods are not silently labeled COD', () => {
  for (const paymentMethod of [undefined, null, 'unknown']) {
    const payment = getOrderPayment({ ...codOrder, paymentMethod })
    assert.equal(payment.methodLabel, 'Payment method not recorded')
    assert.equal(payment.amountDue, null)
    assert.match(payment.message, /confirm payment arrangements/)
  }
})
test('checkout validates payment selection and includes it in the reviewed details', () => {
  const address = { fullName: 'Dasun', email: 'dasun@example.com', phone: '0771234567', addressLine1: '12 Flower Road', city: 'Colombo', postalCode: '00700' }
  assert.deepEqual(validateCheckout(address, 'standard', 'cod').errors, {})
  assert.ok(validateCheckout(address, 'standard', 'card').errors.paymentMethod)
  assert.notEqual(getCheckoutFingerprint([], address, 'standard', 'cod'), getCheckoutFingerprint([], address, 'standard', 'card'))
})
