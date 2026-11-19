import { test, expect } from '@playwright/test'
import { mockStore } from './fixtures.js'
const id = '507f1f77bcf86cd799439011'
const saved = { _id: id, status: 'delivered', paymentMethod: 'cod', paymentStatus: 'paid', createdAt: '2026-11-19T10:00:00Z', totals: { total: 1000 }, items: [{ name: 'My saved product', variantLabel: '250ml', quantity: 1 }] }

test('customer searches a full order reference and clears it without losing history access', async ({ page }) => {
  const monitor = await mockStore(page, 'customer', { historyOrders: [saved, { ...saved, _id: '507f1f77bcf86cd799439022' }] })
  await page.goto('/orders?page=2&status=delivered')
  const search = page.getByRole('search', { name: 'Find your order', exact: true })
  await search.getByRole('searchbox', { name: 'Order reference', exact: true }).fill(id.toUpperCase())
  await search.getByRole('button', { name: 'Search orders', exact: true }).click()
  await expect(page.locator('.order-history > li')).toHaveCount(1)
  await expect(page.locator('.order-history')).toContainText(id)
  const params = new URL(page.url()).searchParams
  expect(params.get('reference')).toBe(id)
  expect(params.get('status')).toBe('delivered')
  expect(params.get('page')).toBeNull()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(search.getByRole('searchbox', { name: 'Order reference', exact: true })).toHaveValue('')
  await expect(page.locator('.order-history > li')).toHaveCount(2)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('malformed references show validation and missing references return an empty result', async ({ page }) => {
  const monitor = await mockStore(page, 'customer', { historyOrders: [saved] })
  await page.goto('/orders')
  const search = page.getByRole('search', { name: 'Find your order', exact: true })
  const input = search.getByRole('searchbox', { name: 'Order reference', exact: true })
  await input.fill('short')
  await search.getByRole('button', { name: 'Search orders', exact: true }).click()
  await expect(search.getByRole('alert')).toContainText('full 24-character order reference')
  expect(new URL(page.url()).searchParams.has('reference')).toBe(false)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(input).toHaveValue('')
  await expect(search.getByRole('alert')).toHaveCount(0)
  await input.fill('507f1f77bcf86cd799439099')
  await search.getByRole('button', { name: 'Search orders', exact: true }).click()
  await expect(page.locator('.order-history > li')).toHaveCount(0)
  await expect(page.getByText('No orders on this page match your filters.', { exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
