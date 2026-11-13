import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
import { formatLKR } from '../lib/format'
export default function AdminOverviewPage() {
  const { token } = useAuth()
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    apiRequest('/admin/dashboard', { token }).then((data) => { if (!ignore) { setResult(data); setError('') } }).catch((failure) => { if (!ignore) setError(failure.message) })
    return () => { ignore = true }
  }, [token, attempt])
  const refresh = () => { setResult(null); setError(''); setAttempt((value) => value + 1) }
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">Admin</span><h1>Your store at a glance</h1><p>All-time order and product summaries, using recorded store data.</p><div className="cta-row"><Link to="/admin/products" className="btn btn-primary btn-large">Manage products</Link><Link to="/admin/orders" className="btn btn-secondary btn-large">Manage orders</Link><button type="button" className="btn btn-secondary btn-large" onClick={refresh}>Refresh dashboard</button></div></div>
    {error ? <p className="form-error" role="alert">{error}</p> : !result ? <p role="status">Loading dashboard…</p> : <>
      <p className="checkout-note">Updated <time dateTime={result.generatedAt}>{new Date(result.generatedAt).toLocaleString()}</time>. Refresh to see newer activity.</p>
      <dl className="dashboard-metrics">
        <div className="checkout-panel"><dt>Total orders</dt><dd>{result.orders.total}</dd><small>Including cancelled orders</small></div>
        <div className="checkout-panel"><dt>Active orders</dt><dd>{result.orders.active}</dd><small>Placed, processing, or shipped</small></div>
        <div className="checkout-panel"><dt>Recorded payments</dt><dd>{formatLKR(result.orders.recordedPayments)}</dd><small>Orders marked paid, including delivery charges</small></div>
        <div className="checkout-panel"><dt>Delivered COD awaiting collection</dt><dd>{formatLKR(result.orders.deliveredCashDue)}</dd><small>{result.orders.deliveredCashOrders} delivered unpaid COD orders</small></div>
        <div className="checkout-panel"><dt>Visible products</dt><dd>{result.products.visible}</dd><small>{result.products.hidden} hidden · {result.products.total} total</small></div>
        <div className="checkout-panel"><dt>Low-stock sizes</dt><dd>{result.products.lowStockVariants}</dd><small>Visible sizes with {result.lowStockThreshold} or fewer remaining units</small></div>
      </dl>
      <p className="checkout-note">Recorded payments reflect saved payment statuses. This summary is not a profit or refund calculation.</p>
      <section className="checkout-panel"><h2>Order statuses</h2><dl className="dashboard-statuses">{Object.entries(result.orders.byStatus).map(([status, count]) => <div key={status}><dt>{status}</dt><dd>{count}</dd></div>)}</dl><Link to="/admin/orders">Review orders and record cash collection</Link></section>
      <section className="dashboard-stock"><h2>Stock needing attention</h2><p>The ten lowest-stock sizes are shown. Hidden products are excluded.</p>{!result.lowStock.length ? <p>No visible sizes are at or below the stock threshold.</p> : <ul className="stock-history">{result.lowStock.map((item) => <li key={`${item.slug}:${item.variantLabel}`} className="checkout-panel"><h3>{item.name} · {item.variantLabel}</h3><p>{item.stock === 0 ? 'Out of stock' : `${item.stock} units remaining`}</p><Link to={`/admin/products?product=${encodeURIComponent(item.slug)}`}>Manage and restock this product</Link></li>)}</ul>}</section>
    </>}
  </section>
}
