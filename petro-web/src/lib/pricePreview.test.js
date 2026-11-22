import { test } from 'node:test'
import assert from 'node:assert/strict'
import { productPricePreview } from './pricePreview.js'
test('promotion previews use whole-LKR backend rounding and never reduce a price below one', () => {
  const preview = productPricePreview([{ label: '250ml', price: '1001' }, { label: 'sample', price: '1' }], { enabled: true, percent: '25' })
  assert.deepEqual(preview.rows, [{ label: '250ml', regularPrice: 1001, price: 751, saving: 250 }, { label: 'sample', regularPrice: 1, price: 1, saving: 0 }])
  assert.equal(preview.error, '')
})
test('disabled discounts retain regular prices without mutating the draft', () => {
  const prices = [{ label: '250ml', price: '2000' }]
  const promotion = { enabled: false, percent: 'invalid' }
  assert.equal(productPricePreview(prices, promotion).rows[0].price, 2000)
  assert.deepEqual(prices, [{ label: '250ml', price: '2000' }])
  assert.equal(promotion.percent, 'invalid')
})
test('invalid price and percentage drafts produce validation instead of fabricated prices', () => {
  for (const price of ['', '0', '-1', '1.5', '10000001', 'invalid']) {
    const preview = productPricePreview([{ label: 'size', price }], { enabled: false })
    assert.equal(preview.rows.length, 0); assert.ok(preview.error)
  }
  for (const percent of ['', '0', '91', '1.5', 'invalid']) {
    const preview = productPricePreview([{ label: 'size', price: '1000' }], { enabled: true, percent })
    assert.equal(preview.rows.length, 0); assert.ok(preview.error)
  }
})
