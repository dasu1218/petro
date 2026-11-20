import OrderTrackingEditor from '../components/OrderTrackingEditor'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
import { formatLKR } from '../lib/format'
import { getOrderPayment } from '../lib/payment.js'
import { readHistoryFilters, HISTORY_STATUSES } from '../lib/orderHistory.js'
import { canCancelOrder } from '../lib/orderActions.js'
import { useProducts } from '../context/productContext'
const nextStatus = { placed: 'processing', processing: 'shipped', shipped: 'delivered' }
export default function AdminOrdersPage() {
  const { token } = useAuth()
  const { reload } = useProducts()
  const [cancelId, setCancelId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [params, setParams] = useSearchParams()
  const { status, payment, page } = readHistoryFilters(params)
  const filter = { status, payment, page }
  const queryParams = new URLSearchParams({ page: String(page) })
  if (status) queryParams.set('status', status)
  if (payment) queryParams.set('payment', payment)
  const query = queryParams.toString()
  const [result, setResult] = useState({ key: '', orders: [], hasMore: false, loading: true, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmCash, setConfirmCash] = useState(null)
  useEffect(() => {
    let ignore = false
    apiRequest(`/admin/orders?${query}`, { token }).then((data) => { if (!ignore) setResult({ ...data, key: query, loading: false, error: '' }) }).catch((error) => { if (!ignore) setResult({ key: query, orders: [], hasMore: false, loading: false, error: error.message }) })
    return () => { ignore = true }
  }, [query, attempt, token])
  const changeFilter = (key, value) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value === '') next.delete(key)
      else next.set(key, String(value))
      if (key !== 'page') next.delete('page')
      return next
    })
    setConfirmCash(null); setCancelId(null); setCancelReason(''); setActionError(''); setFeedback('')
  }
  const loading = result.loading || result.key !== query
  const refresh = () => { setResult((current) => ({ ...current, loading: true })); setAttempt((value) => value + 1) }
  const update = async (order, type, body) => {
    if (busy) return
    setBusy(true); setActionError(''); setFeedback('')
    try {
      await apiRequest(`/admin/orders/${order._id}/${type}`, { method: type === 'cancel' ? 'POST' : 'PUT', token, body })
      setFeedback(type === 'cancel' ? 'Order cancelled and reserved stock restored.' : type === 'tracking' ? 'Tracking details saved.' : type === 'payment' ? 'Cash collection recorded.' : 'Order status updated.')
      if (type === 'cancel') { setCancelId(null); setCancelReason(''); reload() }
      setConfirmCash(null); refresh()
    } catch (error) { setActionError(error.message); refresh() } finally { setBusy(false) }
  }
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">Admin</span><h1>Manage orders</h1><p><Link to="/admin">Back to dashboard</Link></p><p><Link to="/admin/products">Manage products & promotions</Link></p></div>
    <div className="checkout-panel admin-order-filters"><label className="form-field"><span>Filter by status</span><select disabled={busy} value={filter.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">All orders</option>{HISTORY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      <label className="form-field"><span>Filter by payment</span><select disabled={busy} value={filter.payment} onChange={(event) => changeFilter('payment', event.target.value)}><option value="">All payments</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setParams({}); setConfirmCash(null); setCancelId(null); setCancelReason(''); setActionError(''); setFeedback('') }}>Clear order filters</button>
    </div>
    {actionError && <p className="form-error" role="alert">{actionError}</p>}<p role="status">{busy ? 'Updating order…' : feedback}</p>
    {loading ? <p role="status">Loading orders…</p> : result.error ? <div><p className="form-error" role="alert">{result.error}</p><button type="button" className="btn btn-secondary btn-large" onClick={refresh}>Try again</button></div> : <>
      {!result.orders.length && <p>No orders match this filter.</p>}
      <div className="order-history">{result.orders.map((order) => {
        const payment = getOrderPayment(order)
        return <article key={order._id} className="checkout-panel"><h2>Order {order._id}</h2><p>Status: <strong>{order.status}</strong> · {payment.methodLabel} · {payment.statusLabel}</p><p>Total: <strong>{formatLKR(order.totals.total)}</strong></p>
          <details><summary>Items and delivery details</summary><address className="order-address">{order.shippingAddress.fullName}<br />{order.shippingAddress.addressLine1}<br />{order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}{order.shippingAddress.city}, {order.shippingAddress.postalCode}<br />{order.shippingAddress.country}</address><p>{order.shippingAddress.phone}<br />{order.shippingAddress.email}</p><ul>{order.items.map((item) => <li key={`${item.slug}:${item.variantLabel}`}>{item.quantity} × {item.name} ({item.variantLabel}) · {formatLKR(item.price * item.quantity)}</li>)}</ul><p>{order.deliveryMethod} delivery</p></details>
          <div className="cta-row account-actions">{nextStatus[order.status] && <button type="button" disabled={busy} className="btn btn-primary btn-large" onClick={() => update(order, 'status', { status: nextStatus[order.status] })}>Mark {nextStatus[order.status]}</button>}
          {canCancelOrder(order) && <button type="button" disabled={busy} className="btn btn-secondary btn-large" onClick={() => { setCancelId(order._id); setCancelReason(''); setConfirmCash(null) }}>Cancel order</button>}
          {order.status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid' && <button type="button" disabled={busy} className="btn btn-secondary btn-large" onClick={() => setConfirmCash(order._id)}>Record cash collected</button>}</div>
          {['processing', 'shipped'].includes(order.status) && <details className="tracking-disclosure"><summary>Add or edit courier tracking</summary><OrderTrackingEditor key={`${order._id}:${order.tracking?.updatedAt || ''}`} order={order} busy={busy} onSave={(body) => update(order, 'tracking', body)} /></details>}
          {order.status === 'cancelled' && order.cancellation?.reason && <p>Cancellation reason: {order.cancellation.reason}</p>}
          {cancelId === order._id && canCancelOrder(order) && <form className="checkout-panel cancel-order-form" onSubmit={(event) => { event.preventDefault(); update(order, 'cancel', { reason: cancelReason }) }}><fieldset disabled={busy}><legend>Confirm order cancellation</legend><p>This cancels the order and restores the reserved product and bundle stock. The order record is kept.</p><label className="form-field"><span>Cancellation reason (shown to the customer)</span><textarea rows={3} maxLength={200} required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="cta-row account-actions"><button type="submit" className="btn btn-primary btn-large">Confirm cancellation</button><button type="button" className="btn btn-secondary btn-large" onClick={() => setCancelId(null)}>Keep order</button></div></fieldset></form>}
          {confirmCash === order._id && <div className="order-payment"><p>Confirm that you received the full {formatLKR(order.totals.total)} in cash for this order.</p><div className="cta-row"><button type="button" disabled={busy} className="btn btn-primary btn-large" onClick={() => update(order, 'payment', { paymentStatus: 'paid' })}>Confirm cash received</button><button type="button" disabled={busy} className="btn btn-secondary btn-large" onClick={() => setConfirmCash(null)}>Cancel</button></div></div>}
        </article>
      })}</div><div className="cta-row account-actions"><button type="button" className="btn btn-secondary btn-large" disabled={busy || filter.page === 1} onClick={() => changeFilter('page', filter.page - 1)}>Previous</button><span>Page {filter.page}</span><button type="button" className="btn btn-secondary btn-large" disabled={busy || !result.hasMore || filter.page >= 10000} onClick={() => changeFilter('page', filter.page + 1)}>Next</button></div>
    </>}
  </section>
}
