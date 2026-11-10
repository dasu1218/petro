import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import Cart from '../models/Cart.js';
import { normalizeCartRequest } from '../services/cartItems.js';

const router = Router();
router.use(protect);
router.get('/', async (request, response) => {
  const cart = await Cart.findOne({ user: request.user._id });
  response.json({ items: await normalizeCartRequest(cart?.items || []) });
});
router.put('/', async (request, response) => {
  const items = await normalizeCartRequest(request.body?.items);
  await Cart.findOneAndUpdate(
    { user: request.user._id },
    { $set: { items } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  response.json({ items });
});
router.delete('/', async (request, response) => {
  await Cart.deleteOne({ user: request.user._id });
  response.json({ items: [] });
});
export default router;
