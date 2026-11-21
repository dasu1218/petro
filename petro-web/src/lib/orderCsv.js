import { getOrderPayment } from './payment.js'
import { csvDocument, downloadCsv } from './csv.js'
export function orderCsv(order) {
  const payment = getOrderPayment(order)
  const rows = [
    ['PETRO order summary'], ['Order reference', order._id], ['Placed at', order.createdAt || ''],
    ['Order status', order.status], ['Payment method', payment.methodLabel], ['Payment status', payment.statusLabel], [],
    ['Product name', 'Size', 'Quantity', 'Unit price (LKR)', 'Line total (LKR)'],
    ...order.items.map((item) => [item.name, item.variantLabel, item.quantity, item.price, item.price * item.quantity]), [],
    ['Subtotal (LKR)', order.totals.subtotal], ['Delivery (LKR)', order.totals.delivery], ['Total (LKR)', order.totals.total],
    ...(payment.amountDue !== null ? [['Amount due on delivery (LKR)', payment.amountDue]] : []),
  ]
  return csvDocument(rows)
}
export function downloadOrderCsv(order) {
  downloadCsv(orderCsv(order), `petro-order-${String(order._id).replace(/[^a-zA-Z0-9-]/g, '')}.csv`)
}
