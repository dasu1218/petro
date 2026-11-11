import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import Wishlist from '../models/Wishlist.js';
import { seedProducts } from '../services/catalog.js';
const router = Router(); router.use(protect);
router.get('/', async (request, response) => {
  const entries = await Wishlist.find({ user: request.user._id }).sort({ createdAt: -1 }).lean();
  response.json({ slugs: entries.map((entry) => entry.slug) });
});
router.put('/:slug', async (request, response) => {
  if (!seedProducts.some((product) => product.slug === request.params.slug)) return response.status(404).json({ message: 'Product not found' });
  await Wishlist.updateOne({ user: request.user._id, slug: request.params.slug }, { $setOnInsert: { user: request.user._id, slug: request.params.slug } }, { upsert: true });
  response.json({ saved: true });
});
router.delete('/:slug', async (request, response) => {
  await Wishlist.deleteOne({ user: request.user._id, slug: request.params.slug });
  response.json({ saved: false });
});
export default router;
