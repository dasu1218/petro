import { useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
export default function ProductAvailability({ product, onChanged }) {
  const { token } = useAuth()
  const hidden = product.settings?.isArchived === true
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const update = async () => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      await apiRequest(`/products/${product.slug}/availability`, { method: 'PATCH', token, body: { isArchived: !hidden } })
      setMessage(hidden ? 'Product restored to the shop.' : 'Product hidden from the shop. Its records are preserved.')
      onChanged()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <section className="checkout-panel product-availability" aria-label="Product availability"><h2>Shop visibility: {hidden ? 'Hidden' : 'Visible'}</h2><p>Hide products you no longer sell. Their photos, stock, reviews, and past orders are kept. Bundles containing a hidden product are also unavailable until it is restored.</p>{error && <p className="form-error" role="alert">{error}</p>}<p role="status">{busy ? 'Updating visibility…' : message}</p><button type="button" className={hidden ? 'btn btn-primary btn-large' : 'btn btn-secondary btn-large'} disabled={busy} onClick={update}>{hidden ? 'Restore to shop' : 'Hide from shop'}</button></section>
}
