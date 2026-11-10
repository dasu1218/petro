import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import { getCatalog, seedProducts } from './catalog.js';
import { getBundleOffers } from './bundles.js';
import { buildOrderPlan, orderError, validateOrderRequest } from './orderPlan.js';

export const orderDependencies = {
  Order, Inventory, getCatalog, getBundleOffers,
  startSession: () => mongoose.startSession(),
};

export async function placeOrder(userId, body, dependencies = orderDependencies) {
  const request = validateOrderRequest(body);
  const { Order, Inventory } = dependencies;
  const existing = await Order.findOne({ user: userId, requestId: request.requestId }).select('+requestHash');
  if (existing) {
    if (existing.requestHash !== request.requestHash) throw orderError('This request ID belongs to different order details.', 409);
    return { order: existing, replayed: true };
  }
  const session = await dependencies.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const catalog = await dependencies.getCatalog(session);
      const bundles = await dependencies.getBundleOffers(catalog, session);
      const plan = buildOrderPlan(request, catalog, bundles);
      for (const [key, quantity] of [...plan.demand].sort(([a], [b]) => a.localeCompare(b))) {
        const initial = seedProducts.flatMap((product) => product.variants.map((variant) => ({ key: `${product.slug}:${variant.label}`, stock: variant.stock }))).find((entry) => entry.key === key);
        if (!initial) throw orderError('Product is unavailable', 409);
        await Inventory.updateOne({ key }, { $setOnInsert: { stock: initial.stock } }, { upsert: true, session });
        const result = await Inventory.updateOne({ key, stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { session });
        if (result.modifiedCount !== 1) throw orderError('Stock changed while placing your order. Review your cart and try again.', 409);
      }
      [order] = await Order.create([{
        user: userId, requestId: request.requestId, requestHash: request.requestHash,
        items: plan.items, shippingAddress: plan.shippingAddress, deliveryMethod: plan.deliveryMethod,
        totals: plan.totals, status: 'placed', paymentStatus: 'unpaid',
      }], { session });
    });
    return { order, replayed: false };
  } catch (error) {
    if (error.code === 11000) {
      const saved = await Order.findOne({ user: userId, requestId: request.requestId }).select('+requestHash');
      if (saved?.requestHash === request.requestHash) return { order: saved, replayed: true };
      throw orderError('The order or stock changed. Retry with the same order details.', 409);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export function publicOrder(order) {
  const value = typeof order.toObject === 'function' ? order.toObject() : { ...order };
  delete value.requestHash;
  delete value.requestId;
  delete value.__v;
  return value;
}
