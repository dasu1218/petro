import { Router } from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import Order from '../models/Order.js';
import { placeOrder, publicOrder } from '../services/orders.js';
import { HISTORY_PAGE_SIZE, orderHistoryQuery } from '../services/orderHistory.js';

const router = Router();
router.use(protect);
router.post('/', async (request, response) => {
  const result = await placeOrder(request.user._id, request.body);
  response.status(result.replayed ? 200 : 201).json({ order: publicOrder(result.order) });
});
router.get('/my', async (request, response) => {
  const { page, filter } = orderHistoryQuery(request.query);
  const orders = await Order.find({ ...filter, user: request.user._id }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * HISTORY_PAGE_SIZE).limit(HISTORY_PAGE_SIZE + 1);
  response.json({ orders: orders.slice(0, HISTORY_PAGE_SIZE).map(publicOrder), page, hasMore: orders.length > HISTORY_PAGE_SIZE });
});
router.get('/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Order not found' });
  const order = await Order.findOne({ _id: request.params.id, user: request.user._id });
  if (!order) return response.status(404).json({ message: 'Order not found' });
  response.json({ order: publicOrder(order) });
});
export default router;
