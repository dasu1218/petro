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


test('product opens on an available size and sold-out sizes remain inspectable', async ({ page }) => {
  const product = { ...products[0], variants: [
    { label: '250ml', price: 1000, stock: 0 },
    { label: '500ml', price: 1800, stock: 4 },
  ] }
  const monitor = await mockStore(page, null, { products: [product] })
  await page.goto(`/products/${product.slug}`)
  const selected = page.locator('.variant-option[aria-pressed="true"]')
  await expect(selected).toContainText('500ml')
  await expect(page.locator('.stock-status')).toHaveText('4 in stock')
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true })).toBeEnabled()
  await page.locator('.variant-option').filter({ hasText: '250ml' }).click()
  await expect(selected).toContainText('250ml')
  await expect(page.locator('.detail-price')).toHaveText('LKR 1,000')
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true })).toBeDisabled()
  await expect(page.getByRole('group', { name: 'Quantity', exact: true })).toHaveCount(0)
  await page.locator('.variant-option').filter({ hasText: '500ml' }).click()
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await expect(page.locator('.detail-cart-feedback')).toContainText('1 × Care Product 1 (500ml) added.')
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('a fully sold-out product shows its first size without allowing purchase', async ({ page }) => {
  const monitor = await mockStore(page, null, { products: [{ ...products[0], variants: [
    { label: '250ml', price: 1000, stock: 0 },
    { label: '500ml', price: 1800, stock: 0 },
  ] }] })
  await page.goto('/products/care-product-1')
  await expect(page.locator('.variant-option[aria-pressed="true"]')).toContainText('250ml')
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Show size guide view', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Choose 250ml from size guide', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Choose 500ml from size guide', exact: true })).toBeDisabled()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('wishlist shows the lowest size price, promotion and sold-out availability', async ({ page }) => {
  const catalog = [
    { ...products[0], variants: [{ label: '500ml', price: 2000, stock: 0 }, { label: '250ml', price: 900, regularPrice: 1000, stock: 4 }], promotion: { label: 'Care offer', percent: 10 } },
    { ...products[1], variants: [{ label: '250ml', price: 1100, stock: 0 }] },
  ]
  const monitor = await mockStore(page, 'customer', { products: catalog, wishlistSlugs: catalog.map((product) => product.slug) })
  await page.goto('/wishlist')
  const first = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Care Product 1', exact: true }) })
  await expect(first).toContainText('From LKR 900')
  await expect(first).toContainText('Care offer · 10% off')
  await expect(first).toContainText('Available sizes in stock')
  const second = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Care Product 2', exact: true }) })
  await expect(second).toContainText('Currently out of stock')
  await first.getByRole('link', { name: 'View sizes for Care Product 1', exact: true }).click()
  await expect(page).toHaveURL(/products\/care-product-1$/)
  await expect(page.locator('.variant-option[aria-pressed="true"]')).toContainText('250ml')
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('customers can remove unavailable wishlist entries without changing available products', async ({ page }) => {
  const monitor = await mockStore(page, 'customer', { wishlistSlugs: ['care-product-1', 'hidden-care'], unavailableSlugs: ['hidden-care'] })
  await page.goto('/wishlist')
  const unavailable = page.getByRole('region', { name: 'Unavailable saved products' })
  await expect(unavailable).toContainText('hidden-care')
  await unavailable.getByRole('button', { name: 'Remove hidden-care from wishlist', exact: true }).click()
  await expect(unavailable).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Care Product 1', exact: true })).toBeVisible()
  expect(monitor.wishlistRequests).toEqual(['DELETE /wishlist/hidden-care'])
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('failed unavailable wishlist removal retains the entry and shows a retryable error', async ({ page }) => {
  const monitor = await mockStore(page, 'customer', { wishlistSlugs: ['hidden-care'], unavailableSlugs: ['hidden-care'], failWishlistRemoval: true })
  await page.goto('/wishlist')
  const remove = page.getByRole('button', { name: 'Remove hidden-care from wishlist', exact: true })
  await remove.click()
  await expect(page.getByRole('alert')).toContainText('Could not remove saved product. Try again.')
  await expect(remove).toBeEnabled()
  await expect(page.getByRole('region', { name: 'Unavailable saved products' })).toBeVisible()
  expect(monitor.wishlistRequests).toEqual(['DELETE /wishlist/hidden-care'])
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('admin uploads and publishes a homepage bundle image, then restores the placeholder', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/admin/products')
  const editor = page.getByRole('region', { name: 'Homepage bundle image', exact: true })
  await editor.getByLabel('Upload homepage photo', { exact: true }).setInputFiles({ name: 'bundles.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7WQAAAAASUVORK5CYII=', 'base64') })
  await expect(editor.getByRole('img')).toBeVisible()
  expect(monitor.homepageSaves).toHaveLength(0)
  await editor.getByLabel('Image description', { exact: true }).fill('My pet care bundle photo')
  await editor.getByRole('button', { name: 'Save homepage image', exact: true }).click()
  await expect(editor.getByText('Homepage image saved.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page.getByRole('img', { name: 'My pet care bundle photo', exact: true })).toBeVisible()
  await page.goto('/admin/products')
  await editor.getByRole('button', { name: 'Remove homepage photo', exact: true }).click()
  await editor.getByRole('button', { name: 'Save homepage image', exact: true }).click()
  await expect(editor.getByText('Homepage image saved.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page.locator('.homepage-hero-photo')).toContainText('🐾')
  expect(monitor.homepageSaves).toHaveLength(2)
  expect(monitor.homepageSaves[1]).toEqual({ image: null, alt: '' })
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('homepage image drafts can be discarded without overwriting the published image', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  await page.goto('/admin/products')
  const editor = page.getByRole('region', { name: 'Homepage bundle image', exact: true })
  const save = editor.getByRole('button', { name: 'Save homepage image', exact: true })
  await expect(save).toBeDisabled()
  const upload = () => editor.getByLabel('Upload homepage photo', { exact: true }).setInputFiles({ name: 'bundles.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7WQAAAAASUVORK5CYII=', 'base64') })
  await upload()
  await expect(editor.getByText('Unpublished homepage changes.', { exact: false })).toBeVisible()
  await editor.getByRole('button', { name: 'Discard homepage changes', exact: true }).click()
  await expect(editor.getByRole('img')).toHaveCount(0)
  await expect(save).toBeDisabled()
  expect(monitor.homepageSaves).toHaveLength(0)
  await upload()
  await save.click()
  await expect(editor.getByText('Homepage image saved.', { exact: true })).toBeVisible()
  await expect(save).toBeDisabled()
  const description = editor.getByLabel('Image description', { exact: true })
  await description.fill('Unpublished description')
  await editor.getByRole('button', { name: 'Discard homepage changes', exact: true }).click()
  await expect(description).toHaveValue('Everyday pet care bundles')
  await editor.getByRole('button', { name: 'Remove homepage photo', exact: true }).click()
  await editor.getByRole('button', { name: 'Discard homepage changes', exact: true }).click()
  await expect(editor.getByRole('img')).toBeVisible()
  await expect(save).toBeDisabled()
  await expect(editor.getByRole('link', { name: 'Open published homepage ↗' })).toHaveAttribute('target', '_blank')
  expect(monitor.homepageSaves).toHaveLength(1)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('failed homepage saves preserve the photo and description for retry', async ({ page }) => {
  const monitor = await mockStore(page, 'admin', { failFirstHomepageSave: true })
  await page.goto('/admin/products')
  const editor = page.getByRole('region', { name: 'Homepage bundle image', exact: true })
  await editor.getByLabel('Upload homepage photo', { exact: true }).setInputFiles({ name: 'bundles.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7WQAAAAASUVORK5CYII=', 'base64') })
  const description = editor.getByLabel('Image description', { exact: true })
  await description.fill('Keep this bundle preview')
  const save = editor.getByRole('button', { name: 'Save homepage image', exact: true })
  await save.click()
  await expect(editor.getByRole('alert')).toContainText('Homepage image could not be saved.')
  await expect(description).toHaveValue('Keep this bundle preview')
  await expect(editor.getByRole('img')).toBeVisible()
  await expect(save).toBeEnabled()
  await expect(editor.getByRole('button', { name: 'Reload homepage image', exact: true })).toHaveCount(0)
  expect(monitor.homepageSaves).toHaveLength(0)
  await save.click()
  await expect(editor.getByText('Homepage image saved.', { exact: true })).toBeVisible()
  await expect(save).toBeDisabled()
  expect(monitor.homepageSaves).toHaveLength(1)
  expect(monitor.homepageSaves[0].alt).toBe('Keep this bundle preview')
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('failed initial homepage loading blocks editing and can be retried', async ({ page }) => {
  const monitor = await mockStore(page, 'admin')
  // Keep both Strict Mode load attempts failing until the explicit retry.
  let allowLoad = false
  await page.route('**/api/homepage', async (route) => {
    if (!allowLoad) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Homepage image could not be loaded.' }) })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ image: null, alt: '' }) })
  })
  await page.goto('/admin/products')
  const editor = page.getByRole('region', { name: 'Homepage bundle image', exact: true })
  await expect(editor.getByRole('alert')).toContainText('Homepage image could not be loaded.')
  await expect(editor.getByLabel('Upload homepage photo', { exact: true })).toHaveCount(0)
  await expect(editor.getByRole('button', { name: 'Save homepage image', exact: true })).toHaveCount(0)
  allowLoad = true
  await editor.getByRole('button', { name: 'Reload homepage image', exact: true }).click()
  await expect(editor.getByLabel('Upload homepage photo', { exact: true })).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Save homepage image', exact: true })).toBeDisabled()
  await expect(editor.getByRole('alert')).toHaveCount(0)
  expect(monitor.homepageSaves).toHaveLength(0)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('broken product photos show a placeholder and another gallery photo can still load', async ({ page }) => {
  const catalog = [{ ...products[0], images: [
    { url: 'https://images.example.test/missing-product.jpg', publicId: 'test/missing' },
    { url: 'https://images.example.test/photo.png', publicId: 'test/working' },
  ] }]
  const monitor = await mockStore(page, 'customer', { products: catalog, wishlistSlugs: ['care-product-1'] })
  await page.goto('/shop')
  await expect(page.getByRole('img', { name: 'Care Product 1: photo unavailable', exact: true })).toBeVisible()
  await page.getByRole('heading', { name: 'Care Product 1', exact: true }).getByRole('link').click()
  await expect(page.locator('.detail-gallery-main .product-photo-fallback')).toBeVisible()
  await page.getByRole('button', { name: 'Show photo 2', exact: true }).click()
  const photo = page.locator('img.detail-photo')
  await expect(photo).toBeVisible()
  await expect(photo).toHaveAttribute('src', 'https://images.example.test/photo.png')
  expect(await photo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.getByRole('button', { name: 'Show photo 1', exact: true }).click()
  await expect(page.locator('.detail-gallery-main .product-photo-fallback')).toBeVisible()
  await page.goto('/wishlist')
  await expect(page.getByRole('img', { name: 'Care Product 1: photo unavailable', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Care Product 1: photo unavailable', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('cart drawer and full cart show the current product photo', async ({ page }) => {
  const photoUrl = 'https://images.example.test/photo.png'
  const monitor = await mockStore(page, null, { products: [{ ...products[0], images: [{ url: photoUrl, publicId: 'test/cart' }] }] })
  await page.goto('/products/care-product-1')
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await page.getByRole('button', { name: 'Cart, 1 item', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Your cart (1)', exact: true })
  const photo = drawer.locator('img.cart-product-photo')
  await expect(photo).toBeVisible()
  await expect(photo).toHaveAttribute('src', photoUrl)
  await drawer.getByRole('link', { name: 'View cart', exact: true }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.locator('main img.cart-product-photo')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your cart', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('broken cart photos fall back without disrupting quantities or removal', async ({ page }) => {
  const monitor = await mockStore(page, null, { products: [{ ...products[0], images: [{ url: 'https://images.example.test/broken-cart.jpg', publicId: 'test/broken-cart' }] }] })
  await page.goto('/products/care-product-1')
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await page.getByRole('button', { name: 'Cart, 1 item', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Your cart (1)', exact: true })
  await expect(drawer.locator('.cart-product-photo.product-photo-fallback')).toBeVisible()
  await drawer.getByRole('link', { name: 'View cart', exact: true }).click()
  const cart = page.locator('main')
  await expect(cart.locator('.cart-product-photo.product-photo-fallback')).toBeVisible()
  await cart.getByRole('button', { name: 'Increase quantity', exact: true }).click()
  await expect(cart).toContainText('2 items ready for checkout.')
  await cart.getByRole('button', { name: 'Remove Care Product 1 250ml from cart', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('clearing the cart requires confirmation and can be cancelled by button or Escape', async ({ page }) => {
  const monitor = await mockStore(page)
  await page.goto('/products/care-product-1')
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await page.getByRole('link', { name: 'Cart', exact: true }).click()
  const cart = page.locator('main')
  const clear = cart.getByRole('button', { name: 'Clear cart', exact: true })
  await clear.click()
  const confirmation = cart.getByRole('group', { name: 'Confirm clearing your cart', exact: true })
  await expect(confirmation).toContainText('Remove all 1 item from your cart?')
  const keep = confirmation.getByRole('button', { name: 'Keep my items', exact: true })
  await expect(keep).toBeFocused()
  await keep.click()
  await expect(clear).toBeFocused()
  await expect(cart.getByText('1 item ready for checkout.', { exact: true })).toBeVisible()
  await clear.click()
  await keep.press('Escape')
  await expect(clear).toBeFocused()
  await expect(confirmation).toHaveCount(0)
  await clear.click()
  await confirmation.getByRole('button', { name: 'Clear all items', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('active shop filters can be removed individually without losing other selections', async ({ page }) => {
  const monitor = await mockStore(page)
  await page.goto('/shop?q=Care&category=Skin%20Care&min=1000&max=1500&stock=1&sort=price-high&page=2')
  const chips = page.getByRole('region', { name: 'Active product filters', exact: true })
  await expect(chips.getByRole('button')).toHaveCount(5)
  await chips.getByRole('button', { name: 'Remove category filter: Category: Skin Care', exact: true }).click()
  await expect(page.getByText('Showing 1–6 of 6 products', { exact: true })).toBeVisible()
  let params = new URL(page.url()).searchParams
  expect(params.get('category')).toBeNull()
  expect(params.get('page')).toBeNull()
  expect(params.get('q')).toBe('Care')
  expect(params.get('min')).toBe('1000')
  expect(params.get('stock')).toBe('1')
  expect(params.get('sort')).toBe('price-high')
  await chips.getByRole('button', { name: /Remove maximum price filter:/ }).click()
  await expect(page.getByText('Showing 1–6 of 8 products', { exact: true })).toBeVisible()
  await expect(chips.getByRole('button')).toHaveCount(3)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(chips).toHaveCount(0)
  await expect(page.getByText('Showing 1–6 of 8 products', { exact: true })).toBeVisible()
  params = new URL(page.url()).searchParams
  expect([...params]).toEqual([])
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('order history previews saved products and quantities across pages and filters', async ({ page }) => {
  const historyOrders = Array.from({ length: 21 }, (_, index) => ({
    _id: `saved-order-${index + 1}`, status: index === 20 ? 'cancelled' : 'delivered',
    paymentMethod: 'cod', paymentStatus: index === 20 ? 'unpaid' : 'paid',
    createdAt: '2026-11-16T10:00:00Z', totals: { total: 5000 },
    items: index === 0 ? [
      { slug: 'care-product-1', name: 'Original shampoo name', variantLabel: '250ml', quantity: 2 },
      { slug: 'care-product-2', name: 'Saved tonic', variantLabel: '120ml', quantity: 1 },
      { slug: 'care-product-3', name: 'Saved treats', variantLabel: '100g', quantity: 1 },
      { slug: 'care-product-4', name: 'Fourth saved product', variantLabel: '1kg', quantity: 3 },
    ] : [{ slug: 'care-product-1', name: `Past product ${index + 1}`, variantLabel: '250ml', quantity: 1 }],
  }))
  const monitor = await mockStore(page, 'customer', { historyOrders })
  await page.goto('/orders')
  const first = page.locator('.order-history > li').first()
  await expect(first).toContainText('7 items purchased')
  await expect(first.getByRole('list', { name: 'Purchased products', exact: true }).getByRole('listitem')).toHaveCount(3)
  await expect(first).toContainText('2 × Original shampoo name')
  await expect(first).toContainText('250ml')
  await expect(first).not.toContainText('Fourth saved product')
  await expect(first).toContainText('View order details for the full product list.')
  await expect(first.getByRole('link', { name: 'View details and tracking', exact: true })).toHaveAttribute('href', '/orders/saved-order-1')
  const pages = page.getByRole('navigation', { name: 'Order history pages', exact: true })
  await pages.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator('.order-history')).toContainText('1 × Past product 21')
  await expect(page.locator('.order-history')).toContainText('1 item purchased')
  await page.getByRole('combobox', { name: 'Order status', exact: true }).selectOption('cancelled')
  await expect(pages).toContainText('Page 1')
  await expect(page.locator('.order-history > li')).toHaveCount(1)
  await expect(page.locator('.order-history')).toContainText('Past product 21')
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('product quantity accounts for units already in the cart and reports actual additions', async ({ page }) => {
  const monitor = await mockStore(page, null, { products: [{ ...products[0], variants: [
    { label: '250ml', price: 1000, stock: 3 },
    { label: '500ml', price: 1800, stock: 2 },
  ] }] })
  await page.goto('/products/care-product-1')
  await page.getByRole('button', { name: 'Increase quantity', exact: true }).click()
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
  await expect(page.locator('.detail-cart-feedback')).toContainText('2 × Care Product 1 (250ml) added.')
  await expect(page.locator('.product-cart-stock')).toHaveText('2 already in your cart. You can add up to 1 more.')
  await expect(page.getByRole('button', { name: 'Increase quantity', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Added to cart', exact: true }).click()
  await expect(page.locator('.detail-cart-feedback')).toContainText('1 × Care Product 1 (250ml) added.')
  await expect(page.getByRole('button', { name: 'Already in your cart', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cart, 3 items', exact: true })).toBeVisible()
  await page.locator('.variant-option').filter({ hasText: '500ml' }).click()
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true })).toBeEnabled()
  await page.locator('.variant-option').filter({ hasText: '250ml' }).click()
  await expect(page.getByRole('button', { name: 'Already in your cart', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Cart, 3 items', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Your cart (3)', exact: true })
  await drawer.getByRole('button', { name: 'Remove Care Product 1 250ml from cart', exact: true }).click()
  await page.getByRole('button', { name: 'Close cart', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true })).toBeEnabled()
  await expect(page.locator('.product-cart-stock')).toHaveCount(0)
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})


test('homepage quick add shows its size and price and stops at cart stock limits', async ({ page }) => {
  const monitor = await mockStore(page, null, { products: [{ ...products[0], variants: [
    { label: '100ml', price: 700, stock: 0 },
    { label: '250ml', price: 1000, stock: 1 },
    { label: '500ml', price: 1800, stock: 1 },
  ] }] })
  await page.goto('/')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Care Product 1', exact: true }) })
  await expect(card).toContainText('Quick add: 250ml')
  await expect(card.locator('.product-bottom strong')).toHaveText('LKR 1,000')
  await card.getByRole('button', { name: 'Add Care Product 1 250ml to cart', exact: true }).click()
  await expect(card).toContainText('Quick add: 500ml')
  await expect(card.locator('.product-bottom strong')).toHaveText('LKR 1,800')
  await card.getByRole('button', { name: 'Add Care Product 1 500ml to cart', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Care Product 1: all available stock is in your cart', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cart, 2 items', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cart, 2 items', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Your cart (2)', exact: true })
  await drawer.getByRole('button', { name: 'Remove Care Product 1 250ml from cart', exact: true }).click()
  await page.getByRole('button', { name: 'Close cart', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Add Care Product 1 250ml to cart', exact: true })).toBeEnabled()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})

test('homepage sold-out products cannot be quick-added', async ({ page }) => {
  const monitor = await mockStore(page, null, { products: [{ ...products[0], variants: [{ label: '250ml', price: 1000, stock: 0 }] }] })
  await page.goto('/')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Care Product 1', exact: true }) })
  await expect(card.getByRole('button', { name: 'Care Product 1: out of stock', exact: true })).toBeDisabled()
  await expect(card.locator('.quick-add-size')).toHaveText('Out of stock')
  await expect(page.getByRole('button', { name: 'Cart, 0 items', exact: true })).toBeVisible()
  expect(monitor.errors).toEqual([])
  expect(monitor.unexpected).toEqual([])
})
