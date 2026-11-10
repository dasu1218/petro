import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import cartRoutes from '../routes/cartRoutes.js';
import bundleRoutes from '../routes/bundleRoutes.js';
import Bundle from '../models/Bundle.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import orderRoutes from '../routes/orderRoutes.js';
import { defaultBundles } from '../data/bundles.js';
import { buildBundleOffer } from '../services/bundles.js';
import { signToken } from '../utils/token.js';
import { normalizeCartItems } from '../services/cartItems.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { getCartItemPath, mergeCartItems, readCart } from '../../petro-web/src/lib/cart.js';

const line = { slug: 'petal-cleanse-shampoo', variantLabel: '250ml', quantity: 2 };
test('catalog overrides client prices and caps stock', () => {
  const [item] = normalizeCartItems([{ ...line, quantity: 200, price: 1, stock: 999 }]);
  assert.equal(item.price, 2450);
  assert.equal(item.stock, 40);
  assert.equal(item.quantity, 40);
});
test('malformed, unknown and oversized carts are rejected', () => {
  for (const input of [null, {}, [null], [{ ...line, quantity: 1.5 }], [{ ...line, quantity: -1 }], [{ ...line, slug: 'unknown' }], Array(101).fill(line)]) assert.throws(() => normalizeCartItems(input), { status: 400 });
});
test('duplicates become one line; empty cart remains empty', () => {
  assert.equal(normalizeCartItems([line, line])[0].quantity, 4);
  assert.deepEqual(normalizeCartItems([]), []);
});
test('login merge is idempotent and preserves account metadata', () => {
  const account = normalizeCartItems([line]);
  const guest = [{ ...account[0], quantity: 3, price: 1 }];
  const merged = mergeCartItems(account, guest);
  assert.equal(merged[0].quantity, 3);
  assert.equal(merged[0].price, 2450);
  assert.deepEqual(mergeCartItems(merged, guest), merged);
});
test('local recovery handles corrupt data and empty pending carts', () => {
  globalThis.localStorage = { getItem: () => 'broken' };
  assert.equal(readCart('cart', null), null);
  globalThis.localStorage.getItem = () => '[]';
  assert.deepEqual(readCart('cart', null), []);
  globalThis.localStorage.getItem = () => JSON.stringify([null, { ...normalizeCartItems([line])[0], quantity: '2' }]);
  assert.deepEqual(readCart('cart'), []);
  delete globalThis.localStorage;
});
let server;
let base;
const carts = new Map();
let storedBundles = [];
const originalBundleFind = Bundle.find;
const originalInventoryFind = Inventory.find;
const originalOrderFind = Order.find;
const originalOrderFindOne = Order.findOne;
const savedOrder = { _id: '507f1f77bcf86cd799439011', user: 'alice', requestId: 'private-id', requestHash: 'private-hash', totals: { total: 2800 } };
const original = { findUser: User.findById, find: Cart.findOne, update: Cart.findOneAndUpdate, delete: Cart.deleteOne };
before(async () => {
  process.env.JWT_SECRET = 'cart-tests-only-secret';
  Bundle.find = () => ({ sort: () => ({ session: () => ({ lean: async () => storedBundles }) }) });
  Inventory.find = () => ({ session: () => ({ lean: async () => [] }) });
  Order.find = ({ user }) => ({ sort: () => ({ limit: async () => user === savedOrder.user ? [savedOrder] : [] }) });
  Order.findOne = async ({ user, _id }) => user === savedOrder.user && _id === savedOrder._id ? savedOrder : null;
  User.findById = async (id) => ({ _id: id });
  Cart.findOne = async ({ user }) => carts.has(user) ? { items: carts.get(user) } : null;
  Cart.findOneAndUpdate = async ({ user }, { $set }) => { carts.set(user, $set.items); };
  Cart.deleteOne = async ({ user }) => { carts.delete(user); };
  const app = express();
  app.use(express.json());
  app.use('/api/cart', cartRoutes);
  app.use('/api/bundles', bundleRoutes);
  app.use('/api/orders', orderRoutes);
  app.use(errorHandler);
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve(listener));
    listener.on('error', reject);
  });
  base = `http://127.0.0.1:${server.address().port}/api/cart`;
});
after(async () => {
  User.findById = original.findUser;
  Cart.findOne = original.find;
  Cart.findOneAndUpdate = original.update;
  Cart.deleteOne = original.delete;
  Bundle.find = originalBundleFind;
  Inventory.find = originalInventoryFind;
  Order.find = originalOrderFind;
  Order.findOne = originalOrderFindOne;
  if (server) await new Promise((resolve) => server.close(resolve));
});
const request = (user, method = 'GET', body) => fetch(base, {
  method,
  headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${signToken(user)}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
test('every cart method requires authentication', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await request(null, method)).status, 401);
});
test('routes save, validate and clear only the authenticated user cart', async () => {
  assert.equal((await request('alice', 'PUT', { items: [line], user: 'bob' })).status, 200);
  assert.equal((await (await request('alice')).json()).items[0].quantity, 2);
  assert.deepEqual(await (await request('bob')).json(), { items: [] });
  assert.equal((await request('alice', 'PUT', { items: [{ ...line, quantity: 0 }] })).status, 400);
  await request('bob', 'DELETE');
  assert.equal((await (await request('alice')).json()).items.length, 1);
  await request('alice', 'DELETE');
  assert.deepEqual(await (await request('alice')).json(), { items: [] });
});

