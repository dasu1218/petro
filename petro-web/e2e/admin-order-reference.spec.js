import { test, expect } from '@playwright/test'
import { mockStore } from './fixtures.js'
const id = '507f1f77bcf86cd799439011'
const order = { _id: id, status: 'delivered', paymentMethod: 'cod', paymentStatus: 'paid', totals: { total: 1000 }, items: [{ slug: 'care-product-1', name: 'Saved product', variantLabel: '250ml', quantity: 1, price: 1000 }], shippingAddress: { fullName: 'Test Customer', addressLine1: '12 Test Road', city: 'Colombo', postalCode: '00700', country: 'Sri Lanka' }, deliveryMethod: 'standard' }

test('admin finds an order by reference with filters retained and page reset', async ({ page }) => {
  const monitor = await mockStore(page, 'admin', { adminOrders: [order, { ...order, _id: '507f1f77bcf86cd799439022' }] })
  await page.goto('/admin/orders?page=2&status=delivered&payment=paid')
  const search = page.getByRole('search', { name: 'Find customer order', exact: true })
  const input = search.getByRole('searchbox', { name: 'Customer order reference', exact: true })
  await input.fill(id.toUpperCase())
  await search.getByRole('button', { name: 'Find order', exact: true }).click()
  await expect(page.locator('.order-history > article')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: `Order ${id}`, exact: true })).toBeVisible()
  const params = new URL(page.url()).searchParams
  expect(params.get('reference')).toBe(id)
  expect(params.get('status')).toBe('delivered')
  expect(params.get('payment')).toBe('paid')
  expect(params.get('page')).toBeNull()
  await page.reload()
  await expect(input).toHaveValue(id)
  await expect(page.locator('.order-history > article')).toHaveCount(1)
  await page.getByRole('button', { name: 'Clear order filters', exact: true }).click()
  await expect(input).toHaveValue('')
  await expect(page.locator('.order-history > article')).toHaveCount(2)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('admin reference search validates input and shows no result for an unknown reference', async ({ page }) => {
  const monitor = await mockStore(page, 'admin', { adminOrders: [order] })
  await page.goto('/admin/orders')
  const search = page.getByRole('search', { name: 'Find customer order', exact: true })
  const input = search.getByRole('searchbox', { name: 'Customer order reference', exact: true })
  await input.fill('short')
  await search.getByRole('button', { name: 'Find order', exact: true }).click()
  await expect(search.getByRole('alert')).toContainText('full 24-character order reference')
  await page.getByRole('button', { name: 'Clear order filters', exact: true }).click()
  await expect(input).toHaveValue('')
  await expect(search.getByRole('alert')).toHaveCount(0)
  await input.fill('507f1f77bcf86cd799439099')
  await search.getByRole('button', { name: 'Find order', exact: true }).click()
  await expect(page.getByText('No orders match this filter.', { exact: true })).toBeVisible()
  await expect(page.locator('.order-history > article')).toHaveCount(0)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
