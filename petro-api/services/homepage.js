export function validateHomepage(body) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!body || typeof body !== 'object' || !Object.hasOwn(body, 'image')) fail('Choose a homepage image or remove the current image');
  if (body.image === null) return { image: null, alt: '' };
  const image = body.image;
  if (!image || typeof image.url !== 'string' || image.url.length > 2000 || typeof image.publicId !== 'string' || !image.publicId.trim() || image.publicId.length > 300) fail('Invalid homepage image');
  let url;
  try { url = new URL(image.url); } catch { fail('Invalid homepage image URL'); }
  if (url.protocol !== 'https:' || url.username || url.password) fail('Homepage images must use HTTPS without credentials');
  if (typeof body.alt !== 'string' || !body.alt.trim() || body.alt.trim().length > 160) fail('Describe the homepage image in 1–160 characters');
  return { image: { url: image.url, publicId: image.publicId }, alt: body.alt.trim() };
}
