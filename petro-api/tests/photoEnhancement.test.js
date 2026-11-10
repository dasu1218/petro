import assert from 'node:assert/strict';
import { test } from 'node:test';
import cloudinary, { uploadToCloudinary } from '../config/cloudinary.js';
import { PHOTO_ENHANCEMENT, uploadedPhoto, uploadPhotoOptions } from '../services/photoEnhancement.js';
import { validateProductSettings } from '../services/productSettings.js';
import { seedProducts } from '../services/catalog.js';

const result = { public_id: 'petro/photo', secure_url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg', eager: [{ secure_url: 'https://res.cloudinary.com/demo/image/upload/e_improve/photo.jpg' }] };
test('enhancement uses full-image fitting, white padding and completed eager generation', () => {
  const options = uploadPhotoOptions(true);
  assert.equal(options.eager_async, false);
  assert.ok(PHOTO_ENHANCEMENT.some((step) => step.effect === 'improve'));
  assert.ok(PHOTO_ENHANCEMENT.some((step) => step.crop === 'pad' && step.background === 'white'));
  assert.ok(!PHOTO_ENHANCEMENT.some((step) => step.crop === 'fill'));
  assert.match(cloudinary.utils.generate_transformation_string(options.eager[0]), /e_improve\/c_limit/);
  assert.deepEqual(uploadPhotoOptions(false), {});
});
test('upload results preserve the original and select the actual enhanced result', () => {
  const photo = uploadedPhoto(result, true);
  assert.equal(photo.url, result.eager[0].secure_url);
  assert.equal(photo.originalUrl, result.secure_url);
  assert.equal(photo.enhancedUrl, photo.url);
  assert.equal(photo.publicId, result.public_id);
  assert.equal(uploadedPhoto(result, false).url, result.secure_url);
  assert.equal(uploadedPhoto(result, false).enhancedUrl, undefined);
  assert.throws(() => uploadedPhoto({ ...result, eager: [] }, true), /enhancement could not finish/);
});
test('photo choice and comparison metadata survive saving while unsafe URLs fail', () => {
  const product = seedProducts[0];
  const base = { prices: product.variants.map(({ label, price }) => ({ label, price })), promotion: { enabled: false } };
  const photo = uploadedPhoto(result, true);
  const saved = validateProductSettings({ ...base, images: [{ ...photo, url: photo.originalUrl }] }, product);
  assert.equal(saved.images[0].url, photo.originalUrl);
  assert.equal(saved.images[0].enhancedUrl, photo.enhancedUrl);
  assert.throws(() => validateProductSettings({ ...base, images: [{ ...photo, originalUrl: 'javascript:bad' }] }, product), { status: 400 });
});
test('Cloudinary upload receives enhancement options and propagates failures', async () => {
  const originalUpload = cloudinary.uploader.upload_stream;
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const previous = keys.map((key) => process.env[key]);
  keys.forEach((key) => { process.env[key] = 'test-only'; });
  let options;
  try {
    cloudinary.uploader.upload_stream = (input, callback) => {
      options = input;
      return { end: (buffer) => { assert.equal(buffer.toString(), 'photo'); callback(null, result); } };
    };
    assert.equal(await uploadToCloudinary(Buffer.from('photo')), result);
    assert.equal(options.eager_async, false);
    await uploadToCloudinary(Buffer.from('photo'), 'petro', false);
    assert.equal(options.eager, undefined);
    cloudinary.uploader.upload_stream = (_options, callback) => ({ end: () => callback(new Error('Enhancement failed')) });
    await assert.rejects(uploadToCloudinary(Buffer.from('photo')), /Enhancement failed/);
  } finally {
    cloudinary.uploader.upload_stream = originalUpload;
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});
