import { Router } from 'express';
import { protect, admin } from '../middleware/auth.js';
import ProductSettings from '../models/ProductSettings.js';
import CatalogProduct from '../models/CatalogProduct.js';
import Bundle from '../models/Bundle.js';
import { defaultBundles } from '../data/bundles.js';
import { validateNewProduct } from '../services/newProduct.js';
import { getCatalog, getBaseCatalog, catalogHasProduct } from '../services/catalog.js';
import { validateProductSettings } from '../services/productSettings.js';
import { applyProductDetails, validateProductDetails } from '../services/productDetails.js';
const router = Router();
router.get('/', async (_request, response) => {
  const catalog = await getCatalog(null, { includeArchived: true });
  response.json({ products: catalog.filter((product) => !product.isArchived), unavailableSlugs: catalog.filter((product) => product.isArchived).map((product) => product.slug) });
});
router.get('/admin', protect, admin, async (_request, response) => {
  const settings = await ProductSettings.find({}).lean();
  response.json({ products: (await getBaseCatalog()).map((product) => ({ ...applyProductDetails(product, settings.find((entry) => entry.slug === product.slug)), settings: settings.find((entry) => entry.slug === product.slug) || null })) });
});
router.post('/', protect, admin, async (request, response) => {
  const data = validateNewProduct(request.body);
  if (await catalogHasProduct(data.slug) || defaultBundles.some((bundle) => bundle.slug === data.slug) || await Bundle.exists({ slug: data.slug })) return response.status(409).json({ message: 'That product URL is already in use. Choose another.'});
  try {
    const product = await CatalogProduct.create(data);
    response.status(201).json({ product });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'That product URL is already in use. Choose another.'});
    throw error;
  }
});
router.patch('/:slug/availability', protect, admin, async (request, response) => {
  if (typeof request.body?.isArchived !== 'boolean') return response.status(400).json({ message: 'Choose whether the product is hidden' });
  if (!await catalogHasProduct(request.params.slug)) return response.status(404).json({ message: 'Product not found' });
  await ProductSettings.findOneAndUpdate({ slug: request.params.slug }, { $set: { isArchived: request.body.isArchived } }, { upsert: true, runValidators: true });
  response.json({ isArchived: request.body.isArchived });
});
router.patch('/:slug/details', protect, admin, async (request, response) => {
  const product = (await getBaseCatalog()).find((entry) => entry.slug === request.params.slug);
  if (!product) return response.status(404).json({ message: 'Product not found' });
  const details = validateProductDetails(request.body);
  await ProductSettings.findOneAndUpdate({ slug: product.slug }, { $set: { details } }, { upsert: true, runValidators: true });
  response.json({ details });
});
router.put('/:slug', protect, admin, async (request, response) => {
  const product = (await getBaseCatalog()).find((entry) => entry.slug === request.params.slug);
  if (!product) return response.status(404).json({ message: 'Product not found' });
  const settings = validateProductSettings(request.body, product);
  await ProductSettings.findOneAndUpdate({ slug: product.slug }, { $set: settings }, { upsert: true, runValidators: true });
  response.json({ message: 'Product saved' });
});
export default router;
