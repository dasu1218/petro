import { Router } from 'express';
import { protect, admin } from '../middleware/auth.js';
import Order from '../models/Order.js';
import { getCatalog } from '../services/catalog.js';
import { dashboardSummary } from '../services/dashboard.js';
const router = Router(); router.use(protect, admin);
router.get('/', async (_request, response) => {
  const groups = await Order.aggregate([{ $group: {
    _id: { status: '$status', paymentStatus: '$paymentStatus', paymentMethod: '$paymentMethod' },
    count: { $sum: 1 }, total: { $sum: '$totals.total' },
  } }]);
  const products = await getCatalog(null, { includeArchived: true });
  response.json(dashboardSummary(groups, products));
});
export default router;
