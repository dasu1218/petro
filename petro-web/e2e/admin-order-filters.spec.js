import { test, expect } from '@playwright/test'
import { mockStore } from './fixtures.js'
const makeOrder = (index, changes = {}) => ({ _id: `admin-order-${index}`, status: 'delivered', paymentMethod: 'cod', paymentStatus: 'unpaid', totals: { total: 1000 }, items: [{ slug: 'care-product-1', name: 'Saved product', variantLabel: '250ml', quantity: 1, price: 1000 }], shippingAddress: { fullName: 'Test Customer', addressLine1: '12 Test Road', city: 'Colombo', postalCode: '00700', country: 'Sri Lanka', phone: '0771234567', email: 'customer@example.test' }, deliveryMethod: 'standard', ...changes })

test('admin payment filtering resets pagination, preserves status and survives reload', async ({ page }) => {
  const adminOrders = Array.from({ length: 23 }, (_, i) => makeOrder(i + 1, { paymentStatus: i === 22 ? 'paid' : 'unpaid' }))
  const monitor = await mockStore(page, 'admin', { adminOrders })
  await page.goto('/admin/orders?page=2&status=delivered')
  await expect(page.locator('.order-history > article')).toHaveCount(3)
  const payment = page.getByRole('combobox', { name: 'Filter by payment', exact: true })
  await payment.selectOption('unpaid')
  await expect(page.locator('.order-history > article')).toHaveCount(20)
  let params = new URL(page.url()).searchParams
  expect(params.get('payment')).toBe('unpaid')
  expect(params.get('status')).toBe('delivered')
  expect(params.get('page')).toBeNull()
  await page.reload()
  await expect(payment).toHaveValue('unpaid')
  await expect(page.getByRole('combobox', { name: 'Filter by status', exact: true })).toHaveValue('delivered')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.locator('.order-history > article')).toHaveCount(2)
  params = new URL(page.url()).searchParams
  expect(params.get('page')).toBe('2')
  expect(params.get('payment')).toBe('unpaid')
  await page.getByRole('button', { name: 'Clear order filters', exact: true }).click()
  await expect(page.locator('.order-history > article')).toHaveCount(20)
  await expect(payment).toHaveValue('')
  expect([...new URL(page.url()).searchParams]).toEqual([])
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('admin paid and fulfilment filters combine without including unpaid orders', async ({ page }) => {
  const adminOrders = [makeOrder(1, { paymentStatus: 'paid' }), makeOrder(2), makeOrder(3, { status: 'placed', paymentStatus: 'paid' })]
  const monitor = await mockStore(page, 'admin', { adminOrders })
  await page.goto('/admin/orders?status=delivered&payment=paid')
  await expect(page.locator('.order-history > article')).toHaveCount(1)
  await expect(page.locator('.order-history')).toContainText('Order admin-order-1')
  await page.getByRole('combobox', { name: 'Filter by status', exact: true }).selectOption('placed')
  await expect(page.locator('.order-history > article')).toHaveCount(1)
  await expect(page.locator('.order-history')).toContainText('Order admin-order-3')
  expect(new URL(page.url()).searchParams.get('payment')).toBe('paid')
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
