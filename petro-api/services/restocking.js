import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Inventory from '../models/Inventory.js';
import Restock from '../models/Restock.js';
import { getBaseCatalog } from './catalog.js';
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export function validateRestock(slug, body) {
  if (!body || typeof slug !== 'string' || !slug || typeof body.variantLabel !== 'string' || !body.variantLabel.trim() || body.variantLabel.length > 40) throw fail('Choose a valid product size');
  if (!Number.isSafeInteger(body.quantity) || body.quantity < 1 || body.quantity > 1000000) throw fail('Add a whole quantity between 1 and 1,000,000');
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 200) throw fail('Enter a stock addition note of up to 200 characters');
  if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId)) throw fail('A valid stock request ID is required');
  const data = { slug, variantLabel: body.variantLabel.trim(), quantity: body.quantity, reason: body.reason.trim(), requestId: body.requestId };
  return { ...data, requestHash: createHash('sha256').update(JSON.stringify(data)).digest('hex') };
}
export const restockDependencies = { Inventory, Restock, getBaseCatalog, startSession: () => mongoose.startSession() };
export async function restockProduct(user, slug, body, deps = restockDependencies) {
  const data = validateRestock(slug, body);
  const existing = await deps.Restock.findOne({ user, requestId: data.requestId }).select('+requestHash');
  if (existing) {
    if (existing.requestHash !== data.requestHash) throw fail('This stock request was already used for different details', 409);
    return { restock: existing, replayed: true };
  }
  const session = await deps.startSession();
  let entry;
  try {
    await session.withTransaction(async () => {
      const product = (await deps.getBaseCatalog(session)).find((item) => item.slug === slug);
      const variant = product?.variants.find((item) => item.label === data.variantLabel);
      if (!variant) throw fail('Product size not found', 404);
      const key = `${slug}:${variant.label}`;
      await deps.Inventory.updateOne({ key }, { $setOnInsert: { stock: variant.stock } }, { upsert: true, session });
      // Increment the authoritative remaining quantity; never replace it with a stale total.
      const inventory = await deps.Inventory.findOneAndUpdate({ key, stock: { $lte: 1000000000 - data.quantity } }, { $inc: { stock: data.quantity } }, { new: true, session, runValidators: true });
      if (!inventory) throw fail('The resulting stock quantity is too large', 409);
      [entry] = await deps.Restock.create([{ ...data, user, stockAfter: inventory.stock }], { session });
    });
    return { restock: entry, replayed: false };
  } catch (error) {
    if (error.code === 11000) {
      const saved = await deps.Restock.findOne({ user, requestId: data.requestId }).select('+requestHash');
      if (saved?.requestHash === data.requestHash) return { restock: saved, replayed: true };
      throw fail('Stock changed. Retry the same stock addition.', 409);
    }
    throw error;
  } finally { await session.endSession(); }
}
export function publicRestock(entry) {
  return { id: entry._id, slug: entry.slug, variantLabel: entry.variantLabel, quantity: entry.quantity, reason: entry.reason, stockAfter: entry.stockAfter, createdAt: entry.createdAt };
}
