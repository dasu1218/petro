import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiRequest } from './api.js'

test('file uploads keep multipart bodies and let the browser set the boundary', async () => {
  const original = globalThis.fetch
  try {
    const body = new FormData()
    body.append('image', new Blob(['photo'], { type: 'image/png' }), 'photo.png')
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.body, body)
      assert.equal(options.headers['Content-Type'], undefined)
      assert.equal(options.headers.Authorization, 'Bearer test')
      return { ok: true, json: async () => ({ publicId: 'photo' }) }
    }
    assert.deepEqual(await apiRequest('/upload', { method: 'POST', token: 'test', body }), { publicId: 'photo' })
  } finally { globalThis.fetch = original }
})
test('stalled requests produce a visible timeout error instead of waiting indefinitely', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
    await assert.rejects(apiRequest('/upload', { timeoutMs: 10 }), /timed out/)
  } finally { globalThis.fetch = original }
})

test('only authenticated 401 responses notify the matching browser session', async () => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  const events = []
  try {
    globalThis.window = { CustomEvent, dispatchEvent: (event) => events.push(event) }
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: 'Expired' }) })
    await assert.rejects(apiRequest('/auth/me', { token: 'old-token' }), /Expired/)
    assert.equal(events.length, 1)
    assert.equal(events[0].type, 'petro:session-expired')
    assert.equal(events[0].detail.token, 'old-token')
    await assert.rejects(apiRequest('/auth/login', { method: 'POST', body: { email: 'bad' } }), /Expired/)
    assert.equal(events.length, 1)
    globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ message: 'Forbidden' }) })
    await assert.rejects(apiRequest('/admin/dashboard', { token: 'current-token' }), /Forbidden/)
    assert.equal(events.length, 1)
  } finally {
    globalThis.fetch = originalFetch
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})
