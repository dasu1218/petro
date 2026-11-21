import { useState } from 'react'
import { restockHistoryCsv } from '../lib/restockCsv.js'
import { downloadCsv } from '../lib/csv.js'
export default function RestockHistoryCsvDownload({ product, history, disabled }) {
  const [error, setError] = useState('')
  return <div className="admin-orders-export"><button type="button" className="btn btn-secondary" disabled={disabled || history.length === 0} onClick={() => {
    setError('')
    try { downloadCsv(restockHistoryCsv(product, history), `petro-restocks-${product.slug}.csv`) } catch { setError('The stock history CSV could not be prepared. Please try again.') }
  }}>Download recent additions CSV</button><p>Exports the {history.length} recent {history.length === 1 ? 'addition' : 'additions'} shown below, up to 20.</p>{error && <p className="form-error" role="alert">{error}</p>}</div>
}
