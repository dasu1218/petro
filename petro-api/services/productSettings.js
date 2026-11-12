import { applyProductDetails } from './productDetails.js';
export const productError = (message) => Object.assign(new Error(message), { status: 400 });
export function validateProductSettings(body, product) {
  if (!body || !Array.isArray(body.images) || body.images.length > 6) throw productError('Choose up to six product photos');
  const images = body.images.map((image) => {
    if (!image || typeof image.url !== 'string' || image.url.length > 2000 || typeof image.publicId !== 'string' || !image.publicId || image.publicId.length > 300) throw productError('Invalid product photo');
    let url;
    try { url = new URL(image.url); } catch { throw productError('Invalid product photo URL'); }
    if (url.protocol !== 'https:') throw productError('Product photo URLs must use HTTPS');
    const photo = { url: image.url, publicId: image.publicId };
    for (const key of ['originalUrl', 'enhancedUrl']) {
      if (image[key] !== undefined) {
        let extra;
        try { extra = new URL(image[key]); } catch { throw productError('Invalid photo preview URL'); }
        if (typeof image[key] !== 'string' || image[key].length > 2000 || extra.protocol !== 'https:') throw productError('Photo preview URLs must use HTTPS');
        photo[key] = image[key];
      }
    }
    return photo;
  });
  if (!Array.isArray(body.prices) || body.prices.length !== product.variants.length) throw productError('Set a price for every size');
  const prices = product.variants.map((variant) => {
    const matches = body.prices.filter((entry) => entry?.label === variant.label);
    if (matches.length !== 1 || !Number.isSafeInteger(matches[0].price) || matches[0].price < 1 || matches[0].price > 10000000) throw productError('Prices must be whole LKR amounts between 1 and 10,000,000');
    return { label: variant.label, price: matches[0].price };
  });
  const promo = body.promotion;
  if (!promo || typeof promo.enabled !== 'boolean') throw productError('Choose whether the promotion is enabled');
  const promotion = { enabled: promo.enabled, label: '', percent: 0, startsAt: null, endsAt: null };
  if (promo.enabled) {
    if (typeof promo.label !== 'string' || !promo.label.trim() || promo.label.trim().length > 60) throw productError('Enter a promotion label of up to 60 characters');
    if (!Number.isInteger(promo.percent) || promo.percent < 1 || promo.percent > 90) throw productError('Promotion discount must be 1–90%');
    promotion.label = promo.label.trim(); promotion.percent = promo.percent;
    for (const name of ['startsAt', 'endsAt']) {
      if (promo[name]) {
        const date = new Date(promo[name]);
        if (!Number.isFinite(date.getTime())) throw productError('Invalid promotion date');
        promotion[name] = date;
      }
    }
    if (promotion.startsAt && promotion.endsAt && promotion.startsAt >= promotion.endsAt) throw productError('Promotion end must be after its start');
  }
  return { images, prices, promotion };
}
export function applyProductSettings(product, settings, now = new Date()) {
  const promo = settings?.promotion;
  const active = Boolean(promo?.enabled && (!promo.startsAt || new Date(promo.startsAt) <= now) && (!promo.endsAt || now < new Date(promo.endsAt)));
  return {
    ...applyProductDetails(product, settings),
    images: settings ? settings.images : [],
    promotion: active ? { label: promo.label, percent: promo.percent } : null,
    variants: product.variants.map((variant) => {
      const regularPrice = settings?.prices?.find((entry) => entry.label === variant.label)?.price ?? variant.price;
      return { ...variant, regularPrice, price: active ? Math.max(1, Math.round(regularPrice * (100 - promo.percent) / 100)) : regularPrice };
    }),
  };
}
