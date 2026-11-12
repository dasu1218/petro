const stages = [ ['placed', 'Order placed'], ['processing', 'Preparing your order'], ['shipped', 'Shipped'], ['delivered', 'Delivered'] ]
export function orderTimeline(order) {
  const current = stages.findIndex(([status]) => status === order.status)
  const history = order.statusHistory || []
  if (order.status === 'cancelled') return [
    { status: 'placed', label: 'Order placed', complete: true, current: false, date: order.createdAt || null },
    ...history.filter((event) => event.status === 'processing').slice(0, 1).map((event) => ({ status: 'processing', label: 'Preparing your order', complete: true, current: false, date: event.changedAt })),
    { status: 'cancelled', label: 'Cancelled', complete: true, current: true, date: order.cancellation?.cancelledAt || history.find((event) => event.status === 'cancelled')?.changedAt || null },
  ]
  if (current < 0) return []
  return stages.map(([status, label], index) => ({
    status, label, complete: index <= current, current: index === current,
    date: index <= current ? status === 'placed' ? order.createdAt || null : history.find((event) => event.status === status)?.changedAt || null : null,
  }))
}
export function safeTrackingUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
