export const products = Array.from({ length: 8 }, (_, index) => ({
  slug: `care-product-${index + 1}`, name: `Care Product ${index + 1}`,
  description: 'Pet care product used only in browser smoke tests.',
  category: index % 2 ? 'nutrition' : 'skin-care', images: [], badges: ['Care'],
  variants: [{ label: '250ml', price: 1000 + index * 100, regularPrice: 1000 + index * 100, stock: 10 }],
}))
export async function mockStore(page, role = null, options = {}) {
  const user = role ? { id: role === 'admin' ? 'admin-user' : 'customer-user', name: role === 'admin' ? 'Admin Tester' : 'Customer Tester', email: `${role}@example.test`, role, addresses: [], defaultAddressId: null } : null
  let cartItems = []
  const orderRequests = []
  const orders = new Map()
  let firstOrderResponse = true
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
    if (path === '/cart') {
      if (method === 'PUT') cartItems = route.request().postDataJSON().items
      return json({ items: cartItems })
    }
    if (path === '/orders' && method === 'POST') {
      const payload = route.request().postDataJSON()
      orderRequests.push(payload)
      let order = orders.get(payload.requestId)
      if (!order) {
        const items = payload.items.map((item) => {
          const product = products.find((entry) => entry.slug === item.slug)
          return { ...item, name: product.name, price: product.variants[0].price }
        })
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        order = { _id: '507f1f77bcf86cd799439011', items, shippingAddress: payload.shippingAddress, deliveryMethod: payload.deliveryMethod, paymentMethod: payload.paymentMethod, paymentStatus: 'unpaid', status: 'placed', statusHistory: [], createdAt: '2026-11-13T00:00:00Z', totals: { subtotal, delivery: payload.expectedTotal - subtotal, total: payload.expectedTotal } }
        orders.set(payload.requestId, order)
      }
      if (options.failFirstOrderResponse && firstOrderResponse) {
        firstOrderResponse = false
        return json({ message: 'The order response is unavailable. Please retry the original order.' }, 503)
      }
      return json({ order }, orderRequests.length === 1 ? 201 : 200)
    }
    if (path.startsWith('/orders/') && method === 'GET') {
      const order = [...orders.values()].find((entry) => path === `/orders/${entry._id}`)
      return order ? json({ order }) : json({ message: 'Order not found' }, 404)
    }
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
  return { errors, unexpected, savedProducts, orderRequests, orders }
}
