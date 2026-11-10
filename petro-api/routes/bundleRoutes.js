import { Router } from 'express';
import { getBundleOffers } from '../services/bundles.js';

const router = Router();
router.get('/', async (_request, response) => {
  response.json({ bundles: await getBundleOffers() });
});
export default router;
