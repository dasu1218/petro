import { readFileSync } from 'node:fs';
import { BUNDLE_VARIANT, getBundleOffers } from './bundles.js';
import { getCatalog } from './catalog.js';

// The seed catalog is the current product source until product CRUD is implemented.
const { products } = JSON.parse(readFileSync(new URL('../seed-data.json', import.meta.url), 'utf8'));
const accents = ['rose', 'gold', 'teal'];

export function normalizeCartItems(items, bundles = [], catalog = products) {
  if (!Array.isArray(items) || items.length > 100) {
    throw Object.assign(new Error('Cart must contain at most 100 product variants'), { status: 400 });
  }
  const lines = new Map();
  for (const item of items) {
    if (!item || typeof item.slug !== 'string' || typeof item.variantLabel !== 'string' || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw Object.assign(new Error('Each cart item needs a product, variant, and positive integer quantity'), { status: 400 });
    }
    const productIndex = catalog.findIndex((product) => product.slug === item.slug);
    const bundle = bundles.find((entry) => entry.slug === item.slug);
    const product = bundle || catalog[productIndex];
    const variant = product?.variants.find((entry) => entry.label === item.variantLabel);
    if (!variant) throw Object.assign(new Error('Product variant not found'), { status: 400 });
    if (variant.stock <= 0) continue;
    const key = `${product.slug}:${variant.label}`;
    lines.set(key, {
      key, slug: product.slug, name: product.name, accent: bundle?.accent || accents[productIndex % accents.length],
      ...(bundle ? { kind: 'bundle' } : {}),
      variantLabel: variant.label, price: variant.price, stock: variant.stock,
      quantity: Math.min((lines.get(key)?.quantity || 0) + item.quantity, variant.stock),
    });
  }
  return [...lines.values()];
}

export async function normalizeCartRequest(items) {
  const catalog = await getCatalog();
  const needsBundles = Array.isArray(items) && items.some((item) => item?.variantLabel === BUNDLE_VARIANT);
  return normalizeCartItems(items, needsBundles ? await getBundleOffers(catalog) : [], catalog);
}
