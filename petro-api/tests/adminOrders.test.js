import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import routes from '../routes/adminOrderRoutes.js';
import { validateStatusChange } from '../services/orderManagement.js';
import { signToken } from '../utils/token.js';
import { errorHandler } from '../middleware/errorHandler.js';
let server, base, order;
const id = '507f1f77bcf86cd799439011';
const original = { user: User.findById, find: Order.find, byId: Order.findById, update: Order.findOneAndUpdate };
beforeEach(() => { order = { _id: id, status: 'placed', paymentMethod: 'cod', paymentStatus: 'unpaid', requestHash: 'private', requestId: 'private', statusHistory: [] }; });
before(async () => {
  process.env.JWT_SECRET = 'admin-orders-tests';
  User.findById = async (id) => ({ _id: id, role: id === 'admin' ? 'admin' : 'customer' });
  Order.findById = async (key) => key === id ? { ...order } : null;
  Order.find = (filter) => ({ sort: () => ({ skip: () => ({ limit: async () => !filter.status || order.status === filter.status ? [order] : [] }) }) });
  Order.findOneAndUpdate = async (filter, update) => {
    if (filter._id !== id || Object.entries(filter).some(([key, value]) => order[key] !== value)) return null;
    Object.assign(order, update.$set);
    if (update.$push) order.statusHistory.push(update.$push.statusHistory);
    return order;
  };
  const app = express(); app.use(express.json()); app.use('/orders', routes); app.use(errorHandler);
  server = await new Promise((resolve, reject) => { const s = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve(s)); s.on('error', reject); });
  base = `http://127.0.0.1:${server.address().port}/orders`;
});
after(async () => { User.findById = original.user; Order.find = original.find; Order.findById = original.byId; Order.findOneAndUpdate = original.update; if (server) await new Promise((resolve) => server.close(resolve)); });
const request = (path = '', method = 'GET', body, user = 'admin') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${signToken(user)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
test('fulfilment is sequential and terminal states cannot change', () => {
  validateStatusChange('placed', 'processing'); validateStatusChange('shipped', 'delivered');
  for (const [from, to] of [['placed','delivered'], ['shipped','placed'], ['delivered','processing'], ['cancelled','placed'], ['placed','cancelled']]) assert.throws(() => validateStatusChange(from,to), { status: 409 });
});
test('customers and anonymous users cannot list orders or mutate status or payment', async () => {
  for (const [path, method] of [['','GET'], [`/${id}/status`,'PUT'], [`/${id}/payment`,'PUT'], [`/${id}/cancel`,'POST']]) {
    assert.equal((await request(path,method,undefined,null)).status,401);
    assert.equal((await request(path,method,undefined,'customer')).status,403);
  }
});
test('admin listing filters orders and strips retry secrets', async () => {
  const data = await (await request()).json(); assert.equal(data.orders.length,1); assert.equal(data.orders[0].requestHash,undefined);
  assert.equal((await (await request('?status=delivered')).json()).orders.length,0);
  assert.equal((await request('?status=invalid')).status,400); assert.equal((await request('?page=-1')).status,400);
});
test('status changes record the admin and reject invalid or stale transitions', async () => {
  assert.equal((await request(`/${id}/status`,'PUT',{status:'delivered'})).status,409);
  assert.equal((await request(`/${id}/status`,'PUT',{status:'processing',paymentStatus:'paid'})).status,200);
  assert.equal(order.paymentStatus,'unpaid'); assert.equal(order.statusHistory[0].changedBy,'admin');
  assert.equal((await request(`/${id}/status`,'PUT',{status:'processing'})).status,409);
  assert.equal((await request('/invalid/status','PUT',{status:'processing'})).status,404);
});
test('cash can be recorded only once on a delivered unpaid COD order', async () => {
  assert.equal((await request(`/${id}/payment`,'PUT',{paymentStatus:'paid'})).status,409);
  order.status='delivered';
  assert.equal((await request(`/${id}/payment`,'PUT',{paymentStatus:'unpaid'})).status,400);
  assert.equal((await request(`/${id}/payment`,'PUT',{paymentStatus:'paid',paidBy:'forged'})).status,200);
  assert.equal(order.paidBy,'admin'); assert.ok(order.paidAt instanceof Date);
  assert.equal((await request(`/${id}/payment`,'PUT',{paymentStatus:'paid'})).status,409);
});
test('legacy payment methods cannot be marked COD paid', async () => {
  order.status='delivered'; delete order.paymentMethod;
  assert.equal((await request(`/${id}/payment`,'PUT',{paymentStatus:'paid'})).status,409);
});
