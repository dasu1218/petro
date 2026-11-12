import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
import { formatLKR } from '../lib/format'
import { getOrderPayment } from '../lib/payment.js'

function OrderPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const [result, setResult] = useState({ order: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    apiRequest(`/orders/${id}`, { token }).then((data) => {
      if (!ignore) setResult({ order: data.order, error: '' })
    }).catch((error) => {
      if (!ignore) setResult({ order: null, error: error.message })
    })
    return () => { ignore = true }
  }, [id, token, attempt])
  if (result.error) return <section className="page-panel"><p role="alert">{result.error}</p><button type="button" className="btn btn-secondary btn-large" onClick={() => { setResult({ order: null, error: '' }); setAttempt((value) => value + 1) }}>Try again</button><p><Link to="/orders">View your orders</Link></p></section>
  if (!result.order || result.order._id !== id) return <section className="page-panel"><p role="status">Loading your order…</p></section>
  const order = result.order
  const payment = getOrderPayment(order)
  return (
    <section className="page-panel">
      <div className="page-header"><span className="eyebrow eyebrow-muted">{order.status === 'cancelled' ? 'Order cancelled' : 'Order received'}</span><h1>{order.status === 'cancelled' ? 'Your order has been cancelled.' : 'Thank you for your order.'}</h1><p>Order reference: {order._id}</p></div>
      <div className="checkout-layout">
        <section className="checkout-panel">
          <h2>Delivery details</h2>
          <address className="order-address"><strong>{order.shippingAddress.fullName}</strong><br />{order.shippingAddress.addressLine1}<br />{order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}{order.shippingAddress.city}, {order.shippingAddress.postalCode}<br />{order.shippingAddress.country}</address>
          <p>{order.deliveryMethod === 'express' ? 'Express delivery' : 'Standard delivery'}</p>
          <p>Status: <strong>{order.status}</strong></p>
          {order.status === 'cancelled' && order.cancellation?.reason && <p>Cancellation reason: {order.cancellation.reason}</p>}
          <div className="order-payment">
            <h2>Payment</h2>
            <p><strong>{payment.methodLabel}</strong> · {payment.statusLabel}</p>
            {payment.amountDue !== null && <p>Amount due on delivery: <strong>{formatLKR(payment.amountDue)}</strong></p>}
            <p>{payment.message}</p>
          </div>
        </section>
        <section className="checkout-panel"><h2>Order summary</h2><ul className="checkout-items">{order.items.map((item) => <li key={`${item.slug}:${item.variantLabel}`}><div>{item.name}<small>{item.variantLabel} · Qty {item.quantity}</small></div><strong>{formatLKR(item.price * item.quantity)}</strong></li>)}</ul>
          <dl className="checkout-totals"><div><dt>Subtotal</dt><dd>{formatLKR(order.totals.subtotal)}</dd></div><div><dt>Delivery</dt><dd>{order.totals.delivery === 0 ? 'Free' : formatLKR(order.totals.delivery)}</dd></div><div className="checkout-grand-total"><dt>Total</dt><dd>{formatLKR(order.totals.total)}</dd></div></dl>
        </section>
      </div><p><Link to="/orders">View your orders</Link> · <Link to="/shop">Continue shopping</Link></p>
    </section>
  )
}
export default OrderPage
