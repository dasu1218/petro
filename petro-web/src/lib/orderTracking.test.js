import assert from 'node:assert/strict'
import { test } from 'node:test'
import { orderTimeline, safeTrackingUrl } from './orderTracking.js'
test('timeline marks the current fulfilment stage without inventing missing timestamps', () => {
  const timeline = orderTimeline({ status: 'shipped', createdAt: '2026-11-01T00:00:00Z', statusHistory: [{ status: 'shipped', changedAt: '2026-11-02T00:00:00Z' }] })
  assert.equal(timeline[0].date, '2026-11-01T00:00:00Z')
  assert.equal(timeline[1].date, null)
  assert.equal(timeline[2].current, true)
  assert.equal(timeline[2].date, '2026-11-02T00:00:00Z')
  assert.equal(timeline[3].complete, false)
  assert.equal(orderTimeline({ status: 'delivered' })[3].current, true)
})
test('cancelled orders show cancellation instead of shipment milestones', () => {
  const timeline = orderTimeline({ status: 'cancelled', createdAt: '2026-11-01', statusHistory: [{ status: 'processing', changedAt: '2026-11-02' }], cancellation: { cancelledAt: '2026-11-03' } })
  assert.deepEqual(timeline.map((entry) => entry.status), ['placed', 'processing', 'cancelled'])
  assert.equal(timeline[2].current, true)
  assert.equal(timeline[2].date, '2026-11-03')
  assert.deepEqual(orderTimeline({ status: 'unknown' }), [])
})
test('unsafe or missing tracking links are not rendered as links', () => {
  for (const url of [undefined, '', 'javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', '/relative']) assert.equal(safeTrackingUrl(url), null)
  assert.equal(safeTrackingUrl('https://example.com/tracking?id=REF123'), 'https://example.com/tracking?id=REF123')
})
