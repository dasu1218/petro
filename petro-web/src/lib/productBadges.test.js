import test from 'node:test'
import assert from 'node:assert/strict'
import { productBadges } from './productBadges.js'
test('badge drafts trim, remove empty entries and deduplicate in order', () => {
  assert.deepEqual(productBadges(' Gentle, , Vegan,Gentle, '), { badges: ['Gentle', 'Vegan'], error: '' })
  assert.deepEqual(productBadges(' , '), { badges: [], error: '' })
})
test('badge drafts enforce server count and length limits before deduplication', () => {
  assert.equal(productBadges(Array(6).fill('a'.repeat(40)).join(',')).error, '')
  assert.match(productBadges(Array(7).fill('Gentle').join(',')).error, /six/)
  assert.match(productBadges('a'.repeat(41)).error, /40/)
})
