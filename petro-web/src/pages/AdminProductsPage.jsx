import { Link, useSearchParams } from 'react-router-dom'
import ProductAvailability from '../components/ProductAvailability'
import ProductDetailsEditor from '../components/ProductDetailsEditor'
import InventoryPanel from '../components/InventoryPanel'
import NewProductForm from '../components/NewProductForm'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext'
import { useProducts } from '../context/productContext'
import { apiRequest } from '../lib/api'

const localDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function ProductEditor({ product, onSaved }) {
  const { token } = useAuth()
  const [enhance, setEnhance] = useState(true)
  const [images, setImages] = useState(product.settings?.images || [])
  const [prices, setPrices] = useState(product.variants.map((variant) => ({ label: variant.label, price: product.settings?.prices.find((entry) => entry.label === variant.label)?.price ?? variant.price })))
  const storedPromo = product.settings?.promotion
  const [promotion, setPromotion] = useState({ enabled: storedPromo?.enabled || false, label: storedPromo?.label || '', percent: storedPromo?.percent || 10, startsAt: localDate(storedPromo?.startsAt), endsAt: localDate(storedPromo?.endsAt) })
  const [busy, setBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const upload = async (event) => {
    const files = [...event.target.files]
    event.target.value = ''
    if (!files.length) return
    setUploadProgress('')
    if (files.length + images.length > 6) { setError('Choose up to six photos in total.'); return }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError('Choose JPG, PNG, or WebP photos up to 5 MB each.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress(`Uploading ${index + 1} of ${files.length}: ${file.name}${enhance ? ' — preparing enhanced photo…' : '…'}`)
        const body = new FormData(); body.append('image', file); body.append('enhance', String(enhance))
        const image = await apiRequest('/upload', { method: 'POST', token, body, timeoutMs: 120000 })
        setImages((current) => [...current, image])
      }
      setMessage(enhance ? 'Photos enhanced. Compare with the originals below, then save to publish.' : 'Original photos uploaded. Save to publish.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false); setUploadProgress('') }
  }
  const save = async (event) => {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      await apiRequest(`/products/${product.slug}`, { method: 'PUT', token, body: {
        images, prices: prices.map((entry) => ({ ...entry, price: Number(entry.price) })),
        promotion: { ...promotion, percent: Number(promotion.percent), startsAt: promotion.startsAt ? new Date(promotion.startsAt).toISOString() : null, endsAt: promotion.endsAt ? new Date(promotion.endsAt).toISOString() : null },
      } })
      onSaved(); setMessage('Product saved. Photos, prices, and promotions are now published.')
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <form onSubmit={save} className="checkout-form" onInvalidCapture={(event) => {
    const input = event.target
    const label = input.closest('label')?.querySelector('span')?.textContent || 'Product details'
    setError(`${label}: ${input.validationMessage || 'Please check this field.'}`)
    setMessage('')
  }}>
    {error && <p className="form-error" role="alert">{error}</p>}
    <p role="status">{busy ? 'Uploading and preparing your photos, or saving changes…' : message}</p>
    <fieldset disabled={busy} className="checkout-panel"><legend>{product.name}</legend>
      <h2>Product photos</h2><label className="default-address-toggle"><input type="checkbox" checked={enhance} onChange={(event) => setEnhance(event.target.checked)} />Automatically enhance new photos</label><p>Improve colour, contrast, and brightness, then fit the full photo onto a white square canvas. Your original photo is kept so you can compare and choose. This keeps the existing background inside the photo.</p><p>The first photo is used on product cards. Upload up to six JPG, PNG, or WebP photos, up to 5 MB each.</p>
      <div className="admin-photos">{images.map((photo, index) => <div key={`${photo.publicId}-${index}`}><img src={photo.url} alt={`Product photo ${index + 1}`} /><div>{photo.enhancedUrl && photo.originalUrl && <button type="button" onClick={() => setImages((current) => current.map((entry, i) => i === index ? { ...entry, url: entry.url === entry.enhancedUrl ? entry.originalUrl : entry.enhancedUrl } : entry))}>{photo.url === photo.enhancedUrl ? 'Compare: show original' : 'Use enhanced photo'}</button>}{photo.enhancedUrl && <small>{photo.url === photo.enhancedUrl ? 'Enhanced photo selected' : 'Original photo selected'}</small>}{index > 0 && <button type="button" onClick={() => setImages((current) => [current[index], ...current.filter((_item, i) => i !== index)])}>Make main photo</button>}<button type="button" onClick={() => setImages((current) => current.filter((_item, i) => i !== index))}>Remove photo {index + 1}</button></div></div>)}</div>
      <div className="upload-feedback" aria-live="polite">{error && <p className="form-error" role="alert">{error}</p>}{uploadProgress && <p role="status">{uploadProgress}</p>}{!busy && message && <p role="status">{message}</p>}</div><label className="form-field"><span>Add product photos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={images.length >= 6} onChange={upload} /></label>
      <h2>Prices (LKR)</h2><div className="checkout-fields">{prices.map((variant, index) => <label className="form-field" key={variant.label}><span>{variant.label}</span><input type="number" min="1" max="10000000" step="1" required value={variant.price} onChange={(event) => setPrices((current) => current.map((entry, i) => i === index ? { ...entry, price: event.target.value } : entry))} /></label>)}</div>
      <h2>Promotion</h2><label className="default-address-toggle"><input type="checkbox" checked={promotion.enabled} onChange={(event) => setPromotion((current) => ({ ...current, enabled: event.target.checked }))} />Enable a percentage discount</label>
      {promotion.enabled && <div className="checkout-fields"><label className="form-field"><span>Promotion label</span><input required maxLength={60} value={promotion.label} onChange={(event) => setPromotion((current) => ({ ...current, label: event.target.value }))} /></label><label className="form-field"><span>Discount (%)</span><input type="number" min="1" max="90" step="1" required value={promotion.percent} onChange={(event) => setPromotion((current) => ({ ...current, percent: event.target.value }))} /></label>{['startsAt', 'endsAt'].map((key) => <label key={key} className="form-field"><span>{key === 'startsAt' ? 'Start time (optional)' : 'End time (optional)'}</span><input type="datetime-local" value={promotion[key]} onChange={(event) => setPromotion((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<p className="checkout-note checkout-field-wide">Times use your device’s local timezone. Leave both times empty to start immediately and run until disabled. Discounts apply to individual products; bundle prices stay fixed.</p></div>}
      <div className="product-save-feedback" aria-live="polite">
        {error && <p className="form-error" role="alert">{error}</p>}
        {busy && <p role="status">{uploadProgress || 'Saving your product… Please wait.'}</p>}
        {!busy && message && <p role="status">{message}</p>}
      </div>
      <button type="submit" className="btn btn-primary btn-large" disabled={busy}>{busy ? 'Please wait…' : 'Save product'}</button>
    </fieldset>
  </form>
}
export default function AdminProductsPage() {
  const [params] = useSearchParams()
  const { token } = useAuth()
  const { reload } = useProducts()
  const [result, setResult] = useState({ products: [], loading: true, error: '' })
  const [selected, setSelected] = useState(() => params.get('product') || '')
  const [creating, setCreating] = useState(false)
  const [createdMessage, setCreatedMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let ignore = false
    apiRequest('/products/admin', { token }).then((data) => { if (!ignore) setResult({ products: data.products, loading: false, error: '' }) }).catch((error) => { if (!ignore) setResult({ products: [], loading: false, error: error.message }) })
    return () => { ignore = true }
  }, [token, attempt])
  const product = result.products.find((entry) => entry.slug === selected) || result.products[0]
  return <section className="page-panel"><div className="page-header"><span className="eyebrow eyebrow-muted">Admin</span><h1>Products & promotions</h1><p><Link to="/admin">Back to dashboard</Link></p><p>Manage your product photos, size prices, and special offers.</p><button type="button" className="btn btn-primary btn-large" onClick={() => { setCreating(true); setCreatedMessage('') }}>Add new product</button></div>
    {createdMessage && <p role="status">{createdMessage}</p>}
    {creating && <NewProductForm onCancel={() => setCreating(false)} onCreated={(product) => { setSelected(product.slug); setCreating(false); setCreatedMessage(`${product.name} created. Upload photos and save your changes below.`); setResult((current) => ({ ...current, loading: true })); setAttempt((value) => value + 1); reload() }} />}
    {creating ? null : result.loading ? <p role="status">Loading products…</p> : result.error ? <div role="alert"><p>{result.error}</p><button className="btn btn-secondary btn-large" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : <><label className="form-field saved-address-picker"><span>Choose a product</span><select value={product?.slug || ''} onChange={(event) => setSelected(event.target.value)}>{result.products.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.name}{entry.settings?.isArchived ? ' (Hidden)' : ''}</option>)}</select></label>{product && <><ProductAvailability key={`availability:${product.slug}`} product={product} onChanged={() => { reload(); setAttempt((value) => value + 1) }} /><ProductDetailsEditor key={`details:${product.slug}`} product={product} onSaved={() => { reload(); setAttempt((value) => value + 1) }} /><ProductEditor key={product.slug} product={product} onSaved={() => { reload(); setAttempt((value) => value + 1) }} /><InventoryPanel key={`stock:${product.slug}`} product={product} onChanged={reload} /></>}</>}
  </section>
}
