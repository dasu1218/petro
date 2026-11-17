export function validateTracking(body) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!body || typeof body !== 'object') fail('Tracking details are required');
  const text = (key, max) => {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].trim().length > max) fail(`Enter a ${key} of 1–${max} characters`);
    return body[key].trim();
  };
  const carrier = text('carrier', 80), number = text('number', 100);
  let url = '';
  if (body.url !== undefined && body.url !== '') {
    if (typeof body.url !== 'string' || body.url.trim().length > 2000) fail('Enter a valid HTTPS tracking link');
    let parsed;
    try { parsed = new URL(body.url.trim()); } catch { fail('Enter a valid HTTPS tracking link'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) fail('Tracking links must use HTTPS without embedded credentials');
    url = parsed.href;
  }
  return { carrier, number, url };
}
