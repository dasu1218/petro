import test from 'node:test'
import assert from 'node:assert/strict'
import { checkDeployment } from './check-deployment.mjs'
const config = { frontend: 'https://shop.example.test', api: 'https://api.example.test' }
const shell = '<div id="root"></div><script type="module" src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css">'
const preflight = (headers = {}) => new Response(null, { status: 204, headers: { 'access-control-allow-origin': config.frontend, 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': 'Authorization, Content-Type', ...headers } })
const catalogResponse = (products = [{ slug: 'shampoo', name: 'Shampoo', variants: [{ label: '250ml', price: 1000, stock: 5 }] }]) => Response.json({ products }, { headers: { 'access-control-allow-origin': config.frontend } })
const response = (url, options = {}) => ['/api/products/admin', '/api/admin/orders', '/api/admin/dashboard'].some((path) => url.endsWith(path)) ? new Response('', { status: 401 }) : url.endsWith('/api/products') ? catalogResponse() : url.endsWith('/assets/app.js') ? new Response('console.log(1)', { headers: { 'content-type': 'application/javascript' } }) : url.endsWith('/assets/app.css') ? new Response('body{margin:0}', { headers: { 'content-type': 'text/css' } }) : options.method === 'OPTIONS' ? preflight() : url.endsWith('/api/health') ? Response.json({ status: 'ok' }, { headers: { 'access-control-allow-origin': config.frontend } }) : url.endsWith('/api/orders') ? new Response('', { status: 401 }) : new Response(shell, { headers: { 'content-type': 'text/html' } })
test('deployment checker performs only expected read-only requests without credentials', async () => {
  const requests = []
  const checks = await checkDeployment({ ...config, fetcher: async (url, options) => { requests.push(url); assert.ok(['GET', 'OPTIONS'].includes(options.method)); assert.equal(options.redirect, 'error'); assert.equal(options.headers?.Authorization, undefined); return response(url, options) } })
  assert.equal(checks.length, 9)
  assert.deepEqual(requests, ['https://api.example.test/api/health', 'https://api.example.test/api/orders', 'https://api.example.test/api/products', 'https://api.example.test/api/orders', 'https://api.example.test/api/products/admin', 'https://api.example.test/api/admin/orders', 'https://api.example.test/api/admin/dashboard', 'https://shop.example.test/', 'https://shop.example.test/shop', 'https://shop.example.test/account', 'https://shop.example.test/assets/app.js', 'https://shop.example.test/assets/app.css'])
})
test('deployment checker rejects unsafe or malformed origins before requesting', async () => {
  for (const frontend of ['invalid', 'http://shop.example.test', 'https://user:secret@shop.example.test', 'https://shop.example.test/path', 'https://shop.example.test/?secret=x']) {
    await assert.rejects(checkDeployment({ ...config, frontend, fetcher: () => assert.fail('must not request') }), /HTTPS origin/)
  }
})
test('deployment checker rejects unhealthy APIs and public or missing order routes', async () => {
  for (const health of [Response.json({ status: 'unavailable' }), new Response('', { status: 503 }), new Response('html')]) {
    await assert.rejects(checkDeployment({ ...config, fetcher: async () => health }), /health/)
  }
  for (const status of [200, 404, 500]) await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => options.method === 'OPTIONS' ? preflight() : url.endsWith('/api/orders') ? new Response('', { status }) : response(url) }), /expected 401/)
})
test('deployment checker rejects missing SPA rewrites and unrelated HTML', async () => {
  for (const result of [new Response('', { status: 404 }), new Response('{}', { headers: { 'content-type': 'application/json' } }), new Response('<h1>Welcome</h1>', { headers: { 'content-type': 'text/html' } })]) {
    await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => url.endsWith('/account') ? result : response(url, options) }), /Frontend/)
  }
})

test('deployment checker rejects missing, wildcard and wrong frontend CORS origins', async () => {
  for (const allowed of ['', '*', 'https://other.example.test']) {
    await assert.rejects(checkDeployment({ ...config, fetcher: async () => Response.json({ status: 'ok' }, { headers: { 'access-control-allow-origin': allowed } }) }), /CORS/)
  }
})
test('deployment checker rejects preflights missing method, headers or matching origin', async () => {
  for (const headers of [{ 'access-control-allow-methods': 'GET' }, { 'access-control-allow-headers': 'content-type' }, { 'access-control-allow-origin': '*' }]) {
    await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => options.method === 'OPTIONS' ? preflight(headers) : response(url, options) }), /preflight/)
  }
})

test('deployment checker rejects missing assets and SPA HTML fallback responses', async () => {
  for (const asset of [new Response('', { status: 404 }), new Response(shell, { headers: { 'content-type': 'text/html' } }), new Response('<html>fallback</html>', { headers: { 'content-type': 'application/javascript' } }), new Response('', { headers: { 'content-type': 'application/javascript' } })]) {
    await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => url.endsWith('/assets/app.js') ? asset : response(url, options) }), /asset/)
  }
})
test('deployment checker rejects invalid stylesheet MIME and external asset requests', async () => {
  await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => url.endsWith('/assets/app.css') ? new Response('oops', { headers: { 'content-type': 'text/plain' } }) : response(url, options) }), /content type/)
  await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => url === config.frontend + '/' ? new Response(shell.replace('/assets/app.js', 'https://external.example.test/app.js'), { headers: { 'content-type': 'text/html' } }) : response(url, options) }), /supplied origin/)
})

test('deployment checker rejects failed, malformed and inaccessible public catalogs', async () => {
  const invalid = [new Response('', { status: 503 }), new Response('html'), Response.json({ products: [] }), catalogResponse(null), catalogResponse([{ slug: 'bad', name: 'Bad', variants: [] }]), catalogResponse([{ slug: 'bad', name: 'Bad', variants: [{ label: 'Small', price: -1, stock: 1 }] }])]
  for (const catalog of invalid) {
    await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => url.endsWith('/api/products') ? catalog : response(url, options) }), /catalog/)
  }
})
test('deployment checker identifies empty catalog without claiming products are ready', async () => {
  const checks = await checkDeployment({ ...config, fetcher: async (url, options) => url.endsWith('/api/products') ? catalogResponse([]) : response(url, options) })
  assert.ok(checks.some((check) => check.includes('empty; add visible products before launch')))
})

test('deployment checker rejects unprotected or missing admin routes', async () => {
  for (const path of ['/api/products/admin', '/api/admin/orders', '/api/admin/dashboard']) {
    for (const status of [200, 404, 500]) {
      await assert.rejects(checkDeployment({ ...config, fetcher: async (url, options) => url.endsWith(path) ? new Response('', { status }) : response(url, options) }), /Admin route.*expected 401/)
    }
  }
})
