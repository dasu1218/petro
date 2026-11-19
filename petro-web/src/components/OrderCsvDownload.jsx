import { useState } from 'react'
import { downloadOrderCsv } from '../lib/orderCsv.js'
export default function OrderCsvDownload({ order }) {
  const [error, setError] = useState('')
  return <div className="order-csv-download"><button type="button" className="btn btn-secondary btn-large" onClick={() => {
    setError('')
    try { downloadOrderCsv(order) } catch { setError('The CSV could not be prepared. Please try again.') }
  }}>Download order CSV</button>{error && <p className="form-error" role="alert">{error}</p>}</div>
}
