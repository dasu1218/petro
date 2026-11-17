import { useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
const categories = [['skin-care','Skin Care'], ['digestion','Digestion'], ['flea-tick','Flea & Tick'], ['nutrition','Nutrition'], ['bundles','Bundles']]
export default function NewProductForm({ onCreated, onCancel }) {
  const { token } = useAuth()
  const [draft, setDraft] = useState({ name: '', slug: '', description: '', category: 'skin-care', badges: '' })
  const [variants, setVariants] = useState([{ label: '', price: '', stock: '0' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const { product } = await apiRequest('/products', { method: 'POST', token, body: {
        ...draft, badges: draft.badges.split(',').map((value) => value.trim()).filter(Boolean),
        variants: variants.map((variant) => ({ label: variant.label, price: Number(variant.price), stock: Number(variant.stock) })),
      } })
      onCreated(product)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <form className="checkout-form" onSubmit={submit}><fieldset className="checkout-panel" disabled={busy}><legend>Add a new product</legend>
    <p>Products appear in the shop as soon as they are created. Use zero stock if you are not ready to sell yet. You can upload photos and set promotions after creating the product.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="checkout-fields">
      <label className="form-field"><span>Product name</span><input required maxLength={120} value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
      <label className="form-field"><span>Product URL name</span><input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="gentle-pet-shampoo" value={draft.slug} onChange={(event) => update('slug', event.target.value)} /><small>Lowercase letters, numbers and hyphens. This URL stays fixed.</small></label>
      <label className="form-field checkout-field-wide"><span>Description</span><textarea required rows={4} maxLength={2000} value={draft.description} onChange={(event) => update('description', event.target.value)} /></label>
      <label className="form-field"><span>Category</span><select value={draft.category} onChange={(event) => update('category', event.target.value)}>{categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="form-field"><span>Badges (optional, comma-separated)</span><input value={draft.badges} onChange={(event) => update('badges', event.target.value)} /><small>Up to six short badges.</small></label>
    </div><h2>Sizes and initial stock</h2>
    {variants.map((variant, index) => <div key={index} className="new-product-variant checkout-fields">{[['label','Size label'],['price','Price (LKR)'],['stock','Initial stock']].map(([key,label]) => <label className="form-field" key={key}><span>{label} {index + 1}</span><input required type={key === 'label' ? 'text' : 'number'} maxLength={key === 'label' ? 40 : undefined} min={key === 'price' ? 1 : 0} max={key === 'price' ? 10000000 : key === 'stock' ? 1000000 : undefined} step="1" value={variant[key]} onChange={(event) => setVariants((current) => current.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry))} /></label>)}{variants.length > 1 && <button type="button" className="shop-reset" onClick={() => setVariants((current) => current.filter((_entry, i) => i !== index))}>Remove size {index + 1}</button>}</div>)}
    <button type="button" className="btn btn-secondary btn-large" disabled={variants.length >= 10} onClick={() => setVariants((current) => [...current, { label: '', price: '', stock: '0' }])}>Add another size</button>
    <div className="cta-row account-actions"><button type="submit" className="btn btn-primary btn-large">{busy ? 'Creating product…' : 'Create product'}</button><button type="button" className="btn btn-secondary btn-large" onClick={onCancel}>Cancel</button></div>
  </fieldset></form>
}
