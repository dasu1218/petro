export const products = Array.from({ length: 8 }, (_, index) => ({
  slug: `care-product-${index + 1}`, name: `Care Product ${index + 1}`,
  description: 'Pet care product used only in browser smoke tests.',
  category: index % 2 ? 'nutrition' : 'skin-care', images: [], badges: ['Care'],
  variants: [{ label: '250ml', price: 1000 + index * 100, regularPrice: 1000 + index * 100, stock: 10 }],
}))
export async function mockStore(page, role = null) {
  const user = role ? { id: role === 'admin' ? 'admin-user' : 'customer-user', name: role === 'admin' ? 'Admin Tester' : 'Customer Tester', email: `${role}@example.test`, role, addresses: [], defaultAddressId: null } : null
  const savedProducts = []
  const settings = new Map()
  const photo = 'https://images.example.test/photo.png'
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7WQAAAAASUVORK5CYII=', 'base64')
  const errors = []
  const unexpected = []
  page.on('pageerror', (error) => errors.push(error.message))
  // Prevent tests from sending requests to a real API or external image/font service.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.href === photo) return route.fulfill({ contentType: 'image/png', body: png })
    if (url.origin !== 'http://127.0.0.1:4175') return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname.slice(4)
    const method = route.request().method()
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/products' && method === 'GET') return json({ products, unavailableSlugs: [] })
    if (path === '/auth/me') return user ? json({ user }) : json({ message: 'Not authorized' }, 401)
    if (path === '/bundles') return json({ bundles: [] })
    if (path === '/wishlist') return json({ slugs: [] })
    if (path === '/cart') return json({ items: method === 'PUT' ? route.request().postDataJSON().items : [] })
    if (path === '/products/admin') return user?.role === 'admin' ? json({ products: products.map((product) => ({ ...product, settings: settings.get(product.slug) || null })) }) : json({ message: 'Admin access required' }, 403)
    if (path === '/upload' && method === 'POST') {
      if (!route.request().headers()['content-type']?.includes('multipart/form-data; boundary=')) return json({ message: 'Missing multipart file boundary' }, 400)
      return json({ url: photo, originalUrl: photo, enhancedUrl: photo, publicId: 'test/photo' }, 201)
    }
    if (path.startsWith('/products/') && method === 'PUT') {
      const slug = path.slice('/products/'.length)
      const payload = route.request().postDataJSON()
      settings.set(slug, payload); savedProducts.push({ slug, ...payload })
      return json({ message: 'Product saved' })
    }
    if (path.startsWith('/admin/inventory/')) return json({ variants: [{ label: '250ml', stock: 10 }], history: [] })
    if (path.startsWith('/reviews/')) return json(path.endsWith('/mine') ? { review: null } : { reviews: [], count: 0, rating: null, hasMore: false })
    unexpected.push(`${method} ${path}`)
    return json({ message: `Unmocked test endpoint: ${method} ${path}` }, 500)
  })
  if (user) await page.addInitScript(() => localStorage.setItem('petro_token', 'browser-test-token'))
  return { errors, unexpected, savedProducts }
}
