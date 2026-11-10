import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import cartRoutes from '../routes/cartRoutes.js';
import { signToken } from '../utils/token.js';
import { normalizeCartItems } from '../services/cartItems.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { mergeCartItems, readCart } from '../../petro-web/src/lib/cart.js';

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
const original = { findUser: User.findById, find: Cart.findOne, update: Cart.findOneAndUpdate, delete: Cart.deleteOne };
before(async () => {
  process.env.JWT_SECRET = 'cart-tests-only-secret';
  User.findById = async (id) => ({ _id: id });
  Cart.findOne = async ({ user }) => carts.has(user) ? { items: carts.get(user) } : null;
  Cart.findOneAndUpdate = async ({ user }, { $set }) => { carts.set(user, $set.items); };
  Cart.deleteOne = async ({ user }) => { carts.delete(user); };
  const app = express();
  app.use(express.json());
  app.use('/api/cart', cartRoutes);
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
