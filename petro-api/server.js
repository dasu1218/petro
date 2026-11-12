import cors from 'cors';
import mongoose from 'mongoose';
import { validateRuntime, corsOrigin } from './config/runtime.js';
import './config/env.js';
import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from './config/cloudinary.js';
import { connectDB } from './config/db.js';
import { admin, protect } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import bundleRoutes from './routes/bundleRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import Order from './models/Order.js';
import Inventory from './models/Inventory.js';
import Wishlist from './models/Wishlist.js';
import Review from './models/Review.js';
import CatalogProduct from './models/CatalogProduct.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import productRoutes from './routes/productRoutes.js';
import ProductSettings from './models/ProductSettings.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import { isProductImage } from './services/imageUpload.js';
import { uploadedPhoto } from './services/photoEnhancement.js';

const origins = validateRuntime();
const app = express();
const port = process.env.PORT || 5001;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(
  cors({
    origin: corsOrigin(origins),
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  const ready = mongoose.connection.readyState === 1;
  response.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
});

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

app.post('/api/upload', protect, admin, upload.single('image'), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ message: 'Image file is required' });
    }

    if (!isProductImage(request.file.buffer)) return response.status(400).json({ message: 'Choose a JPG, PNG, or WebP image' });

    const enhance = request.body?.enhance !== 'false';
    if (request.body?.enhance !== undefined && !['true', 'false'].includes(request.body.enhance)) return response.status(400).json({ message: 'Invalid photo enhancement option' });
    const result = await uploadToCloudinary(request.file.buffer, 'petro', enhance);
    return response.status(201).json(uploadedPhoto(result, enhance));
  } catch (error) {
    return response.status(500).json({
      message: error.message || 'Image upload failed',
    });
  }
});

app.use((request, response) => {
  response.status(404).json({ message: `Route not found: ${request.originalUrl}` });
});

app.use(errorHandler);

try {
  await connectDB();
  await Promise.all([Order.init(), Inventory.init(), ProductSettings.init(), Wishlist.init(), Review.init(), CatalogProduct.init()]);
  app.listen(port, () => {
    console.log(`PETRO API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error(`Failed to start API: ${error.message}`);
  process.exit(1);
}
