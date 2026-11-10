export const COD_METHOD = 'cod'
export const COD_LABEL = 'Cash on Delivery'

export function getOrderPayment(order) {
  const isCod = order.paymentMethod === COD_METHOD
  const isPaid = order.paymentStatus === 'paid'
  const isCancelled = order.status === 'cancelled'
  return {
    methodLabel: isCod ? COD_LABEL : 'Payment method not recorded',
    statusLabel: isPaid ? 'Paid' : isCod && !isCancelled ? 'Due on delivery' : 'Unpaid',
    amountDue: !isPaid && !isCancelled && isCod ? order.totals.total : null,
    message: isPaid
      ? 'Payment has been recorded.'
      : isCancelled
        ? 'This order is cancelled. No delivery payment is due.'
        : isCod
          ? 'Pay the full order total in cash when your order is delivered.'
          : 'Contact PETRO support to confirm payment arrangements for this order.',
  }
}
