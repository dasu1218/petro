import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import Inventory from '../../models/Inventory.js';
import Restock from '../../models/Restock.js';
import ProductSettings from '../../models/ProductSettings.js';
import CatalogProduct from '../../models/CatalogProduct.js';
import Bundle from '../../models/Bundle.js';
import { placeOrder, orderDependencies } from '../../services/orders.js';
import { restockProduct } from '../../services/restocking.js';
import { cancelOrder } from '../../services/orderCancellation.js';

const databaseName = 'petro_transaction_tests';
const stockKey = 'petal-cleanse-shampoo:250ml';
const models = [Order, Inventory, Restock, ProductSettings, CatalogProduct, Bundle];
let replica, alice, bob, admin;
const request = (extra = {}) => ({
  requestId: randomUUID(), paymentMethod: 'cod', deliveryMethod: 'standard', expectedTotal: 2800,
  shippingAddress: { fullName:'Test Customer',email:'customer@example.test',phone:'0771234567',addressLine1:'12 Test Road',addressLine2:'',city:'Colombo',postalCode:'00700',country:'Sri Lanka' },
  items:[{slug:'petal-cleanse-shampoo',variantLabel:'250ml',quantity:1}], ...extra,
});
before(async () => {
  assert.equal(mongoose.connection.readyState, 0, 'Tests refuse an existing database connection');
  // Never read MONGO_URI: the only connection is a newly created loopback replica set.
  replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.18' }, replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' } });
  const uri = replica.getUri(databaseName);
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:/);
  await mongoose.connect(uri, { dbName: databaseName });
  for (const model of [...models, User]) { await model.createCollection(); await model.init(); }
  [alice, bob, admin] = await User.create([
    {name:'Alice',email:'alice@example.test',password:'test-password'},
    {name:'Bob',email:'bob@example.test',password:'test-password'},
    {name:'Admin',email:'admin@example.test',password:'test-password',role:'admin'},
  ]);
}, { timeout: 180000 });
beforeEach(async () => {
  assert.equal(mongoose.connection.name, databaseName);
  for (const model of models) await model.deleteMany({});
});
after(async () => {
  try { await mongoose.disconnect(); } finally { if (replica) await replica.stop(); }
});

test('real order transactions persist canonical totals and decrement stock', async () => {
  const result = await placeOrder(alice._id, request({ items:[{slug:'petal-cleanse-shampoo',variantLabel:'250ml',quantity:1,price:1}] }));
  const saved = await Order.findById(result.order._id);
  assert.equal(saved.totals.total,2800);
  assert.equal(saved.items[0].price,2450);
  assert.equal(saved.paymentStatus,'unpaid');
  assert.equal((await Inventory.findOne({key:stockKey})).stock,39);
});

test('two buyers competing for the last unit produce only one order', async () => {
  await Inventory.create({key:stockKey,stock:1});
  const results=await Promise.allSettled([placeOrder(alice._id,request()),placeOrder(bob._id,request())]);
  assert.equal(results.filter((entry)=>entry.status==='fulfilled').length,1);
  const rejected=results.find((entry)=>entry.status==='rejected');
  assert.equal(rejected.reason.status,409);
  assert.equal(await Order.countDocuments(),1);
  assert.equal((await Inventory.findOne({key:stockKey})).stock,0);
});

test('concurrent identical request IDs reserve stock only once', async () => {
  const payload=request();
  const results=await Promise.all([placeOrder(alice._id,payload),placeOrder(alice._id,payload)]);
  assert.equal(String(results[0].order._id),String(results[1].order._id));
  assert.equal(await Order.countDocuments(),1);
  assert.equal((await Inventory.findOne({key:stockKey})).stock,39);
  assert.equal((await placeOrder(alice._id,payload)).replayed,true);
});

test('a forced order-write failure rolls back real inventory changes', async () => {
  await Inventory.create({key:stockKey,stock:10});
  const dependencies={...orderDependencies,Order:{findOne:(...args)=>Order.findOne(...args),create:async()=>{throw new Error('Injected order-write failure');}}};
  await assert.rejects(placeOrder(alice._id,request(),dependencies),/Injected order-write failure/);
  assert.equal(await Order.countDocuments(),0);
  assert.equal((await Inventory.findOne({key:stockKey})).stock,10);
});

test('real restocking and cancellation restore stock exactly once', async () => {
  const created=await placeOrder(alice._id,request());
  const addition={variantLabel:'250ml',quantity:5,reason:'Test delivery',requestId:randomUUID()};
  await restockProduct(admin._id,'petal-cleanse-shampoo',addition);
  assert.equal((await restockProduct(admin._id,'petal-cleanse-shampoo',addition)).replayed,true);
  assert.equal((await Inventory.findOne({key:stockKey})).stock,44);
  await cancelOrder(created.order._id,admin._id,{reason:'Customer request'});
  assert.equal((await cancelOrder(created.order._id,admin._id,{reason:'Retry'})).replayed,true);
  assert.equal((await Inventory.findOne({key:stockKey})).stock,45);
  assert.equal(await Restock.countDocuments(),1);
  assert.equal((await Order.findById(created.order._id)).status,'cancelled');
});

test('shared component shortages reject product-plus-bundle orders before stock writes', async () => {
  const payload=request({ items:[{slug:'petal-cleanse-shampoo',variantLabel:'250ml',quantity:39},{slug:'anti-dermatitis-duo',variantLabel:'Care bundle',quantity:2}] });
  await assert.rejects(placeOrder(alice._id,payload),{status:409});
  assert.equal(await Order.countDocuments(),0);
  assert.equal(await Inventory.countDocuments(),0);
});
