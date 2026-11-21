import { useState } from 'react'
import { adminOrdersCsv } from '../lib/adminOrdersCsv.js'
import { downloadCsv } from '../lib/csv.js'
export default function AdminOrdersCsvDownload({ orders, filter, disabled }) {
  const [error, setError] = useState('')
  return <div className="admin-orders-export"><button type="button" className="btn btn-secondary" disabled={disabled || orders.length === 0} onClick={() => {
    setError('')
    try { downloadCsv(adminOrdersCsv(orders, filter), `petro-orders-page-${filter.page}.csv`) } catch { setError('The order export could not be prepared. Please try again.') }
  }}>Download this page CSV</button><p>Exports the {orders.length} {orders.length === 1 ? 'order' : 'orders'} currently shown on this page.</p>{error && <p className="form-error" role="alert">{error}</p>}</div>
}
