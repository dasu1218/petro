import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOrderPlan, validateOrderRequest } from '../services/orderPlan.js';
import { placeOrder, publicOrder } from '../services/orders.js';
import { seedProducts } from '../services/catalog.js';
import { buildBundleOffer } from '../services/bundles.js';
import { defaultBundles } from '../data/bundles.js';

const body = () => ({
  requestId: 'test-request-1234', deliveryMethod: 'standard', expectedTotal: 2800,
  shippingAddress: { fullName: ' Dasun Perera ', email: 'dasun@example.com', phone: '0771234567', addressLine1: '12 Flower Road', addressLine2: '', city: 'Colombo', postalCode: '00700', country: 'Sri Lanka' },
  items: [{ slug: 'petal-cleanse-shampoo', variantLabel: '250ml', quantity: 1, price: 1 }],
});
const offers = (catalog = seedProducts) => defaultBundles.map((item) => buildBundleOffer(item, catalog)).filter(Boolean);

test('order validation normalizes address and ignores forged item prices and ownership', () => {
  const request = validateOrderRequest({ ...body(), user: 'another-user' });
  const plan = buildOrderPlan(request, seedProducts, offers());
  assert.equal(request.shippingAddress.fullName, 'Dasun Perera');
  assert.equal(plan.items[0].price, 2450);
  assert.deepEqual(plan.totals, { subtotal: 2450, delivery: 350, total: 2800 });
  assert.equal(request.user, undefined);
});
test('invalid addresses, quantities, delivery methods and request IDs are rejected', () => {
  const base = body();
  for (const value of [null, { ...base, items: [] }, { ...base, requestId: 'bad' }, { ...base, deliveryMethod: 'free' }, { ...base, shippingAddress: {} }, { ...base, shippingAddress: { ...base.shippingAddress, country: 'Other' } }, { ...base, items: [{ ...base.items[0], quantity: 0 }] }]) assert.throws(() => validateOrderRequest(value), { status: 400 });
});
test('changed totals and insufficient stock fail rather than silently adjusting an order', () => {
  assert.throws(() => buildOrderPlan(validateOrderRequest({ ...body(), expectedTotal: 1 }), seedProducts, offers()), { status: 409 });
  assert.throws(() => buildOrderPlan(validateOrderRequest({ ...body(), items: [{ ...body().items[0], quantity: 41 }] }), seedProducts, offers()), { status: 409 });
});
test('shared stock is checked across individual products and bundles', () => {
  const request = validateOrderRequest({ ...body(), items: [
    { slug: 'petal-cleanse-shampoo', variantLabel: '250ml', quantity: 39 },
    { slug: 'anti-dermatitis-duo', variantLabel: 'Care bundle', quantity: 2 },
  ] });
  assert.throws(() => buildOrderPlan(request, seedProducts, offers()), { status: 409 });
});
test('bundle component demand and express delivery are computed by the server', () => {
  const request = validateOrderRequest({ ...body(), deliveryMethod: 'express', expectedTotal: 10630, items: [{ slug: 'anti-dermatitis-duo', variantLabel: 'Care bundle', quantity: 2 }] });
  const plan = buildOrderPlan(request, seedProducts, offers());
  assert.equal(plan.demand.get('petal-cleanse-shampoo:250ml'), 2);
  assert.equal(plan.demand.get('calm-coat-tonic:120ml'), 2);
  assert.deepEqual(plan.totals, { subtotal: 9980, delivery: 650, total: 10630 });
});

function fakeDatabase() {
  const state = { stock: new Map(), orders: [], failCreate: false, loseStock: false, ended: 0 };
  const dependencies = {
    Order: {
      findOne: ({ user, requestId }) => ({ select: async () => state.orders.find((order) => order.user === user && order.requestId === requestId) }),
      create: async ([order]) => {
        if (state.failCreate) throw new Error('Database write failed');
        const saved = { ...order, _id: 'order-1' };
        state.orders.push(saved);
        return [saved];
      },
    },
    Inventory: { updateOne: async (filter, update) => {
      if (update.$setOnInsert) {
        if (!state.stock.has(filter.key)) state.stock.set(filter.key, update.$setOnInsert.stock);
        return { modifiedCount: 0 };
      }
      if (state.loseStock || (state.stock.get(filter.key) || 0) < filter.stock.$gte) return { modifiedCount: 0 };
      state.stock.set(filter.key, state.stock.get(filter.key) + update.$inc.stock);
      return { modifiedCount: 1 };
    } },
    getCatalog: async () => seedProducts.map((product) => ({ ...product, variants: product.variants.map((variant) => ({ ...variant, stock: state.stock.get(`${product.slug}:${variant.label}`) ?? variant.stock })) })),
    getBundleOffers: async (catalog) => offers(catalog),
    startSession: async () => ({
      withTransaction: async (callback) => {
        const previous = { stock: new Map(state.stock), orders: [...state.orders] };
        try { return await callback(); } catch (error) { state.stock = previous.stock; state.orders = previous.orders; throw error; }
      },
      endSession: async () => { state.ended += 1; },
    }),
  };
  return { state, dependencies };
}
test('placing an order persists a snapshot, decrements stock, and replays without double decrement', async () => {
  const { state, dependencies } = fakeDatabase();
  const result = await placeOrder('alice', body(), dependencies);
  assert.equal(result.replayed, false);
  assert.equal(result.order.user, 'alice');
  assert.equal(result.order.paymentStatus, 'unpaid');
  assert.equal(state.stock.get('petal-cleanse-shampoo:250ml'), 39);
  const retry = await placeOrder('alice', body(), dependencies);
  assert.equal(retry.replayed, true);
  assert.equal(state.orders.length, 1);
  assert.equal(state.stock.get('petal-cleanse-shampoo:250ml'), 39);
  assert.equal(publicOrder(result.order).requestHash, undefined);
  assert.equal(publicOrder(result.order).requestId, undefined);
});
test('request IDs are scoped to the owner and cannot be reused with changed details', async () => {
  const { state, dependencies } = fakeDatabase();
  await placeOrder('alice', body(), dependencies);
  await assert.rejects(placeOrder('alice', { ...body(), shippingAddress: { ...body().shippingAddress, city: 'Kandy' } }, dependencies), { status: 409 });
  await placeOrder('bob', body(), dependencies);
  assert.equal(state.orders.length, 2);
  assert.equal(state.stock.get('petal-cleanse-shampoo:250ml'), 38);
});
test('failed order creation rolls back stock and always closes the transaction session', async () => {
  const { state, dependencies } = fakeDatabase();
  state.failCreate = true;
  await assert.rejects(placeOrder('alice', body(), dependencies), /Database write failed/);
  assert.equal(state.stock.size, 0);
  assert.equal(state.orders.length, 0);
  assert.equal(state.ended, 1);
});
test('a failed conditional stock update aborts without saving an order', async () => {
  const { state, dependencies } = fakeDatabase();
  state.loseStock = true;
  await assert.rejects(placeOrder('alice', body(), dependencies), { status: 409 });
  assert.equal(state.orders.length, 0);
  assert.equal(state.stock.size, 0);
});
