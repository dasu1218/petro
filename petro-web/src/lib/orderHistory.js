export const HISTORY_STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled']
export function readHistoryFilters(params) {
  const page = Number(params.get('page') || 1)
  return {
    page: Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1,
    status: HISTORY_STATUSES.includes(params.get('status')) ? params.get('status') : '',
    payment: ['paid', 'unpaid'].includes(params.get('payment')) ? params.get('payment') : '',
  }
}
export function historyApiQuery(filters) {
  const params = new URLSearchParams({ page: String(filters.page) })
  if (filters.status) params.set('status', filters.status)
  if (filters.payment) params.set('payment', filters.payment)
  return params.toString()
}
