import test from 'node:test'
import assert from 'node:assert/strict'
import { promotionSchedule } from './promotionSchedule.js'
test('disabled promotions ignore stale dates and open schedules explain publication', () => {
  assert.match(promotionSchedule({ enabled: false, startsAt: 'invalid' }).message, /Regular prices/)
  const result = promotionSchedule({ enabled: true })
  assert.equal(result.error, '')
  assert.match(result.message, /Starts immediately when saved; runs until disabled/)
})
test('promotion schedules reject invalid, reversed and equal dates', () => {
  assert.match(promotionSchedule({ enabled: true, startsAt: 'invalid' }).error, /valid/)
  for (const end of ['2030-01-01T10:00', '2030-01-01T09:00']) {
    assert.match(promotionSchedule({ enabled: true, startsAt: '2030-01-01T10:00', endsAt: end }).error, /after/)
  }
})
test('scheduled and one-sided windows display local times without mutating inputs', () => {
  for (const dates of [{ startsAt: '2030-01-01T10:00' }, { endsAt: '2030-01-02T10:00' }, { startsAt: '2030-01-01T10:00', endsAt: '2030-01-02T10:00' }]) {
    const input = { enabled: true, ...dates }
    const before = { ...input }
    const result = promotionSchedule(input)
    assert.equal(result.error, '')
    assert.match(result.message, /local timezone/)
    assert.match(result.message, /Save product/)
    assert.deepEqual(input, before)
  }
})
