import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
import { formatLKR } from '../lib/format'

function OrdersPage() {
  const { token } = useAuth()
  const [result, setResult] = useState({ orders: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    apiRequest('/orders/my', { token }).then((data) => {
      if (!ignore) setResult({ orders: data.orders, error: '' })
    }).catch((error) => { if (!ignore) setResult({ orders: null, error: error.message }) })
    return () => { ignore = true }
  }, [token, attempt])
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">My orders</span><h1>Your recent orders</h1><p>Your latest 50 orders, newest first.</p></div>
    {result.error ? <div><p className="form-error" role="alert">{result.error}</p><button type="button" className="btn btn-secondary btn-large" onClick={() => { setResult({ orders: null, error: '' }); setAttempt((value) => value + 1) }}>Try again</button></div> : result.orders === null ? <p role="status">Loading orders…</p> : result.orders.length === 0 ? <p>No orders yet. <Link to="/shop">Browse products</Link></p> : <ul className="order-history">{result.orders.map((order) => <li key={order._id} className="checkout-panel"><Link to={`/orders/${order._id}`}>Order {order._id}</Link><p>{order.status} · {order.paymentStatus}</p><strong>{formatLKR(order.totals.total)}</strong></li>)}</ul>}
  </section>
}
export default OrdersPage
