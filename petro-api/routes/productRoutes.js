import { Router } from 'express';
import { protect, admin } from '../middleware/auth.js';
import ProductSettings from '../models/ProductSettings.js';
import { seedProducts, getCatalog } from '../services/catalog.js';
import { validateProductSettings } from '../services/productSettings.js';
const router = Router();
router.get('/', async (_request, response) => response.json({ products: await getCatalog() }));
router.get('/admin', protect, admin, async (_request, response) => {
  const settings = await ProductSettings.find({}).lean();
  response.json({ products: seedProducts.map((product) => ({ ...product, settings: settings.find((entry) => entry.slug === product.slug) || null })) });
});
router.put('/:slug', protect, admin, async (request, response) => {
  const product = seedProducts.find((entry) => entry.slug === request.params.slug);
  if (!product) return response.status(404).json({ message: 'Product not found' });
  const settings = validateProductSettings(request.body, product);
  await ProductSettings.findOneAndUpdate({ slug: product.slug }, { $set: settings }, { upsert: true, runValidators: true });
  response.json({ message: 'Product saved' });
});
export default router;
