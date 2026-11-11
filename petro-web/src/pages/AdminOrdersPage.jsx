import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
import { formatLKR } from '../lib/format'
import { getOrderPayment } from '../lib/payment.js'
const nextStatus = { placed: 'processing', processing: 'shipped', shipped: 'delivered' }
export default function AdminOrdersPage() {
  const { token } = useAuth()
  const [filter, setFilter] = useState({ status: '', page: 1 })
  const [result, setResult] = useState({ orders: [], hasMore: false, loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmCash, setConfirmCash] = useState(null)
  useEffect(() => {
    let ignore = false
    apiRequest(`/admin/orders?page=${filter.page}&status=${filter.status}`, { token }).then((data) => { if (!ignore) setResult({ ...data, loading: false, error: '' }) }).catch((error) => { if (!ignore) setResult({ orders: [], hasMore: false, loading: false, error: error.message }) })
    return () => { ignore = true }
  }, [filter, attempt, token])
  const refresh = () => { setResult((current) => ({ ...current, loading: true })); setAttempt((value) => value + 1) }
  const update = async (order, type, body) => {
    if (busy) return
    setBusy(true); setActionError(''); setFeedback('')
    try {
      await apiRequest(`/admin/orders/${order._id}/${type}`, { method: 'PUT', token, body })
      setFeedback(type === 'payment' ? 'Cash collection recorded.' : 'Order status updated.')
      setConfirmCash(null); refresh()
    } catch (error) { setActionError(error.message); refresh() } finally { setBusy(false) }
  }
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">Admin</span><h1>Manage orders</h1><p><Link to="/admin/products">Manage products & promotions</Link></p></div>
    <label className="form-field saved-address-picker"><span>Filter by status</span><select disabled={busy} value={filter.status} onChange={(event) => { setFilter({ status: event.target.value, page: 1 }); setResult((current) => ({ ...current, loading: true })); setConfirmCash(null) }}><option value="">All orders</option>{['placed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
    {actionError && <p className="form-error" role="alert">{actionError}</p>}<p role="status">{busy ? 'Updating order…' : feedback}</p>
    {result.loading ? <p role="status">Loading orders…</p> : result.error ? <div><p className="form-error" role="alert">{result.error}</p><button type="button" className="btn btn-secondary btn-large" onClick={refresh}>Try again</button></div> : <>
      {!result.orders.length && <p>No orders match this filter.</p>}
      <div className="order-history">{result.orders.map((order) => {
        const payment = getOrderPayment(order)
        return <article key={order._id} className="checkout-panel"><h2>Order {order._id}</h2><p>Status: <strong>{order.status}</strong> · {payment.methodLabel} · {payment.statusLabel}</p><p>Total: <strong>{formatLKR(order.totals.total)}</strong></p>
          <details><summary>Items and delivery details</summary><address className="order-address">{order.shippingAddress.fullName}<br />{order.shippingAddress.addressLine1}<br />{order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}{order.shippingAddress.city}, {order.shippingAddress.postalCode}<br />{order.shippingAddress.country}</address><p>{order.shippingAddress.phone}<br />{order.shippingAddress.email}</p><ul>{order.items.map((item) => <li key={`${item.slug}:${item.variantLabel}`}>{item.quantity} × {item.name} ({item.variantLabel}) · {formatLKR(item.price * item.quantity)}</li>)}</ul><p>{order.deliveryMethod} delivery</p></details>
          <div className="cta-row account-actions">{nextStatus[order.status] && <button type="button" disabled={busy} className="btn btn-primary btn-large" onClick={() => update(order, 'status', { status: nextStatus[order.status] })}>Mark {nextStatus[order.status]}</button>}
          {order.status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid' && <button type="button" disabled={busy} className="btn btn-secondary btn-large" onClick={() => setConfirmCash(order._id)}>Record cash collected</button>}</div>
          {confirmCash === order._id && <div className="order-payment"><p>Confirm that you received the full {formatLKR(order.totals.total)} in cash for this order.</p><div className="cta-row"><button type="button" disabled={busy} className="btn btn-primary btn-large" onClick={() => update(order, 'payment', { paymentStatus: 'paid' })}>Confirm cash received</button><button type="button" disabled={busy} className="btn btn-secondary btn-large" onClick={() => setConfirmCash(null)}>Cancel</button></div></div>}
        </article>
      })}</div><div className="cta-row account-actions"><button type="button" className="btn btn-secondary btn-large" disabled={busy || filter.page === 1} onClick={() => { setFilter((current) => ({ ...current, page: current.page - 1 })); setResult((current) => ({ ...current, loading: true })) }}>Previous</button><span>Page {filter.page}</span><button type="button" className="btn btn-secondary btn-large" disabled={busy || !result.hasMore} onClick={() => { setFilter((current) => ({ ...current, page: current.page + 1 })); setResult((current) => ({ ...current, loading: true })) }}>Next</button></div>
    </>}
  </section>
}
