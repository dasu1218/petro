import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import Review from '../models/Review.js';
import { seedProducts } from '../services/catalog.js';
import { publicReview, validateReview } from '../services/reviews.js';
const router = Router();
router.param('slug', (request, response, next, slug) => seedProducts.some((product) => product.slug === slug) ? next() : response.status(404).json({ message: 'Product not found' }));
router.get('/:slug/mine', protect, async (request, response) => {
  const review = await Review.findOne({ user: request.user._id, slug: request.params.slug });
  response.json({ review: review ? publicReview(review) : null });
});
router.get('/:slug', async (request, response) => {
  const page = Number(request.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return response.status(400).json({ message: 'Invalid page' });
  const reviews = await Review.find({ slug: request.params.slug }).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21);
  const [stats] = await Review.aggregate([{ $match: { slug: request.params.slug } }, { $group: { _id: null, count: { $sum: 1 }, rating: { $avg: '$rating' } } }]);
  response.json({ reviews: reviews.slice(0, 20).map(publicReview), count: stats?.count || 0, rating: stats ? Math.round(stats.rating * 10) / 10 : null, hasMore: reviews.length > 20 });
});
router.put('/:slug', protect, async (request, response) => {
  const body = validateReview(request.body);
  const review = await Review.findOneAndUpdate({ user: request.user._id, slug: request.params.slug }, { $set: { ...body, authorName: request.user.name } }, { upsert: true, new: true, runValidators: true });
  response.json({ review: publicReview(review) });
});
router.delete('/:slug', protect, async (request, response) => {
  await Review.deleteOne({ user: request.user._id, slug: request.params.slug }); response.json({ deleted: true });
});
export default router;
