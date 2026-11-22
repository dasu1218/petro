import ProductPricePreview from './ProductPricePreview'
import { productBadges } from '../lib/productBadges'
import { initialStockPreview } from '../lib/initialStock'
import { suggestProductSlug, productPathPreview } from '../lib/productSlug'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/authContext'
import { apiRequest } from '../lib/api'
const categories = [['skin-care','Skin Care'], ['digestion','Digestion'], ['flea-tick','Flea & Tick'], ['nutrition','Nutrition'], ['bundles','Bundles']]
export default function NewProductForm({ onCreated, onCancel }) {
  const { token } = useAuth()
  const [draft, setDraft] = useState({ name: '', slug: '', description: '', category: 'skin-care', badges: '' })
  const [initialDraft] = useState(draft)
  const cancelButton = useRef(null)
  const keepEditingButton = useRef(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  useEffect(() => { if (confirmCancel) keepEditingButton.current?.focus() }, [confirmCancel])
  const keepEditing = () => { setConfirmCancel(false); cancelButton.current?.focus() }
  const badgePreview = productBadges(draft.badges)
  const suggestedSlug = suggestProductSlug(draft.name)
  const pathPreview = productPathPreview(draft.slug)
  const [variants, setVariants] = useState([{ label: '', price: '', stock: '0' }])
  const [removedSize, setRemovedSize] = useState(null)
  const removeSize = (index) => {
    setRemovedSize({ variant: { ...variants[index] }, index })
    setVariants((current) => current.filter((_entry, i) => i !== index))
  }
  const undoRemoveSize = () => {
    if (!removedSize || variants.length >= 10) return
    setVariants((current) => {
      const next = [...current]
      next.splice(Math.min(removedSize.index, next.length), 0, removedSize.variant)
      return next
    })
    setRemovedSize(null)
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft) || variants.length !== 1 || variants[0].label !== '' || variants[0].price !== '' || String(variants[0].stock) !== '0'
  const moveSize = (index, direction) => setVariants((current) => {
    const next = [...current]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const stockPreview = initialStockPreview(variants)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (badgePreview.error) { setError(badgePreview.error); return }
    if (stockPreview.error) { setError(stockPreview.error); return }
    setConfirmCancel(false)
    setBusy(true); setError('')
    try {
      const { product } = await apiRequest('/products', { method: 'POST', token, body: {
        ...draft, badges: badgePreview.badges,
        variants: variants.map((variant) => ({ label: variant.label, price: Number(variant.price), stock: Number(variant.stock) })),
      } })
      onCreated(product)
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <form className="checkout-form product-settings-editor new-product-form" onSubmit={submit}><fieldset className="checkout-panel" disabled={busy}><legend>Add a new product</legend>
    <p>Products appear in the shop as soon as they are created. Use zero stock if you are not ready to sell yet. You can upload photos and set promotions after creating the product.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="checkout-fields">
      <label className="form-field"><span>Product name</span><input required maxLength={120} value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
      <label className="form-field"><span>Product URL name</span><input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="gentle-pet-shampoo" value={draft.slug} onChange={(event) => update('slug', event.target.value)} /><small>Lowercase letters, numbers and hyphens. This URL stays fixed.</small></label>
      <label className="form-field checkout-field-wide"><span>Description</span><textarea required rows={4} maxLength={2000} value={draft.description} onChange={(event) => update('description', event.target.value)} /></label>
      <label className="form-field"><span>Category</span><select value={draft.category} onChange={(event) => update('category', event.target.value)}>{categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="form-field"><span>Badges (optional, comma-separated)</span><input value={draft.badges} onChange={(event) => update('badges', event.target.value)} /><small>Up to six badges of 40 characters each.</small></label>
    </div>
    <section aria-label="New product badge preview"><h2>Badge preview</h2>{badgePreview.error ? <p role="status" className="form-error">{badgePreview.error}</p> : <><p>{badgePreview.badges.length} of 6 badges. Create product to publish.</p>{badgePreview.badges.length ? <ul className="badge-preview-list">{badgePreview.badges.map((badge) => <li key={badge}>{badge}</li>)}</ul> : <p>No badges will be shown.</p>}</>}</section>
    <section aria-label="Product URL preview"><h2>Product URL</h2><button type="button" className="btn btn-secondary" disabled={!suggestedSlug || busy} onClick={() => update('slug', suggestedSlug)}>Suggest URL from name</button><p role="status" style={{ overflowWrap: 'anywhere' }}>{pathPreview ? `Preview: ${pathPreview}` : 'Enter a valid URL name or use a suggestion from the product name.'}</p><p className="checkout-note">Suggestions replace the URL field only when clicked. URLs must be unique and stay fixed after creation. Availability is checked when you create the product.</p></section>
    <h2>Sizes and initial stock</h2><p className="checkout-note">Arrange sizes in the order customers should see them. Moving a size keeps its price and stock together.</p>
    {variants.map((variant, index) => <div key={index} className="new-product-variant checkout-fields">{[['label','Size label'],['price','Price (LKR)'],['stock','Initial stock']].map(([key,label]) => <label className="form-field" key={key}><span>{label} {index + 1}</span><input required type={key === 'label' ? 'text' : 'number'} maxLength={key === 'label' ? 40 : undefined} min={key === 'price' ? 1 : 0} max={key === 'price' ? 10000000 : key === 'stock' ? 1000000 : undefined} step="1" value={variant[key]} onChange={(event) => setVariants((current) => current.map((entry, i) => i === index ? { ...entry, [key]: event.target.value } : entry))} /></label>)}{variants.length > 1 && <div className="cta-row account-actions"><button type="button" className="shop-reset" disabled={index === 0} onClick={() => moveSize(index, -1)}>Move size {index + 1} up</button><button type="button" className="shop-reset" disabled={index === variants.length - 1} onClick={() => moveSize(index, 1)}>Move size {index + 1} down</button></div>}{variants.length > 1 && <button type="button" className="shop-reset" onClick={() => removeSize(index)}>Remove size {index + 1}</button>}</div>)}
    <button type="button" className="btn btn-secondary btn-large" disabled={variants.length >= 10} onClick={() => setVariants((current) => [...current, { label: '', price: '', stock: '0' }])}>Add another size</button>
    {removedSize && <section aria-label="Removed size recovery"><p role="status">Removed {removedSize.variant.label.trim() || 'unnamed size'}. You can restore the last removed size, including its price and stock.</p><button type="button" className="btn btn-secondary" disabled={variants.length >= 10} onClick={undoRemoveSize}>Undo remove size</button>{variants.length >= 10 && <p>Remove a size to make room before restoring. A product can have up to ten sizes.</p>}</section>}
    <ProductPricePreview prices={variants.map((variant, index) => ({ label: variant.label.trim() || `Size ${index + 1}`, price: variant.price }))} promotion={{ enabled: false }} publishAction="Create product" />
    <section aria-label="Initial stock preview"><h2>Initial stock preview</h2><p role="status" className={stockPreview.error ? 'form-error' : 'checkout-note'}>{stockPreview.error || `${stockPreview.units.toLocaleString()} initial units across ${stockPreview.sizes} ${stockPreview.sizes === 1 ? 'size' : 'sizes'}; ${stockPreview.availableSizes} with stock.`}</p>{!stockPreview.error && <p>{stockPreview.units === 0 ? 'This product will be visible but sold out until you add stock.' : 'Stocked sizes will be available to buy after creation.'} Review quantities before creating the product.</p>}</section>
    <div className="cta-row account-actions"><button type="submit" className="btn btn-primary btn-large">{busy ? 'Creating product…' : 'Create product'}</button><button type="button" className="btn btn-secondary btn-large" ref={cancelButton} onClick={() => { if (dirty) setConfirmCancel(true); else onCancel() }}>Cancel</button></div>
    {confirmCancel && <section className="checkout-panel" aria-label="Discard new product draft" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); keepEditing() } }}><h2>Discard this product draft?</h2><p>Your entered details, sizes, prices and stock will be lost.</p><div className="cta-row account-actions"><button ref={keepEditingButton} type="button" className="btn btn-secondary" onClick={keepEditing}>Keep editing</button><button type="button" className="btn btn-primary" onClick={onCancel}>Discard draft</button></div></section>}
  </fieldset></form>
}
