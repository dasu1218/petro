import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
import { formatLKR } from '../lib/format'
import { getOrderPayment } from '../lib/payment.js'
import { HISTORY_STATUSES, historyApiQuery, readHistoryFilters } from '../lib/orderHistory.js'
function OrdersPage() {
  const { token } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = readHistoryFilters(params)
  const query = historyApiQuery(filters)
  const [result, setResult] = useState({ key: '', orders: [], hasMore: false, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    apiRequest(`/orders/my?${query}`, { token }).then((data) => {
      if (!ignore) setResult({ key: query, orders: data.orders, hasMore: data.hasMore, error: '' })
    }).catch((error) => { if (!ignore) setResult({ key: query, orders: [], hasMore: false, error: error.message }) })
    return () => { ignore = true }
  }, [token, attempt, query])
  const change = (key, value) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value === '') next.delete(key)
    else next.set(key, String(value))
    if (key !== 'page') next.delete('page')
    return next
  })
  const loading = result.key !== query
  const clear = () => setParams({})
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">My orders</span><h1>Your order history</h1><p>Browse your orders, newest first, and filter by fulfilment or payment status.</p></div>
    <div className="checkout-panel history-filters"><label className="form-field"><span>Order status</span><select value={filters.status} onChange={(event) => change('status', event.target.value)}><option value="">All statuses</option>{HISTORY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className="form-field"><span>Payment status</span><select value={filters.payment} onChange={(event) => change('payment', event.target.value)}><option value="">All payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></label><button type="button" className="btn btn-secondary btn-large" onClick={clear}>Clear filters</button></div>
    {loading ? <p role="status">Loading orders…</p> : result.error ? <div><p className="form-error" role="alert">{result.error}</p><button type="button" className="btn btn-secondary btn-large" onClick={() => { setResult((current) => ({ ...current, key: '' })); setAttempt((value) => value + 1) }}>Try again</button></div> : <>
      <p role="status">{result.orders.length ? `${result.orders.length} orders on page ${filters.page}` : 'No orders on this page match your filters.'}</p>
      {result.orders.length === 0 && <p><button type="button" className="shop-reset" onClick={clear}>View all orders from page one</button> · <Link to="/shop">Browse products</Link></p>}
      <ul className="order-history">{result.orders.map((order) => <li key={order._id} className="checkout-panel"><Link to={`/orders/${order._id}`}>Order {order._id}</Link>{order.createdAt && <p><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString()}</time></p>}<p>{order.status} · {getOrderPayment(order).statusLabel}</p><p>{getOrderPayment(order).methodLabel}</p><strong>{formatLKR(order.totals.total)}</strong><p><Link to={`/orders/${order._id}`}>View details and tracking</Link></p></li>)}</ul>
      <nav className="shop-pagination" aria-label="Order history pages"><button type="button" className="btn btn-secondary btn-large" disabled={filters.page === 1} onClick={() => change('page', filters.page - 1)}>Previous</button><span aria-current="page">Page {filters.page}</span><button type="button" className="btn btn-secondary btn-large" disabled={!result.hasMore || filters.page >= 10000} onClick={() => change('page', filters.page + 1)}>Next</button></nav>
    </>}
  </section>
}
export default OrdersPage
