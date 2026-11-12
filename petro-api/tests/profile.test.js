import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import bcrypt from 'bcryptjs';
import express from 'express';
import User from '../models/User.js';
import profileRoutes from '../routes/profileRoutes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { signToken } from '../utils/token.js';

const alice = '507f1f77bcf86cd799439011';
const bob = '507f191e810c19729de860ea';
const password = bcrypt.hashSync('test-password', 4);
let users;
let server;
let base;
const originalFind = User.findById;
const address = { label: 'Home', fullName: 'Alice', email: 'alice@example.com', phone: '0771234567', addressLine1: '12 Flower Road', addressLine2: '', city: 'Colombo', postalCode: '00700', country: 'Sri Lanka' };

beforeEach(() => {
  users = new Map([[alice, new User({ _id: alice, name: 'Alice', email: 'alice@example.com', password })], [bob, new User({ _id: bob, name: 'Bob', email: 'bob@example.com', password })]]);
  for (const user of users.values()) user.save = async function () {
    if ([...users.values()].some((other) => other !== this && other.email === this.email)) throw Object.assign(new Error('Duplicate email'), { code: 11000 });
    return this;
  };
});
before(async () => {
  process.env.JWT_SECRET = 'profile-tests-only';
  User.findById = (id) => ({
    then: (resolve, reject) => Promise.resolve(users.get(String(id))).then(resolve, reject),
    select: async () => users.get(String(id)),
  });
  const app = express();
  app.use(express.json());
  app.use('/api/profile', profileRoutes);
  app.use(errorHandler);
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve(listener));
    listener.on('error', reject);
  });
  base = `http://127.0.0.1:${server.address().port}/api/profile`;
});
after(async () => {
  User.findById = originalFind;
  if (server) await new Promise((resolve) => server.close(resolve));
});
const request = (user, path, method, body) => fetch(`${base}${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${signToken(user)}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('profile and every address mutation require authentication', async () => {
  for (const [path, method] of [['', 'PUT'], ['/addresses', 'POST'], [`/addresses/${alice}`, 'PUT'], [`/addresses/${alice}`, 'DELETE'], [`/addresses/${alice}/default`, 'PATCH']]) assert.equal((await request(null, path, method, {})).status, 401);
});
test('profile edits only allowed fields and never exposes credentials', async () => {
  const response = await request(alice, '', 'PUT', { name: ' Alice Updated ', email: 'alice@example.com', role: 'admin', password: 'replacement', addresses: [address], defaultAddressId: bob });
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.equal(user.name, 'Alice Updated');
  assert.equal(user.role, 'customer');
  assert.equal(user.password, undefined);
  assert.deepEqual(user.addresses, []);
  assert.equal(user.defaultAddressId, null);
  assert.equal(users.get(alice).password, password);
});
test('email changes require the current password and normalize the new email', async () => {
  const details = { name: 'Alice', email: 'NEW@example.com' };
  assert.equal((await request(alice, '', 'PUT', details)).status, 400);
  assert.equal((await request(alice, '', 'PUT', { ...details, currentPassword: 'wrong' })).status, 403);
  const response = await request(alice, '', 'PUT', { ...details, currentPassword: 'test-password' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.email, 'new@example.com');
});
test('duplicate email and invalid profile fields return useful errors', async () => {
  assert.equal((await request(alice, '', 'PUT', { name: ' ', email: 'alice@example.com' })).status, 400);
  assert.equal((await request(alice, '', 'PUT', { name: 'Alice', email: 'bad' })).status, 400);
  assert.equal((await request(alice, '', 'PUT', { name: 'Alice', email: 'bob@example.com', currentPassword: 'test-password' })).status, 409);
});
test('addresses support create, edit, default selection and delete with owner isolation', async () => {
  const first = await request(alice, '/addresses', 'POST', { ...address, user: bob, _id: bob });
  assert.equal(first.status, 201);
  let user = (await first.json()).user;
  const id = user.addresses[0]._id;
  assert.notEqual(id, bob);
  assert.equal(user.defaultAddressId, id);
  assert.equal((await request(bob, `/addresses/${id}`, 'PUT', address)).status, 404);
  assert.equal((await request(bob, `/addresses/${id}`, 'DELETE')).status, 404);
  assert.equal((await request(bob, `/addresses/${id}/default`, 'PATCH')).status, 404);
  user = (await (await request(alice, '/addresses', 'POST', { ...address, label: 'Work', isDefault: true })).json()).user;
  const secondId = user.addresses[1]._id;
  assert.equal(user.defaultAddressId, secondId);
  user = (await (await request(alice, `/addresses/${id}`, 'PUT', { ...address, city: 'Kandy' })).json()).user;
  assert.equal(user.addresses[0].city, 'Kandy');
  user = (await (await request(alice, `/addresses/${id}/default`, 'PATCH')).json()).user;
  assert.equal(user.defaultAddressId, id);
  user = (await (await request(alice, `/addresses/${id}`, 'DELETE')).json()).user;
  assert.equal(user.defaultAddressId, secondId);
  user = (await (await request(alice, `/addresses/${secondId}`, 'DELETE')).json()).user;
  assert.deepEqual(user.addresses, []);
  assert.equal(user.defaultAddressId, null);
});
test('invalid addresses, missing IDs and the address limit are enforced', async () => {
  for (const value of [{ ...address, label: '' }, { ...address, phone: 'bad' }, { ...address, country: 'Other' }, { ...address, isDefault: 'true' }]) assert.equal((await request(alice, '/addresses', 'POST', value)).status, 400);
  assert.equal((await request(alice, '/addresses/invalid', 'DELETE')).status, 404);
  for (let i = 0; i < 10; i += 1) assert.equal((await request(alice, '/addresses', 'POST', { ...address, label: `Address ${i}` })).status, 201);
  assert.equal((await request(alice, '/addresses', 'POST', address)).status, 400);
});
test('concurrent profile edits produce a retryable conflict', async () => {
  users.get(alice).save = async () => { throw Object.assign(new Error('Conflict'), { name: 'VersionError' }); };
  const response = await request(alice, '', 'PUT', { name: 'Updated', email: 'alice@example.com' });
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /another session/);
});
