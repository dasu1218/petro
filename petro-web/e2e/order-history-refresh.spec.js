import { test, expect } from '@playwright/test'
import { mockStore } from './fixtures.js'
const history = () => Array.from({ length: 11 }, (_, index) => ({ _id: `saved-order-${index + 1}`, status: 'placed', paymentMethod: 'cod', paymentStatus: 'unpaid', createdAt: '2026-11-19T10:00:00Z', totals: { total: 1000 }, items: [{ name: `Saved product ${index + 1}`, variantLabel: '250ml', quantity: 1 }] }))

test('customer history refresh preserves page, filters, sorting and an unfinished reference search', async ({ page }) => {
  const historyOrders = history()
  const monitor = await mockStore(page, 'customer', { historyOrders })
  await page.goto('/orders?page=2&status=placed&sort=oldest')
  await expect(page.locator('.order-history')).toContainText('Saved product 1')
  const reference = page.getByRole('searchbox', { name: 'Order reference', exact: true })
  await reference.fill('507f1f77bcf86cd799439011')
  historyOrders[0].items[0].name = 'Updated saved order details'
  await page.getByRole('button', { name: 'Refresh order history', exact: true }).click()
  await expect(page.locator('.order-history')).toContainText('Updated saved order details')
  await expect(reference).toHaveValue('507f1f77bcf86cd799439011')
  const params = new URL(page.url()).searchParams
  expect(params.get('page')).toBe('2')
  expect(params.get('status')).toBe('placed')
  expect(params.get('sort')).toBe('oldest')
  expect(params.has('reference')).toBe(false)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('failed customer history refresh keeps last orders and supports retry', async ({ page }) => {
  const historyOrders = history().slice(0, 1)
  const monitor = await mockStore(page, 'customer', { historyOrders })
  let fail = false
  await page.route('**/api/orders/my?*', (route) => fail ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Order updates unavailable.' }) }) : route.fallback())
  await page.goto('/orders?status=placed')
  await expect(page.locator('.order-history')).toContainText('Saved product 1')
  const input = page.getByRole('searchbox', { name: 'Order reference', exact: true })
  await input.fill('unfinished')
  fail = true
  await page.getByRole('button', { name: 'Refresh order history', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Showing previously loaded orders.')
  await expect(page.locator('.order-history')).toContainText('Saved product 1')
  await expect(input).toHaveValue('unfinished')
  fail = false
  historyOrders[0].items[0].name = 'Latest saved order details'
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.order-history')).toContainText('Latest saved order details')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(input).toHaveValue('unfinished')
  expect(new URL(page.url()).searchParams.get('status')).toBe('placed')
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
