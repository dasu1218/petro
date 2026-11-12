import { readFileSync } from 'node:fs';
import Inventory from '../models/Inventory.js';
import ProductSettings from '../models/ProductSettings.js';
import { applyProductSettings } from './productSettings.js';
export const seedProducts = JSON.parse(readFileSync(new URL('../seed-data.json', import.meta.url), 'utf8')).products;
export async function getCatalog(session = null) {
  const inventory = await Inventory.find({}).session(session).lean();
  const settings = await ProductSettings.find({}).session(session).lean();
  const stock = new Map(inventory.map((item) => [item.key, item.stock]));
  return seedProducts.map((seed) => {
    const product = applyProductSettings(seed, settings.find((entry) => entry.slug === seed.slug));
    return { ...product, variants: product.variants.map((variant) => ({
    ...variant, stock: stock.get(`${product.slug}:${variant.label}`) ?? variant.stock,
    })) };
  });
}
