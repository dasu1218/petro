import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestProductSlug, productPathPreview } from './productSlug.js'
test('product URL suggestions normalize accents, spacing and punctuation', () => {
  assert.equal(suggestProductSlug('  Café & Pet Shampoo! 250ml '), 'cafe-pet-shampoo-250ml')
  assert.equal(suggestProductSlug('🐾 !!!'), '')
  assert.equal(suggestProductSlug('A'.repeat(99) + ' B'), 'a'.repeat(99))
  assert.equal(suggestProductSlug('A'.repeat(120)).length, 100)
})
test('URL preview accepts only complete valid product slugs', () => {
  assert.equal(productPathPreview('pet-care-250'), '/products/pet-care-250')
  for (const value of ['', 'UPPER', '-pet', 'pet-', 'pet--care', 'pet/care', 'a'.repeat(101)]) assert.equal(productPathPreview(value), '')
})
