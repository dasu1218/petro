import { readFileSync } from 'node:fs';

// The seed catalog is the current product source until product CRUD is implemented.
const { products } = JSON.parse(readFileSync(new URL('../seed-data.json', import.meta.url), 'utf8'));
const accents = ['rose', 'gold', 'teal'];

export function normalizeCartItems(items) {
  if (!Array.isArray(items) || items.length > 100) {
    throw Object.assign(new Error('Cart must contain at most 100 product variants'), { status: 400 });
  }
  const lines = new Map();
  for (const item of items) {
    if (!item || typeof item.slug !== 'string' || typeof item.variantLabel !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw Object.assign(new Error('Each cart item needs a product, variant, and positive integer quantity'), { status: 400 });
    }
    const productIndex = products.findIndex((product) => product.slug === item.slug);
    const product = products[productIndex];
    const variant = product?.variants.find((entry) => entry.label === item.variantLabel);
    if (!variant) throw Object.assign(new Error('Product variant not found'), { status: 400 });
    if (variant.stock <= 0) continue;
    const key = `${product.slug}:${variant.label}`;
    lines.set(key, {
      key, slug: product.slug, name: product.name, accent: accents[productIndex % accents.length],
      variantLabel: variant.label, price: variant.price, stock: variant.stock,
      quantity: Math.min((lines.get(key)?.quantity || 0) + item.quantity, variant.stock),
    });
  }
  return [...lines.values()];
}
