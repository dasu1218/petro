import './env.js';
import { v2 as cloudinary } from 'cloudinary';
import { uploadPhotoOptions } from '../services/photoEnhancement.js';

const ensureCloudinaryConfig = () => {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing Cloudinary env vars: ${missing.join(', ')}`);
  }
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadToCloudinary = async (buffer, folder = 'petro', enhance = true) => {
  ensureCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        ...uploadPhotoOptions(enhance),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    stream.end(Buffer.from(buffer));
  });
};

export default cloudinary;
