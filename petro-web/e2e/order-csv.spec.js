import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { mockStore } from './fixtures.js'
test('customers download a CSV of their saved order and printing hides the action', async ({ page }) => {
  const monitor = await mockStore(page, 'customer')
  const id = '507f1f77bcf86cd799439011'
  monitor.orders.set('csv-order', { _id: id, status: 'placed', paymentMethod: 'cod', paymentStatus: 'unpaid', createdAt: '2026-11-19T00:00:00Z', statusHistory: [], items: [{ slug: 'care-product-1', name: 'Original, "saved" name', variantLabel: '250ml', price: 1000, quantity: 2 }], totals: { subtotal: 2000, delivery: 350, total: 2350 }, deliveryMethod: 'standard', shippingAddress: { fullName: 'Customer Tester', addressLine1: '12 Test Road', city: 'Colombo', postalCode: '00700', country: 'Sri Lanka' } })
  await page.goto(`/orders/${id}`)
  const button = page.getByRole('button', { name: 'Download order CSV', exact: true })
  await expect(button).toBeVisible()
  const downloading = page.waitForEvent('download')
  await button.click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe(`petro-order-${id}.csv`)
  const csv = await readFile(await download.path(), 'utf8')
  expect(csv).toContain('"Original, ""saved"" name","250ml","2","1000","2000"')
  expect(csv).toContain('"Total (LKR)","2350"')
  expect(csv).toContain('"Amount due on delivery (LKR)","2350"')
  expect(csv).not.toContain('browser-test-token')
  await page.emulateMedia({ media: 'print' })
  await expect(button).toBeHidden()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
