import { test, expect } from '@playwright/test'
import jsQR from 'jsqr'
import { mockStore, products } from './fixtures.js'
const id = '507f1f77bcf86cd799439011'
const order = { _id: id, status: 'placed', paymentMethod: 'cod', paymentStatus: 'unpaid', createdAt: '2026-11-17T00:00:00Z', statusHistory: [], items: [{ slug: products[0].slug, name: 'Saved product', variantLabel: '250ml', quantity: 1, price: 1000 }], shippingAddress: { fullName: 'Test Customer', addressLine1: '12 Private Road', city: 'Colombo', postalCode: '00700', country: 'Sri Lanka' }, deliveryMethod: 'standard', totals: { subtotal: 1000, delivery: 350, total: 1350 } }

test('order QR scans to its protected link, downloads and remains printable', async ({ page }, info) => {
  const monitor = await mockStore(page, 'customer')
  monitor.orders.set('fixture-order', order)
  await page.goto(`/orders/${id}?ignored=private`)
  const image = page.getByRole('img', { name: `Scan to open order ${id}`, exact: true })
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)
  const pixels = await image.evaluate((img) => {
    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
    const context = canvas.getContext('2d'); context.drawImage(img, 0, 0)
    return { width: canvas.width, height: canvas.height, data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data) }
  })
  const decoded = jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)
  expect(decoded?.data).toBe(`http://127.0.0.1:4175/orders/${id}`)
  expect(decoded.data).not.toContain('Private Road')
  expect(decoded.data).not.toContain('browser-test-token')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download order QR', exact: true }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe(`petro-order-${id}.png`)
  await page.emulateMedia({ media: 'print' })
  await expect(image).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download order QR', exact: true })).toBeHidden()
  await page.screenshot({ path: info.outputPath('order-qr-print.png'), fullPage: true })
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('opening a scanned link as a guest requires login instead of exposing the order', async ({ page }) => {
  const monitor = await mockStore(page)
  monitor.orders.set('fixture-order', order)
  await page.goto(`/orders/${id}`)
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
  await expect(page.getByText('12 Private Road', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('img', { name: `Scan to open order ${id}`, exact: true })).toHaveCount(0)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
