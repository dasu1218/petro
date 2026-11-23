import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { productBadges } from '../lib/productBadges'
import { useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
const categories = [['skin-care','Skin Care'],['digestion','Digestion'],['flea-tick','Flea & Tick'],['nutrition','Nutrition'],['bundles','Bundles']]
export default function ProductDetailsEditor({ product, onSaved }) {
  const { token } = useAuth()
  const [draft, setDraft] = useState({ name: product.name, description: product.description, category: product.category, badges: (product.badges || []).join(', ') })
  const badgePreview = productBadges(draft.badges)
  const [saved, setSaved] = useState(draft)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const [busy, setBusy] = useState(false)
  useUnsavedChanges(dirty || busy)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const change = (key, value) => { setDraft((current) => ({ ...current, [key]: value })); setError(''); setMessage('') }
  const save = async (event) => {
    event.preventDefault()
    if (busy || !dirty) return
    if (badgePreview.error) { setError(badgePreview.error); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const { details } = await apiRequest(`/products/${product.slug}/details`, { method: 'PATCH', token, body: { ...draft, badges: badgePreview.badges } })
      const published = { ...details, badges: details.badges.join(', ') }
      setDraft(published); setSaved(published)
      setMessage('Product details saved.'); onSaved()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <form className="checkout-form product-details-editor" onSubmit={save} onInvalidCapture={(event) => setError(event.target.validationMessage)}>
    <fieldset className="checkout-panel" disabled={busy}><legend>Product details</legend>
      <p>Product URL: <strong>/products/{product.slug}</strong>. The URL and size labels stay fixed to preserve existing links and orders.</p>
      <p className="product-details-draft-status" role="status">{dirty ? 'Unpublished product details. Save to publish or discard your edits.' : 'Product details match the saved version.'}</p>
      <div className="checkout-fields">
        <label className="form-field"><span>Product name</span><input required maxLength={120} value={draft.name} onChange={(event) => change('name', event.target.value)} /></label>
        <label className="form-field"><span>Category</span><select value={draft.category} onChange={(event) => change('category', event.target.value)}>{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field checkout-field-wide"><span>Description</span><textarea required maxLength={2000} rows={5} value={draft.description} onChange={(event) => change('description', event.target.value)} /></label>
        <label className="form-field checkout-field-wide"><span>Badges (optional, comma-separated)</span><input value={draft.badges} onChange={(event) => change('badges', event.target.value)} /><small>Up to six badges of 40 characters each.</small></label>
      </div>
      <section aria-label="Product badge preview"><h3>Badge preview</h3>{badgePreview.error ? <p className="form-error" role="status">{badgePreview.error}</p> : <><p>{badgePreview.badges.length} of 6 badges. Save product details to publish.</p>{badgePreview.badges.length ? <ul className="badge-preview-list">{badgePreview.badges.map((badge) => <li key={badge}>{badge}</li>)}</ul> : <p>No badges will be shown.</p>}</>}</section>
      {error && <p className="form-error" role="alert">{error}</p>}<p role="status">{busy ? 'Saving product details…' : message}</p>
      <div className="cta-row account-actions"><button type="submit" className="btn btn-primary btn-large" disabled={!dirty}>Save product details</button>{dirty && <button type="button" className="btn btn-secondary btn-large" onClick={() => { setDraft(saved); setError(''); setMessage('Unpublished product details discarded.') }}>Discard product detail changes</button>}</div>
    </fieldset>
  </form>
}
