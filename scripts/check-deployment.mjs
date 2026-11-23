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
  const get = (url) => fetcher(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000) })
  const checks = []
  const health = await get(`${backend}/api/health`)
  if (!health.ok) throw new Error(`API health returned HTTP ${health.status}`)
  let data
  try { data = await health.json() } catch { throw new Error('API health did not return JSON') }
  if (data.status !== 'ok') throw new Error('API health is not ready')
  checks.push('API health is ready')
  const orders = await get(`${backend}/api/orders`)
  if (orders.status !== 401) throw new Error(`Guest order access returned HTTP ${orders.status}; expected 401`)
  checks.push('Orders require authentication')
  for (const path of ['/', '/shop', '/account']) {
    const response = await get(`${web}${path}`)
    if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) throw new Error(`Frontend ${path} did not return an HTML page successfully`)
    const html = await response.text()
    if (!/id=["']root["']/.test(html) || !/<script\b[^>]*\bsrc=/.test(html)) throw new Error(`Frontend ${path} did not contain the application shell`)
    checks.push(`Frontend ${path} serves the application shell`)
  }
  return checks
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const checks = await checkDeployment({ frontend: process.argv[2], api: process.argv[3] })
    checks.forEach((check) => console.log(`PASS: ${check}`))
    console.log('Read-only smoke checks passed. Browser login, checkout, uploads and CORS still need live verification.')
  } catch (error) {
    // Do not echo supplied URLs or provider response bodies, which can contain secrets.
    console.error(`Deployment check failed: ${error instanceof TypeError ? 'Network request failed; check the supplied origins and connectivity.' : error.message}`)
    process.exitCode = 1
  }
}
