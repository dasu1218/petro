import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readHistoryFilters, historyApiQuery } from './orderHistory.js'
test('order history filters survive URL serialization while ignoring invalid input', () => {
  const filters = readHistoryFilters(new URLSearchParams('page=3&status=shipped&payment=unpaid'))
  assert.deepEqual(filters, { page:3,status:'shipped',payment:'unpaid' })
  assert.deepEqual(readHistoryFilters(new URLSearchParams(historyApiQuery(filters))), filters)
  assert.deepEqual(readHistoryFilters(new URLSearchParams('page=-2&status=wrong&payment=unknown')), { page:1,status:'',payment:'' })
})
test('history requests never include account IDs from arbitrary URL parameters', () => {
  const filters = readHistoryFilters(new URLSearchParams('user=someone-else&page=10001&status=delivered'))
  const query = historyApiQuery(filters)
  assert.equal(query.includes('user'), false)
  assert.equal(filters.page, 1)
  assert.equal(query, 'page=1&status=delivered')
})
