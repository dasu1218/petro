import { test, expect } from '@playwright/test'
import { mockStore } from './fixtures.js'

test('logging out in another tab clears account state and admin links', async ({ page, context }) => {
  const first = await mockStore(page, 'admin')
  await page.goto('/account')
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toBeVisible()
  const other = await context.newPage()
  const second = await mockStore(other, 'admin')
  await other.goto('/account')
  await other.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Log in', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('petro_token'))).toBeNull()
  expect(first.errors).toEqual([])
  expect(second.errors).toEqual([])
})

test('refocusing refreshes the server role and hides stale admin controls', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/account')
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toBeVisible()
  monitor.setRole('customer')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toHaveCount(0)
  await expect(page.getByText('Account type: Customer', { exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
})

test('an expired current token signs out and returns protected pages to login', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/account')
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toBeVisible()
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Session expired' }) }))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('heading', { name: 'Log in', exact: true })).toBeVisible()
  await expect(page.getByText('Your session expired. Please log in again.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('petro_token'))).toBeNull()
  expect(monitor.errors).toEqual([])
})

test('a late expiry response for a previous token cannot sign out the current account', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Hi, Admin', exact: true })).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('petro:session-expired', { detail: { token: 'old-unrelated-session' } })))
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('petro_token'))).toBe('browser-test-token')
  expect(monitor.errors).toEqual([])
})

test('temporary session-check failure preserves the token and offers retry', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  let fail = true
  await page.route('**/api/auth/me', (route) => fail ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporarily unavailable' }) }) : route.fallback())
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: "We couldn't check your session", exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('petro_token'))).toBe('browser-test-token')
  fail = false
  await page.getByRole('button', { name: 'Retry session check', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hi, Admin', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
})


test('a different account token in another tab replaces the old admin session', async ({ page, context }) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/account')
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toBeVisible()
  monitor.setSessionUser({ id: 'customer-user', name: 'Customer Tester', email: 'customer@example.test', role: 'customer', addresses: [], defaultAddressId: null })
  const other = await context.newPage()
  await mockStore(other, 'customer', { token: 'customer-tab-token' })
  await other.goto('/account')
  await expect(page.getByRole('heading', { name: 'Hi, Customer', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('petro_token'))).toBe('customer-tab-token')
  expect(monitor.errors).toEqual([])
})
