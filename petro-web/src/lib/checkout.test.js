import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCheckoutFingerprint, getCheckoutTotals, validateCheckout } from './checkout.js'

const address = {
  fullName: '  Dasun Perera ', email: 'dasun@example.com', phone: '+94 77 123 4567',
  addressLine1: '12 Flower Road', addressLine2: '', city: 'Colombo', postalCode: '00700',
}
const cart = [{ key: 'shampoo:250ml', price: 2450, quantity: 1, stock: 40 }]

test('address validation trims fields, permits optional address line, and fixes country', () => {
  const result = validateCheckout({ ...address, country: 'Other' }, 'standard')
  assert.deepEqual(result.errors, {})
  assert.equal(result.address.fullName, 'Dasun Perera')
  assert.equal(result.address.country, 'Sri Lanka')
  assert.equal(result.address.addressLine2, '')
})
test('blank required fields, invalid contact details and unknown delivery methods are rejected', () => {
  const { errors } = validateCheckout({ ...address, fullName: ' ', email: 'bad-email', phone: 'call me', city: '' }, 'unknown')
  for (const field of ['fullName', 'email', 'phone', 'city', 'deliveryMethod']) assert.ok(errors[field])
  assert.equal(errors.addressLine2, undefined)
})
test('overlong address values and invalid phone lengths are rejected', () => {
  assert.ok(validateCheckout({ ...address, addressLine1: 'a'.repeat(161) }, 'standard').errors.addressLine1)
  for (const phone of ['1234', '1234567890123456', '+94 abc 1234567']) assert.ok(validateCheckout({ ...address, phone }, 'standard').errors.phone)
  assert.deepEqual(validateCheckout({ ...address, phone: '077-123-4567' }, 'express').errors, {})
})
test('standard delivery fees apply below the free threshold', () => {
  assert.deepEqual(getCheckoutTotals(cart, 'standard'), { subtotal: 2450, delivery: 350, total: 2800 })
  assert.equal(getCheckoutTotals([{ price: 4499, quantity: 1 }], 'standard').delivery, 350)
})
test('standard delivery becomes free at the exact threshold and stays free above it', () => {
  assert.equal(getCheckoutTotals([{ price: 4500, quantity: 1 }], 'standard').delivery, 0)
  assert.deepEqual(getCheckoutTotals([{ price: 4990, quantity: 2, kind: 'bundle' }], 'standard'), { subtotal: 9980, delivery: 0, total: 9980 })
})
test('express fees still apply above the threshold; empty carts have no fees', () => {
  assert.deepEqual(getCheckoutTotals([{ price: 4990, quantity: 1 }], 'express'), { subtotal: 4990, delivery: 650, total: 5640 })
  assert.deepEqual(getCheckoutTotals([], 'express'), { subtotal: 0, delivery: 0, total: 0 })
  assert.throws(() => getCheckoutTotals(cart, 'unknown'))
})
test('checkout review becomes stale when cart, stock, address or delivery changes', () => {
  const initial = getCheckoutFingerprint(cart, address, 'standard')
  assert.equal(getCheckoutFingerprint(cart, address, 'standard'), initial)
  for (const patch of [{ quantity: 2 }, { price: 2500 }, { stock: 1 }]) assert.notEqual(getCheckoutFingerprint([{ ...cart[0], ...patch }], address, 'standard'), initial)
  assert.notEqual(getCheckoutFingerprint(cart, { ...address, city: 'Kandy' }, 'standard'), initial)
  assert.notEqual(getCheckoutFingerprint(cart, address, 'express'), initial)
})
