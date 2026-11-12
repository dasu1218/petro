import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
const fail = (message, status = 409) => Object.assign(new Error(message), { status });
export function reservedStock(order) {
  if (!Array.isArray(order.items) || !order.items.length) throw fail('This order has no restorable stock snapshot');
  const quantities = new Map();
  for (const item of order.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || !Array.isArray(item.components) || !item.components.length) throw fail('This order has incomplete stock information');
    for (const component of item.components) {
      if (typeof component.slug !== 'string' || !component.slug || typeof component.variantLabel !== 'string' || !component.variantLabel || !Number.isSafeInteger(component.quantity) || component.quantity < 1) throw fail('This order has incomplete component information');
      const key = `${component.slug}:${component.variantLabel}`;
      const quantity = (quantities.get(key) || 0) + item.quantity * component.quantity;
      if (!Number.isSafeInteger(quantity) || quantity > 1000000000) throw fail('The stock snapshot cannot be safely restored');
      quantities.set(key, quantity);
    }
  }
  return quantities;
}
export const cancellationDependencies = { Order, Inventory, startSession: () => mongoose.startSession() };
export async function cancelOrder(id, userId, body, deps = cancellationDependencies) {
  if (typeof body?.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 200) throw fail('Enter a cancellation reason of 1–200 characters', 400);
  const reason = body.reason.trim();
  const session = await deps.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const order = await deps.Order.findById(id).session(session);
      if (!order) throw fail('Order not found', 404);
      if (order.status === 'cancelled') {
        if (!order.cancellation?.stockRestored) throw fail('This cancelled order has no stock restoration record. Review it manually.');
        result = { order, replayed: true }; return;
      }
      if (!['placed', 'processing'].includes(order.status) || order.paymentStatus !== 'unpaid') throw fail('Only unpaid orders that have not shipped can be cancelled');
      const quantities = reservedStock(order);
      const now = new Date();
      const updated = await deps.Order.findOneAndUpdate({ _id: order._id, status: order.status, paymentStatus: 'unpaid' }, {
        $set: { status: 'cancelled', cancellation: { reason, cancelledBy: userId, cancelledAt: now, stockRestored: true } },
        $push: { statusHistory: { status: 'cancelled', changedBy: userId, changedAt: now } },
      }, { new: true, runValidators: true, session });
      if (!updated) throw fail('Order changed. Refresh and review it again.');
      for (const [key, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
        const inventory = await deps.Inventory.findOneAndUpdate({ key, stock: { $lte: 1000000000 - quantity } }, { $inc: { stock: quantity } }, { new: true, runValidators: true, session });
        if (!inventory) throw fail('Stock records are missing or cannot be restored. No cancellation was saved.');
      }
      result = { order: updated, replayed: false };
    });
    return result;
  } finally { await session.endSession(); }
}
