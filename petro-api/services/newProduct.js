export const PRODUCT_CATEGORIES = ['skin-care', 'digestion', 'flea-tick', 'nutrition', 'bundles'];
export function validateNewProduct(body) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!body || typeof body !== 'object') fail('Product details are required');
  const text = (key, max) => {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > max) fail(`Enter a valid ${key} of up to ${max} characters`);
    return body[key].trim();
  };
  const name = text('name', 120), description = text('description', 2000), slug = text('slug', 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('Product URL must use lowercase letters, numbers, and single hyphens');
  if (!PRODUCT_CATEGORIES.includes(body.category)) fail('Choose a product category');
  if (!Array.isArray(body.variants) || body.variants.length < 1 || body.variants.length > 10) fail('Add between 1 and 10 sizes');
  const labels = new Set();
  const variants = body.variants.map((item) => {
    if (!item || typeof item.label !== 'string' || !item.label.trim() || item.label.trim().length > 40 || item.label.trim() === 'Care bundle' || labels.has(item.label.trim().toLowerCase())) fail('Use a unique size label of up to 40 characters');
    if (!Number.isSafeInteger(item.price) || item.price < 1 || item.price > 10000000) fail('Each price must be a whole LKR amount between 1 and 10,000,000');
    if (!Number.isSafeInteger(item.stock) || item.stock < 0 || item.stock > 1000000) fail('Stock must be a whole number between 0 and 1,000,000');
    labels.add(item.label.trim().toLowerCase());
    return { label: item.label.trim(), price: item.price, stock: item.stock };
  });
  const badges = body.badges ?? [];
  if (!Array.isArray(badges) || badges.length > 6 || badges.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > 40)) fail('Use up to six badges, each 1–40 characters');
  return { slug, name, description, category: body.category, variants, badges: [...new Set(badges.map((item) => item.trim()))], isFeatured: false };
}