test('bundle offers compute savings and availability from their components', () => {
  const offer = buildBundleOffer(defaultBundles[0]);
  assert.equal(offer.regularPrice, 5630);
  assert.equal(offer.savings, 640);
  assert.equal(offer.variants[0].stock, 18);
  assert.equal(offer.items.length, 2);
  const limited = buildBundleOffer({ ...defaultBundles[0], items: [
    { slug: line.slug, variantLabel: line.variantLabel, quantity: 3 },
    { slug: line.slug, variantLabel: line.variantLabel, quantity: 2 },
  ] });
  assert.equal(limited.variants[0].stock, 8);
  assert.equal(limited.items[0].quantity, 5);
});

test('inactive and invalid bundles are hidden; sold-out bundles remain visible', () => {
  assert.equal(buildBundleOffer({ ...defaultBundles[0], isActive: false }), null);
  assert.equal(buildBundleOffer({ ...defaultBundles[0], price: -1 }), null);
  assert.equal(buildBundleOffer({ ...defaultBundles[0], items: [{ ...line, slug: 'missing' }] }), null);
  const offer = buildBundleOffer(defaultBundles[0], [
    { slug: line.slug, name: 'Shampoo', variants: [{ label: '250ml', price: 2450, stock: 0 }] },
    { slug: 'omega-bites-plus', name: 'Bites', variants: [{ label: '300g', price: 3180, stock: 18 }] },
  ]);
  assert.equal(offer.variants[0].stock, 0);
});

test('bundles list publicly and persist through authenticated cart routes at server prices', async () => {
  const publicResponse = await fetch(base.replace('/cart', '/bundles'));
  assert.equal(publicResponse.status, 200);
  const { bundles } = await publicResponse.json();
  assert.equal(bundles.length, 2);
  const bundle = bundles[0];
  const response = await request('bundle-customer', 'PUT', { items: [{
    slug: bundle.slug, variantLabel: bundle.variants[0].label, quantity: 999, price: 1,
  }] });
  assert.equal(response.status, 200);
  const { items } = await response.json();
  assert.equal(items[0].quantity, 18);
  assert.equal(items[0].price, 4990);
  assert.equal(items[0].kind, 'bundle');
  assert.equal(getCartItemPath(items[0]), `/bundles#${bundle.slug}`);
  assert.equal(getCartItemPath(line), `/products/${line.slug}`);
  assert.equal((await (await request('bundle-customer')).json()).items[0].kind, 'bundle');
});

test('stored bundle definitions drive both listing and cart pricing', async () => {
  storedBundles = [{ ...defaultBundles[0], price: 4500 }];
  try {
    const data = await (await fetch(base.replace('/cart', '/bundles'))).json();
    assert.equal(data.bundles.length, 1);
    assert.equal(data.bundles[0].variants[0].price, 4500);
    const response = await request('bundle-customer', 'PUT', { items: [{
      slug: defaultBundles[0].slug, variantLabel: 'Care bundle', quantity: 1,
    }] });
    assert.equal((await response.json()).items[0].price, 4500);
    storedBundles = [{ ...defaultBundles[0], isActive: false }];
    assert.deepEqual((await (await fetch(base.replace('/cart', '/bundles'))).json()).bundles, []);
  } finally { storedBundles = []; }
});

test('order routes require authentication and scope reads to the current user', async () => {
  const ordersUrl = base.replace('/cart', '/orders');
  for (const [path, method] of [['', 'POST'], ['/my', 'GET'], [`/${savedOrder._id}`, 'GET']]) {
    assert.equal((await fetch(`${ordersUrl}${path}`, { method })).status, 401);
  }
  const auth = (user) => ({ headers: { Authorization: `Bearer ${signToken(user)}` } });
  const aliceOrders = await (await fetch(`${ordersUrl}/my?user=bob`, auth('alice'))).json();
  assert.equal(aliceOrders.orders.length, 1);
  assert.equal(aliceOrders.orders[0].requestHash, undefined);
  assert.equal(aliceOrders.orders[0].requestId, undefined);
  assert.deepEqual((await (await fetch(`${ordersUrl}/my`, auth('bob'))).json()).orders, []);
  assert.equal((await fetch(`${ordersUrl}/${savedOrder._id}`, auth('alice'))).status, 200);
  assert.equal((await fetch(`${ordersUrl}/${savedOrder._id}`, auth('bob'))).status, 404);
  assert.equal((await fetch(`${ordersUrl}/invalid-id`, auth('alice'))).status, 404);
});
