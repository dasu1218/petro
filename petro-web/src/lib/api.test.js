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
