import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readHistoryFilters, historyApiQuery } from './orderHistory.js'
test('order history filters survive URL serialization while ignoring invalid input', () => {
  const filters = readHistoryFilters(new URLSearchParams('page=3&status=shipped&payment=unpaid'))
  assert.deepEqual(filters, { page:3,status:'shipped',payment:'unpaid',reference:'',sort:'newest' })
  assert.deepEqual(readHistoryFilters(new URLSearchParams(historyApiQuery(filters))), filters)
  assert.deepEqual(readHistoryFilters(new URLSearchParams('page=-2&status=wrong&payment=unknown')), { page:1,status:'',payment:'',reference:'',sort:'newest' })
})
test('history requests never include account IDs from arbitrary URL parameters', () => {
  const filters = readHistoryFilters(new URLSearchParams('user=someone-else&page=10001&status=delivered'))
  const query = historyApiQuery(filters)
  assert.equal(query.includes('user'), false)
  assert.equal(filters.page, 1)
  assert.equal(query, 'page=1&status=delivered')
})

test('order reference survives URL round trips while malformed references are ignored', () => {
  const id = '507f1f77bcf86cd799439011'
  const filters = readHistoryFilters(new URLSearchParams(`reference=${id.toUpperCase()}&status=paid`))
  assert.equal(filters.reference, id)
  assert.equal(new URLSearchParams(historyApiQuery(filters)).get('reference'), id)
  assert.equal(readHistoryFilters(new URLSearchParams('reference=invalid')).reference, '')
})

test('oldest sort survives URL round trips and unsupported sorts use newest', () => {
  const filters = readHistoryFilters(new URLSearchParams('sort=oldest&page=2&status=shipped'))
  assert.equal(filters.sort, 'oldest')
  assert.equal(new URLSearchParams(historyApiQuery(filters)).get('sort'), 'oldest')
  assert.deepEqual(readHistoryFilters(new URLSearchParams(historyApiQuery(filters))), filters)
  assert.equal(readHistoryFilters(new URLSearchParams('sort=price')).sort, 'newest')
  assert.equal(new URLSearchParams(historyApiQuery({ ...filters, sort: 'newest' })).has('sort'), false)
})
