import { test, expect } from '@playwright/test'
import { mockStore, products } from './fixtures.js'

test('shop remains full-width without horizontal overflow and supports search and pagination', async ({ page }, info) => {
  const monitor = await mockStore(page)
  await page.goto('/shop')
  await expect(page.getByRole('heading', { name: 'Pet care essentials', exact: true })).toBeVisible()
  await expect(page.getByText('Showing 1–6 of 8 products')).toBeVisible()
  const dimensions = await page.evaluate(() => ({ shell: document.querySelector('.app-shell').getBoundingClientRect(), viewport: window.innerWidth, body: document.documentElement.scrollWidth }))
  expect(dimensions.shell.x).toBe(0)
  expect(Math.abs(dimensions.shell.width - dimensions.viewport)).toBeLessThan(1)
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport + 1)
  await page.getByRole('searchbox', { name: 'Search products' }).fill('Care Product 2')
  await expect(page.getByText('Showing 1–1 of 1 products')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Care Product 2', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Showing 7–8 of 8 products')).toBeVisible()
  await expect(page).toHaveURL(/page=2/)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: info.outputPath('shop.png'), fullPage: true })
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('product details add to the cart and the drawer opens and closes', async ({ page }) => {
  const monitor = await mockStore(page)
  await page.goto('/products/care-product-2')
  await expect(page.getByRole('heading', { name: 'Care Product 2', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Cart, 1 item', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cart, 1 item', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Your cart (1)' })).toBeVisible()
  await page.getByRole('button', { name: 'Close cart', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('customer account hides admin links and rejects direct admin navigation', async ({ page }) => {
  const monitor = await mockStore(page, 'customer')
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Hi, Customer' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Manage products', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Admin dashboard', exact: true })).toHaveCount(0)
  await page.goto('/admin/products')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Products & promotions', exact: true })).toHaveCount(0)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('admin can open product management from My Account', async ({ page }, info) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/account')
  await page.getByRole('link', { name: 'Manage products', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/products/)
  await expect(page.getByRole('heading', { name: 'Products & promotions', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add new product', exact: true })).toBeVisible()
  await expect(page.getByText('Stock management', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('admin-products.png'), fullPage: true })
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('admin can select a photo and save its reference to the product', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/admin/products')
  await expect(page.getByRole('heading', { name: 'Products & promotions', exact: true })).toBeVisible()
  await page.getByLabel('Add product photos', { exact: true }).setInputFiles({
    name: 'pet-photo.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7WQAAAAASUVORK5CYII=', 'base64'),
  })
  await expect(page.getByAltText('Product photo 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save product', exact: true }).click()
  await expect(page.getByText('Product saved. Photos, prices, and promotions are now published.', { exact: true }).first()).toBeVisible()
  expect(monitor.savedProducts).toHaveLength(1)
  expect(monitor.savedProducts[0].images[0].publicId).toBe('test/photo')
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('admin product filters preserve drafts and allow explicit selection of hidden products', async ({ page }) => {
  const monitor = await mockStore(page, 'admin', { hiddenSlugs: ['care-product-2'] })
  await page.goto('/admin/products')
  const picker = page.getByRole('combobox', { name: 'Choose a product', exact: true })
  const name = page.getByLabel('Product name', { exact: true })
  await expect(picker.locator('option')).toHaveCount(8)
  await name.fill('Unsaved product name')
  await page.getByRole('searchbox', { name: 'Search admin products' }).fill('CARE-PRODUCT-2')
  await expect(page.getByText('1 of 8 products match.', { exact: true })).toBeVisible()
  await expect(name).toHaveValue('Unsaved product name')
  await page.getByRole('combobox', { name: 'Product visibility', exact: true }).selectOption('visible')
  await expect(picker).toBeDisabled()
  await expect(page.getByText('0 of 8 products match.', { exact: true })).toBeVisible()
  await expect(name).toHaveValue('Unsaved product name')
  await page.getByRole('button', { name: 'Clear product filters', exact: true }).click()
  await expect(picker.locator('option')).toHaveCount(8)
  await expect(name).toHaveValue('Unsaved product name')
  await page.getByRole('combobox', { name: 'Product visibility', exact: true }).selectOption('hidden')
  await expect(page.getByText('1 of 8 products match.', { exact: true })).toBeVisible()
  await picker.selectOption('care-product-2')
  await expect(name).toHaveValue('Care Product 2')
  expect(monitor.savedProducts).toHaveLength(0)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('size guide shows live prices and stock and selects an available size', async ({ page }) => {
  const product = { ...products[0], variants: [
    { label: '250ml', price: 1000, stock: 10 },
    { label: '500ml', price: 1800, regularPrice: 2000, stock: 4 },
    { label: '1L', price: 3000, stock: 0 },
  ] }
  const monitor = await mockStore(page, null, { products: [product] })
  await page.goto(`/products/${product.slug}`)
  await page.getByRole('button', { name: 'Show size guide view', exact: true }).click()
  const guide = page.getByRole('region', { name: `${product.name} size guide view` })
  await expect(guide.getByRole('table', { name: 'Sizes and availability' })).toBeVisible()
  await expect(guide.getByRole('row').filter({ hasText: '500ml' })).toContainText('LKR 1,800')
  await expect(guide.getByRole('button', { name: 'Choose 1L from size guide', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await guide.getByRole('button', { name: 'Choose 500ml from size guide', exact: true }).click()
  await expect(guide.getByRole('button', { name: 'Choose 500ml from size guide', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.variant-option[aria-pressed="true"]')).toContainText('500ml')
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await expect(page.locator('.detail-cart-feedback')).toContainText('1 × Care Product 1 (500ml) added.')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('browsing review pages preserves the customer rating and comment draft', async ({ page }) => {
  const review = (id, comment) => ({ id, authorName: 'Test reviewer', rating: 4, comment })
  const monitor = await mockStore(page, 'customer', {
    ownReview: review('own', 'My saved review'),
    reviewPages: {
      1: { reviews: [review('first', 'First page review')], count: 21, rating: 4, hasMore: true },
      2: { reviews: [review('last', 'Second page review')], count: 21, rating: 4, hasMore: false },
    },
  })
  await page.goto('/products/care-product-1')
  const section = page.locator('#product-reviews')
  const comment = section.getByRole('textbox', { name: 'Your review' })
  const rating = section.getByRole('combobox', { name: 'Rating', exact: true })
  await expect(comment).toHaveValue('My saved review')
  const initialOwnRequests = monitor.reviewRequests.filter((request) => request.endsWith('/mine')).length
  await comment.fill('My unsaved review draft')
  await rating.selectOption('3')
  await section.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(section.getByText('Second page review', { exact: true })).toBeVisible()
  await expect(comment).toHaveValue('My unsaved review draft')
  await expect(rating).toHaveValue('3')
  await section.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(section.getByText('First page review', { exact: true })).toBeVisible()
  await expect(comment).toHaveValue('My unsaved review draft')
  await expect(rating).toHaveValue('3')
  expect(monitor.reviewRequests.filter((request) => request.endsWith('/mine'))).toHaveLength(initialOwnRequests)
  expect(monitor.reviewRequests.some((request) => request.startsWith('PUT'))).toBe(false)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
