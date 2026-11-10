import { readFileSync } from 'node:fs';
import Bundle from '../models/Bundle.js';
import { defaultBundles } from '../data/bundles.js';

const { products } = JSON.parse(readFileSync(new URL('../seed-data.json', import.meta.url), 'utf8'));
export const BUNDLE_VARIANT = 'Care bundle';

export function buildBundleOffer(bundle, catalog = products) {
  if (bundle.isActive === false || !bundle.items?.length || !Number.isFinite(bundle.price) || bundle.price < 0) return null;
  // Aggregate repeated components so availability cannot overstate component stock.
  const components = new Map();
  for (const item of bundle.items) {
    const key = `${item.slug}:${item.variantLabel}`;
    const product = catalog.find((entry) => entry.slug === item.slug);
    const variant = product?.variants.find((entry) => entry.label === item.variantLabel);
    if (!variant || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return null;
    const previous = components.get(key);
    components.set(key, {
      slug: product.slug, name: product.name, variantLabel: variant.label,
      quantity: (previous?.quantity || 0) + item.quantity, price: variant.price, stock: variant.stock,
    });
  }
  const items = [...components.values()];
  const regularPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const stock = Math.min(...items.map((item) => Math.floor(item.stock / item.quantity)));
  return {
    slug: bundle.slug, name: bundle.name, description: bundle.description,
    kind: 'bundle', accent: bundle.accent, items, regularPrice,
    savings: Math.max(regularPrice - bundle.price, 0),
    variants: [{ label: BUNDLE_VARIANT, price: bundle.price, stock }],
  };
}

export async function getBundleOffers() {
  const stored = await Bundle.find({}).sort({ createdAt: 1, slug: 1 }).lean();
  // Curated defaults keep new installations usable before the optional seed step.
  return (stored.length ? stored : defaultBundles).map((bundle) => buildBundleOffer(bundle)).filter(Boolean);
}
