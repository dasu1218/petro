import { Router } from 'express';
import mongoose from 'mongoose';
import { protect, admin } from '../middleware/auth.js';
import Order from '../models/Order.js';
import { publicOrder } from '../services/orders.js';
import { cancelOrder } from '../services/orderCancellation.js';
import { validateTracking } from '../services/tracking.js';
import { ORDER_STATUSES, validateStatusChange } from '../services/orderManagement.js';
const router = Router();
router.use(protect, admin);
router.get('/', async (request, response) => {
  const page = Number(request.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return response.status(400).json({ message: 'Invalid page' });
  const filter = {};
  if (request.query.status) {
    if (!ORDER_STATUSES.includes(request.query.status)) return response.status(400).json({ message: 'Invalid order status' });
    filter.status = request.query.status;
  }
  const orders = await Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21);
  response.json({ orders: orders.slice(0, 20).map(publicOrder), page, hasMore: orders.length > 20 });
});
router.put('/:id/status', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Order not found' });
  const order = await Order.findById(request.params.id);
  if (!order) return response.status(404).json({ message: 'Order not found' });
  validateStatusChange(order.status, request.body?.status);
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, {
    $set: { status: request.body.status },
    $push: { statusHistory: { status: request.body.status, changedBy: request.user._id, changedAt: new Date() } },
  }, { new: true, runValidators: true });
  if (!updated) return response.status(409).json({ message: 'Order changed. Refresh before updating again.' });
  response.json({ order: publicOrder(updated) });
});
router.put('/:id/payment', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Order not found' });
  if (request.body?.paymentStatus !== 'paid') return response.status(400).json({ message: 'Only recording collected cash is supported' });
  const order = await Order.findOneAndUpdate({ _id: request.params.id, paymentMethod: 'cod', paymentStatus: 'unpaid', status: 'delivered' }, {
    $set: { paymentStatus: 'paid', paidAt: new Date(), paidBy: request.user._id },
  }, { new: true, runValidators: true });
  if (!order) return response.status(409).json({ message: 'Only unpaid, delivered Cash on Delivery orders can be marked paid. Refresh to check the latest state.' });
  response.json({ order: publicOrder(order) });
});
router.post('/:id/cancel', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Order not found' });
  const result = await cancelOrder(request.params.id, request.user._id, request.body);
  response.json({ order: publicOrder(result.order), replayed: result.replayed });
});
router.put('/:id/tracking', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Order not found' });
  const tracking = validateTracking(request.body);
  const order = await Order.findById(request.params.id);
  if (!order) return response.status(404).json({ message: 'Order not found' });
  if (!['processing', 'shipped'].includes(order.status)) return response.status(409).json({ message: 'Tracking can be edited while an order is processing or shipped' });
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, {
    $set: { tracking: { ...tracking, updatedAt: new Date(), updatedBy: request.user._id } },
  }, { new: true, runValidators: true });
  if (!updated) return response.status(409).json({ message: 'Order changed. Refresh before saving tracking again.' });
  response.json({ order: publicOrder(updated) });
});
export default router;
