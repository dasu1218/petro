import { Router } from 'express';
import { protect, admin } from '../middleware/auth.js';
import { getCatalog } from '../services/catalog.js';
import Restock from '../models/Restock.js';
import { restockProduct, publicRestock } from '../services/restocking.js';
const router = Router(); router.use(protect, admin);
router.get('/:slug', async (request, response) => {
  const product = (await getCatalog(null, { includeArchived: true })).find((item) => item.slug === request.params.slug);
  if (!product) return response.status(404).json({ message: 'Product not found' });
  const history = await Restock.find({ slug: product.slug }).sort({ createdAt: -1, _id: -1 }).limit(20);
  response.json({ variants: product.variants.map(({ label, stock }) => ({ label, stock })), history: history.map(publicRestock) });
});
router.post('/:slug', async (request, response) => {
  const result = await restockProduct(request.user._id, request.params.slug, request.body);
  response.status(result.replayed ? 200 : 201).json({ restock: publicRestock(result.restock) });
});
export default router;
