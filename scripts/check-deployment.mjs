import { pathToFileURL } from 'node:url'
function origin(value, label) {
  let url
  try { url = new URL(value) } catch { throw new Error(`${label} must be an HTTPS origin, such as https://your-host.example`) }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error(`${label} must be an HTTPS origin without credentials, a path or a query`)
  return url.origin
}
export async function checkDeployment({ frontend, api, fetcher = fetch }) {
  const web = origin(frontend, 'Frontend URL')
  const backend = origin(api, 'API URL')
  const get = (url, headers) => fetcher(url, { headers, method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000) })
  const checks = []
  const health = await get(`${backend}/api/health`, { Origin: web })
  if (!health.ok) throw new Error(`API health returned HTTP ${health.status}`)
  let data
  try { data = await health.json() } catch { throw new Error('API health did not return JSON') }
  if (data.status !== 'ok') throw new Error('API health is not ready')
  checks.push('API health is ready')
  const allowsOrigin = (response) => response.headers.get('access-control-allow-origin') === web
  if (!allowsOrigin(health)) throw new Error('API CORS does not allow the supplied frontend origin; check CLIENT_URL')
  const preflight = await fetcher(`${backend}/api/orders`, {
    method: 'OPTIONS', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Origin: web, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' },
  })
  const tokens = (header) => (preflight.headers.get(header) || '').split(',').map((value) => value.trim().toLowerCase())
  if (!preflight.ok || !allowsOrigin(preflight) || !tokens('access-control-allow-methods').includes('post') || !['authorization', 'content-type'].every((header) => tokens('access-control-allow-headers').includes(header))) throw new Error('API CORS preflight must allow frontend POST requests with authorization and content-type')
  checks.push('API CORS allows frontend authenticated JSON requests')
  const orders = await get(`${backend}/api/orders`)
  if (orders.status !== 401) throw new Error(`Guest order access returned HTTP ${orders.status}; expected 401`)
  checks.push('Orders require authentication')
  let homepage = ''
  for (const path of ['/', '/shop', '/account']) {
    const response = await get(`${web}${path}`)
    if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) throw new Error(`Frontend ${path} did not return an HTML page successfully`)
    const html = await response.text()
    if (!/id=["']root["']/.test(html) || !/<script\b[^>]*\bsrc=/.test(html)) throw new Error(`Frontend ${path} did not contain the application shell`)
    if (path === '/') homepage = html
    checks.push(`Frontend ${path} serves the application shell`)
  }
  const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1]
  const assets = new Map()
  for (const tag of homepage.match(/<(?:script|link)\b[^>]*>/gi) || []) {
    const source = /^<script/i.test(tag) ? attribute(tag, 'src') : attribute(tag, 'rel')?.toLowerCase() === 'stylesheet' ? attribute(tag, 'href') : null
    if (!source) continue
    let url
    try { url = new URL(source, web) } catch { throw new Error('Frontend contains an invalid asset URL') }
    if (url.origin !== web || url.username || url.password || url.search || url.hash) throw new Error('Frontend assets must use the supplied origin without credentials or query strings')
    assets.set(url.href, /^<script/i.test(tag) ? 'javascript' : 'css')
  }
  if (!assets.size || assets.size > 20) throw new Error('Frontend must reference between 1 and 20 script/style assets')
  for (const [url, kind] of assets) {
    const asset = await get(url)
    const mime = (asset.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const valid = kind === 'css' ? mime === 'text/css' : ['application/javascript', 'text/javascript'].includes(mime)
    if (!asset.ok || !valid) throw new Error(`Frontend ${kind} asset is unavailable or has an incorrect content type`)
    const body = await asset.text()
    if (!body.trim() || /^\s*(?:<!doctype|<html)/i.test(body)) throw new Error(`Frontend ${kind} asset is empty or contains an HTML fallback`)
  }
  checks.push('Homepage script and stylesheet assets are available')
  return checks
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const checks = await checkDeployment({ frontend: process.argv[2], api: process.argv[3] })
    checks.forEach((check) => console.log(`PASS: ${check}`))
    console.log('Read-only smoke checks passed. Browser login, checkout and uploads still need live verification.')
  } catch (error) {
    // Do not echo supplied URLs or provider response bodies, which can contain secrets.
    console.error(`Deployment check failed: ${error instanceof TypeError ? 'Network request failed; check the supplied origins and connectivity.' : error.message}`)
    process.exitCode = 1
  }
}
