import test from 'node:test'
import assert from 'node:assert/strict'
import { checkDeployment } from './check-deployment.mjs'
const config = { frontend: 'https://shop.example.test', api: 'https://api.example.test' }
const shell = '<div id="root"></div><script type="module" src="/assets/app.js"></script>'
const response = (url) => url.endsWith('/api/health') ? Response.json({ status: 'ok' }) : url.endsWith('/api/orders') ? new Response('', { status: 401 }) : new Response(shell, { headers: { 'content-type': 'text/html' } })
test('deployment checker performs only expected read-only requests without credentials', async () => {
  const requests = []
  const checks = await checkDeployment({ ...config, fetcher: async (url, options) => { requests.push(url); assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.headers, undefined); return response(url) } })
  assert.equal(checks.length, 5)
  assert.deepEqual(requests, ['https://api.example.test/api/health', 'https://api.example.test/api/orders', 'https://shop.example.test/', 'https://shop.example.test/shop', 'https://shop.example.test/account'])
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
  for (const status of [200, 404, 500]) await assert.rejects(checkDeployment({ ...config, fetcher: async (url) => url.endsWith('/api/orders') ? new Response('', { status }) : response(url) }), /expected 401/)
})
test('deployment checker rejects missing SPA rewrites and unrelated HTML', async () => {
  for (const result of [new Response('', { status: 404 }), new Response('{}', { headers: { 'content-type': 'application/json' } }), new Response('<h1>Welcome</h1>', { headers: { 'content-type': 'text/html' } })]) {
    await assert.rejects(checkDeployment({ ...config, fetcher: async (url) => url.endsWith('/account') ? result : response(url) }), /Frontend/)
  }
})
