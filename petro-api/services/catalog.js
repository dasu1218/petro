import { readFileSync } from 'node:fs';
import Inventory from '../models/Inventory.js';
import CatalogProduct from '../models/CatalogProduct.js';
import ProductSettings from '../models/ProductSettings.js';
import { applyProductSettings } from './productSettings.js';
export const seedProducts = JSON.parse(readFileSync(new URL('../seed-data.json', import.meta.url), 'utf8')).products;
export async function getBaseCatalog(session = null) {
  const added = await CatalogProduct.find({}).sort({ createdAt: 1, _id: 1 }).session(session).lean();
  return [...seedProducts, ...added.filter((product) => !seedProducts.some((seed) => seed.slug === product.slug))];
}
export async function catalogHasProduct(slug) {
  return seedProducts.some((product) => product.slug === slug) || Boolean(await CatalogProduct.exists({ slug }));
}
export async function getCatalog(session = null) {
  const base = await getBaseCatalog(session);
  const inventory = await Inventory.find({}).session(session).lean();
  const settings = await ProductSettings.find({}).session(session).lean();
  const stock = new Map(inventory.map((item) => [item.key, item.stock]));
  return base.map((seed) => {
    const product = applyProductSettings(seed, settings.find((entry) => entry.slug === seed.slug));
    return { ...product, variants: product.variants.map((variant) => ({
    ...variant, stock: stock.get(`${product.slug}:${variant.label}`) ?? variant.stock,
    })) };
  });
}
