import CatalogProduct from '../models/CatalogProduct.js';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import { validateProductSettings, applyProductSettings } from '../services/productSettings.js';
import { isProductImage } from '../services/imageUpload.js';
import { seedProducts } from '../services/catalog.js';
import ProductSettings from '../models/ProductSettings.js';
import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import productRoutes from '../routes/productRoutes.js';
import { signToken } from '../utils/token.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { normalizeCartItems } from '../services/cartItems.js';

const product = seedProducts[0];
const body = () => ({ images: [{ url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg', publicId: 'petro/photo' }], prices: product.variants.map((variant) => ({ label: variant.label, price: 2000 })), promotion: { enabled: true, label: 'Weekend offer', percent: 20, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z' } });
test('product settings validate variants and reject invalid prices, photos and promotions', () => {
  for (const input of [{ ...body(), images: [{ url: 'javascript:bad', publicId: 'x' }] }, { ...body(), images: Array(7).fill(body().images[0]) }, { ...body(), prices: [{ label: 'unknown', price: 10 }] }, { ...body(), prices: body().prices.map((line) => ({ ...line, price: -1 })) }, { ...body(), promotion: { ...body().promotion, percent: 99 } }, { ...body(), promotion: { ...body().promotion, endsAt: 'invalid' } }, { ...body(), promotion: { ...body().promotion, endsAt: '2026-10-01' } }]) assert.throws(() => validateProductSettings(input, product), { status: 400 });
});
test('promotion schedules use inclusive start and exclusive end with canonical discounted prices', () => {
  const settings = validateProductSettings(body(), product);
  assert.equal(applyProductSettings(product, settings, new Date('2026-10-31T23:59:59Z')).variants[0].price, 2000);
  const active = applyProductSettings(product, settings, new Date('2026-11-01T00:00:00Z'));
  assert.equal(active.variants[0].price, 1600);
  assert.equal(active.variants[0].regularPrice, 2000);
  assert.equal(active.promotion.label, 'Weekend offer');
  assert.equal(active.images[0].publicId, 'petro/photo');
  assert.equal(applyProductSettings(product, settings, new Date('2026-12-01T00:00:00Z')).promotion, null);
  assert.equal(normalizeCartItems([{ slug: product.slug, variantLabel: product.variants[0].label, quantity: 1, price: 1 }], [], [active])[0].price, 1600);
});
test('disabled promotions restore base prices and image checks reject non-images', () => {
  const settings = validateProductSettings({ ...body(), promotion: { enabled: false } }, product);
  assert.equal(applyProductSettings(product, settings).variants[0].price, 2000);
  assert.equal(isProductImage(Buffer.from('<svg><script>bad</script></svg>')), false);
  assert.equal(isProductImage(Buffer.from([255, 216, 255, 1])), true);
  assert.equal(isProductImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), true);
  assert.equal(isProductImage(Buffer.from('RIFF0000WEBP')), true);
});
let server;
let base;
let stored = [];
const original = { settings: ProductSettings.find, update: ProductSettings.findOneAndUpdate, inventory: Inventory.find, user: User.findById };
const originalCatalogFind = CatalogProduct.find;
const originalCatalogExists = CatalogProduct.exists;
before(async () => {
  CatalogProduct.find = () => ({ sort: () => ({ session: () => ({ lean: async () => [] }) }) });
  CatalogProduct.exists = async () => false;
  process.env.JWT_SECRET = 'products-tests-only';
  ProductSettings.find = () => ({ lean: async () => stored, session: () => ({ lean: async () => stored }) });
  ProductSettings.findOneAndUpdate = async ({ slug }, { $set }) => { stored = [{ slug, ...$set }]; };
  Inventory.find = () => ({ session: () => ({ lean: async () => [] }) });
  User.findById = async (id) => ({ _id: id, role: id === 'admin-user' ? 'admin' : 'customer' });
  const app = express(); app.use(express.json()); app.use('/api/products', productRoutes); app.use(errorHandler);
  server = await new Promise((resolve, reject) => { const listener = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve(listener)); listener.on('error', reject); });
  base = `http://127.0.0.1:${server.address().port}/api/products`;
});
after(async () => {
  CatalogProduct.find = originalCatalogFind;
  CatalogProduct.exists = originalCatalogExists;
  ProductSettings.find = original.settings; ProductSettings.findOneAndUpdate = original.update; Inventory.find = original.inventory; User.findById = original.user;
  if (server) await new Promise((resolve) => server.close(resolve));
});
const auth = (id, method = 'GET', value) => ({ method, headers: { Authorization: `Bearer ${signToken(id)}`, 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value) });
test('only admins can read settings or save photos, prices, and offers', async () => {
  assert.equal((await fetch(`${base}/admin`)).status, 401);
  assert.equal((await fetch(`${base}/admin`, auth('customer'))).status, 403);
  assert.equal((await fetch(`${base}/${product.slug}`, auth('customer', 'PUT', body()))).status, 403);
  assert.equal((await fetch(`${base}/admin`, auth('admin-user'))).status, 200);
  const payload = { ...body(), promotion: { enabled: true, label: 'Sale', percent: 20 }, role: 'admin', slug: 'forged' };
  assert.equal((await fetch(`${base}/${product.slug}`, auth('admin-user', 'PUT', payload))).status, 200);
  const { products } = await (await fetch(base)).json();
  assert.equal(products[0].variants[0].price, 1600);
  assert.equal(products[0].images[0].publicId, 'petro/photo');
  assert.equal(stored[0].slug, product.slug);
  assert.equal(stored[0].role, undefined);
});
