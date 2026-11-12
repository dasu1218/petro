const description = 'Shop PETRO pet care essentials, nutrition, grooming products, and care bundles in Sri Lanka.'
const publicPages = {
  '/': ['Pet Care Essentials', description],
  '/shop': ['Shop', 'Browse PETRO pet care products, available sizes, current prices, and promotions.'],
  '/bundles': ['Care Bundles', 'Explore PETRO care bundles, included products, prices, and availability.'],
  '/wellness': ['Pet Wellness', 'Explore grooming, nutrition, and everyday pet care categories at PETRO.'],
}
const privatePages = { '/login': 'Log in', '/register': 'Create an account', '/account': 'My account', '/cart': 'Your cart', '/checkout': 'Checkout', '/wishlist': 'My wishlist', '/orders': 'My orders', '/admin/products': 'Manage products', '/admin/orders': 'Manage orders' }
export function getPageMeta(pathname, products = [], catalogReady = true) {
  const entry = publicPages[pathname]
  if (entry) return { title: `PETRO | ${entry[0]}`, description: entry[1], indexable: true, type: 'website' }
  if (privatePages[pathname] || pathname.startsWith('/orders/')) return { title: `PETRO | ${privatePages[pathname] || 'Order details'}`, description: 'Manage your PETRO account, shopping, and orders.', indexable: false, type: 'website' }
  const match = pathname.match(/^\/products\/([^/]+)$/)
  if (match) {
    let slug
    try { slug = decodeURIComponent(match[1]) } catch { slug = '' }
    const product = products.find((item) => item.slug === slug)
    if (product) return { title: `${product.name} | PETRO`, description: product.description.slice(0, 160), indexable: true, type: 'product' }
    if (!catalogReady) return { title: 'PETRO | Product', description, indexable: false, type: 'website' }
  }
  return { title: 'PETRO | Page not found', description: 'Find your way back to PETRO pet care products and bundles.', indexable: false, type: 'website' }
}
