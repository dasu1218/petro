import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from './config/cloudinary.js';

const app = express();
const port = process.env.PORT || 5001;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/upload', upload.single('image'), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ message: 'Image file is required' });
    }

    const result = await uploadToCloudinary(request.file.buffer, 'petro');

    return response.status(201).json({
      url: result.secure_url || result.url,
      publicId: result.public_id,
    });
  } catch (error) {
    return response.status(500).json({
      message: error.message || 'Image upload failed',
    });
  }
});

app.use((request, response) => {
  response.status(404).json({ message: `Route not found: ${request.originalUrl}` });
});

app.listen(port, () => {
  console.log(`PETRO API listening on http://localhost:${port}`);
});