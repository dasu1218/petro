import { PRODUCT_CATEGORIES } from './newProduct.js';
export function validateProductDetails(body) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!body || typeof body !== 'object') fail('Product details are required');
  const read = (key, limit) => {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > limit) fail(`Enter a ${key} of 1–${limit} characters`);
    return body[key].trim();
  };
  const name = read('name', 120), description = read('description', 2000);
  if (!PRODUCT_CATEGORIES.includes(body.category)) fail('Choose a product category');
  if (!Array.isArray(body.badges) || body.badges.length > 6 || body.badges.some((badge) => typeof badge !== 'string' || !badge.trim() || badge.trim().length > 40)) fail('Use up to six badges of 1–40 characters');
  return { name, description, category: body.category, badges: [...new Set(body.badges.map((badge) => badge.trim()))] };
}
export function applyProductDetails(product, settings) {
  // Missing nested defaults must not erase the seed product's existing badges.
  if (!settings?.details?.name) return product;
  const { name, description, category, badges } = settings.details;
  return { ...product, name, description, category, badges };
}
