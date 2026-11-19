import { test, expect } from '@playwright/test'
import { mockStore, products } from './fixtures.js'
const bundle = { slug: 'test-care-duo', name: 'Everyday Care Duo', description: 'Two essentials together.', kind: 'bundle', accent: 'rose', savings: 300, regularPrice: 2100, variants: [{ label: 'Care bundle', price: 1800, stock: 10 }], items: products.slice(0, 2).map((product) => ({ slug: product.slug, name: product.name, variantLabel: '250ml', quantity: 1 })) }

test('bundle cards use uploaded product photos with fallbacks and product links', async ({ page }) => {
  const catalog = products.map((product, index) => ({ ...product, images: index < 2 ? [{ url: index === 0 ? 'https://images.example.test/photo.png' : 'https://images.example.test/missing-bundle-photo.jpg', publicId: `test/bundle-${index}` }] : [] }))
  const monitor = await mockStore(page, null, { products: catalog, bundles: [bundle] })
  let releaseBrokenPhoto
  const pendingPhoto = new Promise((resolve) => { releaseBrokenPhoto = resolve })
  await page.route('https://images.example.test/missing-bundle-photo.jpg', async (route) => { await pendingPhoto; await route.abort() })
  await page.goto('/bundles')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: bundle.name, exact: true }) })
  const image = card.getByRole('img', { name: 'Care Product 1', exact: true })
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)
  await expect(card.locator('img.bundle-product-photo')).toHaveCount(2)
  releaseBrokenPhoto()
  await expect(card.getByRole('img', { name: 'Care Product 2: photo unavailable', exact: true })).toBeVisible()
  const contents = card.getByRole('list', { name: 'Included in Everyday Care Duo', exact: true })
  await expect(contents.getByRole('link', { name: 'Care Product 1', exact: true })).toHaveAttribute('href', '/products/care-product-1')
  await card.getByRole('button', { name: 'Add bundle to cart', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Cart, 1 item', exact: true })).toBeVisible()
  await contents.getByRole('link', { name: 'Care Product 1', exact: true }).click()
  await expect(page).toHaveURL(/\/products\/care-product-1$/)
  await expect(page.getByRole('heading', { name: 'Care Product 1', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('bundles without uploaded product photos retain package artwork', async ({ page }) => {
  const monitor = await mockStore(page, null, { bundles: [bundle] })
  await page.goto('/bundles')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: bundle.name, exact: true }) })
  await expect(card.locator('.bundle-package')).toHaveCount(2)
  await expect(card.locator('.bundle-product-photos')).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'Add bundle to cart', exact: true })).toBeEnabled()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('bundle add buttons stop at the cart stock limit and recover after removal', async ({ page }) => {
  const limited = { ...bundle, variants: [{ label: 'Care bundle', price: 1800, stock: 2 }] }
  const monitor = await mockStore(page, null, { bundles: [limited] })
  await page.goto('/bundles')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: bundle.name, exact: true }) })
  const add = card.getByRole('button', { name: 'Add bundle to cart', exact: true })
  await add.click()
  await expect(card.locator('.bundle-cart-stock')).toHaveText('1 already in your cart. You can add up to 1 more.')
  await add.click()
  await expect(card.getByRole('button', { name: 'Already in your cart', exact: true })).toBeDisabled()
  await expect(card.locator('.bundle-cart-stock')).toHaveText('All available units of this bundle are already in your cart.')
  await expect(page.getByRole('button', { name: 'Cart, 2 items', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cart, 2 items', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Your cart (2)', exact: true })
  await drawer.getByRole('button', { name: 'Remove Everyday Care Duo Care bundle from cart', exact: true }).click()
  await page.getByRole('button', { name: 'Close cart', exact: true }).click()
  await expect(add).toBeEnabled()
  await expect(card.locator('.bundle-cart-stock')).toHaveCount(0)
  await add.click()
  await expect(page.getByRole('button', { name: 'Cart, 1 item', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('sold-out bundles cannot be added to the cart', async ({ page }) => {
  const monitor = await mockStore(page, null, { bundles: [{ ...bundle, variants: [{ label: 'Care bundle', price: 1800, stock: 0 }] }] })
  await page.goto('/bundles')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: bundle.name, exact: true }) })
  await expect(card.getByRole('button', { name: 'Out of stock', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cart, 0 items', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
