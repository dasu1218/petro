import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkoutAddress, defaultSavedAddress } from './addresses.js'
import { getCheckoutFingerprint } from './checkout.js'

const user = { name: 'Alice', email: 'alice@example.com', defaultAddressId: 'home', addresses: [{ _id: 'home', label: 'Home', fullName: 'Recipient', email: 'recipient@example.com', phone: '0771234567', addressLine1: '12 Flower Road', addressLine2: '', city: 'Colombo', postalCode: '00700', country: 'Sri Lanka' }] }
test('default address is selected by ID; accounts without saved addresses fall back safely', () => {
  assert.equal(defaultSavedAddress(user)._id, 'home')
  assert.equal(defaultSavedAddress({ ...user, defaultAddressId: 'missing' }), null)
  assert.equal(defaultSavedAddress({ name: 'Alice' }), null)
  const draft = checkoutAddress(null, user)
  assert.equal(draft.fullName, 'Alice')
  assert.equal(draft.email, 'alice@example.com')
  assert.equal(draft.addressLine1, '')
})
test('checkout copies address fields and excludes saved address metadata', () => {
  const saved = defaultSavedAddress(user)
  const draft = checkoutAddress(saved, user)
  assert.equal(draft.fullName, 'Recipient')
  assert.equal(draft.label, undefined)
  assert.equal(draft._id, undefined)
  draft.city = 'Kandy'
  assert.equal(saved.city, 'Colombo')
  assert.notEqual(getCheckoutFingerprint([], draft, 'standard'), getCheckoutFingerprint([], checkoutAddress(saved, user), 'standard'))
})
