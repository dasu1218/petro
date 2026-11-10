import { createHash } from 'node:crypto';
import { normalizeCartItems } from './cartItems.js';

export const orderError = (message, status = 400) => Object.assign(new Error(message), { status });
const fields = { fullName: 80, email: 254, phone: 24, addressLine1: 160, addressLine2: 160, city: 80, postalCode: 10 };
export function validateShippingAddress(input) {
  const address = { country: 'Sri Lanka' };
  for (const [field, max] of Object.entries(fields)) {
    const value = input?.[field];
    address[field] = typeof value === 'string' ? value.trim() : '';
    if ((field !== 'addressLine2' && !address[field]) || address[field].length > max) throw orderError(`Invalid shipping address: ${field}`);
  }
  if (input?.country !== 'Sri Lanka') throw orderError('Delivery is available within Sri Lanka');
  if (!/^\S+@\S+\.\S+$/.test(address.email)) throw orderError('Enter a valid email address');
  const digits = address.phone.replace(/\D/g, '');
  if (!/^\+?[\d\s()-]+$/.test(address.phone) || digits.length < 9 || digits.length > 15) throw orderError('Enter a valid phone number');
  return address;
}

export function validateOrderRequest(body = {}) {
  if (!body || typeof body !== 'object') throw orderError('Order details are required');
  const { items, deliveryMethod, expectedTotal, requestId } = body;
  if (body.paymentMethod !== undefined && body.paymentMethod !== 'cod') throw orderError('Cash on Delivery is the available payment method');
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) throw orderError('A valid request ID is required');
  if (!Array.isArray(items) || !items.length || items.length > 100) throw orderError('An order needs between 1 and 100 items');
  const lines = items.map((item) => {
    if (!item || typeof item.slug !== 'string' || typeof item.variantLabel !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) throw orderError('Invalid order item');
    return { slug: item.slug, variantLabel: item.variantLabel, quantity: item.quantity };
  });
  if (!['standard', 'express'].includes(deliveryMethod)) throw orderError('Choose a delivery method');
  if (!Number.isSafeInteger(expectedTotal) || expectedTotal < 0) throw orderError('A valid reviewed total is required');
  const address = validateShippingAddress(body.shippingAddress);
  const request = { items: lines, shippingAddress: address, deliveryMethod, expectedTotal, requestId };
  // Preserve old request hashes so already-saved orders can still be replayed.
  if (body.paymentMethod !== undefined) request.paymentMethod = body.paymentMethod;
  return { ...request, requestHash: createHash('sha256').update(JSON.stringify(request)).digest('hex') };
}

export function buildOrderPlan(request, catalog, bundles) {
  const lines = normalizeCartItems(request.items, bundles, catalog);
  const requested = new Map();
  for (const item of request.items) {
    const key = `${item.slug}:${item.variantLabel}`;
    requested.set(key, (requested.get(key) || 0) + item.quantity);
  }
  if (lines.length !== requested.size || lines.some((item) => item.quantity !== requested.get(item.key))) throw orderError('Some items no longer have enough stock. Update your cart.', 409);
  const demand = new Map();
  const items = lines.map((line) => {
    const bundle = bundles.find((entry) => entry.slug === line.slug);
    const components = bundle ? bundle.items.map(({ slug, variantLabel, quantity }) => ({ slug, variantLabel, quantity })) : [{ slug: line.slug, variantLabel: line.variantLabel, quantity: 1 }];
    for (const component of components) {
      const key = `${component.slug}:${component.variantLabel}`;
      demand.set(key, (demand.get(key) || 0) + component.quantity * line.quantity);
    }
    return { slug: line.slug, name: line.name, variantLabel: line.variantLabel, kind: bundle ? 'bundle' : 'product', price: line.price, quantity: line.quantity, components };
  });
  for (const [key, quantity] of demand) {
    const available = catalog.flatMap((product) => product.variants.map((variant) => ({ key: `${product.slug}:${variant.label}`, stock: variant.stock }))).find((entry) => entry.key === key)?.stock || 0;
    if (quantity > available) throw orderError('Products and bundles in your cart need more stock than is available. Reduce the quantities.', 409);
  }
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = request.deliveryMethod === 'standard' ? (subtotal >= 4500 ? 0 : 350) : 650;
  const totals = { subtotal, delivery, total: subtotal + delivery };
  if (request.expectedTotal !== totals.total) throw orderError('Prices have changed. Refresh your cart and review the updated total.', 409);
  return { items, demand, totals, shippingAddress: request.shippingAddress, deliveryMethod: request.deliveryMethod };
}
