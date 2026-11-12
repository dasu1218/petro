export function allowedOrigins(env = process.env) {
  const production = env.NODE_ENV === 'production';
  if (production && !env.CLIENT_URL) throw new Error('CLIENT_URL is required in production');
  return (env.CLIENT_URL || 'http://localhost:5173').split(',').map((value) => {
    let url;
    try { url = new URL(value.trim()); } catch { throw new Error('CLIENT_URL must contain valid frontend origins'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (production && url.protocol !== 'https:')) throw new Error('CLIENT_URL must contain HTTPS origins in production, without paths or credentials');
    return url.origin;
  });
}
export function validateRuntime(env = process.env) {
  const origins = allowedOrigins(env);
  if (env.NODE_ENV === 'production') {
    const required = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const missing = required.filter((key) => !env[key]?.trim());
    if (missing.length) throw new Error(`Missing production settings: ${missing.join(', ')}`);
    if (env.JWT_SECRET.length < 32 || /^(change_this|replace_|your_)/i.test(env.JWT_SECRET)) throw new Error('JWT_SECRET must be a unique random secret of at least 32 characters');
  }
  return origins;
}
export function corsOrigin(origins) {
  return (origin, callback) => callback(null, !origin || origins.includes(origin));
}
