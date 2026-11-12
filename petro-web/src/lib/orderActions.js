export function canCancelOrder(order) {
  return ['placed', 'processing'].includes(order.status) && order.paymentStatus === 'unpaid'
}
