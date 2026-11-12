import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
export default function InventoryPanel({ product, onChanged }) {
  const { token } = useAuth()
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState({ variantLabel: product.variants[0].label, quantity: '', reason: '' })
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    let ignore = false
    apiRequest(`/admin/inventory/${product.slug}`, { token }).then((data) => { if (!ignore) { setResult(data); setLoadError('') } }).catch((failure) => { if (!ignore) setLoadError(failure.message) })
    return () => { ignore = true }
  }, [product.slug, token, attempt])
  const refresh = () => { setResult(null); setAttempt((value) => value + 1) }
  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    const payload = pending || { ...draft, quantity: Number(draft.quantity), requestId: crypto.randomUUID() }
    setPending(payload); setBusy(true); setError(''); setMessage('')
    try {
      await apiRequest(`/admin/inventory/${product.slug}`, { method: 'POST', token, body: payload })
      setPending(null); setDraft((current) => ({ ...current, quantity: '', reason: '' })); setMessage(`${payload.quantity} units added to ${payload.variantLabel}.`)
      refresh(); onChanged()
    } catch (failure) {
      setError(failure.message)
      if (failure.status && failure.status < 500 && failure.status !== 409) setPending(null)
    } finally { setBusy(false) }
  }
  return <section className="inventory-panel" aria-labelledby="inventory-title"><h2 id="inventory-title">Stock management</h2><p>Add newly received units to the current remaining stock. Customer orders reserve stock automatically.</p>
    {loadError ? <div><p className="form-error" role="alert">{loadError}</p><button type="button" className="btn btn-secondary btn-large" onClick={refresh}>Reload stock</button></div> : !result ? <p role="status">Loading stock…</p> : <>
      <dl className="stock-levels">{result.variants.map((variant) => <div key={variant.label}><dt>{variant.label}</dt><dd>{variant.stock} available</dd></div>)}</dl>
      <form onSubmit={submit} className="checkout-form"><fieldset className="checkout-panel" disabled={busy || Boolean(pending)}><legend>Add stock</legend><div className="checkout-fields">
        <label className="form-field"><span>Size</span><select value={draft.variantLabel} onChange={(event) => setDraft((current) => ({ ...current, variantLabel: event.target.value }))}>{result.variants.map((variant) => <option key={variant.label} value={variant.label}>{variant.label}</option>)}</select></label>
        <label className="form-field"><span>Quantity to add</span><input type="number" min="1" max="1000000" step="1" required value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} /></label>
        <label className="form-field checkout-field-wide"><span>Stock addition note</span><input required maxLength={200} placeholder="New supplier delivery" value={draft.reason} onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))} /></label>
      </div></fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}{pending && error && <p>Retry this same stock addition to confirm its result. Check recent additions before leaving this page.</p>}
      <p role="status">{busy ? 'Recording stock addition…' : message}</p><button type="submit" disabled={busy} className="btn btn-primary btn-large">{busy ? 'Adding stock…' : pending ? 'Retry same stock addition' : 'Add stock'}</button></form>
      <h3>Recent stock additions</h3>{!result.history.length ? <p>No stock additions recorded yet.</p> : <ul className="stock-history">{result.history.map((entry) => <li key={entry.id} className="checkout-panel"><strong>+{entry.quantity} · {entry.variantLabel}</strong><p>{entry.reason}</p><small>Stock immediately after addition: {entry.stockAfter} · {new Date(entry.createdAt).toLocaleString()}</small></li>)}</ul>}
    </>}
  </section>
}
