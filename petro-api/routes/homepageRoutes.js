import { Router } from 'express';
import Homepage from '../models/Homepage.js';
import { protect, admin } from '../middleware/auth.js';
import { validateHomepage } from '../services/homepage.js';
const router = Router();
router.get('/', async (_request, response) => {
  const settings = await Homepage.findOne({ key: 'home' }).lean();
  response.json({ image: settings?.image || null, alt: settings?.alt || '' });
});
router.put('/', protect, admin, async (request, response) => {
  const settings = validateHomepage(request.body);
  await Homepage.findOneAndUpdate({ key: 'home' }, { $set: settings }, { upsert: true, runValidators: true });
  response.json(settings);
});
export default router;
