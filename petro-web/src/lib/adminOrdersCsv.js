import { csvDocument } from './csv.js'
import { getOrderPayment } from './payment.js'
export function adminOrdersCsv(orders, filter) {
  return csvDocument([
    ['PETRO admin orders — shown page'],
    ['Page', filter.page], ['Order status filter', filter.status || 'All'], ['Payment status filter', filter.payment || 'All'], ['Reference filter', filter.reference || 'All'], ['Orders exported', orders.length], [],
    ['Order reference', 'Placed at', 'Order status', 'Payment method', 'Payment status', 'Products', 'Item quantity', 'Subtotal (LKR)', 'Delivery (LKR)', 'Total (LKR)', 'Amount due on delivery (LKR)'],
    ...orders.map((order) => {
      const payment = getOrderPayment(order)
      return [order._id, order.createdAt || '', order.status, payment.methodLabel, payment.statusLabel,
        order.items.map((item) => `${item.quantity} × ${item.name} (${item.variantLabel})`).join('; '),
        order.items.reduce((sum, item) => sum + item.quantity, 0), order.totals.subtotal, order.totals.delivery, order.totals.total, payment.amountDue ?? '']
    }),
  ])
}
