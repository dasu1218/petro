// Eager generation completes before upload succeeds; the original stays intact.
export const PHOTO_ENHANCEMENT = [
  { effect: 'improve' },
  { width: 1200, height: 1200, crop: 'limit' },
  { width: 1200, height: 1200, crop: 'pad', background: 'white' },
  { fetch_format: 'jpg', quality: 'auto:good' },
];
export function uploadPhotoOptions(enhance) {
  return enhance ? { eager: [{ transformation: PHOTO_ENHANCEMENT }], eager_async: false } : {};
}
export function uploadedPhoto(result, enhance) {
  const originalUrl = result.secure_url;
  const enhancedUrl = enhance ? result.eager?.[0]?.secure_url : null;
  if (!originalUrl || (enhance && !enhancedUrl)) throw new Error('Photo enhancement could not finish. Please retry, or upload with enhancement turned off.');
  return {
    url: enhancedUrl || originalUrl,
    publicId: result.public_id,
    originalUrl,
    ...(enhancedUrl ? { enhancedUrl } : {}),
  };
}
