import { getOrderPayment } from './payment.js'
function cell(value) {
  let text = String(value ?? '')
  // Quoting alone does not prevent spreadsheet formula interpretation.
  if (typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/u.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
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
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
}
export function downloadOrderCsv(order) {
  const url = URL.createObjectURL(new Blob([orderCsv(order)], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `petro-order-${String(order._id).replace(/[^a-zA-Z0-9-]/g, '')}.csv`
  anchor.hidden = true
  document.body.append(anchor)
  try { anchor.click() } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
