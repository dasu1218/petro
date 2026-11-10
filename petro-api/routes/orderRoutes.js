import { Router } from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import Order from '../models/Order.js';
import { placeOrder, publicOrder } from '../services/orders.js';

const router = Router();
router.use(protect);
router.post('/', async (request, response) => {
  const result = await placeOrder(request.user._id, request.body);
  response.status(result.replayed ? 200 : 201).json({ order: publicOrder(result.order) });
});
router.get('/my', async (request, response) => {
  const orders = await Order.find({ user: request.user._id }).sort({ createdAt: -1 }).limit(50);
  response.json({ orders: orders.map(publicOrder) });
});
router.get('/:id', async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Order not found' });
  const order = await Order.findOne({ _id: request.params.id, user: request.user._id });
  if (!order) return response.status(404).json({ message: 'Order not found' });
  response.json({ order: publicOrder(order) });
});
export default router;
